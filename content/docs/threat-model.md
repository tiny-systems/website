---
title: Threat model
description: What a hostile agent can and cannot do, stated plainly.
weight: 130
section: SECURITY
---

tiny runs an LLM agent with its own permission prompts disabled, inside
your cluster. That sentence should worry you; this page is what we do
about it, and what we don't.

## Assumptions

We assume the agent can be prompt-injected — by a repo it cloned, an
issue it was fed, or a dependency README — and will then try to do
whatever the injected text says. The design question is what such an
agent *can* do, not whether it might try.

## What a session pod holds

- The agent credential (Claude or OpenAI token) — needed to run at all.
- Its own workspace volume.
- A localhost MCP sidecar whose Kubernetes permissions are: create
  Question objects, update its own Session's status. The sidecar's
  ServiceAccount can't read secrets, list pods, or touch other sessions.

## What a session pod does not hold

- Git credentials. Cloning uses a deploy key that is mounted read-only
  when you configured one; pushing does not happen from the pod at all.
  Work leaves as [git bundles](/docs/outbox/) that a separate,
  short-lived CI job pushes after rebasing.
- GitHub API tokens. PRs and comments are made by the courier job with
  a token that expires when the job ends.
- Cluster credentials. Spawning a session, enabling an add-on — every
  such action parks as a [Question](/docs/gate/) and runs with the
  credentials of the human who answers, or not at all.

## Known holes, honestly

- **The agent credential is in the pod.** An injected agent could burn
  your Claude/OpenAI quota or exfiltrate the token if it has network
  egress. Scope it: use a dedicated account, and restrict egress with a
  NetworkPolicy if your CNI supports it.
- **The pod has whatever network access your namespace allows.** tiny
  does not install a NetworkPolicy for you. If the namespace can reach
  your internal services, so can the agent.
- **`kubectl exec` into the pod is your cluster's RBAC, not ours.**
  Anyone who can exec into pods in the namespace can read the workspace.
- **The gate is only as careful as its humans.** Approving a spawn you
  didn't read is still an approval, audited under your name.
- **The house rules are conventions.** The model usually follows
  "ask before anything hard to undo"; the guarantees come from the
  missing credentials, not from the model's manners.

## The exec surface

The courier lists and downloads bundles over the Kubernetes exec API.
That call is argv-only, and bundle names must match
`^[A-Za-z0-9][A-Za-z0-9._-]*\.bundle$` — agent-written text never
reaches a shell.

Found something we missed? Open an issue; that's what the repo is for.
