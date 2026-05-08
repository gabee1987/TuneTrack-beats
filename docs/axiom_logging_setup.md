# Axiom Logging Setup

This document explains how to collect detailed TuneTrack realtime logs during test
sessions and inspect them later in Axiom.

The backend writes normal structured logs to stdout for Railway, and when Axiom is
configured it also sends realtime audit events directly to Axiom. This avoids relying
on Railway log retention for weekend or family tests.

## What Gets Logged

Realtime audit logs are emitted only when `ENABLE_EVENT_AUDIT=true`.

Logged events include:

- incoming socket events from clients
- outgoing socket events from the server
- room state broadcasts
- rejected socket actions and their error codes
- Spotify OAuth callback results
- Spotify token exchange and refresh results
- Spotify playlist import successes and failures

Useful fields:

- `service`: `tunetrack-server`
- `testRunId`: manually configured test session label
- `time`: ISO timestamp
- `auditKind`: `server`, `realtime`, `spotify_auth`, or `spotify_import`
- `eventName`: socket event name
- `action`: backend audit action name
- `outcome`: `received`, `emitted`, `broadcast`, or `rejected`
- `direction`: `client_to_server` or `server_to_client`
- `socketId`: current socket connection id
- `roomId`: room id when available
- `errorCode`: realtime rejection reason when an action fails
- `code`: Spotify/auth/import result code when available
- `room`: compact room state summary for room broadcasts
- `payload`: optional compact payload summary when payload logging is enabled

## Privacy Notes

Keep `EVENT_AUDIT_INCLUDE_PAYLOADS=false` by default.

When enabled, payload logging is still summarized, but it may include debugging context
such as room ids, display names, playlist URLs, selected slot indexes, track counts, and
similar primitive fields. Do not enable payload logging for public or unknown users.

Never log Spotify access tokens. The audit payload summarizer redacts fields whose names
contain `token`.

## Axiom Account Setup

1. Create an Axiom account at `https://axiom.co`.
2. Open the Axiom app.
3. Create a dataset for the server logs.
4. Recommended dataset name:

```text
tunetrack-server
```

5. Create an API token with ingest permission for that dataset.
6. Copy the token. You will add it to Railway as `AXIOM_TOKEN`.

The backend sends events as NDJSON to the configured Axiom edge deployment:

```text
<AXIOM_DOMAIN>/v1/ingest/<AXIOM_DATASET>
```

Available Axiom edge deployment domains:

```text
US East 1 (AWS): https://us-east-1.aws.edge.axiom.co
EU Central 1 (AWS): https://eu-central-1.aws.edge.axiom.co
```

Your dataset region must match `AXIOM_DOMAIN`. If Axiom says the dataset is in
`cloud.eu-central-1.aws`, use:

```text
https://eu-central-1.aws.edge.axiom.co
```

## Railway Setup

Configure these variables on the Railway server service, not the frontend service.

Required for audit logging:

```text
ENABLE_EVENT_AUDIT=true
LOG_LEVEL=info
TEST_RUN_ID=family-test-2026-05-09
```

Required for Axiom ingestion:

```text
AXIOM_TOKEN=<axiom ingest api token>
AXIOM_DATASET=tunetrack-server
AXIOM_DOMAIN=https://eu-central-1.aws.edge.axiom.co
```

Optional payload summaries:

```text
EVENT_AUDIT_INCLUDE_PAYLOADS=true
```

After changing Railway variables, redeploy or restart the Railway server service.

## Recommended Test Session Workflow

Before the test:

1. Pick a unique `TEST_RUN_ID`.
2. Good format:

```text
family-test-2026-05-09
```

3. Set it in Railway.
4. Keep `LOG_LEVEL=info`.
5. Keep `ENABLE_EVENT_AUDIT=true`.
6. Keep `EVENT_AUDIT_INCLUDE_PAYLOADS=false` unless you need deeper debugging.
7. Redeploy the backend.
8. Open the app and create one quick room to confirm logs arrive in Axiom.

During the test:

