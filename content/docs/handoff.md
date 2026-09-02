---
title: Handoff
description: Move the local session you're in — files, dirty changes, transcript — to the cluster mid-conversation.
weight: 25
section: START
---

The train problem, properly: you're an hour into a local Claude Code
session, it's mid-refactor, and you have to leave. Starting a *fresh*
cluster session loses the conversation. So don't:

```
# stop the local claude first (ctrl+c) — two copies of one transcript
# tell two different stories
tiny handoff
```

Run from the project directory. It ships three things into a new session:

1. **The working tree**, exactly as it sits — uncommitted changes and
   `.git` included. No push, no stash, no credentials involved: the tree
   streams over the Kubernetes exec API into `/workspace/repo`.
2. **The transcript** — the local Claude Code session file for this
   directory, placed where the cluster session's `claude --continue` will
   find it.
3. **A nudge.** The session was created waiting; once the files land, its
   agent starts on the resume path, reopens your conversation, and keeps
   working. In our test its first act was `git status && git diff` to
   orient itself, which is exactly what you'd do.

Then close the laptop. `tiny` shows it working; `tiny attach <name>`
drops you back into the same conversation from any machine.

## Honest notes

- Stop the local claude before handing off. The command warns if the
  transcript was written seconds ago, but it can't see your terminal.
- The tree ships whole. A 10GB repo ships 10GB — check the size before
  handing off a monorepo with models in it.
- One direction for now: laptop → cluster. The reverse (`tiny pull`) is
  an open issue.
