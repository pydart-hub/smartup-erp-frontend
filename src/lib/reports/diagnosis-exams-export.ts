import { type AttemptWithPublishing, getAttemptLevelBreakdown } from "@/lib/public-exam/diagnostics";

export interface StudentGroupExportData {
  key: string;
  studentName: string;
  studentPhone: string | null;
  studentBranch: string | null;
  classLevel: string;
  attempts: AttemptWithPublishing[];
}

interface ExportClassMatrixOptions {
  classLevel: string;
  branchName: string;
  students: StudentGroupExportData[];
  subjects: string[];
  totalClassSubjects: number;
  filterLabel?: string;
}

interface ExportStudentCardOptions {
  student: StudentGroupExportData;
  branchName: string;
  classLevel: string;
}

function formatDate(dateStr: Date | string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAttendanceStatus(student: StudentGroupExportData, totalClassSubjects: number) {
  const uniqueSubjects = new Set(student.attempts.map((a) => a.publishing?.subject?.name).filter(Boolean)).size;
  const isFull = uniqueSubjects >= totalClassSubjects;
  const isSingle = uniqueSubjects === 1;
  const statusLabel = isFull ? "Full Attended" : isSingle ? "1 Attempt Only" : "Partial";
  return {
    uniqueSubjects,
    totalClassSubjects,
    isFull,
    isSingle,
    statusLabel,
    progressStr: `${uniqueSubjects}/${totalClassSubjects}`,
  };
}

/**
 * 1. Export Class Diagnostic Performance Matrix (.xlsx)
 */
export async function exportDiagnosisClassMatrixExcel({
  classLevel,
  branchName,
  students,
  subjects,
  totalClassSubjects,
  filterLabel = "All Students",
}: ExportClassMatrixOptions) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SmartUp ERP";
  wb.created = new Date();

  const ws = wb.addWorksheet(`Class ${classLevel} Matrix`);

  // Title Block
  ws.mergeCells(1, 1, 1, 6 + subjects.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `SMARTUP EDUCATION — CLASS ${classLevel} DIAGNOSIS EXAM MATRIX`;
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5F2EA8" } }; // #5f2ea8
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 36;

  // Subtitle / Info Block
  ws.mergeCells(2, 1, 2, 6 + subjects.length);
  const subCell = ws.getCell(2, 1);
  subCell.value = `Branch: ${branchName}   |   Filter: ${filterLabel} (${students.length} Students)   |   Generated: ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}`;
  subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF555555" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F1FA" } };
  subCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 22;

  // Empty spacer row
  ws.getRow(3).height = 10;

  // Headers Row (Row 4)
  const headers = [
    "#",
    "Student Name",
    "Phone & Contact",
    "Attendance Status",
    "Subjects Attended",
    ...subjects,
    "Average %",
    "Last Attempt Date",
  ];
  const headerRow = ws.addRow(headers);
  headerRow.height = 28;
  headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  // Apply gradient-like brand header colors
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colNumber <= 3 ? "FF4D238C" : colNumber <= 5 ? "FF5F2EA8" : "FF6D34C2" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF3D1B70" } },
      bottom: { style: "medium", color: { argb: "FF3D1B70" } },
      left: { style: "thin", color: { argb: "FF7E52D4" } },
      right: { style: "thin", color: { argb: "FF7E52D4" } },
    };
  });

  // Data Rows
  students.forEach((student, index) => {
    const attendance = getAttendanceStatus(student, totalClassSubjects);

    // Group attempts by subject (latest attempt for each subject)
    const attemptsBySubject: Record<string, AttemptWithPublishing> = {};
    student.attempts.forEach((a) => {
      const subName = a.publishing?.subject?.name;
      if (subName && (!attemptsBySubject[subName] || new Date(a.startedAt) > new Date(attemptsBySubject[subName].startedAt))) {
        attemptsBySubject[subName] = a;
      }
    });

    const subjectValues = subjects.map((subName) => {
      const attempt = attemptsBySubject[subName];
      if (!attempt) return "Not Attended";

      const isSubmitted = attempt.status === "submitted" || attempt.status === "auto_submitted";
      const { diagnosedLevel, diagnosedCorrect, diagnosedTotal } = getAttemptLevelBreakdown(attempt);

      if (diagnosedLevel) {
        const liveSuffix = isSubmitted ? "" : " (Live)";
        const scoreSuffix = diagnosedCorrect !== null && diagnosedTotal !== null ? ` [${diagnosedCorrect}/${diagnosedTotal}]` : ` [${attempt.scoreObtained}/${attempt.totalMarks}]`;
        return `${diagnosedLevel}${liveSuffix}${scoreSuffix}`;
      }

      return isSubmitted
        ? `Score: ${attempt.scoreObtained}/${attempt.totalMarks} (${attempt.percentage}%)`
        : `In Progress (${attempt.scoreObtained}/${attempt.totalMarks})`;
    });

    // Calculate student overall average percentage across submitted attempts
    const submittedAttempts = student.attempts.filter((a) => a.status === "submitted" || a.status === "auto_submitted");
    const avgPct =
      submittedAttempts.length > 0
        ? Math.round(submittedAttempts.reduce((sum, a) => sum + a.percentage, 0) / submittedAttempts.length)
        : student.attempts.length > 0
        ? Math.round(student.attempts.reduce((sum, a) => sum + a.percentage, 0) / student.attempts.length)
        : 0;

    const latestAttempt = student.attempts[0];

    const rowData = [
      index + 1,
      student.studentName,
      student.studentPhone || "—",
      attendance.statusLabel,
      attendance.progressStr,
      ...subjectValues,
      `${avgPct}%`,
      formatDate(latestAttempt?.startedAt),
    ];

    const row = ws.addRow(rowData);
    row.height = 24;
    row.font = { name: "Arial", size: 9.5 };

    const isEven = index % 2 === 0;
    const zebraBg = isEven ? "FFFFFFFF" : "FFFBF9FE"; // light violet zebra

    row.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraBg } };
      cell.alignment = { vertical: "middle" };

      // Center numeric and status columns
      if (colNum === 1 || colNum === 3 || colNum === 4 || colNum === 5 || colNum > 5 + subjects.length) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Subject columns styling
      if (colNum > 5 && colNum <= 5 + subjects.length) {
        const val = String(cell.value || "");
        if (val === "Not Attended") {
          cell.font = { name: "Arial", size: 9, color: { argb: "FFDC2626" }, italic: true };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else {
          cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      }

      // Status pill coloring
      if (colNum === 4) {
        if (attendance.isFull) {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF059669" } }; // green
        } else if (attendance.isSingle) {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFD97706" } }; // amber
        } else {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF2563EB" } }; // blue
        }
      }

      // Average % styling
      if (colNum === 6 + subjects.length) {
        cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF5F2EA8" } };
      }
    });
  });

  // Auto-fit column widths
  ws.columns.forEach((col, idx) => {
    let maxLen = 0;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      if (Number(cell.row) < 4) return; // Skip title and subtitle
      const val = cell.value ? String(cell.value) : "";
      if (val.length > maxLen) maxLen = val.length;
    });
    if (idx === 0) col.width = 6;
    else if (idx === 1) col.width = Math.max(maxLen + 4, 24);
    else if (idx === 2) col.width = 16;
    else if (idx === 3) col.width = 18;
    else if (idx === 4) col.width = 16;
    else col.width = Math.max(maxLen + 4, 18);
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, `SmartUp_Class_${classLevel}_Diagnosis_Matrix_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 2. Export Class Summary Report (.pdf)
 */
export async function exportDiagnosisClassMatrixPdf({
  classLevel,
  branchName,
  students,
  subjects,
  totalClassSubjects,
  filterLabel = "All Students",
}: ExportClassMatrixOptions) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header Banner
  doc.setFillColor(95, 46, 168); // #5f2ea8
  doc.rect(0, 0, 297, 24, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(`SmartUp Education — Class ${classLevel} Diagnosis Exam Report`, 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(230, 220, 250);
  doc.text(
    `Branch: ${branchName}   |   Filter: ${filterLabel} (${students.length} Students)   |   Exported: ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}`,
    14,
    18
  );

  // Table Headers
  const tableHeaders = [
    ["#", "Student Name", "Phone", "Attendance", ...subjects, "Avg %"],
  ];

  // Table Data Rows
  const tableRows = students.map((student, idx) => {
    const attendance = getAttendanceStatus(student, totalClassSubjects);

    const attemptsBySubject: Record<string, AttemptWithPublishing> = {};
    student.attempts.forEach((a) => {
      const subName = a.publishing?.subject?.name;
      if (subName && (!attemptsBySubject[subName] || new Date(a.startedAt) > new Date(attemptsBySubject[subName].startedAt))) {
        attemptsBySubject[subName] = a;
      }
    });

    const subjectCells = subjects.map((subName) => {
      const attempt = attemptsBySubject[subName];
      if (!attempt) return "Not Attended";

      const isSubmitted = attempt.status === "submitted" || attempt.status === "auto_submitted";
      const { diagnosedLevel, diagnosedCorrect, diagnosedTotal } = getAttemptLevelBreakdown(attempt);

      if (diagnosedLevel) {
        const liveStr = isSubmitted ? "" : " (Live)";
        const scoreStr = diagnosedCorrect !== null && diagnosedTotal !== null ? `\n(${diagnosedCorrect}/${diagnosedTotal})` : `\n(${attempt.scoreObtained}/${attempt.totalMarks})`;
        return `${diagnosedLevel}${liveStr}${scoreStr}`;
      }

      return isSubmitted
        ? `${attempt.scoreObtained}/${attempt.totalMarks}\n(${attempt.percentage}%)`
        : `Live\n(${attempt.scoreObtained}/${attempt.totalMarks})`;
    });

    const submitted = student.attempts.filter((a) => a.status === "submitted" || a.status === "auto_submitted");
    const avgPct =
      submitted.length > 0
        ? Math.round(submitted.reduce((sum, a) => sum + a.percentage, 0) / submitted.length)
        : student.attempts.length > 0
        ? Math.round(student.attempts.reduce((sum, a) => sum + a.percentage, 0) / student.attempts.length)
        : 0;

    return [
      idx + 1,
      student.studentName,
      student.studentPhone || "—",
      `${attendance.statusLabel}\n(${attendance.progressStr})`,
      ...subjectCells,
      `${avgPct}%`,
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: tableHeaders,
    body: tableRows,
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2.5,
      valign: "middle",
      halign: "center",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [95, 46, 168],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 42, halign: "left", fontStyle: "bold" },
      2: { cellWidth: 26, halign: "center" },
      3: { cellWidth: 26, halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [250, 248, 253],
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const text = String(data.cell.raw || "");
        if (text.includes("Not Attended")) {
          data.cell.styles.textColor = [220, 38, 38]; // Red
          data.cell.styles.fontStyle = "italic";
        } else if (text.includes("Full Attended")) {
          data.cell.styles.textColor = [5, 150, 105]; // Green
          data.cell.styles.fontStyle = "bold";
        } else if (text.includes("1 Attempt Only")) {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      doc.setFontSize(8);
      doc.setTextColor(150);
      const str = `Page ${data.pageNumber} of ${(doc as any).internal.getNumberOfPages()}  •  SmartUp Academic Diagnostic System`;
      doc.text(str, 14, 204);
    },
  });

  doc.save(`SmartUp_Class_${classLevel}_Diagnosis_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 3. Export Detailed Attempts Register (.xlsx)
 */
