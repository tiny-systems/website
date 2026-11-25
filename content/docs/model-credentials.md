---
title: Keeping the model key out of pods
seotitle: "Claude Code on Kubernetes without the API key in the pod — tiny"
description: "Two ways to run Claude Code sessions whose pods hold no real credential: a model gateway in the egress proxy for subscriptions, and Anthropic Workload Identity Federation for API billing."
weight: 129
section: SECURITY
---

By default a session's Claude credential, a `claude setup-token` or an
API key, sits in `tiny-agent-env`, and every agent pod reads it. A
prompt-injected agent can read it too, and send it anywhere the network
allows. tiny has two ways to take it out of the pod, one for each way of
paying.

| | the gateway | federation |
|---|---|---|
| for | Pro or Max subscriptions, and API keys | API billing through the Claude Console |
| what the agent pod holds | a placeholder | a short-lived identity token |
| where the real credential is | a Secret only the egress proxy mounts | nowhere: none is stored |
| needs | the [egress allow-list](/docs/egress/) on | a federation rule in the Claude Console |
| turn it on | `tiny gateway on` | `tiny federation set …` |

Both apply to Claude sessions. Codex sessions keep their credential in
`tiny-agent-env` as before.

## The gateway

```
tiny gateway on
```

The credential moves out of `tiny-agent-env` into `tiny-model-credential`,
which only the egress proxy mounts. The proxy runs a small gateway next to
its allow-list. New Claude sessions get its address as
`ANTHROPIC_BASE_URL` and a placeholder token of the same kind, so Claude
Code behaves exactly as it would with your subscription. The gateway
forwards model calls to `api.anthropic.com` and puts the real credential
on each one.

The details:

- **It forwards `/v1/` only.** Anything else sent to it is refused, not
  relayed with your credential.
- **Rotation needs no restart.** The gateway re-reads the credential on
  every request. `tiny setup` writes a new token straight into the
  gateway's Secret while the gateway is on.
- **The old names are blanked.** The agent container's environment sets
  every Claude credential name to the placeholder or to empty. A key still
  sitting in `tiny-agent-env` can't reach the agent, because a pod's own
  `env` beats `envFrom`.
- **Running sessions keep the old environment** until their pod is
  replaced: `tiny pause --all && tiny resume --all`.

`tiny gateway off` moves the credential back. Bare `tiny gateway` says
whether it's on.

## Federation

Anthropic's [Workload Identity Federation](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation)
lets a pod sign in with the identity Kubernetes already gives it. tiny
mounts a service-account token minted for Anthropic (audience
`https://api.anthropic.com`, valid for an hour, rotated by the kubelet),
and Claude Code exchanges it for an access token that lasts minutes,
under a rule you create in the Claude Console. Nothing is stored. Usage
is billed to the Console organization at API prices; a subscription can't
be federated.

1. **See what the Console needs:**

   ```
   tiny federation
   ```

   It prints this cluster's service-account issuer, the subject
   (`system:serviceaccount:<namespace>:tiny-session`), the audience, and
   the cluster's public signing keys.

2. **In the Claude Console,** go to Settings, then Workload identity,
   then Connect workload, and choose Kubernetes. Register the issuer. A
   cluster whose issuer isn't reachable from the internet, like most
   self-hosted ones, uses inline keys: paste the keys `tiny federation`
   printed. Create a service account and a rule matching the subject and
   audience above.

3. **Give tiny the IDs the Console shows:**

   ```
   tiny federation set --rule fdrl_... --organization <org id> --service-account svac_...
   ```

   Add `--workspace wrkspc_...` when the rule covers several workspaces.
   If `tiny-agent-env` still holds a Claude credential, tiny offers to
   delete it. Pods no longer see it either way, but federation's point is
   storing none.

The token the pod gets can't be used against the Kubernetes API: the API
server rejects a token minted for another audience. With inline keys,
re-run `tiny federation` and update the Console when the cluster rotates
its signing keys, which is rare, usually at an upgrade.

`tiny federation off` switches back to the stored credential.

## What changes, and what doesn't

- **Leaking the key is closed or bounded.** Behind the gateway there is no
  key in the pod to leak. With federation, a stolen identity token works
  for at most an hour and an access token for minutes, instead of a token
  that lasts a year.
- **Spending your quota is not.** A compromised session can still make
  model calls while it runs: through the gateway, or with its own
  short-lived token. Keep the allow-list on, watch usage, and pause a
  session that misbehaves.
- **The gateway's credential still exists.** It's in the proxy's Secret,
  which no session can read. Someone with Secret access in the namespace
  can, as before.
- **Claude Code makes one call around the gateway.** At startup it fetches
  some account details directly from Anthropic. With the placeholder that
  call fails and Claude Code carries on; we haven't seen it change
  anything a session does.

Both modes are switched per namespace. The rest of the confinement is the
same: see the [threat model](/docs/threat-model/).
