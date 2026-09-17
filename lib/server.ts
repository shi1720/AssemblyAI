import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  actionSchema,
  applyAction,
  type AuditEvent,
  type Core,
  type CoreAction,
  type CoreState,
  type Policy,
  normalizeId,
} from "./domain";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function db() {
  if (!env.DB)
    throw new ApiError(
      503,
      "Workspace storage is temporarily unavailable. Your unsaved input has not been changed.",
    );
  return env.DB;
}
export async function owner() {
  const u = await getChatGPTUser();
  if (!u) throw new ApiError(401, "Sign in to access your private workspace.");
  return u;
}
export function parseCore(row: { data: string; state: string }) {
  return { ...JSON.parse(row.data), state: JSON.parse(row.state) } as Core;
}
export async function getCores(ownerId: string) {
  const rows = await db()
    .prepare(
      "SELECT data, state FROM cores WHERE owner = ? ORDER BY created_at DESC, id",
    )
    .bind(ownerId)
    .all<{ data: string; state: string }>();
  return rows.results.map(parseCore);
}
export async function getCore(id: string, ownerId: string) {
  const row = await db()
    .prepare("SELECT data, state FROM cores WHERE id = ? AND owner = ?")
    .bind(id, ownerId)
    .first<{ data: string; state: string }>();
  if (!row) throw new ApiError(404, "Core record not found.");
  return parseCore(row);
}
export async function getPolicies(ownerId: string) {
  const rows = await db()
    .prepare(
      "SELECT data FROM policies WHERE owner = ? ORDER BY created_at DESC",
    )
    .bind(ownerId)
    .all<{ data: string }>();
  return rows.results.map((r) => JSON.parse(r.data) as Policy);
}
export async function saveAction(args: {
  coreId: string;
  ownerId: string;
  actor: string;
  role: "owner" | "agent";
  action: CoreAction;
  revision: number;
  requestId: string;
  source: string;
}) {
  const action = actionSchema.parse(args.action);
  const fingerprint = JSON.stringify(action);
  const existing = await db()
    .prepare(
      "SELECT data, fingerprint FROM events WHERE owner = ? AND request_id = ?",
    )
    .bind(args.ownerId, args.requestId)
    .first<{ data: string; fingerprint: string }>();
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      throw new ApiError(
        409,
        "This request identifier was already used with a different action.",
      );
    const event = JSON.parse(existing.data) as AuditEvent;
    if (event.coreId !== args.coreId)
      throw new ApiError(
        409,
        "This request identifier was already used for a different record.",
      );
    const current = await getCore(args.coreId, args.ownerId);
    return { state: current.state, event, duplicate: true };
  }
  const core = await getCore(args.coreId, args.ownerId);
  if (core.state.revision !== args.revision)
    throw new ApiError(
      409,
      "This record changed in another session. Refresh before applying your update.",
    );
  const at = new Date().toISOString();
  let state: CoreState;
  try {
    state = applyAction(core, action, args.actor, args.role, at);
  } catch (e) {
    throw new ApiError(422, (e as Error).message);
  }
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    coreId: core.id,
    action: action.type,
    actor: args.actor,
    source: args.source,
    at,
    before: core.state,
    after: state,
    note: "note" in action ? action.note : "",
  };
  const statements = [
    db()
      .prepare(
        "UPDATE cores SET state = ?, revision = ?, last_event_id = ? WHERE id = ? AND owner = ? AND revision = ?",
      )
      .bind(
        JSON.stringify(state),
        state.revision,
        event.id,
        core.id,
        args.ownerId,
        args.revision,
      ),
    db()
      .prepare(
        "INSERT INTO events (id, owner, core_id, request_id, fingerprint, data, created_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM cores WHERE id = ? AND owner = ? AND last_event_id = ?)",
      )
      .bind(
        event.id,
        args.ownerId,
        core.id,
        args.requestId,
        fingerprint,
        JSON.stringify(event),
        at,
        core.id,
        args.ownerId,
        event.id,
      ),
  ];
  if (action.type === "add_credit") {
    const credit = state.credits.at(-1)!;
    statements.push(
      db()
        .prepare(
          "INSERT INTO credit_allocations (id, owner, core_id, source_key, amount_cents, reversed) SELECT ?, ?, ?, ?, ?, 0 WHERE EXISTS (SELECT 1 FROM cores WHERE id = ? AND owner = ? AND last_event_id = ?)",
        )
        .bind(
          credit.id,
          args.ownerId,
          core.id,
          creditSourceKey(core.supplier, credit.memo, credit.lineRef),
          credit.amountCents,
          core.id,
          args.ownerId,
          event.id,
        ),
    );
  }
  if (action.type === "reverse_credit")
    statements.push(
      db()
        .prepare(
          "UPDATE credit_allocations SET reversed = 1 WHERE id = ? AND owner = ? AND core_id = ? AND EXISTS (SELECT 1 FROM cores WHERE id = ? AND last_event_id = ?)",
        )
        .bind(action.creditId, args.ownerId, core.id, core.id, event.id),
    );
  let results;
  try {
    results = await db().batch(statements);
  } catch (e) {
    if ((e as Error).message.includes("UNIQUE"))
      throw new ApiError(
        409,
        "This supplier memo line is already allocated. Use a distinct line reference or reverse the incorrect posting first.",
      );
    throw e;
  }
  if (!results[0].meta.changes)
    throw new ApiError(
      409,
      "Another update arrived first. Refresh the record and try again.",
    );
  return { state, event, duplicate: false };
}
export async function quota(key: string, limit: number) {
  const row = await db()
    .prepare(
      "INSERT INTO quotas (id, count) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count",
    )
    .bind(key, limit)
    .first<{ count: number }>();
  if (!row)
    throw new ApiError(
      429,
      "The daily voice allowance has been reached. You can still use the forms and exports.",
    );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  const url = new URL(request.url);
  if (origin !== url.origin)
    throw new ApiError(
      403,
      "This action must originate from the Benchback app.",
    );
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw new ApiError(415, "Use application/json for this request.");
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length")) > 600000)
    throw new ApiError(413, "Request is too large.");
  const text = await request.text();
  if (text.length > 600000) throw new ApiError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Invalid JSON.");
  }
}

export function creditSourceKey(
  supplier: string,
  memo: string,
  lineRef: string,
) {
  return [supplier, memo, lineRef].map(normalizeId).join("|");
}
export async function releaseQuota(key: string) {
  await db()
    .prepare("UPDATE quotas SET count = MAX(0, count - 1) WHERE id = ?")
    .bind(key)
    .run();
}
