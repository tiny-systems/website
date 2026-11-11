---
title: "tiny vs Codex cloud"
seotitle: "Codex cloud alternative: run Codex on your own Kubernetes"
description: "Codex cloud runs tasks in OpenAI's containers. tiny runs the Codex CLI as an interactive session on your own Kubernetes, beside Claude Code."
weight: 30
updated: "2026-11-11"
---

[Codex cloud](https://learn.chatgpt.com/docs/cloud) runs Codex tasks in
containers on OpenAI's infrastructure. You start a task against a
repository from your connected GitHub or GitLab account, Codex works on
it in its own workspace while your computer sleeps, and you review the
result.

tiny runs the open-source Codex CLI, unmodified, as a session on a
Kubernetes cluster you own, next to Claude Code sessions in the same
fleet.

## Side by side

| | Codex cloud | tiny |
|---|---|---|
| where it runs | OpenAI-managed containers | pods on your Kubernetes |
| how you work with it | start a task, review the result | an interactive session you can attach to mid-task, or a task delivered from an issue |
| internet access | configurable: everything, package-manager domains, or an allow-list | default-deny NetworkPolicy; optional hostname allow-list proxy |
| repositories | your connected GitHub or GitLab account | any repo the session can clone; for a private one, a deploy key, or ship a local folder with `--dir` |
| git credentials in the agent's environment | not described in OpenAI's docs | none: work leaves as a git bundle a separate job pushes |
| agents | Codex | Codex and Claude Code |
| what you operate | nothing | a cluster |

## Where Codex cloud is the better choice

- **Nothing to run.** No cluster, no images, no upgrades.
- **Fire-and-forget tasks** that you start from ChatGPT and review later
  are exactly what it's built for.

## Where tiny fits

- **Your infrastructure.** The code, the workspace and the session
  transcript stay on your cluster. The model API still receives prompts,
  as with any hosted model.
- **Interactive.** Attaching puts you in the actual Codex terminal, so
  you can steer a task that's going the wrong way.
- **One fleet for both agents.** Codex and Claude Code sessions share the
  fleet screen, the human gate, the egress rules and the GitHub loop.
- **No credentials in the pod** by default, with every exception listed in
  the [threat model](/docs/threat-model/).

Sources: OpenAI's [Codex cloud documentation](https://learn.chatgpt.com/docs/cloud),
checked on the date above. Where OpenAI's docs don't say, the table says
so rather than guessing. Tell us on [GitHub](https://github.com/tiny-systems/tiny/issues)
if a row has gone stale.
