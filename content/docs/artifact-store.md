---
title: Artifact store
description: An S3-compatible store beside the sessions, one checkbox away.
weight: 110
section: ADD-ONS
---

A **minio** store in the namespace for things too big for git — builds,
screenshots, datasets. They land here instead of dying with a pod.

Sessions hand each other files:

```
mc cp build.tar store/artifacts/
```

Like every add-on it's one checkbox in namespace settings — and agents can
request it themselves through the [gate](/docs/gate/): the store question
parks until you answer, and your `y` provisions it.
