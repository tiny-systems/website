---
title: "We can't stop the agent, so we emptied its pockets"
description: "A coding agent reads untrusted text for a living. Ours runs with permissions bypassed and holds no credentials at all. The reasoning, and the part we haven't solved."
date: "2026-09-16"
author: tiny systems
---

Someone filed an issue on the Cline repository this year with
instructions buried in it. The agent doing triage read the issue, did
what it said, and the project's cache ended up poisoned. No exploit, no
CVE, no clever memory corruption. Just text, in a box where text is
supposed to go.

That one stuck with me. An agent that reads issues, pulls dependencies
and browses documentation is an agent that will eventually take
instructions from somebody who isn't you. Not might. Will. Reading
untrusted text is the job description.

So the useful question isn't how to prevent that. It's what the agent is
holding when it happens.

## Three legs

Simon Willison's framing is the one I keep using: the lethal trifecta is
private data, untrusted content, and a way to get data out. You need all
three for a disaster. Remove any one and the other two are survivable.

Score a coding agent against it and you get three for three. Your
repository is sitting right there in the workspace. It reads issue text
and READMEs and package descriptions all day. And it has a network
connection, obviously, because it has to talk to a model.

The trifecta framing is useful mainly because it tells you where to
push. You can't take away the private data, that's the job. You can't
stop it reading untrusted content, also the job. Which leaves the way
out, and what the thing is carrying.

## The thing we didn't do

Our sessions run Claude Code with `--permission-mode bypassPermissions`.
On purpose.

That looks reckless written down, so here's the reasoning. The point of
tiny is that you get the actual vendor CLI, plan mode and skills and your
`.mcp.json` and whatever shipped last Tuesday, rather than somebody's
reimplementation of the agent loop. A CLI that stops to ask
permission for every file write isn't the real CLI, and an agent working
overnight with nobody awake to approve anything is just a very expensive
way to generate a queue of prompts.

We have a gate, and questions park as Kubernetes objects until a human
answers. But I want to be precise about what it is, because the README
used to overstate this and I've since corrected it: **nothing intercepts
the agent.** It asks because it's been told to ask. A compromised one
won't.

So the agent can run anything inside its pod. Given that, containment
has to come from somewhere structural.

## What it's carrying: nothing much

No git credentials. The agent commits locally and drops a `git bundle`
in an outbox; a separate courier job rebases and pushes with a
short-lived token that never enters the agent's pod. A compromised
session can't push, can't force-push, can't reach your other
repositories. Not because it's forbidden. Because there's no key in
there.

That one matters more than it sounds. The sandbox tools — devcontainers,
one VM per project, that whole family — will happily isolate the agent
from your laptop and then mount your SSH key inside the cage.

No cloud credentials either, and no route to `169.254.169.254`, the
metadata endpoint that hands out an instance's IAM role. The UK's AI
Safety Institute published an incident in August where agents under
evaluation went and stole AWS credentials during a test. That address is
blocked by default now.

Nothing listens. There isn't a single `containerPort` in the pod spec,
and the MCP sidecar binds `127.0.0.1`, so it isn't reachable even from
the next pod over. You reach a session through the Kubernetes API, under
your own RBAC, rather than through anything a scanner could find.

And when a question does get answered, the resulting action runs in
*your* client with *your* credentials. The agent never borrows your
authority, it just asks you to use it. That's also why the web dashboard
is read-only. An approve button in a browser would quietly move the
action back to the server's identity, which defeats the point.

## What we haven't solved

A security claim is worth roughly what its exceptions are worth, so:

HTTPS out is open. A NetworkPolicy matches addresses, not hostnames, and
the agent has to reach its model API, so anything that can be POSTed can
still leave. DNS is unrestricted too, which is a working exfiltration
channel if you're patient. And the model credential itself lives in the
agent's pod, because running the real vendor CLI requires it.

We've narrowed the third leg. We haven't cut it. Cutting it needs an
egress proxy with a hostname allow-list for the policy to point at, and
that doesn't exist yet.

I'd rather write that down than have you find it in `entrypoint.sh`.
Anyone assessing this seriously will read the code within ten minutes,
and a gap they discover on their own costs more credibility than three
gaps we listed ourselves.

The proxy is next.
