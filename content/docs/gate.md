---
title: The gate
description: Dangerous decisions park as Kubernetes objects until a human answers.
weight: 60
section: THE LOOP
---

When an agent reaches a decision it should not make alone (a force-push,
a spawn, provisioning infrastructure), it calls the sidecar's `ask_human`
tool, and that call blocks until someone answers. Minutes or hours. There
is no timeout after which it guesses.

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

There is no privileged manager acting on approvals. The sidecar that
raises questions can create Questions and update its own session's
status, and that is all it can do. The approved action runs with the
answering human's credentials or it does not run.

## What flows through the gate

- **Spawns** — `session_create` from a session parks until you allow it;
  approval materialises the child workload ([spawning](/docs/spawning/)).
- **Add-ons** — an agent that wants the artifact store calls
  `enable_store`; your answer provisions it and returns the wiring
  command to the agent.
- **Anything hard to undo** — the house rules tell the agent to
  `ask_human` first. That part is a convention the model follows; the
  hard backstop is that the agent holds no credentials to go around you
  with.

Questions whose session is gone still show on the fleet screen as
`(unattributed)`, so no decision waits invisibly.
