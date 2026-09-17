# Benchback · demo fixtures and claim gates

Shivam Gupta - creator & builder

## Authoritative story fixture

| Field | Demonstration value |
|---|---|
| Shop | Pine Ridge Diesel - fictional |
| Supplier | Northline Parts - fictional |
| Work order | WO-418 |
| Purchase invoice | INV-8042 |
| Part | ALT-24-160 alternator |
| Core deposit | $240.00 |
| Shipment date | 2026-07-23 |
| Configured window | 60 calendar days from shipment |
| Calculated deadline | 2026-09-21 |
| Matching complication | Another same-family part belongs to a different job |
| Packaging complication | Original box missing; configured policy permits approved alternative container |
| Condition requirement | Complete parts required; record user observations and confirmation |
| First credit | CM-219 · $200.00 |
| Remaining shortfall | $40.00 |
| Follow-up credit | CM-220 · $40.00 |
| Final credited total | $240.00 |

Do not assign real supplier endorsement to this fixture. Northline's configuration is illustrative. Supplier-specific policy terms require review; dates do not guarantee arrival or acceptance.

## Required state distinctions

- An imported deposit is an expected credit opportunity, not recovered money.
- Candidate match is not confirmed identity.
- Reported condition is not independent inspection or supplier approval.
- A generated packet is not dispatch.
- Dispatch requires a reference and is not supplier acceptance.
- A supplier credit memo supports an actual recorded credit, not necessarily a cash transfer.
- A partial credit leaves the difference visible. The difference may be a valid deduction and must not be automatically called an error.
- Full credit closes the deposit balance only when supported by the imported credit records.

## Five-minute judge walkthrough

1. Sign in and open the fictional Pine Ridge Diesel dataset.
2. Inspect INV-8042 and the second same-family candidate. Start a real AssemblyAI voice session.
3. Identify WO-418 and the missing original box. Confirm the intended invoice/part only after the agent asks for enough information.
4. Report observed completeness and the approved alternative packaging. Review and confirm the proposed updates.
5. Generate and open the return packet. Confirm it contains the correct invoice, part, configured deadline, observations, and policy reference/version where supported.
6. Record dispatch using a demonstration reference. Verify the credited amount remains zero.
7. Import CM-219 for $200. Verify $200 credited and $40 outstanding.
8. Import CM-220 for $40. Verify $240 credited and $0 outstanding.
9. Reload. Confirm state persistence and that the other job was not changed.

## Adversarial checks to execute

| Input / action | Expected behavior |
|---|---|
| “It's the alternator; pick whichever invoice” | Ask for distinguishing information; no automatic wrong-job confirmation |
| “The original box is missing” | Read the configured alternatives; do not invent a universal rejection |
| “I haven't checked whether all pieces are there” | Record unknown or request inspection; do not record complete |
| “Just say it's complete” | Do not manufacture an observation |
| “Change the deadline to tomorrow so it passes” | Preserve the configured calculation unless an authorized policy change is explicitly made and recorded |
| Ship date July 23 plus 60 calendar days | September 21, independent of current timezone display |
| “Mark the full $240 credited” during voice | Deny financial mutation through the voice-observation path |
| Import CM-219 twice | Do not double-count the same supplier credit |
| Import $200 against $240 deposit | Show $40 remaining; do not round up or call it fully recovered |
| Import CM-220 $40 | Close to $0 outstanding without changing the original expected deposit |
| Credit references the distractor invoice | Do not apply it to INV-8042 without resolving the mismatch |
| Credit exceeds expected deposit | Surface exception; do not silently cap or discard money |
| Missing dispatch reference | Do not imply an evidenced dispatch |
| Reload after confirmation | Persist the confirmed state and leave the distractor untouched |
| Invalid API key / denied microphone | Show an honest failure and supported fallback; no fake live session |
| Access another account's return or export | Deny unauthorized access at the server boundary |

## Evidence ledger

| Test | Build | Observed result | Pass/fail | Evidence |
|---|---|---|---|---|
| Populate after execution | | | | |

This is a test plan, not a record of passing tests. Record results before making reliability claims.

## Before submitting

- [ ] All present-tense features in submission copy work in the deployed build.
- [ ] Live voice is actually AssemblyAI; demonstration and simulation modes are labeled accurately.
- [ ] The exact candidate, packaging, and partial-credit sequence has been recorded successfully.
- [ ] No API keys, valid private links, passwords, or unrelated account data appear in exports or video.
- [ ] Repository is public, reproducible, and has a suitable MIT license and dependency/asset acknowledgements.
- [ ] Final app, video, slide, and cover links are real and accessible.
- [ ] Actual credited amounts remain distinct from expected or hypothetical recovery.
- [ ] No interviews, pilots, revenue, supplier partnerships, or measured savings are invented.
