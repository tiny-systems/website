---
title: Spawning sessions
description: Sessions spawn sessions — through a human gate.
weight: 80
section: SESSIONS
---

A light root session plans, then asks to start specialists in the right
toolchain with the right cpu/memory. Each spawn is a
[Question](/docs/gate/):

```
…start a session in golang:1.26 (cpu 1) — allow?
```

You approve from the fleet screen; **your approval materialises the
workload with your credentials**. Children render under their parent, and
deleting a session garbage-collects everything it owns via owner
references.

There is no server and no operator pod behind any of this: whoever
*creates* a session — your CLI on `tiny new`, a runner job on `tiny
deliver`, you answering a spawn question — builds its workload. Kubernetes
itself resurrects dead pods; kill one mid-task and the replacement resumes
the transcript. That's stock ReplicaSet behavior, not tiny code.
