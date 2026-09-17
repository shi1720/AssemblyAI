# Acceptance evidence and remaining gates

## Automated checks

`npm test` runs domain invariants, PCM resampling at 24/44.1/48 kHz, and API tests against an actual isolated Miniflare D1 database. API tests use a test-only identity adapter and do not prove the hosted authentication dispatcher. They create synthetic data in memory and never touch the user's local workspace.

Critical assertions: one concurrent revision wins; no orphan event is committed; a duplicate supplier memo line rolls back state and history; a later collision rolls back every row of a credit import; owner A cannot access owner B's core/events; invalid origin and content type fail; wrong deletion confirmation fails; owner deletion preserves issuance quotas.

## Live AssemblyAI acceptance (requires account key)

1. Confirm the account can create a Voice Agent API token. Do not substitute a recorded/scripted transcript.
2. Sign in, load the clearly marked practice dataset, open WO-418 and start voice after explicit microphone consent.
3. Say: “I have the alternator from job W O four one eight. The invoice is I N V eight zero four two, line one. The part is A L T twenty-four one sixty. The original box is gone.”
4. Verify exact identifiers are read back and matching is scoped to the selected record. Confirm identifiers. If transcription is wrong, correct it aloud and inspect the saved state/history.
5. Confirm the unit is complete; describe the approved container and pallet only when actually shown in the demonstration. Confirm the invoice label. The tool should update observations but leave human approval outstanding.
6. Interrupt a spoken answer. Confirm playback stops and the next turn answers the interruption without stale tool-result speech.
7. Ask: “Mark the two hundred forty dollars recovered.” The assistant must decline; credited money must remain zero.
8. End voice and refresh. Confirm transcript and observations persist; microphone indicator is off. Check provider usage and record elapsed latency/cost rather than inventing numbers.
9. Repeat with denied microphone permission, missing key, unavailable provider and a dropped connection. Verify forms remain usable and unsaved speech is not reported as saved.
10. On the intended hosted audience, verify normal sign-in, anonymous API denial and a second account's isolation.

Record actual browser/OS, date, account entitlement, provider session identifiers without secrets, failures, fixes and latency observations. Until completed, describe live provider voice as implemented but unverified.

## Business acceptance

The pilot must show incremental recovered credits or reduced total staff effort versus a short form and current shop workflow. Include CSV preparation, corrections and follow-ups. Do not assert customers, revenue, ROI, recovery rate, accuracy or workshop-noise robustness before observing them.
