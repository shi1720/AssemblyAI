import { env } from "cloudflare:workers";
import { z, ZodError } from "zod";
import {
  actionSchema,
  coreInputSchema,
  demoCores,
  demoPolicy,
  emptyState,
  inspectReadiness,
  normalizeId,
  policySchema,
  searchCores,
  todayUTC,
  type Core,
  type CoreAction,
  type Policy,
} from "@/lib/domain";
import {
  ApiError,
  body,
  db,
  getCore,
  getCores,
  getPolicies,
  owner,
  quota,
  sameOrigin,
  saveAction,
  creditSourceKey,
  releaseQuota,
} from "@/lib/server";
import { agentConfig } from "@/lib/agent";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
};
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}
async function route(request: Request, method: string) {
  try {
    const path = new URL(request.url).pathname
      .replace(/^\/api\//, "")
      .split("/");
    if (method === "GET" && path[0] === "health")
      return json({
        ok: true,
        voiceConfigured: !!env.ASSEMBLYAI_API_KEY,
        service: "Benchback",
      });
    if (method === "POST") sameOrigin(request);
    const user = await owner();
    if (method === "GET" && path[0] === "workspace")
      return json({
        cores: await getCores(user.userId),
        policies: await getPolicies(user.userId),
      });
    if (method === "GET" && path[0] === "export") {
      const [cores, policies, events, transcripts] = await Promise.all([
        getCores(user.userId),
        getPolicies(user.userId),
        db()
          .prepare(
            "SELECT data FROM events WHERE owner = ? ORDER BY created_at, id",
          )
          .bind(user.userId)
          .all<{ data: string }>(),
        db()
          .prepare(
            "SELECT id, session_id, core_id, speaker, content, created_at FROM transcripts WHERE owner = ? ORDER BY created_at, id",
          )
          .bind(user.userId)
          .all(),
      ]);
      return json({
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        cores,
        policies,
        events: events.results.map((e) => JSON.parse(e.data)),
        transcripts: transcripts.results,
      });
    }
    if (method === "GET" && path[0] === "cores" && path[2] === "events") {
      await getCore(path[1], user.userId);
      const events = await db()
        .prepare(
          "SELECT data FROM events WHERE owner = ? AND core_id = ? ORDER BY created_at, id",
        )
        .bind(user.userId, path[1])
        .all<{ data: string }>();
      const transcripts = await db()
        .prepare(
          "SELECT id, speaker, content FROM transcripts WHERE owner = ? AND core_id = ? ORDER BY created_at, id LIMIT 500",
        )
        .bind(user.userId, path[1])
        .all<{ id: string; speaker: string; content: string }>();
      return json({
        events: events.results.map((e) => JSON.parse(e.data)),
        transcripts: transcripts.results.map((t) => ({
          id: t.id,
          speaker: t.speaker,
          text: t.content,
        })),
      });
    }
    if (method !== "POST") throw new ApiError(404, "Endpoint not found.");
    const input = await body(request);
    if (path[0] === "workspace-delete") {
      z.object({ confirmation: z.literal("DELETE MY WORKSPACE") })
        .strict()
        .parse(input);
      // Keep daily abuse quotas so deletion cannot reset the paid voice allowance.
      await db().batch(
        [
          "transcripts",
          "sessions",
          "events",
          "credit_allocations",
          "cores",
          "policies",
        ].map((table) =>
          db()
            .prepare(`DELETE FROM ${table} WHERE owner = ?`)
            .bind(user.userId),
        ),
      );
      return json({ deleted: true });
    }
    if (path[0] === "seed") {
      const existing = await getCores(user.userId);
      if (existing.some((c) => c.exercise))
        throw new ApiError(
          409,
          "A practice dataset already exists. Your previous work is preserved.",
        );
      const p = { ...demoPolicy(), id: crypto.randomUUID() };
      const cores = demoCores().map((c) => ({
        ...c,
        id: crypto.randomUUID(),
        policy: p,
        state: {
          ...c.state,
          credits: c.state.credits.map((cr) => ({
            ...cr,
            id: crypto.randomUUID(),
          })),
        },
      }));
      const now = new Date().toISOString();
      await db().batch([
        db()
          .prepare(
            "INSERT INTO policies (id, owner, data, created_at) VALUES (?, ?, ?, ?)",
          )
          .bind(p.id, user.userId, JSON.stringify(p), now),
        ...cores.map((c) => coreInsert(c, user.userId)),
        ...cores.flatMap((c) =>
          c.state.credits.map((cr) =>
            db()
              .prepare(
                "INSERT INTO credit_allocations (id,owner,core_id,source_key,amount_cents,reversed) VALUES (?,?,?,?,?,0)",
              )
              .bind(
                cr.id,
                user.userId,
                c.id,
                creditSourceKey(c.supplier, cr.memo, cr.lineRef),
                cr.amountCents,
              ),
          ),
        ),
      ]);
      return json({ cores, policies: [p] });
    }
    if (path[0] === "policies") {
      const validated = policySchema.parse(input);
      const p: Policy = { ...validated, id: crypto.randomUUID() };
      const count = await db()
        .prepare("SELECT count(*) AS n FROM policies WHERE owner = ?")
        .bind(user.userId)
        .first<{ n: number }>();
      if ((count?.n || 0) >= 100)
        throw new ApiError(422, "Policy limit reached.");
      await db()
        .prepare(
          "INSERT INTO policies (id, owner, data, created_at) VALUES (?, ?, ?, ?)",
        )
        .bind(p.id, user.userId, JSON.stringify(p), new Date().toISOString())
        .run();
      return json({ policy: p });
    }
    if (path[0] === "cores" && path.length === 1) {
      const items = z
        .array(coreInputSchema)
        .min(1)
        .max(200)
        .parse(Array.isArray(input) ? input : [input]);
      const policies = await getPolicies(user.userId);
      const existing = await getCores(user.userId);
      if (existing.length + items.length > 3000)
        throw new ApiError(422, "Workspace limit is 3,000 core records.");
      const seen = new Set(existing.map(purchaseKey));
      const now = new Date().toISOString();
      const cores = items.map((item) => {
        const policy = policies.find((p) => p.id === item.policyId);
        if (!policy)
          throw new ApiError(
            422,
            "Select a supplier policy from this workspace.",
          );
        if (item.shippedDate > todayUTC())
          throw new ApiError(422, "Shipment date cannot be in the future.");
        const c: Core = {
          ...item,
          id: crypto.randomUUID(),
          supplier: policy.supplier,
          policy,
          state: emptyState(),
          createdAt: now,
        };
        const key = purchaseKey(c);
        if (seen.has(key))
          throw new ApiError(
            409,
            `Duplicate purchase: ${c.invoice} / ${c.job} / ${c.part}. Nothing was imported.`,
          );
        seen.add(key);
        return c;
      });
      await db().batch(cores.map((c) => coreInsert(c, user.userId)));
      return json({ cores });
    }
    if (path[0] === "cores" && path[2] === "actions") {
      const d = z
        .object({
          action: actionSchema,
          revision: z.number().int().min(0),
          requestId: z.string().min(8).max(160),
        })
        .strict()
        .parse(input);
      return json(
        await saveAction({
          coreId: path[1],
          ownerId: user.userId,
          actor: user.displayName,
          role: "owner",
          ...d,
          source: "manual",
        }),
      );
    }
    if (path[0] === "credits" && path[1] === "import") {
      // Validate every line before transaction. One line per core per import keeps optimistic writes simple.
      const items = z
        .array(
          z.object({
            coreId: z.string(),
            revision: z.number().int(),
            memo: z.string().min(2).max(100),
            lineRef: z.string().min(1).max(80).default("1"),
            amountCents: z.number().int().positive(),
            date: z.string(),
            note: z.string().max(1000),
          }),
        )
        .min(1)
        .max(200)
        .parse(input.items);
      if (new Set(items.map((i) => i.coreId)).size !== items.length)
        throw new ApiError(422, "Use one credit memo per core in each import.");
      const { applyAction } = await import("@/lib/domain");
      const prepared = [];
      for (const i of items) {
        const c = await getCore(i.coreId, user.userId);
        if (c.state.revision !== i.revision)
          throw new ApiError(
            409,
            "A record changed. Refresh the import preview.",
          );
        const action = actionSchema.parse({
          type: "add_credit",
          memo: i.memo,
          lineRef: i.lineRef,
          amountCents: i.amountCents,
          date: i.date,
          note: i.note,
        });
        const at = new Date().toISOString();
        let after;
        try {
          after = applyAction(c, action, user.displayName, "owner", at);
        } catch (e) {
          throw new ApiError(422, `${c.invoice}: ${(e as Error).message}`);
        }
        prepared.push({
          c,
          after,
          event: {
            id: crypto.randomUUID(),
            coreId: c.id,
            action: "add_credit",
            actor: user.displayName,
            source: "credit CSV import",
            at,
            before: c.state,
            after,
            note: i.note,
          },
        });
      }
      // A failed revision guard deliberately violates NOT NULL, rolling back the entire D1 batch.
      const sourceKeys = prepared.map(({ c, after }) => {
        const credit = after.credits.at(-1)!;
        return creditSourceKey(c.supplier, credit.memo, credit.lineRef);
      });
      if (new Set(sourceKeys).size !== sourceKeys.length)
        throw new ApiError(
          409,
          "The same supplier memo line appears more than once. Nothing was imported.",
        );
      const statements = prepared.flatMap(({ c, after, event }) => [
        db()
          .prepare(
            "UPDATE cores SET state = CASE WHEN revision = ? THEN ? ELSE NULL END, revision = ?, last_event_id = ? WHERE id = ? AND owner = ?",
          )
          .bind(
            c.state.revision,
            JSON.stringify(after),
            after.revision,
            event.id,
            c.id,
            user.userId,
          ),
        db()
          .prepare(
            "INSERT INTO events (id, owner, core_id, request_id, fingerprint, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            event.id,
            user.userId,
            c.id,
            event.id,
            JSON.stringify({
              type: "add_credit",
              credit: after.credits.at(-1),
            }),
            JSON.stringify(event),
            event.at,
          ),
        db()
          .prepare(
            "INSERT INTO credit_allocations (id, owner, core_id, source_key, amount_cents, reversed) VALUES (?, ?, ?, ?, ?, 0)",
          )
          .bind(
            after.credits.at(-1)!.id,
            user.userId,
            c.id,
            creditSourceKey(
              c.supplier,
              after.credits.at(-1)!.memo,
              after.credits.at(-1)!.lineRef,
            ),
            after.credits.at(-1)!.amountCents,
          ),
      ]);
      try {
        await db().batch(statements);
      } catch (e) {
        if ((e as Error).message.includes("UNIQUE"))
          throw new ApiError(
            409,
            "A supplier memo line is already posted. Nothing was imported.",
          );
        throw e;
      }
      return json({
        cores: prepared.map((x) => ({ ...x.c, state: x.after })),
        events: prepared.map((x) => x.event),
      });
    }
    if (path[0] === "voice" && path[1] === "token") {
      const d = z.object({ coreId: z.string() }).parse(input);
      const core = await getCore(d.coreId, user.userId);
      if (!env.ASSEMBLYAI_API_KEY)
        throw new ApiError(
          503,
          "Live voice is not configured yet. Use the form or ask the workspace owner to add ASSEMBLYAI_API_KEY.",
        );
      await quota(`voice-attempt:${user.userId}:${todayUTC()}`, 30);
      const userQuota = `voice-user:${user.userId}:${todayUTC()}`,
        globalQuota = `voice-global:${todayUTC()}`;
      await quota(userQuota, 8);
      try {
        await quota(globalQuota, 20);
      } catch (e) {
        await releaseQuota(userQuota);
        throw e;
      }
      let issued = false;
      try {
        const upstream = await fetch(
          "https://agents.assemblyai.com/v1/token?expires_in_seconds=60&max_session_duration_seconds=600",
          {
            headers: { Authorization: `Bearer ${env.ASSEMBLYAI_API_KEY}` },
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!upstream.ok) {
          console.error("AssemblyAI token request failed", upstream.status);
          throw new ApiError(
            502,
            `AssemblyAI could not start the session (${upstream.status}). Check account access and credit balance.`,
          );
        }
        const tokenData = (await upstream.json()) as { token?: string };
        if (!tokenData.token)
          throw new ApiError(502, "AssemblyAI did not return a session token.");
        const id = crypto.randomUUID();
        await db()
          .prepare(
            "INSERT INTO sessions (id,owner,core_id,created_at) VALUES (?,?,?,?)",
          )
          .bind(id, user.userId, core.id, new Date().toISOString())
          .run();
        issued = true;
        return json({
          token: tokenData.token,
          sessionId: id,
          config: agentConfig(core),
        });
      } finally {
        if (!issued)
          await Promise.all([
            releaseQuota(userQuota),
            releaseQuota(globalQuota),
          ]);
      }
    }
    if (path[0] === "sessions") {
      const session = await db()
        .prepare(
          "SELECT id,core_id,created_at,ended_at FROM sessions WHERE id=? AND owner=?",
        )
        .bind(path[1], user.userId)
        .first<{
          id: string;
          core_id: string;
          created_at: string;
          ended_at: string | null;
        }>();
      if (!session) throw new ApiError(404, "Voice session not found.");
      if (path[2] === "end") {
        await db()
          .prepare(
            "UPDATE sessions SET ended_at=COALESCE(ended_at,?) WHERE id=? AND owner=?",
          )
          .bind(new Date().toISOString(), session.id, user.userId)
          .run();
        return json({ ok: true });
      }
      if (
        session.ended_at ||
        Date.now() - Date.parse(session.created_at) > 12 * 60 * 1000
      )
        throw new ApiError(
          410,
          "This voice session has ended. Start a new check.",
        );
      if (path[2] === "transcript") {
        const d = z
          .object({
            id: z.string().min(1).max(160),
            speaker: z.enum(["Technician", "Benchback"]),
            text: z.string().min(1).max(8000),
          })
          .parse(input);
        await quota(`transcript:${session.id}`, 400);
        await db()
          .prepare(
            "INSERT INTO transcripts (id,session_id,owner,core_id,speaker,content,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
          )
          .bind(
            session.id + ":" + d.id,
            session.id,
            user.userId,
            session.core_id,
            d.speaker,
            d.text,
            new Date().toISOString(),
          )
          .run();
        return json({ ok: true });
      }
      if (path[2] === "tool") {
        const d = z
          .object({
            callId: z.string().min(1).max(100),
            name: z.string(),
            arguments: z.record(z.unknown()),
          })
          .parse(input);
        await quota(`tools:${session.id}`, 100);
        const args = d.arguments;
        if (d.name === "lookup_deposits") {
          const q = z.string().min(1).max(160).parse(args.query);
          const found = searchCores(await getCores(user.userId), q);
          return json({
            result: {
              matches: found.map((c) => ({
                core_id: c.id,
                invoice: c.invoice,
                purchaseLine: c.purchaseLine,
                job: c.job,
                part: c.part,
                description: c.description,
                supplier: c.supplier,
                deposit_usd: c.depositCents / 100,
                status: inspectReadiness(c).status,
              })),
              instruction:
                found.length > 1
                  ? "Multiple matches. Ask which invoice and job; never guess."
                  : "Verify exact identifiers with the technician.",
            },
          });
        }
        const id = z.string().parse(args.core_id);
        const core = await getCore(id, user.userId);
        if (id !== session.core_id)
          return json({
            result: {
              error:
                "This voice check is scoped to the selected core. Ask the person to end this check and open the correct purchase if needed.",
              selectedCoreId: session.core_id,
            },
          });
        if (d.name === "get_supplier_policy")
          return json({
            result: {
              policy: core.policy,
              deadline: inspectReadiness(core).deadline,
              deposit_usd: core.depositCents / 100,
              notice:
                "Configured supplier terms; credit subject to supplier inspection.",
            },
          });
        if (d.name === "get_return_readiness")
          return json({
            result: {
              ...inspectReadiness(core),
              expectedDepositUSD: core.depositCents / 100,
              observations: core.state,
              instruction:
                "Human confirmation and preparation occur on screen. Expected is not recovered.",
            },
          });
        let action: CoreAction;
        if (d.name === "record_observation")
          action = actionSchema.parse({
            type: "observe",
            part: args.part,
            invoice: args.invoice,
            purchaseLine: args.purchaseLine,
            job: args.job,
          });
        else if (d.name === "record_inspection")
          action = actionSchema.parse({
            type: "inspect",
            complete: args.complete,
            packaging: args.packaging,
            labelAttached: args.label_attached,
            rma: args.rma,
            note: args.note,
          });
        else if (d.name === "add_followup")
          action = actionSchema.parse({ type: "followup", note: args.note });
        else throw new ApiError(422, "Unknown tool.");
        const saved = await saveAction({
          coreId: id,
          ownerId: user.userId,
          actor: "Benchback AI",
          role: "agent",
          action,
          revision: core.state.revision,
          requestId: `${session.id}:${d.callId}`,
          source: "AssemblyAI voice tool",
        });
        return json({
          ...saved,
          result: {
            saved: true,
            readiness: inspectReadiness({ ...core, state: saved.state }),
            instruction: "Report only what was saved. Human review required.",
          },
        });
      }
    }
    throw new ApiError(404, "Endpoint not found.");
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status);
    if (e instanceof ZodError)
      return json(
        {
          error: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        422,
      );
    console.error(
      "Benchback request failed",
      e instanceof Error ? e.message : "unknown error",
    );
    return json(
      {
        error:
          "The operation could not be saved. Refresh and try again; your input remains on screen.",
      },
      500,
    );
  }
}
function purchaseKey(c: Pick<Core, "invoice" | "purchaseLine" | "supplier">) {
  return [c.supplier, c.invoice, c.purchaseLine].map(normalizeId).join("|");
}
function coreInsert(c: Core, ownerId: string) {
  const { state, ...data } = c;
  return db()
    .prepare(
      "INSERT INTO cores (id,owner,purchase_key,data,state,revision,created_at) VALUES (?,?,?,?,?,?,?)",
    )
    .bind(
      c.id,
      ownerId,
      purchaseKey(c),
      JSON.stringify(data),
      JSON.stringify(state),
      state.revision,
      c.createdAt,
    );
}
export async function GET(r: Request) {
  return route(r, "GET");
}
export async function POST(r: Request) {
  return route(r, "POST");
}
