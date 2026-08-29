---
title: Claude & Codex
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

## House rules

Claude reads `CLAUDE.md` and Codex reads `AGENTS.md`. tiny seeds both
with the same rules: keep the title current, ask before doing anything
hard to undo, use the outbox, spawn specialists for missing toolchains.
Edit either file in the workspace and your version stays.
