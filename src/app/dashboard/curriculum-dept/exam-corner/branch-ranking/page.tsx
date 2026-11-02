"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Users, 
  Sparkles,
  Award,
  ChevronRight,
  School,
  CheckCircle2,
  XCircle,
  Printer,
  Percent,
  Calendar,
  FileSpreadsheet
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { getBranches } from "@/lib/api/enrollment";
import { getAssessmentGroups, getBatchResults } from "@/lib/api/assessment";

export default function ExamBranchRankingPage() {
  // Selected Exam Group State
  const [selectedExam, setSelectedExam] = useState("Quarterly Exam");

  // Drill-down levels: "branches" | "classes" | "report"
  const [level, setLevel] = useState<"branches" | "classes" | "report">("branches");
  const [viewMode, setViewMode] = useState<"combined" | "separate">("combined");
  
  // Entities selection
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedClass, setSelectedClass] = useState(""); // Student Group ID or comma-separated IDs
  const [selectedClassName, setSelectedClassName] = useState(""); // Student Group name
  const [selectedSubBatches, setSelectedSubBatches] = useState<{ id: string; name: string; division: string }[]>([]);
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState("all");
  const [selectedFilterSubject, setSelectedFilterSubject] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Helper to determine tailwind classes based on pass rate percentage
  const getRateColor = (rate: number) => {
    if (rate === 0) return { text: "text-text-tertiary", bg: "bg-text-tertiary" };
    if (rate >= 85) return { text: "text-success", bg: "bg-success" };
    if (rate >= 60) return { text: "text-primary", bg: "bg-primary" };
    return { text: "text-error", bg: "bg-error" };
  };

  // 1. Fetch available assessment groups
  const { data: assessmentGroups = [] } = useQuery({
    queryKey: ["all-assessment-groups"],
    queryFn: getAssessmentGroups,
    staleTime: 5 * 60_000,
  });

  // Filter or list standard exam groups
  const examOptions = useMemo(() => {
    const list = assessmentGroups
      .map(g => g.name)
      .filter(name => !name.toLowerCase().startsWith("cwc")); // Show non-CWC or standard exams first, though user can pick any
    
    // Ensure standard exams exist if Frappe list is empty or slow
    const defaults = ["Quarterly Exam", "Onam Exam", "Monthly Exam", "Weekly Exam", "School Exam", "Diagnosis Exam", "Annual Exam"];
    const merged = Array.from(new Set([...list, ...defaults])).filter(Boolean);
    return merged;
  }, [assessmentGroups]);

  // If initial selectedExam not in list, pick the first
  React.useEffect(() => {
    if (examOptions.length > 0 && !examOptions.includes(selectedExam)) {
      setSelectedExam(examOptions[0]);
    }
  }, [examOptions, selectedExam]);

  // 2. Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches-for-rates-exam"],
    queryFn: getBranches,
    staleTime: 5 * 60_000,
  });

  // 3. Fetch assessment plans
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["all-plans-for-exam-corner"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Plan",
          method: "GET",
          payload: {
            fields: JSON.stringify([
              "name",
              "student_group",
              "assessment_name",
              "course",
              "schedule_date",
              "maximum_assessment_score",
              "custom_branch",
              "assessment_group"
            ]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "2000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // 4. Fetch assessment results
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["all-results-for-exam-corner"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Result",
          method: "GET",
          payload: {
            fields: JSON.stringify(["assessment_plan", "total_score", "maximum_score"]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "15000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // Map results by assessment plan
  const resultsByPlan = useMemo(() => {
    const map = new Map<string, any[]>();
    allResults.forEach((r: any) => {
      if (!map.has(r.assessment_plan)) {
        map.set(r.assessment_plan, []);
      }
      map.get(r.assessment_plan)!.push(r);
    });
    return map;
  }, [allResults]);

  const computePassRate = (results: any[]) => {
    if (!results.length) return { rate: 0, total: 0 };
    let passed = 0;
    results.forEach(r => {
      if (r.maximum_score > 0 && (r.total_score / r.maximum_score) * 100 >= 40) {
        passed++;
      }
    });
    return {
      rate: Math.round((passed / results.length) * 100),
      total: results.length
    };
  };

  const matchesSelectedExam = (plan: any) => {
    const ag = (plan.assessment_group || "").toLowerCase();
    const an = (plan.assessment_name || "").toLowerCase();
    const sel = selectedExam.toLowerCase();
    return ag === sel || an.includes(sel) || ag.includes(sel);
  };

  // Compute branch pass rates strictly filtered by selected Exam Group
  const branchPerformances = useMemo(() => {
    return branches.map((b: any) => {
      const branchPlans = allPlans.filter((p: any) => {
        if (p.custom_branch !== b.name) return false;
        return matchesSelectedExam(p);
      });
      const branchResultsList: any[] = [];
      branchPlans.forEach((p: any) => {
        const resList = resultsByPlan.get(p.name) || [];
        branchResultsList.push(...resList);
      });

      const { rate, total } = computePassRate(branchResultsList);
      return {
        name: b.name,
        passRate: total > 0 ? `${rate}%` : "N/A",
        numericRate: rate,
        examsCount: branchPlans.length
      };
    });
  }, [branches, allPlans, resultsByPlan, selectedExam]);

  // 5. Fetch student groups when branch is selected
  const { data: studentGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["exam-student-groups-by-branch", selectedBranch],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Student Group",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "student_group_name", "program", "custom_branch"]),
            filters: JSON.stringify([["custom_branch", "=", selectedBranch], ["disabled", "=", 0]]),
            limit_page_length: "500"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    enabled: level === "classes" && !!selectedBranch,
    staleTime: 5 * 60_000,
  });

  // Calculate pass rates for each class in selected branch under the selected exam group
  const classPerformances = useMemo(() => {
    return studentGroups.map((sg: any) => {
      const classPlans = allPlans.filter((p: any) => {
        if (p.student_group !== sg.name) return false;
        return matchesSelectedExam(p);
      });
      const classResultsList: any[] = [];
      classPlans.forEach((p: any) => {
        const resList = resultsByPlan.get(p.name) || [];
        classResultsList.push(...resList);
      });

      const { rate, total } = computePassRate(classResultsList);
      return {
        id: sg.name,
        name: sg.student_group_name,
        program: sg.program,
        subBatches: [{ id: sg.name, name: sg.student_group_name, division: "" }],
        divisions: [],
        passRate: total > 0 ? `${rate}%` : "N/A",
        numericRate: rate,
        examsCount: classPlans.length,
        isCombined: false
      };
    });
  }, [studentGroups, allPlans, resultsByPlan, selectedExam]);

  const parseBatchInfo = (name: string) => {
    if (!name) return { baseName: "", division: "" };
    const match = name.match(/^(.*?)[-_\s]+(?:sec(?:tion)?|div(?:ision)?\s*)?([A-Z0-9])$/i);
    if (match) {
      return { baseName: match[1].trim(), division: match[2].toUpperCase() };
    }
    return { baseName: name.trim(), division: "" };
  };

  // Aggregated pass rates combining section batches into one combined class entity
  const combinedClassPerformances = useMemo(() => {
    const groupsMap = new Map<string, {
      baseName: string;
      program: string;
      subBatches: { id: string; name: string; division: string }[];
      classPlans: any[];
      classResultsList: any[];
    }>();

    studentGroups.forEach((sg: any) => {
      const { baseName, division } = parseBatchInfo(sg.student_group_name);
      
      const plansForSg = allPlans.filter((p: any) => {
        if (p.student_group !== sg.name) return false;
        return matchesSelectedExam(p);
      });

      if (!groupsMap.has(baseName)) {
        groupsMap.set(baseName, {
          baseName,
          program: sg.program,
          subBatches: [],
          classPlans: [],
          classResultsList: [],
        });
      }

      const group = groupsMap.get(baseName)!;
      group.subBatches.push({
        id: sg.name,
        name: sg.student_group_name,
        division: division || sg.student_group_name,
      });

      plansForSg.forEach((p: any) => {
        if (!group.classPlans.some((existingP: any) => existingP.name === p.name)) {
          group.classPlans.push(p);
        }
        const resList = resultsByPlan.get(p.name) || [];
        group.classResultsList.push(...resList);
      });
    });

    return Array.from(groupsMap.values()).map((g) => {
      const { rate, total } = computePassRate(g.classResultsList);
      const subBatchIds = g.subBatches.map((sb) => sb.id).join(",");
      const divisions = g.subBatches.map((sb) => sb.division).filter(Boolean);

      return {
        id: subBatchIds,
        name: g.baseName,
        program: g.program,
        subBatches: g.subBatches,
        divisions,
        passRate: total > 0 ? `${rate}%` : "N/A",
        numericRate: rate,
        examsCount: g.classPlans.length,
        isCombined: g.subBatches.length > 1
      };
    });
  }, [studentGroups, allPlans, resultsByPlan, selectedExam]);

  // 6. Fetch consolidated results for class Exam
  const { data: batchData, isLoading: batchLoading } = useQuery({
    queryKey: ["exam-class-batch-results", selectedClass, selectedExam],
    queryFn: () => getBatchResults({
      student_group: selectedClass,
      assessment_group: selectedExam
    }),
    enabled: level === "report" && !!selectedClass && !!selectedExam,
    staleTime: 30_000,
  });

  const studentsList = batchData?.data ?? [];
  const batchSummary = batchData?.summary;

  const [selectedFilter, setSelectedFilter] = useState("all");

  const filterOptions = [
    { label: "All Students", value: "all" },
    { label: "⚡ Advanced Students Only", value: "advanced_only" },
    { label: "📘 Basic Students Only", value: "basic_only" },
    { label: "Class Topper", value: "topper" },
    { label: "Top 3", value: "top3" },
    { label: "Top 5", value: "top5" },
    { label: "Top 10", value: "top10" },
    { label: "Top 15", value: "top15" },
    { label: "Full Mark Achievers", value: "full_mark" },
    { label: "Full A+ Achievers", value: "full_aplus" },
    { label: "90% & Above", value: "p90" },
    { label: "85% & Above", value: "p85" },
    { label: "80% & Above", value: "p80" },
    { label: "75% & Above", value: "p75" },
    { label: "70% & Above", value: "p70" },
    { label: "60% & Above", value: "p60" },
    { label: "50% & Above", value: "p50" },
    { label: "30% & Above", value: "p30" },
    { label: "Below 70%", value: "below70" },
    { label: "Below 60%", value: "below60" },
    { label: "Below 50%", value: "below50" },
    { label: "Below 30% (Failed in Any Subject)", value: "failed_any" },
    { label: "Passed in All Subjects", value: "passed_all" },
  ];

  const filteredStudents = useMemo(() => {
    let list = studentsList;
    if (selectedDivisionFilter !== "all") {
      list = list.filter((st: any) => st.student_group === selectedDivisionFilter);
    }
    if (selectedFilter === "all") return list;
    return list.filter((st: any) => {
      const isPassedAll = !st.subjects.some((sub: any) => sub.percentage < 40) && st.passed;
      const isFailedAny = st.subjects.some((sub: any) => sub.percentage < 40);
      const planName = (st.custom_plan || "").toLowerCase();
      switch (selectedFilter) {
        case "advanced_only":
          return planName.includes("advanced");
        case "basic_only":
          return planName.includes("basic") || !planName;
        case "topper":
          return st.rank === 1;
        case "top3":
          return st.rank <= 3;
        case "top5":
          return st.rank <= 5;
        case "top10":
          return st.rank <= 10;
        case "top15":
          return st.rank <= 15;
        case "full_mark":
          return st.total_score === st.total_maximum;
        case "full_aplus":
          return st.subjects.length > 0 && !st.subjects.some((sub: any) => sub.grade !== "A+");
        case "p90":
          return st.overall_percentage >= 90;
        case "p85":
          return st.overall_percentage >= 85;
        case "p80":
          return st.overall_percentage >= 80;
        case "p75":
          return st.overall_percentage >= 75;
        case "p70":
          return st.overall_percentage >= 70;
        case "p60":
          return st.overall_percentage >= 60;
        case "p50":
          return st.overall_percentage >= 50;
        case "p30":
          return st.overall_percentage >= 30;
        case "below70":
          return st.overall_percentage < 70;
        case "below60":
          return st.overall_percentage < 60;
        case "below50":
          return st.overall_percentage < 50;
        case "failed_any":
          return isFailedAny;
        case "passed_all":
          return isPassedAll;
        default:
          return true;
      }
    });
  }, [studentsList, selectedFilter, selectedDivisionFilter]);

  const uniqueCourses = useMemo(() => {
    const map = new Map<string, string>();
    studentsList.forEach((st) => {
      st.subjects.forEach((sub: any) => {
        if (!map.has(sub.course)) {
          map.set(sub.course, sub.course.replace(/-.*/, ""));
        }
      });
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [studentsList]);

  const analysisCriteria = [
    { title: "Topper", filterVal: "topper" },
    { title: "Top 3", filterVal: "top3" },
    { title: "Top 5", filterVal: "top5" },
    { title: "90% & Above", filterVal: "p90" },
    { title: "80% & Above", filterVal: "p80" },
    { title: "Below 30% (Failed in Any Subject)", filterVal: "failed_any" }
  ];

  const analysisData = useMemo(() => {
    const total = studentsList.length;
    if (total === 0) return [];
    return analysisCriteria.map((crit) => {
      const list = studentsList.filter((st) => {
        const isFailedAny = st.subjects.some((sub: any) => sub.percentage < 40);
        switch (crit.filterVal) {
          case "topper":
            return st.rank === 1;
          case "top3":
            return st.rank <= 3;
          case "top5":
            return st.rank <= 5;
          case "p90":
            return st.overall_percentage >= 90;
          case "p80":
            return st.overall_percentage >= 80;
          case "failed_any":
            return isFailedAny;
          default:
            return false;
        }
      });

      return {
        criteria: crit.title,
        count: list.length,
        names: list.map((st) => st.student_name).join(", "),
        percentage: Number(((list.length / total) * 100).toFixed(1)),
        isPct: crit.filterVal !== "topper" && crit.filterVal !== "top3" && crit.filterVal !== "top5"
      };
    });
  }, [studentsList]);

  const pageLoading = branchesLoading || plansLoading || resultsLoading;

  const handleExportExcel = async () => {
    if (filteredStudents.length === 0) return;
    setIsExportingExcel(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "SmartUp ERP";
      wb.created = new Date();

      const activeFilterObj = filterOptions.find((f) => f.value === selectedFilter);
      const activeFilterLabel = activeFilterObj ? activeFilterObj.label : "All Students";

      // ─────────────────────────────────────────────
      // SHEET 1: Consolidated Mark List
      // ─────────────────────────────────────────────
      const ws1 = wb.addWorksheet("Consolidated Marks", {
        views: [{ showGridLines: true }],
      });

      const hasMultipleDivisions = selectedSubBatches.length > 1;

      // Base cols: Rank, Name, ID, [Division], Plan
      const baseColumnCount = hasMultipleDivisions ? 5 : 4;
      const subjectColumnCount = uniqueCourses.length * 2;
      const summaryColumnCount = 4;
      const numColumns = baseColumnCount + subjectColumnCount + summaryColumnCount;

      const lastColLetter = (n: number) => {
        let str = "";
        while (n > 0) {
          const m = (n - 1) % 26;
          str = String.fromCharCode(65 + m) + str;
          n = Math.floor((n - m) / 26);
        }
        return str;
      };
      const endCol = lastColLetter(numColumns);

      // 1. Header Banner
      ws1.mergeCells(`A1:${endCol}1`);
      const titleCell = ws1.getCell("A1");
      titleCell.value = "SMARTUP LEARNING VENTURES — CLASS CONSOLIDATED MARK LIST";
      titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF6D28D9" }, // Brand purple
      };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      ws1.getRow(1).height = 28;

      // 2. Subtitle Details
      ws1.mergeCells(`A2:${endCol}2`);
      const subCell = ws1.getCell("A2");
      const branchDisplay = (branches as any[]).find((b: any) => b.name === selectedBranch)?.branch_name || (branches as any[]).find((b: any) => b.name === selectedBranch)?.name || selectedBranch;
      
      subCell.value = `Branch: ${branchDisplay.replace(/^Smart Up /i, "")}  |  Class: ${selectedClassName}  |  Exam Session: ${selectedExam}  |  Filter: ${activeFilterLabel}${selectedDivisionFilter !== "all" ? ` | Division: ${selectedSubBatches.find(sb => sb.id === selectedDivisionFilter)?.division || selectedDivisionFilter}` : ""}  |  Date: ${new Date().toLocaleDateString("en-IN")}`;
      subCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF475569" } };
      subCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" }, // slate-100
      };
      subCell.alignment = { vertical: "middle", horizontal: "center" };
      ws1.getRow(2).height = 20;

      // 3. Metrics Summary Banner
      ws1.mergeCells(`A3:${endCol}3`);
      const summaryCell = ws1.getCell("A3");
      summaryCell.value = `Total Students: ${batchSummary?.total_students || studentsList.length}     •     Passed: ${batchSummary?.pass_count || 0}     •     Pass Rate: ${batchSummary?.pass_rate?.toFixed(1) || 0}%     •     Class Average: ${batchSummary?.average_percentage?.toFixed(1) || 0}%`;
      summaryCell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF0F172A" } };
      summaryCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" }, // slate-200
      };
      summaryCell.alignment = { vertical: "middle", horizontal: "center" };
      ws1.getRow(3).height = 20;

      ws1.getRow(4).height = 8; // Spacer

      // 4. Two-Tier Table Headers (Rows 5 & 6)
      let cIdx = 1;
      
      const rankColLetter = lastColLetter(cIdx++);
      ws1.mergeCells(`${rankColLetter}5:${rankColLetter}6`);
      ws1.getCell(`${rankColLetter}5`).value = "Rank";

      const nameColLetter = lastColLetter(cIdx++);
      ws1.mergeCells(`${nameColLetter}5:${nameColLetter}6`);
      ws1.getCell(`${nameColLetter}5`).value = "Student Name";

      const idColLetter = lastColLetter(cIdx++);
      ws1.mergeCells(`${idColLetter}5:${idColLetter}6`);
      ws1.getCell(`${idColLetter}5`).value = "Student ID";

      if (hasMultipleDivisions) {
        const divColLetter = lastColLetter(cIdx++);
        ws1.mergeCells(`${divColLetter}5:${divColLetter}6`);
        ws1.getCell(`${divColLetter}5`).value = "Division";
      }

      const planColLetter = lastColLetter(cIdx++);
      ws1.mergeCells(`${planColLetter}5:${planColLetter}6`);
      ws1.getCell(`${planColLetter}5`).value = "Plan";

      // Subjects: 2 cols per subject
      uniqueCourses.forEach((c) => {
        const col1 = lastColLetter(cIdx++);
        const col2 = lastColLetter(cIdx++);
        ws1.mergeCells(`${col1}5:${col2}5`);
        const subHead = ws1.getCell(`${col1}5`);
        subHead.value = c.name;

        ws1.getCell(`${col1}6`).value = "Grade";
        ws1.getCell(`${col2}6`).value = "Marks";
      });

      const totalCol = lastColLetter(cIdx++);
      ws1.mergeCells(`${totalCol}5:${totalCol}6`);
      ws1.getCell(`${totalCol}5`).value = "Total Score";

      const pctCol = lastColLetter(cIdx++);
      ws1.mergeCells(`${pctCol}5:${pctCol}6`);
      ws1.getCell(`${pctCol}5`).value = "Overall %";

      const gradeCol = lastColLetter(cIdx++);
      ws1.mergeCells(`${gradeCol}5:${gradeCol}6`);
      ws1.getCell(`${gradeCol}5`).value = "Grade";

      const resCol = lastColLetter(cIdx++);
      ws1.mergeCells(`${resCol}5:${resCol}6`);
      ws1.getCell(`${resCol}5`).value = "Result";

      // Style Header Rows (5 & 6)
      [5, 6].forEach((rowNum) => {
        const r = ws1.getRow(rowNum);
        r.height = 20;
        for (let c = 1; c <= numColumns; c++) {
          const cell = r.getCell(c);
          cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4C1D95" }, // deep purple
          };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } },
          };
        }
      });

      // 5. Data Rows
      filteredStudents.forEach((row: any, idx) => {
        const hasFailedSubject = row.subjects.some((sub: any) => sub.percentage < 40);
        const isPassed = !hasFailedSubject && row.passed;

        const rowValues: any[] = [
          row.rank,
          row.student_name,
          row.student,
        ];

        if (hasMultipleDivisions) {
          const divName = selectedSubBatches.find((sb) => sb.id === row.student_group)?.division || row.student_group || "—";
          rowValues.push(divName);
        }

        rowValues.push(row.custom_plan || "Basic");

        uniqueCourses.forEach((c) => {
          const subResult = row.subjects.find((sub: any) => sub.course === c.code);
          if (!subResult) {
            rowValues.push("ABSENT", "—");
          } else {
            rowValues.push(subResult.grade || "—", `${subResult.score} / ${subResult.maximum_score}`);
          }
        });

        rowValues.push(
          `${row.total_score} / ${row.total_maximum}`,
          `${row.overall_percentage.toFixed(1)}%`,
          row.overall_grade,
          isPassed ? "PASS" : "FAIL"
        );

        const dataRow = ws1.addRow(rowValues);
        dataRow.height = 20;
        const isEven = idx % 2 === 0;

        dataRow.eachCell((cell, colNum) => {
          cell.font = { name: "Arial", size: 9 };
          cell.alignment = {
            vertical: "middle",
            horizontal: colNum === 2 ? "left" : "center",
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };

          if (colNum === numColumns) {
            cell.font = {
              name: "Arial",
              size: 9,
              bold: true,
              color: { argb: isPassed ? "FF16A34A" : "FFE11D48" },
            };
          }
          if (cell.value === "ABSENT") {
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFE11D48" } };
          }
        });
      });

      // Set Column Widths
      const colWidths: { [key: number]: number } = {
        1: 8,   // Rank
        2: 26,  // Name
        3: 18,  // ID
      };
      let curColIndex = 4;
      if (hasMultipleDivisions) {
        colWidths[curColIndex++] = 14; // Division
      }
      colWidths[curColIndex++] = 14;   // Plan

      uniqueCourses.forEach(() => {
        colWidths[curColIndex++] = 10; // Grade
        colWidths[curColIndex++] = 13; // Marks
      });

      colWidths[curColIndex++] = 15; // Total Score
      colWidths[curColIndex++] = 12; // Overall %
      colWidths[curColIndex++] = 10; // Grade
      colWidths[curColIndex++] = 12; // Result

      ws1.columns = Array.from({ length: numColumns }).map((_, i) => ({
        width: colWidths[i + 1] || 12,
      }));

      // ─────────────────────────────────────────────
      // SHEET 2: Performance Analysis
      // ─────────────────────────────────────────────
      const ws2 = wb.addWorksheet("Performance Analysis", {
        views: [{ showGridLines: true }],
      });

      ws2.mergeCells("A1:D1");
      const title2 = ws2.getCell("A1");
      title2.value = `PERFORMANCE ANALYSIS — ${selectedClassName} (${selectedExam})`;
      title2.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
      title2.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF6D28D9" },
      };
      title2.alignment = { vertical: "middle", horizontal: "center" };
      ws2.getRow(1).height = 26;

      ws2.mergeCells("A2:D2");
      const sub2 = ws2.getCell("A2");
      sub2.value = `Total Students Analyzed: ${studentsList.length}  |  Pass Rate: ${batchSummary?.pass_rate?.toFixed(1) || 0}%  |  Date: ${new Date().toLocaleDateString("en-IN")}`;
      sub2.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF475569" } };
      sub2.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
      sub2.alignment = { vertical: "middle", horizontal: "center" };
      ws2.getRow(2).height = 20;

      ws2.getRow(3).height = 8;

      const headerRow2 = ws2.addRow(["Analysis Criteria", "Student Count", "% of Class", "Student Names"]);
      headerRow2.height = 22;
      headerRow2.eachCell((cell) => {
        cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4C1D95" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "medium", color: { argb: "FF6D28D9" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
      });

      analysisData.forEach((item, idx) => {
        const row = ws2.addRow([
          item.criteria,
          item.count,
          item.isPct ? `${item.percentage}%` : "—",
          item.names || "—",
        ]);
        row.height = 20;
        const isEven = idx % 2 === 0;
        row.eachCell((cell, colNum) => {
          cell.font = { name: "Arial", size: 9 };
          cell.alignment = {
            vertical: "middle",
            horizontal: colNum === 1 || colNum === 4 ? "left" : "center",
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          if (colNum === 1) {
            cell.font = { name: "Arial", size: 9, bold: true };
          }
        });
      });

      ws2.columns = [
        { width: 32 },
        { width: 14 },
        { width: 15 },
        { width: 65 },
      ];

      // File Output Trigger
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const cleanFileName = `SmartUp_${selectedBranch.replace(/^Smart Up /i, "")}_${selectedClassName}_${selectedExam}_Consolidated_Report.xlsx`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_.-]/g, "");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = cleanFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Excel error:", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <BreadcrumbNav />
          <h1 className="text-2xl font-bold text-text-primary mt-1 flex items-center gap-2">
            <Award className="h-7 w-7 text-amber-500" />
            Branch Wise Ranking ({selectedExam})
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Compare branch standings for the chosen exam and drill down into class and student ranking list.
          </p>
        </div>

        <div className="flex gap-2">
          {level !== "branches" && (
            <button
              onClick={() => {
                if (level === "report") setLevel("classes");
                else if (level === "classes") setLevel("branches");
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {level === "report" ? selectedBranch : "All Branches"}
            </button>
          )}
          <Link href="/dashboard/curriculum-dept/exam-corner">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary bg-surface border border-border/60 hover:border-border transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Exam Corner
            </button>
          </Link>
        </div>
      </div>

      {/* Dynamic Exam Selector */}
      <div className="flex flex-wrap items-center gap-3 bg-surface p-2.5 rounded-2xl border border-border/60 shadow-sm w-fit">
        <div className="flex items-center gap-2 px-2 text-xs font-semibold text-text-secondary">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Choose Exam:</span>
        </div>
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="h-9 px-3 text-xs bg-surface border border-border-input rounded-xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
        >
          {examOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        {/* Quick buttons for top 3 options */}
        <div className="hidden sm:flex items-center gap-1.5 border-l border-border/60 pl-3">
          {examOptions.slice(0, 4).map((opt) => (
            <button
              key={opt}
              onClick={() => setSelectedExam(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedExam === opt
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation History Path */}
      {level !== "branches" && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-text-secondary mt-1">
          <span 
            className="hover:underline cursor-pointer text-primary font-medium"
            onClick={() => { setLevel("branches"); }}
          >
            All Branches
          </span>
          {selectedBranch && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
              <span 
                className="hover:underline cursor-pointer text-primary font-medium"
                onClick={() => { setLevel("classes"); }}
              >
                {selectedBranch}
              </span>
            </>
          )}
          {selectedClass && level === "report" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-tertiary">{selectedClassName} Consolidated Report</span>
            </>
          )}
        </div>
      )}

      {pageLoading ? (
        <div className="py-32 flex justify-center items-center">
          <GifLoader size="lg" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* LEVEL 1: BRANCH CARDS */}
          {level === "branches" && (
            <motion.div
              key="branches"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {branchPerformances.map((b: any) => {
                const colors = getRateColor(b.numericRate);
                return (
                  <Card 
                    key={b.name}
                    className="hover:border-primary/30 hover:shadow-md cursor-pointer transition-all duration-200 group relative overflow-hidden bg-surface"
                    onClick={() => {
                      setSelectedBranch(b.name);
                      setLevel("classes");
                    }}
                  >
                    <CardHeader className="p-6 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 rounded-xl">
                          <School className="h-6 w-6" />
                        </div>
                        <Badge className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/[0.04]">
                          {b.examsCount} Exams
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                        {b.name.replace("Smart Up ", "")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-2">
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xs text-text-secondary font-medium">Average Pass Rate</span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-2xl font-black ${colors.text}`}>
                            {b.passRate}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${colors.bg}`}
                          style={{ width: b.passRate === "N/A" ? "0%" : b.passRate }}
                        />
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-tertiary">
                        <span>Click to view batches</span>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          )}

          {/* LEVEL 2: CLASS STANDINGS */}
          {level === "classes" && (
            <motion.div
              key="classes"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 rounded-2xl border border-border/60">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{selectedBranch}</h2>
                  <p className="text-xs text-text-secondary">Batches and standings for {selectedExam}</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode("combined")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === "combined"
                        ? "bg-white dark:bg-slate-700 text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Combined Classes
                  </button>
                  <button
                    onClick={() => setViewMode("separate")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === "separate"
                        ? "bg-white dark:bg-slate-700 text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Separate Divisions
                  </button>
                </div>
              </div>

              {groupsLoading ? (
                <div className="py-24 flex justify-center"><GifLoader size="md" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(viewMode === "combined" ? combinedClassPerformances : classPerformances).map((c: any) => {
                    const colors = getRateColor(c.numericRate);
                    return (
                      <Card
                        key={c.id}
                        className="hover:border-primary/30 hover:shadow-md cursor-pointer transition-all duration-200 group bg-surface"
                        onClick={() => {
                          setSelectedClass(c.id);
                          setSelectedClassName(c.name);
                          setSelectedSubBatches(c.subBatches || []);
                          setSelectedDivisionFilter("all");
                          setLevel("report");
                        }}
                      >
                        <CardHeader className="p-6 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 rounded-xl">
                              <Users className="h-6 w-6" />
                            </div>
                            <Badge className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/[0.04]">
                              {c.examsCount} Exams
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                            {c.name}
                          </CardTitle>
                          {c.isCombined && (
                            <p className="text-xs text-text-tertiary">
                              Divisions: {c.divisions.join(", ")}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-xs text-text-secondary font-medium">Pass Rate</span>
                            <span className={`text-2xl font-black ${colors.text}`}>{c.passRate}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${colors.bg}`}
                              style={{ width: c.passRate === "N/A" ? "0%" : c.passRate }}
                            />
                          </div>
                          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-tertiary">
                            <span>View detailed rank report</span>
                            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* LEVEL 3: DETAILED REPORT */}
          {level === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {batchLoading ? (
                <div className="py-24 flex justify-center"><GifLoader size="md" /></div>
              ) : (
                <>
                  {/* Summary & Filters Bar */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border/60">
                    <div>
                      <h2 className="text-xl font-bold text-text-primary">
                        {selectedClassName} – {selectedExam}
                      </h2>
                      <p className="text-xs text-text-secondary mt-1">
                        Total Enrolled: {batchSummary?.total_students ?? studentsList.length} | 
                        Passed: {batchSummary?.pass_count ?? 0} | 
                        Batch Pass Rate: {batchSummary?.pass_rate ?? 0}%
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Division selector if combined batch */}
                      {selectedSubBatches.length > 1 && (
                        <select
                          value={selectedDivisionFilter}
                          onChange={(e) => setSelectedDivisionFilter(e.target.value)}
                          className="h-9 px-3 text-xs bg-surface border border-border-input rounded-xl font-semibold text-text-primary"
                        >
                          <option value="all">All Divisions</option>
                          {selectedSubBatches.map((sb) => (
                            <option key={sb.id} value={sb.id}>{sb.name}</option>
                          ))}
                        </select>
                      )}

                      {/* Criteria Filter */}
                      <select
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="h-9 px-3 text-xs bg-surface border border-border-input rounded-xl font-semibold text-text-primary"
                      >
                        {filterOptions.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </button>

                      <button
                        onClick={handleExportExcel}
                        disabled={isExportingExcel || filteredStudents.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                        title="Download Consolidated Mark List Excel (.xlsx)"
                      >
                        {isExportingExcel ? (
                          <>
                            <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="h-4 w-4" />
                            Download Excel
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Student Table */}
                  <div className="bg-surface rounded-2xl border border-border/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-border/60 text-text-secondary">
                          <tr>
                            <th className="p-3.5 pl-6 font-bold w-12">Rank</th>
                            <th className="p-3.5 font-bold">Student Name</th>
                            <th className="p-3.5 font-bold">Student ID</th>
                            <th className="p-3.5 font-bold text-center">Total Marks</th>
                            <th className="p-3.5 font-bold text-center">Overall %</th>
                            <th className="p-3.5 font-bold text-center">Status</th>
                            {uniqueCourses.map((c) => (
                              <th key={c.code} className="p-3.5 font-bold text-center">{c.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={6 + uniqueCourses.length} className="text-center py-12 text-text-tertiary">
                                No student records found matching the chosen criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredStudents.map((st: any) => (
                              <tr key={st.student} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="p-3.5 pl-6 font-bold text-text-primary">
                                  {st.rank === 1 ? (
                                    <span className="p-1 px-2 rounded-md bg-amber-500/10 text-amber-600 font-black">#1</span>
                                  ) : (
                                    `#${st.rank}`
                                  )}
                                </td>
                                <td className="p-3.5 font-bold text-text-primary">{st.student_name}</td>
                                <td className="p-3.5 text-text-secondary">{st.student}</td>
                                <td className="p-3.5 font-semibold text-center text-text-primary">
                                  {st.total_score} / {st.total_maximum}
                                </td>
                                <td className="p-3.5 font-bold text-center">
                                  <span className={getRateColor(st.overall_percentage).text}>
                                    {st.overall_percentage}%
                                  </span>
                                </td>
                                <td className="p-3.5 text-center">
                                  {st.passed ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                                      Passed
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px]">
                                      Failed
                                    </Badge>
                                  )}
                                </td>
                                {uniqueCourses.map((c) => {
                                  const sub = st.subjects.find((s: any) => s.course === c.code);
                                  if (!sub) return <td key={c.code} className="p-3.5 text-center text-text-tertiary">-</td>;
                                  return (
                                    <td key={c.code} className="p-3.5 text-center">
                                      <span className="font-semibold text-text-primary">{sub.score}</span>
                                      <span className="text-[10px] text-text-tertiary">/{sub.max}</span>
                                      <div className={`text-[10px] font-bold ${getRateColor(sub.percentage).text}`}>
                                        {sub.grade || `${Math.round(sub.percentage)}%`}
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
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
