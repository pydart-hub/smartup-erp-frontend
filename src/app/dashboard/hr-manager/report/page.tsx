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
import { getEmployees, getEmployeeAttendance } from "@/lib/api/employees";

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

interface DayAttendanceRecord {
  status: string;
  in_time?: string;
  out_time?: string;
  working_hours?: string;
  custom_class_time?: string;
  custom_visiting_branch?: string;
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
      const workHrs = calculateWorkingHours(inTime, outTime, att.working_hours);

      attMap[att.employee][att.attendance_date] = {
        status: att.status,
        in_time: inTime,
        out_time: outTime,
        working_hours: workHrs,
        custom_class_time: att.custom_class_time ? att.custom_class_time.slice(0, 5) : undefined,
        custom_visiting_branch: att.custom_visiting_branch || undefined,
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
          if ((rec.status === "Present" || rec.status === "Half Day") && (rec.in_time || rec.out_time)) {
            const inT = rec.in_time || "--:--";
            const outT = rec.out_time || "--:--";
            const hrs = rec.working_hours ? ` (${rec.working_hours})` : "";
            let lateStr = "";
            const classTimeVal = rec.custom_class_time || "09:00";
            if (rec.in_time && classTimeVal) {
              const [inH, inM] = rec.in_time.split(":").map(Number);
              const [classH, classM] = classTimeVal.split(":").map(Number);
              if (!isNaN(inH) && !isNaN(inM) && !isNaN(classH) && !isNaN(classM)) {
                const diff = (inH * 60 + inM) - (classH * 60 + classM);
                if (diff > 0) {
                  lateStr = `\n(${diff}m late)`;
                }
              }
            }
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
        head: buildTableHead(daysGroup),
        body: buildTableBody(daysGroup),
        startY: 28,
        margin: { left: 12, right: 12 },
        styles: {
          fontSize: 6.5,
          cellPadding: { top: 3.5, bottom: 3.5, left: 1, right: 1 },
          halign: "center",
          valign: "middle",
          lineColor: [229, 231, 235],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [31, 41, 55],
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 44, halign: "left", fontStyle: "bold" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index > 0) {
            const raw = String(data.cell.raw || "");
            if (raw.startsWith("Present")) {
              data.cell.styles.fillColor = [236, 253, 245];
              data.cell.styles.textColor = [4, 120, 87];
              data.cell.styles.fontStyle = "bold";
            } else if (raw.startsWith("Absent")) {
              data.cell.styles.fillColor = [255, 241, 242];
              data.cell.styles.textColor = [190, 18, 60];
              data.cell.styles.fontStyle = "bold";
            } else if (raw.startsWith("Half Day")) {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [180, 83, 9];
              data.cell.styles.fontStyle = "bold";
            } else if (raw.startsWith("Leave")) {
              data.cell.styles.fillColor = [240, 249, 255];
              data.cell.styles.textColor = [3, 105, 161];
            } else if (raw.startsWith("Work From Home")) {
              data.cell.styles.fillColor = [238, 242, 255];
              data.cell.styles.textColor = [67, 56, 202];
            } else if (raw.startsWith("At Head Office")) {
              data.cell.styles.fillColor = [238, 242, 255];
              data.cell.styles.textColor = [67, 56, 202];
            } else if (raw.startsWith("Holiday")) {
              data.cell.styles.fillColor = [243, 232, 255];
              data.cell.styles.textColor = [126, 34, 206];
              data.cell.styles.fontStyle = "bold";
            } else if (raw === "-") {
              data.cell.styles.textColor = [156, 163, 175];
            }
          }
        },
      });
    });

    doc.save(`Staff_Attendance_Report_${shortName}_${format(startDate, "MMM_yyyy")}.pdf`);
  };

  // Excel Export
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance");

    const columns = [
      { header: "Employee", key: "emp", width: 25 },
      { header: "Designation", key: "desig", width: 20 },
      ...daysArray.map((d) => ({ header: format(d, "dd (E)"), key: format(d, "yyyy-MM-dd"), width: 18 })),
    ];
    sheet.columns = columns;

    matrix.forEach((row) => {
      const rowData: Record<string, string> = { emp: row.employeeName, desig: row.designation };
      daysArray.forEach((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const rec = row.dates[dateStr];
        const fullWord = statusMap[rec.status] || "-";
        if ((rec.status === "Present" || rec.status === "Half Day") && (rec.in_time || rec.out_time)) {
          const hrs = rec.working_hours ? ` (${rec.working_hours})` : "";
          let lateStr = "";
          const classTimeVal = rec.custom_class_time || "09:00";
          if (rec.in_time && classTimeVal) {
            const [inH, inM] = rec.in_time.split(":").map(Number);
            const [classH, classM] = classTimeVal.split(":").map(Number);
            if (!isNaN(inH) && !isNaN(inM) && !isNaN(classH) && !isNaN(classM)) {
              const diff = (inH * 60 + inM) - (classH * 60 + classM);
              if (diff > 0) {
                lateStr = ` (${diff}m late)`;
              }
            }
          }
          const visitingSuffix = rec.custom_visiting_branch ? ` (Visiting: ${rec.custom_visiting_branch.replace("Smart Up ", "").replace("Smart Up", "HQ")})` : "";
          rowData[dateStr] = `${fullWord} [${rec.in_time || "--"} - ${rec.out_time || "--"}]${hrs}${lateStr}${visitingSuffix}`;
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
                const staffCount = branchCounts[branch.name] || 0;
                const short = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");

                return (
                  <Card
                    key={branch.name}
                    hover
                    onClick={() => setSelectedBranch(branch.name)}
                    className={`cursor-pointer bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${accent.border} overflow-hidden`}
                  >
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${accent.bgIcon} ${accent.iconColor}`}>
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-base">
                            {short}
                          </h3>
                          <Badge variant="outline" className="mt-1 font-mono text-[10px] uppercase">
                            {branch.abbr || "BRANCH"}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                            {staffCount}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">
                            Staff
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-700" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* RENDER DETAILED MONTHLY ATTENDANCE GRID */
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBranch(null)}
                className="gap-1.5 rounded-xl text-slate-600 dark:text-slate-300"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Monthly Attendance Report — {shortName}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Includes check-in, check-out & working hours for {format(startDate, "MMMM yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40 h-10 rounded-xl"
              />
              <Button
                variant="outline"
                onClick={exportExcel}
                className="gap-2 rounded-xl border-slate-200 dark:border-slate-800"
                disabled={isReportLoading || matrix.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Excel
              </Button>
              <Button
                onClick={exportPDF}
                className="gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
                disabled={isReportLoading || matrix.length === 0}
              >
                <FileText className="h-4 w-4" /> Export PDF
              </Button>
            </div>
          </div>

          {/* Legend Bar */}
          <div className="flex items-center gap-2.5 flex-wrap px-4 py-2.5 bg-white/50 dark:bg-slate-900/20 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-violet-500" /> Key:
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
                            className={`px-2 py-2.5 text-center font-medium min-w-[85px] border-r border-slate-200/50 dark:border-slate-800/50 ${
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
                              <td key={dateStr} className="px-1.5 py-2.5 text-center border-r border-slate-200/30 dark:border-slate-850/30 vertical-top">
                                <div className="flex flex-col items-center gap-1 justify-center min-h-[46px]">
                                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colorClass}`}>
                                    {fullWord}
                                  </span>

                                  {rec.custom_visiting_branch && (
                                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/30 px-1 py-0.5 rounded mt-0.5" title={`Visiting Branch: ${rec.custom_visiting_branch}`}>
                                      📍 {rec.custom_visiting_branch.replace("Smart Up ", "").replace("Smart Up", "HQ")}
                                    </span>
                                  )}

                                  {showTimings && (
                                    <div className="flex flex-col items-center text-[9.5px] leading-tight font-medium text-slate-600 dark:text-slate-350 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 shadow-xs">
                                      <span>
                                        <strong className="text-emerald-700 dark:text-emerald-400">{rec.in_time || "--:--"}</strong> - <strong className="text-rose-600 dark:text-rose-400">{rec.out_time || "--:--"}</strong>
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
