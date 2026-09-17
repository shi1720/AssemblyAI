# Operations

## Deployment resources

The application address is [benchback-ai.web.app](https://benchback-ai.web.app). Firebase Hosting rewrites to the `benchback` Cloud Run service in `us-central1`. The Google Cloud project is selected by `.firebaserc` and the deployment script; existing unrelated applications in that project must remain untouched.

The service uses a dedicated `benchback-runtime` service account and the named Firestore database `benchback`. The AssemblyAI key is in Secret Manager as `benchback-assemblyai-key`, exposed to the server as `ASSEMBLYAI_API_KEY`. Never place a provider key in frontend configuration, build arguments, Git, screenshots or logs. Firebase's public browser configuration is not a substitute for server authorization.

Cloud Run settings are zero minimum instances, three maximum instances, 512 MiB memory, one CPU, concurrency 40, and a 300-second request timeout. The application has no uptime SLA. Cold starts and external provider failures remain possible.

## Local work and tests

Install Node.js 22.13+, npm and Java 21+. Run `npm ci`, then `npm test`. The wrapper downloads a checksum-pinned Firestore emulator on first use, chooses a local port, runs the complete suite in a `demo-benchback-test` project, and stops the emulator. Tests do not use production records or provider keys. See [test details](../tests/README.md).

`npm run dev` starts Next.js at `http://127.0.0.1:5173`. The public example needs no credentials. For a saved development workspace, use a dedicated Firebase project, configure its browser values in `lib/firebase-config.json`, enable the desired Authentication providers, and supply server credentials using Application Default Credentials. Set `GOOGLE_CLOUD_PROJECT`, `FIRESTORE_DATABASE_ID`, and `APP_ORIGINS` explicitly. Do not accidentally point development mutations at production.

A local Firestore emulator can be selected with `FIRESTORE_EMULATOR_HOST=127.0.0.1:8787`. This affects storage, not Firebase Authentication: a local signed-in application still needs a corresponding verified identity unless an Authentication emulator is deliberately configured. The automated suite mocks identity at its test boundary.

For local voice, place `ASSEMBLYAI_API_KEY` in ignored `.env.local`. An OpenAI key is not needed to run the app. Offline narration and optional synthetic-audio provider tests have separate requirements.

## Releasing a revision

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run deploy
```

`scripts/deploy.mjs` requires authenticated `gcloud` and Firebase tooling plus provisioned project resources. It submits the Docker build, publishes the image, deploys Cloud Run with runtime secrets, then deploys Firebase Hosting and Firestore rules. Confirm project, image revision and source commit before executing it. Provider credentials are not supplied to the container build.

Production `APP_ORIGINS` lists the `benchback-ai.web.app` and `benchback-ai.firebaseapp.com` HTTPS origins. Do not replace it with a wildcard or accept arbitrary forwarded headers. Firestore rules deny browser access; the server enforces ownership on every operation. Firestore schema changes are application changes, not SQL migrations.

After deployment, verify guest and account sign-in, a saved mutation plus reload, isolation from a second account, the complete credit workflow and real voice on the public URL. A passing container build is not evidence that those checks passed. Retain the prior Cloud Run revision for rollback and verify that a rolled-back app understands current document shapes.

## Failures and corrections

A missing voice key produces a clear unavailable response while forms and exports remain usable. Token failures release successful-issuance quota but preserve the attempt limit. Check native Voice Agent API entitlement and provider balance separately. Do not display credential-bearing upstream errors.

Microphone capture requires HTTPS or localhost. If permission is denied, use the inspection form. A dropped socket ends the client session; server-confirmed observations remain saved. Speech that was not acknowledged is not claimed as captured.

On a revision conflict, reload before applying another change. Imports are atomic. Do not reuse the same request ID for a different action. Correct credits through reversal and reposting, and dates through the audited correction action.

## Export, deletion and recovery

Settings offers a complete workspace JSON export containing records, policies, events and final transcripts. Ledger CSV is a summary, not a full backup. Export before deletion. The self-service delete flow removes workspace data and retains abuse quotas; it does not delete the Firebase Authentication account or provider-side logs.

Deletion blocks new mutations while it runs. If interrupted, retry after two minutes. Each bounded deletion transaction checks a durable lease, preventing overlapping workers from deleting newly created data after recovery. Do not manually clear the deletion lock without investigating.

A self-service JSON restore is not implemented. Production backup scheduling and a restore exercise are pending operational gates. Provider or infrastructure backups can have separate retention from the app's delete workflow.

## Costs and limits

The named `benchback` Firestore database is billable; do not assume that this deployment receives free database quota. Reads, writes, deletes, storage and bandwidth can incur charges. Cloud Run minimum instances are zero, but that does not make the application free. Cloud Build, Artifact Registry, Secret Manager, Hosting and provider use also contribute. [Firestore pricing](https://firebase.google.com/docs/firestore/pricing).

At the planning rate of $0.075/minute, ten minutes of native voice is $0.75. Twenty fully used ten-minute sessions represent up to 200 minutes or $15 of voice usage per UTC day. This is an issuance bound, not actual metered usage or a total-cloud-spend cap. There is no paywall. Check current [AssemblyAI pricing](https://www.assemblyai.com/pricing), monitor billing and set provider/project budget alerts. Three Cloud Run instances also do not impose a dollar spending cap.

## Incident procedure

1. Restrict voice issuance or remove its runtime secret if issuance is unexpected. Keep account ownership checks intact.
2. Review sanitized Cloud Run logs and provider usage. Do not log keys, bearer tokens, raw audio or complete customer records.
3. Preserve appropriate evidence before repair. Use corrective events rather than silently rewriting financial history.
4. Fix the cause, run relevant tests, deploy and verify the affected hosted workflow.
5. Contact affected users through an explicitly authorized process. The app has no outbound notification integration.

Maintain the lockfile and retest Firebase, Next.js and transitive updates. CI installs Java 21, runs the emulator-backed suite, typechecks, lints and builds. Dependency audit results are dated evidence, not a guarantee of application security.