1. Write down the `TEST_RUN_ID`.
2. If a bug happens, write down the approximate local time and room id shown in the app.
3. Do not stop the server immediately after the last action. Give it a few seconds so the
   Axiom batch sender can flush queued events.

After the test:

1. Open Axiom.
2. Select the `tunetrack-server` dataset.
3. Filter by the `TEST_RUN_ID`.
4. Sort ascending by `time` when reconstructing a session.
5. Sort descending by `time` when looking for the newest failure.

## Useful Axiom Queries

Full test session:

```apl
['tunetrack-server']
| where testRunId == "family-test-2026-05-09"
| sort by time asc
```

Newest events without filters:

```apl
['tunetrack-server']
| sort by _time desc
| limit 100
```

Server startup check:

```apl
['tunetrack-server']
| where auditKind == "server"
| sort by _time desc
| limit 20
```

Single room:

```apl
['tunetrack-server']
| where testRunId == "family-test-2026-05-09"
| where roomId == "ROOM_ID"
| sort by time asc
```

Rejected actions:

```apl
['tunetrack-server']
| where testRunId == "family-test-2026-05-09"
| where outcome == "rejected" or errorCode != ""
| sort by time desc
```

One socket connection:

```apl
['tunetrack-server']
| where socketId == "SOCKET_ID"
| sort by time asc
```

Gameplay state updates:

```apl
['tunetrack-server']
| where eventName == "state_update"
| where room.status != ""
| sort by time asc
```

Large imported playlist checks:

```apl
['tunetrack-server']
| where room.importedTrackCount > 0
| project time, testRunId, roomId, eventName, outcome, room.importedTrackCount, room.status
| sort by time asc
```

Spotify login failures:

```apl
['tunetrack-server']
| where auditKind == "spotify_auth"
| where outcome == "failed"
| sort by time desc
```

Spotify playlist imports:

```apl
['tunetrack-server']
| where auditKind == "spotify_import"
| sort by time desc
```

## Reading A Session

Start with the full test session query and look for the room id. Then filter to that room
and follow these patterns:

- `received`: the server received an action from a client
- `emitted`: the server sent a direct socket event
- `broadcast`: the server broadcast a room state update
- `rejected`: the server rejected an action and attached `errorCode`

For gameplay issues, the most useful fields are usually:

- `eventName`
- `outcome`
- `room.status`
- `room.turnNumber`
- `room.activePlayerId`
- `room.currentTrackId`
- `room.revealType`
- `room.revealWasCorrect`
- `errorCode`

## Troubleshooting

No logs in Axiom:

1. Confirm Railway has `ENABLE_EVENT_AUDIT=true`.
2. Confirm Railway has both `AXIOM_TOKEN` and `AXIOM_DATASET`.
3. Confirm the backend was redeployed after changing variables.
4. Check Railway logs for `axiom_ingest_error`.
5. Confirm the Axiom token has ingest permission for the configured dataset.
6. Confirm the latest deployed backend includes `apps/server/src/app/axiomLogSink.ts`.

Audit logs are visible in Railway but not Axiom:

1. Search Railway logs for `axiom_ingest_error`.
2. Confirm `AXIOM_DOMAIN` matches the dataset region. For EU Central, use `https://eu-central-1.aws.edge.axiom.co`.
3. Confirm `AXIOM_DATASET` exactly matches the dataset name in Axiom.
4. Create a new Axiom token and replace `AXIOM_TOKEN` if the old token may be invalid.

Too much data:

1. Set `EVENT_AUDIT_INCLUDE_PAYLOADS=false`.
2. Keep `LOG_LEVEL=info`.
3. Keep audit logging enabled only for focused test periods if needed.

Need to separate multiple tests:

1. Change `TEST_RUN_ID` before each session.
2. Redeploy or restart the Railway server.
3. Always filter Axiom queries by `testRunId`.

## Related Code

- `apps/server/src/app/env.ts`
- `apps/server/src/app/logger.ts`
- `apps/server/src/app/axiomLogSink.ts`
- `apps/server/src/realtime/realtimeAuditLogger.ts`
- `apps/server/src/realtime/registerSocketHandlers.ts`
