---
title: The outbox
description: How work leaves the cluster when agents hold zero credentials.
weight: 50
section: THE LOOP
---

**Agents hold no credentials at all.** No deploy keys, no PATs, nothing
stored in pods. A compromised agent can neither push nor call the GitHub
API. So how does work get out?

1. The session commits on a branch and writes a **git bundle** to its
   outbox:

```
git bundle create /workspace/outbox/tiny-issue-7.bundle tiny/issue-7
```

2. A scheduled, seconds-long **courier job** (`tiny export`, every ~5
   minutes) lifts pending bundles out over the Kubernetes exec API,
   rebases them onto `main`, and pushes with the job's own short-lived
   token.

3. `tiny/issue-N` becomes a pull request; a `REPLY.md` on `tiny/reply-N`
   becomes an issue comment.

A bundle is retired only **after** its push succeeds — a failed push means
the bundle waits for the next courier run. Nothing to paste, nothing
stored, nothing to leak.
