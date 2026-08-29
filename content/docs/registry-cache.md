---
title: Registry cache
description: One Docker Hub pull per image per namespace — 191s cold, 9s warm.
weight: 100
section: ADD-ONS
---

A **zot** pull-through cache inside your namespace, switched on with one
checkbox in `tiny` → namespace settings.

- `golang:1.26` downloads once per namespace, not once per session —
  in our tests: **191s cold, 9s warm**.
- **docker.io rate limits stop being your problem** — upstream sees one
  pull.
- An optional DaemonSet teaches every node to trust the cache's TLS.

The cache is a **push target** too: a buildah session builds an image,
pushes it to `$TINY_REGISTRY`, and the next session runs what the last one
built.

Agents can request add-ons themselves through the gate — your `y` both
approves and provisions.
