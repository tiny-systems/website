---
title: "We deleted our operator"
description: "Kubernetes already replaces dead pods. Why were we running a manager, with a standing secrets-reader Role, to do it again?"
date: "2026-08-28"
author: tiny systems
---

tiny runs coding-agent sessions (Claude Code, Codex) as workloads on your
own cluster. Until last week it had a manager: an operator pod watching
our Session CRD and reconciling workloads, with leader election, a
controller per resource type, the whole Kubebuilder catechism. This post
is about deleting it — 1,854 lines of controller code, six controllers,
and one Deployment — and what the system looks like on the other side.

## Why we had one

Reflex, mostly. If you grew up on Kubebuilder, "CRD plus operator" is
just what a Kubernetes product *is*. You scaffold the manager before you
know what it's for. Ours accumulated six controllers: sessions,
questions, and one for each add-on (a registry cache, an artifact store,
a CI runner).

Then we audited what the manager actually did all day. Three things:

1. Create a Deployment, PVC and secrets when a Session object appears.
2. Recreate anything that drifted or died.
3. Apply add-on manifests when a settings ConfigMap changed.

## Job 2 is a ReplicaSet

Set `replicas: 1` and strategy `Recreate` on the session's Deployment and
job 2 is done — by machinery that has been in production for a decade
and is better tested than anything we will ever write. A killed pod comes
back and finds the agent's transcript on the persistent volume; the
entrypoint resumes it. We were re-implementing a ReplicaSet with extra
steps.

Jobs 1 and 3 don't need a resident process either. They need to happen
*when someone acts* — and there is always a someone: the engineer running
`tiny new`, the CI job delivering a GitHub issue, the human pressing `y`
on an approval. So now whoever creates a session materialises its
workload with their own credentials, and whoever flips an add-on toggle
applies the add-on. The manager's code moved into libraries that any
credentialed caller runs; the process that hosted them is gone.

## The RBAC diff is the argument

What the manager's Role could do, 24/7, whether or not anyone was using
the system:

```yaml
- resources: ["sessions", "questions", "pods",
              "persistentvolumeclaims", "services",
              "configmaps", "secrets",
              "deployments", "daemonsets"]
  verbs: ["get", "list", "watch", "create",
          "update", "patch", "delete"]
- resources: ["roles", "rolebindings", "serviceaccounts"]
  verbs: ["get", "list", "watch", "create"]
```

A standing service account that can read every secret in the namespace
and grant itself friends. Every operator you install carries some
version of this, and we all stopped seeing it.

What's installed now — the only ServiceAccount tiny ships — belongs to
the small sidecar that gives agents their tools:

```yaml
- resources: ["questions"]
  verbs: ["get", "list", "create"]
- resources: ["sessions"]
  verbs: ["get", "list"]
- resources: ["sessions/status"]
  verbs: ["get", "update", "patch"]
- resources: ["pods"]
  verbs: ["get", "list"]
```

It can raise its hand and update its own status line. It cannot read a
secret, make a pod, or touch another session.

## The part we didn't expect

The audit log got better. Before, every workload was created by
`system:serviceaccount:...:tiny-manager` — the operator did it, as
operators do, and the human intent behind any action was one hop removed.
Now the log entry for a session names the engineer who ran `tiny new`;
the log entry for an approved spawn names the person who answered the
question. Not because we log extra metadata — because their credentials
actually performed the action. "Answering is acting" started as a
security posture and turned out to be an audit feature.

## What it cost

Honesty section. Deleting the reconcile loop means nobody fixes drift in
the background: if you `kubectl delete` a session's Deployment by hand,
nothing recreates it until some client next touches that session. We
decided we can live with that; Kubernetes handles the drift that matters
(dead pods), and the rest waits for a human, which is sort of the theme.

We also inherited the races the manager used to absorb. Example we hit
this week: create a session while its same-named predecessor's PVC is
still terminating, and the new workload adopted the dying claim — the
pod then parked on "persistentvolumeclaim not found" forever. The old
answer was "the reconcile loop will sort it out eventually". The new
answer has to be explicit: refuse the claim, fail loudly, let the retry
start clean. Every one of these is now a visible decision instead of a
background apology.

Net: −616 lines, one fewer pod, one fewer image to patch, no leader
election, and an install that is two CRDs and a ServiceAccount. When no
sessions run and no add-ons are on, an idle namespace contains nothing
of ours at all.

We test the recovery claim by force-killing pods mid-task — it's in the
[demo on the front page](/). The replacement resumes the transcript in
about twenty seconds, and the code doing it is code we no longer own.
