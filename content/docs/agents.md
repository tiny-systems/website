---
title: Claude & Codex
description: Two agents, one runtime — pick per session, sign in with the plan you already pay for.
weight: 65
section: SESSIONS
---

tiny runs two coding agents. Claude Code is the default; OpenAI's Codex is
one flag away:

```
tiny new "fix the flaky test"                 # Claude Code
tiny new --agent codex "fix the flaky test"   # Codex
tiny new --agent codex --model gpt-5.2-codex "…"
```

`--model` works for both agents (`claude --model` / `codex -m` underneath);
the options form on the fleet screen has both fields too. Everything else
is agent-agnostic: the same fleet screen, the same [gate](/docs/gate/), the
same durable inbox, the same pod-death resume — we test both by killing
pods mid-task.

## Credentials

Both agents sign in the way they do on your laptop — **your subscription,
not an API meter**:

- **Claude**: `claude setup-token` (Pro/Max) or an Anthropic API key —
  `tiny setup` stores either in the cluster.
- **Codex**: run `codex login` on your machine (ChatGPT Plus/Pro), then
  `tiny setup` — it finds the login and offers to store it. An OpenAI API
  key works too.

`tiny setup` writes the cluster Secret itself — you never touch kubectl.
Both credentials live side by side, so a mixed fleet (Claude sessions next
to Codex sessions) just works.

## House rules

Claude reads `CLAUDE.md`, Codex reads `AGENTS.md`. tiny seeds both with
the same rules; edit either in the workspace and it stays yours.
