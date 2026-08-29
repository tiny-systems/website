---
title: The outbox
description: How work leaves the cluster when agents hold zero credentials.
weight: 50
section: THE LOOP
---

Agent pods carry no git or GitHub credentials, so a compromised agent
cannot push or call the API. That raises an obvious question: how does a
finished branch become a pull request?

## The bundle is the send

When a branch is ready, the session runs one git command that needs no
network and no secrets:

```
git bundle create /workspace/outbox/tiny-issue-7.bundle tiny/issue-7
```

A bundle is a self-contained, transportable branch. Writing that file is
the whole submission; the agent has no other channel.

## The courier

A scheduled GitHub Actions job (seconds long, every ~5 minutes) runs
`tiny export`:

1. Lists pending bundles across sessions **over the Kubernetes exec
   API** — argv-only with an allowlist on bundle names; no shell, no
   interpolation, nothing an agent wrote gets executed.
2. Downloads each bundle, fetches its branch, **rebases onto
   `origin/main`** — a bundle grown from an older clone must not carry
   stale files back in.
3. Pushes with the **job's own short-lived `GITHUB_TOKEN`** — a
   credential that exists for seconds, inside a runner, never inside an
   agent pod.
4. `tiny/issue-N` becomes a pull request; a `REPLY.md` committed on
   `tiny/reply-N` becomes an issue comment (and the branch is deleted).
5. `tiny export --ack <bundle>` retires the bundle — **only after** the
   push succeeded. A failed push means the bundle waits for the next
   courier run. Delivery is at-least-once; a re-bundle of the same
   branch simply updates it.

## Security properties

- The only credential in the whole path lives for seconds, in a runner.
- Pushes made with the job token trigger no further workflows —
  GitHub's recursion guard, working for us.
- The exec channel accepts a fixed argv and bundle-name pattern
  (`^[A-Za-z0-9][A-Za-z0-9._-]*\.bundle$`); agent-controlled text never
  reaches a shell.
- A hostile agent can write files into its own outbox and nothing else.
  The courier rebases the branch and you review the PR, the same as for
  any contributor.

Wire-up lives in [Issues to PRs](/docs/github-loop/); the design story in
[the field notes](/blog/the-outbox/).
