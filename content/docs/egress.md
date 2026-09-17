---
title: Egress policy
description: Default-deny networking for session pods, and an honest account of what it does not stop.
weight: 128
section: ADD-ONS
---

An agent runs with `--permission-mode bypassPermissions`. Inside its pod
it can execute anything, and that is on purpose: a real CLI that gets
second-guessed on every call stops being the real CLI. The consequence is
that containment cannot come from asking the agent nicely. It has to be
network-shaped.

**New namespaces come up with it on.** A namespace whose switchboard
already exists but predates the add-on keeps its egress untouched, since
cutting a session off from something it reached yesterday is a surprise
rather than a default. Either way it stays a checkbox: `tiny` → `☰
namespace settings` → **egress policy**.

Turn it off if your model API sits behind a private endpoint, or a
session needs an internal registry, database or SSH host on the private
network — see [what it allows](#what-it-allows) below.

## What it allows

The add-on is one `NetworkPolicy` object — no pod, no Deployment, nothing
running and nothing to pay for. The CNI already on every node does the
enforcing; the policy just tells it what to permit. It also applies to
sessions that are already running, with no restart.

A default-deny egress policy lands on every session pod, and three things
are allowed back:

| allowed | why |
|---|---|
| DNS (port 53) | kube-dns lives in another namespace, which the internet rule excludes |
| this namespace, any port | sessions hand each other files through the [artifact store](/docs/artifact-store/) and reach each other's [exposed ports](/docs/spawning/) |
| http and https to the internet | the agent has to reach its model API, and `git`, `npm` and `pip` have to work |

The internet rule cuts out private address space: `169.254.0.0/16`,
`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.

## What that actually closes

**The cloud metadata endpoint.** `169.254.169.254` is how a process on a
cloud instance reads that instance's credentials, and talking an agent
into fetching it is a documented attack. The link-local exclusion covers
it on every port.

**Every port except 80 and 443.** No SSH out, no database ports, no
reverse shell on 4444.

**Other namespaces.** A session cannot reach another tenant's services,
or the node.

## What it does not close

**Exfiltration over 443.** A `NetworkPolicy` selects addresses, not
hostnames, and the agent must reach its model API — so HTTPS to the
internet stays open, and anything that can be POSTed can still leave.
Closing that needs an egress proxy with a hostname allow-list for the
policy to point at, which does not exist yet.

**DNS tunnelling.** Port 53 is allowed to any destination, so data can be
encoded into queries against a nameserver the attacker controls. It is
open that wide on purpose: clusters running NodeLocal DNSCache resolve
via `169.254.20.10`, and the link-local exclusion that closes the
metadata endpoint would otherwise break resolution entirely.

**Both of those close with the allow-list below.**

If you are thinking in terms of the [lethal
trifecta](https://simonwillison.net/tags/prompt-injection/) — private
data, untrusted content, a way out — the policy alone narrows the third
leg. The allow-list is what cuts it.

## The hostname allow-list

Tick **hostname allow-list** under the egress policy and the shape
changes: the internet rule disappears entirely, and everything outbound
goes through a small proxy in the namespace that filters by *name*.

A `NetworkPolicy` cannot do this. It selects addresses, and
`api.anthropic.com` is a CDN on addresses that rotate. Filtering by
hostname needs something that speaks the protocol, so the policy points
at a proxy and the proxy holds the list.

It is a `CONNECT` proxy, which matters for what it does **not** do. The
hostname arrives in plaintext on the request line, before the tunnel
opens. The proxy checks it, then copies bytes without understanding
them. No certificate is minted, no CA is installed in your image, and
TLS between the agent and its model is never broken.

With it on, DNS narrows too — to kube-system and to link-local on port
53 only, which keeps NodeLocal DNSCache working without reopening the
metadata endpoint. Sessions get `HTTPS_PROXY` as an address rather than
a name, so they need no external DNS at all.

### Editing the list

```sh
kubectl edit configmap tiny-egress-allow
```

One host per line; a leading dot matches subdomains, so `.npmjs.org`
admits `registry.npmjs.org` without admitting `npmjs.org.evil.com`. The
proxy re-reads the file, so widening the list does not restart anything.
The default is short on purpose: the agent APIs, GitHub, and the main
package registries.

A refusal says what to do about it, and is logged:

```
tiny egress proxy: "exfil.example.com" is not in this namespace's allow-list.
Ask a human to add it: kubectl edit configmap tiny-egress-allow
```

```sh
kubectl logs deploy/tiny-egress | grep DENIED
```

That log is worth watching. An agent reaching for a host nobody
allow-listed is a thing you want to know about.

### What it still does not fix

Allow-listing `github.com` means an agent can write to a gist.
Allow-listing the model API means it can put your source in a prompt. An
allow-list shrinks the exit to a few doors you chose to trust; it does
not seal the building. And the model credential stays in the pod either
way.

In-namespace traffic bypasses the proxy through `NO_PROXY`, so the
artifact store and another session's exposed port keep working without
being listed.

**The model credential still lives in the agent pod.** That is inherent
to running the vendor CLI; see the [threat model](/docs/threat-model/).

## It only works if your CNI enforces it

Kubernetes accepts a `NetworkPolicy` on any cluster. Enforcing it is the
CNI's job, and not every CNI does. Calico, Cilium, Antrea, kube-router
and the cloud CNIs enforce; **flannel does not, and neither does kind's
default**. On those the object is accepted and quietly does nothing.

Because a control that silently does nothing is worse than no control,
the settings screen looks for a NetworkPolicy-capable CNI and says so:

```
[x] egress policy — ...   ● enforced by cilium
[x] egress policy — ...   ✗ NOT ENFORCED — no NetworkPolicy-capable CNI found
```

If it cannot read `kube-system` it reports unknown rather than guessing.
Check it before relying on the checkbox.

## Turning it off

Untick it. The policy is deleted and sessions go back to unrestricted
egress; nothing else changes.
