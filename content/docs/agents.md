---
title: Claude & Codex
description: Two agents, one runtime — pick per session, sign in with the plan you already pay for.
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

`--model` works for both (`claude --model` / `codex -m` underneath); the
`o` options form on the fleet screen has both fields. Everything else is
agent-agnostic: the same fleet screen, the same [gate](/docs/gate/) tools
(`ask_human`, `set_title`, `session_create`…), the same durable inbox,
the same pod-death resume — we test both by killing pods mid-task.

## What the payload carries

The [injected payload](/docs/images/) holds both CLIs. Versions are
pinned by the agent image — deterministic pods, no self-updates
half-applied into a workspace; a new agent version arrives the honest
way, as a new image. Codex ships as a static musl binary, so codex
sessions run even in images claude can't (alpine).

Each agent keeps its state on the workspace volume
(`/workspace/.claude`, `/workspace/.codex`) — that's what makes a
replacement pod resume the transcript instead of starting over.

## Credentials

Both agents sign in the way they do on your laptop — **your
subscription, not an API meter**:

- **Claude** — `claude setup-token` (Pro/Max) or an Anthropic API key;
  `tiny setup` stores either.
- **Codex** — run `codex login` on your machine (ChatGPT Plus/Pro), then
  `tiny setup`: it finds the login and offers to store it. An
  `OPENAI_API_KEY` works too.

`tiny setup` writes the cluster Secret itself; both credentials live side
by side, so a mixed fleet — Claude sessions next to Codex sessions —
just works. A session whose token expired says so on the fleet screen in
the agent's own words; rotate with `tiny setup`, cycle the pod, resume.

## Usage limits

Hit a plan limit and the session pauses itself — the fleet row shows
`⏸ usage limit` with the resume time, and the agent picks its work back
up on its own. Rate limits become naps, on either plan.

## House rules

Claude reads `CLAUDE.md`, Codex reads `AGENTS.md`. tiny seeds both with
the same rules — titles, ask-before-leaping, the outbox convention, how
to spawn specialists. Edit either in the workspace; it stays yours.
