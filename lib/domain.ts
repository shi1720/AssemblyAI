import { z } from "zod";

export type Packaging =
  | "unknown"
  | "original"
  | "approved_alternative"
  | "missing";
export type Policy = {
  id: string;
  supplier: string;
  name: string;
  version: string;
  windowDays: number;
  deadlineBasis: "dispatch" | "receipt";
  allowAlternative: boolean;
  alternativeInstructions: string;
  requireComplete: boolean;
  requireRma: boolean;
  creditDays: number;
  instructions: string;
  source: string;
  exercise: boolean;
};
export type Credit = {
  id: string;
  memo: string;
  lineRef: string;
  amountCents: number;
  date: string;
  note: string;
  reversedAt?: string;
  reversalReason?: string;
};
export type CoreState = {
  revision: number;
  observedPart: string;
  observedInvoice: string;
  observedJob: string;
  observedPurchaseLine?: string;
  deduction?: {
    amountCents: number;
    reason: string;
    at: string;
    actor: string;
  };
  complete: "unknown" | "yes" | "no";
  packaging: Packaging;
  conditionNote: string;
  labelAttached: boolean;
  rma: string;
  matchConfirmed: boolean;
  preparedAt: string | null;
  preparedBy: string;
  dispatchedAt: string | null;
  dispatchRef: string;
  receivedAt: string | null;
  receiptRef: string;
  followup: string;
  credits: Credit[];
};
export type Core = {
  id: string;
  invoice: string;
  purchaseLine: string;
  job: string;
  part: string;
  description: string;
  depositCents: number;
  shippedDate: string;
  supplier: string;
  policy: Policy;
  state: CoreState;
  exercise: boolean;
  createdAt: string;
};
export type AuditEvent = {
  id: string;
  coreId: string;
  action: string;
  actor: string;
  source: string;
  at: string;
  before: CoreState;
  after: CoreState;
  note: string;
};
export type Transcript = {
  id: string;
  speaker: string;
  text: string;
  coreId?: string;
};
export const emptyState = (): CoreState => ({
  revision: 0,
  observedPart: "",
  observedInvoice: "",
  observedJob: "",
  complete: "unknown",
  packaging: "unknown",
  conditionNote: "",
  labelAttached: false,
  rma: "",
  matchConfirmed: false,
  preparedAt: null,
  preparedBy: "",
  dispatchedAt: null,
  dispatchRef: "",
  receivedAt: null,
  receiptRef: "",
  followup: "",
  credits: [],
});
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Use a valid date in YYYY-MM-DD format.",
  );
export const moneySchema = z.number().int().min(1).max(100000000);
export const policySchema = z
  .object({
    supplier: z.string().trim().min(2).max(120),
    name: z.string().trim().min(3).max(120),
    version: z.string().trim().min(1).max(50),
    windowDays: z.number().int().min(1).max(730),
    deadlineBasis: z.enum(["dispatch", "receipt"]),
    allowAlternative: z.boolean(),
    alternativeInstructions: z.string().max(1000),
    requireComplete: z.boolean(),
    requireRma: z.boolean(),
    creditDays: z.number().int().min(1).max(180),
    instructions: z.string().trim().min(10).max(4000),
    source: z.string().max(500),
    exercise: z.boolean(),
  })
  .refine(
    (p) => !p.allowAlternative || p.alternativeInstructions.trim().length >= 10,
    "Describe the approved alternative packaging.",
  );
