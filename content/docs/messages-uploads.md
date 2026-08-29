---
title: Messages, broadcast & uploads
description: The durable inbox, broadcast, and drag-and-drop uploads.
weight: 90
section: SESSIONS
---

## The durable inbox

Every session has a mailbox in its spec. Messages appended there are
typed into the agent's prompt by the session's own pod: within seconds
when it is awake, after resume when it is not. The inbox survives pod
restarts and usage-limit pauses, and a replacement pod replays whatever
never landed.

On the fleet screen, `m` messages the selected session. From anywhere
else:

```
echo "the staging DB moved to :5433" | tiny deliver api-fix
```

`tiny deliver` is source-agnostic: an event source is whatever can pipe
text into it. The GitHub loop is [one workflow job](/docs/github-loop/)
doing exactly that, and a Slack bot or a cron reminder looks the same:

```
# cron: nightly dependency sweep
0 3 * * *  echo "run npm audit; open tiny/issue-deps if anything is high" \
             | tiny deliver root --ensure

# anything that can run a binary can be an event source
alertmanager-webhook | jq -r .summary | tiny deliver oncall-triage --ensure
```

`--ensure` creates the session if missing (`--repo` seeds its workspace);
`--env KEY=VALUE` delivers credentials as a refreshing file under
`/tiny-env/` — files keep syncing across re-deliveries where env vars
would freeze at container start.

## Broadcast

One message into **every unfinished session's** inbox — running, paused
on a usage limit, or mid-restart alike:

- Fleet screen: the `✉ broadcast to all…` row (or `b`), type, enter —
  the status line answers `✉ delivered to N session(s)`.
- Scripted:

```
tiny broadcast "demo at 10 — wrap up & open PRs"
echo "maintenance window at 02:00" | tiny broadcast
```

Done sessions are skipped, and one failed delivery does not stop the
rest.

## Uploads

Drop a file onto the terminal (fleet screen or attached session) and it
streams to `/workspace/uploads/` with a progress bar; the agent gets the
path in its prompt. This works on finished sessions too — an inspection
pod carries the copy.
