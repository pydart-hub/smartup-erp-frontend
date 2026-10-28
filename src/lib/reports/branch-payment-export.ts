import type ExcelJS from "exceljs";
import type { PaymentEntryRow } from "@/lib/api/director";
import { formatDate } from "@/lib/utils/formatters";

export interface BranchPaymentExportOptions {
  branchName: string;
  entries: PaymentEntryRow[];
  fromDate?: string;
  toDate?: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a beautifully styled Excel (.xlsx) file
 * for Branch Payment Entries using exceljs.
 */
export async function exportBranchPaymentEntriesExcel({
  branchName,
  entries,
  fromDate,
  toDate,
}: BranchPaymentExportOptions): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SmartUp ERP";
  workbook.created = new Date();

  const sheetName = "Payment Entries";
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: "landscape" },
  });

  const cleanBranch = branchName
    .replace(/^Smart Up\s*/i, "")
    .replace(/^SmartUp\s*/i, "");

  const totalAmount = entries.reduce((acc, curr) => acc + (Number(curr.paid_amount) || 0), 0);
  const totalAmountFormatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(totalAmount);

  const exportedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const periodText =
    fromDate && toDate
      ? `Period: ${formatDate(fromDate)} to ${formatDate(toDate)}`
      : fromDate
        ? `Period: From ${formatDate(fromDate)}`
        : toDate
          ? `Period: Up to ${formatDate(toDate)}`
          : "Period: All Recorded Entries";

  // ── Row 1: Brand Header Banner ──
  sheet.mergeCells("A1:G1");
  const bannerCell = sheet.getCell("A1");
  bannerCell.value = `SmartUp ERP — Payment Entries (${branchName})`;
  bannerCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  bannerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } }; // Indigo 600
  bannerCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 32;

  // ── Row 2: Subtitle / Audit Info ──
  sheet.mergeCells("A2:G2");
  const subCell = sheet.getCell("A2");
  subCell.value = `${periodText}   |   Total Entries: ${entries.length}   |   Total Amount: ₹${totalAmountFormatted}   |   Exported: ${exportedAt}`;
  subCell.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF3730A3" } }; // Indigo 800
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } }; // Indigo 50
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(2).height = 22;

  // ── Row 3: Blank Spacer ──
  sheet.getRow(3).height = 8;

  // ── Row 4: Column Headers ──
  const columns = [
    { header: "Date", key: "date", width: 16 },
    { header: "Name", key: "name", width: 24 },
    { header: "Party", key: "party", width: 32 },
    { header: "Amount", key: "amount", width: 20 },
    { header: "Mode", key: "mode", width: 14 },
    { header: "Paid To", key: "paid_to", width: 28 },
    { header: "Reference", key: "reference", width: 26 },
  ];

  sheet.columns = columns;

  const headerRow = sheet.getRow(4);
  headerRow.values = columns.map((c) => c.header);
  headerRow.height = 26;
  headerRow.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } }; // Dark Indigo 700

  // Header cell alignments
  headerRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
  headerRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
  headerRow.getCell(3).alignment = { vertical: "middle", horizontal: "left" };
  headerRow.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
  headerRow.getCell(5).alignment = { vertical: "middle", horizontal: "center" };
  headerRow.getCell(6).alignment = { vertical: "middle", horizontal: "left" };
  headerRow.getCell(7).alignment = { vertical: "middle", horizontal: "left" };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  // ── Data Rows ──
  entries.forEach((pe, idx) => {
    const rowNum = 5 + idx;
    const isEven = idx % 2 === 1;
    const bg = isEven ? "FFF8FAFC" : "FFFFFFFF";

    const partyDisplay = pe.party_name || pe.party || "—";
    const amountVal = Number(pe.paid_amount) || 0;
    const modeDisplay = pe.mode_of_payment || "Cash";
    const refDisplay = pe.reference_no || "—";

    const row = sheet.addRow({
      date: formatDate(pe.posting_date),
      name: pe.name,
      party: partyDisplay,
      amount: amountVal,
      mode: modeDisplay,
      paid_to: pe.paid_to || "—",
      reference: refDisplay,
    });

    row.height = 21;

    // Cell 1: Date
    const c1 = row.getCell(1);
    c1.alignment = { vertical: "middle", horizontal: "center" };

    // Cell 2: Name
    const c2 = row.getCell(2);
    c2.alignment = { vertical: "middle", horizontal: "left" };
    c2.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF334155" } };

    // Cell 3: Party
    const c3 = row.getCell(3);
    c3.alignment = { vertical: "middle", horizontal: "left" };
    c3.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF0F172A" } };

    // Cell 4: Amount
    const c4 = row.getCell(4);
    c4.alignment = { vertical: "middle", horizontal: "right" };
    c4.numFmt = '"₹"#,##0.00;[Red]("₹"#,##0.00);"-"';
    c4.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF047857" } }; // Emerald 700

    // Cell 5: Mode
    const c5 = row.getCell(5);
    c5.alignment = { vertical: "middle", horizontal: "center" };
    c5.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF475569" } };

    // Cell 6: Paid To
    const c6 = row.getCell(6);
    c6.alignment = { vertical: "middle", horizontal: "left" };
    c6.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF334155" } };

    // Cell 7: Reference
    const c7 = row.getCell(7);
    c7.alignment = { vertical: "middle", horizontal: "left" };
    c7.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF64748B" } };

    // Set borders and alternating background
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    }
  });

  // ── Total Summary Row ──
  const totRowNum = 5 + entries.length;
  sheet.mergeCells(`A${totRowNum}:C${totRowNum}`);
  const totLabelCell = sheet.getCell(`A${totRowNum}`);
  totLabelCell.value = "TOTAL COLLECTION";
  totLabelCell.alignment = { vertical: "middle", horizontal: "right" };
  totLabelCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E1B4B" } };

  const totAmountCell = sheet.getCell(`D${totRowNum}`);
  if (entries.length > 0) {
    totAmountCell.value = {
      formula: `SUM(D5:D${totRowNum - 1})`,
      result: totalAmount,
      date1904: false,
    };
  } else {
    totAmountCell.value = 0;
  }
  totAmountCell.alignment = { vertical: "middle", horizontal: "right" };
  totAmountCell.numFmt = '"₹"#,##0.00;[Red]("₹"#,##0.00);"-"';
  totAmountCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF065F46" } }; // Dark Emerald

  const totalRow = sheet.getRow(totRowNum);
  totalRow.height = 25;

  const totalRowBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF94A3B8" } },
    bottom: { style: "double", color: { argb: "FF475569" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  for (let c = 1; c <= 7; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }; // Slate 100
    cell.border = totalRowBorder;
  }

  // ── Auto Filter ──
  if (entries.length > 0) {
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: 7 },
    };
  }

  // ── Column width auto-adjustment ──
  sheet.columns.forEach((col, idx) => {
    let maxLen = 0;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      if (Number(cell.row) < 4) return; // skip banner rows
      const val = cell.value ? String(cell.value) : "";
      if (val.length > maxLen) maxLen = val.length;
    });

    if (idx === 0) col.width = 16; // Date
    else if (idx === 1) col.width = Math.max(maxLen + 4, 24); // Name
    else if (idx === 2) col.width = Math.max(maxLen + 4, 30); // Party
    else if (idx === 3) col.width = Math.max(maxLen + 6, 20); // Amount
    else if (idx === 4) col.width = 14; // Mode
    else if (idx === 5) col.width = Math.max(maxLen + 4, 26); // Paid To
    else if (idx === 6) col.width = Math.max(maxLen + 4, 24); // Reference
  });

  // ── Generate and trigger download ──
  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const branchCleanStr = (cleanBranch || branchName)
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/__+/g, "_");

  const dateSlug =
    fromDate && toDate
      ? `${fromDate}_to_${toDate}`
      : fromDate
        ? `from_${fromDate}`
        : toDate
          ? `upto_${toDate}`
          : new Date().toISOString().slice(0, 10);

  const filename = `${branchCleanStr}_Payment_Entries_${dateSlug}.xlsx`;
  downloadBlob(blob, filename);
}
