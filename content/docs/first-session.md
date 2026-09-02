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
persistent volume and the pod is disposable, so a rescheduled pod
resumes the transcript instead of starting over. Closing your laptop
does not interrupt anything.

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

Already mid-conversation on your laptop? [`tiny handoff`](/docs/handoff/)
moves that session — files, uncommitted changes and transcript — into the
cluster and keeps it going there.

## Attaching

`enter` on the fleet screen, or `tiny attach <session>` directly — any
time, from any machine with the kubeconfig. You land in the real agent CLI over a TTY, with its hotkeys, plan mode,
slash commands and your `.mcp.json` servers. It's tmux underneath
(prefix `ctrl-q`; `ctrl-b` also works):

| keys | what |
|---|---|
| `ctrl-q d` | detach — the agent keeps working |
| `ctrl-q c` | a plain shell beside the agent |
| `ctrl-q ctrl-q` | toggle agent ↔ shell |
| `ctrl-q [` | scrollback |

`tiny shell <session>` opens a shell on the workspace without touching
the agent — finished sessions included.

## Lifecycle

A finished session stays, with its workspace and transcript, until you
delete it (`d` then `y` on the fleet screen, or `kubectl delete session
<name>`). Deletion garbage-collects what the session owns through owner
references: pod, volume, its secrets. Children are separate sessions and
keep running.
