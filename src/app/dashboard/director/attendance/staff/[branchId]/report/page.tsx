"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, getDaysInMonth, addDays } from "date-fns";
import { ArrowLeft, FileText, FileSpreadsheet, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as ExcelJS from "exceljs";

import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { getEmployees, getEmployeeAttendance } from "@/lib/api/employees";

// Status definitions with full display words
const statusMap: Record<string, string> = {
  Present: "Present",
  Absent: "Absent",
  "Half Day": "Half Day",
  "On Leave": "Leave",
  "Work From Home": "Work From Home",
  "At Head Office": "At Head Office",
  "Not Marked": "-",
};

const statusColors: Record<string, string> = {
  Present: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Absent: "text-rose-700 bg-rose-50 border-rose-200",
  "Half Day": "text-amber-700 bg-amber-50 border-amber-200",
  "On Leave": "text-sky-700 bg-sky-50 border-sky-200",
  "Work From Home": "text-indigo-700 bg-indigo-50 border-indigo-200",
  "At Head Office": "text-indigo-700 bg-indigo-50 border-indigo-200",
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
  if (diffMinutes < 0) diffMinutes += 24 * 60; // Overnight shift fallback
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
}

export default function StaffMonthlyReportPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.branchId as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");

  // State for Month Selection
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));

  // Calculate Dates
  const startDate = startOfMonth(new Date(`${selectedMonth}-01`));
  const endDate = endOfMonth(startDate);
  const fromDateStr = format(startDate, "yyyy-MM-dd");
  const toDateStr = format(endDate, "yyyy-MM-dd");
  const daysInMonth = getDaysInMonth(startDate);

  const daysArray = Array.from({ length: daysInMonth }).map((_, i) => addDays(startDate, i));

  // Fetch employees
  const { data: empRes, isLoading: empLoading } = useQuery({
    queryKey: ["employees", branchName],
    queryFn: () => getEmployees({ company: branchName, status: "Active" }),
    staleTime: 5 * 60_000,
  });

  // Fetch attendance for the entire month
  const { data: attRes, isLoading: attLoading } = useQuery({
    queryKey: ["employee-attendance", branchName, fromDateStr, toDateStr],
    queryFn: () =>
      getEmployeeAttendance({
        company: branchName,
        from_date: fromDateStr,
        to_date: toDateStr,
        limit_page_length: 5000,
      }),
    staleTime: 60_000,
  });

  const employees = empRes?.data ?? [];
  const attendances = attRes?.data ?? [];

  // Build matrix
  const matrix = useMemo(() => {
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
      };
    });

    return employees.map((emp) => {
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
  }, [employees, attendances, daysArray]);

  const exportPDF = () => {
    // Split days into 3 pages (approx 10-11 days per page) for comfortable spacing with full status names, times & hours
    const page1Days = daysArray.slice(0, 10);
    const page2Days = daysArray.slice(10, 20);
    const page3Days = daysArray.slice(20);

    const pagesGroup = [page1Days, page2Days, page3Days].filter((group) => group.length > 0);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const totalPages = pagesGroup.length;

    const renderHeader = (pageNumber: number, titleSuffix: string) => {
      // Header Background Banner
      doc.setFillColor(79, 70, 229); // Primary Indigo #4F46E5
      doc.rect(0, 0, 297, 24, "F");

      // Title & Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`SMART UP ERP — Staff Attendance Report (${shortName})`, 14, 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${format(startDate, "MMMM yyyy")}  |  ${titleSuffix}  |  Page ${pageNumber} of ${totalPages}`, 14, 18);

      // Branch Badge
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
            return `${fullWord}\n${inT} - ${outT}${hrs}${lateStr}`;
          }
          return fullWord;
        }),
      ]);

    pagesGroup.forEach((daysGroup, idx) => {
      if (idx > 0) {
        doc.addPage("a4", "landscape");
      }

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
            } else if (raw === "-") {
              data.cell.styles.textColor = [156, 163, 175];
            }
          }
        },
      });
    });

    doc.save(`Staff_Attendance_Report_${shortName}_${format(startDate, "MMM_yyyy")}.pdf`);
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance");

    // Header
    const columns = [
      { header: "Employee", key: "emp", width: 25 },
      { header: "Designation", key: "desig", width: 20 },
      ...daysArray.map((d) => ({ header: format(d, "dd (E)"), key: format(d, "yyyy-MM-dd"), width: 18 })),
    ];
    sheet.columns = columns;

    // Data
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
          rowData[dateStr] = `${fullWord} [${rec.in_time || "--"} - ${rec.out_time || "--"}]${hrs}${lateStr}`;
        } else {
          rowData[dateStr] = fullWord;
        }
      });
      sheet.addRow(rowData);
    });

    // Style Header
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

  const isLoading = empLoading || attLoading;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-surface p-5 rounded-2xl border border-border-light shadow-xs">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/director/attendance/staff/${params.branchId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Monthly Attendance Report — {shortName}
            </h1>
            <p className="text-xs text-text-tertiary mt-0.5">
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
          <Button variant="outline" onClick={exportExcel} className="gap-2 rounded-xl" disabled={isLoading || matrix.length === 0}>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Excel
          </Button>
          <Button onClick={exportPDF} className="gap-2 rounded-xl bg-primary hover:bg-primary-hover" disabled={isLoading || matrix.length === 0}>
            <FileText className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex items-center gap-4 flex-wrap px-4 py-2.5 bg-surface/70 rounded-xl border border-border-light text-xs">
        <span className="font-semibold text-text-secondary flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-primary" /> Key:
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
          Present
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-medium">
          Absent
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium">
          Half Day
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-medium">
          Leave
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
          Work From Home
        </span>
        <span className="text-text-tertiary ml-auto">
          Timestamps: <strong className="text-text-secondary">In - Out</strong> · <strong className="text-primary font-bold">Hrs</strong>
        </span>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <GifLoader />
      ) : (
        <div className="bg-surface border border-border-light rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-app-bg/80 border-b border-border-light">
                <tr>
                  <th className="px-4 py-3 font-semibold text-text-secondary sticky left-0 bg-surface z-20 border-r border-border-light min-w-[220px] shadow-xs">
                    Employee Name
                  </th>
                  {daysArray.map((day) => {
                    const dayName = format(day, "EEE");
                    const isWeekend = dayName === "Sat" || dayName === "Sun";
                    return (
                      <th
                        key={day.toISOString()}
                        className={`px-2 py-2.5 text-center font-medium min-w-[85px] border-r border-border-light/40 ${
                          isWeekend ? "bg-amber-500/5 text-amber-900" : "text-text-secondary"
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] uppercase font-semibold text-text-tertiary">{dayName}</span>
                          <span className="text-xs font-bold text-text-primary">{format(day, "dd")}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/60">
                {matrix.length === 0 ? (
                  <tr>
                    <td colSpan={daysArray.length + 1} className="px-4 py-12 text-center text-text-tertiary">
                      No staff employees found for this branch.
                    </td>
                  </tr>
                ) : (
                  matrix.map((row, i) => (
                    <tr key={i} className="hover:bg-brand-wash/30 transition-colors group">
                      {/* Fixed Employee Column */}
                      <td className="px-4 py-3 font-medium text-text-primary sticky left-0 bg-surface z-10 border-r border-border-light group-hover:bg-brand-wash/30 shadow-xs">
                        <div className="font-semibold text-text-primary">{row.employeeName}</div>
                        <div className="text-[11px] font-normal text-text-tertiary truncate max-w-[190px]">
                          {row.designation}
                        </div>
                      </td>

                      {/* Day Columns */}
                      {daysArray.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const rec = row.dates[dateStr];
                        const status = rec.status;
                        const fullWord = statusMap[status] || "-";
                        const colorClass = statusColors[status] || "text-text-tertiary border-transparent";
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
                          <td key={dateStr} className="px-1.5 py-2.5 text-center border-r border-border-light/30 vertical-top">
                            <div className="flex flex-col items-center gap-1 justify-center min-h-[46px]">
                              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colorClass}`}>
                                {fullWord}
                              </span>

                              {showTimings && (
                                <div className="flex flex-col items-center text-[9.5px] leading-tight font-medium text-text-secondary bg-surface px-1.5 py-0.5 rounded border border-border-light/80 shadow-2xs">
                                  <span>
                                    <strong className="text-emerald-700">{rec.in_time || "--:--"}</strong> - <strong className="text-rose-600">{rec.out_time || "--:--"}</strong>
                                  </span>
                                  {rec.working_hours && (
                                    <span className="text-[9px] text-primary font-bold mt-0.5">
                                      ⏱ {rec.working_hours}
                                    </span>
                                  )}
                                  {lateMins > 0 && (
                                    <span className="text-[9px] text-error font-bold mt-0.5">
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
  );
}