export const coreInputSchema = z.object({
  invoice: z.string().trim().min(1).max(80),
  purchaseLine: z.string().trim().min(1).max(80).default("1"),
  job: z.string().trim().min(1).max(80),
  part: z.string().trim().min(2).max(100),
  description: z.string().trim().min(3).max(160),
  depositCents: moneySchema,
  shippedDate: dateSchema,
  policyId: z.string().min(1).max(80),
  exercise: z.boolean(),
});
export const actionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("settle_deduction"),
      reason: z.string().trim().min(12).max(1000),
    })
    .strict(),
  z
    .object({
      type: z.literal("reopen_deduction"),
      reason: z.string().trim().min(8).max(1000),
    })
    .strict(),
  z
    .object({
      type: z.literal("correct_return"),
      dispatchDate: dateSchema,
      dispatchRef: z.string().trim().min(3).max(200),
      receiptDate: z.union([dateSchema, z.literal("")]),
      receiptRef: z.string().max(200),
      reason: z.string().trim().min(12).max(1000),
    })
    .strict(),
  z
    .object({
      type: z.literal("observe"),
      part: z.string().max(100),
      invoice: z.string().max(80),
      job: z.string().max(80),
      purchaseLine: z.string().trim().min(1).max(80).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("inspect"),
      complete: z.enum(["unknown", "yes", "no"]),
      packaging: z.enum([
        "unknown",
        "original",
        "approved_alternative",
        "missing",
      ]),
      labelAttached: z.boolean(),
      rma: z.string().max(120),
      note: z.string().max(2000),
    })
    .strict(),
  z.object({ type: z.literal("confirm_match") }).strict(),
  z.object({ type: z.literal("prepare_return") }).strict(),
  z
    .object({
      type: z.literal("dispatch"),
      reference: z.string().trim().min(3).max(200),
      date: dateSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("add_credit"),
      memo: z.string().trim().min(2).max(100),
      lineRef: z.string().trim().min(1).max(80).default("1"),
      amountCents: moneySchema,
      date: dateSchema,
      note: z.string().max(1000),
    })
    .strict(),
  z
    .object({
      type: z.literal("record_receipt"),
      reference: z.string().trim().min(3).max(200),
      date: dateSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("reverse_credit"),
      creditId: z.string().min(1),
      reason: z.string().trim().min(8).max(1000),
    })
    .strict(),
  z
    .object({
      type: z.literal("historical_return"),
      reference: z.string().trim().min(3).max(200),
      date: dateSchema,
      evidence: z.string().trim().min(12).max(2000),
    })
    .strict(),
  z
    .object({
      type: z.literal("followup"),
      note: z.string().trim().min(3).max(2000),
    })
    .strict(),
]);
export type CoreAction = z.infer<typeof actionSchema>;
export function normalizeId(s: string) {
  return s.trim().toUpperCase().replace(/[\s-]/g, "");
}
export function addDays(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}
export function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
export function inspectReadiness(core: Core, today = todayUTC()) {
  const s = core.state;
  const p = core.policy;
  const deadline = addDays(core.shippedDate, p.windowDays);
  const daysLeft = Math.round(
    (Date.parse(deadline) - Date.parse(today)) / 86400000,
  );
  const matched =
    normalizeId(s.observedPart) === normalizeId(core.part) &&
    normalizeId(s.observedInvoice) === normalizeId(core.invoice) &&
    normalizeId(s.observedJob) === normalizeId(core.job) &&
    normalizeId(s.observedPurchaseLine || "1") ===
      normalizeId(core.purchaseLine);
  const blockers: string[] = [];
  if (!matched) blockers.push("Confirm the exact part, invoice and job match");
  if (!s.matchConfirmed)
    blockers.push("A person must confirm the purchase match");
  if (p.requireComplete && s.complete !== "yes")
    blockers.push(
      s.complete === "no"
        ? "Core is incomplete; ask the supplier before proceeding"
        : "Confirm all required components are present",
    );
  if (s.packaging === "unknown" || s.packaging === "missing")
    blockers.push("Confirm acceptable return packaging");
  if (s.packaging === "approved_alternative" && !p.allowAlternative)
    blockers.push("This policy requires original packaging");
  if (!s.labelAttached)
    blockers.push("Attach the invoice / core identification label");
  if (p.requireRma && !s.rma.trim())
    blockers.push("Add the supplier return authorization");
  if (daysLeft < 0 && !s.dispatchedAt)
    blockers.push("Return window has passed; contact the supplier");
  const creditedCents = s.credits.reduce(
    (a, c) => a + (c.reversedAt ? 0 : c.amountCents),
    0,
  );
  const deductionCents = s.deduction?.amountCents || 0;
  const outstandingCents = core.depositCents - creditedCents - deductionCents;
  const creditDue = s.receivedAt
    ? addDays(s.receivedAt.slice(0, 10), p.creditDays)
    : null;
  const deadlineEvent =
    p.deadlineBasis === "receipt" ? s.receivedAt : s.dispatchedAt;
  const timely = deadlineEvent ? deadlineEvent.slice(0, 10) <= deadline : null;
  const receiptPending = !!s.dispatchedAt && !s.receivedAt;
  if (s.dispatchedAt && p.deadlineBasis === "receipt" && !s.receivedAt)
    blockers.push(
      "Supplier receipt is unconfirmed; dispatch does not establish an on-time return",
    );
  if (timely === false)
    blockers.push(
      "The recorded return event is after the policy deadline; supplier review required",
    );
  const status =
    creditedCents >= core.depositCents
      ? "Credited"
      : outstandingCents === 0 && deductionCents > 0
        ? "Closed with deduction"
        : creditedCents > 0
          ? "Short credit"
          : s.dispatchedAt
            ? s.receivedAt
              ? "Awaiting credit"
              : "In transit"
            : s.preparedAt
              ? "Ready to return"
              : "Needs inspection";
  return {
    deadline,
    daysLeft,
    timely,
    receiptPending,
    matched,
    blockers,
    ready: blockers.length === 0,
    creditedCents,
    deductionCents,
    outstandingCents,
    creditDue,
    creditOverdue: !!creditDue && today > creditDue && outstandingCents > 0,
    status,
  };
}
/** Business transitions are independent of model prompts. Voice cannot approve, dispatch or post money. */
export function applyAction(
  core: Core,
  action: CoreAction,
  actor: string,
  role: "owner" | "agent",
  at = new Date().toISOString(),
): CoreState {
  const s = structuredClone(core.state);
  const today = at.slice(0, 10);
  if (
    role === "agent" &&
    !["observe", "inspect", "followup"].includes(action.type)
  )
    throw new Error(
      "A person must confirm purchases, prepare returns, record dispatch and post supplier credits.",
    );
  if (
    s.dispatchedAt &&
    ["observe", "inspect", "confirm_match", "prepare_return"].includes(
      action.type,
    )
  )
    throw new Error(
      "This core has already been dispatched. The return evidence is locked. Add a follow-up note instead.",
    );
  switch (action.type) {
    case "settle_deduction": {
      const remaining = inspectReadiness(core, today).outstandingCents;
      if (!s.dispatchedAt || remaining <= 0 || s.deduction)
        throw new Error(
          "A returned core with an unresolved balance is required.",
        );
      s.deduction = {
        amountCents: remaining,
        reason: action.reason,
        actor,
        at,
      };
      break;
    }
    case "reopen_deduction":
      if (!s.deduction)
        throw new Error("There is no accepted deduction to reopen.");
      delete s.deduction;
      s.followup = "Deduction reopened: " + action.reason;
      break;
    case "correct_return": {
      if (!s.dispatchedAt) throw new Error("Record an actual dispatch first.");
      if (action.dispatchDate < core.shippedDate || action.dispatchDate > today)
        throw new Error(
          "Corrected dispatch must be between purchase shipment and today.",
        );
      if (
        action.receiptDate &&
        (action.receiptDate < action.dispatchDate ||
          action.receiptDate > today ||
          action.receiptRef.trim().length < 3)
      )
        throw new Error(
          "Corrected receipt needs a reference and a date between dispatch and today.",
        );
      if (s.credits.some((c) => !c.reversedAt && c.date < action.dispatchDate))
        throw new Error(
          "Dispatch cannot be later than a posted credit. Correct the credit first.",
        );
      s.dispatchedAt = action.dispatchDate;
      s.dispatchRef = action.dispatchRef;
      s.receivedAt = action.receiptDate || null;
      s.receiptRef = action.receiptDate ? action.receiptRef : "";
      s.followup = "Return dates corrected: " + action.reason;
      break;
    }
    case "observe":
      s.observedPart = action.part.trim();
      s.observedInvoice = action.invoice.trim();
      s.observedJob = action.job.trim();
      s.observedPurchaseLine = action.purchaseLine?.trim() || "1";
      s.matchConfirmed = false;
      s.preparedAt = null;
      s.preparedBy = "";
      break;
    case "inspect":
      s.complete = action.complete;
      s.packaging = action.packaging;
      s.labelAttached = action.labelAttached;
      s.rma = action.rma.trim();
      s.conditionNote = action.note.trim();
      s.preparedAt = null;
      s.preparedBy = "";
      break;
    case "confirm_match":
      if (!inspectReadiness(core, today).matched)
        throw new Error(
          "Part, invoice and job must all match before confirmation.",
        );
      s.matchConfirmed = true;
      break;
    case "prepare_return": {
      const r = inspectReadiness(core, today);
      if (!r.ready)
        throw new Error("Return blocked: " + r.blockers.join("; ") + ".");
      s.preparedAt = at;
      s.preparedBy = actor;
      break;
    }
    case "dispatch":
      if (!s.preparedAt)
        throw new Error(
          "Review and prepare the return before recording dispatch.",
        );
      if (s.dispatchedAt)
        throw new Error("Dispatch has already been recorded.");
      if (action.date < core.shippedDate || action.date > today)
        throw new Error(
          "Dispatch date must be between the purchase shipment date and today.",
        );
      s.dispatchedAt = action.date;
      s.dispatchRef = action.reference;
      break;
    case "record_receipt":
      if (!s.dispatchedAt)
        throw new Error("Record dispatch before supplier receipt.");
      if (s.receivedAt)
        throw new Error(
          "Receipt has already been recorded. Add a correction note if needed.",
        );
      if (action.date < s.dispatchedAt.slice(0, 10) || action.date > today)
        throw new Error("Receipt date must be between dispatch and today.");
      s.receivedAt = action.date;
      s.receiptRef = action.reference;
      break;
    case "historical_return":
      if (s.dispatchedAt || s.preparedAt)
        throw new Error("This record already has a preparation or dispatch.");
      if (action.date < core.shippedDate || action.date > today)
        throw new Error(
          "Historical dispatch date must be between purchase shipment and today.",
        );
      s.dispatchedAt = action.date;
      s.dispatchRef = action.reference;
      s.followup =
        "Historical return imported from shop evidence: " + action.evidence;
      break;
    case "reverse_credit": {
      if (s.deduction)
        throw new Error(
          "Reopen the accepted deduction before changing credits.",
        );
      const credit = s.credits.find((c) => c.id === action.creditId);
      if (!credit || credit.reversedAt)
        throw new Error(
          "This credit does not exist or has already been reversed.",
        );
      credit.reversedAt = at;
      credit.reversalReason = action.reason;
      break;
    }
    case "add_credit":
      if (s.deduction)
        throw new Error(
          "Reopen the accepted deduction before posting more credit.",
        );
      if (!s.dispatchedAt)
        throw new Error(
          "Record the physical return before posting a supplier credit.",
        );
      if (action.date < s.dispatchedAt.slice(0, 10) || action.date > today)
        throw new Error("Credit date must be between dispatch and today.");
      if (
        s.credits.some(
          (c) =>
            !c.reversedAt &&
            normalizeId(c.memo) === normalizeId(action.memo) &&
            normalizeId(c.lineRef || "1") === normalizeId(action.lineRef),
        )
      )
        throw new Error("This credit memo is already posted to this core.");
      if (
        s.credits.reduce((n, c) => n + (c.reversedAt ? 0 : c.amountCents), 0) +
          action.amountCents >
        core.depositCents
      )
        throw new Error(
          "Credit exceeds the remaining deposit. Check the memo or record an external adjustment.",
        );
      s.credits.push({
        id: crypto.randomUUID(),
        memo: action.memo,
        lineRef: action.lineRef,
        amountCents: action.amountCents,
        date: action.date,
        note: action.note,
      });
      break;
    case "followup":
      s.followup = action.note;
      break;
  }
  s.revision++;
  return s;
}
export function searchCores(cores: Core[], query: string, limit = 12) {
  const q = normalizeId(query);
  if (!q) return [];
  return cores
    .filter((c) =>
      [c.invoice, c.job, c.part, c.description].some((s) =>
        normalizeId(s).includes(q),
      ),
    )
    .slice(0, limit);
}
export function demoPolicy(): Policy {
  return {
    id: "policy-northline",
    supplier: "Northline Parts",
    name: "Dry electrical core returns",
    version: "Demo terms · v1",
    windowDays: 60,
    deadlineBasis: "dispatch",
    allowAlternative: true,
    alternativeInstructions:
      "Use a sturdy protective container secured on a pallet, with the invoice/core identification label attached. Confirm these sample terms with the actual supplier before a real shipment.",
    requireComplete: true,
    requireRma: false,
    creditDays: 45,
    instructions:
      "Return the matching, complete alternator or starter. Original packaging or the specified approved alternative is accepted. Keep the invoice reference with the core. The supplier inspects the returned unit and determines actual credit; the deposit is not a guarantee of acceptance. These are fictional demonstration terms.",
    source: "Fictional supplier policy for the Benchback demonstration.",
    exercise: true,
  };
}
export function demoCores(today = todayUTC()): Core[] {
  const p = demoPolicy();
  const base = {
    purchaseLine: "1",
    supplier: p.supplier,
    policy: p,
    exercise: true,
    createdAt: new Date().toISOString(),
  };
  const complete: CoreState = {
    ...emptyState(),
    revision: 4,
    observedPart: "STR-12-90",
    observedInvoice: "INV-7998",
    observedJob: "WO-403",
    complete: "yes",
    packaging: "original",
    labelAttached: true,
    matchConfirmed: true,
    preparedAt: today + "T08:00:00Z",
    preparedBy: "Demo parts manager",
  };
  return [
    {
      ...base,
      id: "core-418",
      invoice: "INV-8042",
      job: "WO-418",
      part: "ALT-24-160",
      description: "24V reman alternator",
      depositCents: 24000,
      shippedDate: addDays(today, -56),
      state: emptyState(),
    },
    {
      ...base,
      id: "core-403",
      invoice: "INV-7998",
      job: "WO-403",
      part: "STR-12-90",
      description: "12V heavy-duty starter",
      depositCents: 18000,
      shippedDate: addDays(today, -43),
      state: complete,
    },
    {
      ...base,
      id: "core-397",
      invoice: "INV-7901",
      job: "WO-397",
      part: "ALT-24-160",
      description: "24V reman alternator",
      depositCents: 24000,
      shippedDate: addDays(today, -65),
      state: {
        ...complete,
        revision: 7,
        observedPart: "ALT-24-160",
        observedInvoice: "INV-7901",
        observedJob: "WO-397",
        dispatchedAt: addDays(today, -22),
        dispatchRef: "PICKUP-091",
        receivedAt: addDays(today, -20),
        receiptRef: "RCV-091",
        credits: [
          {
            id: "credit-old",
            memo: "CM-201",
            lineRef: "1",
            amountCents: 24000,
            date: addDays(today, -5),
            note: "Sample full supplier credit",
          },
        ],
      },
    },
    {
      ...base,
      id: "core-409",
      invoice: "INV-8016",
      job: "WO-409",
      part: "STR-24-110",
      description: "24V gear-reduction starter",
      depositCents: 32000,
      shippedDate: addDays(today, -31),
      state: {
        ...complete,
        revision: 6,
        observedPart: "STR-24-110",
        observedInvoice: "INV-8016",
        observedJob: "WO-409",
        dispatchedAt: addDays(today, -8),
        dispatchRef: "PICKUP-104",
        receivedAt: addDays(today, -6),
        receiptRef: "RCV-104",
        credits: [
          {
            id: "credit-partial",
            memo: "CM-214",
            lineRef: "1",
            amountCents: 27500,
            date: addDays(today, -2),
            note: "Sample credit memo; deduction reason not supplied.",
          },
        ],
      },
    },
    {
      ...base,
      id: "core-422",
      invoice: "INV-8061",
      job: "WO-422",
      part: "ALT-12-130",
      description: "12V reman alternator",
      depositCents: 16500,
      shippedDate: addDays(today, -15),
      state: emptyState(),
    },
  ];
}
export const demoSteps: {
  speaker: string;
  text: string;
  action?: CoreAction;
  title: string;
}[] = [
  {
    speaker: "Technician",
    text: "I’ve got the old 24-volt alternator from job 418. Is this just scrap?",
    title: "An old part. A real deposit.",
  },
  {
    speaker: "Benchback",
    text: "I found two purchases for that alternator. Job 418 is invoice INV-8042, with a $240 deposit. Can you confirm that invoice and the full part number?",
    title: "A similar part is not a purchase match",
  },
  {
    speaker: "Technician",
    text: "The invoice is INV-8042, part ALT-24-160, job WO-418.",
    action: {
      type: "observe",
      part: "ALT-24-160",
      invoice: "INV-8042",
      job: "WO-418",
    },
    title: "Matched to the purchase, not guessed",
  },
  {
    speaker: "Technician",
    text: "But the original box is gone. We should probably write it off.",
    title: "The expensive assumption",
  },
  {
    speaker: "Benchback",
    text: "Your Northline policy allows a sturdy protective container on a pallet, with the invoice label. Missing the original box does not automatically mean losing the deposit. Is the core complete?",
    title: "A supplier-specific way forward",
  },
  {
    speaker: "Technician",
    text: "Yes. All components are here. It’s in the approved container on a pallet. I attached the invoice label.",
    action: {
      type: "inspect",
      complete: "yes",
      packaging: "approved_alternative",
      labelAttached: true,
      rma: "",
      note: "Original box missing. Technician reports complete assembly, approved alternate container secured on pallet, and invoice label attached.",
    },
    title: "Ready for a human to confirm",
  },
  {
    speaker: "Benchback",
    text: "The checklist is complete. Please confirm the purchase match and prepare the return on screen. This is $240 expected, not $240 recovered. I’ll track the supplier credit separately.",
    title: "Expected is not recovered",
  },
];
export function csvCell(v: unknown) {
  const s = String(v ?? "");
  return (
    '"' + (/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'
  );
}
export function exportCsv(cores: Core[]) {
  return [
    [
      "invoice",
      "purchase_line",
      "job",
      "part",
      "supplier",
      "deposit_usd",
      "credited_usd",
      "accepted_deduction_usd",
      "outstanding_usd",
      "deadline",
      "status",
      "dispatch_reference",
    ],
    ...cores.map((c) => {
      const r = inspectReadiness(c);
      return [
        c.invoice,
        c.purchaseLine,
        c.job,
        c.part,
        c.supplier,
        (c.depositCents / 100).toFixed(2),
        (r.creditedCents / 100).toFixed(2),
        (r.deductionCents / 100).toFixed(2),
        (r.outstandingCents / 100).toFixed(2),
        r.deadline,
        r.status,
        c.state.dispatchRef,
      ];
    }),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
/** RFC4180-style CSV parser; handles quoted commas/newlines and rejects ragged rows. */
export function parseCsv(text: string): Record<string, string>[] {
  if (text.length > 500000) throw new Error("CSV exceeds 500 KB.");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (quoted) throw new Error("CSV contains an unclosed quote.");
  row.push(field);
  if (row.some((x) => x.trim())) rows.push(row);
  const header = rows.shift()?.map((x) => x.trim().toLowerCase());
  if (!header?.length || new Set(header).size !== header.length)
    throw new Error("CSV needs a unique header row.");
  if (rows.length > 200) throw new Error("Import up to 200 rows at a time.");
  return rows.map((r, i) => {
    if (r.length !== header.length)
      throw new Error(
        `Row ${i + 2} has ${r.length} fields; expected ${header.length}.`,
      );
    return Object.fromEntries(header.map((h, j) => [h, r[j].trim()]));
  });
}
export function dollarsToCents(s: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw new Error(
      "Amounts must be positive numbers with up to two decimal places.",
    );
  const [a, b = ""] = s.split(".");
  return Number(a) * 100 + Number(b.padEnd(2, "0"));
}
