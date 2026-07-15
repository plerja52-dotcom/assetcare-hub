import ExcelJS from "exceljs";

/**
 * Downloadable XLSX templates for Smart Import. Uses ExcelJS so header
 * formatting, column widths, and frozen panes render correctly in real
 * Excel/LibreOffice — not just in-browser previewers.
 */

async function saveWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

interface Col {
  header: string;
  key: string;
  width: number;
}

function buildSheet(
  wb: ExcelJS.Workbook,
  name: string,
  cols: Col[],
  examples: Record<string, string | number>[],
) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  const header = ws.getRow(1);
  header.height = 22;
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  header.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FF1F2937" } } };
  });
  for (const ex of examples) ws.addRow(ex);
  // Style example rows (italic, muted)
  for (let i = 0; i < examples.length; i++) {
    const r = ws.getRow(2 + i);
    r.font = { italic: true, color: { argb: "FF64748B" } };
    r.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    });
  }
  return ws;
}

export async function downloadInstrumentTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Pertamina Reliability Instrumentation";
  wb.created = new Date();
  buildSheet(wb, "Instruments", [
    { header: "No.", key: "no", width: 6 },
    { header: "Tag Number", key: "tag", width: 18 },
    { header: "Lokasi", key: "lokasi", width: 32 },
    { header: "Area", key: "area", width: 10 },
    { header: "Unit", key: "unit", width: 12 },
    { header: "Equipment", key: "equipment", width: 20 },
    { header: "Sub Type", key: "subType", width: 16 },
    { header: "PM Frequency", key: "pmFrequency", width: 16 },
    { header: "Status Instrument", key: "statusInstrument", width: 18 },
  ], [
    { no: 1, tag: "12-JS-007", lokasi: "Reaktor 12 — EXAMPLE (delete before import)",
      area: "12", unit: "Train A", equipment: "Junction Box", subType: "",
      pmFrequency: "1 tahun", statusInstrument: "Active" },
    { no: 2, tag: "22-UV-6421", lokasi: "Line 22 — EXAMPLE",
      area: "22", unit: "", equipment: "Transmitter", subType: "Pressure",
      pmFrequency: "6 bulan", statusInstrument: "Standby" },
  ]);
  await saveWorkbook(wb, "instrument-template.xlsx");
}

export async function downloadPmTaskTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Pertamina Reliability Instrumentation";
  wb.created = new Date();
  buildSheet(wb, "PM Tasks", [
    { header: "No.", key: "no", width: 6 },
    { header: "Tag Number", key: "tag", width: 18 },
    { header: "Area", key: "area", width: 8 },
    { header: "Equipment", key: "equipment", width: 20 },
    { header: "Period", key: "period", width: 10 },
    { header: "Plan", key: "plan", width: 14 },
    { header: "Actual", key: "actual", width: 14 },
    { header: "PIC", key: "pic", width: 18 },
    { header: "Activity", key: "activity", width: 28 },
    { header: "Activity Type", key: "activityType", width: 14 },
    { header: "Kendala", key: "kendala", width: 22 },
    { header: "Status", key: "status", width: 12 },
    { header: "Perbaikan Lanjutan", key: "perbaikanLanjutan", width: 24 },
    { header: "Catatan", key: "catatan", width: 26 },
    { header: "Evidence", key: "evidence", width: 22 },
  ], [
    { no: 1, tag: "12-JS-007", area: "12", equipment: "Junction Box", period: "W2",
      plan: "2026-07-05", actual: "2026-07-07", pic: "Reza — EXAMPLE",
      activity: "Cleaning & inspection", activityType: "PM", kendala: "",
      status: "Finish", perbaikanLanjutan: "", catatan: "EXAMPLE — delete before importing",
      evidence: "photo-log-2026-07-07" },
    { no: 2, tag: "22-UV-6421", area: "22", equipment: "Transmitter", period: "",
      plan: "2026-07-20", actual: "", pic: "Andi — EXAMPLE",
      activity: "Loop check", activityType: "PdM", kendala: "Access blocked",
      status: "Behind", perbaikanLanjutan: "Coordinate with operations",
      catatan: "EXAMPLE row — delete before importing", evidence: "" },
  ]);
  await saveWorkbook(wb, "pm-task-template.xlsx");
}
