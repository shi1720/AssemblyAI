import { describe, it, expect } from "vitest";
import {
  actionSchema,
  addDays,
  applyAction,
  dateSchema,
  demoCores,
  dollarsToCents,
  inspectReadiness,
  parseCsv,
  csvCell,
  searchCores,
  type Core,
  type CoreAction,
} from "../lib/domain";
const today = "2026-09-17",
  at = today + "T12:00:00.000Z";
function sample() {
  return demoCores(today)[0];
}
function change(c: Core, a: CoreAction, role: "owner" | "agent" = "owner") {
  return { ...c, state: applyAction(c, a, "Test user", role, at) };
}
function ready() {
  let c = sample();
  c = change(c, {
    type: "observe",
    part: c.part,
    invoice: c.invoice,
    job: c.job,
  });
  c = change(c, {
    type: "inspect",
    complete: "yes",
    packaging: "approved_alternative",
    labelAttached: true,
    rma: "",
    note: "Complete assembly; protective container secured on pallet.",
  });
  c = change(c, { type: "confirm_match" });
  return c;
}
function dispatched() {
  const c = change(ready(), { type: "prepare_return" });
  return change(c, { type: "dispatch", reference: "PICKUP-220", date: today });
}
const credit = (
  amountCents = 20000,
  memo = "CM-219",
  lineRef = "1",
): CoreAction => ({
  type: "add_credit",
  amountCents,
  memo,
  lineRef,
  date: today,
  note: "Supplier memo checked",
});
describe("purchase identity and supplier policy", () => {
  it("does not guess between two identical part purchases", () => {
    expect(searchCores(demoCores(today), "ALT-24-160")).toHaveLength(2);
  });
  it("does not permit suffix-only purchase matches", () => {
    const c = change(sample(), {
      type: "observe",
      part: "160",
      invoice: "8042",
      job: "418",
    });
    expect(inspectReadiness(c, today).matched).toBe(false);
    expect(() => change(c, { type: "confirm_match" })).toThrow(
      /must all match/,
    );
  });
  it("normalizes spacing/case/hyphens but not O versus zero", () => {
    const c = sample();
    expect(
      inspectReadiness(
        change(c, {
          type: "observe",
          part: "alt 24 160",
          invoice: "inv8042",
          job: "wo 418",
        }),
        today,
      ).matched,
    ).toBe(true);
    expect(
      inspectReadiness(
        change(c, {
          type: "observe",
          part: "ALT-24-16O",
          invoice: c.invoice,
          job: c.job,
        }),
        today,
      ).matched,
    ).toBe(false);
  });
  it("requires a human after complete agent observations", () => {
    const c = ready();
    c.state.matchConfirmed = false;
    expect(inspectReadiness(c, today).ready).toBe(false);
    expect(() => change(c, { type: "confirm_match" }, "agent")).toThrow(
      /person/,
    );
  });
  it("honors allowed alternate packaging without inventing blanket permission", () => {
    expect(inspectReadiness(ready(), today).ready).toBe(true);
    const c = ready();
    c.policy.allowAlternative = false;
    expect(inspectReadiness(c, today).blockers).toContain(
      "This policy requires original packaging",
    );
  });
  it("unknown completeness blocks a required complete core", () => {
    const c = ready();
    c.state.complete = "unknown";
    expect(inspectReadiness(c, today).ready).toBe(false);
  });
  it("requires configured supplier authorization", () => {
    const c = ready();
    c.policy.requireRma = true;
    expect(inspectReadiness(c, today).ready).toBe(false);
    c.state.rma = "RMA-55";
    expect(inspectReadiness(c, today).ready).toBe(true);
  });
  it("a correction invalidates preparation without mutating the prior state", () => {
    const before = change(ready(), { type: "prepare_return" });
    const after = change(before, {
      type: "inspect",
      complete: "yes",
      packaging: "missing",
      labelAttached: true,
      rma: "",
      note: "Found the container was not approved.",
    });
    expect(after.state.preparedAt).toBeNull();
    expect(before.state.preparedAt).not.toBeNull();
    expect(after.state.revision).toBe(before.state.revision + 1);
  });
});
describe("money and workflow boundaries", () => {
  it("preparing a return never creates recovered cash", () => {
    const c = change(ready(), { type: "prepare_return" });
    expect(inspectReadiness(c, today).creditedCents).toBe(0);
    expect(inspectReadiness(c, today).outstandingCents).toBe(24000);
  });
  it.each([
    "prepare_return",
    "dispatch",
    "add_credit",
    "reverse_credit",
    "historical_return",
    "record_receipt",
  ])("agent cannot %s", (type) => {
    expect(() =>
      applyAction(sample(), { type } as CoreAction, "Agent", "agent", at),
    ).toThrow(/person/);
  });
  it("prevents posting a credit before a return is dispatched", () =>
    expect(() => change(ready(), credit())).toThrow(/physical return/));
  it("keeps a partial credit open then closes only with a real second memo", () => {
    let c = change(dispatched(), credit());
    expect(inspectReadiness(c, today).status).toBe("Short credit");
    expect(inspectReadiness(c, today).outstandingCents).toBe(4000);
    c = change(c, credit(4000, "CM-220"));
    expect(inspectReadiness(c, today).status).toBe("Credited");
  });
  it("rejects duplicate memo lines and over-credit", () => {
    const c = change(dispatched(), credit());
    expect(() => change(c, credit(1000))).toThrow(/already posted/);
    expect(() => change(c, credit(5000, "CM-220"))).toThrow(/exceeds/);
  });
  it("supports two distinct lines of one memo", () => {
    const c = change(
      change(dispatched(), credit()),
      credit(4000, "CM-219", "2"),
    );
    expect(inspectReadiness(c, today).creditedCents).toBe(24000);
  });
  it("reverses mistakes without deleting evidence and allows corrected repost", () => {
    let c = change(dispatched(), credit());
    const id = c.state.credits[0].id;
    c = change(c, {
      type: "reverse_credit",
      creditId: id,
      reason: "Posted amount belongs to another invoice.",
    });
    expect(c.state.credits).toHaveLength(1);
    expect(c.state.credits[0].reversedAt).toBe(at);
    expect(inspectReadiness(c, today).creditedCents).toBe(0);
    c = change(c, credit(24000));
    expect(c.state.credits).toHaveLength(2);
    expect(inspectReadiness(c, today).creditedCents).toBe(24000);
  });
  it("locks dispatched inspection and rejects repeat dispatch", () => {
    const c = dispatched();
    expect(() =>
      change(c, {
        type: "observe",
        part: c.part,
        invoice: c.invoice,
        job: c.job,
      }),
    ).toThrow(/locked/);
    expect(() =>
      change(c, { type: "dispatch", reference: "different", date: today }),
    ).toThrow(/already/);
  });
  it("uses integer cents for decimal amounts", () => {
    expect(dollarsToCents("0.29")).toBe(29);
    expect(dollarsToCents("123.4")).toBe(12340);
    expect(() => dollarsToCents("1.001")).toThrow();
    expect(() =>
      actionSchema.parse({ ...credit(), amountCents: -100 }),
    ).toThrow();
  });
});
describe("real dates and receipt-based deadlines", () => {
  it("computes the exact calendar-day boundary", () => {
    expect(addDays("2026-07-23", 60)).toBe("2026-09-21");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("rejects invalid calendar dates and future financial events", () => {
    expect(() => dateSchema.parse("2026-02-30")).toThrow();
    expect(() =>
      change(dispatched(), { ...credit(), date: "2026-09-18" } as CoreAction),
    ).toThrow(/today/);
  });
  it("allows preparation on deadline but not after deadline", () => {
    const c = ready();
    expect(inspectReadiness(c, "2026-09-21").ready).toBe(true);
    expect(inspectReadiness(c, "2026-09-22").ready).toBe(false);
  });
  it("never equates dispatch with receipt for a receipt-based policy", () => {
    const c = dispatched();
    c.policy.deadlineBasis = "receipt";
    const r = inspectReadiness(c, "2026-09-25");
    expect(r.timely).toBeNull();
    expect(r.receiptPending).toBe(true);
    expect(r.ready).toBe(false);
    expect(r.creditDue).toBeNull();
    expect(r.status).toBe("In transit");
  });
  it("starts the credit clock from recorded supplier receipt", () => {
    const c = change(dispatched(), {
      type: "record_receipt",
      reference: "DELIVERY-21",
      date: today,
    });
    expect(inspectReadiness(c, today).creditDue).toBe("2026-11-01");
    expect(inspectReadiness(c, today).status).toBe("Awaiting credit");
  });
  it("preserves late receipt truth and flags policy lateness", () => {
    let c = dispatched();
    c.policy.deadlineBasis = "receipt";
    c = {
      ...c,
      state: applyAction(
        c,
        { type: "record_receipt", reference: "LATE-RCV", date: "2026-09-23" },
        "Owner",
        "owner",
        "2026-09-25T00:00:00Z",
      ),
    };
    expect(inspectReadiness(c, "2026-09-25").timely).toBe(false);
  });
  it("onboards an older return without fabricating present preparation", () => {
    let c = sample();
    c.shippedDate = "2026-06-01";
    c = change(c, {
      type: "historical_return",
      reference: "OLD-PICKUP",
      date: "2026-07-20",
      evidence: "Old pickup receipt verified against the supplier log.",
    });
    expect(c.state.preparedAt).toBeNull();
    expect(c.state.dispatchedAt).toBe("2026-07-20");
    expect(inspectReadiness(c, today).timely).toBe(true);
  });
});
describe("interchange", () => {
  it("handles quoted commas, escaped quotes, BOM and CRLF", () => {
    expect(parseCsv('\uFEFFa,b\r\n"one, two","say ""yes"""\r\n')).toEqual([
      { a: "one, two", b: 'say "yes"' },
    ]);
  });
  it("rejects malformed or oversized input", () => {
    expect(() => parseCsv('a,b\n"unfinished')).toThrow();
    expect(() => parseCsv("a,a\n1,2")).toThrow();
    expect(() => parseCsv("a,b\n1")).toThrow();
    expect(() => parseCsv("a".repeat(500001))).toThrow();
  });
  it("neutralizes spreadsheet formula injection", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });
});

describe("reconciliation exceptions", () => {
  it("requires the invoice line when otherwise identical purchases collide", () => {
    const c = ready();
    c.purchaseLine = "2";
    expect(inspectReadiness(c, today).matched).toBe(false);
    const corrected = change(c, {
      type: "observe",
      part: c.part,
      invoice: c.invoice,
      job: c.job,
      purchaseLine: "2",
    });
    expect(inspectReadiness(corrected, today).matched).toBe(true);
  });
  it("closes a deduction without reporting it as recovered money", () => {
    let c = change(dispatched(), credit());
    c = change(c, {
      type: "settle_deduction",
      reason: "Supplier documented a damaged pulley deduction. Shop accepts.",
    });
    const r = inspectReadiness(c, today);
    expect(r.creditedCents).toBe(20000);
    expect(r.deductionCents).toBe(4000);
    expect(r.outstandingCents).toBe(0);
    expect(r.status).toBe("Closed with deduction");
    expect(() => change(c, credit(4000, "CM-220"))).toThrow(/Reopen/);
    c = change(c, {
      type: "reopen_deduction",
      reason: "Supplier approved the appeal.",
    });
    c = change(c, credit(4000, "CM-220"));
    expect(inspectReadiness(c, today).status).toBe("Credited");
  });
  it("cannot change financial postings under an accepted settlement", () => {
    let c = change(dispatched(), credit());
    c = change(c, {
      type: "settle_deduction",
      reason: "Supplier assessment verified and accepted.",
    });
    expect(() =>
      change(c, {
        type: "reverse_credit",
        creditId: c.state.credits[0].id,
        reason: "Correcting the old credit.",
      }),
    ).toThrow(/Reopen/);
  });
  it("corrects receipt dates while preserving old state for audit", () => {
    let c = sample();
    c = change(c, {
      type: "historical_return",
      date: "2026-09-10",
      reference: "PICKUP-9",
      evidence: "Pickup receipt archived and verified.",
    });
    c = change(c, {
      type: "record_receipt",
      date: "2026-09-15",
      reference: "RCV-9",
    });
    const old = c;
    c = change(c, {
      type: "correct_return",
      dispatchDate: "2026-09-10",
      dispatchRef: "PICKUP-9",
      receiptDate: "2026-09-12",
      receiptRef: "RCV-9",
      reason: "Corrected transcription error from receipt.",
    });
    expect(old.state.receivedAt).toBe("2026-09-15");
    expect(inspectReadiness(c, today).creditDue).toBe("2026-10-27");
    expect(() =>
      change(c, {
        type: "correct_return",
        dispatchDate: "2026-09-14",
        dispatchRef: "PICKUP-9",
        receiptDate: "2026-09-12",
        receiptRef: "RCV-9",
        reason: "Invalid chronological correction.",
      }),
    ).toThrow(/between dispatch/);
  });
  it.each(["settle_deduction", "reopen_deduction", "correct_return"])(
    "voice cannot %s",
    (type) => {
      expect(() =>
        applyAction(sample(), { type } as CoreAction, "Agent", "agent", at),
      ).toThrow(/person/);
    },
  );
});
