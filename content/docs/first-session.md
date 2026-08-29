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

A session is a Kubernetes object whose workload is a plain Deployment:
the agent in a detachable tmux plus a small sidecar. The workspace is a
**persistent volume**; the pod is disposable. Close your laptop, lose
wifi, let the pod be rescheduled — the session keeps working, and a
replacement pod resumes the transcript mid-thought.

## Ways to start one

```
tiny new                                   # no task: boots idle, attaches you straight in
tiny new "…task…"                          # fire and forget; watch with `tiny`
tiny new --repo git@github.com:you/app.git "…"    # clone first (deploy key from setup)
tiny new --image golang:1.26 --cpu 2 --memory 4Gi "…"   # your toolchain, sized
tiny new --agent codex --model gpt-5.2-codex "…"        # OpenAI's Codex instead
tiny new --name refactor-auth "…"          # pick the name yourself
```

Or interactively: on the [fleet screen](/docs/fleet-screen/), `n` starts
a blank session, `o` (or the `⚙ new session with options…` row) opens a
form with every field — task, name, repo, image, agent, model, cpu,
memory.

## Attaching

`enter` on the fleet screen, any time, from any machine with the
kubeconfig. You land in the **real agent CLI over a TTY** — every hotkey,
plan mode, slash commands, your `.mcp.json` servers. It's tmux under-
neath (prefix `ctrl-q`, `ctrl-b` works too):

| keys | what |
|---|---|
| `ctrl-q d` | detach — the agent keeps working |
| `ctrl-q c` | a plain shell beside the agent |
| `ctrl-q ctrl-q` | toggle agent ↔ shell |
| `ctrl-q [` | scrollback |

`tiny shell <session>` opens a shell on the workspace without touching
the agent — finished sessions included.

## Lifecycle

A session ends when its work does, but it *stays* — workspace, transcript
and all — until you delete it (`d` then `y` on the fleet screen, or
`kubectl delete session <name>`). Deletion garbage-collects everything a
session owns via owner references: pod, volume, secrets, children's
nothing — children are their own sessions.
