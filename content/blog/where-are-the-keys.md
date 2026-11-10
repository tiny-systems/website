---
title: "Where are the keys? A diagram you can attack"
description: "We replaced a wall of claims on our home page with an interactive anatomy of a session. Click a part to see what it holds, or pick an attack and watch where it stops. Including the one that doesn't."
date: "2026-11-10"
author: tiny systems
---

Our home page used to explain containment as two columns of text: what
is closed, what is open. It was accurate. It was also the kind of thing
people skim, nod at, and don't believe, because "no keys in the pod" is
easy to write and hard to picture. Where do the keys go, then? Something
has to push the branch.

So the text is gone, and in its place is a diagram of an actual session
that you can poke at: [Where are the keys?](/#keys)

## Two ways to read it

**How it works.** Every box is a real part of a running session. The
init container that copies Claude Code and Codex into whatever image you
picked. The agent itself, running in tmux. The MCP sidecar that only
listens on `127.0.0.1`. The workspace volume, where finished work is
written as a `git bundle` instead of pushed. The one secret in the pod,
which holds the model credential and nothing else. Around the pod sits
the egress policy, and outside it the Kubernetes API, the optional
hostname proxy, and the courier job that holds the GitHub token. Click
any of them and the panel explains what it holds and what it's allowed
to do.

Two boxes carry a KEY tag: the model secret inside the pod, and the
courier outside it. That's the whole answer to the question in the title.

**Attack it.** Pick one of ten moves a prompt-injected agent might
plausibly try, and the diagram walks the path and marks where it stops.
Click a part while you're in this mode and you get the attacker's view
of it instead: what someone who owns the agent can do with that piece,
and which of the moves hit it.

| verdict | moves |
|---|---|
| blocked | steal SSH or cloud keys, push to the repo, read the cloud metadata endpoint, delete itself, approve its own request, open a port inbound |
| depends on the allow-list | send the repo to some outside host, smuggle data out through DNS |
| hardened | break out of the container to the node |
| allowed | spend your model quota, or leak the model key |

## The draft lied, a little

The first working version marked "send the repo to evil.example" as
stopped at the internet. It looked tidy. It was also wrong, because
with only the default egress policy that request goes straight through:
a NetworkPolicy matches addresses, and evil.example on port 443 looks
like any other website. It's only refused once the hostname allow-list
is on.

That's the trap with security diagrams. A clean picture wants every
arrow to end in a wall, and the honest picture has a few arrows that
don't. The fix was to give every attack its own labels for where it
ends: "refused with the allow-list" on the proxy, "default: gets
through" on the internet. The same treatment went to DNS, to escaping
the container, where the shared kernel is still a path (since v0.13,
`--runtime-class gvisor` closes it), and to the
model key, which simply has to be in the pod for the real CLI to run.

We'd rather show you the one ALLOWED verdict ourselves than have you
find it in the threat model and wonder what else we left out.

## Why not slides

The tempting version was a set of generated illustrations, polished and
quick to make. For a security page that's the wrong trade. Generated
images get labels and arrows subtly wrong, and every detail here is
something a reader can check against the code: which account can do
what, which port is open, where a token lives. So it's plain HTML in
the site's own style. The text is in the page for search engines and
screen readers, it works on a phone, and when the code changes the
diagram can change in the same commit.

## Go break it

It's at the top of [tinysystems.io](/#keys). If you find a move that
should be on the list, or a verdict you think is too generous, open an
issue on [GitHub](https://github.com/tiny-systems/tiny/issues). The
detail behind every box is in the [threat model](/docs/threat-model/),
[egress](/docs/egress/) and [outbox](/docs/outbox/) docs.
