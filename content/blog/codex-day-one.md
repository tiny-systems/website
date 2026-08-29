---
title: "Codex, day one"
description: "The second agent took an afternoon. The two bugs it surfaced were nowhere near the model."
date: "2026-08-29"
author: tiny systems
---

tiny now runs OpenAI's Codex next to Claude Code:

```
tiny new --agent codex "add rate limiting, open a PR"
```

Same fleet screen, same human gate, same credential-less outbox, same
pod-death resume. We had a design goal that the second agent should prove
the runtime is agent-agnostic — here's how that held up.

## What transferred for free

Everything above the agent binary. The session is a Deployment with a
persistent workspace; the sidecar's MCP tools (`ask_human`, `set_title`,
`session_create`…) speak streamable HTTP on localhost; the inbox types
into a tmux pane. Codex supports MCP over HTTP and lives happily in tmux,
so the fleet screen showed a Codex session's live title on the first try.

Codex is even easier to inject than Claude: it ships as a **static musl
binary**, so it runs in any Linux image — no glibc contract, no node
runtime. (One surprise: modern Codex routes MCP tool calls through a
companion `codex-code-mode-host` binary. Without it, every tool call fails
closed. It ships in the same release; our payload now carries both.)

## The two real bugs

**Stale writer locks.** Kill a Codex session's pod mid-task — our favorite
test — and the replacement's `codex resume --last` failed with *"thread
already has an active writer"*. Codex leaves a lock file per rollout on
disk, and our disk survives the pod on purpose. The fix is one line with a
nice invariant behind it: tiny runs **one pod per session** (Recreate
strategy), so any writer lock present at startup belongs to a dead pod by
definition. Sweep and resume.

**The nudge race.** A resumed agent reopens its transcript and waits
politely for input, so the entrypoint types a nudge into the terminal.
Codex's TUI was still replaying the transcript when Enter arrived — the
message sat in the composer, unsent, forever. The fix is embarrassing and
honest: wait, press Enter again. Terminal automation is like that.

## Subscriptions, not meters

The part we care about most: `codex login` on your laptop (ChatGPT
Plus/Pro), then `tiny setup` finds the login and stores it in your
cluster. A whole fleet on the flat plan you already pay for — same story
as Claude Pro/Max, now on both sides of the fence.

Both bugs were in the seams — locks and terminals — not in anything
model-specific. That's the runtime working as designed: agents are cattle,
the garden is the product.
