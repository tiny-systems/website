---
title: GitHub runner
description: An in-cluster Actions runner so delivery jobs run next to the fleet.
weight: 120
section: ADD-ONS
---

An in-cluster GitHub Actions runner, registered with a one-hour
registration token when you toggle it on and pointed at the repo you name
in namespace settings.

With the runner on, the [issue → PR loop](/docs/github-loop/) is fully
in-cluster: a labeled issue reaches its session's inbox in about **five
seconds**, and the scheduled courier that empties the
[outbox](/docs/outbox/) runs right next to the fleet.

Delivery jobs use `tiny deliver`; the courier uses `tiny export`. Both are
the same binary you run on your laptop.
