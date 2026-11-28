---
title: Messages, broadcast & uploads
description: "Send messages into a session's durable inbox, broadcast to the whole fleet, and drag files into a workspace from your terminal."
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

## Files the agent shows you

The other direction. When a picture says it better (a screenshot of
the page it fixed, a chart, a generated report), the agent saves the
file in its workspace and calls the sidecar's `show_user` tool with the
path and a one-line caption. Every session's house rules tell it so.

Only the path is recorded, in the session's status (the last 20). The
file stays in the pod: the sidecar can't read the agent's files, and
nothing is copied anywhere. A client reads the file from the pod with
your own access when you open it. The
[desktop app](https://github.com/tiny-systems/tiny-systems) shows the
files in the conversation, images inline. From a terminal:

```
tiny show api-fix            # what it showed, numbered oldest first
tiny show api-fix latest     # copy it out of the pod and open it
tiny show api-fix 2 --out ~/Desktop/login.png
```

On the fleet screen, a row that showed something wears ▣, and `v`
opens the newest. Only images, PDFs and plain text whose bytes match
their extension open by themselves: an agent picks the file and its
name, so anything else (a `.command`, a page, a script) is saved and its
path printed, never run.

A cluster whose runtime predates the tool drops the record silently;
the tool notices and tells the agent to name the path in its reply
instead. `tiny init` upgrades it.
