---
title: The gate
description: Every dangerous decision parks as an auditable Kubernetes object.
weight: 60
section: THE LOOP
---

When an agent reaches a decision it must not make alone, the tool call
**blocks** — minutes or hours — until a person answers. Blocked calls park
as Question CRs:

```
$ kubectl get questions
NAME      SESSION   QUESTION                                        ANSWER
q-pr5qp   s-x7k2f   May I force-push the rebased branch?            yes
q-8w6lw   root      …start a session in golang:1.26 (cpu 1) — allow?  allow
```

**Answering is acting.** Pressing `y` performs the approved action with
*your* credentials, so the cluster's audit log names the human — not a
service account. Answer from the fleet screen, or from anywhere:

```
tiny answer q-pr5qp yes
```

The sidecar that raises questions is powerless by design: it can create
Questions and update its own session's status, nothing else.
