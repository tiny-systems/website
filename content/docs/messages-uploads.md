---
title: Messages & uploads
description: Talk to a session without attaching; hand it files by dropping them.
weight: 90
section: SESSIONS
---

## Messages

On the fleet screen, `m` types a message straight into a session's prompt.
It's delivered through a **durable inbox** that survives pod restarts and
usage-limit pauses — the message waits until the agent can read it.

The same inbox is what event sources use:

```
echo "issue #7: checkout test is flaky" | tiny deliver root --ensure
```

`--ensure` creates the session if it doesn't exist yet.

## Uploads

Drop a file onto the terminal — fleet screen or attached session — and it
streams to `/workspace/uploads/` with live progress. The agent is handed
the path.
