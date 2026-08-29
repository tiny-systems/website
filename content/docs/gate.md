---
title: The gate
description: Every dangerous decision parks as an auditable Kubernetes object until a human answers.
weight: 60
section: THE LOOP
---

When an agent reaches a decision it must not make alone — a force-push, a
spawn, provisioning infrastructure — it calls the sidecar's `ask_human`
tool, and that call **blocks**. Minutes or hours. The agent literally
cannot proceed; there is no timeout-and-guess.

The blocked call is a Question CR — visible to anyone with kubectl:

```
$ kubectl get questions
NAME      SESSION   QUESTION                                          ANSWER
q-pr5qp   s-x7k2f   May I force-push the rebased branch?              yes
q-8w6lw   root      …start a session in golang:1.26 (cpu 1) — allow?  allow
```

## Answering is acting

Press `a` on the fleet screen (or `tiny answer q-pr5qp yes`) and two
things happen as one:

1. The answer lands and the agent's blocked tool call returns.
2. If the question carries an **action** — spawn this session, enable
   this add-on — your answer *performs it, with your credentials*. The
   cluster's audit log names you, not a service account.

That second half is the design: there is no privileged manager acting on
approvals. The sidecar that raises questions is powerless — it can create
Questions and update its own session's status, nothing else. Your `y` is
the only thing in the system with the power to say yes.

## What flows through the gate

- **Spawns** — `session_create` from a session parks until you allow it;
  approval materialises the child workload ([spawning](/docs/spawning/)).
- **Add-ons** — an agent that wants the artifact store calls
  `enable_store`; your answer provisions it and returns the wiring
  command to the agent.
- **Anything the agent decides is truly yours** — the house rules tell it
  to `ask_human` before anything hard to undo. It's a convention the
  model follows, backed by the hard rule that the agent holds no
  credentials with which to go around you.

Questions whose session is gone still show on the fleet screen as
`(unattributed)` — no decision waits invisibly.
