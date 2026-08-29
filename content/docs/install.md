---
title: Install
description: One binary, one wizard, no pods until your first session.
weight: 10
section: START
---

tiny is a single binary. Install it with Homebrew or grab one from
[Releases](https://github.com/tiny-systems/tiny/releases).

```
$ brew install tiny-systems/tap/tiny
$ tiny setup
$ tiny new "make the tests not lie"
```

`tiny setup` is one wizard that:

- pins your **cluster** (chosen with an arrow-key picker; `--context` skips it),
- installs the **runtime** — 2 CRDs and one ServiceAccount, **no pods**,
- stores your **agent credential** (`claude setup-token` or an API key),
- mints an ed25519 **deploy key** for private repos — the private half lives
  in your cluster, the public half is printed for GitHub. It never reads
  your `~/.ssh`.

Re-run `tiny setup` any time: it only offers what's missing and asks before
replacing an existing token. For CI there is `tiny init` — the same install,
scriptable: `tiny init --context prod -n team-a --yes`.

## When a credential goes bad

A session with an expired token says so on the fleet screen in the agent's
own words (`Invalid API key`, `OAuth token has expired`). Replace the token
with `tiny setup`, cycle the session's pod, and the transcript resumes.
