---
title: Spawning sessions
description: Sessions spawn specialists — each one through the human gate.
weight: 80
section: SESSIONS
---

A root session plans; specialists execute. When the plan needs a
toolchain the current image lacks, the agent doesn't improvise an install
— the house rules tell it to spawn a specialist with `session_create`,
naming the right `image` and sizing (`cpu`, `memory`).

Every spawn is a [Question](/docs/gate/):

```
…start a session in golang:1.26 (cpu 1) — allow?
```

Your approval **materialises the child's workload with your
credentials** — no service account creates anything on its own. Children
render under their parent on the fleet screen; a child whose parent is
gone shows as a root.

## Watching the tree

The parent watches its children with `session_list` — names, phases, and
their live titles. Children report by keeping their titles current; a
parent typically waits, aggregates, and ships through its own
[outbox](/docs/outbox/).

## No manager anywhere

The same rule as everywhere else: whoever *creates* a session builds its
workload — your CLI on `tiny new`, a runner job on `tiny deliver`, you
answering a spawn question. Kubernetes itself resurrects dead pods (stock
ReplicaSet behavior); deleting a session garbage-collects everything it
owns via owner references. There is no operator with standing power —
[we deleted it](/blog/we-deleted-our-operator/).
