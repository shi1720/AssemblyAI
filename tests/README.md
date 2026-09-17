# Verification

Run `npm test`. The test runner requires Java 21 or later, downloads a pinned Firestore emulator with SHA-256 verification on first use, starts it on an available local port, runs the complete suite, and stops it afterward. Set `JAVA_HOME` if Java is not on PATH. On Apple Silicon it also detects Homebrew's OpenJDK 21 installation.

For a focused run: `node scripts/test.mjs tests/api.test.ts` or `node scripts/test.mjs tests/auth.test.ts`.

All persistence tests use the real Firestore emulator, a `demo-benchback-test` project, the default test database, and a new random authenticated owner for each test. They never use production Firestore or the AssemblyAI/OpenAI keys. An existing local emulator can be reused with `FIRESTORE_EMULATOR_HOST=127.0.0.1:8787 npm test`. Non-loopback emulator hosts are rejected. Running Vitest directly without an emulator skips persistence tests, so use the wrapper for release verification.

The API suite checks tenant isolation, revision races, request idempotency, purchase uniqueness, concurrent practice seeding, credit-allocation uniqueness and reversal, all-or-nothing CSV imports, the maximum 200-row credit import, interrupted workspace deletion recovery, quota contention, final-transcript idempotency, and voice-session expiration. Only the Firebase identity provider is mocked in this suite.

Authentication tests mock the Firebase Admin verification boundary and exercise the real session routes. They check revocation verification, trusted-origin enforcement through the hosting proxy, secure cookie flags, fresh password authentication, refreshed anonymous guest access, forged identity-header rejection, and redirect normalization. These tests complement, rather than replace, a real Firebase sign-in smoke test on the deployment.

Audio tests exercise PCM resampling and voice-client protocol handling. Live AssemblyAI audio quality and microphone permissions still require a separate deployed integration check.
