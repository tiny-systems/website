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
```

- **WHAT is live** — the agent's own declared title, refreshed by its own
  turns. A session paused on a usage limit says so and resumes itself.
- **CPU and memory are self-reported** by each session from its own cgroup —
  no metrics-server, no extra RBAC.
- Children render under their parent.

| key | what |
|---|---|
| `enter` | attach to the session's terminal |
| `a` | answer a ✳ question — answering performs the action, as you |
| `m` | type a message straight into a session's prompt |
| `d` | delete a session |

**Drop a file** onto the terminal — fleet screen or attached session — and
it streams to `/workspace/uploads/` with live progress; the agent is handed
the path.
