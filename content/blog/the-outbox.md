---
title: "The outbox: agents that hold no credentials at all"
description: "Job tokens die with their jobs and deploy keys sprawl, so our agents stopped pushing entirely."
date: "2026-08-29"
author: tiny systems
---

Every agent platform eventually hits the same question: how does the
agent push its work? We went through the obvious answers and disliked
all of them.

**Give it a deploy key** and you've stored a long-lived credential inside
every workload an LLM controls. One prompt injection away from a force-push
to main.

**Pass it a job token** and you've coupled the agent's lifetime to a CI
job's. We tried this — GitHub revokes the token the moment the job ends,
and our jobs end in seconds while our agents work for hours. We found out
live, watching a push fail with a token that had been valid at breakfast.

**Proxy the push through a server** and now you run a server holding the
credentials, which is the thing we set out to not do.

## What we shipped instead

The agent doesn't push. It has nothing to push with. When a branch is
ready, the session runs one git command that needs neither network nor
secrets:

```
git bundle create /workspace/outbox/tiny-issue-7.bundle tiny/issue-7
```

A **courier** — a scheduled GitHub Actions job that lives for seconds —
runs `tiny export`: it lists pending bundles over the Kubernetes exec API,
lifts them out, rebases each onto `main`, and pushes with its own
short-lived token. The branch becomes a pull request; a `REPLY.md` becomes
an issue comment. A bundle is retired only after its push succeeds.

The part we like most is the security shape:

- The credential exists for seconds, in a runner, never in an agent pod.
- The exec call is argv-only with an allowlist on bundle names, so
  nothing an agent wrote gets near a shell.
- Pushes made with the job's token trigger no further workflows, so the
  loop can't recurse.
- A compromised agent can write files to its own outbox. That's the whole
  blast radius.

The first pull request produced this way is up in our demo repo:
[seedling PR #2](https://github.com/tiny-systems/seedling/pull/2). It
started as a labeled issue and arrived as +100/−3.
