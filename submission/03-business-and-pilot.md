# Benchback · business case and validation plan

Shivam Gupta - creator & builder
Prepared September 17, 2026

## The customer and problem

**Target buyer:** Owner or parts manager at an independent diesel repair shop that buys remanufactured components and handles recurring supplier core deposits.

**Frontline user:** A technician or parts employee inspecting and identifying the removed component.

**Job:** Connect the correct part to its supplier deposit, prepare an eligible return under the shop's configured policy, record dispatch, and reconcile the eventual supplier credit. Benchback does not replace the shop's full accounting or repair-management system.

This is a recurring money workflow, but its size and frequency at a particular shop must be established. A shop with few core-bearing jobs or a well-run existing core module may have no reason to buy Benchback.

## Grounded evidence and boundaries

FleetPride's published policy permits core returns within 60 days of shipment, requires like-for-like cores, specifies packaging alternatives, permits deductions for conditions such as missing pieces, and notes that core credits can take up to 45 days. These are **FleetPride-specific terms**, not universal rules or a guarantee of reimbursement. [FleetPride returns and warranty policy](https://www.fleetpride.com/help/returnwarranty)

Fullbay explains core deposits, the need to track cores across purchasing, customer credit, and supplier return, and the role of a repeatable return process. It also offers core tracking itself. This is evidence of an established workflow and a real incumbent-not proof of an uncontested market. [Fullbay core guide](https://www.fullbay.com/blog/part-cores/)

The demonstration uses fictional **Northline Parts** and an explicitly configured policy. Its 60-calendar-day rule adds 60 days to the shipment date: July 23, 2026 → September 21, 2026. The production user must select the correct start event, time convention, requirements, and policy version for each supplier. A calculated date cannot establish that a supplier will accept a shipment dispatched on the last day.

## The narrow product wedge

Imported purchase and job records establish candidate deposits. An interactive bench check gathers observations and resolves ambiguity while the user handles the old part. Human confirmation commits the match and preparation details. A return packet and dispatch reference connect the physical workflow to later imported credit memos.

The strongest product moment is not a written summary. It is a specific branch in the conversation: two similar alternators need a job match; the original box is missing but an approved alternative exists; a claimed condition remains unknown until the user confirms it. Financial state remains separate throughout.

## Competition: do not hide the incumbent

| Alternative | Why a shop might choose it | What Benchback must prove |
|---|---|---|
| Fullbay core tracking | Integrated with existing parts and repair records; avoids another system | The bench conversation and policy clarification save enough effort to justify an extra layer |
| Supplier portal and account representative | Authoritative supplier relationship and credit information | A cross-supplier preparation record reduces follow-up without pretending to replace the supplier's decision |
| Spreadsheet plus physical core shelf | Cheap, familiar, flexible | Imports, deadlines, and credit matching genuinely reduce work instead of adding duplicate entry |
| Generic voice notes or dictation | Minimal workflow change | Follow-up questions catch missing identifiers or preparation details that a transcript alone misses |

We have not demonstrated that Fullbay lacks every proposed Benchback feature. Do not claim to be the first core tracker or the only voice solution. The likely first customers are shops underserved by their current process, not satisfied incumbent users.

## Is voice necessary?

Voice is useful when a user is at the bench, holding a component, checking a label, or looking for a missing piece. Follow-up questions can clarify a job number and packaging condition in the moment. Voice is less useful in a noisy bay, when a barcode already gives an exact match, or when the task is simply importing a credit memo. Keep manual input and exact-identifier selection available.

A pilot must compare the conversational check against a short structured form-not only against a deliberately bad spreadsheet. If the form is faster and equally complete, simplify the product and stop claiming voice creates the value.

## Pricing and cost hypothesis

**Proposed launch:** $99 per shop per month, including 200 voice minutes, with a clear usage cap and no automatic unlimited overage. Pricing is unvalidated. There are no claimed customers, pilots, sales, or measured savings.

AssemblyAI's published native Voice Agent API price is $4.50/hour, or $0.075/minute, as checked September 17, 2026. At that rate, the included minutes cost $15. A three-minute bench conversation costs approximately $0.225. [AssemblyAI pricing](https://www.assemblyai.com/products/voice-agent-api)

| Planning item | Amount |
|---|---:|
| Proposed subscription | $99/month |
| Voice cost at full 200-minute allowance | $15/month |
| Revenue remaining before all other costs | $84/month |
| Nonvoice-cost headroom at a 75% total gross-margin target | $9.75/month |

The $84 figure is not profit or gross margin. Hosting, storage, payment processing, support, onboarding, taxes, and failed/repeated sessions still matter. Manual onboarding can dominate a $99 subscription. Recheck the provider's actual billing rules and measure real session consumption.

Avoid success fees initially: attributing supplier credits to the product is difficult, and collecting a deposit the shop would already have recovered is not incremental revenue.

## Value calculation without inflated ROI

Track three distinct quantities:

1. **Open expected credit:** A documented deposit not yet credited. This is an exposure/work queue, not recovered money.
2. **Actual imported credit:** Amount supported by a supplier credit memo. It is not necessarily cash received into a bank account.
3. **Incremental benefit:** Additional credit or reduced labor attributable to Benchback compared with the existing process. This requires a baseline and cannot be assumed from the full amount of every returned deposit.

A $240 deposit is not automatically $240 of value created by Benchback. If the shop would have recovered it anyway, the benefit may only be preparation time saved. A $40 shortfall may be a valid supplier deduction; the product should surface it for review, not promise it is recoverable.

## Four-week pilot

**Proposal:** Recruit three independent diesel shops, each with enough active core-bearing jobs to produce at least ten observed return cycles. This is a recruitment target, not activity already completed.

**Week 1 - Baseline and scope.** Review recent core purchases, current return logs, supplier rules, and credit memos with the parts manager. Record staff time and the reasons returns remain unresolved. Select two suppliers and define the allowed data import. Do not ingest customer information unrelated to the task.

**Week 2 - Parallel evaluation.** Compare the existing process, a short form, and the voice check on comparable returns. Observe actual use at the bench. Count corrections, misidentification, abandonment, and duplicate entry.

Keep the same required information and supplier rules in the voice and form conditions. Include easy exact-match cases as well as exceptions; testing only ambiguous cases would favor the voice design. Alternate the order across participants where practical. A small supervised comparison provides directional evidence, not a randomized proof of savings.

**Week 3 - Follow-through.** Prepare real packets under shop supervision, record actual dispatch references, and import available credits. A returned part is not a completed financial outcome.

**Week 4 - Buyer review.** Show time measurements, unresolved deposits, credits, and errors. Ask for a concrete renewal at the proposed price. Supplier credit cycles may extend beyond four weeks, so report pending outcomes and continue read-only measurement with permission; do not fabricate full-cycle results.

### Primary measurements

- Time to a correct, approved return packet versus the short form and current process.
- Incorrect invoice/job matches, especially same-family parts.
- Preparation omissions and later supplier deductions, with their actual stated reasons.
- Rate of returns with a traceable dispatch reference and matched credit memo.
- Outstanding expected amounts and age, separated from actual credited amounts.
- Staff effort to import data and reconcile records.
- Weekly repeat use and an explicit paid renewal decision.

Calculate total handling effort as **data preparation and import + bench entry + corrections + reviewer checks + dispatch recording + credit reconciliation**. Amortize one-time setup separately and disclose the assumed return volume. Report voice interaction time as one component, not the whole workflow. Track whether users choose the form when free to choose. Compare the same amount of completed work; unresolved credits must remain pending outcomes in every condition.

### Proposed decision rules

Continue only if at least two shops want to pay after seeing their own results, the tool reduces total handling effort or documents incremental benefit exceeding its cost, and there are no silent false credit postings or wrong-part confirmations in the pilot. These are business decision targets, not statistical proof of reliability.

Pivot or stop if staff avoid voice, import work cancels the benefit, the incumbent already handles the workflow adequately, or the shop's monthly unresolved value is too small. A beautiful demo does not override those findings.

## Distribution and defensibility hypotheses

Start through independent-shop owner communities, diesel parts coordinators, and suppliers willing to improve return preparation. Those are prospective channels; no partnerships are claimed. A sample importer and a self-contained evaluation dataset make adoption easier than a full-system replacement.

There is no established moat. Possible advantages are accurate supplier-policy configuration, low-friction imports, reliable bench-to-invoice linking, and credit outcome feedback. Incumbents can add voice. Integration quality and demonstrable user preference must earn the business.

The narrow positioning is: **a conversational core-return completion tool for shops that still have a gap between the parts bench and the credit ledger**. It is not a replacement for Fullbay or a claim that existing core accounting is broken everywhere. If a shop's incumbent workflow already resolves this efficiently, it is outside the initial target segment.

## Distinction from the creator's other projects

Benchback is built around **parts-core deposit recovery in repair shops**. Its transaction ends in matching supplier credits to deposits. It is not a medical-device recall response app, food-recall reconciliation tool, or equipment rental off-hire workflow. Do not reuse those products' names, scenarios, claims, or materials. Any reused general infrastructure must be disclosed accurately under the event's actual rules.
