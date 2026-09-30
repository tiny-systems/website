---
title: Custom images
description: An init container injects the agent into any glibc image you name.
weight: 70
section: SESSIONS
---

```
tiny new --image golang:1.26 "…"
tiny new --image maven:3-eclipse-temurin-21 "…"
tiny new --image quay.io/buildah/stable --user 1000 "…"
tiny new --image registry.internal/yourco/dev:latest "…"
```

## How injection works

You don't bake an agent image. An init container copies the payload
(claude, codex, a static tmux, `tiny-notify`, the entrypoint) into a
shared volume, and your image runs with that mounted at `/tiny`. Your
image itself is untouched.

The contract your image must meet is deliberately small:

- **glibc** (debian/ubuntu/fedora-family tags; alpine/musl won't run
  claude — codex, a static musl binary, runs anywhere)
- **git**
- **/bin/sh**

If the contract is broken, the pod fails at start with the reason shown
in the fleet row.

## Sizing and identity

`--cpu` / `--memory` set requests (memory is also the limit, so a runaway
build OOMs its own session, not the node). `--user` overrides the uid for
images whose tooling is wired to one — buildah's rootless machinery needs
its `build` user (1000), or subuid lookups fail.

## Confinement, and `--unconfined`

Every container in a session pod runs under the "restricted" Pod
Security Standard: the runtime's default seccomp profile, every Linux
capability dropped, no privilege escalation (so a setuid binary in the
image gains nothing), non-root. Claude Code, Codex, tmux, git and the
package managers need none of what that removes. It is what stands
between "an attacker owns the agent's uid" and "an attacker owns the
node".

Rootless buildah and podman are the exception: user namespaces and the
`newuidmap` setuid helper are exactly what the profile forbids.
`--unconfined` lifts the seccomp profile and the capability drop for
that session — and only that. The uid stays non-root, the network
policy still applies, and the pod still holds no keys.

```sh
tiny new --image quay.io/buildah/stable --user 1000 --unconfined "…"
```

## Builders: images made inside the namespace

With the [registry cache](/docs/registry-cache/) on, `$TINY_REGISTRY` is
set in every session and the cache doubles as a **push target**:

```
buildah bud -t app-dev . \
  && buildah push --tls-verify=false app-dev $TINY_REGISTRY/team/app-dev:1
```

The next session can run `--image $TINY_REGISTRY/team/app-dev:1`. The
build, the push and the spawn all happen inside the namespace, without an
external registry.
