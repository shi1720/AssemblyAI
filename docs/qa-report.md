# Verification record

Date: September 17, 2026. Public release `b1985c3691ef7c75b05f740ed4c7ff14a0a9fa20`. All application records used for testing are fictional.

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
- TypeScript, full lint and production build passed. [GitHub Actions run 35199621332](https://github.com/shi1720/AssemblyAI/actions/runs/35199621332) succeeded for source commit `b1985c3`. The current dependency audit reported zero known vulnerabilities. Neither a clean audit nor these tests constitutes a complete security assessment.

## Completed public Firebase checks

The main development session exercised [benchback-ai.web.app](https://benchback-ai.web.app) through its public Firebase address, using actual browser interaction and fictional data.

- Public access, private guest sign-in and email/password QA account sign-in worked.
- A private guest workspace saved exact identifiers and inspection observations. A person confirmed the match and prepared the return.
- The two-page return packet was downloaded. Fictional dispatch and receipt evidence were saved.
- A $200 recorded credit left $40 unresolved. A further $40 recorded credit produced $240 credited and zero unresolved. These were fictional entries, not actual supplier payments.
- Saved values persisted after refresh. The guest and separate QA account showed distinct workspace states.
- Responsive checks at 320px and 390px found no document-level horizontal overflow.

Distinct account states support ordinary workspace separation. Deliberately requesting every other-owner record, event, export and session on the hosted deployment remains a separate acceptance check; those authorization boundaries are covered by local API tests.

## Real provider and hosted persistence acceptance

The final real AssemblyAI run passed **11 of 11 assertions**, with zero reported errors. Synthetic technician audio passed through the native provider, then authenticated hosted tool routes saved observations to Firestore. The run recorded **two audit events and 21 final transcripts**. Its total scripted-session duration was **217.263 seconds**, not a response-latency measurement. [Sanitized acceptance report](live-voice-acceptance.json).

The checks covered session readiness, actual agent audio, multiple purchase candidates, supplier-policy consultation, exact purchase observations, inspection capture, retained human approval, no invented credit, explanation of human approval, absence of provider errors, and hosted persistence. Purchase confirmation remained false, preparation and dispatch remained unset, and no credits were posted. This is stronger evidence than token issuance or a mocked voice contract test.

The technician input was synthetic. A complete physical-microphone conversation has **not** been verified. In the hosted Chrome attempt, unresolved microphone permission now produced the expected twenty-second timeout message and reenabled the start button. That timeout and retry behavior was observed in the browser, not just a mock test. The form workflow remained available.

The run does not establish noisy-workshop accuracy, physical inspection truth, customer outcomes or general language entailment. Quotes in the audit trail remain client-reported transcript evidence.

## Deployed release and remaining delivery gates

- Public Firebase URL: [benchback-ai.web.app](https://benchback-ai.web.app), with HTTP 200 health response.
- Cloud Run revision: `benchback-00004-xqv`.
- Cloud Build: `0ede527a-788a-4c90-a196-46e325484df9`.
- Source commit: `b1985c3691ef7c75b05f740ed4c7ff14a0a9fa20` on `main`.
- CI: [run 35199621332 succeeded](https://github.com/shi1720/AssemblyAI/actions/runs/35199621332).

Still pending:

- A complete physical-microphone conversation on the public app, including interruption and recovery from a dropped connection.
- Deliberate deployed cross-account denial checks, password recovery/account-linking checks and broader keyboard/accessibility coverage.
- Production backup restoration and operational security review.
- Final video publication URL and actual event submission confirmation.

## Commercial and operational boundaries

The deployment uses Firebase Authentication, Next.js on Cloud Run, the billable named Firestore database `benchback`, and an AssemblyAI secret in Secret Manager. There is no customer SLA or self-service restore.

Customer interviews, paid pilots, incremental recovery, total effort saved, willingness to pay and noisy-workshop performance remain unvalidated. Internal rubric review is a provisional development assessment, not an external judge score.