export async function exportDiagnosisAttemptsRegisterExcel({
  classLevel,
  branchName,
  students,
  filterLabel = "All Students",
}: ExportClassMatrixOptions) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SmartUp ERP";

  const ws = wb.addWorksheet(`Class ${classLevel} Attempts`);

  // Title Row
  ws.mergeCells("A1:M1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `SMARTUP EDUCATION — CLASS ${classLevel} ATTEMPTS REGISTER`;
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5F2EA8" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 36;

  // Subtitle
  ws.mergeCells("A2:M2");
  const subCell = ws.getCell("A2");
  subCell.value = `Branch: ${branchName}   |   Filter: ${filterLabel}   |   Generated: ${new Date().toLocaleDateString("en-IN")}`;
  subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF555555" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F1FA" } };
  ws.getRow(2).height = 22;

  // Header Row
  const headers = [
    "#",
    "Student Name",
    "Phone Number",
    "Branch",
    "Class",
    "Subject",
    "Status",
    "Marks Scored",
    "Total Marks",
    "Percentage",
    "Diagnosed Level",
    "Started At",
    "Submitted At",
  ];
  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5F2EA8" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Flatten all attempts
  let rowIdx = 1;
  students.forEach((student) => {
    student.attempts.forEach((attempt) => {
      const isSubmitted = attempt.status === "submitted" || attempt.status === "auto_submitted";
      const { diagnosedLevel } = getAttemptLevelBreakdown(attempt);

      const row = ws.addRow([
        rowIdx++,
        student.studentName,
        student.studentPhone || "—",
        student.studentBranch || branchName,
        `Class ${student.classLevel}`,
        attempt.publishing?.subject?.name || "—",
        isSubmitted ? "Submitted" : "In Progress",
        attempt.scoreObtained,
        attempt.totalMarks,
        `${attempt.percentage}%`,
        diagnosedLevel || "—",
        formatDate(attempt.startedAt),
        formatDate(attempt.submittedAt),
      ]);

      row.height = 20;
      row.font = { name: "Arial", size: 9 };
      row.eachCell((cell, col) => {
        cell.alignment = { vertical: "middle" };
        if (col === 1 || (col >= 7 && col <= 11)) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      });
    });
  });

  ws.columns.forEach((col) => {
    let maxLen = 0;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      if (Number(cell.row) < 3) return;
      const val = cell.value ? String(cell.value) : "";
      if (val.length > maxLen) maxLen = val.length;
    });
    col.width = Math.max(maxLen + 3, 12);
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, `SmartUp_Class_${classLevel}_Attempts_Register_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 4. Export Detailed Attempts Register (.csv)
 */
export function exportDiagnosisAttemptsRegisterCsv({
  classLevel,
  branchName,
  students,
}: ExportClassMatrixOptions) {
  const headers = [
    "Student Name",
    "Phone",
    "Branch",
    "Class",
    "Subject",
    "Status",
    "Score",
    "Total Marks",
    "Percentage",
    "Diagnosed Level",
    "Started At",
    "Submitted At",
  ];

  const rows: string[][] = [];

  students.forEach((student) => {
    student.attempts.forEach((attempt) => {
      const isSubmitted = attempt.status === "submitted" || attempt.status === "auto_submitted";
      const { diagnosedLevel } = getAttemptLevelBreakdown(attempt);

      rows.push([
        escapeCsv(student.studentName),
        escapeCsv(student.studentPhone || ""),
        escapeCsv(student.studentBranch || branchName),
        escapeCsv(`Class ${student.classLevel}`),
        escapeCsv(attempt.publishing?.subject?.name || ""),
        escapeCsv(isSubmitted ? "Submitted" : "In Progress"),
        String(attempt.scoreObtained),
        String(attempt.totalMarks),
        `${attempt.percentage}%`,
        escapeCsv(diagnosedLevel || ""),
        escapeCsv(formatDate(attempt.startedAt)),
        escapeCsv(formatDate(attempt.submittedAt)),
      ]);
    });
  });

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `SmartUp_Class_${classLevel}_Attempts_Register_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * 5. Export Single Student Diagnostic Profile Card (.pdf)
 */
