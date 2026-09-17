# Operations

## Local database

Build once, then run `npm run db:migrate:local`. The helper maintains an application migration ledger in the local D1 database and applies pending committed SQL files in order. It never targets production. The development server and Wrangler use `.wrangler/state`.

For schema changes: edit `db/schema.ts`, run `npm run db:generate`, review generated SQL, and test from an empty local database. Sites packages `drizzle` into the deployment artifact and handles production application of migrations. Never alter an already applied migration.

## Deployment

Use the Sites building/hosting skills with the existing project in `.openai/hosting.json`. Configure `ASSEMBLYAI_API_KEY` as a server secret, not a frontend variable. Commit and push the exact tested revision before packaging and deployment. Keep provider keys and source-write credentials out of Git. The repository also supports the local Vite/Vinext workflow without the Codex app.

The created Site starts owner-private. Publish preserves that audience. Sharing with judges or prospective customers requires an explicit audience change by the owner. The public example route does not mean the hosting platform itself is publicly shared.

## Provider failures

If the key is absent, live voice returns 503 and all nonvoice workflows remain available. A failed token request releases the successful-issuance quota; attempts remain limited. If provider access is denied, check native Voice Agent API entitlement separately from STT credits. Never expose upstream credential-bearing messages to users.

If microphone access is denied, use the inspection form and retry after changing browser permission. HTTPS or localhost is required for microphone capture. A dropped socket ends the local session; observations already confirmed by the server remain saved. Do not claim an unsaved utterance was captured.

If a concurrent update conflicts, reload the record before applying another change. Imports are all-or-nothing. Do not retry a changed human mutation using the same idempotency key. Correct credits with a reversal and new posting; correct dates with the reasoned correction action.

## Data recovery and deletion

Use Settings → Export complete workspace before deleting anything. JSON contains policies, records, audit events and final transcripts; the CSV is an accounting summary. Workspace deletion removes the account's stored records and history, keeps daily paid-voice abuse counters, and is permanent in this application. Provider logs/backups can have separate retention. A self-service JSON restore has not been implemented; an operator must validate any import/migration.

## Cost boundaries

At $0.075/minute, ten minutes of provider voice costs $0.75. The issuance limit is a maximum exposure control, not usage-based billing telemetry: 20 fully used global daily sessions would represent up to 200 minutes/$15 per day. There is no billing/paywall. Do not expose a broadly public paid voice endpoint without aligning quotas, provider spend limits, abuse controls and a funded budget. Set provider account limits where available.

## Incident checklist

1. Disable voice by removing the server secret if unexpected issuance occurs; preserve evidence and account ownership boundaries.
2. Inspect sanitized Worker logs and provider usage. Never log API keys, tokens, raw audio or full business records.
3. Export affected workspace data before repair. Use corrective events rather than editing credit history silently.
4. Fix and run relevant tests, deploy, then verify the affected workflow.
5. Notify affected users through an authorized contact process; the app has no outbound notification integration.

## Dependency maintenance

The lockfile pins the tested dependency graph. React/RSC are on matching 19.2.8 releases. The Drizzle development loader uses an explicit esbuild 0.25.12 override to address its older transitive server advisory; migration generation and fresh migration application were checked after the change. Revalidate that override on Drizzle upgrades. Miniflare 5 uses its official v4-options adapter in the test harness.
