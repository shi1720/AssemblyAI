# Benchback: independent submission review

Review date: September 17, 2026. This is an internal assessment, not an organizer's score or a prediction of winning. Deployment migration and live voice testing were in progress during this review.

| Criterion | Evidence that supports the entry | Most useful improvement before publishing |
|---|---|---|
| Application of Technology | Typed state transitions, policy snapshots, owner scoping, guarded credit allocation, audio cleanup, and tests | Record an actual AssemblyAI audio and tool round trip on the final public deployment. Test interruption and denied microphone access. Re-run authentication and isolation tests after the hosting migration. |
| Presentation | A memorable $240 story and a nine-slide deck | Keep one continuous cause-and-effect sequence: identify, clarify, approve, dispatch, receive, reconcile. Show a partial credit before closing the case. Make captions readable on a phone. |
| Business Value | Clear buyer, real core-return workflow, separation of expected and recorded credit | Present the $200 plus $40 example as a workflow test. Treat proposed pricing as a hypothesis. Measure import effort and compare with a short form before claiming savings. |
| Originality | A concrete industrial workflow with interactive inspection and credit follow-through | Show the agent resolve a purchase ambiguity and a missing-box exception. A generic voice chat over a ledger is not enough. Acknowledge incumbent core-tracking software and demonstrate the specific improvement. |

These are the four criteria in the event brief. The organizer's [judging guidance](https://lablab.ai/guide/how-to-win-an-ai-hackathon) uses the same four dimensions. No numerical weights are assumed.

## Highest-priority verification

1. Public access: the final `web.app` URL must open without the creator's account or a private hosting session.
2. Identity: a new user must be able to create or access their own workspace. Untrusted identity headers must never grant another user's access after migration.
3. Voice: demonstrate a genuine provider conversation whose structured observations persist. A token-generation response alone is insufficient evidence.
4. Money: show that a spoken request cannot post credit, that duplicate memo allocation fails, and that accepting a deduction does not increase credited money.
5. Recovery from failure: show a useful response to microphone denial, provider unavailability, and a dropped connection. Manual work must remain possible.
6. Evidence consistency: final video, story, architecture diagram, README, privacy text, and deployment URL must describe the same shipped build.

## Stronger pitch choices

Lead with the unpaid deposit attached to a familiar used part. Explain “core” the first time. Avoid an opening architecture tour, a long market-size claim, or a list of generic AI features.

The strongest visual is the short credit: $240 expected, $200 recorded, $40 unresolved. It immediately explains why this is more than a reminder application. Follow with the agent's clarification and the human approval boundary to explain the role of AI.

The commercial claim should be narrow: test with shops whose existing process leaves returns or credits unresolved. Acknowledge that established shop software already tracks cores. Benchback must demonstrate less total work, not assume that adding voice creates a business.

## Release limitations that must remain explicit

No paying customers, measured savings, independently verified part condition, supplier acceptance guarantee, automatic supplier submission, direct carrier booking, or ERP integration has been established by this review. A successful demo does not remove those limits.

The submission target is the AssemblyAI Voice Agent Hackathon on lablab.ai. Final event requirements and form constraints are tracked in `09-lablab-event-notes.md`.
