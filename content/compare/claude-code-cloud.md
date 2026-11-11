---
title: "tiny vs Claude Code cloud sessions"
seotitle: "Claude Code cloud sessions alternative: self-hosted with tiny"
description: "Anthropic runs Claude Code sessions in its cloud, or on your runners under its control plane. tiny runs them on your Kubernetes with no control plane."
weight: 10
updated: "2026-11-11"
---

Anthropic offers two ways to run Claude Code somewhere other than your
laptop. **Cloud sessions** run in a VM Anthropic manages, on Pro, Max,
Ultra, Team and Enterprise plans. **Self-hosted environments**, in public
beta for Team and Enterprise, run those same sessions on runners inside
your network, while Anthropic keeps the control plane: the queue, the
claude.ai interface, and the session transcript.

tiny is a third shape. It runs the unmodified Claude Code and Codex CLIs
as pods on a Kubernetes cluster you own, and there's no control plane
anywhere: the `tiny` CLI talks to the Kubernetes API, and that's all.

## Side by side

| | Claude Code cloud sessions | Self-hosted environments | tiny |
|---|---|---|---|
| where the agent runs | Anthropic-managed VM | your runners | pods on your Kubernetes |
| control plane | Anthropic | Anthropic (queue, UI, transcript) | none |
| plans | Pro, Max, Ultra, Team, Enterprise | Team and Enterprise, public beta | any Claude or OpenAI plan, or an API key |
| agents | Claude Code | Claude Code | Claude Code and Codex |
| session transcript stored | by Anthropic | by Anthropic | on your workspace volume |
| git credentials | outside the VM, attached by Anthropic's proxy | supplied by your deployment, or Anthropic's git proxy | none in the pod: work leaves as a git bundle a separate job pushes |
| network | limited by default, allow-list | your network boundary | default-deny NetworkPolicy, optional hostname allow-list |
| how you interact | browser, mobile app, desktop, `--teleport` | the same | the real terminal over `tiny attach`, a fleet screen, GitHub issues |
| what you operate | nothing | runner image and fleet | a cluster; tiny itself runs nothing between sessions |

Prompts and responses go to the model provider in every column. Running
on your own cluster changes where the code, the workspace and the
transcript live, not where inference happens.

## Where Anthropic's cloud is the better choice

- **You don't want to run anything.** Cloud sessions need no cluster, no
  image and no upgrades.
- **You want the phone and browser.** The Claude app, the web UI and
  teleporting a session into your terminal are things tiny doesn't do.
- **You want auto-fix on pull requests**, projects that coordinate many
  sessions, and scheduled cloud tasks. Those are Anthropic features.
- **Credentials are covered there too.** Anthropic-hosted sessions keep
  git credentials outside the VM through a server-side proxy, the same
  principle tiny follows with its outbox.

## Where tiny fits

- **No vendor control plane.** Nothing queues your sessions or stores
  their transcripts outside your cluster.
- **Codex as well as Claude Code**, in the same fleet, with the same
  gate and the same egress rules.
- **Any plan.** Self-hosted environments need Team or Enterprise; tiny
  runs with a personal Max subscription or an API key.
- **Terminal-native.** Attaching puts you in the actual CLI over tmux:
  plan mode, hotkeys, skills, your `.mcp.json`.
- **Open source.** MIT, and you can read every line that touches your
  cluster.

If you already pay for Team or Enterprise and want sessions on your own
compute with Anthropic's interface on top, self-hosted environments are
the natural route. If you'd rather own the whole path, that's what tiny
is for.

Sources: Anthropic's [cloud sessions](https://code.claude.com/docs/en/claude-code-on-the-web)
and [self-hosted environments](https://code.claude.com/docs/en/self-hosted-environments)
documentation, checked on the date above. Anthropic changes these
products often; tell us on [GitHub](https://github.com/tiny-systems/tiny/issues)
if a row has gone stale.
