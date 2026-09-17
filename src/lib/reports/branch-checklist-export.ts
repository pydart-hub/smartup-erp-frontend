import type ExcelJS from "exceljs";
import { BranchChecklistEntry, evaluateSubmissionTimeliness } from "@/lib/api/branchChecklists";

export interface ChecklistExportFilterOptions {
  branch?: string; // "ALL" or specific branch
  allBranches?: string[]; // All available branches list
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  statusFilter?: string; // "", "Submitted", "Verified", "Late"
}

export const CHECKLIST_ITEMS_LIST: { id: keyof BranchChecklistEntry; label: string }[] = [
  { id: "staff_attendance_verified", label: "Staff attendance verified" },
  { id: "all_classes_started_on_time", label: "All classes started on time" },
  { id: "timetable_executed_without_issues", label: "Timetable executed without issues" },
  { id: "branch_infrastructure_functional", label: "Branch infrastructure functional" },
  { id: "attendance_updated_all_classes", label: "Attendance updated (All Classes)" },
  { id: "parent_followup_completed", label: "Parent follow-up completed" },
  { id: "portion_tracking_verified", label: "Portion tracking verified" },
  { id: "class_notes_worksheet_shared", label: "Class notes/worksheet shared" },
  { id: "next_day_class_time_updated", label: "Next day class time updated" },
  { id: "overview_updation_checked", label: "Overview updation checked" },
  { id: "class_feedback_forum_sent", label: "Class feedback forum sent" },
  { id: "teacher_training_conducted", label: "Teacher training conducted" },
  { id: "teacher_performance_reviewed", label: "Teacher performance reviewed" },
  { id: "smartup_content_shared", label: "Smart up content shared" },
];

