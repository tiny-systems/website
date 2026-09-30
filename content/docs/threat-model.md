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
  Question objects, read Sessions and pods in the namespace, update its
  own Session's status. The ServiceAccount cannot read secrets or
  ConfigMaps (so it cannot widen its own egress allow-list), and cannot
  exec, delete, or create anything else.
- A restricted container: runtime seccomp profile, every capability
  dropped, no privilege escalation, non-root. `--unconfined` lifts the
  first two for rootless buildah, per session, and nothing else.

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
  your Claude/OpenAI quota, or send the token to any host the
  [egress policy](/docs/egress/) lets it reach. Scope it: use a
  dedicated account, and switch on the hostname allow-list so "any
  host" becomes a short list.
- **HTTPS out is open until you narrow it.** The default policy closes
  the metadata endpoint, private address space and every port but 80
  and 443, but a `NetworkPolicy` matches addresses, and the agent must
  reach its model API. The allow-list closes this, and DNS with it, by
  making the proxy the session's only resolver. Allow-listing
  `github.com` still means an agent can write to a gist.
- **The agent's own tool calls are not intercepted.** It runs with
  `bypassPermissions`; asking is cooperative. The boundary is the pod,
  the missing keys, the restricted container and the policy — not the
  gate.
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
