# YouTube metadata and application testing instructions

Published September 17, 2026: [Watch on YouTube](https://www.youtube.com/watch?v=cE8brWgJIUY). Public visibility, uploaded English captions, cover, chapters and AI-use disclosure verified.

## Video title

Benchback: From a Used Alternator to a Reconciled $240 Deposit

## Video description

The repair is finished. The customer has left. The old alternator still represents a refundable deposit.

Benchback helps independent diesel repair shops connect the part on the bench to the correct purchase, check the configured supplier rules, prepare a return, and track the credit that actually arrives.

This demonstration follows a fictional $240 alternator deposit. The first supplier credit is $200, so Benchback keeps $40 unresolved. A second credit completes the recovery. A returned part and a fully credited deposit are different states, and the application preserves that distinction.

AssemblyAI powers the voice interaction. The agent can help collect inspection details; deterministic application rules and human confirmation control the workflow and credit ledger.

Created by Shivam Gupta.

Try the public app: https://benchback-ai.web.app

Source code and setup: https://github.com/shi1720/AssemblyAI
Presentation and project materials: https://github.com/shi1720/AssemblyAI/tree/main/submission

Pine Ridge Diesel and Northline Parts are fictional demonstration businesses. The example is not a customer outcome. Supplier acceptance is not guaranteed. Proposed pricing and commercial benefits still require customer validation.

Narration uses an AI-generated voice. Application visuals are captured from the public Firebase app using fictional records. The separately labelled AssemblyAI conversation uses real provider responses to synthetic technician speech. Pauses are trimmed.

#Benchback #AssemblyAI #VoiceAI #Hackathon #SmallBusiness

Hackathon submission: https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/benchback/benchback-from-parts-shelf-to-paid-back

Chapters
00:00 Money on the shelf
00:10 A specific recovery workflow
00:22 Match the exact purchase
00:33 Recorded AssemblyAI inspection
01:09 Resolve the missing box
01:22 Human approval
01:35 Guardrail test: a fabricated credit
01:44 AssemblyAI agent refuses
01:55 An unresolved forty dollars
02:09 Close with actual credit
02:19 Commercial test and architecture
02:42 Try Benchback

## Publisher checklist

These notes are not part of the public video description.

- Add the verified Firebase application URL after deployment. Do not publish a placeholder or an owner-private address as the public demo.
- Replace the conditional narration sentence with the actual production disclosure, or omit it if Shivam records the narration.
- Aim for a concise three-to-four-minute video. Check the final lablab upload form for any enforced duration or size limit.
- The final video must show a real application workflow. A scripted example must remain visibly labeled. Do not present simulated or dubbed agent replies as a successful live provider session.
- Add captions that match the final audio and verify currency amounts, purchase identifiers, and technical names.
- Public visibility is requested by the project owner. Verify the watch page opens while signed out after publishing.
- Do not claim submission to the AssemblyAI Voice Agent Hackathon until the platform confirms the entry. See the event notes.

## Application testing instructions

### Quick example without a microphone

1. Open the submitted application URL in a current desktop or mobile browser.
2. Choose **Try the $240 example**. This is a labeled, scripted walkthrough with fictional records.
3. Follow the alternator associated with **WO-418**, invoice **INV-8042**, purchase line **1**, part **ALT-24-160**.
4. Observe the missing-box exception and the supplier's configured alternative-packaging requirement.
5. Follow the return and partial-credit stages. The important result is **$240 deposit, $200 credited, $40 unresolved**. A later $40 credit resolves the remaining amount.

### Saved workspace and live voice

1. Sign in through the application's supported sign-in flow. Use **Load practice purchases** in an empty workspace to create fictional records. No real supplier or customer data is needed.
2. Select WO-418 and choose **Start bench conversation**. Read the audio-processing notice, consent, and allow the browser to use your microphone. Use headphones in a quiet room for the first test.
3. Say: “I have the old alternator from work order four eighteen. The original box is missing.” Let the agent ask for the information it needs.
4. Supply the identifiers shown on the selected record: invoice INV-8042, line 1, and part ALT-24-160. Say that all components are present, no damage is observed, and a sturdy protective container is secured on a pallet with the invoice label attached. These are fictional test observations.
5. End the conversation. Check that the inspection details are visible. Confirm the purchase match yourself, review the checklist, and select **Prepare return**.
6. Open **Return packet** and download the PDF. Verify the purchase identifiers and reported observations.
7. Select **Record dispatch** with today's date and reference DEMO-DISPATCH-418. Record supplier receipt with a valid date on or after dispatch and reference DEMO-RECEIPT-418.
8. In the credit workflow, record a $200 credit for memo CM-219, line 1. Use a date on or after dispatch. Confirm that $40 remains unresolved.
9. Record a second $40 credit for memo CM-220, line 1. Confirm that the record shows $240 credited and $0 unresolved.
10. Refresh the page and confirm the saved state remains. Review the record history and export your workspace from Settings if desired.

If you prefer imports, the repository includes the two demonstration credit CSV files under `submission/demo`. Set their dates to the current test date, ensuring the dates are not before dispatch. The CSV headers identify the invoice, purchase line, work order, part, and credit-memo line.

### Useful negative tests

- Try preparing an uninspected return. It should remain blocked until its required facts and human confirmation are present.
- Give a mismatched invoice or purchase line. A similar part alone must not establish the match.
- Ask the voice agent to credit the full deposit. It must not create a financial credit from the spoken request.
- Attempt to allocate the same supplier credit-memo line twice. The duplicate must be rejected.
- Check the mobile layout and use the inspection form without a microphone. The core workflow remains available through manual input.

Microphone permission and an available voice service are required only for live voice. The scripted example is not a substitute for a live voice acceptance test. The application does not contact suppliers, book shipping, or move money.
