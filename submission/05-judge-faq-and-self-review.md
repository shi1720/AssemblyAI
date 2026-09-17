# Benchback · judge questions and candid self-review

Shivam Gupta - creator & builder

The quoted answers below can be spoken verbatim. They describe the intended product and its current evidence boundaries. Update implementation-status answers only when new verification exists.

## Why voice instead of a short form?

“A form may be better for a straightforward return. Voice is useful when someone is handling a used part, reading a label, or explaining an exception: two similar purchases, a missing box, or an uncertain condition. The agent can ask the next question immediately. We still provide manual input, and our pilot must compare voice against a good short form-not just a bad spreadsheet.”

## Why would a shop buy this if it already has Fullbay?

“It may not need to. Fullbay already tracks cores. We're targeting shops whose current process still leaves a gap at the bench or during credit follow-up. Benchback's proposed value is capturing missing details through conversation and following the return through to the recorded credit. If that creates duplicate entry without saving work, the pilot should reject it.”

Fullbay describes its core-tracking workflow publicly. Do not claim it lacks every Benchback feature or that we performed a complete competitive feature audit. [Fullbay core guide](https://www.fullbay.com/blog/part-cores/)

## What is your moat?

“We don't have an established moat. Incumbents can add voice. The potential advantage is reliable supplier-policy configuration, easy imports, and a workflow technicians choose to use. Those are things we need to earn through customer adoption and measured outcomes, not advantages we can declare from a hackathon build.”

## Do all suppliers allow sixty days and alternative packaging?

“No. Each supplier has its own terms. Our demonstration uses fictional Northline Parts and an explicitly configured policy. We distinguish a dispatch deadline from a receipt deadline, and the supplier still decides acceptance and the credit amount. A missing original box only has an alternative when the configured policy permits one.”

The real supplier source is supporting context, not an endorsement or a universal policy. See the dated source summary in the [business brief](03-business-and-pilot.md).

## How do you know the part is complete or actually shipped?

“We record what the user reports and require human confirmation. The application is not independently inspecting the part. Dispatch needs a recorded reference, and receipt is a separate event. Those records make the workflow reviewable; they do not establish that the supplier accepted the core.”

## Does the AI decide how much money the shop recovered?

“No. The agent can record observations, but it cannot post credits. Credited amounts come from recorded supplier credit memos and deterministic arithmetic. A two-hundred-dollar credit against a two-hundred-and-forty-dollar deposit leaves forty dollars unresolved. Expected credit, actual recorded credit, and any accepted deduction must stay separate.”

## Is a forty-dollar shortfall always a recoverable mistake?

“No. It may be a valid deduction. Benchback makes the difference visible for a person to investigate. An accepted deduction should resolve the case without being counted as recovered credit. We would never claim the full deposit was recovered just because the shop agreed to close the file.”

## What does it cost to run?

“The proposed plan is ninety-nine dollars per shop per month with two hundred voice minutes. At AssemblyAI's published four-dollar-fifty hourly rate, those minutes cost fifteen dollars. That leaves eighty-four dollars before hosting, storage, payments, support, and other costs. Pricing is unvalidated, and onboarding must be efficient for that plan to work.”

Provider pricing was checked September 17, 2026. Recheck before presenting. The $84 is not profit or gross margin. [AssemblyAI pricing](https://www.assemblyai.com/products/voice-agent-api)

## What evidence do you have that customers will pay?

“We have evidence that core returns and credit tracking are real workflows, but we have not established demand for Benchback. We haven't claimed interviews, customers, or revenue. Our proposed pilot measures total handling effort and actual credit outcomes, then asks the shop owner for a paid renewal at the stated price.”

## What would make you stop or change the idea?

“If a short form is faster and equally complete, if data imports cancel the benefit, or if the incumbent already solves the problem, we should change the product. We also need enough core-bearing work at each shop to justify a recurring fee. A successful demo is not evidence of product-market fit.”

## Is live voice verified?

**Current answer at this independent review:**

“The AssemblyAI integration is implemented, and the independent review covered the code and business rules. A successful deployed live-voice session has not yet been independently observed. We will report that test separately rather than treating a scripted walkthrough as proof.”

**Use only after a real recorded deployed session passes:**

“We have tested a real AssemblyAI session in the deployed application and retained its recording and test result. The demonstrated observations were persisted through the actual tool workflow. That verifies this tested path; it is not a claim that every accent, device, or noisy environment has been validated.”

## Provisional self-review: 31/40

This is an internal, subjective assessment of the concept and reviewed implementation. It is not an independent hackathon judge's score, an award prediction, or a completed end-to-end test. Presentation and technology scores are conditional on the live demonstration succeeding. Live voice had **not yet been independently tested** when this assessment was written.

| Criterion | Provisional score | Strength | What still limits confidence |
|---|---:|---|---|
| Application of technology | 8.5/10 | Useful follow-ups, deterministic money rules, constrained agent actions, and confirmation | Real deployed voice/audio/tool round trip and adverse conditions still need observed tests |
| Presentation | 8/10 | Understandable $240 deposit → $200 credit → $40 follow-up story | Final screen recording, captions, timing, and UI path need review |
| Business value | 7/10 | Specific buyer, recurring task, explicit costs, measurable outcomes | No validated willingness to pay; incumbent competition and import effort could erase value |
| Originality | 7.5/10 | Uncommon niche with practical exception handling and credit follow-through | Core tracking exists, voice is reproducible, and no established moat exists |
| **Total** | **31/40** | **Promising enough to test seriously** | **Not evidence of production readiness or commercial validation** |

## How to improve the score without inflating claims

1. Show one actual live conversation that resolves both purchase ambiguity and the missing-box exception, with persisted tool results visible.
2. Demonstrate the partial-credit path and one adversarial refusal to fabricate a credit.
3. Verify purchase-line discrimination, audited event-date correction, and accepted-deduction handling after the owner's fixes; do not assume they passed because they were implemented.
4. Keep setup and data imports visible in the pilot measurement. A form comparator is essential to establishing voice value.
5. Explain the narrow target segment in one sentence and acknowledge the incumbent directly. Replace claims of inevitable growth with a concrete renewal test.
