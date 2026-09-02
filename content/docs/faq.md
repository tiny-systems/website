---
title: FAQ
description: The questions we'd ask, answered without spin.
weight: 140
section: SECURITY
---

## Why not tmux on a $5 VPS?

That works, and if you run one agent it might be all you need. What it
doesn't give you: recovery when the process or box dies mid-task (tiny
sessions resume from the transcript after a pod kill), more than one
agent without inventing your own process supervision, per-session
CPU/memory limits, the issue → PR loop, or an audit trail of who
approved what. If none of that matters to you, keep the VPS.

## Why Kubernetes?

Because it already solves the boring parts: restart-on-death, volumes
that outlive processes, resource limits, RBAC, image pulling. tiny adds
about two CRDs on top instead of re-implementing any of it. The cost is
that you need a cluster; kind or minikube on a laptop counts.

## Isn't running an agent with permissions bypassed dangerous?

Inside a pod with no credentials, less than it sounds — the
[threat model](/docs/threat-model/) walks the actual blast radius. The
short version: the pod is the sandbox, the gate holds the credentials,
and the worst an injected agent can do is waste tokens and write files
into its own outbox.

## Is this safer than just running the agent on my laptop?

For autonomous work, yes, and here is the honest comparison. Overnight
work needs permissions bypassed somewhere. On your laptop, an agent
running that way has everything you have: SSH keys, gh token, browser
sessions, cloud credentials, every repo you've cloned. In tiny the same
agent has a workspace volume and a model token. No git credentials,
non-root, resource-limited, and anything dangerous parks at the
[gate](/docs/gate/) until a human's own credentials perform it.

For supervised work the comparison is different: local Claude Code in
default mode asks before each command, which is its own kind of safe.
tiny is for the runs where nobody is watching.

## What does it cost to run?

Idle: nothing but the CRD definitions. A running session is one pod
sized by you (the default agent image is fine with ~500m CPU / 1Gi) plus
a small sidecar. Agent usage bills to whatever plan you signed in with —
Claude Pro/Max and ChatGPT Plus both work, which is the point: a fleet
on the flat plan you already pay.

## What happens when two sessions edit the same repo?

Each session has its own workspace and its own branch convention
(`tiny/issue-N`). The courier rebases every branch onto `main` before
pushing and skips branches that don't rebase cleanly, so conflicts
surface as a failed push, not a broken main.

## Does it work with my private repo?

Yes — `tiny setup` mints an ed25519 deploy key; you add the public half
to the repo. Clones happen with that key. Pushes still go through the
[outbox](/docs/outbox/), so the key never needs write access.

## Claude or Codex?

[Both](/docs/agents/), per session. We don't have a strong opinion;
run yours on the plan you already pay for.

## What's the catch?

It's early. The pieces described in these docs are real and tested (we
kill pods on camera), but the project is weeks old, the fleet screen is
a TUI not a web app, and you are trusting a young codebase with cluster
access scoped by your own RBAC. Read the code; it's small on purpose.
