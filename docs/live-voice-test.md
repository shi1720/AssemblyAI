# Real voice acceptance harness

`scripts/test-live-voice.mjs` is an opt-in, billable integration test. It sends generated technician speech to the real AssemblyAI Voice Agent API and retains the actual response audio, transcripts, tool calls, and assertions. It does not simulate the provider's responses.

The technician audio is generated with OpenAI `gpt-4o-mini-tts`, using a standard synthetic voice. It is not a recording or imitation of Shivam Gupta. All tested purchases and suppliers are fictional.

## Run

Configure `ASSEMBLYAI_API_KEY` and `OPENAI_API_KEY` in the ignored `.env.local` file. For the hosted test, configure `BENCHBACK_BASE_URL`, `BENCHBACK_QA_EMAIL`, and `BENCHBACK_QA_PASSWORD` in ignored `.env.qa`. The QA account must already exist and its practice core must not be approved or dispatched.

Run:

```sh
npx tsx scripts/test-live-voice.mjs
```

With a base URL, the script signs into Firebase, establishes the application's HTTP-only session, loads or seeds the QA workspace, and obtains the voice token through the hosted application. Every voice tool and transcript write uses that authenticated application's API. It then independently reloads the workspace and history to verify persistence.

For a clean repeat, `VOICE_TEST_RESET=1` may reset this fictional QA workspace before seeding. This requires a matching `BENCHBACK_QA_UID` and rejects a workspace containing any non-practice purchase. It does not reset paid-voice quotas. Preserve the previous output directory before running again.

Without a base URL, it uses the same application agent configuration with fictional records held in memory. That mode verifies the provider contract and domain transitions, but does not verify hosted authentication or persistence.

The script reuses the generated technician audio under `outputs/live-voice`. Hosted results are written under `outputs/live-voice-hosted`. Both directories are ignored by Git. Secrets, cookies, provider tokens, and session resume tokens are excluded from reports.

## Assertions

- AssemblyAI establishes a session and returns actual response audio.
- A lookup returns both matching alternator purchases, requiring clarification.
- The agent consults the supplier policy and records the exact selected purchase.
- The inspection captures completeness, approved alternative packaging, and the attached label.
- Purchase confirmation and return preparation remain human actions.
- A direct request to invent a $240 credit does not change credited money.
- Hosted mode reloads the saved inspection, audit events, and transcript through the application's API.

The report includes each assertion separately. A nonzero exit code means at least one failed. Preserve failed attempts when investigating regressions instead of replacing the evidence with a later successful run.

## Evidence limits

This tests synthetic speech in a programmatic WebSocket client. It does not certify browser microphone capture, loud repair-shop conditions, accents, mobile audio permissions, or every conversation path. Those require separate browser and user tests. The saved audio may be used in a presentation when identified accurately as a recorded test; it must not be presented as an unscripted customer interaction.

Protocol references: [AssemblyAI events](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/events-reference), [AssemblyAI client-side tools](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/tools/client-side-tools), and [OpenAI text to speech](https://developers.openai.com/api/docs/guides/text-to-speech).
