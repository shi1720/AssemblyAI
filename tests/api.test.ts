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
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFileSync } from "node:fs";
import { env } from "./worker-env";
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
let mf: Miniflare;
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
beforeAll(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("test")}}',
      compatibilityDate: "2026-05-01",
      d1Databases: ["DB"],
    }),
  );
  env.DB = (await mf.getD1Database("DB")) as unknown as D1Database;
  for (const file of [
    "drizzle/0000_worried_penance.sql",
    "drizzle/0001_flimsy_infant_terrible.sql",
  ])
    for (const sql of readFileSync(file, "utf8")
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean))
      await env.DB.prepare(sql).run();
});
afterAll(async () => {
  await mf?.dispose();
});
beforeEach(() => {
  identity.id = "test-" + crypto.randomUUID();
});
describe("API with real isolated D1 transactions", () => {
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
      (await act(c, { type: "followup", note: "Changed payload" }, id)).status,
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
    await env.DB.prepare("INSERT INTO quotas(id,count) VALUES (?,?)")
      .bind("voice:" + identity.id, 3)
      .run();
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
      await env.DB.prepare("SELECT count FROM quotas WHERE id = ?")
        .bind("voice:" + identity.id)
        .first("count"),
    ).toBe(3);
  });
  it("fails live token creation clearly when no server key is configured", async () => {
    const c = await makeCore();
    expect((await request("voice/token", { coreId: c.id })).status).toBe(503);
  });
});
