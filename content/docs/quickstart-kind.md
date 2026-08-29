---
title: Try it in 5 minutes
description: A full run on a throwaway kind cluster, no real cluster needed.
weight: 15
section: START
---

You don't need a real cluster to try tiny. A local
[kind](https://kind.sigs.k8s.io/) cluster works; we ran this exact
sequence with the released v0.7.1 binary before writing it down.

```
brew install kind tiny-systems/tap/tiny
kind create cluster
tiny setup            # picks kind-kind, installs 2 CRDs, asks for a token
tiny new "look around this empty workspace and introduce yourself"
```

`tiny setup` will ask for an agent credential: paste the output of
`claude setup-token` (any Claude subscription) or an Anthropic API key.
If you use Codex, run `codex login` first and setup will offer to store
that login too.

Then watch it:

```
tiny
```

The session appears with a live title. Press `enter` to attach, `ctrl-q d`
to detach. For the party trick, kill its pod and watch the row keep
going:

```
kubectl -n <your-ns> delete pod -l tinysystems.io/session=<name>
```

The replacement pod resumes the transcript in about twenty seconds.

Cleanup is one command; nothing else was installed:

```
kind delete cluster
```

The [full install page](/docs/install/) covers real clusters, deploy keys
for private repos, and credential rotation.
