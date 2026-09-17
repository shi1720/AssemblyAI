# Benchback launch-validation checklist

Shivam Gupta, creator and builder.

This checklist separates completed local checks from hosted, presentation and commercial evidence still to attach. An unchecked box does not imply a failed test; it means completion has not been recorded here.

## Completed local verification

- [x] Run all 92 tests through the real Firestore emulator wrapper.
- [x] Verify owner isolation, revision conflicts and idempotent action retries.
- [x] Verify purchase/memo uniqueness and atomic credit imports, including 200 rows.
- [x] Verify credit reversal, deduction accounting, date rules and human permission gates.
- [x] Verify bounded quotas, transcript idempotency, ended-session tool denial and interrupted deletion recovery.
- [x] Test authentication origins, cookie flags, token freshness, refreshed guest access, spoofed headers and safe redirect paths.
- [x] Run TypeScript, full lint, production build and dependency audit; release CI succeeded on `b1985c3`.

These checks use fictional data and test authentication adapters. [Evidence and limitations](../docs/qa-report.md).

## Public deployment and account gate

- [x] Verify [benchback-ai.web.app](https://benchback-ai.web.app) loads publicly.
- [x] Record source `b1985c3`, Cloud Run `benchback-00004-xqv`, build `0ede527a-788a-4c90-a196-46e325484df9` and public Firebase health HTTP 200.
- [x] Verify guest sign-in, **Load practice purchases**, saved changes and reload.
- [x] Verify email/password sign-in with a controlled QA account.
- [ ] Verify sign-out, password reset and guest-to-account linking on the final deployment.
- [x] Verify distinct guest and QA account workspace states.
- [ ] Deliberately request another identity's record, events, export and session on the hosted app; all must remain inaccessible.
- [ ] Verify forged authentication headers cannot create an identity and direct Firestore browser requests are denied.
- [ ] Confirm the provider key stays in Secret Manager and is absent from browser assets, network payloads, repository and recordings.
- [x] Complete release lint, build, dependency review and [CI run 35199621332](https://github.com/shi1720/AssemblyAI/actions/runs/35199621332).
- [x] Inspect narrow layouts at 320px and 390px without document-level horizontal overflow.
- [ ] Complete final desktop, dialog-focus and keyboard-interaction checks.

## Live voice gate

- [x] Run real AssemblyAI audio through authenticated hosted tools and Firestore, using explicitly labelled synthetic technician speech. All 11 assertions passed.
- [ ] Confirm microphone input, spoken replies, exact identifier clarification, scoped tools, final transcripts and persistence after refresh.
- [ ] Test otherwise similar purchases with different line/unit references.
- [ ] Demonstrate interruption, denied permission, a dropped connection and a usable form fallback.
- [x] Confirm the real-provider test leaves credit at zero and explains that human approval is required.
- [ ] Check failed provider-token requests release session allowance while preserving the attempt limit.
- [ ] Record browser/device, timestamp, measured limitations and provider usage when available. Hide all secrets.

The final real-provider run passed 11/11 assertions in 217.263 seconds with zero reported errors, two audit events and 21 transcripts persisted through hosted routes. Chrome's unresolved microphone permission produced the expected twenty-second timeout and reenabled the start button. That recovery was verified on the public app, while a complete physical-microphone conversation remains unverified. [Sanitized evidence](../docs/live-voice-acceptance.json).

## Return and accounting gate on the hosted build

- [ ] Verify the current fictional policy deadline from its shipment date and configured day window. Do not reuse stale dates from a previous recording.
- [ ] Check dispatch-based and receipt-based policies; dispatch must not imply timely receipt.
- [ ] Check original packaging, permitted alternatives and incomplete or unknown observations.
- [x] Confirm real-provider inspection leaves human matching and preparation outstanding.
- [x] Save fictional dispatch and receipt references after manual preparation.
- [ ] Correct an intentional date error and inspect the audit trail and recalculated follow-up.
- [x] Record $200, verify $40 unresolved, then record another $40 and verify $240 credited with zero unresolved.
- [ ] Repeat the hosted flow through the CSV importer using CM-219 and CM-220. Automated tests cover atomic import behavior.
- [ ] Attempt duplicate memo allocation and verify rejection without partial writes.
- [ ] Reverse an incorrect credit and repost it while retaining history.
- [ ] Accept a $40 deduction after $200 credited, verify credit stays $200, then reopen it.
- [ ] Onboard a historical return without fabricating current preparation evidence.
- [x] Download the two-page return PDF and verify saved return/credit values after refresh.
- [ ] Compare every final export format, including complete workspace JSON, against the hosted record.
- [ ] Delete a disposable workspace without affecting another owner or resetting voice quotas.

## Cost and operational gate

- [ ] Review actual AssemblyAI usage and project billing; configured quotas are not total-spend caps.
- [ ] Include billable named Firestore reads/writes/storage, Cloud Run, builds, image storage, hosting and support in the cost model.
- [ ] Confirm Cloud Run minimum zero and maximum three instances in the deployed revision.
- [ ] Configure appropriate budget alerts and provider spend controls.
- [ ] Validate monitoring, backup restoration and incident response before serving commercial customers.
- [ ] Keep the absence of a customer SLA and direct supplier/ERP/carrier integrations clear.

## Commercial validation gate

- [ ] Interview the budget owner and frontline user and retain actual findings.
- [ ] Measure core-bearing volume and the existing workflow, including incumbent modules.
- [ ] Compare voice with a short form and the current process, including preparation, import, corrections, review and follow-up.
- [ ] Include routine cases and record voluntary voice-versus-form choice.
- [ ] Separate total imported supplier credits from incremental credits attributable to Benchback.
- [ ] Obtain a concrete paid pilot or renewal decision; interest alone is not a sale.
- [ ] Recompute margins with observed infrastructure usage and support effort.

Commercial validation is required for claims of demand, measured ROI or sustainable economics. It is not required to honestly submit an unvalidated hackathon product.

## Presentation and publication gate

- [ ] Check the actual target event's eligibility, rubric and required fields.
- [ ] Replace every obsolete deployment or architecture reference in slides, screenshots, story and captions.
- [ ] Produce a clear video from actual UI behavior with accurate narration and synchronized captions.
- [ ] Label fictional entities, synthetic narration and scripted replay where applicable.
- [ ] Keep expected deposit, recorded credit, deduction and unresolved balance distinct.
- [ ] Acknowledge incumbent core tracking without unsupported comparisons or moat claims.
- [ ] Verify public app, repository, deck and video links in an unauthenticated context.
- [ ] Submit the event fields and retain the platform's actual confirmation.

## Evidence log

| Check                                 | Date and build                            | Method                                      | Observed result                                                                   | Evidence                        |
| ------------------------------------- | ----------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| Automated release                     | September 17, 2026, `b1985c3`             | Emulator, Vitest and GitHub Actions         | 92 tests, typecheck, lint and build passed                                        | docs/qa-report.md               |
| Public account and accounting flow    | September 17, 2026                        | Browser UI, fictional guest and QA accounts | Sign-in, inspection, PDF, dispatch, receipt, $200 + $40 credits and reload worked | docs/qa-report.md               |
| Responsive layout                     | September 17, 2026                        | 320px and 390px browser views               | No page-level horizontal overflow                                                 | docs/qa-report.md               |
| Real provider with hosted persistence | September 17, 2026, `benchback-00004-xqv` | AssemblyAI and synthetic technician speech  | 11/11 assertions, zero errors, two audit events and 21 transcripts saved          | docs/live-voice-acceptance.json |
| Microphone timeout recovery           | September 17, 2026, final public revision | Chrome permission attempt                   | Twenty-second timeout displayed and start button reenabled                        | docs/qa-report.md               |
| Full physical microphone conversation | Pending                                   |                                             | Not yet verified                                                                  |                                 |
| Deployment and CI                     | September 17, 2026, `b1985c3`             | Firebase, Cloud Run and GitHub Actions      | Public health 200 and successful CI                                               | docs/qa-report.md               |
| Video publication                     | In progress                               |                                             | No final link recorded here                                                       |                                 |
| Event submission                      | In progress                               |                                             | No submission confirmation recorded here                                          |                                 |
