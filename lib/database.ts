import { createHash } from "node:crypto";
import { type Transaction } from "firebase-admin/firestore";
import { firestore } from "./firebase-admin";
import { ApiError } from "./api-error";
import {
  actionSchema,
  applyAction,
  normalizeId,
  inspectReadiness,
  type Core,
  type Policy,
  type AuditEvent,
  type CoreAction,
} from "./domain";

/** Admin SDK credentials stay on the server. Browser clients have no Firestore access. */
export const database = firestore;

const key = (value: string) => createHash("sha256").update(value).digest("hex");
function tenant(ownerId: string) {
  if (!ownerId)
    throw new ApiError(401, "Sign in to access your private workspace.");
  return database().collection("benchback_workspaces").doc(key(ownerId));
}
function recordId(id: string) {
  if (!id || id.includes("/") || id.length > 250 || id === "." || id === "..")
    throw new ApiError(404, "Record not found.");
  return id;
}
function collection(ownerId: string, name: string) {
  return tenant(ownerId).collection(name);
}
async function unlocked(ownerId: string, tx?: Transaction) {
  const ref = tenant(ownerId);
  const snap = tx ? await tx.get(ref) : await ref.get();
  if (snap.data()?.deleting)
    throw new ApiError(
      409,
      "Workspace deletion is in progress. Retry deletion from settings to finish it.",
    );
  return snap.data() ?? { coreCount: 0, policyCount: 0, seeded: false };
}
const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export function purchaseKey(
  c: Pick<Core, "invoice" | "purchaseLine" | "supplier">,
) {
  return [c.supplier, c.invoice, c.purchaseLine].map(normalizeId).join("|");
}
export function creditSourceKey(
  supplier: string,
  memo: string,
  lineRef: string,
) {
  return [supplier, memo, lineRef].map(normalizeId).join("|");
}
const allocation = (
  ownerId: string,
  supplier: string,
  memo: string,
  line: string,
) =>
  collection(ownerId, "allocations").doc(
    key(creditSourceKey(supplier, memo, line)),
  );
