---
title: Registry cache
description: "One Docker Hub pull per image per namespace: 191s cold, 9s warm."
weight: 100
section: ADD-ONS
---

A zot pull-through cache inside your namespace, one checkbox in `tiny` →
`☰ namespace settings`. Flipping it on applies the deployment, service,
self-signed TLS and cache volume with your credentials; flipping it off
tears everything down except the cache volume.

## What it buys

- `golang:1.26` downloads once per namespace instead of once per session.
  On our cluster that was 191s cold, 9s warm.
- Upstream sees one pull no matter how many specialists spawn, which
  keeps you under docker.io rate limits.
- Image references are rewritten through the cache automatically; you
  keep writing `golang:1.26`.

## Node trust

The cache serves TLS from a self-signed CA. The optional node trust
toggle runs a DaemonSet that installs that CA on every node's containerd,
so kubelets can pull through the cache. It is off by default; flip it if
your CRI refuses the certificate.

## As a push target

Every session gets `$TINY_REGISTRY` when the cache runs. Builder sessions
push images there and later sessions run them; see
[custom images](/docs/images/).

Agents can also request the cache through the [gate](/docs/gate/); your
answer approves and provisions it in one step.
