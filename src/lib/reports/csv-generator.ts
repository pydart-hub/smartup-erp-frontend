/**
 * Server-side CSV generation. No external dependencies needed.
 */
import type { ReportColumn } from "./definitions";

export function generateCSV(
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
): string {
  const escape = (val: unknown): string => {
    const str = String(val ?? "");
    // Wrap in quotes if it contains comma, quote, or newline
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((col) => escape(col.header)).join(",");

  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        const value = col.transform ? col.transform(raw) : raw;
        return escape(value);
      })
      .join(","),
  );

  return [header, ...dataRows].join("\r\n");
}
