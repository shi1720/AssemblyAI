/** Run every test with a real isolated Firestore emulator. Java 21+ is required. */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename, access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
const version = "1.22.0";
const checksum =
  "9b6498b7f62714d67f48f59b3818883cd682dbcd46b9f59511de81c97bb5166c";
let emulator;
let runner;
function stop() {
  runner?.kill("SIGTERM");
  emulator?.kill("SIGTERM");
}
process.on("SIGINT", () => {
  stop();
  process.exitCode = 130;
});
process.on("SIGTERM", () => {
  stop();
  process.exitCode = 143;
});
try {
  let host = process.env.FIRESTORE_EMULATOR_HOST;
  if (host && !/^(127\.0\.0\.1|localhost):\d+$/.test(host))
    throw new Error("Tests only allow a local Firestore emulator.");
  if (!host) {
    const cache = join(homedir(), ".cache", "firebase", "emulators");
    const jar = join(cache, `cloud-firestore-emulator-v${version}.jar`);
    await mkdir(cache, { recursive: true });
    let bytes;
    try {
      bytes = await readFile(jar);
    } catch {
      /* Download the pinned emulator on first use. */
    }
    if (
      !bytes ||
      createHash("sha256").update(bytes).digest("hex") !== checksum
    ) {
      console.log("Downloading the pinned Firestore emulator...");
      const response = await fetch(
        `https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v${version}.jar`,
        { signal: AbortSignal.timeout(120000) },
      );
      if (!response.ok)
        throw new Error(`Emulator download failed: ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (createHash("sha256").update(bytes).digest("hex") !== checksum)
        throw new Error("Emulator checksum mismatch.");
      const temporary = `${jar}.${process.pid}.tmp`;
      await writeFile(temporary, bytes);
      await rename(temporary, jar);
    }
    const reservation = createServer();
    await new Promise((resolve, reject) => {
      reservation.once("error", reject);
      reservation.listen(0, "127.0.0.1", resolve);
    });
    const port = reservation.address().port;
    await new Promise((resolve) => reservation.close(resolve));
    host = `127.0.0.1:${port}`;
    let java = process.env.JAVA_HOME
      ? join(process.env.JAVA_HOME, "bin", "java")
      : "java";
    if (!process.env.JAVA_HOME && process.platform === "darwin") {
      try {
        await access("/opt/homebrew/opt/openjdk@21/bin/java");
        java = "/opt/homebrew/opt/openjdk@21/bin/java";
      } catch {
        /* Use PATH on other installations. */
      }
    }
    emulator = spawn(
      java,
      [
        "-Xmx512m",
        "-jar",
        jar,
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--project_id",
        "demo-benchback-test",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let logs = "",
      launchError;
    emulator.stdout.on("data", (d) => {
      logs = (logs + d.toString()).slice(-6000);
    });
    emulator.stderr.on("data", (d) => {
      logs = (logs + d.toString()).slice(-6000);
    });
    emulator.on("error", (error) => {
      launchError = error;
    });
    let ready = false;
    for (let i = 0; i < 150; i++) {
      if (launchError || emulator.exitCode !== null)
        throw new Error(
          `Firestore emulator did not start. Install Java 21+. ${launchError?.message || logs}`,
        );
      try {
        ready = (
          await fetch(`http://${host}/`, { signal: AbortSignal.timeout(300) })
        ).ok;
      } catch {
        /* Wait for emulator startup. */
      }
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!ready)
      throw new Error(`Firestore emulator did not become ready. ${logs}`);
  }
  runner = spawn(
    process.execPath,
    ["node_modules/vitest/vitest.mjs", "run", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        FIRESTORE_EMULATOR_HOST: host,
        GOOGLE_CLOUD_PROJECT: "demo-benchback-test",
        FIRESTORE_DATABASE_ID: "(default)",
        APP_ORIGINS: "https://bench.test",
        ASSEMBLYAI_API_KEY: "",
        OPENAI_API_KEY: "",
      },
    },
  );
  process.exitCode = await new Promise((resolve, reject) => {
    runner.once("error", reject);
    runner.once("exit", (code) => resolve(code ?? 1));
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  stop();
}
