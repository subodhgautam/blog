---
title: 'Reading the network stack'
description: 'A guided tour from socket to wire, so the next packet capture has a story you can follow.'
pubDate: 2026-11-01
updatedDate: 2026-11-03
level: 'Beginner'
order: 1
tags: ['tcp-ip', 'dns', 'packets']
draft: false
---

Most networking problems look mysterious until you know which layer is allowed to
answer the question. This guide walks down the stack in the same order a request
travels: the program, the name, the route, and finally the wire.

## Start with the program

Before you touch a packet capture, find out what the program actually asked for.
A browser opening a page, a script calling an API, and a database client opening
a socket all produce different traffic.

- What hostname or address is in the code or config?
- Which port did it choose?
- Is the connection long-lived or made per request?

If the program has a verbose or debug flag, it is usually faster than guessing
from the outside.

## Resolve the name

DNS is the first place a request can quietly fail. Check the name the same way
the client will, including search domains and the resolver in use.

```bash
dig example.com
dig +short example.com
resolvectl query example.com
```

A record that resolves in your terminal but not in the application usually means
the application is using a different resolver, a different network namespace, or
a cached answer.

## Follow the route

Once you have an address, the host has to decide where to send it. The routing
table is the short version of that decision.

```bash
ip route get 203.0.113.10
traceroute 203.0.113.10
```

Look for the interface, the next hop, and the source address the kernel chose.
A surprising source address often explains a firewall rule that seems wrong.

## Read the handshake

With the route in hand, a TCP connection should show a clean three-way
handshake. In a capture, that is the pattern you want to see:

1. Client sends `SYN`.
2. Server replies `SYN, ACK`.
3. Client sends `ACK`.

If the `SYN` leaves but nothing comes back, the problem is usually a path,
firewall, or listener issue. If the handshake completes and then stalls, look at
the application and the TLS layer instead.

## Triage checklist

Work from the inside out and stop at the first layer that disagrees with your
expectation:

- Does the name resolve to the address you expect?
- Does the route use the interface you expect?
- Does the listener exist on the port you expect?
- Does the handshake complete in a capture?
- Does the application log a clear error after the connection is open?

Keep this order. It turns "the network is broken" into a specific question with a
specific answer.
