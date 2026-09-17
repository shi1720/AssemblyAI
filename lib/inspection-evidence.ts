import { z } from "zod";
import { ApiError } from "./api-error";
import type { Core, CoreAction } from "./domain";
import type { TranscriptRecord } from "./database";

const evidenceSchema = z
  .object({
    complete: z.string().max(240),
    packaging: z.string().max(240),
    label_attached: z.string().max(240),
  })
  .strict();
type Inspection = Extract<CoreAction, { type: "inspect" }>;
function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
const fieldTerms = {
  complete: /\b(complete|completeness|incomplete|components|parts|assembly)\b/,
  packaging: /\b(box|container|packaging|pallet)\b/,
  label_attached: /\b(label|labeled|labelled)\b|\binvoice (?:is )?attached\b/,
};
/** Grounding against client-reported final transcripts, not independent physical verification. */
export function groundInspection(
  core: Core,
  action: Inspection,
  rawEvidence: unknown,
  transcripts: TranscriptRecord[],
  sessionId: string,
): Inspection {
  const parsed = evidenceSchema.safeParse(rawEvidence);
  if (!parsed.success)
    throw new ApiError(
      422,
      "Inspection needs an evidence object with complete, packaging and label_attached quote strings. Ask the technician to state each changed fact explicitly.",
    );
  const evidence = parsed.data;
  const changed = {
    complete: core.state.complete !== action.complete,
    packaging: core.state.packaging !== action.packaging,
    label_attached: core.state.labelAttached !== action.labelAttached,
  };
  const turns = transcripts
    .filter(
      (t) =>
        t.session_id === sessionId &&
        t.core_id === core.id &&
        t.speaker === "Technician",
    )
    .map((t) => ` ${normalize(t.content)} `);
  const verified: string[] = [];
  for (const field of ["complete", "packaging", "label_attached"] as const) {
    const quote = evidence[field].trim(),
      normalized = normalize(quote);
    if (!changed[field] && !quote) continue;
    const fail = () => {
      throw new ApiError(
        422,
        `Nothing was saved. ${field} needs a verbatim technician quote stating that inspection fact in this voice session. A generic yes or identifier confirmation is insufficient. Ask an explicit question and wait for the answer.`,
      );
    };
    if (
      !normalized ||
      !fieldTerms[field].test(normalized) ||
      !turns.some((t) => t.includes(` ${normalized} `))
    )
      fail();
    if (
      field === "complete" &&
      action.complete === "yes" &&
      !/\bcomplete\b|\ball (?:of )?(?:the )?(?:required )?(?:components|parts) (?:are )?(?:present|there|included|intact)\b/.test(
        normalized,
      )
    )
      fail();
    if (
      field === "complete" &&
      action.complete === "no" &&
      !/\b(incomplete|missing|not complete|not all)\b/.test(normalized)
    )
      fail();
    if (
      field === "packaging" &&
      action.packaging === "approved_alternative" &&
      !/\b(alternative|alternate|replacement|container|pallet)\b/.test(
        normalized,
      )
    )
      fail();
    if (
      field === "packaging" &&
      action.packaging === "approved_alternative" &&
      (/\b(no|without|missing|absent) (?:an? |the |approved |rigid )*(container|pallet|packaging)\b/.test(
        normalized,
      ) ||
        /\b(container|pallet|packaging) (?:is |are )?(missing|absent|unavailable)\b/.test(
          normalized,
        ) ||
        /\b(don t|do not|doesn t|does not|haven t|have not)\b.{0,45}\b(container|pallet|packaging)\b/.test(
          normalized,
        ) ||
        /\b(not secured|not strapped|not on|unsecured|unstrapped|not approved)\b/.test(
          normalized,
        ) ||
        /\b(cannot|can t|unable to)\b.{0,45}\b(secure|strap|pallet)\b/.test(
          normalized,
        ))
    )
      fail();
    if (
      field === "packaging" &&
      action.packaging === "missing" &&
      !/\b(missing|gone|no|without|don t|do not|haven t|have not)\b/.test(
        normalized,
      )
    )
      fail();
    if (
      field === "label_attached" &&
      action.labelAttached &&
      !/\b(label|invoice)\b.*\b(attached|affixed|secured|stuck|on)\b|\b(attached|affixed)\b.*\blabel\b/.test(
        normalized,
      )
    )
      fail();
    if (
      field === "label_attached" &&
      !action.labelAttached &&
      !/\b(missing|not attached|no label|removed|unattached|haven t|have not)\b/.test(
        normalized,
      )
    )
      fail();
    // Questions and obvious negation cannot establish affirmative inspection facts.
    // This intentionally does not claim general natural-language entailment.
    if (
      quote.includes("?") ||
      /^(is|are|was|were|can|could|should|does|do)\b/.test(normalized)
    )
      fail();
    if (
      field === "complete" &&
      action.complete === "yes" &&
      /\b(incomplete|not complete|not all|missing components|missing parts|components are missing|parts are missing)\b/.test(
        normalized,
      )
    )
      fail();
    if (
      field === "packaging" &&
      action.packaging === "original" &&
      (!/\boriginal\b/.test(normalized) ||
        /\b(missing|gone|no original|not original)\b/.test(normalized))
    )
      fail();
    if (
      field === "label_attached" &&
      action.labelAttached &&
      /\b(not attached|isn t attached|no label|label missing|label is missing|label removed|label is removed)\b/.test(
        normalized,
      )
    )
      fail();
    verified.push(`${field}: "${quote}"`);
  }
  if (!verified.length) return action;
  if (action.note.length > 1000)
    throw new ApiError(
      422,
      "Nothing was saved. Keep the inspection note under 1,000 characters so its quoted evidence can be retained in full.",
    );
  return {
    ...action,
    note: `${action.note}\nTechnician transcript evidence (client-reported): ${verified.join("; ")}`.trim(),
  };
}
