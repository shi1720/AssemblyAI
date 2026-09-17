# Benchback

**The job is done. Get the deposit back.**
Shivam Gupta - creator & builder
AssemblyAI Voice Agent Hackathon · September 2026

## Project title

Benchback - From old part to supplier credit

## Short description

Benchback helps independent diesel repair shops recover parts-core deposits. Speak through a bench inspection, confirm the right invoice and supplier rules, prepare a return packet, and track the supplier's actual credit-including shortfalls.

## One-sentence pitch

The old alternator on a repair bench can represent a refundable deposit; Benchback helps the shop get it returned, documented, and matched to the credit it actually receives.

## Long description

The repair is finished. The customer has left. An old alternator is still sitting on the bench-and the shop's core deposit is still tied up with the supplier.

Getting that deposit back takes more than remembering to return a part. Someone must connect the old component to the right purchase and job, check the supplier's return requirements, prepare the paperwork, send it before the applicable deadline, and check the credit that eventually arrives. Two similar alternators, a missing box, or a partial credit can turn a small administrative task into money left unresolved.

Benchback is a voice-led core-return workbench for independent diesel repair shops.

A technician speaks naturally while inspecting the removed part. AssemblyAI's native Voice Agent API powers the conversation. Benchback uses imported invoice and job records to identify candidate deposits and asks for clarification when the match is ambiguous. It checks observations against the configured supplier policy, captures the user's confirmations, and prepares a return packet. The shop records dispatch with a reference and later imports supplier credits. Deterministic rules calculate deadlines and outstanding amounts; a fluent conversation cannot invent a credit.

Our fictional Pine Ridge Diesel demonstration follows a $240 alternator deposit on invoice INV-8042, work order WO-418. A second similar part belongs to a different job, so matching by part family alone is insufficient. The original box is gone, but Northline Parts' configured demonstration policy permits an approved alternative container. The user confirms the match and observed condition, then generates the packet and records dispatch.

The workflow continues after the part leaves the bench. Credit memo CM-219 records only $200. Benchback shows $200 credited and a $40 shortfall-not $240 recovered. A later $40 credit memo, CM-220, resolves the remaining amount. Alternatively, the owner can accept a documented final deduction: $200 credited, $40 accepted deduction, $0 unresolved. A deduction is never reported as recovered credit.

Voice fits the point where the information lives: a person handling a used part and reading its label. The agent can ask the next useful question immediately, while the application retains explicit control over money and state changes. Manual input remains available when speaking is inconvenient.

The initial commercial hypothesis is $99 per shop per month, with 200 voice minutes included. The first pilot would measure staff time, unresolved deposits, return preparation, and actual supplier credits against the shop's existing process. Pricing and benefits remain unvalidated; no customers, revenue, or measured savings are claimed.

Core tracking already exists in shop-management systems, including Fullbay. Benchback is a focused addition for shops whose present process leaves bench checks or credit follow-up unresolved. Its proposed contribution is interactive clarification at the bench and the connection from observed condition to a reviewable return and actual credit. A pilot must show that this saves effort even after imports and review, compared with both a short form and the shop's current process. We do not claim a proven moat or a reason for satisfied incumbent users to switch. Benchback does not guarantee supplier acceptance, certify a part's condition, contact a supplier automatically, or move money.

Created and built by Shivam Gupta for the AssemblyAI Voice Agent Hackathon.

## Technology tags

AssemblyAI · Voice Agent API · Real-time voice AI · Tool calling · WebSockets · Structured imports · Workflow automation · Authentication

React 19 · TypeScript · Next.js · Firebase Hosting · Firebase Authentication · Firestore · Cloud Run · jsPDF. Direct supplier/ERP/carrier integrations are not implemented.

## Category tags

B2B SaaS · Automotive aftermarket · Diesel repair · Small business · Operations · Voice agents

## What AssemblyAI enables

AssemblyAI handles the real-time spoken interaction. The application supplies candidate records and configured policy context; the agent asks clarifying questions and proposes structured observations. Server-side rules and human confirmation govern the resulting workflow. Financial status is driven by imported supplier-credit records, not by the model saying a refund was approved. [AssemblyAI Voice Agent API documentation](https://www.assemblyai.com/docs/voice-agents/voice-agent-api)

## Cover image copy

**Headline:** The job is done. Get the deposit back.
**Supporting line:** Speak. Return. Match the credit.
**Visual:** A used alternator alongside a simple ledger: $240 deposit → $200 credited → $40 still open.
**Footer:** Benchback · Built by Shivam Gupta · Powered by AssemblyAI

## Submission fields to finalize

| Field | Final action |
|---|---|
| Creator | Shivam Gupta |
| Repository | https://github.com/shi1720/AssemblyAI (public, MIT) |
| Live application | https://benchback-ai.web.app |
| Judge access | Open the public example or create a private guest workspace. Live voice is configured, with daily session limits. |
| Video | Insert the final recorded presentation URL |
| Slides | benchback-pitch.pptx or benchback-pitch.pdf |
| Cover | benchback-cover.png |
| License | MIT LICENSE and applicable upstream licenses included |

## Final claim check

Present-tense features above must pass on the deployed build before submission. Verify real AssemblyAI voice, imports, candidate matching, configured policy checks, required human confirmation, packet generation, dispatch recording, credit import, and shortfall calculation. Qualify anything incomplete. The fictional supplier is not FleetPride; its demonstration policy is not a claim about every supplier.

**Internal verification status when this packet was revised:** the independent reviewer inspected the code, but had not observed a successful deployed live-voice session. The narrative above is submission-ready only after the launch-validation checklist is executed. Do not translate “implemented integration” into “verified live operation.”
