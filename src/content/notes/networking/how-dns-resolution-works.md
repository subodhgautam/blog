---
title: 'How DNS actually resolves a name'
description: 'Follow a single lookup from stub resolver to authoritative server, learn the record types that matter, and use dig to see each step.'
pubDate: 2026-09-30
tags: ['dns', 'resolvers', 'troubleshooting']
---

You type a name, press Enter, and a page appears. In the milliseconds between those events, a surprisingly distributed conversation takes place. Understanding that conversation makes DNS problems far less mysterious.

## The cast of characters

A DNS lookup usually involves four roles:

1. **Stub resolver** — the small resolver in your operating system. It knows almost nothing and forwards questions to a recursive resolver.
2. **Recursive resolver** — usually provided by your ISP, your router, or a public service such as `1.1.1.1`. It does the walking and caches answers.
3. **Root servers** — thirteen logical server identities that know where each top-level domain (TLD) lives.
4. **Authoritative servers** — the servers that hold the actual records for a domain.

The stub resolver asks one question. The recursive resolver does the work.

## A lookup, step by step

Suppose you request `www.example.com`.

1. The stub resolver checks its local cache and hosts file. If nothing is found, it sends a recursive query to the configured resolver.
2. The recursive resolver checks its cache. On a cold cache, it asks a root server: “Who handles `.com`?”
3. The root server does not answer the final question. It returns a **referral** to the `.com` TLD servers.
4. The resolver asks a `.com` server: “Who handles `example.com`?” The TLD server refers it to the domain's authoritative nameservers.
5. The resolver asks the authoritative server for `www.example.com`. The authoritative server returns the record and a TTL.
6. The resolver caches the answer for the TTL and returns it to the stub resolver.

The root and TLD servers usually return referrals, not final answers. This is why DNS is described as a hierarchy even though the recursive resolver does most of the querying.

## The records that matter

| Type | Purpose |
| --- | --- |
| `A` | Maps a name to an IPv4 address. |
| `AAAA` | Maps a name to an IPv6 address. |
| `CNAME` | Points one name to another name. The resolver then follows the target. |
| `MX` | Declares mail servers, with a preference value. |
| `NS` | Delegates a zone to authoritative nameservers. |
| `TXT` | Holds arbitrary text, commonly SPF, DKIM, and domain verification. |
| `SOA` | Zone metadata, including the primary nameserver and serial number. |

A useful detail: a `CNAME` cannot coexist with most other record types at the same name. If you need mail and a web alias on the same hostname, plan the records carefully.

## TTL and caching

Every record carries a time to live (TTL) in seconds. The recursive resolver may cache the answer until the TTL expires. This is why DNS changes are not always instant:

- Lower the TTL before a planned migration, ideally at least one old TTL period in advance.
- Make the change.
- Wait for caches to expire.
- Raise the TTL again once the new value is stable.

Negative answers are cached too. If a name does not exist, resolvers remember the `NXDOMAIN` response for a period defined by the zone's negative TTL.

## Watch a lookup with dig

`dig` shows the query, the answer, and the authority sections:

```bash
dig www.example.com A
```

Ask a specific resolver:

```bash
dig @1.1.1.1 www.example.com A
```

Trace the whole delegation path:

```bash
dig +trace www.example.com
```

Query a specific record type:

```bash
dig example.com MX
dig example.com TXT
dig example.com NS
```

Check what your operating system is actually using:

```bash
# Linux (systemd-resolved)
resolvectl status

# macOS
scutil --dns

# Windows PowerShell
Get-DnsClientServerAddress
Resolve-DnsName www.example.com
```

## Reading the answer section

A typical `dig` answer looks like this:

```text
;; ANSWER SECTION:
www.example.com.  300  IN  A  93.184.216.34
```

From left to right: name, TTL in seconds, class (`IN` means internet), type, and value. The TTL shown is the remaining cache lifetime, which may be lower than the zone's configured value.

If you see an empty answer with a `NOERROR` status, the name exists but has no record of that type. If you see `NXDOMAIN`, the name does not exist at all.

## Common failure modes

- **Wrong nameservers at the registrar.** The zone may be correct, but nobody is asking the right servers.
- **A stale negative cache.** A recently created name can keep failing until negative TTLs expire.
- **Split-horizon DNS.** Internal and external resolvers intentionally return different answers.
- **Propagation confusion.** Records do not “propagate” like a liquid; caches expire at different times.
- **Search domains.** A short name may be tried with local suffixes before the fully qualified name you intended.

## The diagnostic instinct

When DNS misbehaves, ask three questions in order:

1. **What does the authoritative server say?** Query the nameserver directly with `dig @ns1.example.com example.com`.
2. **What does the recursive resolver say?** Query your configured resolver.
3. **What does the client actually use?** Check interface settings, VPNs, and local hosts files.

That order separates bad data from bad caching from a client that is asking the wrong server entirely. Most DNS incidents collapse into one of those three buckets.
