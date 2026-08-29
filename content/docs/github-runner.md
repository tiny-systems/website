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
`tiny deliver` writes to a Session object and `tiny export` lifts bundles
over the exec API. Running those on GitHub's hosted runners would mean
exposing your cluster to the internet. On the in-cluster runner the
cluster credentials stay in the cluster, a labeled issue reaches its
session's inbox in about five seconds, and the courier that empties the
[outbox](/docs/outbox/) runs next to the fleet.

The runner image carries the `tiny` CLI, installed by an init container
the same way [agent images](/docs/images/) get theirs. The workflow jobs
use the same binary you run on your laptop.
