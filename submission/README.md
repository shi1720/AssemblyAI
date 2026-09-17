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

The local migration suite passed **92 tests**, including real Firestore emulator transactions and authentication boundary checks. [QA evidence](../docs/qa-report.md) records public guest/email sign-in, saved inspection and returns, PDF download, $200 plus $40 credit reconciliation, refresh persistence, distinct owner workspaces and narrow-screen checks. A complete physical-microphone conversation remains unverified. An older real-provider run used synthetic technician audio; the final prompt needs another acceptance run. Configured secrets or mocked transport tests are not proof of a finished deployed conversation.

The 31/40 assessment in the earlier review is an internal, provisional concept/code score, not external judging. It has not been upgraded into a verified winning claim. The commercial pilot measures total effort and compares voice with a good short form.

## Publication status

Video publication and event submission need confirmed delivery URLs and an actual success state on their respective platforms. This folder is a preparation packet, not proof that a submission was filed. Refresh the presentation and captions against the final app, check event-specific eligibility and fields, and publish only truthful present-tense claims. [Checklist](06-launch-validation-checklist.md).
