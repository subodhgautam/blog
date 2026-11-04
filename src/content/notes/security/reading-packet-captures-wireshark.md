---
title: 'Reading a packet capture: a beginner’s Wireshark workflow'
description: 'A calm, repeatable process for inspecting traffic: capture narrowly, filter precisely, follow the conversation, and verify what you think you saw.'
pubDate: 2026-08-05
tags: ['wireshark', 'packets', 'troubleshooting']
---

A packet capture is raw evidence. Wireshark is the magnifying glass. The difficulty is not opening a `.pcap`; it is knowing where to look first so that thousands of packets do not turn into noise.

This is a workflow, not a tour of every button.

## Capture narrowly

The best troubleshooting capture is small. Decide on a host, a port, or both before you start.

With `tcpdump` on a Linux host:

```bash
sudo tcpdump -i any -nn -s 0 -w capture.pcap host 10.0.0.25 and port 443
```

With Wireshark's capture filters (applied before capture):

```text
host 10.0.0.25 and tcp port 443
```

Capture filters use BPF syntax. Display filters use Wireshark's own syntax. They are different languages, and mixing them up is a classic time sink.

If you must capture broadly, use a ring buffer so a long-running capture does not fill the disk:

```bash
sudo tcpdump -i any -nn -s 0 -C 100 -W 10 -w capture.pcap
```

That writes rotating files of roughly 100 MB, up to ten files.

## Filter before you read

Open the capture and start with a display filter:

```text
ip.addr == 10.0.0.25 && tcp.port == 443
```

Useful filters to keep nearby:

```text
tcp.flags.syn == 1 && tcp.flags.ack == 0      # connection attempts
tcp.analysis.retransmission                  # retransmissions
tcp.analysis.zero_window                     # receiver is overwhelmed
dns                                          # all DNS
http.request                                 # HTTP requests
tls.handshake.extensions_server_name         # SNI in TLS
icmp                                         # ping and errors
```

Filters are composable. If you are unsure, type slowly and watch the bar turn green — Wireshark validates as you type.

## Look at the TCP handshake first

For a connection that should have worked, verify the basics:

1. **SYN** from client to server.
2. **SYN/ACK** from server.
3. **ACK** from client.

Then look for application data. If the handshake never completes:

- No SYN/ACK: the server may be down, filtered by a firewall, or routed elsewhere.
- SYN/ACK but no ACK: return path or client-side issue.
- Repeated SYNs: retransmission, often a firewall dropping packets silently.
- RST: something actively refused the connection.

A reset is a decision. Silence is usually a filter.

## Follow the stream

Once you have the right connection, right-click a packet and choose **Follow > TCP Stream**. Wireshark reassembles the payload in order, which turns a scattered conversation into something readable.

For TLS, the payload will be encrypted. You can still learn a lot from the handshake:

- Which server name (SNI) the client requested.
- Which TLS version was negotiated.
- Which certificate was presented.
- Whether the handshake failed and why.

Do not expect to read application contents without the keys. If you control the client and server, you can configure TLS key logging for testing, but treat those keys as secrets.

## Measure time

Wireshark's **Statistics > Conversations** view sorts by duration and bytes. This is often enough to find the slow conversation without reading a single packet.

Useful columns to add:

- `tcp.stream` — groups packets by connection.
- `frame.time_relative` — time since the start of the capture.
- `tcp.time_delta` — time since the previous packet in the stream.

A large delta inside a stream usually points to application processing or a stalled receiver, not the network itself.

## Know the difference between a symptom and a cause

A retransmission is a symptom. It might mean packet loss, but it might also mean a capture point that sees only one direction, or a receiver that is not acknowledging. Before blaming the network:

- Confirm the capture sees both directions.
- Check whether the retransmitted packet is acknowledged later.
- Compare timestamps across capture points if you have them.

One-sided captures produce misleading analysis. This is the most common beginner mistake, and it is easy to avoid by capturing at both ends when possible.

## A compact troubleshooting loop

1. Reproduce the problem while capturing narrowly.
2. Filter to the flows that matter.
3. Confirm the transport handshake.
4. Follow the TCP stream or inspect the TLS handshake.
5. Check timing and retransmissions.
6. Corroborate with application logs.

If the packet capture and the application logs disagree, find out why. That gap is usually where the real bug lives.

## A note on authorization and privacy

Packet captures can contain credentials, tokens, personal data, and internal topology. Capture only traffic you are authorized to inspect, store captures securely, and delete them when the investigation ends. A `.pcap` is not a harmless text file.

Read captures like evidence: narrow question, small sample, precise filters, and a conclusion you can defend with a specific packet.
