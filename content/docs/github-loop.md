---
title: Issues to PRs
description: The complete GitHub wiring — label an issue, harvest a pull request. Copy-paste ready.
weight: 40
section: THE LOOP
---

The whole integration is **one workflow file** in your repo. No app to
install, no webhook to register, no bot account: GitHub's own events, an
in-cluster runner, and `tiny deliver`.

## Prerequisites

1. The **[GitHub runner add-on](/docs/github-runner/)** switched on in
   namespace settings, watching your org or repo — delivery jobs run
   *inside* the cluster, next to the sessions.
2. A **deploy key** for cloning (minted by `tiny setup`, public half on
   the repo).
3. One org toggle for the PR half: **Settings → Actions → General →
   Workflow permissions → Allow GitHub Actions to create and approve pull
   requests.**

## The delivery job

Label an issue `tiny` and this runs — for about five seconds:

```yaml
# .github/workflows/tiny.yml
name: tiny
on:
  issues:
    types: [labeled]
  schedule:
    - cron: "*/5 * * * *"    # the outbox courier (below)

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  deliver:
    if: github.event_name == 'issues' && github.event.label.name == 'tiny'
    runs-on: [self-hosted, tiny]
    timeout-minutes: 5
    env:
      N: ${{ github.event.issue.number }}
      # Issue title/body are ATTACKER-CONTROLLED: they enter only as env
      # vars, never interpolated into the script itself.
      ISSUE_TITLE: ${{ github.event.issue.title }}
      ISSUE_BODY: ${{ github.event.issue.body }}
    steps:
      - name: deliver the issue to the root session
        run: |
          {
            printf 'GitHub issue #%s of %s: %s\n\n' "$N" "$GITHUB_REPOSITORY" "$ISSUE_TITLE"
            printf '%s\n\n' "$ISSUE_BODY"
            echo "Handle it end to end. You have NO git credentials; the outbox pushes for you:"
            echo "- Code: commit on branch tiny/issue-$N, then: git bundle create /workspace/outbox/tiny-issue-$N.bundle tiny/issue-$N"
            echo "- Textual answer: commit REPLY.md on tiny/reply-$N and bundle that branch — it becomes an issue comment."
            echo "- Never push or call the GitHub API yourself; the bundle IS the send."
          } | tiny deliver root --ensure --repo "https://github.com/$GITHUB_REPOSITORY.git"
```

That's the entire task hand-off: **a prompt piped into `tiny deliver`**.
`--ensure` creates the root session on first contact, `--repo` seeds its
workspace. The prompt carries the conventions — which branch names to
use, how to send work back. Change the wording and you've changed your
team's process; it's just text.

## The courier job

Every ~5 minutes a second job empties the [outbox](/docs/outbox/): it
runs `tiny export` to lift pending git bundles out of sessions, rebases
each branch onto `main`, pushes with the **job's own short-lived token**,
opens the PR (or posts `REPLY.md` as an issue comment), and acks the
bundle only after the push succeeded.

```yaml
  export:
    if: github.event_name == 'schedule'
    runs-on: [self-hosted, tiny]
    timeout-minutes: 5
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    steps:
      - run: |
          rm -rf outbox && tiny export
          for b in outbox/*.bundle; do
            # fetch the bundle's branch, rebase onto origin/main,
            # push with $GH_TOKEN, open the PR / post the comment,
            # then retire the bundle:
            tiny export --ack "$(basename "$b")"
          done
```

The push-and-PR plumbing between those lines is ~60 lines of shell; take
it verbatim from the reference workflow in
[seedling](https://github.com/tiny-systems/seedling/blob/main/.github/workflows/tiny.yml)
— it handles rebase conflicts (fail loud, keep the bundle), the 403 from
a missing org toggle (fail **without acking**, so the bundle retries once
you flip it), and reply branches.

## Why two jobs

Token-pushed branches trigger no further workflows — GitHub's own
recursion guard — so the courier finishes the story itself: push, PR,
comment, ack. Nothing loops.

## Failure behavior

- **Rebase conflict** — the courier aborts that branch with an error
  annotation; the bundle stays pending. Fix in the session, re-bundle.
- **Org toggle off** — PR creation returns 403; the courier fails loudly
  and does NOT ack. Flip the toggle, the next run delivers.
- **Runner down** — events queue in GitHub; jobs run when the runner
  add-on is back.

A bundle is only ever retired after its work arrived. The loop's proof
lives in the demo garden:
[seedling PR #2](https://github.com/tiny-systems/seedling/pull/2), grown
end to end from a labeled issue.
