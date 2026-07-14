import * as XLSX from "xlsx";

/**
 * Builds downloadable XLSX templates that mirror the real Area 2 PM/PdM
 * tracker column layout. Headers are bold, columns are sized, and two
 * greyed-out example rows show the expected shape (marked as EXAMPLE so
 * Smart Import users can delete them before uploading).
 */

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: "FF334155" } },
  alignment: { vertical: "center", horizontal: "center" },
};

const EXAMPLE_STYLE = {
  font: { italic: true, color: { rgb: "FF94A3B8" } },
  fill: { patternType: "solid", fgColor: { rgb: "FFF1F5F9" } },
};

function styledSheet(headers: string[], examples: (string | number)[][], widths: number[]) {
  const aoa: (string | number)[][] = [headers, ...examples];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = widths.map((w) => ({ wch: w }));
  // Apply header styles (best-effort; SheetJS community build honors these on export)
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = HEADER_STYLE;
  }
  for (let r = 1; r <= examples.length; r++) {
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) ws[addr].s = EXAMPLE_STYLE;
    }
  }
  ws["!rows"] = [{ hpt: 22 }];
  return ws;
}

export function downloadInstrumentTemplate() {
  const headers = ["No.", "Tag Number", "Lokasi", "Area", "Equipment", "PM Frequency"];
  const examples = [
    [1, "12-JS-007", "Reaktor 12 — EXAMPLE (delete before import)", "12", "Junction Box", "1 tahun"],
    [2, "22-UV-6421", "Line 22 — EXAMPLE (delete before import)", "22", "Transmitter", "1 tahun"],
  ];
  const ws = styledSheet(headers, examples, [5, 16, 42, 8, 18, 14]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Instruments");
  XLSX.writeFile(wb, "instrument-template.xlsx");
}

export function downloadPmTaskTemplate() {
  const headers = [
    "No.", "Tag Number", "Area", "Equipment", "Period",
    "Plan", "Actual", "PIC", "Activity", "Activity Type",
    "Kendala", "Status", "Perbaikan Lanjutan", "Catatan",
  ];
  const examples = [
    [1, "12-JS-007", "12", "Junction Box", "W2",
     "2026-07-05", "2026-07-07", "Reza — EXAMPLE", "Cleaning & inspection", "PM",
     "", "Finish", "", "EXAMPLE row — delete before importing"],
    [2, "22-UV-6421", "22", "Transmitter", "",
     "2026-07-20", "", "Andi — EXAMPLE", "Loop check", "PdM",
     "Access blocked", "Behind", "Coordinate with operations", "EXAMPLE row — delete before importing"],
  ];
  const ws = styledSheet(headers, examples,
    [5, 16, 6, 18, 8, 12, 12, 18, 26, 12, 22, 12, 24, 30]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PM Tasks");
  XLSX.writeFile(wb, "pm-task-template.xlsx");
}
