---
title: "tiny run: untrusted code in a box"
seotitle: "Run untrusted code in a gVisor sandbox on Kubernetes — tiny run"
description: "tiny run runs one command in a confined pod on your own cluster, streams its output and exits with its exit code. No model, no credentials, optional gVisor."
weight: 66
section: SESSIONS
---

`tiny run` runs one command in the same box tiny's agents get, streams its
output, and exits with the command's exit code. No coding agent starts, no
model is called, and the pod holds no credentials of any kind.

```
tiny run --image python:3.13-slim --runtime-class gvisor -- python3 -c 'print(6*7)'
```

```
  ◌ session s-gc52g created on tinybox/agents
  ◌ creating workspace and pod
  ◌ starting
  ◌ preparing workspace
  ● running (s-gc52g-agent-64bf67b565-5rrd7)
42
  ◌ session s-gc52g deleted
```

It's for code you trust least: an unfamiliar repository's test suite, a
script a model just wrote, a dependency's install hooks.

```
tiny run --image node:22 --repo https://github.com/acme/app -- npm test
tiny run --image golang:1.26 --dir . -- go test ./...
tiny run --image python:3.13-slim -- sh -c 'pip install -r requirements.txt && pytest'
```

## What the box is

Everything that confines an agent session confines a `tiny run`:

- **The restricted container profile:** the runtime's seccomp profile, every
  capability dropped, no privilege escalation, a non-root user.
- **The namespace's network rules.** With the [egress proxy](/docs/egress/)
  on, the command reaches only hosts on the allow-list, and DNS for
  anything else returns NXDOMAIN.
- **Your node placement and resource limits,** with `--cpu` and `--memory`
  per run.
- **A sandboxed runtime when you ask for one.** `--runtime-class gvisor`
  puts the command behind gVisor's user-space kernel; see
  [sandboxed runtimes](/docs/images/#sandboxed-runtimes-gvisor-and-kata).

And it holds less than an agent session: no model credential, no deploy
key, no service-account token (so no Kubernetes API access) and no MCP
sidecar. The command, its image and the workspace are all there is.

## Output and exit codes

The command's stdout and stderr both stream to your stdout. Kubernetes
records the two separately, so lines written to each at nearly the same
moment can come out swapped. tiny's own lines go to stderr, so

```
tiny run --image alpine:3.22 -- sh -c 'echo hello' > out.txt
```

leaves only `hello` in the file. tiny exits with the command's exit code,
so it works in scripts and CI:

```
tiny run --image node:22 --repo https://github.com/acme/app -- npm test || echo "tests failed"
```

A clone that fails records exit code 128, and the command doesn't run.
Ctrl-C stops waiting, deletes the session and exits with 130.

## Where the code comes from

| flag | what the command finds |
|---|---|
| none | an empty `/workspace`, plus whatever the image carries |
| `--repo <git URL>` | the repo cloned into `/workspace/repo`; the command runs there. The image needs `git`, and the URL must be reachable without credentials (a command session has no deploy key) |
| `--dir <path>` | a local folder shipped as it stands into `/workspace/repo`, uncommitted changes and `.git` included; the command runs there |

`HOME` is `/workspace`, so caches the command writes land in the
workspace and go away with it.

## Flags

```
tiny run [flags] [--] <command> [args...]
```

Flags go before the command. Everything from the command's name on is
passed to it untouched, so `tiny run ls -la` runs `ls -la`. A `--` before
the command is allowed and changes nothing.

| flag | what |
|---|---|
| `--image <ref>` | the image to run in; it needs `sh`. Default: the tiny agent image |
| `--repo <git URL>` | clone first and run inside the clone |
| `--dir <path>` | ship a local folder first and run inside it |
| `--runtime-class <name>` | run under `gvisor`, `kata` or another RuntimeClass the cluster has |
| `--cpu`, `--memory` | requests for this run (memory is also the limit) |
| `--user <uid>` | for images wired to a specific user |
| `--unconfined` | lift the seccomp and capability hardening (rootless buildah, podman) |
| `--name <name>` | session name, generated when omitted |
| `--keep` | keep the session afterwards, to look around with `tiny shell <name>` |
| `-d, --detach` | start it and return at once; implies `--keep` |

The [target flags](/docs/commands/#choosing-a-target) (`--context`, `-n`,
`-p`, `-y`) work as everywhere.

## Kept and detached runs

With `--keep` or `--detach` the session stays after the command ends. Its
pod idles so the output stays readable, and the fleet screen shows the
result on its row: `✓ exited 0` or `✗ exited 3`.

```
tiny run -d --name nightly --image node:22 --repo https://github.com/acme/app -- npm test
kubectl -n tiny logs -f deploy/nightly-agent   # follow it
tiny shell nightly                            # look at the workspace
tiny rm nightly                               # done
```

The command runs once. A pod that restarts finds the recorded exit code
and doesn't run it again.

## Limits

- **No stdin and no terminal.** The command can't prompt you. For an
  interactive box, use `tiny new` with no task and attach.
- **One command.** Chain steps with `sh -c '…'`.
- **Downloads follow the allow-list.** With the egress proxy on, `pip
  install` or `npm install` reach their registries only if those hosts are
  on the [allow-list](/docs/egress/#the-hostname-allow-list).
- **The image needs `sh`.** The entrypoint is a shell script, so a
  distroless image without a shell won't start.

From Go, [`pkg/session`](https://pkg.go.dev/github.com/tiny-systems/tiny/pkg/session)
creates the same thing: a Session with `agent: command` and the argv in
`command`. See [command sessions](/docs/agents/#command-sessions-no-agent-at-all).
