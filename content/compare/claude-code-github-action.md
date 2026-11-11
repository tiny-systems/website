---
title: "tiny vs the Claude Code GitHub Action"
seotitle: "Claude Code GitHub Action alternative: issue to PR, self-hosted"
description: "Both turn a GitHub issue into a pull request. The Action runs a job holding a write token; tiny runs a long-lived session on your cluster that holds none."
weight: 20
updated: "2026-11-11"
---

The [Claude Code GitHub Action](https://github.com/anthropics/claude-code-action)
runs Claude Code inside a workflow job. Mention `@claude` on an issue or
pull request, or trigger it from any GitHub event, and Claude works in the
job, pushes commits and replies in a comment. It's official, and setup
takes a few minutes with `/install-github-app`.

tiny's [GitHub loop](/docs/github-loop/) does the same job from a
different place: label an issue `tiny`, a session on your Kubernetes
cluster picks it up, and a pull request comes back.

## Side by side

| | Claude Code GitHub Action | tiny |
|---|---|---|
| trigger | `@claude` mention, or any GitHub event with a prompt | a labelled issue, or anything that pipes text into `tiny deliver` |
| where it runs | a workflow job, on GitHub-hosted runners by default | a pod on your Kubernetes; an in-cluster runner only delivers the issue |
| lifetime | one job per request, bounded by your workflow timeout | a long-lived session that keeps its workspace and transcript |
| GitHub access during the run | the job holds a token with contents, issues and pull-request write access | the agent pod holds no GitHub token |
| how work lands | Claude pushes commits from the job | the agent writes a git bundle; a separate short-lived job pushes it and opens the PR |
| when it needs a decision | it replies on the issue | the question lands as an issue comment with the `tiny answer` command, run with your credentials |
| watching it work | the comment it updates, and the job log | attach to the real terminal mid-task |
| agents | Claude Code | Claude Code and Codex |
| what you pay | Actions minutes plus tokens or your subscription | your cluster plus tokens or your subscription |

## Where the Action is the better choice

- **Zero infrastructure.** No cluster, no runner to host, a workflow file
  and a secret.
- **It's the official path,** maintained alongside Claude Code, with
  code-review workflows and plugins ready to use.
- **Short tasks.** For a review comment or a small fix, a job that starts,
  works and exits is exactly right.

## Where tiny fits

- **The agent never holds a token that can push.** In a workflow job, the
  token that lets Claude push is available to the process reading the
  issue. A prompt injection in that issue runs with it. tiny's agent can
  only write a file; the push happens in a separate job it can't reach.
- **Long or interrupted work.** A session survives pod restarts and
  usage-limit pauses and carries on where it stopped, rather than ending
  with a job timeout.
- **You want to look in.** `tiny attach` puts you in the agent's terminal
  while it works, and you can steer it.
- **Your cluster's network,** your images, your registry cache, and the
  same egress rules as every other session.

The two aren't exclusive. Plenty of teams would use the Action for quick
reviews and tiny for the work that takes an afternoon.

Sources: Anthropic's [GitHub Actions documentation](https://code.claude.com/docs/en/github-actions),
checked on the date above. Tell us on [GitHub](https://github.com/tiny-systems/tiny/issues)
if a row has gone stale.
