---
title: Custom images
description: Any image becomes an agent environment — nothing to bake.
weight: 70
section: SESSIONS
---

```
tiny new --image golang:1.26 "…"
tiny new --image maven:3-eclipse-temurin-21 "…"
tiny new --image quay.io/buildah/stable --user 1000 "…"
```

An init container injects the agent — claude, a static tmux, the
entrypoint — into whatever image you name. The contract is small: **glibc,
git, /bin/sh**. Nothing to bake, nothing to maintain; your dev image works
as-is.

Builder sessions (buildah) can build images and push them to the namespace
[registry cache](/docs/registry-cache/) at `$TINY_REGISTRY` — the next
session runs what the last one built. Build, push, spawn, all inside the
namespace.

Size sessions with `--cpu` and `--memory`; the fleet screen shows live
usage next to every name.
