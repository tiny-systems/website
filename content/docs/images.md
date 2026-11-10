---
title: Custom images
description: An init container injects the agent into any glibc image you name.
weight: 70
section: SESSIONS
---

```
tiny new --image golang:1.26 "…"
tiny new --image maven:3-eclipse-temurin-21 "…"
tiny new --image quay.io/buildah/stable --user 1000 "…"
tiny new --image registry.internal/yourco/dev:latest "…"
```

## How injection works

You don't bake an agent image. An init container copies the payload
(claude, codex, a static tmux, `tiny-notify`, the entrypoint) into a
shared volume, and your image runs with that mounted at `/tiny`. Your
image itself is untouched.

The contract your image must meet is deliberately small:

- **glibc** (debian/ubuntu/fedora-family tags; alpine/musl won't run
  claude — codex, a static musl binary, runs anywhere)
- **git**
- **/bin/sh**

If the contract is broken, the pod fails at start with the reason shown
in the fleet row.

## Sizing and identity

`--cpu` / `--memory` set requests (memory is also the limit, so a runaway
build OOMs its own session, not the node). `--user` overrides the uid for
images whose tooling is wired to one — buildah's rootless machinery needs
its `build` user (1000), or subuid lookups fail.

## Confinement, and `--unconfined`

Every container in a session pod runs under the "restricted" Pod
Security Standard: the runtime's default seccomp profile, every Linux
capability dropped, no privilege escalation (so a setuid binary in the
image gains nothing), non-root. Claude Code, Codex, tmux, git and the
package managers need none of what that removes. It is what stands
between "an attacker owns the agent's uid" and "an attacker owns the
node".

Rootless buildah and podman are the exception: user namespaces and the
`newuidmap` setuid helper are exactly what the profile forbids.
`--unconfined` lifts the seccomp profile and the capability drop for
that session — and only that. The uid stays non-root, the network
policy still applies, and the pod still holds no keys.

```sh
tiny new --image quay.io/buildah/stable --user 1000 --unconfined "…"
```

## Sandboxed runtimes: gVisor and Kata

The restricted profile hardens the container, but its system calls still
reach the node's kernel, so a kernel exploit is the remaining way out. A
sandboxed runtime closes that path. Under [gVisor](https://gvisor.dev) the
agent's system calls hit a user-space kernel; under Kata Containers, a
lightweight VM.

```sh
tiny new --runtime-class gvisor "…"
```

or `spec.runtimeClassName: gvisor` on the Session. tiny installs no runtime:
the RuntimeClass has to exist on the cluster, and `tiny new` refuses a name
that doesn't. Tested with gVisor 20261102.0 on k3s: Claude Code, git, npm
through the egress proxy and the MCP sidecar all work. Expect slower
system-call-heavy work such as large builds, and don't expect rootless
buildah to run under it.

**Managed clusters.** On GKE, use [GKE
Sandbox](https://cloud.google.com/kubernetes-engine/docs/concepts/sandbox-pods):
create a node pool with `--sandbox type=gvisor` (spot works). GKE provides
the `gvisor` RuntimeClass and steers pods that use it onto that pool.

**Your own nodes (k3s).** Install the release tarball next to the
containerd shim, register the runtime, and create the RuntimeClass:

```sh
U=https://storage.googleapis.com/gvisor/releases/release/20261102.0/$(uname -m)
wget $U/gvisor.tar.bz2 $U/gvisor.tar.bz2.sha512 && sha512sum -c gvisor.tar.bz2.sha512
sudo tar -xjf gvisor.tar.bz2 -C /usr/local/bin   # keeps runsc next to gvisor-bin/

sudo tee /var/lib/rancher/k3s/agent/etc/containerd/config.toml.tmpl <<'TOML'
{{ template "base" . }}

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
  runtime_type = "io.containerd.runsc.v1"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc.options]
  TypeUrl = "io.containerd.runsc.v1.options"
  ConfigPath = "/etc/containerd/runsc.toml"
TOML
printf '[runsc_config]\n  overlay2 = "none"\n' | sudo tee /etc/containerd/runsc.toml
sudo systemctl restart k3s

kubectl apply -f - <<'YAML'
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata: {name: gvisor}
handler: runsc
YAML
```

`overlay2 = "none"` is for older kernels: on Ubuntu 20.04's 5.4 kernel,
gVisor's default rootfs overlay fails with "function not implemented".
Newer kernels can drop that file and the `options` block.

## Builders: images made inside the namespace

With the [registry cache](/docs/registry-cache/) on, `$TINY_REGISTRY` is
set in every session and the cache doubles as a **push target**:

```
buildah bud -t app-dev . \
  && buildah push --tls-verify=false app-dev $TINY_REGISTRY/team/app-dev:1
```

The next session can run `--image $TINY_REGISTRY/team/app-dev:1`. The
build, the push and the spawn all happen inside the namespace, without an
external registry.
