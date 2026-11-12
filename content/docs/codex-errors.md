---
title: "Codex errors: active writer, code-mode-host"
seotitle: "Codex \"already has an active writer\" (-32600): cause and fix"
description: "Why Codex says a thread already has an active writer (code -32600) after a crash or restart, how to clear it safely, and why tool calls fail without codex-code-mode-host."
weight: 67
section: SESSIONS
---

Two Codex errors we ran into while putting Codex in containers. Both have
nothing to do with the model, and both are easy to fix once you know where
they come from. This applies to Codex anywhere, not only inside tiny.

## "thread already has an active writer" (code -32600)

You resume a Codex session, for example with `codex resume --last`, and it
fails with something like:

```
thread already has an active writer (code -32600)
```

`-32600` is the JSON-RPC "invalid request" code; the useful part is the
message.

**What it means.** Codex takes a lock per thread while a process is writing
to it, and keeps those lock files under `$CODEX_HOME/thread-writer-locks/`
(`$CODEX_HOME` is `~/.codex` unless you've set it). When the writing
process dies without cleaning up, the lock stays on disk, and the next
process refuses to take over a thread it thinks someone else owns.

You'll see it when Codex's state outlives the process that held it:

- a container or pod was killed mid-task and its home directory sits on a
  persistent volume;
- your machine crashed or rebooted with a session open;
- the terminal was closed hard and the process was killed rather than
  exiting.

**How to fix it.** First make sure no other Codex process really is using
that thread, because two writers on one thread can corrupt it:

```sh
pgrep -af codex
```

If nothing is running, the lock is stale and safe to remove:

```sh
rm -f "${CODEX_HOME:-$HOME/.codex}"/thread-writer-locks/*.lock
codex resume --last
```

**How tiny handles it.** A tiny session runs exactly one pod at a time
(the Deployment uses the Recreate strategy), so any writer lock present
when a pod starts belongs to a pod that's already dead. The entrypoint
clears those locks before resuming, and a killed session picks up where it
stopped. The story is in [Codex, day one](/blog/codex-day-one/).

## Every tool call fails: codex-code-mode-host

Codex starts and talks, but every MCP tool call fails.

**What it means.** Recent Codex releases run MCP tool calls through a
companion binary, `codex-code-mode-host`, that ships in the same release as
`codex`. If you copied only the `codex` binary, into a container image for
example, the host binary isn't there and tool calls fail closed.

**How to fix it.** Install both binaries from the same release and keep
them together on your `PATH`. Mixing versions isn't worth the risk.

**How tiny handles it.** The agent payload that tiny injects into every
session image carries both binaries from one release, so a session runs
Codex in any image you name, including ones that have never heard of it.
See [Claude & Codex](/docs/agents/) and [custom images](/docs/images/).
