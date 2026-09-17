"use client";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  AudioLines,
  CheckCircle2,
  Circle,
  FileText,
  PackageCheck,
  Plus,
  ShieldCheck,
  TriangleAlert,
  Truck,
  Upload,
  Wallet,
} from "lucide-react";
import {
  applyAction,
  actionSchema,
  coreInputSchema,
  demoSteps,
  dollarsToCents,
  inspectReadiness,
  money,
  normalizeId,
  parseCsv,
  todayUTC,
  type AuditEvent,
  type Core,
  type CoreAction,
  type Policy,
  type Transcript,
} from "@/lib/domain";
import { Badge, download } from "./benchback-app";
const names: Record<string, string> = {
  settle_deduction: "Supplier deduction accepted",
  reopen_deduction: "Accepted deduction reopened",
  correct_return: "Return dates corrected",
  observe: "Purchase identifiers recorded",
  inspect: "Physical inspection updated",
  confirm_match: "Purchase match confirmed",
  prepare_return: "Return reviewed and prepared",
  dispatch: "Dispatch recorded",
  record_receipt: "Supplier receipt recorded",
  historical_return: "Historical return recorded",
  reverse_credit: "Credit posting reversed",
  add_credit: "Supplier credit posted",
  followup: "Follow-up note recorded",
};
export function CoreDetail({
  core,
  tab,
  setTab,
  events,
  transcript,
  act,
  busy,
  openModal,
  demoIndex,
  nextDemo,
}: {
  core: Core;
  tab: string;
  setTab: (t: string) => void;
  events: AuditEvent[];
  transcript: Transcript[];
  act: (a: CoreAction) => Promise<void>;
  busy: boolean;
  openModal: (s: string) => void;
  demoIndex: number;
  nextDemo: () => void;
  resetDemo: () => void;
}) {
  const [error, setError] = useState("");
  const r = inspectReadiness(core),
    s = core.state;
  async function submit(action: CoreAction) {
    setError("");
    try {
      await act(action);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const checks: [boolean, string][] = [
    [r.matched, "Exact part, invoice, line and job matched"],
    [s.matchConfirmed, "Purchase match confirmed by a person"],
    [
      !core.policy.requireComplete || s.complete === "yes",
      "Required components present",
    ],
    [
      s.packaging === "original" ||
        (s.packaging === "approved_alternative" &&
          core.policy.allowAlternative),
      "Packaging meets this supplier’s policy",
    ],
    [s.labelAttached, "Invoice / core identification label attached"],
    [
      !core.policy.requireRma || !!s.rma,
      "Return authorization requirement satisfied",
    ],
  ];
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>
            {core.job}{" "}
            <span
              className="mono"
              style={{
                fontSize: 13,
                color: "#969faf",
                fontWeight: 400,
                marginLeft: 8,
              }}
            >
              {core.part}
            </span>
          </h2>
          <p className="subtitle">
            {core.supplier} · {core.invoice} / line {core.purchaseLine} ·
            Deposit {money(core.depositCents)}
          </p>
        </div>
        <Badge status={r.status} />
      </div>
      <div className="tabs" role="tablist" aria-label="Core details">
        {["Return checklist", "Conversation", "History", "Inspection form"].map(
          (t) => (
            <button
              key={t}
              className={t === tab ? "active" : ""}
              role="tab"
              aria-selected={t === tab}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ),
        )}
      </div>
      <div className="panel-body">
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {demoIndex >= 0 && (
          <div className="demo-controls">
            <div>
              <strong>
                Scripted walkthrough · {demoIndex + 1}/{demoSteps.length}
              </strong>
              <br />
              {demoSteps[demoIndex]?.title}
            </div>
            {demoIndex < demoSteps.length - 1 ? (
              <button
                className="btn primary small"
                disabled={busy}
                onClick={nextDemo}
              >
                Next moment <ArrowRight size={14} />
              </button>
            ) : (
              <button
                className="btn small"
                onClick={() => setTab("Return checklist")}
              >
                Continue the return <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
        {tab === "Return checklist" && (
          <>
            <div className="money-flow">
              <div>
                <small>Deposit paid</small>
                <strong>{money(core.depositCents)}</strong>
              </div>
              <ArrowRight size={18} />
              <div>
                <small>Actually credited</small>
                <strong className="credited">{money(r.creditedCents)}</strong>
              </div>
              <div className="money-outstanding">
                <small>Still open</small>
                <strong>{money(r.outstandingCents)}</strong>
              </div>
            </div>
            {r.deductionCents > 0 && (
              <div className="alert">
                {money(r.deductionCents)} accepted deduction — not recovered
                credit. {s.deduction?.reason}
              </div>
            )}
            {r.timely === false && (
              <div className="alert error">
                Recorded return is after the policy deadline. Ask the supplier
                to review it.
              </div>
            )}
            {!s.dispatchedAt && (
              <div className={`balance ${r.ready ? "balanced" : ""}`}>
                {r.ready ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <TriangleAlert size={18} />
                )}
                <span>
                  {r.ready
                    ? "Checklist complete. Review and prepare the return."
                    : `${r.blockers.length} ${r.blockers.length === 1 ? "requirement" : "requirements"} to resolve.`}{" "}
                  Return by <strong>{r.deadline}</strong> (
                  {core.policy.deadlineBasis}).
                </span>
              </div>
            )}
            {!!s.credits.length && r.outstandingCents > 0 && (
              <div className="balance">
                <TriangleAlert size={18} />
                <span>
                  <strong>
                    {money(r.outstandingCents)} short of the deposit.
                  </strong>{" "}
                  Ask the supplier for the deduction reason or missing credit.
                  This remains open.
                </span>
              </div>
            )}
            <div className="checklist">
              {checks.map(([done, text]) => (
                <div
                  key={text}
                  className={`checklist-row ${done ? "done" : "pending"}`}
                >
                  {done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                  <span>{text}</span>
                </div>
              ))}
            </div>
            {s.conditionNote && (
              <div className="quote">
                <strong>Technician observations</strong>
                <br />
                {s.conditionNote}
              </div>
            )}
            {s.followup && (
              <div className="quote">
                <strong>Open follow-up</strong>
                <br />
                {s.followup}
              </div>
            )}
            {s.dispatchedAt && (
              <div className="settings-item" style={{ marginTop: 14 }}>
                <span>Dispatch</span>
                <b>
                  {s.dispatchedAt} · {s.dispatchRef}
                </b>
              </div>
            )}
            {s.receivedAt && (
              <div className="settings-item">
                <span>Supplier receipt</span>
                <b>
                  {s.receivedAt} · {s.receiptRef}
                </b>
              </div>
            )}
            {s.dispatchedAt && !s.receivedAt && (
              <div className="alert" style={{ marginTop: 16 }}>
                Supplier receipt is not confirmed.{" "}
                {core.policy.deadlineBasis === "receipt"
                  ? "Dispatch alone does not meet this policy’s deadline."
                  : "Record receipt to start the credit follow-up clock."}
              </div>
            )}
            {s.credits.map((c) => (
              <div className="settings-item" key={c.id}>
                <span>
                  Credit {c.memo} / line {c.lineRef} · {c.date}
                  {c.reversedAt ? " · REVERSED" : ""}
                </span>
                <b style={{ color: "#398064" }}>{money(c.amountCents)}</b>
              </div>
            ))}
            <div className="form-actions" style={{ flexWrap: "wrap" }}>
              {s.dispatchedAt && (
                <button
                  className="btn small"
                  disabled={busy}
                  onClick={() => openModal("correct-return")}
                >
                  Correct return dates
                </button>
              )}
              {s.dispatchedAt && r.outstandingCents > 0 && (
                <button
                  className="btn small"
                  disabled={busy}
                  onClick={() => openModal("settle")}
                >
                  Accept final deduction
                </button>
              )}
              {s.deduction && (
                <button
                  className="btn small"
                  disabled={busy}
                  onClick={() => openModal("reopen")}
                >
                  Reopen deduction
                </button>
              )}
              {!s.dispatchedAt && !s.preparedAt && (
                <button
                  className="btn small"
                  disabled={busy}
                  onClick={() => openModal("historical")}
                >
                  Already returned?
                </button>
              )}
              {!s.dispatchedAt && !s.matchConfirmed && (
                <button
                  className="btn"
                  disabled={busy || !r.matched}
                  onClick={() => submit({ type: "confirm_match" })}
                >
                  <ClipboardIcon />
                  Confirm purchase match
                </button>
              )}
              {!s.dispatchedAt && !s.preparedAt && (
                <button
                  className="btn primary"
                  disabled={busy || !r.ready}
                  title={r.blockers.join("; ")}
                  onClick={() => submit({ type: "prepare_return" })}
                >
                  <ShieldCheck size={16} />
                  Prepare return
                </button>
              )}
              {s.preparedAt && !s.dispatchedAt && (
                <>
                  <button className="btn" onClick={() => openModal("packet")}>
                    <FileText size={16} />
                    Return packet
                  </button>
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() => openModal("dispatch")}
                  >
                    <Truck size={16} />
                    Record dispatch
                  </button>
                </>
              )}
              {s.dispatchedAt && !s.receivedAt && (
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => openModal("receipt")}
                >
                  Record supplier receipt
                </button>
              )}
              {s.credits.some((c) => !c.reversedAt) && (
                <button
                  className="btn small"
                  disabled={busy}
                  onClick={() => openModal("reverse")}
                >
                  Correct a credit
                </button>
              )}
              {s.dispatchedAt && r.outstandingCents > 0 && (
                <>
                  <button
                    className="btn"
                    disabled={busy}
                    onClick={() => openModal("followup")}
                  >
                    Add follow-up
                  </button>
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() => openModal("credit")}
                  >
                    <Wallet size={16} />
                    Post supplier credit
                  </button>
                </>
              )}
            </div>
            {!s.dispatchedAt && !r.ready && (
              <p className="subtitle">
                {r.blockers[0]}. Use the inspection form or voice assistant.
              </p>
            )}
            {r.status === "Credited" && (
              <div
                className="balance balanced"
                style={{ marginTop: 20, marginBottom: 0 }}
              >
                <CheckCircle2 size={18} />
                The full deposit is covered by posted supplier credit memos.
              </div>
            )}
          </>
        )}
        {tab === "Conversation" &&
          (transcript.length ? (
            <>
              <div className="transcript" aria-live="polite">
                {transcript.map((t) => (
                  <div
                    key={t.id}
                    className={`utterance ${t.speaker !== "Benchback" ? "user" : ""}`}
                  >
                    <b>{t.speaker}</b>
                    {t.text}
                  </div>
                ))}
              </div>
              <p className="subtitle">
                {demoIndex >= 0
                  ? "Scripted example. Live conversations appear here after sign-in."
                  : "Client-reported transcript. Structured updates are separately logged in History."}
              </p>
            </>
          ) : (
            <div className="empty">
              <AudioLines size={30} />
              <p>Your bench conversation will appear here.</p>
              <p>Start the microphone, or use the inspection form.</p>
            </div>
          ))}
        {tab === "History" &&
          (events.length ? (
            <div className="event-list">
              {events.toReversed().map((e) => (
                <div className="event" key={e.id}>
                  <div className="event-title">
                    <span>{names[e.action] || e.action}</span>
                    <span className="event-time">v{e.after.revision}</span>
                  </div>
                  <p>
                    {e.actor} · {e.source} ·{" "}
                    {new Date(e.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {e.note && <p>{e.note}</p>}
                  {e.action === "observe" && (
                    <p className="mono">
                      {e.after.observedInvoice} · {e.after.observedJob} ·{" "}
                      {e.after.observedPart}
                    </p>
                  )}
                  {e.action === "inspect" && (
                    <p>
                      Packaging: {e.before.packaging.replaceAll("_", " ")} →{" "}
                      {e.after.packaging.replaceAll("_", " ")}. Complete:{" "}
                      {e.after.complete}.
                    </p>
                  )}
                  {e.action === "add_credit" && (
                    <p>
                      Posted credit total:{" "}
                      {money(
                        e.before.credits.reduce(
                          (n, c) => n + (c.reversedAt ? 0 : c.amountCents),
                          0,
                        ),
                      )}{" "}
                      →{" "}
                      {money(
                        e.after.credits.reduce(
                          (n, c) => n + (c.reversedAt ? 0 : c.amountCents),
                          0,
                        ),
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <FileText size={29} />
              <p>
                Observations, corrections and decisions will be preserved here.
              </p>
            </div>
          ))}
        {tab === "Inspection form" &&
          (s.dispatchedAt ? (
            <div className="alert">
              This core has been dispatched. Its inspection is locked. Use the
              return checklist to post credits or record a follow-up.
            </div>
          ) : (
            <>
              <form
                key={`match-${core.id}-${s.revision}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  submit({
                    type: "observe",
                    part: String(f.get("part")),
                    invoice: String(f.get("invoice")),
                    job: String(f.get("job")),
                    purchaseLine: String(f.get("purchaseLine")),
                  });
                }}
              >
                <h3>1. Identify the purchase</h3>
                <p className="section-description" style={{ marginTop: 8 }}>
                  Read the actual identifiers. Similar parts can belong to
                  different jobs.
                </p>
                <div className="form-grid">
                  <Field label="Part number">
                    <input
                      name="part"
                      required
                      maxLength={100}
                      defaultValue={s.observedPart}
                      placeholder={core.part}
                    />
                  </Field>
                  <Field label="Purchase invoice">
                    <input
                      name="invoice"
                      required
                      maxLength={80}
                      defaultValue={s.observedInvoice}
                      placeholder={core.invoice}
                    />
                  </Field>
                  <Field label="Invoice line / physical unit reference">
                    <input
                      name="purchaseLine"
                      required
                      maxLength={80}
                      defaultValue={s.observedPurchaseLine || ""}
                      placeholder={core.purchaseLine}
                    />
                  </Field>
                  <Field label="Repair job">
                    <input
                      name="job"
                      required
                      maxLength={80}
                      defaultValue={s.observedJob}
                      placeholder={core.job}
                    />
                  </Field>
                </div>
                <div className="form-actions">
                  <button className="btn" disabled={busy}>
                    Save identifiers
                  </button>
                </div>
              </form>
              <form
                key={`inspect-${core.id}-${s.revision}`}
                style={{
                  borderTop: "1px solid var(--border)",
                  marginTop: 24,
                  paddingTop: 22,
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  submit({
                    type: "inspect",
                    complete: f.get("complete") as "unknown" | "yes" | "no",
                    packaging: f.get("packaging") as Core["state"]["packaging"],
                    labelAttached: f.get("label") === "on",
                    rma: String(f.get("rma")),
                    note: String(f.get("note")),
                  });
                }}
              >
                <h3>2. Inspect the physical core</h3>
                <p className="section-description" style={{ marginTop: 8 }}>
                  Record only what you checked. Unknown is an acceptable answer.
                </p>
                <div className="form-grid">
                  <Field label="All required components present?">
                    <select name="complete" defaultValue={s.complete}>
                      <option value="unknown">Not yet checked</option>
                      <option value="yes">Yes, complete</option>
                      <option value="no">No, components missing</option>
                    </select>
                  </Field>
                  <Field label="Return packaging">
                    <select name="packaging" defaultValue={s.packaging}>
                      <option value="unknown">Not yet checked</option>
                      <option value="original">Original packaging</option>
                      <option value="approved_alternative">
                        Approved alternative
                      </option>
                      <option value="missing">No suitable packaging</option>
                    </select>
                  </Field>
                  <Field label="Supplier authorization reference" full>
                    <input
                      name="rma"
                      maxLength={120}
                      defaultValue={s.rma}
                      placeholder={
                        core.policy.requireRma
                          ? "Required by this policy"
                          : "Optional under this policy"
                      }
                    />
                  </Field>
                  <Field label="Condition and packaging notes" full>
                    <textarea
                      name="note"
                      maxLength={2000}
                      defaultValue={s.conditionNote}
                      placeholder="Describe what you actually observed; record any unresolved questions."
                    />
                  </Field>
                </div>
                {core.policy.allowAlternative && (
                  <div className="quote">
                    Approved alternative: {core.policy.alternativeInstructions}
                  </div>
                )}
                <label className="checkbox-label" style={{ marginTop: 18 }}>
                  <input
                    name="label"
                    type="checkbox"
                    defaultChecked={s.labelAttached}
                  />
                  Invoice / core identification label is attached.
                </label>
                <div className="form-actions">
                  <button className="btn primary" disabled={busy}>
                    Save inspection
                  </button>
                </div>
              </form>
            </>
          ))}
      </div>
    </div>
  );
}
function ClipboardIcon() {
  return <PackageCheck size={16} />;
}
export function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`field ${full ? "full" : ""}`}>
      {label}
      {children}
    </label>
  );
}
export function CoreForm({
  policies,
  busy,
  submit,
  addPolicy,
}: {
  policies: Policy[];
  busy: boolean;
  submit: (d: unknown) => Promise<void>;
  addPolicy: () => void;
}) {
  const [error, setError] = useState("");
  if (!policies.length)
    return (
      <>
        <p className="section-description">
          Add the supplier’s approved return rules before adding a purchase.
        </p>
        <button className="btn primary" onClick={addPolicy}>
          <Plus size={15} />
          Add supplier policy
        </button>
      </>
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          await submit({
            invoice: f.get("invoice"),
            purchaseLine: f.get("purchaseLine"),
            job: f.get("job"),
            part: f.get("part"),
            description: f.get("description"),
            depositCents: dollarsToCents(String(f.get("amount"))),
            shippedDate: f.get("shippedDate"),
            policyId: f.get("policy"),
            exercise: f.get("exercise") === "on",
          });
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <p className="section-description">
        One record per physical core. Use the deposit on the supplier invoice,
        not the replacement part price. Currency: USD.
      </p>
      <div className="form-grid">
        <Field label="Invoice">
          <input
            name="invoice"
            required
            maxLength={80}
            placeholder="INV-8042"
          />
        </Field>
        <Field label="Invoice line / unit reference">
          <input name="purchaseLine" required maxLength={80} defaultValue="1" />
          <small>
            Unique per physical core, e.g. 2-1 and 2-2 for two units on line 2.
          </small>
        </Field>
        <Field label="Repair job">
          <input name="job" required maxLength={80} placeholder="WO-418" />
        </Field>
        <Field label="Part number">
          <input name="part" required minLength={2} maxLength={100} />
        </Field>
        <Field label="Core deposit (USD)">
          <input
            name="amount"
            type="number"
            min="0.01"
            max="1000000"
            step="0.01"
            required
          />
        </Field>
        <Field label="Part description" full>
          <input
            name="description"
            required
            minLength={3}
            maxLength={160}
            placeholder="24V reman alternator"
          />
        </Field>
        <Field label="Supplier shipment date">
          <input name="shippedDate" type="date" max={todayUTC()} required />
        </Field>
        <Field label="Applicable supplier policy">
          <select name="policy">
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.supplier} · {p.version}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="checkbox-label" style={{ marginTop: 20 }}>
        <input name="exercise" type="checkbox" />
        This is a fictional practice purchase.
      </label>
      <div className="form-actions">
        <button className="btn primary" disabled={busy}>
          {busy ? "Saving…" : "Add purchase"}
        </button>
      </div>
    </form>
  );
}
export function PolicyForm({
  busy,
  submit,
}: {
  busy: boolean;
  submit: (d: unknown) => Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          await submit({
            supplier: f.get("supplier"),
            name: f.get("name"),
            version: f.get("version"),
            windowDays: Number(f.get("days")),
            deadlineBasis: f.get("basis"),
            allowAlternative: f.get("alternative") === "on",
            alternativeInstructions: f.get("alternativeInstructions"),
            requireComplete: f.get("complete") === "on",
            requireRma: f.get("rma") === "on",
            creditDays: Number(f.get("creditDays")),
            instructions: f.get("instructions"),
            source: f.get("source"),
            exercise: f.get("exercise") === "on",
          });
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <p className="section-description">
        Copy the rules from your supplier agreement. Don’t assume another
        supplier uses the same terms. New policies do not change existing
        purchase records.
      </p>
      <div className="form-grid">
        <Field label="Supplier">
          <input name="supplier" required minLength={2} maxLength={120} />
        </Field>
        <Field label="Version / effective date">
          <input
            name="version"
            required
            maxLength={50}
            placeholder="v1 · 2026-09-17"
          />
        </Field>
        <Field label="Policy name" full>
          <input
            name="name"
            required
            minLength={3}
            maxLength={120}
            placeholder="Alternator and starter cores"
          />
        </Field>
        <Field label="Return window (calendar days)">
          <input
            name="days"
            type="number"
            min={1}
            max={730}
            defaultValue={60}
            required
          />
        </Field>
        <Field label="Deadline applies to">
          <select name="basis">
            <option value="dispatch">Dispatch date</option>
            <option value="receipt">Supplier receipt date</option>
          </select>
        </Field>
        <Field label="Credit follow-up after receipt (days)">
          <input
            name="creditDays"
            type="number"
            min={1}
            max={180}
            defaultValue={45}
            required
          />
        </Field>
        <Field label="Source reference">
          <input
            name="source"
            maxLength={500}
            placeholder="Agreement title, URL or account contact"
          />
        </Field>
        <Field label="Approved instructions" full>
          <textarea
            name="instructions"
            minLength={10}
            maxLength={4000}
            required
            placeholder="Exact return conditions and limits. Supplier still decides acceptance and actual credit."
          />
        </Field>
        <Field label="Approved alternative packaging requirements" full>
          <textarea
            name="alternativeInstructions"
            maxLength={1000}
            placeholder="Only required when alternative packaging is allowed."
          />
        </Field>
      </div>
      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <label className="checkbox-label">
          <input type="checkbox" name="alternative" />
          Supplier permits alternative packaging as described above.
        </label>
        <label className="checkbox-label">
          <input type="checkbox" name="complete" defaultChecked />
          Complete assembly required.
        </label>
        <label className="checkbox-label">
          <input type="checkbox" name="rma" />
          Supplier authorization (RMA) required.
        </label>
        <label className="checkbox-label">
          <input type="checkbox" name="exercise" />
          These are fictional practice terms.
        </label>
        <label className="checkbox-label">
          <input type="checkbox" required />I checked these terms against an
          authorized supplier source.
        </label>
      </div>
      <div className="form-actions">
        <button className="btn primary" disabled={busy}>
          {busy ? "Saving…" : "Save policy version"}
        </button>
      </div>
    </form>
  );
}
export function RecordActionForm({
  core,
  kind,
  busy,
  submit,
}: {
  core: Core;
  kind: string;
  busy: boolean;
  submit: (a: CoreAction) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const r = inspectReadiness(core);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          let action: CoreAction;
          if (kind === "settle")
            action = {
              type: "settle_deduction",
              reason: String(f.get("note")),
            };
          else if (kind === "reopen")
            action = {
              type: "reopen_deduction",
              reason: String(f.get("note")),
            };
          else if (kind === "correct-return")
            action = {
              type: "correct_return",
              dispatchDate: String(f.get("dispatchDate")),
              dispatchRef: String(f.get("dispatchRef")),
              receiptDate: String(f.get("receiptDate")),
              receiptRef: String(f.get("receiptRef")),
              reason: String(f.get("note")),
            };
          else if (kind === "dispatch")
            action = {
              type: "dispatch",
              reference: String(f.get("reference")),
              date: String(f.get("date")),
            };
          else if (kind === "receipt")
            action = {
              type: "record_receipt",
              reference: String(f.get("reference")),
              date: String(f.get("date")),
            };
          else if (kind === "historical")
            action = {
              type: "historical_return",
              reference: String(f.get("reference")),
              date: String(f.get("date")),
              evidence: String(f.get("note")),
            };
          else if (kind === "reverse")
            action = {
              type: "reverse_credit",
              creditId: String(f.get("creditId")),
              reason: String(f.get("note")),
            };
          else if (kind === "credit")
            action = {
              type: "add_credit",
              memo: String(f.get("memo")),
              lineRef: String(f.get("lineRef")),
              amountCents: dollarsToCents(String(f.get("amount"))),
              date: String(f.get("date")),
              note: String(f.get("note")),
            };
          else action = { type: "followup", note: String(f.get("note")) };
          await submit(actionSchema.parse(action));
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <p className="section-description">
        {kind === "settle"
          ? `Accept ${money(r.outstandingCents)} as a final supplier deduction. This closes the unresolved balance without counting it as recovered credit. You can reopen it later.`
          : kind === "reopen"
            ? "Reopen an accepted deduction before posting further credit or correcting existing credits. History is retained."
            : kind === "correct-return"
              ? "Correct a date or reference from verified documents. The old values remain in history; deadlines and credit follow-up will recalculate."
              : kind === "dispatch"
                ? "Record an actual dispatch. This locks inspection evidence; it does not establish supplier receipt or acceptance."
                : kind === "receipt"
                  ? "Record the supplier’s delivery acknowledgement. It starts the configured credit follow-up clock."
                  : kind === "historical"
                    ? "Bring in a return that already happened, using its real dispatch reference and date. This records historical evidence without inventing a current inspection approval."
                    : kind === "reverse"
                      ? "Reverse an incorrect posting. The original credit stays in history; its memo line can then be allocated correctly."
                      : kind === "credit"
                        ? `Enter the actual memo and its unique line reference. Remaining deposit: ${money(r.outstandingCents)}.`
                        : "Record what remains unresolved. This does not contact the supplier."}
      </p>
      <div className="form-grid">
        {kind === "correct-return" && (
          <>
            <Field label="Correct dispatch date">
              <input
                type="date"
                name="dispatchDate"
                required
                defaultValue={core.state.dispatchedAt || ""}
                max={todayUTC()}
              />
            </Field>
            <Field label="Correct dispatch reference">
              <input
                name="dispatchRef"
                required
                minLength={3}
                maxLength={200}
                defaultValue={core.state.dispatchRef}
              />
            </Field>
            <Field label="Correct supplier receipt date (blank if unconfirmed)">
              <input
                type="date"
                name="receiptDate"
                defaultValue={core.state.receivedAt || ""}
                max={todayUTC()}
              />
            </Field>
            <Field label="Correct receipt reference">
              <input
                name="receiptRef"
                maxLength={200}
                defaultValue={core.state.receiptRef}
              />
            </Field>
          </>
        )}
        {["dispatch", "receipt", "historical"].includes(kind) && (
          <Field
            label={
              kind === "receipt"
                ? "Supplier receipt reference"
                : "Dispatch / pickup reference"
            }
            full
          >
            <input name="reference" minLength={3} maxLength={200} required />
          </Field>
        )}
        {kind === "credit" && (
          <>
            <Field label="Supplier credit memo">
              <input
                name="memo"
                required
                minLength={2}
                maxLength={100}
                placeholder="CM-219"
              />
            </Field>
            <Field label="Memo line reference">
              <input name="lineRef" required maxLength={80} defaultValue="1" />
            </Field>
            <Field label="Actual credit (USD)" full>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                max={r.outstandingCents / 100}
                required
              />
            </Field>
          </>
        )}
        {kind === "reverse" && (
          <Field label="Credit to reverse" full>
            <select name="creditId">
              {core.state.credits
                .filter((c) => !c.reversedAt)
                .map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.memo} / {c.lineRef} · {money(c.amountCents)}
                  </option>
                ))}
            </select>
          </Field>
        )}
        {![
          "followup",
          "reverse",
          "settle",
          "reopen",
          "correct-return",
        ].includes(kind) && (
          <Field label="Actual event date" full>
            <input
              name="date"
              type="date"
              required
              defaultValue={todayUTC()}
              min={
                ["dispatch", "historical"].includes(kind)
                  ? core.shippedDate
                  : core.state.dispatchedAt?.slice(0, 10)
              }
              max={todayUTC()}
            />
          </Field>
        )}
        {!["dispatch", "receipt"].includes(kind) && (
          <Field
            label={
              kind === "reverse"
                ? "Reason for reversal"
                : kind === "historical"
                  ? "Historical evidence / record reference"
                  : "Notes / deduction reason"
            }
            full
          >
            <textarea
              name="note"
              required={kind !== "credit"}
              minLength={
                kind === "historical"
                  ? 12
                  : kind === "reverse"
                    ? 8
                    : kind === "followup"
                      ? 3
                      : undefined
              }
              maxLength={kind === "credit" || kind === "reverse" ? 1000 : 2000}
              defaultValue={kind === "followup" ? core.state.followup : ""}
            />
          </Field>
        )}
      </div>
      <label className="checkbox-label" style={{ marginTop: 18 }}>
        <input type="checkbox" required />I verified this action against the
        source record.
      </label>
      <div className="form-actions">
        <button className="btn primary" disabled={busy}>
          {busy
            ? "Saving…"
            : kind === "credit"
              ? "Post credit"
              : kind === "reverse"
                ? "Confirm reversal"
                : "Save record"}
        </button>
      </div>
    </form>
  );
}
export function ImportForm({
  kind,
  policies,
  cores,
  busy,
  isDemo,
  submit,
}: {
  kind: "purchases" | "credits";
  policies: Policy[];
  cores: Core[];
  busy: boolean;
  isDemo: boolean;
  submit: (d: unknown) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null);
  const [policyId, setPolicyId] = useState(policies[0]?.id || "");
  const [payload, setPayload] = useState<unknown>(null);
  const sample =
    kind === "purchases"
      ? `invoice,purchase_line,job,part,description,deposit_usd,shipped_date\nINV-9001,1,WO-501,ALT-12-130,12V reman alternator,165.00,${todayUTC()}`
      : `invoice,purchase_line,job,part,memo,memo_line,credit_usd,date,note\nINV-8042,1,WO-418,ALT-24-160,CM-219,1,200.00,${todayUTC()},Supplier credited less than the deposit`;
  function validate() {
    setError("");
    setPreview(null);
    try {
      const rows = parseCsv(text);
      if (!rows.length) throw new Error("Add at least one data row.");
      if (kind === "purchases") {
        const parsed = rows.map((row) =>
          coreInputSchema.parse({
            invoice: row.invoice,
            purchaseLine: row.purchase_line || "1",
            job: row.job,
            part: row.part,
            description: row.description,
            depositCents: dollarsToCents(row.deposit_usd || ""),
            shippedDate: row.shipped_date,
            policyId,
            exercise: false,
          }),
        );
        setPayload(parsed);
      } else {
        const items = rows.map((row, i) => {
          const matches = cores.filter(
            (c) =>
              normalizeId(c.invoice) === normalizeId(row.invoice || "") &&
              normalizeId(c.purchaseLine) ===
                normalizeId(row.purchase_line || "1") &&
              normalizeId(c.job) === normalizeId(row.job || "") &&
              normalizeId(c.part) === normalizeId(row.part || ""),
          );
          if (matches.length !== 1)
            throw new Error(
              `Row ${i + 2}: invoice, job and part must match exactly one purchase.`,
            );
          const c = matches[0];
          const a = {
            type: "add_credit",
            memo: row.memo,
            lineRef: row.memo_line || "1",
            amountCents: dollarsToCents(row.credit_usd || ""),
            date: row.date,
            note: row.note || "",
          } as const;
          applyAction(c, actionSchema.parse(a), "Import preview", "owner");
          return {
            coreId: c.id,
            revision: c.state.revision,
            memo: a.memo,
            lineRef: a.lineRef,
            amountCents: a.amountCents,
            date: a.date,
            note: a.note,
          };
        });
        if (new Set(items.map((i) => i.coreId)).size !== items.length)
          throw new Error("Import one memo per core at a time.");
        setPayload({ items });
      }
      setPreview(rows);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <p className="section-description">
        {kind === "credits"
          ? "Match each memo to the exact invoice, job and part. Preview first; no money moves."
          : "Import up to 200 purchase records at a time. One physical core per record. Amounts in USD."}
      </p>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {kind === "purchases" && (
        <label className="field" style={{ marginBottom: 15 }}>
          Policy to attach to every imported purchase
          <select
            value={policyId}
            onChange={(e) => {
              setPolicyId(e.target.value);
              setPreview(null);
            }}
          >
            {policies.map((p) => (
              <option value={p.id} key={p.id}>
                {p.supplier} · {p.version}
              </option>
            ))}
          </select>
        </label>
      )}
      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 15 }}
      >
        <label className="btn">
          <Upload size={14} />
          Choose CSV
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 500000) {
                setError("Choose a CSV smaller than 500 KB.");
                return;
              }
              setText(await file.text());
              setPreview(null);
            }}
          />
        </label>
        <button
          className="btn"
          onClick={() =>
            download(
              `benchback-${kind}-template.csv`,
              sample,
              "text/csv;charset=utf-8",
            )
          }
        >
          Download template
        </button>
        {kind === "credits" && (
          <button
            className="btn"
            onClick={() => {
              setText(sample);
              setPreview(null);
            }}
          >
            Use sample $200 memo
          </button>
        )}
      </div>
      <label className="field">
        CSV content
        <textarea
          style={{
            minHeight: 150,
            fontFamily: "ui-monospace,monospace",
            fontSize: 12,
          }}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
          }}
          placeholder={sample}
        />
      </label>
      {preview && (
        <>
          <div className="balance balanced" style={{ marginTop: 18 }}>
            <CheckCircle2 size={17} />
            {preview.length} validated {preview.length === 1 ? "row" : "rows"}.
            Review before importing.
          </div>
          <div className="table-wrap" style={{ maxHeight: 240 }}>
            <table>
              <thead>
                <tr>
                  {Object.keys(preview[0]).map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="form-actions">
        <button
          className="btn"
          disabled={!text.trim() || busy}
          onClick={validate}
        >
          Validate & preview
        </button>
        <button
          className="btn primary"
          disabled={!preview || busy}
          onClick={async () => {
            setError("");
            try {
              await submit(payload);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          {busy
            ? "Importing…"
            : `Import${preview ? " " + preview.length + (preview.length === 1 ? " row" : " rows") : ""}`}
        </button>
      </div>
      {isDemo && (
        <p className="subtitle">
          This changes only the fictional demo. Refreshing resets it.
        </p>
      )}
    </>
  );
}
