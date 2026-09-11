---
title: Web page
description: A read-only fleet page with each session's blast radius, one checkbox away.
weight: 125
section: ADD-ONS
---

The fleet screen is a terminal. When a team wants to look at the same
thing — or you want the overnight picture on a second monitor — the `web`
add-on serves it as a page.

Switch it on in `tiny` → `☰ namespace settings`, then:

```
kubectl port-forward svc/tiny-web 8080
```

No Ingress ships with it. Reaching the page is exactly the cluster access
you already have; there is no new front door and no auth story to get
wrong.

## What it shows

- **The fleet**, as the TUI sees it: phase, age, self-reported CPU and
  memory, each agent's live title.
- **Blast radius per session** — the files it changed, lines added and
  removed, its branch, and any bundles waiting in the
  [outbox](/docs/outbox/). Read live from the workspace with git, not
  from parsed logs.
- **Collisions** — files touched by more than one session, named with the
  sessions touching them. The question a fleet of agents raises and
  nothing else answers.
- **Questions waiting on a human**, each with the exact command to answer
  it.

The same reading powers [`tiny diff`](/docs/fleet-screen/), so the page
and the CLI cannot disagree.

## Read-only, deliberately

Its ServiceAccount has `get`, `list` and `watch` — plus `pods/exec` for
the git reads — and no write verb anywhere.

That is a design decision, not an unfinished feature. Answering a
question in tiny [performs the action with the answering human's
credentials](/docs/gate/), which is what makes the audit log name a
person. A browser button would act as the web server's own account
instead, quietly breaking that. So the page prints
`tiny answer q-xxxxx <answer>` and lets you run it.
