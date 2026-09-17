# Benchback submission packet

**Shivam Gupta, creator and builder**

- [Project copy](01-submission-copy.md)
- [Verbatim video script and shot plan](02-verbatim-video-script.md)
- [Business case, competitors, sources and pilot](03-business-and-pilot.md)
- [Demo fixtures and claim gates](04-demo-fixtures-and-claim-gates.md)
- [Judge FAQs and provisional review](05-judge-faq-and-self-review.md)
- [Launch-validation checklist](06-launch-validation-checklist.md)

Benchback focuses on parts-core deposit recovery for independent diesel repair shops. Pine Ridge Diesel and Northline Parts are fictional demonstration entities. Pricing and commercial benefits are hypotheses; no customer research, recovered payments or traction are fabricated.

## Delivery links

- [Public Firebase application](https://benchback-ai.web.app)
- [Guest or account sign-in](https://benchback-ai.web.app/signin)
- [Public MIT repository](https://github.com/shi1720/AssemblyAI)
- [PowerPoint slides](benchback-pitch.pptx) and [PDF slides](benchback-pitch.pdf)
- [Cover](benchback-cover.png)
- [Fictional sample return packet](sample-return-packet.pdf)
- [Partial-credit fixture](demo/01-partial-credit.csv) and [follow-up fixture](demo/02-followup-credit.csv)

For a saved review workspace, choose **Try a private guest workspace**, then **Load practice purchases**. Guest access does not require an email. Use an email/password account to retain access across devices. The public $240 walkthrough is scripted; live voice is separate and clearly labelled.

## Technology and evidence

The current deployment uses Firebase Hosting, Firebase Authentication, Next.js on Cloud Run and server-only Firestore transactions. AssemblyAI supplies the live voice stack; its server key is configured through Secret Manager. OpenAI is not a runtime product dependency. Offline presentation narration or synthetic test speech may use it.

The local migration suite passed **92 tests**, including real Firestore emulator transactions and authentication boundary checks. [QA evidence](../docs/qa-report.md) records public guest/email sign-in, saved inspection and returns, PDF download, $200 plus $40 credit reconciliation, refresh persistence, distinct owner workspaces and narrow-screen checks. The final hosted AssemblyAI run passed **11/11 checks** with synthetic technician audio, two persisted audit events and 21 transcripts. [Sanitized evidence](../docs/live-voice-acceptance.json). A complete physical-microphone conversation remains unverified; Chrome permission timeout and retry behavior passed. Release `b1985c3` is deployed and [its CI succeeded](https://github.com/shi1720/AssemblyAI/actions/runs/35199621332).

The 31/40 assessment in the earlier review is an internal, provisional concept/code score, not external judging. It has not been upgraded into a verified winning claim. The commercial pilot measures total effort and compares voice with a good short form.

## Publication status

**Submitted successfully on September 17, 2026.** [View the accepted AssemblyAI hackathon entry](https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/benchback/benchback-from-parts-shelf-to-paid-back). The public submission includes the final video, cover, pitch PDF, repository and Firebase app links.

- [Final 2:52 narrated and captioned video](benchback-demo.mp4)
- [Separate captions](benchback-demo.srt)
- [Full project story](07-project-story.md)
- [Video title, description and testing instructions](08-youtube-metadata.md)
- [Delivery verification](12-delivery-record.md)

The video uses actual hosted-app captures, AI narration, and clearly labelled excerpts from a real AssemblyAI test with synthetic technician speech. It is edited footage, not an unscripted customer session. Public YouTube publication awaits the upload dialog's required confirmation.
