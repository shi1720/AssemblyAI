# Benchback

**Tagline:** The job is done. Get the deposit back.

**Short description:** Benchback helps diesel repair shops turn used parts into documented core returns, then match the supplier credit that actually arrives. Voice captures the inspection. Clear rules keep the money honest.

**Created by:** Shivam Gupta

## Inspiration

A repair can be finished while some of the shop's money is still sitting on the bench.

When a shop buys a remanufactured alternator or starter, the supplier may charge a refundable deposit on the old component, known as the core. Recovering that deposit takes several small jobs: identify the right purchase, check the return rules, inspect the part, prepare the paperwork, send it back, and reconcile the credit.

That last step matters. Returning a part worth a $240 deposit does not mean the shop received $240. The credit may be late, partial, or reduced for a valid reason.

I built Benchback around this gap between physical work and financial follow-through. A technician should be able to talk while handling the part. The owner should be able to see what remains unresolved, with evidence behind every status.

## What it does

Benchback is a voice-assisted core-return desk for independent diesel repair shops, starting with dry alternators and starters.

The workflow connects six things that otherwise need to be checked separately:

1. The part on the bench and its exact invoice, purchase line, and work order.
2. The supplier policy that applies to that purchase.
3. The user's observations about completeness, condition, and packaging.
4. A human-reviewed return packet.
5. Dispatch and supplier receipt records.
6. The supplier credit that actually arrives.

The demonstration follows a fictional $240 alternator deposit. Two similar parts belong to different jobs, so a part-family match is insufficient. The original box is missing, but this fictional supplier's configured policy permits an approved alternative container. Benchback records the observations and requires a person to confirm the purchase match and prepare the return.

When the first credit memo records $200, the remaining $40 stays visible. A later $40 credit resolves the balance. If the owner instead accepts a valid $40 deduction, the system records $200 credited and $40 accepted as a deduction. It never reports the deduction as recovered money.

People can use the inspection form when speaking is inconvenient. Saved workspaces, CSV imports, PDF packets, history, and data export support the full workflow. The public example is explicitly labeled as scripted; live voice is a separate interaction.

## How we built it

I designed and built Benchback with React and TypeScript, using AssemblyAI's native Voice Agent API for the conversation and structured tool calls. Firebase Authentication provides email and guest access. Next.js runs on Cloud Run behind Firebase Hosting, with private records and atomic credit allocations in Firestore.

The AI can look up candidate purchases, read the configured supplier policy, and record inspection observations. Application rules determine readiness, deadlines, and outstanding amounts. Human actions control purchase confirmation, return preparation, and financial records.

That separation is central to the design. A confident sentence from the agent cannot become a supplier credit. Credits require structured records, and the application checks for duplicate allocations, invalid dates, and amounts that would overstate recovery.

Each purchase retains a snapshot of its supplier policy. That prevents a later policy edit from silently changing an existing return. Dispatch and receipt are separate events because suppliers may use different deadline rules. Revisions and audit events make corrections visible, while owner-scoped data keeps one workspace separate from another.

The tests cover domain rules, authenticated API workflows, credit reconciliation, audio processing, and voice-client behavior. They exercise failure cases as well as the successful demonstration path.

## Challenges we ran into

The hardest problem was making the workflow trustworthy when the input was incomplete.

A technician may know the job number but not the invoice. Two purchases may contain the same part. A missing box may matter for one supplier and be acceptable for another. We had to make clarification a useful part of the product and keep preparation blocked until the necessary facts were confirmed.

Audio introduced another set of problems: microphone permissions, different device sample rates, interruptions, late tool responses, and cleanup after a dropped connection. The voice client needs to stop stale audio and avoid applying an outdated response to the next turn.

The financial edge cases were just as important. Partial credits, corrected memos, accepted deductions, and date corrections all change the outcome. We modeled these explicitly instead of treating every returned part as recovered money.

## Accomplishments that we're proud of

The most satisfying result is a complete, understandable chain from an inspection to a reconciled credit.

The interface keeps the next action clear without hiding unresolved work. The return packet carries the purchase identifiers and the reported observations. A short credit remains open. A documented deduction can close the case without inflating the recovered amount.

We also kept the demonstration honest. Pine Ridge Diesel and Northline Parts are fictional. The example values illustrate how the product works. They are not customer results, and the application does not guarantee supplier acceptance or independently certify a part's condition.

## What we learned

Voice is valuable at the point where a person has context but busy hands. It is less valuable when it merely reads a dashboard aloud.

We also learned that practical AI needs clear limits. The agent can help collect information, but important workflow and financial decisions need explicit rules and reviewable evidence.

Finally, an attractive estimate of money recoverable is not the same as value delivered. A useful product has to reduce total staff effort or improve actual credit outcomes, including the effort of importing and maintaining its data.

## What's next for Benchback

The next step is a measured pilot with independent diesel shops whose current process leaves core returns or credits unresolved. The pilot will compare Benchback with both the shop's existing process and a short inspection form. It will measure handling time, missing information, unresolved deposits, and actual supplier credits.

The proposed price is $99 per location per month, including 200 voice minutes. This is a pricing hypothesis, not a validated offer or a claim of revenue. Onboarding and support effort are part of the commercial test.

Core tracking already exists in shop-management software. Benchback must earn its place by making bench capture and credit follow-up easier without creating duplicate work. Customer evidence will decide whether the next investment should be supplier-policy tooling, accounting imports, or a direct shop-management integration.

Benchback starts with a narrow promise: help a shop follow through on money it has already paid.