const DEFAULT_BRANCH_NAMES = [
  "Smart Up Kadavanthara",
  "Smart Up Edappally",
  "Smart Up Vennala",
  "Smart Up Eraveli",
  "Smart Up Fortkochi",
  "Smart Up Chullickal",
  "Smart Up Palluruthy",
  "Smart Up Thopumpadi",
  "Smart Up Moolamkuzhi",
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Generate an array of all date strings (YYYY-MM-DD) from fromDate to toDate (inclusive, ascending)
 */
function getAllDatesInRange(fromDateStr: string, toDateStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(fromDateStr);
  const end = new Date(toDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [fromDateStr];
  }

  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export type CellStatusType = "Verified" | "Submitted" | "Late (Verified)" | "Late (Submitted)" | "Not Submitted";

interface MatrixCellInfo {
  statusText: string;
  type: CellStatusType;
  entry?: BranchChecklistEntry;
  daysLate?: number;
  score?: string;
  critical?: boolean;
}

/**
 * Builds the matrix data:
 * Rows: Branches
 * Columns: All Dates (left to right)
 */
function buildBranchDateMatrix(
  checklists: BranchChecklistEntry[],
  options: ChecklistExportFilterOptions
) {
  const allDates = getAllDatesInRange(options.fromDate, options.toDate);

  // Determine branch list
  let branches: string[] = [];
  if (options.branch && options.branch !== "ALL") {
    branches = [options.branch];
  } else if (options.allBranches && options.allBranches.length > 0) {
    branches = Array.from(new Set(options.allBranches));
  } else {
    const fromData = Array.from(new Set(checklists.map((c) => c.branch).filter(Boolean)));
    branches = Array.from(new Set([...DEFAULT_BRANCH_NAMES, ...fromData]));
  }

  // Sort branches nicely
  branches.sort((a, b) => a.localeCompare(b));

  // Build lookup map: `${branch}__${date}` -> BranchChecklistEntry
  const lookup = new Map<string, BranchChecklistEntry>();
  checklists.forEach((c) => {
    lookup.set(`${c.branch}__${c.date}`, c);
  });

  const matrix: {
    branch: string;
    cleanBranchName: string;
    cells: Record<string, MatrixCellInfo>;
    submittedCount: number;
    verifiedCount: number;
    lateCount: number;
    notSubmittedCount: number;
  }[] = [];

  branches.forEach((branch) => {
    const cleanBranchName = branch.replace(/^Smart\s+Up\s+/i, "");
    const cells: Record<string, MatrixCellInfo> = {};
    let submittedCount = 0;
    let verifiedCount = 0;
    let lateCount = 0;
    let notSubmittedCount = 0;

    allDates.forEach((date) => {
      const entry = lookup.get(`${branch}__${date}`);
      if (!entry) {
        notSubmittedCount += 1;
        cells[date] = {
          statusText: "Not Submitted",
          type: "Not Submitted",
        };
      } else {
        const timeliness = evaluateSubmissionTimeliness(entry.date, entry.creation);
        const checkedCount = CHECKLIST_ITEMS_LIST.reduce((acc, itm) => acc + (entry[itm.id] ? 1 : 0), 0);
        const score = `${checkedCount}/${CHECKLIST_ITEMS_LIST.length}`;
        const isLate = timeliness.isLate;

        if (isLate) lateCount += 1;

        if (entry.status === "Verified") {
          verifiedCount += 1;
          cells[date] = {
            statusText: isLate ? `Late (${timeliness.badgeLabel})` : "Verified",
            type: isLate ? "Late (Verified)" : "Verified",
            entry,
            daysLate: timeliness.daysLate,
            score,
            critical: entry.critical_issues === "Yes",
          };
        } else {
          submittedCount += 1;
          cells[date] = {
            statusText: isLate ? `Late (${timeliness.badgeLabel})` : "Submitted",
            type: isLate ? "Late (Submitted)" : "Submitted",
            entry,
            daysLate: timeliness.daysLate,
            score,
            critical: entry.critical_issues === "Yes",
          };
        }
      }
    });

    matrix.push({
      branch,
      cleanBranchName,
      cells,
      submittedCount,
      verifiedCount,
      lateCount,
      notSubmittedCount,
    });
  });

  return { allDates, matrix };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT (MATRIX SHEET + AUDIT DETAIL LOGS)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportBranchChecklistsExcel(
  checklists: BranchChecklistEntry[],
  options: ChecklistExportFilterOptions
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SmartUp ERP";
  workbook.created = new Date();

  const { allDates, matrix } = buildBranchDateMatrix(checklists, options);

  // ─────────────────────────────────────────────────────────────
  // SHEET 1: Branch × Date Operational Matrix
  // ─────────────────────────────────────────────────────────────
  const sheet1 = workbook.addWorksheet("Branch Date Matrix", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 5 }],
  });

  const totalCols = 1 + allDates.length + 4; // Branch + Dates + (Total Verified, Submitted, Late, Not Submitted)
  const lastColLetter = getColLetter(Math.min(totalCols, 50));

  // Top Banner Row 1
  sheet1.mergeCells(`A1:${lastColLetter}1`);
  const banner = sheet1.getCell("A1");
  banner.value = "SmartUp ERP — Branch Checklists Daily Compliance Matrix";
  banner.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
  banner.alignment = { vertical: "middle", horizontal: "center" };
  sheet1.getRow(1).height = 32;

  // Subtitle Row 2
  sheet1.mergeCells(`A2:${lastColLetter}2`);
  const sub = sheet1.getCell("A2");
  const branchLabel = options.branch && options.branch !== "ALL" ? options.branch : "All Branches";
  sub.value = `Scope: ${branchLabel}   |   Period: ${options.fromDate} to ${options.toDate} (${allDates.length} Days)   |   Generated on: ${new Date().toLocaleDateString("en-IN")}`;
  sub.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF312E81" } };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
  sub.alignment = { vertical: "middle", horizontal: "center" };
  sheet1.getRow(2).height = 22;

  // Legend Row 3
  sheet1.mergeCells(`A3:${lastColLetter}3`);
  const legend = sheet1.getCell("A3");
  legend.value = "LEGEND:  [Verified] = Approved by GM/Director  |  [Submitted] = Pending Review  |  [Late Submission] = Submitted after report date  |  [Not Submitted] = No checklist filed";
  legend.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF475569" } };
  legend.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  legend.alignment = { vertical: "middle", horizontal: "center" };
  sheet1.getRow(3).height = 20;

  // Row 4 space
  sheet1.getRow(4).height = 8;

  // Headers (Row 5)
  // Left col: Branch Name
  // Date cols: Date formatted (e.g. 14 Sep \n Mon)
  // Right summary cols: Verified, Submitted, Late, Not Submitted
  const colDefs: { header: string; key: string; width: number }[] = [
    { header: "Branch Name", key: "branch", width: 22 },
  ];

  allDates.forEach((date) => {
    const d = new Date(date);
    const dayName = !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { weekday: "short" }) : "";
    const shortDate = !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : date;
    colDefs.push({
      header: `${shortDate}\n(${dayName})`,
      key: date,
      width: 17,
    });
  });

  colDefs.push(
    { header: "Verified", key: "col_verified", width: 12 },
    { header: "Submitted", key: "col_submitted", width: 12 },
    { header: "Late", key: "col_late", width: 12 },
    { header: "Not Subm.", key: "col_missing", width: 12 }
  );

  sheet1.columns = colDefs;
  const headerRow = sheet1.getRow(5);
  headerRow.values = colDefs.map((c) => c.header);
  headerRow.height = 30;
  headerRow.font = { name: "Segoe UI", bold: true, size: 9.5, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  // Populate Matrix Rows
  matrix.forEach((bRow, rIdx) => {
    const rowValues: Record<string, unknown> = {
      branch: bRow.cleanBranchName,
      col_verified: bRow.verifiedCount,
      col_submitted: bRow.submittedCount,
      col_late: bRow.lateCount,
      col_missing: bRow.notSubmittedCount,
    };

    allDates.forEach((date) => {
      const cellInfo = bRow.cells[date];
      rowValues[date] = cellInfo.statusText;
    });

    const addedRow = sheet1.addRow(rowValues);
    addedRow.height = 24;

    // Format Branch cell
    const branchCell = addedRow.getCell("branch");
    branchCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
    branchCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rIdx % 2 === 1 ? "FFF1F5F9" : "FFFFFFFF" } };
    branchCell.border = thinBorder;
    branchCell.alignment = { vertical: "middle", horizontal: "left" };

    // Format Date cells with rich status styling
    allDates.forEach((date) => {
      const cell = addedRow.getCell(date);
      const info = bRow.cells[date];
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: "center" };

      if (info.type === "Verified") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }; // Soft emerald
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF15803D" } };
      } else if (info.type === "Submitted") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; // Soft amber
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFB45309" } };
      } else if (info.type === "Late (Verified)" || info.type === "Late (Submitted)") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } }; // Soft rose
        cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FFBE123C" } };
      } else {
        // Not Submitted
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }; // Neutral gray
        cell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF94A3B8" } };
      }
    });

    // Summary cells
    const vCell = addedRow.getCell("col_verified");
    vCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF15803D" } };
    vCell.border = thinBorder;
    vCell.alignment = { vertical: "middle", horizontal: "center" };

    const sCell = addedRow.getCell("col_submitted");
    sCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFB45309" } };
    sCell.border = thinBorder;
    sCell.alignment = { vertical: "middle", horizontal: "center" };

    const lCell = addedRow.getCell("col_late");
    lCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFBE123C" } };
    lCell.border = thinBorder;
    lCell.alignment = { vertical: "middle", horizontal: "center" };

    const mCell = addedRow.getCell("col_missing");
    mCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF64748B" } };
    mCell.border = thinBorder;
    mCell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // ─────────────────────────────────────────────────────────────
  // SHEET 2: Only Remark-Entered / Critical Issue Checklists
  // ─────────────────────────────────────────────────────────────
  const sheet2 = workbook.addWorksheet("Remarks & Critical Log", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  const detailCols = [
    { header: "Report Date", key: "date", width: 14 },
    { header: "Day", key: "day", width: 10 },
    { header: "Branch", key: "branch", width: 22 },
    { header: "Status", key: "status", width: 16 },
    { header: "Submission Timeliness", key: "timeliness", width: 20 },
    { header: "Days Late", key: "days_late", width: 12 },
    { header: "Submitted On", key: "submitted_on", width: 22 },
    { header: "Score", key: "score", width: 14 },
    { header: "Opened By", key: "opened_by", width: 18 },
    { header: "Closed By", key: "closed_by", width: 18 },
    { header: "Critical Issue", key: "critical", width: 16 },
    { header: "Branch Remarks / Escalation Notes", key: "remarks", width: 45 },
  ];

  sheet2.columns = detailCols;
  const dHeader = sheet2.getRow(1);
  dHeader.values = detailCols.map((c) => c.header);
  dHeader.height = 26;
  dHeader.font = { name: "Segoe UI", bold: true, size: 9.5, color: { argb: "FFFFFFFF" } };
  dHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
  dHeader.alignment = { vertical: "middle", horizontal: "center" };

  // Filter logs to ONLY show entries where remarks or critical issues/escalations were entered
  const remarkLogs = checklists.filter((c) => {
    const hasRemarks = Boolean(c.remarks && c.remarks.trim().length > 0 && c.remarks.trim() !== "-");
    const hasEscalation = Boolean(c.escalation_details && c.escalation_details.trim().length > 0 && c.escalation_details.trim() !== "-");
    const isCritical = c.critical_issues === "Yes";
    return hasRemarks || hasEscalation || isCritical;
  });

  // Sort logs date desc, then branch
  const sortedLogs = [...remarkLogs].sort((a, b) => {
    const cD = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (cD !== 0) return cD;
    return a.branch.localeCompare(b.branch);
  });

  sortedLogs.forEach((row, idx) => {
    const timeliness = evaluateSubmissionTimeliness(row.date, row.creation);
    const checkedCount = CHECKLIST_ITEMS_LIST.reduce((acc, itm) => acc + (row[itm.id] ? 1 : 0), 0);
    const dateObj = new Date(row.date);
    const dayName = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString("en-IN", { weekday: "short" }) : "";

    const combinedRemarks = [
      row.critical_issues === "Yes" && row.escalation_details ? `[CRITICAL ISSUE]: ${row.escalation_details}` : "",
      row.remarks && row.remarks.trim() ? row.remarks.trim() : "",
    ].filter(Boolean).join(" | ");

    const added = sheet2.addRow({
      date: row.date,
      day: dayName,
      branch: row.branch,
      status: row.status,
      timeliness: timeliness.isLate ? `Late (${timeliness.badgeLabel})` : "On Time",
      days_late: timeliness.isLate ? timeliness.daysLate : 0,
      submitted_on: timeliness.formattedSubmittedAt || row.creation || "-",
      score: `${checkedCount} / ${CHECKLIST_ITEMS_LIST.length}`,
      opened_by: row.opened_by || "-",
      closed_by: row.closed_by || row.opened_by || "-",
      critical: row.critical_issues === "Yes" ? "YES (CRITICAL)" : "No",
      remarks: combinedRemarks || row.remarks || "-",
    });

    added.height = 22;
    const bg = row.critical_issues === "Yes"
      ? "FFFFE4E6" // soft red tint for critical
      : idx % 2 === 1
      ? "FFF8FAFC"
      : "FFFFFFFF";

    detailCols.forEach((col) => {
      const cell = added.getCell(col.key);
      cell.font = { name: "Segoe UI", size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle" };

      if (col.key === "critical" && row.critical_issues === "Yes") {
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFE11D48" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });
  });

  if (sortedLogs.length > 0) {
    sheet2.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: detailCols.length },
    };
  }

  // Generate blob
  const buffer = await workbook.xlsx.writeBuffer();
  const fileBaseName = `branch-checklists-matrix-${options.fromDate}-to-${options.toDate}`;
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${fileBaseName}.xlsx`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT (WEEK-WISE CLEAN CHUNKED MATRIX WITH REMARKS & CRITICAL ISSUES)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportBranchChecklistsPdf(
  checklists: BranchChecklistEntry[],
  options: ChecklistExportFilterOptions
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const { allDates, matrix } = buildBranchDateMatrix(checklists, options);

  // Group dates cleanly into Monday-to-Sunday calendar weeks
  const weekChunks: string[][] = [];
  let currentWeek: string[] = [];

  allDates.forEach((dateStr) => {
    currentWeek.push(dateStr);
    const d = new Date(dateStr);
    // 0 = Sunday: week boundary
    if (d.getDay() === 0) {
      weekChunks.push([...currentWeek]);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weekChunks.push(currentWeek);
  }

  const numPages = weekChunks.length;
  const marginX = 32;
  const branchLabel = options.branch && options.branch !== "ALL" ? options.branch : "All Branches";

  weekChunks.forEach((pageDates, weekIdx) => {
    if (weekIdx > 0) {
      doc.addPage("a4", "landscape");
    }

    const isLastWeek = weekIdx === numPages - 1;
    const fromDateFormatted = new Date(pageDates[0]).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const toDateFormatted = new Date(pageDates[pageDates.length - 1]).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(`SmartUp ERP — Branch Checklists (Week ${weekIdx + 1}: ${fromDateFormatted} - ${toDateFormatted})`, marginX, 36);

    // Subtitle & Page Indicator
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(
      `Scope: ${branchLabel}   |   Total Range: ${options.fromDate} to ${options.toDate}   |   Page ${weekIdx + 1} of ${numPages}   |   Generated: ${new Date().toLocaleDateString("en-IN")}`,
      marginX,
      50
    );

    // Legend Badges Bar
    const legendY = 66;
    doc.setFontSize(8);

    doc.setFillColor(220, 252, 231);
    doc.roundedRect(marginX, legendY - 10, 75, 14, 2, 2, "F");
    doc.setTextColor(21, 128, 61);
    doc.setFont("helvetica", "bold");
    doc.text("VERIFIED", marginX + 37, legendY, { align: "center" });

    doc.setFillColor(254, 243, 199);
    doc.roundedRect(marginX + 82, legendY - 10, 78, 14, 2, 2, "F");
    doc.setTextColor(180, 83, 9);
    doc.text("SUBMITTED", marginX + 82 + 39, legendY, { align: "center" });

    doc.setFillColor(255, 228, 230);
    doc.roundedRect(marginX + 167, legendY - 10, 84, 14, 2, 2, "F");
    doc.setTextColor(190, 18, 60);
    doc.text("LATE (+d)", marginX + 167 + 42, legendY, { align: "center" });

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(marginX + 258, legendY - 10, 84, 14, 2, 2, "F");
    doc.setTextColor(100, 116, 139);
    doc.text("NOT SUBMITTED", marginX + 258 + 42, legendY, { align: "center" });

    doc.setFillColor(254, 226, 226);
    doc.roundedRect(marginX + 349, legendY - 10, 96, 14, 2, 2, "F");
    doc.setTextColor(220, 38, 38);
    doc.text("! CRITICAL (ALERT)", marginX + 349 + 48, legendY, { align: "center" });

    // Table Column Headers: Date number and day name
    const headRow1 = [
      "Branch",
      ...pageDates.map((date) => {
        const d = new Date(date);
        const dayNum = !isNaN(d.getTime()) ? d.getDate() : date.slice(-2);
        const mon = !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { month: "short" }) : "";
        return `${dayNum} ${mon}`;
      }),
    ];

    const headRow2 = [
      "",
      ...pageDates.map((date) => {
        const d = new Date(date);
        return !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { weekday: "short" }) : "";
      }),
    ];

    // Table Body Rows
    const bodyRows = matrix.map((b) => {
      const row: string[] = [b.cleanBranchName];

      pageDates.forEach((date) => {
        const cell = b.cells[date];
        if (cell.type === "Verified") {
          row.push(cell.critical ? "VERIFIED (!)" : "VERIFIED");
        } else if (cell.type === "Submitted") {
          row.push(cell.critical ? "SUBMIT (!)" : "SUBMIT");
        } else if (cell.type === "Late (Verified)" || cell.type === "Late (Submitted)") {
          const days = cell.daysLate ? `+${cell.daysLate}d` : "LATE";
          row.push(cell.critical ? `LATE ${days} (!)` : `LATE ${days}`);
        } else {
          row.push("-");
        }
      });

      return row;
    });

    // Spacious column dimensions across full page width
    const branchColWidth = 120;
    const availableDateWidth = 842 - marginX * 2 - branchColWidth;
    const dateColWidth = Math.floor(availableDateWidth / Math.max(pageDates.length, 1));

    const colStyles: Record<number, { cellWidth?: number; halign?: "left" | "center"; fontStyle?: "bold" | "normal" }> = {
      0: { cellWidth: branchColWidth, halign: "left", fontStyle: "bold" },
    };

    pageDates.forEach((_, idx) => {
      colStyles[idx + 1] = { cellWidth: dateColWidth, halign: "center" };
    });

    // AutoTable Matrix
    autoTable(doc, {
      startY: 84,
      margin: { left: marginX, right: marginX },
      head: [headRow1, headRow2],
      body: bodyRows,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: { top: 5, bottom: 5, left: 2, right: 2 },
        halign: "center",
        valign: "middle",
        lineColor: [226, 232, 240],
        lineWidth: 0.6,
        font: "helvetica",
      },
      headStyles: {
        fillColor: [67, 56, 202],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
        valign: "middle",
        cellPadding: { top: 5, bottom: 5, left: 2, right: 2 },
      },
      columnStyles: colStyles,
      didParseCell: (data) => {
        if (data.section === "head" && data.row.index === 1) {
          data.cell.styles.fillColor = [55, 48, 163];
          data.cell.styles.fontSize = 7.5;
        }

        if (data.section === "body") {
          const text = String(data.cell.raw ?? "");
          const colIdx = data.column.index;

          if (colIdx === 0) {
            data.cell.styles.textColor = [30, 41, 59];
            data.cell.styles.fillColor = [248, 250, 252];
          }

          if (colIdx >= 1 && colIdx <= pageDates.length) {
            if (text.startsWith("VERIFIED")) {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.textColor = [21, 128, 61];
              data.cell.styles.fontStyle = "bold";
            } else if (text.startsWith("SUBMIT")) {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [180, 83, 9];
              data.cell.styles.fontStyle = "bold";
            } else if (text.startsWith("LATE")) {
              data.cell.styles.fillColor = [255, 228, 230];
              data.cell.styles.textColor = [190, 18, 60];
              data.cell.styles.fontStyle = "bold";
            } else if (text === "-") {
              data.cell.styles.fillColor = [255, 255, 255];
              data.cell.styles.textColor = [148, 163, 184];
              data.cell.styles.fontStyle = "normal";
            }

            // Highlight critical alert
            if (text.includes("(!)")) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = "bold";
            }
          }
        }
      },
    });

    // ─────────────────────────────────────────────────────────────
    // CRITICAL ISSUES & REMARKS SECTION BELOW THE MATRIX
    // ─────────────────────────────────────────────────────────────
    // Collect all critical issues or remarks submitted during this week's dates
    const weekRemarks: { date: string; branch: string; critical: boolean; issue: string; remarks: string }[] = [];
    pageDates.forEach((date) => {
      matrix.forEach((b) => {
        const c = b.cells[date]?.entry;
        if (!c) return;
        const hasRemarks = Boolean(c.remarks && c.remarks.trim().length > 0 && c.remarks.trim() !== "-");
        const hasEscalation = Boolean(c.escalation_details && c.escalation_details.trim().length > 0 && c.escalation_details.trim() !== "-");
        const isCritical = c.critical_issues === "Yes";
        if (isCritical || hasRemarks || hasEscalation) {
          weekRemarks.push({
            date,
            branch: b.cleanBranchName,
            critical: isCritical,
            issue: (c.escalation_details && c.escalation_details.trim() !== "-") ? c.escalation_details.trim() : "-",
            remarks: (c.remarks && c.remarks.trim() !== "-") ? c.remarks.trim() : "-",
          });
        }
      });
    });

    // Sort remarks date desc, then critical first
    weekRemarks.sort((a, b) => {
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Render Critical Issues & Remarks Table below the matrix on this week's page
    const lastY = (doc as any).lastAutoTable?.finalY ?? 260;
    const startRemarksY = lastY + 16;

    if (startRemarksY < 510 && weekRemarks.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`Week ${weekIdx + 1} — Critical Issues & Operational Remarks (${weekRemarks.length})`, marginX, startRemarksY);

      const remarksTableRows = weekRemarks.slice(0, 8).map((r) => [
        r.date,
        r.branch,
        r.critical ? "CRITICAL ALERT" : "Normal",
        r.issue !== "-" ? r.issue : r.remarks,
        r.remarks !== "-" && r.issue !== "-" ? r.remarks : "-",
      ]);

      autoTable(doc, {
        startY: startRemarksY + 6,
        margin: { left: marginX, right: marginX },
        head: [["Date", "Branch", "Critical Status", "Escalation Issue Details", "Branch Manager Remarks"]],
        body: remarksTableRows,
        theme: "grid",
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
          overflow: "linebreak",
          valign: "middle",
          lineColor: [226, 232, 240],
        },
        headStyles: {
          fillColor: [71, 85, 105], // Slate-600
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 55, halign: "center" },
          1: { cellWidth: 80, halign: "left", fontStyle: "bold" },
          2: { cellWidth: 70, halign: "center", fontStyle: "bold" },
          3: { cellWidth: 280, halign: "left" },
          4: { cellWidth: "auto", halign: "left" },
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            const raw = String(data.cell.raw ?? "");
            if (data.column.index === 2 && raw.includes("CRITICAL")) {
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });
    }
  });

  const fileBaseName = `branch-checklists-matrix-${options.fromDate}-to-${options.toDate}`;
  doc.save(`${fileBaseName}.pdf`);
}

function getColLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = "";
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter || "A";
}
