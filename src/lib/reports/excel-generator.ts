/**
 * Server-side Excel (.xlsx) generation using exceljs.
 * Streams the workbook to a Buffer for the API response.
 * Formatted with top ERP banner & subtitle matching Image 2 design.
 */
import ExcelJS from "exceljs";
import type { ReportColumn } from "./definitions";

export async function generateExcel(
  sheetName: string,
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
  metaInfo?: { title?: string; subtitle?: string }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SmartUp ERP";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName.slice(0, 30), {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const lastColLetter = String.fromCharCode(64 + Math.min(columns.length, 26));

  // ── Row 1: Top Brand Banner ──
  sheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = sheet.getCell("A1");
  titleCell.value = metaInfo?.title || "Inst. Status";
  titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A154B" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 30;

  // ── Row 2: Sub-Banner Line ──
  sheet.mergeCells(`A2:${lastColLetter}2`);
  const subCell = sheet.getCell("A2");
  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  subCell.value = metaInfo?.subtitle || `Report: ${sheetName}   |   Generated: ${todayFormatted}   |   Total Rows: ${rows.length}   |   Report exported from ERP`;
  subCell.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF3730A3" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(2).height = 20;

  // ── Row 3: Blank Spacing Row ──
  sheet.getRow(3).height = 8;

  // ── Row 4: Table Column Headers ──
  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 18,
  }));

  const headerRow = sheet.getRow(4);
  headerRow.values = columns.map((c) => c.header);
  headerRow.height = 24;
  headerRow.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  // Add data rows starting from row 5
  rows.forEach((row, rowIdx) => {
    const rowValues: Record<string, unknown> = {};
    columns.forEach((col) => {
      const raw = row[col.key];
      rowValues[col.key] = col.transform ? col.transform(raw) : (raw ?? "");
    });

    const addedRow = sheet.addRow(rowValues);
    addedRow.height = 20;
    const bg = rowIdx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF";

    columns.forEach((col) => {
      const cell = addedRow.getCell(col.key);
      cell.font = { name: "Segoe UI", size: 9.5 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle" };
    });
  });

  // Auto-filter on header row (Row 4)
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: columns.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
