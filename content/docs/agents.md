---
title: Claude & Codex
seotitle: "Claude Code and Codex on Kubernetes — tiny docs"
description: Claude Code and Codex, picked per session, signed in with the plan you already pay for.
weight: 65
section: SESSIONS
---

tiny runs two coding agents. Claude Code is the default; OpenAI's Codex
is one flag away:

```
tiny new "fix the flaky test"                 # Claude Code
tiny new --agent codex "fix the flaky test"   # Codex
tiny new --agent codex --model gpt-5.2-codex "…"
```

`--model` works for both (`claude --model` / `codex -m` underneath), and
the `o` options form on the fleet screen has both fields. The rest of the
runtime does not care which agent is inside: the fleet screen, the
[gate](/docs/gate/) tools, the durable inbox and pod-death resume behave
the same. We test both agents by killing their pods mid-task.

## What the payload carries

The [injected payload](/docs/images/) holds both CLIs, with versions
pinned by the agent image. Agents don't self-update inside a workspace; a
new agent version arrives as a new image. Codex is a static musl binary,
so codex sessions run even in images claude can't (alpine).

Each agent keeps its state on the workspace volume (`/workspace/.claude`,
`/workspace/.codex`), which is why a replacement pod resumes the
transcript instead of starting over.

## Credentials

Both agents sign in the way they do on your laptop, on the subscription
you already have:

- **Claude** — `claude setup-token` (Pro/Max) or an Anthropic API key;
  `tiny setup` stores either.
- **Codex** — run `codex login` on your machine (ChatGPT Plus/Pro), then
  `tiny setup`: it finds the login and offers to store it. An
  `OPENAI_API_KEY` works too.

`tiny setup` writes the cluster Secret itself, and both credentials live
side by side, so a mixed fleet works without extra setup. A session whose
token expired says so on the fleet screen in the agent's own words;
rotate with `tiny setup` and cycle the pod.

## Usage limits

When a session hits a plan limit it pauses itself. The fleet row shows
`⏸ usage limit` with the resume time, and the agent picks the work back
up on its own.

## Command sessions: no agent at all

A session can also run no coding agent. With `agent: command`, it runs
`spec.command` once, as argv, in the session's image, and that's all: no
model, no tmux, no resume. The exit code lands in
`/workspace/.tiny/command-done`, so a container restart never runs the
command a second time, and the pod then idles so its log stays readable
until you delete the session.

It's meant for code you trust least, such as a generated script or an
untrusted repository's test suite, run in the same box your agents get.
It keeps everything that confines a session: the restricted container
profile, the egress policy and allow-list, node placement, the runtime
class (so `gvisor` works) and resource limits. It holds even less than an
agent session: no model credentials, no deploy key, no service-account
token, and no MCP sidecar.

There's no CLI flag for it yet; create it from Go with
[`pkg/session`](https://pkg.go.dev/github.com/tiny-systems/tiny/pkg/session).
Applying the Session with kubectl alone starts nothing, because tiny has
no operator: whoever creates a session also creates its workload, and
`session.Create` does both.

```go
s := &agentsv1.Session{
	ObjectMeta: metav1.ObjectMeta{Namespace: "agents", Name: "run-untrusted"},
	Spec: agentsv1.SessionSpec{
		Agent:            "command",
		Image:            "python:3.13-slim",
		Command:          []string{"python3", "-c", "print('hello from a sandbox')"},
		RuntimeClassName: "gvisor",
	},
}
err := session.Create(ctx, c, s)
```

Two limits for now. `spec.repo` isn't cloned for a command session (the
command runs before the clone step), so bring code in through the image.
And the exit code isn't shown in the fleet screen: read it from the file
above, or check the pod's log with `kubectl logs`.

## House rules

Claude reads `CLAUDE.md` and Codex reads `AGENTS.md`. tiny seeds both
with the same rules: keep the title current, ask before doing anything
hard to undo, use the outbox, spawn specialists for missing toolchains.
Edit either file in the workspace and your version stays.

Running Codex on your own cluster instead of OpenAI's: [tiny vs Codex cloud](/compare/codex-cloud/).
