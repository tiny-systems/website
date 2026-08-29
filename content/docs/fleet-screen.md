---
title: The fleet screen
description: Who runs, who needs you — one screen for the whole namespace.
weight: 30
section: START
---

Run `tiny` with no arguments:

```
    NAME        STATE      AGE   CPU    MEM  WHAT
  ✳ s-x7k2f     needs you  12m   84m  512Mi  May I force-push the rebased branch?
  ● api-fix     running     3h  212m  1.1Gi  migrating auth tests to vitest
  └ ● api-db    running    41m  907m  2.9Gi  rewriting migrations in golang:1.26
  ● night-run   running     8h    1m  301Mi  ⏸ Usage limit reached · continuing at 5:20pm
  ✓ readme      done        2d
  · ✉ broadcast to all…
  · ＋ new session
  · ⚙ new session with options…
  · ☰ namespace settings
  · ✕ quit
```

## Reading it

- **WHAT is live** — the agent's own declared title, refreshed by its own
  turns, plus turn-by-turn activity. A paused session says why and when
  it resumes; a session with a bad token quotes the agent's own error.
- **CPU/MEM are self-reported** by each session from its own cgroup — no
  metrics-server, no extra RBAC to grant.
- **✳ means a question waits.** Rows keep creation order on purpose —
  nothing jumps around when a question arrives; the glyph is the signal,
  position is not.
- **Children render under their parent** (`└`) — the spawn tree reads as
  a tree.

## Keys

| key | what |
|---|---|
| `enter` | attach; on an idle "waiting for you" row, attaching clears the mark |
| `a` | answer the selected ✳ — [answering is acting](/docs/gate/) |
| `m` | message the selected session (durable inbox) |
| `b` | broadcast to every unfinished session |
| `n` / `o` | new session — blank / the full options form |
| `d`, then `y` | delete — a session is a workspace and a transcript, never gone on one keystroke |
| `r` | refresh |

**Drop a file onto the terminal** — fleet screen or attached — and it
streams to `/workspace/uploads/` with live progress; the agent gets the
path.

## Namespace settings

`☰` toggles the [add-ons](/docs/registry-cache/) — registry cache,
artifact store, GitHub runner — one checkbox each, applied by your
client with your credentials the moment you flip them.
