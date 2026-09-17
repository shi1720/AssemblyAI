import { jsPDF } from "jspdf";
import { inspectReadiness, money, type Core } from "./domain";
/** A portable, editable-source return packet; no supplier logo or invented acceptance. */
export function createReturnPdf(core: Core) {
  if (!core.state.preparedAt)
    throw new Error("Prepare the return before generating a packet.");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const width = 210,
    margin = 20;
  let y = 22;
  pdf.setFillColor(20, 27, 45);
  pdf.rect(0, 0, width, 43, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text("benchback.", margin, y);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    core.exercise ? "FICTIONAL PRACTICE RETURN" : "CORE RETURN PACKET",
    margin,
    33,
  );
  y = 57;
  const newPage = () => {
    pdf.addPage();
    pdf.setTextColor(109, 120, 139);
    pdf.setFontSize(10);
    pdf.text("BENCHBACK / RETURN DETAILS", margin, 16);
    pdf.setDrawColor(227, 230, 238);
    pdf.line(margin, 20, width - margin, 20);
    y = 32;
  };
  const text = (value: string, size = 11, bold = false) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setTextColor(36, 48, 67);
    const lines = pdf.splitTextToSize(value, width - margin * 2);
    const blockHeight = lines.length * (size * 0.43 + 2) + 3;
    if (blockHeight < 230 && y + blockHeight > 268) newPage();
    for (const line of lines) {
      if (y > 268) {
        newPage();
      }
      pdf.text(line, margin, y);
      y += size * 0.43 + 2;
    }
    y += 3;
  };
  text(core.supplier, 18, true);
  text(`${core.description} | ${core.part}`, 12);
  text(`Expected core deposit: ${money(core.depositCents)}`, 17, true);
  text(
    "Expected credit is subject to supplier inspection. This is not proof of acceptance or payment.",
    10,
  );
  y += 4;
  const r = inspectReadiness(core);
  const rows = [
    ["Purchase invoice", core.invoice],
    ["Invoice line / unit", core.purchaseLine],
    ["Repair job", core.job],
    ["Part identifier", core.part],
    ["Supplier policy", core.policy.version],
    ["Return deadline", `${r.deadline} (${core.policy.deadlineBasis})`],
    ["Assembly complete", core.state.complete],
    ["Packaging", core.state.packaging.replaceAll("_", " ")],
    [
      "Invoice/core label",
      core.state.labelAttached ? "Attached (reported)" : "Not confirmed",
    ],
    ["Authorization", core.state.rma || "Not required by configured policy"],
    ["Prepared by", core.state.preparedBy],
    ["Prepared at", core.state.preparedAt],
  ];
  for (const [label, value] of rows) {
    if (y > 265) {
      newPage();
    }
    pdf.setDrawColor(227, 230, 238);
    pdf.line(margin, y - 3, width - margin, y - 3);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(109, 120, 139);
    pdf.text(label, margin, y + 3);
    pdf.setTextColor(36, 48, 67);
    const lines = pdf.splitTextToSize(value || "", 105);
    pdf.text(lines, 85, y + 3);
    y += Math.max(12, lines.length * 5 + 6);
  }
  y += 5;
  if (y > 225) newPage();
  text("Technician observations", 12, true);
  text(core.state.conditionNote || "No additional notes recorded.", 10);
  text("Applicable return instructions", 12, true);
  text(core.policy.instructions, 10);
  if (core.state.packaging === "approved_alternative")
    text(core.policy.alternativeInstructions, 10);
  text(
    "Pack this record with the labelled core. Arrange the actual return through your approved supplier process. This packet is not a carrier shipping label, supplier authorization or guarantee of credit.",
    10,
  );
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setTextColor(120, 130, 145);
    pdf.setFontSize(8);
    pdf.text(
      `Benchback | ${core.invoice} | ${core.exercise ? "Practice data" : "Shop-entered evidence"} | ${i}/${pages}`,
      margin,
      287,
    );
  }
  return pdf;
}

export async function downloadReturnPdf(core: Core) {
  createReturnPdf(core).save(`Benchback-Return-${core.invoice}.pdf`);
}
