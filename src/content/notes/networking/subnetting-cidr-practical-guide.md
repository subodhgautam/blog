---
title: 'Subnetting without the headache: a practical CIDR guide'
description: 'A working method for reading CIDR notation, finding usable host ranges, and answering the subnetting questions that actually come up.'
pubDate: 2026-10-14
tags: ['subnetting', 'cidr', 'ipv4']
---

Subnetting is usually taught as a wall of binary. That is useful for passing an exam, but it is a slow way to answer the questions you meet in real work: *Is this address in that subnet? How many hosts fit? What is the broadcast address?*

This guide gives you a practical method, then shows the binary once to explain why it works.

## The only numbers you need

An IPv4 address is 32 bits. The prefix length after the slash tells you how many of those bits identify the network:

| CIDR | Mask | Addresses | Usable hosts* |
| --- | --- | --- | --- |
| /24 | 255.255.255.0 | 256 | 254 |
| /25 | 255.255.255.128 | 128 | 126 |
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /28 | 255.255.255.240 | 16 | 14 |
| /29 | 255.255.255.248 | 8 | 6 |
| /30 | 255.255.255.252 | 4 | 2 |
| /31 | 255.255.255.254 | 2 | 2 (point-to-point) |
| /32 | 255.255.255.255 | 1 | 1 (host route) |

\*Classic subnets reserve the network and broadcast addresses. Modern point-to-point links can use /31, and a single host can use /32.

The pattern is worth memorizing: every step up in prefix length halves the address count. The interesting values are 128, 64, 32, 16, 8, 4, 2, 1.

## Find the block size

Take `192.168.10.66/26`.

1. A /26 contains 64 addresses.
2. The last octet is divided into blocks of 64: `0–63`, `64–127`, `128–191`, `192–255`.
3. `66` falls inside `64–127`.

So:

- **Network address:** `192.168.10.64`
- **First usable:** `192.168.10.65`
- **Last usable:** `192.168.10.126`
- **Broadcast:** `192.168.10.127`
- **Usable hosts:** 62

That is all you need for most day-to-day questions.

## Why the block size works

The prefix splits the 32 bits into a network part and a host part. For a /26, the first 26 bits are fixed and the remaining 6 bits are free.

```text
192.168.10.66/26

11000000.10101000.00001010.01000010
11111111.11111111.11111111.11000000
                                      ^^ network bits end here
```

The last six bits can represent 0 through 63, so each subnet is a block of 64. The network address clears all host bits. The broadcast address sets all host bits. Everything in between is usable.

Once you see `64` as the block size, the addresses reveal themselves.

## A trick for the last octet

For any prefix between /24 and /32, the block size is:

```text
256 - (mask value in the last octet)
```

For /26, the mask is `255.255.255.192`, so `256 - 192 = 64`. For /28, the mask is `240`, so `256 - 240 = 16`.

Then find the largest multiple of the block size that is less than or equal to the host octet. That multiple is the network address.

## Is an address inside a subnet?

Question: is `10.20.30.200` inside `10.20.30.128/25`?

A /25 has two blocks of 128: `0–127` and `128–255`. The address sits in the upper block, which starts at `.128`. The network is `10.20.30.128`, the broadcast is `10.20.30.255`, and the usable range is `.129–.254`.

Yes — it is inside.

You do not need to convert to binary for this. Compare the address against the block boundaries.

## Subnets do not have to align with octets

For prefixes shorter than /24, the same math applies to an earlier octet:

`172.16.80.0/20`

A /20 has a block size of 16 in the third octet. The third octet `80` is a multiple of 16, so the network is exactly `172.16.80.0`. It spans `172.16.80.0` through `172.16.95.255`.

If the address were `172.16.90.10/20`, it would still land in the `80–95` block, so the network would again be `172.16.80.0`.

## Use a tool, but know the method

For real changes, validate with a tool:

```bash
# Linux
ipcalc 192.168.10.66/26

# Python
python3 -c "import ipaddress; print(ipaddress.ip_network('192.168.10.66/26', strict=False))"
```

PowerShell has no built-in `ipcalc`, but you can inspect interfaces and routes:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Select-Object IPAddress, PrefixLength, InterfaceAlias
Get-NetRoute -AddressFamily IPv4 | Select-Object DestinationPrefix, NextHop, InterfaceAlias
```

Tools are for confirmation, not for replacing understanding. When a subnet overlaps another one or a route behaves oddly, the block-size method lets you reason about the problem immediately.

## The checklist

- Determine the block size from the prefix.
- Find the block containing the address.
- Network address = block start.
- Broadcast = next block start minus one.
- Usable hosts = addresses minus two (except /31 and /32).
- Verify with `ipcalc` or Python before applying a change.

Subnetting becomes ordinary arithmetic the moment you stop visualizing binary and start asking one question: *which block of addresses is this?*
