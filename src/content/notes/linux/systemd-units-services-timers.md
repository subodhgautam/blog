---
title: 'systemd for humans: units, services, and timers'
description: 'A practical tour of the systemd pieces you actually touch: unit files, service management, logs, timers, and safe overrides.'
pubDate: 2026-09-02
tags: ['systemd', 'linux', 'operations']
---

systemd is often described as an init system, but on a modern Linux host it is closer to a service manager and a small platform. You do not need the whole platform. You need a reliable mental model for units, a few commands, and a safe way to customize services.

## Units are the nouns

Everything systemd manages is a unit, described by a unit file:

| Unit type | Represents |
| --- | --- |
| `.service` | A daemon or one-shot process |
| `.timer` | A scheduled trigger |
| `.socket` | Socket activation |
| `.target` | A group of units, similar to a run level |
| `.mount` | A filesystem mount point |
| `.path` | A filesystem watch |

Unit files live in a few places, in order of precedence:

1. `/etc/systemd/system/` — administrator-defined units and overrides
2. `/run/systemd/system/` — runtime units
3. `/usr/lib/systemd/system/` — units shipped by packages

Put your own units in `/etc/systemd/system/`.

## A minimal service

```ini
# /etc/systemd/system/hello.service
[Unit]
Description=Hello background worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/hello-worker --port 8080
Restart=on-failure
RestartSec=3
User=hellosvc
Group=hellosvc
WorkingDirectory=/var/lib/hello

[Install]
WantedBy=multi-user.target
```

The important fields:

- `After=` controls ordering only. It does not start the dependency.
- `Wants=` starts the dependency but does not require it.
- `Requires=` starts the dependency and stops this unit if it fails. Use it sparingly.
- `Type=simple` assumes the process stays in the foreground. Use `Type=oneshot` for scripts that exit.
- `Restart=on-failure` with a short `RestartSec` handles crashes without a tight restart loop.

`ExecStart` must use an absolute path. Environment variables can be supplied with `Environment=` or `EnvironmentFile=`.

## The commands you will use

```bash
sudo systemctl daemon-reload        # after editing a unit file
sudo systemctl enable --now hello   # start now and at boot
sudo systemctl status hello
sudo systemctl restart hello
sudo systemctl stop hello
sudo systemctl disable hello
systemctl list-units --type=service --state=running
```

`daemon-reload` does not restart anything. It only tells systemd to reread unit files. If you changed the file, reload and then restart the service.

## Read the logs

```bash
journalctl -u hello -n 100 --no-pager
journalctl -u hello -f
journalctl -u hello --since "1 hour ago"
journalctl -p err -b
```

If your service writes to stdout or stderr, systemd captures it in the journal. That is usually preferable to inventing your own log rotation.

## Timers instead of cron

A timer is a trigger; it needs a matching service that does the work.

```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Run the nightly backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
```

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Nightly backup timer

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

Enable and inspect it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now backup.timer
systemctl list-timers --all
journalctl -u backup.service
```

`Persistent=true` runs a missed job if the machine was off at the scheduled time. `RandomizedDelaySec` avoids a thundering herd of identical jobs. Check your calendar syntax with:

```bash
systemd-analyze calendar '*-*-* 02:30:00'
```

## Customize without editing package files

Do not edit units under `/usr/lib/systemd/system/`; package updates will overwrite them. Use a drop-in override:

```bash
sudo systemctl edit nginx
```

That opens an editor for `/etc/systemd/system/nginx.service.d/override.conf`. Add only what changes:

```ini
[Service]
LimitNOFILE=65535
Environment="TZ=UTC"
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart nginx
```

To see the merged result:

```bash
systemctl cat nginx
systemctl show nginx -p LimitNOFILE
```

## Troubleshooting order

When a service will not start:

1. `systemctl status name` — exit code and the last few log lines.
2. `journalctl -u name -n 100` — full recent logs.
3. `systemctl cat name` — confirm the unit that is actually loaded.
4. `systemctl show name -p ExecStart` — check the final command line.
5. Run `ExecStart` manually as the service user to expose permission problems.

Common causes are a wrong path, a missing user, a permission denied on a config file, or a dependency that is ordered but not started.

## The mental model

- Units describe intent; the manager enforces it.
- `After` is ordering, `Wants` and `Requires` are dependencies.
- Reload after editing, restart after reloading.
- Logs live in the journal, not only in application files.
- Timers are usually a better fit than cron for modern systems because they integrate with logs and dependencies.
- Override with `systemctl edit`, never by editing vendor units.

That is enough systemd to run services confidently. The rest is details you can look up when a specific unit type demands it.
