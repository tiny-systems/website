---
title: Registry cache
description: One Docker Hub pull per image per namespace — 191s cold, 9s warm.
weight: 100
section: ADD-ONS
---

A **zot** pull-through cache inside your namespace, one checkbox in
`tiny` → `☰ namespace settings`. Flipping it on applies the whole thing
with your credentials: deployment, service, self-signed TLS, cache
volume. Flipping it off tears it down (the cache volume stays).

## What it buys

- `golang:1.26` downloads **once per namespace**, not once per session.
  Measured on our cluster: **191s cold, 9s warm**.
- **docker.io rate limits stop being your problem** — upstream sees one
  pull no matter how many specialists spawn.
- Session image references are rewritten through the cache
  automatically; you keep writing `golang:1.26`.

## Node trust

The cache serves TLS from a self-signed CA. The optional **node trust**
toggle runs a DaemonSet that installs that CA on every node's containerd,
so kubelets pull through the cache without `insecure-registries` hackery.
Off by default; flip it when your CRI refuses the cert.

## As a push target

Every session gets `$TINY_REGISTRY` when the cache runs. Builder sessions
push images there and the next session runs them —
[build, push, spawn](/docs/images/), all inside the namespace.

Agents can request the cache themselves through the
[gate](/docs/gate/) — your `y` both approves and provisions.
