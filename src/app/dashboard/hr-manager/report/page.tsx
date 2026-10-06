"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, getDaysInMonth, addDays } from "date-fns";
import {
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  Search,
  ChevronRight,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as ExcelJS from "exceljs";

import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { getAllBranches } from "@/lib/api/director";
import { getEmployees, getEmployeeAttendance, type AttendanceBranchSession } from "@/lib/api/employees";

// ACCENTS for the branch list cards
const ACCENTS = [
  { iconColor: "text-violet-500", bgIcon: "bg-violet-500/10", border: "hover:border-violet-500/30" },
  { iconColor: "text-blue-500", bgIcon: "bg-blue-500/10", border: "hover:border-blue-500/30" },
  { iconColor: "text-emerald-500", bgIcon: "bg-emerald-500/10", border: "hover:border-emerald-500/30" },
  { iconColor: "text-rose-500", bgIcon: "bg-rose-500/10", border: "hover:border-rose-500/30" },
  { iconColor: "text-amber-500", bgIcon: "bg-amber-500/10", border: "hover:border-amber-500/30" },
  { iconColor: "text-indigo-500", bgIcon: "bg-indigo-500/10", border: "hover:border-indigo-500/30" },
  { iconColor: "text-teal-500", bgIcon: "bg-teal-500/10", border: "hover:border-teal-500/30" },
];

const statusMap: Record<string, string> = {
  Present: "Present",
  Absent: "Absent",
  "Half Day": "Half Day",
  "On Leave": "Leave",
  "Work From Home": "Work From Home",
  "At Head Office": "At Head Office",
  Holiday: "Holiday",
  "Not Marked": "-",
};

const statusColors: Record<string, string> = {
  Present: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Absent: "text-rose-700 bg-rose-50 border-rose-200",
  "Half Day": "text-amber-700 bg-amber-50 border-amber-200",
  "On Leave": "text-sky-700 bg-sky-50 border-sky-200",
  "Work From Home": "text-indigo-700 bg-indigo-50 border-indigo-200",
  "At Head Office": "text-indigo-700 bg-indigo-50 border-indigo-200",
  Holiday: "text-purple-700 bg-purple-50 border-purple-200",
  "Not Marked": "text-gray-400 bg-gray-50/50 border-gray-100",
};

function formatDisplayTime(val?: string | null): string {
  if (!val) return "";
  let raw = val;
  if (raw.includes("T")) {
    raw = raw.split("T")[1] || "";
  } else if (raw.includes(" ")) {
    raw = raw.split(" ")[1] || "";
  }
  return raw.slice(0, 5);
}

// Convert 24-hour "HH:mm" to 12-hour format "hh:mm AM/PM"
function formatTo12Hour(time24?: string | null): string {
  if (!time24) return "";
  const clean = formatDisplayTime(time24);
  const parts = clean.split(":");
  if (parts.length < 2) return clean;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  if (isNaN(hours)) return clean;
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12.toString().padStart(2, "0")}:${minutes} ${period}`;
}

function calculateWorkingHours(inTime?: string, outTime?: string, backendHours?: number): string {
  if (backendHours && backendHours > 0) {
    const hrs = Math.floor(backendHours);
    const mins = Math.round((backendHours - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  if (!inTime || !outTime) return "";
  const [inH, inM] = inTime.split(":").map(Number);
  const [outH, outM] = outTime.split(":").map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return "";

  let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  if (diffMinutes < 0) diffMinutes += 24 * 60;
  if (diffMinutes <= 0) return "";

  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/** Calculate total working hours from multiple sessions by summing each active session duration */
function calculateSessionsWorkingHours(sessions: DaySessionDetail[]): string {
  let totalMinutes = 0;
  sessions.forEach((s) => {
    const isPresent = !s.status || s.status === "Present" || s.status === "Half Day";
    if (isPresent && s.in_time && s.out_time) {
      const [inH, inM] = s.in_time.split(":").map(Number);
      const [outH, outM] = s.out_time.split(":").map(Number);
      if (!isNaN(inH) && !isNaN(inM) && !isNaN(outH) && !isNaN(outM)) {
        let diff = (outH * 60 + outM) - (inH * 60 + inM);
        if (diff < 0) diff += 24 * 60;
        if (diff > 0) totalMinutes += diff;
      }
    }
  });

  if (totalMinutes <= 0) return "";
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/** Calculate late minutes for a session given in_time and class_time */
function getSessionLateMinutes(inTime?: string, classTime?: string): number {
  if (!inTime || !classTime) return 0;
  const [inH, inM] = inTime.split(":").map(Number);
  const [cH, cM] = classTime.split(":").map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(cH) || isNaN(cM)) return 0;
  const diff = (inH * 60 + inM) - (cH * 60 + cM);
  return diff > 0 ? diff : 0;
}

export interface DaySessionDetail {
  id?: string;
  title?: string;
  branch?: string;
  in_time?: string;
  out_time?: string;
  class_time?: string;
  status?: string;
  is_visiting?: boolean | number;
}

interface DayAttendanceRecord {
  status: string;
  in_time?: string;
  out_time?: string;
  working_hours?: string;
  custom_class_time?: string;
  custom_visiting_branch?: string;
  sessions?: DaySessionDetail[];
}

function parseSessionsJson(jsonStr?: string): DaySessionDetail[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function HRMonthlyReportDashboard() {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));

  // Calculate Dates for Report
  const startDate = startOfMonth(new Date(`${selectedMonth}-01`));
  const endDate = endOfMonth(startDate);
  const fromDateStr = format(startDate, "yyyy-MM-dd");
  const toDateStr = format(endDate, "yyyy-MM-dd");
  const daysInMonth = getDaysInMonth(startDate);

  const daysArray = Array.from({ length: daysInMonth }).map((_, i) => addDays(startDate, i));

  // Fetch branches
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["hr-report-branches"],
    queryFn: getAllBranches,
    staleTime: 5 * 60_000,
  });

  // Filter out Smart Up / HQ branch
  const activeBranches = useMemo(() => {
    return branches.filter((b) => b.name !== "Smart Up");
  }, [branches]);

  // Fetch all active employees
  const { data: employeesRes, isLoading: loadingEmployees } = useQuery({
    queryKey: ["hr-report-all-employees"],
    queryFn: () => getEmployees({ status: "Active", limit_page_length: 1000 }),
    staleTime: 5 * 60_000,
  });

  const allEmployees = employeesRes?.data ?? [];

  // Group active employees count by branch
  const branchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allEmployees.forEach((emp) => {
      counts[emp.company] = (counts[emp.company] || 0) + 1;
    });
    return counts;
  }, [allEmployees]);

  // Fetch attendance for selected branch & selected month
  const { data: attRes, isLoading: loadingAttendance } = useQuery({
    queryKey: ["hr-report-attendance", selectedBranch, fromDateStr, toDateStr],
    queryFn: () =>
      getEmployeeAttendance({
        company: selectedBranch || undefined,
        from_date: fromDateStr,
        to_date: toDateStr,
        limit_page_length: 5000,
      }),
    enabled: !!selectedBranch,
    staleTime: 60_000,
  });

  const branchEmployees = useMemo(() => {
    if (!selectedBranch) return [];
    return allEmployees.filter((e) => e.company === selectedBranch);
  }, [allEmployees, selectedBranch]);

  const attendances = attRes?.data ?? [];

  // Build matrix for selected branch
  const matrix = useMemo(() => {
    if (!selectedBranch) return [];
    const attMap: Record<string, Record<string, DayAttendanceRecord>> = {};

    attendances.forEach((att) => {
      if (!attMap[att.employee]) {
        attMap[att.employee] = {};
      }
      const inTime = formatDisplayTime(att.in_time || att.custom_check_in);
      const outTime = formatDisplayTime(att.out_time || att.custom_check_out);
      // Parse sessions from custom_sessions_json
      const parsedSessions = parseSessionsJson(att.custom_sessions_json).map((s) => ({
        ...s,
        in_time: formatDisplayTime(s.in_time),
        out_time: formatDisplayTime(s.out_time),
        class_time: formatDisplayTime(s.class_time),
      }));

      // Calculate working hours: if sessions are present, sum each session's duration; otherwise fallback
      let workHrs = "";
      if (parsedSessions.length > 0) {
        workHrs = calculateSessionsWorkingHours(parsedSessions);
      }
      if (!workHrs) {
        workHrs = calculateWorkingHours(inTime, outTime, att.working_hours);
      }

      attMap[att.employee][att.attendance_date] = {
        status: att.status,
        in_time: inTime,
        out_time: outTime,
        working_hours: workHrs,
        custom_class_time: att.custom_class_time ? att.custom_class_time.slice(0, 5) : undefined,
        custom_visiting_branch: att.custom_visiting_branch || undefined,
        sessions: parsedSessions,
      };
    });

    return branchEmployees.map((emp) => {
      const row: { employeeName: string; designation: string; dates: Record<string, DayAttendanceRecord> } = {
        employeeName: emp.employee_name,
        designation: emp.designation || emp.department || "-",
        dates: {},
      };

      daysArray.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        row.dates[dateStr] = attMap[emp.name]?.[dateStr] || { status: "Not Marked" };
      });

      return row;
    });
  }, [selectedBranch, branchEmployees, attendances, daysArray]);

  const shortName = selectedBranch 
    ? selectedBranch.replace("Smart Up ", "").replace("Smart Up", "HQ")
    : "";

  // PDF Export
  const exportPDF = () => {
    const page1Days = daysArray.slice(0, 10);
    const page2Days = daysArray.slice(10, 20);
    const page3Days = daysArray.slice(20);

    const pagesGroup = [page1Days, page2Days, page3Days].filter((group) => group.length > 0);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const totalPages = pagesGroup.length;

    const renderHeader = (pageNumber: number, titleSuffix: string) => {
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 297, 24, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`SMART UP ERP — Staff Attendance Report (${shortName})`, 14, 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${format(startDate, "MMMM yyyy")}  |  ${titleSuffix}  |  Page ${pageNumber} of ${totalPages}`, 14, 18);

      doc.setFillColor(238, 242, 255);
      doc.roundedRect(240, 6, 43, 12, 3, 3, "F");
      doc.setTextColor(67, 56, 202);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(shortName.toUpperCase(), 261.5, 13.5, { align: "center" });
    };

    const buildTableHead = (daysGroup: Date[]) => [
      ["Employee & Role", ...daysGroup.map((d) => `${format(d, "dd")}\n${format(d, "EEE").toUpperCase()}`)],
    ];

    const buildTableBody = (daysGroup: Date[]) =>
      matrix.map((row) => [
        `${row.employeeName}\n${row.designation}`,
        ...daysGroup.map((d) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const rec = row.dates[dateStr];
          const fullWord = statusMap[rec.status] || "-";

          // If multiple sessions exist
          if (rec.sessions && rec.sessions.length > 1) {
            const sessLines = rec.sessions
              .filter((s) => s.in_time || s.out_time)
              .map((s, idx) => {
                const sClassTime = s.class_time || rec.custom_class_time || (idx === 0 ? "09:00" : "16:00");
                const sLate = getSessionLateMinutes(s.in_time, sClassTime);
                const latePart = sLate > 0 ? ` (${sLate}m late)` : "";
                const in12 = formatTo12Hour(s.in_time) || "--";
                const out12 = formatTo12Hour(s.out_time) || "--";
                return `S${idx + 1}: ${in12} - ${out12}${latePart}`;
              })
              .join("\n");
            const hrs = rec.working_hours ? `\n(Tot: ${rec.working_hours})` : "";
            const visitingSuffix = rec.custom_visiting_branch ? `\n(Visiting: ${rec.custom_visiting_branch.replace("Smart Up ", "").replace("Smart Up", "HQ")})` : "";
            return `${fullWord}\n${sessLines}${hrs}${visitingSuffix}`;
          }

          if ((rec.status === "Present" || rec.status === "Half Day") && (rec.in_time || rec.out_time)) {
            const inT = formatTo12Hour(rec.in_time) || "--:--";
            const outT = formatTo12Hour(rec.out_time) || "--:--";
            const hrs = rec.working_hours ? ` (${rec.working_hours})` : "";
            const classTimeVal = rec.custom_class_time || "09:00";
            const lateDiff = getSessionLateMinutes(rec.in_time, classTimeVal);
            const lateStr = lateDiff > 0 ? `\n(${lateDiff}m late)` : "";
            const visitingSuffix = rec.custom_visiting_branch ? `\n(Visiting: ${rec.custom_visiting_branch.replace("Smart Up ", "").replace("Smart Up", "HQ")})` : "";
            return `${fullWord}\n${inT} - ${outT}${hrs}${lateStr}${visitingSuffix}`;
          }
          const visitingSuffix = rec.custom_visiting_branch ? `\n(Visiting: ${rec.custom_visiting_branch.replace("Smart Up ", "").replace("Smart Up", "HQ")})` : "";
          return `${fullWord}${visitingSuffix}`;
        }),
      ]);

    pagesGroup.forEach((daysGroup, idx) => {
      if (idx > 0) doc.addPage("a4", "landscape");

      const startDay = format(daysGroup[0], "dd");
      const endDay = format(daysGroup[daysGroup.length - 1], "dd");
      renderHeader(idx + 1, `Part ${idx + 1}: Days ${startDay} – ${endDay}`);

      autoTable(doc, {
        startY: 28,
        head: buildTableHead(daysGroup),
        body: buildTableBody(daysGroup),
        theme: "grid",
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          valign: "middle",
          halign: "center",
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [51, 65, 85],
          fontStyle: "bold",
          fontSize: 7.5,
          halign: "center",
        },
        columnStyles: {
          0: { halign: "left", fontStyle: "bold", cellWidth: 38 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index > 0) {
            const raw = String(data.cell.raw || "");
            if (raw.startsWith("Present")) {
              data.cell.styles.textColor = [16, 120, 70];
            } else if (raw.startsWith("Absent")) {
              data.cell.styles.textColor = [190, 25, 50];
            } else if (raw.startsWith("Half Day")) {
              data.cell.styles.textColor = [180, 100, 20];
            } else if (raw.startsWith("Leave")) {
              data.cell.styles.textColor = [14, 116, 144];
            } else if (raw.startsWith("Holiday")) {
              data.cell.styles.textColor = [126, 34, 206];
            } else if (raw === "-") {
              data.cell.styles.textColor = [160, 174, 192];
            }
          }
        },
        margin: { top: 28, left: 10, right: 10, bottom: 12 },
      });
    });

    doc.save(`Attendance_${shortName}_${format(startDate, "MMM_yyyy")}.pdf`);
  };

  // Excel Export
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SmartUp ERP";
    const sheet = workbook.addWorksheet("Attendance");

    const columns = [
      { header: "Employee", key: "emp", width: 25 },
      { header: "Designation", key: "desig", width: 20 },
      ...daysArray.map((d) => ({ header: format(d, "dd (E)"), key: format(d, "yyyy-MM-dd"), width: 20 })),
    ];
    sheet.columns = columns;

    matrix.forEach((row) => {
      const rowData: Record<string, string> = { emp: row.employeeName, desig: row.designation };
      daysArray.forEach((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const rec = row.dates[dateStr];
        const fullWord = statusMap[rec.status] || "-";

        if (rec.sessions && rec.sessions.length > 1) {
          const sessDetails = rec.sessions
            .filter((s) => s.in_time || s.out_time)
            .map((s, idx) => {
              const sClassTime = s.class_time || rec.custom_class_time || (idx === 0 ? "09:00" : "16:00");
              const sLate = getSessionLateMinutes(s.in_time, sClassTime);
              const latePart = sLate > 0 ? ` (${sLate}m late)` : "";
              const in12 = formatTo12Hour(s.in_time) || "--";
              const out12 = formatTo12Hour(s.out_time) || "--";
              return `S${idx + 1}: ${in12}-${out12}${latePart}`;
            })
            .join("; ");
          const hrs = rec.working_hours ? ` (${rec.working_hours})` : "";
          const visitingSuffix = rec.custom_visiting_branch ? ` (Visiting: ${rec.custom_visiting_branch.replace("Smart Up ", "").replace("Smart Up", "HQ")})` : "";
          rowData[dateStr] = `${fullWord} [${sessDetails}]${hrs}${visitingSuffix}`;
        } else if ((rec.status === "Present" || rec.status === "Half Day") && (rec.in_time || rec.out_time)) {
          const hrs = rec.working_hours ? ` (${rec.working_hours})` : "";
          const classTimeVal = rec.custom_class_time || "09:00";
          const lateDiff = getSessionLateMinutes(rec.in_time, classTimeVal);
          const lateStr = lateDiff > 0 ? ` (${lateDiff}m late)` : "";
          const in12 = formatTo12Hour(rec.in_time) || "--";
          const out12 = formatTo12Hour(rec.out_time) || "--";
          const visitingSuffix = rec.custom_visiting_branch ? ` (Visiting: ${rec.custom_visiting_branch.replace("Smart Up ", "").replace("Smart Up", "HQ")})` : "";
          rowData[dateStr] = `${fullWord} [${in12} - ${out12}]${hrs}${lateStr}${visitingSuffix}`;
        } else {
          const visitingSuffix = rec.custom_visiting_branch ? ` (Visiting: ${rec.custom_visiting_branch.replace("Smart Up ", "").replace("Smart Up", "HQ")})` : "";
          rowData[dateStr] = `${fullWord}${visitingSuffix}`;
        }
      });
      sheet.addRow(rowData);
    });

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_${shortName}_${format(startDate, "MMM_yyyy")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Branch Filter logic
  const filteredBranches = useMemo(() => {
    return activeBranches.filter((b) => {
      const short = b.name.replace("Smart Up ", "").replace("Smart Up", "HQ");
      return short.toLowerCase().includes(branchSearch.toLowerCase()) || b.abbr.toLowerCase().includes(branchSearch.toLowerCase());
    });
  }, [activeBranches, branchSearch]);

  const isReportLoading = loadingAttendance || loadingEmployees;

  return (
    <div className="space-y-6 pb-12">
      <BreadcrumbNav />

      {/* RENDER LIST OF BRANCH CARDS */}
      {!selectedBranch ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Staff Branch Overview
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Select a branch to view monthly staff attendance records and reports.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search branches..."
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="pl-10 h-10.5 rounded-xl border-slate-200 bg-white dark:bg-slate-900 shadow-sm"
            />
          </div>

          {/* Grid of branches */}
          {loadingBranches ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading branches...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBranches.map((branch, index) => {
                const accent = ACCENTS[index % ACCENTS.length];
                const empCount = branchCounts[branch.name] || 0;
                const shortBranchName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");

                return (
                  <Card
                    key={branch.name}
                    onClick={() => setSelectedBranch(branch.name)}
                    className={`cursor-pointer transition-all duration-200 border-slate-200 dark:border-slate-800 ${accent.border} hover:shadow-md hover:-translate-y-0.5 group`}
                  >
                    <CardHeader className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent.bgIcon}`}>
                            <Building2 className={`w-5 h-5 ${accent.iconColor}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                              {shortBranchName}
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-400 mt-0.5">
                              {branch.abbr}
                            </CardDescription>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {empCount} Active Staff
                        </span>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          View Report &rarr;
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* RENDER DETAILED REPORT FOR SELECTED BRANCH */
        <div className="space-y-6">
          {/* Top Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBranch(null)}
                className="gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" /> All Branches
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-violet-600 dark:text-violet-400">{shortName}</span> Attendance Report
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monthly overview & multi-session breakdown for {format(startDate, "MMMM yyyy")}
                </p>
              </div>
            </div>

            {/* Filter controls & export buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40 h-9.5 text-xs rounded-xl border-slate-200 bg-white dark:bg-slate-900"
              />

              <Button
                variant="outline"
                size="sm"
                onClick={exportExcel}
                disabled={isReportLoading || matrix.length === 0}
                className="gap-1.5 text-xs h-9.5 font-medium border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportPDF}
                disabled={isReportLoading || matrix.length === 0}
                className="gap-1.5 text-xs h-9.5 font-medium border-rose-200 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <FileText className="w-4 h-4 text-rose-600" /> Export PDF
              </Button>
            </div>
          </div>

          {/* Quick Legend Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mr-1">
              <Clock className="w-3.5 h-3.5 text-violet-500" /> Key:
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-medium">
              Present
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 font-medium">
              Absent
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 font-medium">
              Half Day
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20 font-medium">
              Leave
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 font-medium">
              Work From Home
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 font-medium">
              At Head Office
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20 font-medium">
              Holiday
            </span>
            <span className="text-slate-400 dark:text-slate-500 ml-auto">
              Timestamps: <strong className="text-slate-700 dark:text-slate-300">In - Out</strong> &bull; <strong className="text-violet-600 dark:text-violet-400 font-bold">Hrs</strong>
            </span>
          </div>

          {/* Main Table */}
          {isReportLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
              <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Generating report matrix...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto pb-2">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-20 border-r border-slate-200 dark:border-slate-800 min-w-[220px] shadow-sm">
                        Employee Name
                      </th>
                      {daysArray.map((day) => {
                        const dayName = format(day, "EEE");
                        const isWeekend = dayName === "Sat" || dayName === "Sun";
                        return (
                          <th
                            key={day.toISOString()}
                            className={`px-2 py-2.5 text-center font-medium min-w-[100px] border-r border-slate-200/50 dark:border-slate-800/50 ${
                              isWeekend ? "bg-amber-500/5 text-amber-900 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">{dayName}</span>
                              <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{format(day, "dd")}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {matrix.length === 0 ? (
                      <tr>
                        <td colSpan={daysArray.length + 1} className="px-4 py-12 text-center text-slate-400">
                          No staff employees found for this branch.
                        </td>
                      </tr>
                    ) : (
                      matrix.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                          {/* Fixed Employee Column */}
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-950 z-10 border-r border-slate-200 dark:border-slate-800 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-900/30 shadow-sm">
                            <div className="font-semibold text-slate-900 dark:text-white">{row.employeeName}</div>
                            <div className="text-[11px] font-normal text-slate-400 truncate max-w-[190px]">
                              {row.designation}
                            </div>
                          </td>

                          {/* Day Columns */}
                          {daysArray.map((day) => {
                            const dateStr = format(day, "yyyy-MM-dd");
                            const rec = row.dates[dateStr];
                            const status = rec.status;
                            const fullWord = statusMap[status] || "-";
                            const colorClass = statusColors[status] || "text-slate-400 dark:text-slate-500 border-transparent";
                            const hasMultipleSessions = rec.sessions && rec.sessions.length > 1;
                            const showTimings = (status === "Present" || status === "Half Day") && (rec.in_time || rec.out_time);
                            let lateMins = 0;
                            const classTimeVal = rec.custom_class_time || "09:00";
                            if (showTimings && rec.in_time && classTimeVal) {
                              const [inH, inM] = rec.in_time.split(":").map(Number);
                              const [classH, classM] = classTimeVal.split(":").map(Number);
                              if (!isNaN(inH) && !isNaN(inM) && !isNaN(classH) && !isNaN(classM)) {
                                const diff = (inH * 60 + inM) - (classH * 60 + classM);
                                if (diff > 0) {
                                  lateMins = diff;
                                }
                              }
                            }

                            return (
                              <td key={dateStr} className="px-1.5 py-2 text-center border-r border-slate-200/30 dark:border-slate-850/30 vertical-top">
                                <div className="flex flex-col items-center gap-1 justify-center min-h-[46px]">
                                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colorClass}`}>
                                    {fullWord}
                                  </span>

                                  {rec.custom_visiting_branch && (
                                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/30 px-1 py-0.5 rounded mt-0.5" title={`Visiting Branch: ${rec.custom_visiting_branch}`}>
                                      📍 {rec.custom_visiting_branch.replace("Smart Up ", "").replace("Smart Up", "HQ")}
                                    </span>
                                  )}

                                  {/* Multi-Session display */}
                                  {hasMultipleSessions ? (
                                    <div className="flex flex-col items-center gap-0.5 w-full mt-0.5">
                                      {rec.sessions!.map((s, sIdx) => {
                                        if (!s.in_time && !s.out_time) return null;
                                        const sClassTime = s.class_time || rec.custom_class_time || (sIdx === 0 ? "09:00" : "16:00");
                                        const sLate = getSessionLateMinutes(s.in_time, sClassTime);
                                        const in12 = formatTo12Hour(s.in_time) || "--:--";
                                        const out12 = formatTo12Hour(s.out_time) || "--:--";
                                        return (
                                          <div
                                            key={s.id || sIdx}
                                            className="text-[9px] font-medium text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1 w-full max-w-[145px]"
                                            title={s.title || `Session ${sIdx + 1}`}
                                          >
                                            <div className="flex items-center gap-1">
                                              <span className="font-bold text-violet-600 dark:text-violet-400">S{sIdx + 1}</span>
                                              <span>
                                                {in12} - {out12}
                                              </span>
                                            </div>
                                            {sLate > 0 && (
                                              <span className="text-[8.5px] font-bold text-rose-600 dark:text-rose-450 whitespace-nowrap ml-1" title={`Late by ${sLate}m (Class: ${formatTo12Hour(sClassTime)})`}>
                                                ⚠️ {sLate}m
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {rec.working_hours && (
                                        <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold mt-0.5">
                                          ⏱ {rec.working_hours}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    /* Single Session Timings */
                                    showTimings && (
                                      <div className="flex flex-col items-center text-[9.5px] leading-tight font-medium text-slate-600 dark:text-slate-350 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 shadow-xs">
                                        <span>
                                          <strong className="text-emerald-700 dark:text-emerald-400">{formatTo12Hour(rec.in_time) || "--:--"}</strong> - <strong className="text-rose-600 dark:text-rose-400">{formatTo12Hour(rec.out_time) || "--:--"}</strong>
                                        </span>
                                        {rec.working_hours && (
                                          <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold mt-0.5">
                                            ⏱ {rec.working_hours}
                                          </span>
                                        )}
                                        {lateMins > 0 && (
                                          <span className="text-[9px] text-rose-600 dark:text-rose-450 font-bold mt-0.5">
                                            ⚠️ {lateMins}m late
                                          </span>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
