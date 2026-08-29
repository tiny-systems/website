---
title: Your first session
description: Start a task, close the laptop, come back to finished work.
weight: 20
section: START
---

```
$ tiny new "fix the flaky checkout test, open a PR"
  ◌ session s-x7k2f created on prod/team-a
  ◌ creating workspace and pod
  ◌ pulling images / creating containers
  ● agent up (s-x7k2f-agent)
```

A session is a real pod with a **persistent workspace**. It keeps working
when you close your laptop — through rate limits, through pod restarts,
through the night.

- `tiny new` with no task attaches you straight into the agent's terminal.
- `tiny new --image golang:1.26 --cpu 2 --memory 4Gi "…"` starts it in your
  toolchain, sized.
- `tiny new --agent codex "…"` runs [Codex instead of Claude](/docs/agents/);
  `--model` picks the model for either.
- Attach any time from any machine with the fleet screen; the session is
  exactly where you left it.

## Attached-session tricks

The session lives in tmux (prefix `ctrl-q`; `ctrl-b` works too):

| keys | what |
|---|---|
| `ctrl-q d` | detach — the agent keeps working |
| `ctrl-q c` | a plain shell beside the agent |
| `ctrl-q ctrl-q` | toggle between agent and shell |
| `ctrl-q [` | scrollback |

`tiny shell <session>` opens a shell on the workspace — finished sessions too.
