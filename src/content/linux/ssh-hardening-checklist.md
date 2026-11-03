---
title: 'An SSH hardening checklist you can apply today'
description: 'A careful, reversible set of sshd changes: key-only authentication, safer defaults, validation, and how not to lock yourself out.'
pubDate: 2026-08-20
tags: ['ssh', 'hardening', 'linux']
---

SSH is the front door to most Linux servers, which makes it the first thing to harden and the easiest thing to break. The goal is not a pile of exotic settings. It is a small set of changes that remove the common attacks while keeping access reliable.

## Before you change anything

Have a second session open, or a console available through your provider. Every change below can lock you out if it is applied carelessly. Test in a second terminal before closing the first.

Confirm the config location and validity:

```bash
sudo sshd -T | grep -E '^(port|permitrootlogin|passwordauthentication|pubkeyauthentication)'
sudo sshd -t
```

`sshd -T` prints the effective configuration. `sshd -t` validates the files. Run the validation after every edit.

## Use key authentication

On your workstation, create a key if you do not already have one:

```bash
ssh-keygen -t ed25519 -a 100 -C "you@laptop"
```

Copy the public key to the server:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server
```

Verify that key login works **before** disabling passwords. If it does not, fix that first.

## A conservative sshd configuration

Edit `/etc/ssh/sshd_config` or, better, add a drop-in file:

```bash
sudo mkdir -p /etc/ssh/sshd_config.d
sudo tee /etc/ssh/sshd_config.d/00-hardening.conf >/dev/null <<'EOF'
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PermitEmptyPasswords no
X11Forwarding no
AllowAgentForwarding no
MaxAuthTries 4
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
```

Notes on the choices:

- `PasswordAuthentication no` forces keys. This is the single highest-value change.
- `KbdInteractiveAuthentication no` prevents another password-like path.
- `PermitRootLogin no` forces an accountable user and `sudo`.
- `X11Forwarding no` removes an unnecessary surface unless you actually use it.
- `MaxAuthTries 4` and a shorter `LoginGraceTime` reduce brute-force exposure.

If your distribution includes a drop-in directory and the main file ends with `Include /etc/ssh/sshd_config.d/*.conf`, the drop-in is the cleanest place. Otherwise edit the main file directly.

## Restrict who may log in

```ini
AllowUsers deploy admin
```

or restrict a group:

```ini
AllowGroups ssh-users
```

Create the group and add your account before restarting:

```bash
sudo groupadd -f ssh-users
sudo usermod -aG ssh-users "$USER"
```

Be aware that `AllowUsers` and `AllowGroups` combine restrictively. Test with the exact account you will use.

## Validate, reload, verify

Do not restart blindly:

```bash
sudo sshd -t
sudo systemctl reload sshd    # or: sudo systemctl reload ssh
```

Then, without closing your current session, open a **new** connection:

```bash
ssh -v user@server
```

Check that your key is accepted and password authentication is refused. Only after a successful new session should you close the old one.

## Reduce exposure at the firewall

If you can, limit SSH to trusted addresses:

```bash
sudo ufw allow from 203.0.113.0/24 to any port 22 proto tcp
sudo ufw delete allow 22/tcp
```

Or use a VPN or bastion host. Moving SSH off port 22 is not real security by itself, but it cuts a surprising amount of background noise.

## Harden the client too

Your workstation's `~/.ssh/config` can enforce good habits:

```text
Host *
    AddKeysToAgent yes
    IdentitiesOnly yes
    HashKnownHosts yes
    ServerAliveInterval 60

Host prod-*
    User deploy
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking ask
```

`IdentitiesOnly yes` prevents your agent from offering every loaded key to every host. `HashKnownHosts yes` reduces the value of a stolen `known_hosts` file.

## Still not enough? Add rate limiting

Key-only authentication already defeats password guessing, but rate limiting still reduces log noise and resource use:

```bash
sudo apt install fail2ban
```

A basic jail for SSH:

```ini
# /etc/fail2ban/jail.local
[sshd]
enabled = true
port = ssh
maxretry = 5
findtime = 10m
bantime = 1h
```

Do not ban your own management address. Test that you can still connect after enabling a jail.

## The checklist

- Key-based login works before passwords are disabled.
- Root login is disabled and `sudo` is configured.
- Only required users or groups may connect.
- `sshd -t` passes and a new session is verified before the old one closes.
- The firewall or a bastion limits who can reach the port.
- Client configuration is deliberate, not accidental.

None of these steps are clever. That is the point. SSH hardening is mostly about removing convenience features you do not need and verifying each change while you still have access.
