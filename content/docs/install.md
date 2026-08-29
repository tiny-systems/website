---
title: Install
description: One binary, one wizard, no pods until your first session.
weight: 10
section: START
---

tiny is a single binary. Install it with Homebrew or download one from
[Releases](https://github.com/tiny-systems/tiny/releases) (macOS and
Linux, amd64/arm64; Windows works for the CLI too).

```
$ brew install tiny-systems/tap/tiny
$ tiny setup
$ tiny new "make the tests not lie"
```

## What tiny setup actually does

One wizard, four steps, each skipped when already done:

1. **Pins your cluster** — arrow-key picker over your kubeconfig
   contexts; enter-enter repeats yesterday's choice. `--context`/`-n`
   skip it everywhere.
2. **Installs the runtime** — two CRDs (`Session`, `Question`) and one
   ServiceAccount for the sidecar. It installs no pods, so an idle
   install is just metadata.
3. **Stores agent credentials** — paste a `claude setup-token` (Claude
   Pro/Max) or an Anthropic API key; if you've run `codex login` on this
   machine it offers to store that too ([both agents](/docs/agents/)).
   **tiny writes the cluster Secret itself (`tiny-agent-env`) — you never
   touch kubectl or a Secret manifest.**
4. **Mints a deploy key** — a dedicated ed25519 pair for private repos:
   private half into a cluster secret, public half printed for GitHub.
   It never reads your `~/.ssh`.

Re-run it any time: it offers only what's missing and asks before
replacing an existing token. Rotation is the same wizard with a new
token.

## CI installs

`tiny init` is the scriptable subset: runtime install, no questions.

```
tiny init --context prod -n team-a --yes
```

## When a credential goes bad

A session with an expired token says so on the fleet screen **in the
agent's own words** (`Invalid API key`, `OAuth token has expired`).
Replace the token with `tiny setup`, cycle the session's pod
(`kubectl delete pod -l tinysystems.io/session=<name>`), and the
transcript resumes where it stopped.

## Uninstall

Delete the sessions, then the two CRDs and the ServiceAccount. Nothing
else was installed.