export async function getCores(ownerId: string) {
  await unlocked(ownerId);
  const rows = await collection(ownerId, "cores")
    .orderBy("createdAt", "desc")
    .get();
  // Prioritize the next physical return, then outstanding supplier credit.
  // Timestamp ties are common in imports, so never depend on random document IDs.
  return rows.docs
    .map((d) => {
      const core = d.data() as Core;
      const readiness = inspectReadiness(core);
      const group =
        readiness.outstandingCents <= 0 ? 2 : core.state.dispatchedAt ? 1 : 0;
      const due =
        group === 1
          ? readiness.creditDue || readiness.deadline
          : readiness.deadline;
      return { core, group, due };
    })
    .sort(
      (a, b) =>
        a.group - b.group ||
        a.due.localeCompare(b.due) ||
        a.core.invoice.localeCompare(b.core.invoice) ||
        a.core.job.localeCompare(b.core.job) ||
        a.core.id.localeCompare(b.core.id),
    )
    .map(({ core }) => core);
}
export async function getCore(id: string, ownerId: string) {
  await unlocked(ownerId);
  const row = await collection(ownerId, "cores").doc(recordId(id)).get();
  if (!row.exists) throw new ApiError(404, "Core record not found.");
  return row.data() as Core;
}
export async function getPolicies(ownerId: string) {
  await unlocked(ownerId);
  const rows = await collection(ownerId, "policies").get();
  return rows.docs.map((d) => d.data() as Policy);
}
export async function createPolicy(ownerId: string, policy: Policy) {
  return database().runTransaction(async (tx) => {
    const meta = await unlocked(ownerId, tx);
    if (meta.policyCount >= 100)
      throw new ApiError(422, "Policy limit reached.");
    tx.create(collection(ownerId, "policies").doc(policy.id), clean(policy));
    tx.set(
      tenant(ownerId),
      { policyCount: (meta.policyCount || 0) + 1 },
      { merge: true },
    );
  });
}
export async function insertCores(
  ownerId: string,
  cores: Core[],
  seedPolicy?: Policy,
) {
  return database().runTransaction(async (tx) => {
    const meta = await unlocked(ownerId, tx);
    if (seedPolicy && meta.seeded)
      throw new ApiError(
        409,
        "A practice dataset already exists. Your previous work is preserved.",
      );
    if ((meta.coreCount || 0) + cores.length > 3000)
      throw new ApiError(422, "Workspace limit is 3,000 core records.");
    if (seedPolicy && meta.policyCount >= 100)
      throw new ApiError(422, "Policy limit reached.");
    const purchaseRefs = cores.map((c) =>
      collection(ownerId, "purchases").doc(key(purchaseKey(c))),
    );
    if (new Set(purchaseRefs.map((r) => r.id)).size !== cores.length)
      throw new ApiError(409, "Duplicate purchase. Nothing was imported.");
    const existing = await tx.getAll(...purchaseRefs);
    if (existing.some((d) => d.exists))
      throw new ApiError(409, "Duplicate purchase. Nothing was imported.");
    // Read policy documents in the same transaction so concurrent deletion cannot leave orphan cores.
    if (!seedPolicy) {
      const policyIds = [...new Set(cores.map((c) => c.policy.id))];
      const policies = await tx.getAll(
        ...policyIds.map((id) =>
          collection(ownerId, "policies").doc(recordId(id)),
        ),
      );
      if (policies.some((d) => !d.exists))
        throw new ApiError(
          422,
          "Select a supplier policy from this workspace.",
        );
    }
    const seededAllocations = cores.flatMap((c) =>
      c.state.credits
        .filter((cr) => !cr.reversedAt)
        .map((cr) => ({
          ref: allocation(ownerId, c.supplier, cr.memo, cr.lineRef),
          creditId: cr.id,
          coreId: c.id,
        })),
    );
    if (seededAllocations.length) {
      const prior = await tx.getAll(...seededAllocations.map((a) => a.ref));
      if (prior.some((d) => d.exists))
        throw new ApiError(
          409,
          "A supplier memo line is already posted. Nothing was imported.",
        );
    }
    if (seedPolicy)
      tx.create(
        collection(ownerId, "policies").doc(seedPolicy.id),
        clean(seedPolicy),
      );
    cores.forEach((c, i) => {
      tx.create(collection(ownerId, "cores").doc(c.id), clean(c));
      tx.create(purchaseRefs[i], { coreId: c.id });
    });
    for (const a of seededAllocations)
      tx.create(a.ref, { creditId: a.creditId, coreId: a.coreId });
    tx.set(
      tenant(ownerId),
      {
        coreCount: (meta.coreCount || 0) + cores.length,
        ...(seedPolicy
          ? { seeded: true, policyCount: (meta.policyCount || 0) + 1 }
          : {}),
      },
      { merge: true },
    );
  });
}
export type ActionInput = {
  coreId: string;
  ownerId: string;
  actor: string;
  role: "owner" | "agent";
  action: CoreAction;
  revision: number;
  requestId: string;
  source: string;
  sessionId?: string;
};
function prepareAction(core: Core, args: ActionInput) {
  const action = actionSchema.parse(args.action),
    at = new Date().toISOString();
  if (core.state.revision !== args.revision)
    throw new ApiError(
      409,
      "This record changed in another session. Refresh before applying your update.",
    );
  let state;
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
  return { core, state, event, args, action };
}
export async function saveAction(args: ActionInput) {
  const action = actionSchema.parse(args.action),
    fingerprint = JSON.stringify(action);
  return database().runTransaction(async (tx) => {
    await unlocked(args.ownerId, tx);
    const coreRef = collection(args.ownerId, "cores").doc(
      recordId(args.coreId),
    );
    const requestRef = collection(args.ownerId, "events").doc(
      key(args.requestId),
    );
    const [coreSnap, prior] = await tx.getAll(coreRef, requestRef);
    if (!coreSnap.exists) throw new ApiError(404, "Core record not found.");
    const core = coreSnap.data() as Core;
    if (prior.exists) {
      const data = prior.data()!;
      if (data.fingerprint !== fingerprint || data.event.coreId !== args.coreId)
        throw new ApiError(
          409,
          "This request identifier was already used with a different action or record.",
        );
      return {
        state: core.state,
        event: data.event as AuditEvent,
        duplicate: true,
      };
    }
    if (args.role === "agent") {
      if (!args.sessionId)
        throw new ApiError(
          403,
          "A live voice session is required for agent tools.",
        );
      const session = await tx.get(
        collection(args.ownerId, "sessions").doc(recordId(args.sessionId)),
      );
      if (
        !session.exists ||
        session.data()!.ended_at ||
        Date.now() - Date.parse(session.data()!.created_at) > 720000
      )
        throw new ApiError(
          410,
          "This voice session has ended. Start a new check.",
        );
      if (session.data()!.core_id !== args.coreId)
        throw new ApiError(
          403,
          "Voice tools may update only the selected core.",
        );
    }
    const prepared = prepareAction(core, { ...args, action });
    if (action.type === "add_credit") {
      const cr = prepared.state.credits.at(-1)!;
      const ref = allocation(args.ownerId, core.supplier, cr.memo, cr.lineRef);
      if ((await tx.get(ref)).exists)
        throw new ApiError(
          409,
          "This supplier memo line is already allocated. Use a distinct line reference or reverse the incorrect posting first.",
        );
      tx.create(ref, { coreId: core.id, creditId: cr.id });
    }
    if (action.type === "reverse_credit") {
      const cr = core.state.credits.find((c) => c.id === action.creditId)!;
      const ref = allocation(args.ownerId, core.supplier, cr.memo, cr.lineRef);
      const priorAllocation = await tx.get(ref);
      if (
        priorAllocation.data()?.creditId !== cr.id ||
        priorAllocation.data()?.coreId !== core.id
      )
        throw new ApiError(
          409,
          "The credit allocation changed. Refresh the record.",
        );
      tx.delete(ref);
    }
    tx.update(coreRef, { state: clean(prepared.state) });
    tx.create(
      requestRef,
      clean({
        event: prepared.event,
        fingerprint,
        coreId: core.id,
        at: prepared.event.at,
      }),
    );
    return { state: prepared.state, event: prepared.event, duplicate: false };
  });
}
export type CreditImport = {
  coreId: string;
  revision: number;
  memo: string;
  lineRef: string;
  amountCents: number;
  date: string;
  note: string;
};
export async function importCredits(
  ownerId: string,
  actor: string,
  items: CreditImport[],
) {
  return database().runTransaction(async (tx) => {
    await unlocked(ownerId, tx);
    const refs = items.map((i) =>
      collection(ownerId, "cores").doc(recordId(i.coreId)),
    );
    const snaps = await tx.getAll(...refs);
    const prepared = snaps.map((snap, i) => {
      if (!snap.exists) throw new ApiError(404, "Core record not found.");
      const { coreId, revision, ...details } = items[i];
      return prepareAction(snap.data() as Core, {
        coreId,
        revision,
        ownerId,
        actor,
        role: "owner",
        source: "credit CSV import",
        requestId: crypto.randomUUID(),
        action: actionSchema.parse({ type: "add_credit", ...details }),
      });
    });
    const allocations = prepared.map((p) => {
      const cr = p.state.credits.at(-1)!;
      return {
        ref: allocation(ownerId, p.core.supplier, cr.memo, cr.lineRef),
        coreId: p.core.id,
        creditId: cr.id,
      };
    });
    if (new Set(allocations.map((a) => a.ref.id)).size !== allocations.length)
      throw new ApiError(
        409,
        "The same supplier memo line appears more than once. Nothing was imported.",
      );
    if (
      (await tx.getAll(...allocations.map((a) => a.ref))).some((a) => a.exists)
    )
      throw new ApiError(
        409,
        "A supplier memo line is already posted. Nothing was imported.",
      );
    prepared.forEach((p, i) => {
      tx.update(refs[i], { state: clean(p.state) });
      tx.create(
        collection(ownerId, "events").doc(key(p.args.requestId)),
        clean({
          event: p.event,
          fingerprint: JSON.stringify(p.action),
          coreId: p.core.id,
          at: p.event.at,
        }),
      );
      tx.create(allocations[i].ref, {
        coreId: p.core.id,
        creditId: allocations[i].creditId,
      });
    });
    return {
      cores: prepared.map((p) => ({ ...p.core, state: p.state })),
      events: prepared.map((p) => p.event),
    };
  });
}
export async function getEvents(ownerId: string, coreId?: string) {
  await unlocked(ownerId);
  const query = collection(ownerId, "events");
  const result = await (
    coreId ? query.where("coreId", "==", recordId(coreId)) : query
  ).get();
  return result.docs
    .map((d) => d.data().event as AuditEvent)
    .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
}
export type Session = {
  id: string;
  core_id: string;
  created_at: string;
  ended_at: string | null;
};
export async function createSession(ownerId: string, session: Session) {
  await database().runTransaction(async (tx) => {
    await unlocked(ownerId, tx);
    const core = await tx.get(
      collection(ownerId, "cores").doc(recordId(session.core_id)),
    );
    if (!core.exists) throw new ApiError(404, "Core record not found.");
    tx.create(collection(ownerId, "sessions").doc(session.id), session);
  });
}
export async function getSession(ownerId: string, id: string) {
  await unlocked(ownerId);
  const snap = await collection(ownerId, "sessions").doc(recordId(id)).get();
  if (!snap.exists) throw new ApiError(404, "Voice session not found.");
  return snap.data() as Session;
}
export async function endSession(ownerId: string, id: string) {
  await database().runTransaction(async (tx) => {
    await unlocked(ownerId, tx);
    const ref = collection(ownerId, "sessions").doc(recordId(id)),
      snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "Voice session not found.");
    if (!snap.data()!.ended_at)
      tx.update(ref, { ended_at: new Date().toISOString() });
  });
}
export type TranscriptRecord = {
  id: string;
  session_id: string;
  core_id: string;
  speaker: string;
  content: string;
  created_at: string;
};
export async function saveTranscript(
  ownerId: string,
  record: TranscriptRecord,
) {
  await database().runTransaction(async (tx) => {
    await unlocked(ownerId, tx);
    const ref = collection(ownerId, "transcripts").doc(key(record.id));
    const sessionRef = collection(ownerId, "sessions").doc(
      recordId(record.session_id),
    );
    const [prior, session] = await tx.getAll(ref, sessionRef);
    if (
      !session.exists ||
      session.data()!.ended_at ||
      Date.now() - Date.parse(session.data()!.created_at) > 720000
    )
      throw new ApiError(
        410,
        "This voice session has ended. Start a new check.",
      );
    if (!prior.exists) tx.create(ref, record);
  });
}
export async function getTranscripts(ownerId: string, coreId?: string) {
  await unlocked(ownerId);
  const query = collection(ownerId, "transcripts");
  const snaps = await (
    coreId ? query.where("core_id", "==", recordId(coreId)) : query
  ).get();
  const result = snaps.docs
    .map((d) => d.data() as TranscriptRecord)
    .sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
    );
  return coreId ? result.slice(-500) : result;
}
export async function getSessionTranscripts(
  ownerId: string,
  sessionId: string,
) {
  await unlocked(ownerId);
  const rows = await collection(ownerId, "transcripts")
    .where("session_id", "==", recordId(sessionId))
    .get();
  return rows.docs.map((d) => d.data() as TranscriptRecord);
}

