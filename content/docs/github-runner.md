---
title: GitHub runner
description: An in-cluster Actions runner so the loop's jobs run next to the fleet.
weight: 120
section: ADD-ONS
---

An in-cluster GitHub Actions runner, the third checkbox in namespace
settings. Point it at an org or a repo (the `runnerRepo` setting); it
registers itself with a one-hour registration token when you toggle it
on, and unregisters on the way out.

Jobs target it with the labels:

```yaml
runs-on: [self-hosted, tiny]
```

## Why in-cluster

The [issue → PR loop](/docs/github-loop/) needs to reach the sessions:
`tiny deliver` writes to a Session object, `tiny export` lifts bundles
over the exec API. Run those on GitHub's hosted runners and you'd be
opening your cluster to the internet; run them on the in-cluster runner
and the credentials never leave home — a labeled issue reaches its
session's inbox in about **five seconds**, and the courier that empties
the [outbox](/docs/outbox/) runs right next to the fleet.

The runner image carries the `tiny` CLI (it installs itself via an init
container — the same injection trick as [agent images](/docs/images/)).
Both jobs use the binary you already know: `tiny deliver`, `tiny export`.
