---
title: Artifact store
description: An S3-compatible store beside the sessions, one checkbox away.
weight: 110
section: ADD-ONS
---

A minio store in the namespace for things too big for git: build
outputs, screenshots, datasets. Files put here outlive any single pod.

Every session arrives pre-wired: when the store runs, the entrypoint
configures `mc` with a `store` alias, so handing a file to the namespace
is one command —

```
mc cp build.tar store/artifacts/
mc cp store/artifacts/build.tar .        # …and picking it up in another session
mc mb store/coverage                     # buckets as needed
```

## Agents can ask for it

A session that wants the store and doesn't find the alias calls the
`enable_store` tool. The request parks at the [gate](/docs/gate/); your
answer provisions minio with your credentials, and the tool returns the
wiring command to the agent.

It is also a checkbox in `☰ namespace settings`: applied when you flip
it, torn down when you unflip it. The data volume is preserved.