export async function deleteWorkspace(ownerId: string) {
  const ref = tenant(ownerId),
    deletionId = crypto.randomUUID();
  // Every bounded deletion batch checks the durable lease in its transaction.
  // A replacement worker can resume after interruption, while the previous
  // worker can no longer delete records or release the replacement's lock.
  await database().runTransaction(async (tx) => {
    const existing = (await tx.get(ref)).data();
    if (existing?.deleting && Date.now() - existing.deletionStartedAt < 120000)
      throw new ApiError(
        409,
        "Workspace deletion is already running. If interrupted, retry after two minutes.",
      );
    tx.set(
      ref,
      { deleting: true, deletionId, deletionStartedAt: Date.now() },
      { merge: true },
    );
  });
  for (const name of [
    "transcripts",
    "sessions",
    "events",
    "allocations",
    "purchases",
    "cores",
    "policies",
  ]) {
    let remaining = true;
    while (remaining) {
      remaining = await database().runTransaction(async (tx) => {
        const lock = (await tx.get(ref)).data();
        if (lock?.deletionId !== deletionId)
          throw new ApiError(
            409,
            "Workspace deletion was resumed by another request.",
          );
        const page = await tx.get(ref.collection(name).limit(200));
        for (const doc of page.docs) tx.delete(doc.ref);
        tx.update(ref, { deletionStartedAt: Date.now() });
        return page.size === 200;
      });
    }
  }
  await database().runTransaction(async (tx) => {
    if ((await tx.get(ref)).data()?.deletionId !== deletionId)
      throw new ApiError(
        409,
        "Workspace deletion was resumed by another request.",
      );
    tx.set(ref, {
      deleting: false,
      coreCount: 0,
      policyCount: 0,
      seeded: false,
    });
  });
}

export async function quota(quotaKey: string, limit: number) {
  const ref = database().collection("benchback_quotas").doc(key(quotaKey));
  await database().runTransaction(async (tx) => {
    const prior = await tx.get(ref),
      count = prior.data()?.count || 0;
    if (count >= limit)
      throw new ApiError(
        429,
        "The daily voice allowance has been reached. You can still use the forms and exports.",
      );
    tx.set(ref, {
      count: count + 1,
      expiresAt: new Date(Date.now() + 3 * 86400000),
    });
  });
}
export async function releaseQuota(quotaKey: string) {
  const ref = database().collection("benchback_quotas").doc(key(quotaKey));
  await database().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists)
      tx.update(ref, { count: Math.max(0, (snap.data()?.count || 0) - 1) });
  });
}
