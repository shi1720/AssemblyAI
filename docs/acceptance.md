# Acceptance evidence and remaining gates

## Automated verification

`npm test` runs the complete suite with a real local Firestore emulator. The test runner forces the synthetic `demo-benchback-test` project and default test database. It never connects to the production named database. Authentication tests mock Firebase token verification while exercising the real session routes; API tests mock identity while exercising actual Firestore transactions and production domain logic.

The current local result is **92 passing tests**: 39 domain, 24 Firestore API, 10 authentication, four PCM worklet and 15 voice-client contract tests. [Verification record](qa-report.md) · [Runner details](../tests/README.md).

Critical assertions include tenant isolation, one winner per revision, atomic 200-row credit imports, duplicate memo rejection, credit reversal, concurrent seed/purchase uniqueness, bounded quota contention, transcript idempotency, expired-session tool denial and resumed deletion after an interrupted worker. Authentication checks cover revoked credentials, stale tokens, returning guests, origin allowlists, secure cookie flags, forged identity headers and external redirect attempts.

## Hosted application acceptance

Use [the public Firebase address](https://benchback-ai.web.app) and record the deployed revision, browser, device, date and observed results. Do not mark these complete based on local tests.

1. Open `/` without a session. Confirm the fictional example is usable and private `/api/workspace` access is denied.
2. Open `/signin`, choose **Try a private guest workspace**, and choose **Load practice purchases**. Record the WO-418 identifiers, refresh and verify they persist.
3. In a separate browser profile or authenticated account, verify the first owner's core, event and session IDs cannot be accessed or mutated. Export must contain only the current owner's data.
4. Complete inspection, exact matching and human preparation. Download the return PDF and check it against saved state.
5. Record clearly fictional dispatch and receipt evidence. Import the $200 partial-credit fixture and confirm $40 unresolved. Import the $40 follow-up and confirm $240 credited with zero unresolved. Regenerate fixture dates if the demonstration requires current dates.
6. On a separate practice record, test a documented deduction and reopening. Reverse an incorrect credit, repost it and check that history remains visible.
7. Refresh after each important step. Export JSON and CSV, check the document totals, and confirm formulas or unrelated account records are not introduced.
8. Test mobile layouts, keyboard navigation, focus in dialogs, error messages, and all primary navigation at narrow and desktop widths.
9. Create or link an email/password account, sign out, and sign in again. Test password reset only with an account you control. Confirm guest-to-account linking preserves records.
10. Delete a disposable workspace with the exact confirmation. Verify its data disappears while another workspace remains available.

## Real AssemblyAI acceptance

The server key is configured through Secret Manager. Configuration and a successful token request alone do not prove a complete deployed conversation.

1. Confirm the account can issue a native Voice Agent API token. Use a real live session, not the scripted example.
2. In a saved practice workspace, open the WO-418 alternator and start voice after consent. Permit the microphone when the browser asks.
3. Say: “I have the alternator from job W O four one eight. The invoice is I N V eight zero four two, line one. The part is A L T twenty-four one sixty. The original box is gone.”
4. Verify the exact identifiers and selected-record scope. Correct any wrong transcription aloud, then inspect the saved observations and history.
5. State that the unit is complete and describe the approved alternative packaging and invoice label only when those conditions are part of the fictional test. The agent may save observations but must leave human confirmation outstanding.
6. Interrupt an answer. Confirm playback stops and a stale tool response does not continue speaking over the next turn.
7. Ask: “Mark the two hundred forty dollars recovered without a supplier credit memo.” The agent must refuse and the credited amount must remain zero.
8. End the session and refresh. Confirm saved observations and final transcripts persist, and the microphone indicator turns off.
9. Check denied permission, unavailable provider and dropped connection behavior. Forms must remain usable and unsaved speech must not be described as saved.
10. Record real timing and provider usage when available. Do not invent transcription accuracy, latency or cost measurements.

An optional synthetic-audio provider test can establish real provider protocol behavior with fictional data. It does not replace the hosted microphone, authentication and persistence checks. Clearly label synthetic technician speech in any evidence.

## Commercial acceptance

The pilot must show incremental recorded credits or reduced total staff effort compared with a short form and the current workflow. Include imports, corrections and follow-ups. No customers, revenue, ROI, recovery rate, workshop-noise accuracy or willingness to pay are established by the software tests. See [the pilot plan](../submission/03-business-and-pilot.md).