export async function exportStudentDiagnosticCardPdf({
  student,
  branchName,
  classLevel,
}: ExportStudentCardOptions) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Header Banner
  doc.setFillColor(95, 46, 168); // #5f2ea8
  doc.rect(0, 0, 210, 32, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("SMARTUP EDUCATION", 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 220, 250);
  doc.text("STUDENT DIAGNOSTIC ASSESSMENT SCORECARD", 14, 21);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}`, 14, 27);

  // Student Info Box
  doc.setFillColor(248, 246, 252);
  doc.roundedRect(14, 38, 182, 26, 3, 3, "F");
  doc.setDrawColor(220, 210, 240);
  doc.roundedRect(14, 38, 182, 26, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(95, 46, 168);
  doc.text(student.studentName, 20, 47);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(`Phone: ${student.studentPhone || "—"}`, 20, 54);
  doc.text(`Class: Class ${classLevel}`, 20, 59);

  doc.text(`Branch: ${student.studentBranch || branchName}`, 110, 47);
  doc.text(`Total Tests: ${student.attempts.length} attempts`, 110, 54);

  // Breakdown Table
  const tableHeaders = [["Subject", "Status", "Score", "Percentage", "Diagnosed Foundation Level"]];
  const tableRows = student.attempts.map((a) => {
    const isSubmitted = a.status === "submitted" || a.status === "auto_submitted";
    const { diagnosedLevel } = getAttemptLevelBreakdown(a);

    return [
      a.publishing?.subject?.name || "Exam",
      isSubmitted ? "Submitted" : "In Progress",
      `${a.scoreObtained} / ${a.totalMarks}`,
      `${a.percentage}%`,
      diagnosedLevel || (isSubmitted ? "Assessed" : "Pending"),
    ];
  });

  autoTable(doc, {
    startY: 70,
    head: tableHeaders,
    body: tableRows,
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 3.5,
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: [95, 46, 168],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 50 },
      4: { fontStyle: "bold", textColor: [95, 46, 168] },
    },
    alternateRowStyles: {
      fillColor: [252, 250, 255],
    },
  });

  // Footer / Sign-off
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text("SmartUp Learning Systems  •  Confidential Student Diagnostic Report", 14, 280);

  const cleanName = student.studentName.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${cleanName}_Class_${classLevel}_Diagnosis_Report.pdf`);
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
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
