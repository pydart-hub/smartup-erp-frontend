/**
 * Server-side Excel (.xlsx) generation using exceljs.
 * Streams the workbook to a Buffer for the API response.
 */
import ExcelJS from "exceljs";
import type { ReportColumn } from "./definitions";

export async function generateExcel(
  sheetName: string,
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SmartUp ERP";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);

  // Define columns
  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 28;

  // Add data rows
  for (const row of rows) {
    const values: Record<string, unknown> = {};
    for (const col of columns) {
      const raw = row[col.key];
      values[col.key] = col.transform ? col.transform(raw) : (raw ?? "");
    }
    sheet.addRow(values);
  }

  // Auto-filter on header
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  }

  // Freeze header row
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
