# Verification record

Date: September 17, 2026. Firebase migration and finalization work in the shared checkout. All application records used for testing are fictional.

## Completed local checks

- **92 automated tests passed** through `scripts/test.mjs`: 39 domain, 24 Firestore API, 10 authentication, four PCM worklet and 15 voice-client contracts.
- Firestore API tests use the real emulator, production route functions and transaction repository. Identity is substituted. Tests force a synthetic local project and do not touch production records.
- Concurrent revisions, purchase imports and practice seeding preserve uniqueness. Credit collisions and stale revisions roll back entire imports. A maximum 200-row credit import committed atomically and exported its events.
- Active memo allocations remain unique across cores. Reversal preserves evidence and permits corrected allocation. Integer-cent accounting keeps recorded credit, deductions and unresolved balances distinct.
- Quotas remain bounded under contention. Final transcripts are idempotent. Ended-session tools cannot mutate records. Interrupted deletion blocks new mutations and safely resumes under a replacement lease.
- Inspection tools require explicit quoted technician evidence from the same owner, session and core. Tests reject generic confirmation, invented quotes, other speakers or sessions, questions and selected obvious contradictions. Natural statements about all required components are accepted. This is a bounded grounding check, not general semantic or physical verification.
- Saved practice records reload in stable urgency order, with WO-418 first. Timestamp ties no longer let random document IDs select the default voice record.
- Authentication tests exercise real session routes with mocked Firebase verification: revocation, cookie flags, trusted origins, fresh password authentication, refreshed guests, spoofed headers and safe redirects.
- Voice-client tests cover configuration, transcript/tool ordering, interruption, cleanup and microphone permission timeout behavior. They use mocked browser interfaces and do not prove a real microphone conversation.
- TypeScript, full lint and production build were reported passing during finalization. One remaining warning is being addressed before the final deployment verification. The current dependency audit reported zero known vulnerabilities. Neither a clean audit nor these tests constitutes a complete security assessment.

## Completed public Firebase checks

The main development session exercised [benchback-ai.web.app](https://benchback-ai.web.app) through its public Firebase address, using actual browser interaction and fictional data.

- Public access, private guest sign-in and email/password QA account sign-in worked.
- A private guest workspace saved exact identifiers and inspection observations. A person confirmed the match and prepared the return.
- The two-page return packet was downloaded. Fictional dispatch and receipt evidence were saved.
- A $200 recorded credit left $40 unresolved. A further $40 recorded credit produced $240 credited and zero unresolved. These were fictional entries, not actual supplier payments.
- Saved values persisted after refresh. The guest and separate QA account showed distinct workspace states.
- Responsive checks at 320px and 390px found no document-level horizontal overflow.

Distinct account states support ordinary workspace separation. Deliberately requesting every other-owner record, event, export and session on the hosted deployment remains a separate acceptance check; those authorization boundaries are covered by local API tests.

## Voice evidence and limitation

An earlier provider harness successfully exercised real AssemblyAI voice using synthetic technician speech. That harness used fictional in-memory records and was not a browser microphone or hosted persistence test. The final prompt and evidence contract require another provider acceptance run after deployment.

A Chrome microphone-permission attempt stalled. A twenty-second permission timeout and cleanup fix now have automated coverage, but a complete physical-microphone conversation has **not** been verified. Do not claim that real microphone input, spoken output and saved hosted tools passed together. The form workflow remains available.

No noisy-workshop accuracy, measured user latency or customer outcome is established by synthetic audio or mock transport tests. A configured secret and successful token issuance are not substitutes for those checks.

## Final delivery gates

The final deployment is in progress. Record the final source commit, Cloud Run revision, Firebase release and current CI result after it completes. Recheck the public app after the last code changes rather than applying earlier browser results to an untested revision.

Still pending:

- Final real-provider rerun for the current prompt and evidence contract.
- Complete hosted physical-microphone acceptance, including interruption, refused unauthorized credit posting, saved observations/transcripts after refresh and graceful network failure.
- Final deployed cross-account denial checks, password recovery/account-linking checks and broader keyboard/accessibility coverage.
- Production backup restoration and operational security review.
- Final video publication URL and actual event submission confirmation.

## Commercial and operational boundaries

The deployment uses Firebase Authentication, Next.js on Cloud Run, the billable named Firestore database `benchback`, and an AssemblyAI secret in Secret Manager. There is no customer SLA or self-service restore.

Customer interviews, paid pilots, incremental recovery, total effort saved, willingness to pay and noisy-workshop performance remain unvalidated. Internal rubric review is a provisional development assessment, not an external judge score.
