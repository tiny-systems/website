---
title: Spawning sessions
description: Sessions spawn specialist sessions, each approved through the gate.
weight: 80
section: SESSIONS
---

A root session plans and specialists execute. When the plan needs a
toolchain the current image lacks, the house rules tell the agent to
spawn a specialist with `session_create` instead of improvising an
install, naming the right `image` and sizing (`cpu`, `memory`).

Every spawn is a [Question](/docs/gate/):

```
…start a session in golang:1.26 (cpu 1) — allow?
```

Your approval materialises the child's workload with your credentials;
no service account creates anything on its own. Children render under
their parent on the fleet screen, and a child whose parent is gone shows
as a root.

## Watching the tree

The parent watches its children with `session_list` — names, phases, and
their live titles. Children report by keeping their titles current; a
parent typically waits, aggregates, and ships through its own
[outbox](/docs/outbox/).

## No manager anywhere

Whoever creates a session builds its workload: your CLI on `tiny new`, a
runner job on `tiny deliver`, or you answering a spawn question.
Kubernetes replaces dead pods on its own (stock ReplicaSet behavior), and
deleting a session garbage-collects what it owns through owner
references. There used to be an operator with standing power;
[we deleted it](/blog/we-deleted-our-operator/).
