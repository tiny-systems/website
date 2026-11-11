---
title: "Our docs said DNS was closed. It wasn't."
description: "We found a hole in our own egress story by explaining it out loud. The fix, the probe we ran on a live cluster, and what is still open."
date: "2026-11-11"
author: tiny systems
---

tiny runs Claude Code and Codex as pods on your own Kubernetes cluster,
with no git or cloud credentials inside them. Outbound traffic is the
other half of that story. Switch on the hostname allow-list and every
connection goes through a small `CONNECT` proxy that only lets named
hosts through.

For a month, the docs for that mode said it closed DNS too. The
reasoning sounded fine: in proxy mode the NetworkPolicy only lets a
session talk to the cluster's own resolver in `kube-system`, so it can't
query a nameserver an attacker runs.

We found the problem while explaining the feature to someone, not in a
test. The cluster resolver doesn't stop at the cluster. CoreDNS answers
what it knows and forwards everything else upstream. A lookup for
`c2VjcmV0.attacker.example` leaves the session, reaches CoreDNS, gets
forwarded to the internet and lands on the attacker's nameserver, with
the data sitting in the name. The policy blocked the direct route and
left the indirect one wide open. One hop later, same leak.

## The fix

The proxy pod now runs a tiny resolver of its own and becomes the
session's only nameserver. Sessions get `dnsPolicy: None`, pointed at
the proxy's ClusterIP. The resolver answers in two ways. A name inside
the cluster, like `tiny-minio` or the API server, is forwarded to the
real cluster resolver. Every other name gets `NXDOMAIN` and a log line.

That works because a session never needs to resolve an outside name in
the first place. A `CONNECT` proxy receives the hostname and resolves it
itself, on the far side of the policy. In proxy mode the NetworkPolicy
no longer has a port 53 rule at all.

Refused lookups show up in `tiny egress denied` next to refused
connections, marked as lookups. That distinction turned out to matter.
A refused connect means "allow-list this host if you trust it". A
refused lookup means some tool is resolving names itself instead of
using `HTTPS_PROXY`, and allow-listing the host won't help it.

## Checking it on a real cluster

Unit tests passed, which proves the YAML looks right. To see what a
session can actually do, we ran a probe pod on our k3s box with the same
label, resolver and security settings a session gets:

| attempt | result |
|---|---|
| resolve `tiny-egress` (in-cluster) | answered |
| resolve `example.com` | NXDOMAIN |
| `CONNECT api.anthropic.com:443` via the proxy | 200 |
| `CONNECT example.com:443` via the proxy | 403 |
| direct `1.1.1.1:443` | refused |
| DNS straight to `8.8.8.8` | blocked |
| `169.254.169.254` (cloud metadata) | blocked |

The first run reported the direct 443 connection as open, which would
have been bad news. It wasn't real. k3s's policy controller rejects with
a TCP reset, and busybox `nc -z` counts a reset as success. `wget` got
"connection refused" from the same pod. Worth knowing if you ever probe
your own NetworkPolicy with netcat; use a real client.

## Deleting a session from inside it

While we were at it, we checked what the session's own Kubernetes token
can do. From inside a running session, using only the token its pod
actually holds, we tried to delete its Session, its Deployment, its pod
and its workspace volume. Then to rewrite its own task, add
`evil.example` to the allow-list, delete the NetworkPolicy, list
secrets, and approve its own pending question.

Nine attempts, nine 403s. A prompt-injected agent can't widen its own
access or wave its own request through. Those moves need a human with
real cluster credentials.

The same release put every container in a session pod under the
restricted profile: the runtime's default seccomp filter, every Linux
capability dropped, no privilege escalation. That's what stands between
"an attacker owns the agent's uid" and "an attacker owns the node".
Rootless buildah needs user namespaces, which that profile forbids, so
`tiny new --unconfined` lifts it for one session. It stays non-root and
the network policy still applies.

## What is still open

A security post is only worth its exceptions, so here they are:

- **The model credential lives in the pod.** The real vendor CLI needs
  it. A compromised session can spend your quota and send that token to
  any host on the allow-list.
- **Allowed hosts are allowed for everything.** Allow-listing
  `github.com` still lets an agent write a gist, because the proxy reads
  hostnames, not URLs.
- **Keyless calls can repeat.** If a pod dies mid-request to some public
  endpoint, the resumed agent may send it again. Anything that needs
  credentials can't repeat, because the agent has none.
- **Containers share the node's kernel by default.** Since v0.13,
  `tiny new --runtime-class gvisor` runs a session under gVisor, which
  closes that path, but it needs gVisor installed on the cluster and
  builds run slower.
- **The policy only works where the CNI enforces it.** We found one of
  our own GKE clusters running without an enforcer. The fleet screen
  says ENFORCED or NOT ENFORCED for exactly that reason.

## Also shipped recently

Sessions can now register extra MCP servers in their spec, for Claude and
Codex alike. A session can be pinned to its own node pool with a node
selector and tolerations. Every toleration has to name a taint key. A key-less wildcard would
let a session onto every tainted pool in the cluster, so it is refused. And
`pkg/session` is a public Go API for creating sessions from your own
code, without shelling out to the CLI.

Everything above is in v0.14.0. The egress details are in the
[egress docs](/docs/egress/), and the full list of what a session holds
is in the [threat model](/docs/threat-model/).
