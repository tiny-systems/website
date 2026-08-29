---
title: Issues to PRs
description: Label an issue `tiny`, harvest a pull request.
weight: 40
section: THE LOOP
---

The [seedling](https://github.com/tiny-systems/seedling) repo carries a
workflow you can copy: label an issue `tiny` and a **five-second** Actions
job on the in-cluster runner pipes it into the root session's inbox:

```
gh issue edit 7 --add-label tiny
# …the root session picks it up, works, spawns specialists if needed
```

The session works and ships **through the outbox** — a branch becomes a
pull request, a `REPLY.md` becomes an issue comment, and the agent that did
the work held no credentials at any point.

## One-time GitHub setting

For the PR half, flip the org toggle once: **Settings → Actions → General →
Workflow permissions → Allow GitHub Actions to create and approve pull
requests**. Until it's on, the courier fails loudly (and retries later)
rather than acking work it could not deliver.
