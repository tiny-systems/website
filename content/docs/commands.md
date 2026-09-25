---
title: All commands
description: Every tiny command and flag, with the one-line reason each exists.
weight: 150
section: REFERENCE
---

`tiny --help` prints this too. Grouped here by what you are trying to do.

## Choosing a target

Every command acts on one cluster and namespace. These flags work on all
of them:

| flag | what |
|---|---|
| `--context <name>` | kubeconfig context; the loudest intent — it beats a profile |
| `-n, --namespace <ns>` | namespace override |
| `-p, --profile <name>` | a saved target ([`tiny profile`](#targets-and-setup)) |
| `-y, --yes` | skip the confirmation prompt (CI) |
| `-v, --version` | print the version |

With no flags, the target is whatever you pinned; with profiles saved,
the bare `tiny` start asks which fleet.

## The fleet

| command | what |
|---|---|
| `tiny` | the fleet screen: who runs, who needs you, live titles, CPU/MEM |
| `tiny diff [session]` | what a session changed — files, lines, branch, pending bundles. Bare: the whole fleet, plus files two sessions are both editing |

Fleet-screen keys are on the [fleet screen page](/docs/fleet-screen/).

## Starting sessions

```
tiny new [task]
```

| flag | what |
|---|---|
| `--name <name>` | session name (generated when omitted) |
| `--repo <git URL>` | clone a repo into the workspace |
| `--dir <path>` | ship a local folder instead — uncommitted changes and `.git` included, no remote needed |
| `--image <ref>` | any glibc image with git; the agent injects itself into it |
| `--agent claude\|codex` | which [agent](/docs/agents/) to run |
| `--model <name>` | model override (`claude --model` / `codex -m`) |
| `--cpu`, `--memory` | per-session requests (memory is also the limit) |
| `--user <uid>` | for images wired to a specific user (buildah: 1000) |
| `--quiet` | skip the follow-up hint |

With no task the session boots idle and attaches you straight in.

```
tiny handoff [--name <name>]
```

Moves the local Claude Code session you are *in* — working tree,
uncommitted changes **and the conversation** — into the cluster. Claude
Code only, since it reads that CLI's transcript. See
[handoff](/docs/handoff/).

```
tiny pull <session> [directory]
```

The return leg: copies a session's working tree — committed work,
uncommitted changes and `.git` — back to this machine, by default into
`./<session>`.

| flag | what |
|---|---|
| `--from <path>` | directory inside the session to pull (default `/workspace/repo`) |

The destination must be empty or absent; nothing local is ever
overwritten. To carry the work into an existing clone, pull to a scratch
directory and fetch from it: `git fetch ./<session> <branch>`.

## Reaching into a session

| command | what |
|---|---|
| `tiny attach <session>` | join its terminal (detach: `ctrl-q d`) |
| `tiny shell <session>` | a shell on its workspace, without disturbing the agent — finished sessions too |
| `tiny questions` | every decision waiting on a human, with the command that answers it. `--json` emits a stable array an event source can post somewhere people look; `--all` includes idle "waiting for input" nudges, which attaching clears |
| `tiny answer <question> <text>` | answer a ✳ card, and [perform its action with your credentials](/docs/gate/) |

## Talking to sessions

| command | what |
|---|---|
| `echo "…" \| tiny deliver <session>` | append a message to its durable inbox |
| `tiny broadcast "…"` | the same message into every unfinished session's inbox |

`tiny deliver` flags:

| flag | what |
|---|---|
| `--ensure` | create the session if it does not exist |
| `--repo <git URL>` | seed the workspace when `--ensure` creates it |
| `--env KEY=VALUE` | deliver a credential as a refreshing file at `/tiny-env/KEY` (repeatable) |
| `--origin <ref>` | record where the work came from (e.g. `github:owner/repo#3`) — opaque to tiny; the event source that wrote it reads it back from `tiny questions --json` to report a blocked session on the right thread |

Both read stdin when given no argument, so any event source that can pipe
text can drive a session — see [messages](/docs/messages-uploads/).

## Targets and setup

| command | what |
|---|---|
| `tiny setup` | the interactive journey: pick a cluster, pick or create a namespace, name it as a profile, install the runtime, store agent credentials |
| `tiny init` | the same runtime install, scriptable for CI: `tiny init --context X -n Y --yes` |
| `tiny profile save <name>` | name the current (or `--context`/`-n` flagged) target |
| `tiny profile list` | show saved profiles and the pinned default |
| `tiny profile delete <name>` | forget one |
| `tiny upgrade` | update the tiny binary to the latest release |

`tiny upgrade` downloads the release for your platform, **verifies it
against the release's `checksums.txt`**, and swaps it over the running
binary. It refuses to install anything that is not newer than what you
are running, and refuses outright if the checksum is missing or does not
match. Homebrew installs are updated in place (brew's recorded version
goes stale; `brew upgrade tiny` reconciles it).

## Plumbing

`tiny export` is hidden from `--help` because it is not a human command:
the [outbox courier](/docs/outbox/) runs it inside a GitHub Actions job to
collect pending bundles. It is documented with [the loop](/docs/github-loop/).
