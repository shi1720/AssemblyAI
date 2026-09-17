# Benchback · launch-validation checklist

Shivam Gupta — creator & builder

This is an execution checklist, not a passing test report. All boxes begin unchecked. Attach actual evidence before marking completion. Items depending on the owner's latest fixes remain pending until exercised.

## Live technology gate

- [ ] Record a real AssemblyAI session in the deployed application, with no simulator or prerecorded agent replies.
- [ ] Confirm microphone input, spoken agent output, transcript capture, tool execution, persistence, and owner-view refresh in the same session.
- [ ] Resolve the intended invoice/job/part through conversation. Test two otherwise identical candidates on different purchase lines.
- [ ] Demonstrate interruption, denied microphone permission, a dropped connection, and an honest supported fallback.
- [ ] Confirm failed provider-token requests release session allowance while retaining a bounded abuse-attempt limit.
- [ ] Record session date, deployed build/commit, browser, device, and observed limitations. Hide all secrets and valid private links.

## Return and accounting gate

- [ ] Verify 2026-07-23 plus 60 calendar days produces 2026-09-21 under the demonstration policy.
- [ ] Test both dispatch-based and receipt-based deadlines. A dispatch does not imply timely receipt.
- [ ] Verify original packaging and a permitted alternative take distinct, correct paths; unknown completeness remains unresolved.
- [ ] Confirm human approval is required and voice cannot approve, dispatch, credit, or waive a rule.
- [ ] Record a real or clearly fictional dispatch reference as appropriate; ensure preparation alone does not imply dispatch.
- [ ] Correct an intentionally mistyped dispatch/receipt date using the audited correction flow. Check recalculated deadline/credit-follow-up status.
- [ ] Import CM-219 for $200, verify $40 unresolved, then import CM-220 for $40 and verify $240 credited with zero unresolved.
- [ ] Repeat the same supplier memo line on another core and verify rejection without partial writes.
- [ ] Reverse an erroneous credit and repost the corrected entry while preserving history.
- [ ] Test a valid final deduction: $200 credited plus $40 accepted deduction resolves the case while actual credit stays $200.
- [ ] Import an already-returned historical core after its deadline without fabricating current preparation evidence.
- [ ] Reload the application and compare the record, ledger, and exported packet against persisted state.

## Access and data gate

- [ ] Test another authenticated account requesting the first account's core, events, export, and session; access must be denied.
- [ ] Verify deployed ingress rejects or replaces caller-supplied authentication headers and that no public origin bypasses it.
- [ ] Retry an identical mutation idempotently; retry its ID with a different action and verify a conflict.
- [ ] Test simultaneous credit/manual updates; ensure only valid revisions commit and imports remain atomic.
- [ ] Confirm finalized transcript records are not silently rewritten and their client-reported provenance is clear.
- [ ] Confirm supplier-policy snapshots and original evidence are retained when later actions occur.
- [ ] Check exports for correct escaping and absence of secrets or unrelated account data.

## Commercial validation gate

- [ ] Interview the actual budget owner and frontline user; record what was asked, when, and what evidence they supplied. Do not invent missing responses.
- [ ] Determine the shop's actual monthly core-bearing volume and existing process, including incumbent modules.
- [ ] Compare the voice check against the same fields and rules in a short form and against the existing process.
- [ ] Measure data preparation/import, bench interaction, corrections, reviewer checks, dispatch recording, and credit reconciliation separately and in total.
- [ ] Include routine cases, not only exceptions that favor dialogue. Capture voluntary voice-versus-form choice.
- [ ] Distinguish total imported credits from incremental credits attributable to Benchback; mark pending supplier outcomes explicitly.
- [ ] Obtain a concrete paid renewal decision at the proposed price. Interest or a positive comment is not a sale.
- [ ] Recompute margins with actual usage and support time. Do not present revenue less voice cost as profit.

These commercial items are not prerequisites for honestly submitting an unvalidated hackathon product. They are prerequisites for claims of validated demand, measured ROI, and sustainable economics.

## Presentation and publication gate

- [ ] Replace draft application, repository, video, and deck fields with verified accessible links.
- [ ] Record the verbatim script using actual UI actions and agent responses; verify runtime and subtitle accuracy.
- [ ] Label Pine Ridge Diesel and Northline Parts as fictional demonstration entities.
- [ ] Keep expected, recorded-credit, accepted-deduction, and unresolved values distinct in every slide and screen.
- [ ] Acknowledge Fullbay without unsupported feature comparisons; explain the narrow bench-to-credit hypothesis.
- [ ] Describe the 31/40 self-review as internal and provisional, if mentioned at all. Do not imply external judging.
- [ ] Match every present-tense submission claim to a verified shipped feature. Disclose incomplete live testing if it remains incomplete.
- [ ] Verify public repository setup, MIT license, asset rights, secret exclusion, and accurate acknowledgements.

## Evidence log template

| Check | Date / build | Method | Observed outcome | Evidence link | Reviewer |
|---|---|---|---|---|---|
| Pending | | | | | |

Only change the live-voice FAQ answer after the corresponding deployed session is actually tested. A successful build, source review, or simulated dialogue does not satisfy that gate.
