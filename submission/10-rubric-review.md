# Benchback: final internal rubric review

Reviewed September 17, 2026 against release `b1985c3`, deployed as Cloud Run revision `benchback-00004-xqv` at [benchback-ai.web.app](https://benchback-ai.web.app). This is an independent development review of the evidence, not an organizer's score or a prediction of winning. No numerical score is assigned.

## Evidence considered

The final release has 92 passing automated tests and a successful [CI run](https://github.com/shi1720/AssemblyAI/actions/runs/35199621332). Public browser tests covered guest and email sign-in, saved inspection, human confirmation, preparation, the two-page PDF, dispatch, receipt, $200 plus $40 credit reconciliation, refresh persistence and narrow-screen layouts.

A real AssemblyAI run passed 11/11 assertions through authenticated hosted tools and Firestore. It saved two audit events and 21 transcripts with zero reported errors. Technician speech was synthetic. The browser's unresolved microphone permission produced the expected timeout and enabled retry; a complete physical-microphone conversation remains unverified. [QA record](../docs/qa-report.md) · [Sanitized provider evidence](../docs/live-voice-acceptance.json).

| Criterion                 | Current evidence                                                                                                                                                                                                                                                                                                                     | Remaining gap or next decision                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application of Technology | AssemblyAI performs real speech and agent interaction. Tools resolve ambiguous purchases, consult supplier rules and save quoted inspection evidence through the hosted authenticated API. Transactions preserve ownership, revisions and credit integrity. Human approval and zero invented credit survived the real-provider test. | Finish a physical-microphone run and realistic workshop-noise testing. Bounded quote/negation checks do not prove general semantic correctness or actual part condition. Broaden hosted adversarial and operational checks before customers. |
| Presentation              | A concrete $240 deposit story, a visible $200 credit with $40 unresolved, a public app, a usable guest path, PDF output and a slide packet support a clear demonstration. Responsive widths of 320px and 390px were inspected.                                                                                                       | Video production and public platform publication are still in progress. Show actual behavior with readable captions, label synthetic speech and fictional records, and verify the final viewing links.                                       |
| Business Value            | The buyer and workflow are specific: independent diesel shops handling refundable deposits on dry alternators and starters. Expected deposits, actual recorded credits, deductions and unresolved money remain separate. The app follows the process beyond a reminder or transcript.                                                | No paid pilot, incremental recovery, measured staff time saved or willingness to pay is established. Include import effort, support and billable cloud costs in a controlled comparison with a short form and the existing process.          |
| Originality               | The differentiation combines hands-busy inspection, exact purchase clarification, missing-box exceptions and credit follow-through. The deployed provider test demonstrates these workflow elements rather than only a chat interface.                                                                                               | Established shop software already tracks cores. The defensible advantage must come from proven lower effort and reliable integration, not the presence of voice or an unsupported moat claim.                                                |

These are the four dimensions supplied in the event brief. No numerical weights, organizer endorsement or external judge score are implied. Event-specific submission requirements remain documented in [the event notes](09-lablab-event-notes.md).

## Improvements made in response to review

- Moved to a clean public Firebase URL with real guest/email authentication and durable Firestore transactions.
- Added transcript-grounded inspection fields after a real agent inferred facts from a generic confirmation. Explicit quotes from the same owner, session and core are now required for changed inspection facts. Obvious contradictions and generic yes answers are rejected, while valid natural completeness phrasing is accepted.
- Required the agent to ask about each configured alternative-packaging condition rather than infer a pallet from the word “approved.” Human physical review remains essential.
- Preserved exact purchase identifiers, partial-credit balances, supplier memo uniqueness and human-only approvals.
- Fixed saved-record ordering so the urgent WO-418 case is selected consistently after reload.
- Added a bounded microphone-permission timeout, cleanup and a working retry path.

## Final publication priorities

1. Publish a video that clearly distinguishes the scripted public example, synthetic technician speech and real provider/tool responses. A short caption is preferable to overstating physical-microphone verification.
2. Keep a continuous sequence from an old part to an identified deposit, clarified conditions, human approval, return evidence and reconciled credit. Lead with the problem, not architecture.
3. Test the public video and submission links while signed out. A prepared packet or filled draft is not a submitted entry.
4. Keep evidence tied to the release and preserve the sanitized report. Do not publish account IDs, cookies, session tokens or raw credential-bearing logs.

## Limits that remain explicit

No paying customers, measured savings, independently verified part condition, guaranteed supplier acceptance, automatic supplier submission, carrier booking, ERP integration or customer SLA has been established. Backup restoration and production support procedures remain launch gates. The billable named Firestore database and other infrastructure costs must be included in commercial planning.

The project now has credible evidence of real provider integration, public usability and financial-state safeguards. Whether it becomes a viable business still requires customer and operational validation. Video publication and the platform's actual submission confirmation remain unfinished delivery steps at this review time.
