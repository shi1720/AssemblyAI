# Benchback final demo narration

Created by Shivam Gupta.

These clips use an AI-generated Cedar narrator. They do not impersonate Shivam. Display **AI-generated narration** on screen and disclose it in the video description. Label the dataset **Demonstration data**. Insert the separately recorded actual AssemblyAI conversation between sections 03 and 04, with accurate captions. Do not substitute generated narration for agent responses.

The supplied timing manifest uses actual WAV durations and Whisper word timestamps. Manual workflow footage can run under the narration with pauses added for important state changes.

## 01-problem: Money on the shelf

**Visual:** Benchback cover with creator credit and AI-generated narration disclosure.

The repair is finished. But the old alternator still represents money the shop already paid. Benchback, created by Shivam Gupta, helps recover that deposit.

## 02-dashboard: A specific recovery workflow

**Visual:** Public Firebase dashboard. Label all records Demonstration data.

This fictional diesel shop has a two-hundred-and-forty-dollar deposit tied to one alternator. Benchback follows it from the bench, through the return, to the supplier credit that actually arrives.

## 03-matching: Match the exact purchase

**Visual:** Selected WO-418, INV-8042, purchase line 1, ALT-24-160. Transition to actual AssemblyAI audio.

Similar parts can belong to different jobs. The conversation checks the work order, invoice, part, and purchase line before the operator confirms the match.

## 04-inspection: Resolve the missing box

**Visual:** Recorded observations and stored supplier packaging policy after the actual voice segment.

The original box is missing. This fictional supplier permits an approved alternative container. The agent checks that policy and records reported condition. The supplier still decides whether to accept the return.

## 05-approval: Human approval

**Visual:** Operator confirms match, approves packet, downloads PDF, then records dispatch and receipt.

A person reviews the evidence and approves the return packet. The agent cannot approve its own work. Dispatch and supplier receipt are recorded separately, so the follow-up clock starts at the right point.

## 06-partial-credit: An unresolved forty dollars

**Visual:** Actual manual credit entry or import CM-219 for $200. Show $40 outstanding.

The first supplier memo credits two hundred dollars. Forty dollars remain unresolved. Benchback keeps that gap visible, with the credit reference and history. Preparing or shipping a return never counts as money recovered.

## 07-final-credit: Close with actual credit

**Visual:** Actual follow-up credit CM-220 for $40. Show $240 received and $0 outstanding.

The follow-up memo adds forty dollars. Now the full two hundred and forty is credited, and the discrepancy reaches zero.

## 08-business: Commercial test and architecture

**Visual:** Architecture slide, then proposed pricing. Label price as a hypothesis.

AssemblyAI powers the live conversation and tool calls. Firebase provides login and storage. The proposed plan is ninety-nine dollars per location, including two hundred voice minutes. At the published rate, that is fifteen dollars in voice cost before hosting and support. A pilot must compare voice against a short form and prove less work or more actual credit.

## 09-closing: Try Benchback

**Visual:** Final credited record, public URL, GitHub, and Created by Shivam Gupta.

Benchback connects the part on the bench to the credit in the ledger. Try the public app, inspect the code, and follow the whole return yourself.

## Credits and implementation

Voiceover: OpenAI gpt-4o-mini-tts, Cedar. Caption alignment: Whisper word timestamps. Live application voice: AssemblyAI native Voice Agent API.

References: [Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech) and [word timestamps](https://developers.openai.com/api/reference/typescript/resources/audio/subresources/transcriptions/methods/create).
