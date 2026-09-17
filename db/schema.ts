import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const policies = sqliteTable(
  "policies",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    data: text("data").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_policies_owner").on(t.owner)],
);
export const cores = sqliteTable(
  "cores",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    purchaseKey: text("purchase_key").notNull(),
    data: text("data").notNull(),
    state: text("state").notNull(),
    revision: integer("revision").notNull().default(0),
    lastEventId: text("last_event_id"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_cores_owner").on(t.owner),
    uniqueIndex("uq_core_purchase").on(t.owner, t.purchaseKey),
  ],
);
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    coreId: text("core_id").notNull(),
    requestId: text("request_id").notNull(),
    fingerprint: text("fingerprint").notNull().default(""),
    data: text("data").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_events_owner_core").on(t.owner, t.coreId),
    uniqueIndex("uq_events_request").on(t.owner, t.requestId),
  ],
);
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    coreId: text("core_id").notNull(),
    createdAt: text("created_at").notNull(),
    endedAt: text("ended_at"),
  },
  (t) => [index("idx_sessions_owner").on(t.owner)],
);
export const transcripts = sqliteTable(
  "transcripts",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    owner: text("owner").notNull(),
    coreId: text("core_id").notNull(),
    speaker: text("speaker").notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_transcripts_owner_core").on(t.owner, t.coreId)],
);
export const quotas = sqliteTable("quotas", {
  id: text("id").primaryKey(),
  count: integer("count").notNull().default(0),
});

export const creditAllocations = sqliteTable(
  "credit_allocations",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    coreId: text("core_id").notNull(),
    sourceKey: text("source_key").notNull(),
    amountCents: integer("amount_cents").notNull(),
    reversed: integer("reversed").notNull().default(0),
  },
  (t) => [
    uniqueIndex("uq_credit_source_active")
      .on(t.owner, t.sourceKey)
      .where(sql`${t.reversed} = 0`),
    index("idx_credit_core").on(t.owner, t.coreId),
  ],
);
