---
title: "We deleted our operator"
description: "Kubernetes already resurrects pods. Why were we running a manager to do it again?"
date: "2026-08-28"
author: tiny systems
---

tiny used to have a manager: an operator pod that watched Session objects
and reconciled workloads. It's what you build reflexively when you grow up
on Kubebuilder. It's also a standing server with cluster credentials,
running 24/7, doing… what, exactly?

We audited it. The manager's real jobs were:

1. Create a Deployment when a Session appears.
2. Recreate things when they drift.
3. Apply add-ons when settings change.

Job 2 is literally what a Deployment *is*. Set `replicas: 1`, strategy
`Recreate`, and Kubernetes resurrects dead pods with machinery that has
been production-hardened for a decade. We were re-implementing a
ReplicaSet, worse.

Jobs 1 and 3 don't need a resident process either — they need to happen
*when someone acts*. So now **whoever creates a session materialises its
workload with their own credentials**: your CLI on `tiny new`, a runner
job on `tiny deliver`, you pressing `y` on a spawn request. Add-ons are
applied by the client that flips the toggle.

What's left to install is two CRDs and a ServiceAccount. **No pods.** An
idle namespace runs only what you've explicitly switched on.

The part we didn't expect: deleting the operator made the *audit log*
better. Actions used to be performed by a service account named
`tiny-manager`; now the log names the human whose credentials did the
thing — because their credentials actually did the thing.

We test the resurrection claim by force-killing pods mid-task. The
replacement resumes the transcript in about twenty seconds, and the code
that does it is code we no longer own.
