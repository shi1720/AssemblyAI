/* eslint-disable @typescript-eslint/no-explicit-any -- JSON response assertions deliberately test untrusted runtime shapes. */
import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { createHash } from "node:crypto";
import {
  database,
  quota,
  createSession,
  getCore,
  saveAction,
  insertCores,
} from "../lib/database";
import { demoPolicy, type Core, type CoreAction } from "../lib/domain";
const identity = vi.hoisted(() => ({ id: "test-a" as string | null }));
vi.mock("../app/chatgpt-auth", () => ({
  getChatGPTUser: async () =>
    identity.id
      ? {
          userId: identity.id,
          email: identity.id + "@example.test",
          displayName: "Test owner",
        }
      : null,
}));
import { GET, POST } from "../app/api/[...path]/route";

async function request(
  path: string,
  data?: unknown,
  headers: Record<string, string> = {},
) {
  const req = new Request("https://bench.test/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Origin: "https://bench.test",
      "Content-Type": "application/json",
      ...headers,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const response = await (data === undefined ? GET : POST)(req);
  return {
    status: response.status,
    data: (await response.json()) as Record<string, any>,
  };
}
async function workspace() {
  return (await request("workspace")).data.cores as Core[];
}
async function act(c: Core, action: CoreAction, id = crypto.randomUUID()) {
  return request("cores/" + c.id + "/actions", {
    revision: c.state.revision,
    requestId: id,
    action,
  });
}
async function makeCore(line = "1") {
  const p = (await request("policies", demoPolicy())).data.policy;
  const result = await request("cores", {
    invoice: "INV-" + crypto.randomUUID(),
    purchaseLine: line,
    job: "JOB-1",
    part: "ALT-24-160",
    description: "Synthetic test alternator",
    depositCents: 24000,
    shippedDate: "2026-01-01",
    policyId: p.id,
    exercise: true,
  });
  expect(result.status).toBe(200);
  return result.data.cores[0] as Core;
}
async function returned() {
  const c = await makeCore();
  const r = await act(c, {
    type: "historical_return",
    date: "2026-09-01",
    reference: "TEST-PICKUP",
    evidence: "Synthetic isolated integration test only.",
  });
  expect(r.status).toBe(200);
  return { ...c, state: r.data.state } as Core;
}
const credit: CoreAction = {
  type: "add_credit",
  memo: "CM-TEST",
  lineRef: "1",
  amountCents: 20000,
  date: "2026-09-10",
  note: "Synthetic supplier memo",
};
async function inspectionFixture() {
  const core = await makeCore();
  const session = {
    id: crypto.randomUUID(),
    core_id: core.id,
    created_at: new Date().toISOString(),
    ended_at: null,
  };
  await createSession(identity.id!, session);
  const quotes = {
    complete: "All components are present",
    packaging: "I have the original box",
    label_attached: "The invoice label is attached",
  };
  const args = {
    core_id: core.id,
    complete: "yes",
    packaging: "original",
    label_attached: true,
    rma: "",
    note: "Technician report",
    evidence: quotes,
  };
  const transcript = async (text: string, speaker = "Technician") =>
    request(`sessions/${session.id}/transcript`, {
      id: crypto.randomUUID(),
      speaker,
      text,
    });
  const tool = async (argumentsOverride = args, callId = crypto.randomUUID()) =>
    request(`sessions/${session.id}/tool`, {
      callId,
      name: "record_inspection",
      arguments: argumentsOverride,
    });
  return { core, session, quotes, args, transcript, tool };
}

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) return;
  if (
    !/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST)
  )
    throw new Error("API tests require a local Firestore emulator.");
  process.env.GOOGLE_CLOUD_PROJECT = "demo-benchback-test";
  process.env.APP_ORIGINS = "https://bench.test";
  process.env.FIRESTORE_DATABASE_ID = "(default)";
  delete process.env.ASSEMBLYAI_API_KEY;
});
afterAll(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST) await database().terminate();
});
beforeEach(() => {
  identity.id = "test-" + crypto.randomUUID();
});
describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)(
  "API with real Firestore emulator transactions",
  () => {
    it("rejects anonymous access and cross-origin or non-JSON mutations", async () => {
      identity.id = null;
      expect((await request("workspace")).status).toBe(401);
      expect(
        (await request("seed", {}, { Origin: "https://other.test" })).status,
      ).toBe(403);
      expect(
        (await request("seed", {}, { "Content-Type": "text/plain" })).status,
      ).toBe(415);
    });
    it("isolates records and events by authenticated owner", async () => {
      const c = await makeCore();
      identity.id = "other-" + crypto.randomUUID();
      expect(await workspace()).toHaveLength(0);
      expect((await request("cores/" + c.id + "/events")).status).toBe(404);
      expect(
        (
          await act(c, {
            type: "followup",
            note: "Attempt to mutate other owner",
          })
        ).status,
      ).toBe(404);
    });
    it("keeps identical retries idempotent and rejects reused keys with changed actions", async () => {
      const c = await makeCore(),
        id = crypto.randomUUID(),
        a: CoreAction = { type: "followup", note: "Call supplier tomorrow" };
      expect((await act(c, a, id)).status).toBe(200);
      const repeat = await act(c, a, id);
      expect(repeat.status).toBe(200);
      expect(repeat.data.duplicate).toBe(true);
      expect(
        (await act(c, { type: "followup", note: "Changed payload" }, id))
          .status,
      ).toBe(409);
      expect(
        (await request("cores/" + c.id + "/events")).data.events,
      ).toHaveLength(1);
    });
    it("allows only one concurrent update at a revision without orphan audit events", async () => {
      const c = await makeCore();
      const results = await Promise.all([
        act(c, { type: "followup", note: "First update" }),
        act(c, { type: "followup", note: "Second update" }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(
        (await request("cores/" + c.id + "/events")).data.events,
      ).toHaveLength(1);
      expect((await workspace())[0].state.revision).toBe(1);
    });
    it("rolls back core state and history when a memo line is allocated twice", async () => {
      const a = await returned(),
        b = await returned();
      expect((await act(a, credit)).status).toBe(200);
      expect((await act(b, credit)).status).toBe(409);
      const after = (await workspace()).find((c) => c.id === b.id)!;
      expect(after.state.revision).toBe(b.state.revision);
      expect(after.state.credits).toHaveLength(0);
      expect(
        (await request("cores/" + b.id + "/events")).data.events,
      ).toHaveLength(1);
    });
    it("releases a reversed memo allocation while preserving the original evidence", async () => {
      let a = await returned();
      const b = await returned();
      const posted = await act(a, credit);
      a = { ...a, state: posted.data.state };
      expect(
        (
          await act(a, {
            type: "reverse_credit",
            creditId: a.state.credits[0].id,
            reason: "Incorrect core allocation, corrected from source.",
          })
        ).status,
      ).toBe(200);
      expect((await act(b, credit)).status).toBe(200);
      const after = (await workspace()).find((c) => c.id === a.id)!;
      expect(after.state.credits[0].reversedAt).toBeTruthy();
    });
    it("rolls back an entire import when a later memo collides", async () => {
      const a = await returned(),
        b = await returned(),
        prior = await returned();
      await act(prior, credit);
      const items = [a, b].map((c, i) => ({
        coreId: c.id,
        revision: c.state.revision,
        memo: i ? "CM-TEST" : "CM-NEW",
        lineRef: "1",
        amountCents: 20000,
        date: "2026-09-10",
        note: "CSV test",
      }));
      expect((await request("credits/import", { items })).status).toBe(409);
      for (const c of (await workspace()).filter((c) =>
        [a.id, b.id].includes(c.id),
      )) {
        expect(c.state.credits).toHaveLength(0);
        expect(c.state.revision).toBe(1);
      }
    });
    it("exports full owner history and deletes only that workspace while retaining quotas", async () => {
      const c = await returned();
      await act(c, { type: "followup", note: "Test export evidence" });
      expect((await request("export")).data.events).toHaveLength(2);
      await quota("voice:" + identity.id, 3);
      await quota("voice:" + identity.id, 3);
      await quota("voice:" + identity.id, 3);
      expect(
        (await request("workspace-delete", { confirmation: "wrong" })).status,
      ).toBe(422);
      expect(
        (
          await request("workspace-delete", {
            confirmation: "DELETE MY WORKSPACE",
          })
        ).status,
      ).toBe(200);
      expect(await workspace()).toHaveLength(0);
      expect((await request("export")).data.events).toHaveLength(0);
      expect(
        (
          await database()
            .collection("benchback_quotas")
            .doc(
              createHash("sha256")
                .update("voice:" + identity.id)
                .digest("hex"),
            )
            .get()
        ).data()?.count,
      ).toBe(3);
    });
    it("fails live token creation clearly when no server key is configured", async () => {
      const c = await makeCore();
      expect((await request("voice/token", { coreId: c.id })).status).toBe(503);
    });
    it("serializes concurrent purchase imports and practice seeding", async () => {
      const p = (await request("policies", demoPolicy())).data.policy;
      const input = {
        invoice: "INV-RACE",
        purchaseLine: "1",
        job: "J-1",
        part: "ALT-1",
        description: "Race fixture",
        depositCents: 20000,
        shippedDate: "2026-01-01",
        policyId: p.id,
        exercise: false,
      };
      const purchases = await Promise.all([
        request("cores", input),
        request("cores", input),
      ]);
      expect(purchases.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await workspace()).toHaveLength(1);
      const seeds = await Promise.all([
        request("seed", {}),
        request("seed", {}),
      ]);
      expect(seeds.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await workspace()).toHaveLength(6);
    });
    it("enforces quotas under concurrent requests", async () => {
      const id = "concurrent:" + crypto.randomUUID();
      const result = await Promise.allSettled(
        Array.from({ length: 10 }, () => quota(id, 3)),
      );
      expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(3);
      expect(result.filter((r) => r.status === "rejected")).toHaveLength(7);
      for (const rejected of result)
        if (rejected.status === "rejected")
          expect(rejected.reason).toMatchObject({ status: 429 });
    });
    it("persists voice transcripts once and denies tools after session termination", async () => {
      const c = await makeCore(),
        ownerId = identity.id!;
      const session = {
        id: crypto.randomUUID(),
        core_id: c.id,
        created_at: new Date().toISOString(),
        ended_at: null,
      };
      await createSession(ownerId, session);
      const transcript = {
        id: "item-1",
        speaker: "Technician",
        text: "This is the alternator on job one.",
      };
      expect(
        (await request(`sessions/${session.id}/transcript`, transcript)).status,
      ).toBe(200);
      expect(
        (await request(`sessions/${session.id}/transcript`, transcript)).status,
      ).toBe(200);
      expect(
        (await request(`cores/${c.id}/events`)).data.transcripts,
      ).toHaveLength(1);
      expect((await request(`sessions/${session.id}/end`, {})).status).toBe(
        200,
      );
      await expect(
        saveAction({
          ownerId,
          coreId: c.id,
          actor: "AI",
          role: "agent",
          action: { type: "followup", note: "Late tool" },
          revision: 0,
          requestId: crypto.randomUUID(),
          source: "test",
          sessionId: session.id,
        }),
      ).rejects.toMatchObject({ status: 410 });
      expect((await getCore(c.id, ownerId)).state.revision).toBe(0);
      expect(
        (
          await request(`sessions/${session.id}/transcript`, {
            ...transcript,
            id: "item-2",
          })
        ).status,
      ).toBe(410);
    });
    it("keeps CSV imports atomic when one revision is stale", async () => {
      const a = await returned(),
        b = await returned();
      await act(b, { type: "followup", note: "Concurrent edit" });
      const items = [a, b].map((c, i) => ({
        coreId: c.id,
        revision: c.state.revision,
        memo: "CM-STALE-" + i,
        lineRef: "1",
        amountCents: 20000,
        date: "2026-09-10",
        note: "CSV stale test",
      }));
      expect((await request("credits/import", { items })).status).toBe(409);
      expect((await getCore(a.id, identity.id!)).state.credits).toHaveLength(0);
      expect((await getCore(b.id, identity.id!)).state.credits).toHaveLength(0);
    });
    it("atomically commits the maximum 200-row credit import", async () => {
      const template = await returned();
      const cores = Array.from({ length: 200 }, (_, i) => ({
        ...template,
        id: crypto.randomUUID(),
        invoice: "BULK-" + i,
      }));
      await insertCores(identity.id!, cores);
      const items = cores.map((c, i) => ({
        coreId: c.id,
        revision: c.state.revision,
        memo: "CM-BULK",
        lineRef: String(i + 1),
        amountCents: 20000,
        date: "2026-09-10",
        note: "Maximum-size import test",
      }));
      const result = await request("credits/import", { items });
      expect(result.status).toBe(200);
      expect(result.data.cores).toHaveLength(200);
      expect(result.data.events).toHaveLength(200);
      const exported = await request("export");
      expect(exported.data.events).toHaveLength(201);
      expect(
        exported.data.cores.filter((c: Core) => c.state.credits.length === 1),
      ).toHaveLength(200);
    });

    it("blocks writes during interrupted deletion and safely resumes a stale lease", async () => {
      await returned();
      const ref = database()
        .collection("benchback_workspaces")
        .doc(createHash("sha256").update(identity.id!).digest("hex"));
      await ref.set(
        {
          deleting: true,
          deletionId: "crashed-worker",
          deletionStartedAt: Date.now(),
        },
        { merge: true },
      );
      expect((await request("workspace")).status).toBe(409);
      expect((await request("policies", demoPolicy())).status).toBe(409);
      expect(
        (
          await request("workspace-delete", {
            confirmation: "DELETE MY WORKSPACE",
          })
        ).status,
      ).toBe(409);
      await ref.update({ deletionStartedAt: Date.now() - 130000 });
      expect(
        (
          await request("workspace-delete", {
            confirmation: "DELETE MY WORKSPACE",
          })
        ).status,
      ).toBe(200);
      expect(await workspace()).toHaveLength(0);
      expect((await request("export")).data.events).toHaveLength(0);
      expect((await request("policies", demoPolicy())).status).toBe(200);
    });

    it("rejects generic yes as evidence for unrelated inspection facts", async () => {
      const f = await inspectionFixture();
      await f.transcript("Yes, those identifiers are correct.");
      const result = await f.tool({
        ...f.args,
        evidence: { complete: "Yes", packaging: "Yes", label_attached: "Yes" },
      });
      expect(result.status).toBe(422);
      expect(result.data.error).toContain("explicit");
      expect((await getCore(f.core.id, identity.id!)).state.revision).toBe(0);
    });
    it("rejects invented quotes and agent speech as technician evidence", async () => {
      const f = await inspectionFixture();
      expect((await f.tool()).status).toBe(422);
      await f.transcript(Object.values(f.quotes).join(". "), "Benchback");
      expect((await f.tool()).status).toBe(422);
      expect((await getCore(f.core.id, identity.id!)).state.complete).toBe(
        "unknown",
      );
    });
    it("does not borrow inspection evidence from another session or owner", async () => {
      const f = await inspectionFixture(),
        currentOwner = identity.id!;
      const otherSession = { ...f.session, id: crypto.randomUUID() };
      await createSession(currentOwner, otherSession);
      await request(`sessions/${otherSession.id}/transcript`, {
        id: "different-session",
        speaker: "Technician",
        text: Object.values(f.quotes).join(". "),
      });
      expect((await f.tool()).status).toBe(422);
      identity.id = "other-owner-" + crypto.randomUUID();
      const other = await inspectionFixture();
      await other.transcript(Object.values(f.quotes).join(". "));
      identity.id = currentOwner;
      expect((await f.tool()).status).toBe(422);
    });
    it("saves normalized verbatim facts and quoted audit evidence with idempotent retries", async () => {
      const f = await inspectionFixture(),
        callId = crypto.randomUUID();
      await f.transcript(
        "ALL components are present. I have the original box. The invoice label is attached!",
      );
      const result = await f.tool(f.args, callId);
      expect(result.status).toBe(200);
      expect(result.data.state.complete).toBe("yes");
      expect(result.data.state.packaging).toBe("original");
      expect(result.data.state.labelAttached).toBe(true);
      expect(result.data.event.note).toContain(
        'complete: "All components are present"',
      );
      expect(result.data.event.note).toContain("client-reported");
      const retry = await f.tool(f.args, callId);
      expect(retry.status).toBe(200);
      expect(retry.data.duplicate).toBe(true);
      expect(
        (await request(`cores/${f.core.id}/events`)).data.events,
      ).toHaveLength(1);
    });
    it("preserves unchanged inspection fields without new quotes while allowing explicit corrections", async () => {
      const f = await inspectionFixture();
      await f.transcript(Object.values(f.quotes).join(". "));
      expect((await f.tool()).status).toBe(200);
      expect(
        (
          await f.tool({
            ...f.args,
            evidence: { complete: "", packaging: "", label_attached: "" },
            note: "No changed inspection fields",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await f.tool({
            ...f.args,
            packaging: "missing",
            evidence: { complete: "", packaging: "", label_attached: "" },
          })
        ).status,
      ).toBe(422);
      await f.transcript("Actually the original box is missing.");
      expect(
        (
          await f.tool({
            ...f.args,
            packaging: "missing",
            evidence: {
              complete: "",
              packaging: "the original box is missing",
              label_attached: "",
            },
          })
        ).status,
      ).toBe(200);
      expect((await getCore(f.core.id, identity.id!)).state.packaging).toBe(
        "missing",
      );
    });
    it("rejects questions and obviously contradictory affirmative facts", async () => {
      const f = await inspectionFixture();
      const evidence = {
        complete: "The assembly is not complete",
        packaging: "The original box is missing",
        label_attached: "The label is not attached",
      };
      await f.transcript(Object.values(evidence).join(". "));
      expect((await f.tool({ ...f.args, evidence })).status).toBe(422);
      await f.transcript(
        "Is the assembly complete? I have the original box. The invoice label is attached.",
      );
      expect(
        (
          await f.tool({
            ...f.args,
            evidence: { ...f.quotes, complete: "Is the assembly complete?" },
          })
        ).status,
      ).toBe(422);
      expect((await getCore(f.core.id, identity.id!)).state.revision).toBe(0);
    });

    it("rejects explicitly missing or unsecured alternative packaging", async () => {
      const f = await inspectionFixture();
      for (const quote of [
        "No container",
        "I do not have a pallet",
        "The container is not secured on the pallet",
        "The rigid container is unsecured",
        "The container is without a pallet",
        "I cannot secure the container on a pallet",
      ]) {
        await f.transcript(quote);
        const result = await f.tool({
          ...f.args,
          complete: "unknown",
          packaging: "approved_alternative",
          label_attached: false,
          evidence: { complete: "", packaging: quote, label_attached: "" },
        });
        expect(result.status, quote).toBe(422);
      }
      expect((await getCore(f.core.id, identity.id!)).state.revision).toBe(0);
      const valid = "I have the approved rigid container secured on a pallet";
      await f.transcript(valid);
      expect(
        (
          await f.tool({
            ...f.args,
            complete: "unknown",
            packaging: "approved_alternative",
            label_attached: false,
            evidence: { complete: "", packaging: valid, label_attached: "" },
          })
        ).status,
      ).toBe(200);
    });

    it("reloads practice purchases in stable return urgency order", async () => {
      expect((await request("seed", {})).status).toBe(200);
      const first = await workspace(),
        second = await workspace();
      expect(first.map((c) => c.job)).toEqual([
        "WO-418",
        "WO-403",
        "WO-422",
        "WO-409",
        "WO-397",
      ]);
      expect(second.map((c) => c.id)).toEqual(first.map((c) => c.id));
    });
    it("accepts natural completeness statements with all required components", async () => {
      for (const quote of [
        "All required components present",
        "All required components are present",
        "Complete with all required components present",
      ]) {
        const f = await inspectionFixture();
        await f.transcript(quote);
        const result = await f.tool({
          ...f.args,
          packaging: "unknown",
          label_attached: false,
          evidence: { complete: quote, packaging: "", label_attached: "" },
        });
        expect(result.status, quote).toBe(200);
        expect(result.data.state.complete).toBe("yes");
      }
    });
  },
);
