"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import ExcelJS from "exceljs";
import {
  GraduationCap,
  Building2,
  Users,
  Phone,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  School,
  Mail,
  ChevronDown,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  getAllBranches,
  getDemoStudentCount,
  getDemoStudentCountForBranch,
  getDemoStudents,
  type DemoStudentRow,
} from "@/lib/api/director";
import { AnimatedNumber } from "@/components/dashboard/AnimatedValue";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ── Export Columns Definition ──
const EXPORT_HEADERS = [
  "Student ID", "Student Name", "Gender", "Date of Birth", "Branch",
  "Program", "Batch", "Guardian", "Phone", "Email",
  "Place", "Previous School", "Joining Date", "Status",
];

function studentToRow(s: DemoStudentRow): string[] {
  return [
    s.name,
    s.student_name,
    s.gender ?? "",
    s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "",
    s.custom_branch?.replace("Smart Up ", "") ?? "",
    s.program ?? "",
    s.student_batch_name ?? "",
    s.guardian_name ?? s.custom_parent_name ?? "",
    s.student_mobile_number ?? "",
    s.student_email_id ?? "",
    s.custom_place ?? "",
    s.custom_school_name ?? "",
    s.joining_date ? new Date(s.joining_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "",
    s.enabled ? "Active" : "Inactive",
  ];
}

// ── CSV Export ──
function exportToCSV(students: DemoStudentRow[], filename: string) {
  const rows = students.map(studentToRow);
  const csv = [EXPORT_HEADERS, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

// ── Excel Export ──
async function exportToExcel(students: DemoStudentRow[], filename: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SmartUp ERP";
  wb.created = new Date();
  const ws = wb.addWorksheet("Demo Students");

  ws.columns = EXPORT_HEADERS.map((h, i) => ({
    header: h,
    key: `col${i}`,
    width: [16, 24, 8, 14, 16, 22, 22, 20, 14, 24, 16, 22, 14, 10][i] ?? 16,
  }));

  // Style header
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 28;

  for (const s of students) {
    const row = studentToRow(s);
    const obj: Record<string, string> = {};
    row.forEach((v, i) => (obj[`col${i}`] = v));
    ws.addRow(obj);
  }

  if (students.length > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EXPORT_HEADERS.length } };
  }
  ws.views = [{ state: "frozen" as const, ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, `${filename}.xlsx`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Export Dropdown ──
function ExportMenu({ students, filename, disabled }: { students: DemoStudentRow[]; filename: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} disabled={disabled}>
        <Download className="h-4 w-4 mr-1.5" />
        Export
        <ChevronDown className="h-3 w-3 ml-1" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-border-light rounded-lg shadow-lg z-20 min-w-[160px] py-1">
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-app-bg transition-colors text-left"
            onClick={() => { exportToCSV(students, filename); setOpen(false); }}
          >
            <FileText className="h-4 w-4 text-text-tertiary" />
            Export as CSV
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-app-bg transition-colors text-left"
            onClick={() => { exportToExcel(students, filename); setOpen(false); }}
          >
            <FileSpreadsheet className="h-4 w-4 text-success" />
            Export as Excel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Drill-down state ──
type DrillLevel =
  | { level: "branches" }
  | { level: "programs"; branch: string; branchAbbr: string }
  | { level: "batches"; branch: string; branchAbbr: string; program: string }
  | { level: "students"; branch: string; branchAbbr: string; program: string; batch: string };

// ── Main Page ──
export default function DemoStudentsPage() {
  const [drill, setDrill] = useState<DrillLevel>({ level: "branches" });

  const { data: totalCount, isLoading: loadingTotal } = useQuery({
    queryKey: ["demo-total-count"],
    queryFn: getDemoStudentCount,
    staleTime: 60_000,
  });

  const { data: branches, isLoading: loadingBranches, isError } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 60_000,
  });

  const activeBranches = (branches ?? []).filter((b) => b.name !== "Smart Up");

  const goBack = useCallback(() => {
    if (drill.level === "students") {
      setDrill({ level: "batches", branch: drill.branch, branchAbbr: drill.branchAbbr, program: drill.program });
    } else if (drill.level === "batches") {
      setDrill({ level: "programs", branch: drill.branch, branchAbbr: drill.branchAbbr });
    } else if (drill.level === "programs") {
      setDrill({ level: "branches" });
    }
  }, [drill]);

  // Breadcrumb trail
  const breadcrumbParts = useMemo(() => {
    const parts: { label: string; onClick?: () => void }[] = [
      { label: "All Branches", onClick: drill.level !== "branches" ? () => setDrill({ level: "branches" }) : undefined },
    ];
    if (drill.level !== "branches") {
      const shortBranch = drill.branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
      parts.push({
        label: shortBranch,
        onClick: drill.level !== "programs"
          ? () => setDrill({ level: "programs", branch: drill.branch, branchAbbr: drill.branchAbbr })
          : undefined,
      });
    }
    if (drill.level === "batches" || drill.level === "students") {
      parts.push({
        label: drill.program,
        onClick: drill.level !== "batches"
          ? () => setDrill({ level: "batches", branch: drill.branch, branchAbbr: drill.branchAbbr, program: drill.program })
          : undefined,
      });
    }
    if (drill.level === "students") {
      parts.push({ label: drill.batch });
    }
    return parts;
  }, [drill]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {drill.level !== "branches" && (
            <button onClick={goBack} className="p-2 rounded-lg hover:bg-app-bg transition-colors">
              <ArrowLeft className="h-5 w-5 text-text-secondary" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              Demo Students
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Branch-wise and class-wise demo student breakdown
            </p>
          </div>
        </div>
        <Badge variant="default" className="text-lg px-4 py-1.5 tabular-nums">
          {loadingTotal ? "..." : <AnimatedNumber value={totalCount ?? 0} />}
          <span className="text-xs font-normal ml-1.5 opacity-70">total</span>
        </Badge>
      </motion.div>

      {/* Drill-down breadcrumb trail */}
      {drill.level !== "branches" && (
        <motion.div variants={itemVariants} className="flex items-center gap-1.5 text-xs">
          {breadcrumbParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3 w-3 text-text-tertiary" />}
              {part.onClick ? (
                <button onClick={part.onClick} className="text-primary hover:underline">
                  {part.label}
                </button>
              ) : (
                <span className="text-text-primary font-medium">{part.label}</span>
              )}
            </React.Fragment>
          ))}
        </motion.div>
      )}

      {/* Content based on drill level */}
      {loadingBranches ? (
        <LoadingGrid />
      ) : isError ? (
        <ErrorCard />
      ) : drill.level === "branches" ? (
        <BranchGrid
          branches={activeBranches}
          onSelect={(branch) => setDrill({ level: "programs", branch: branch.name, branchAbbr: branch.abbr })}
        />
      ) : drill.level === "programs" ? (
        <ProgramGrid
          branch={drill.branch}
          onSelect={(program) => setDrill({ level: "batches", branch: drill.branch, branchAbbr: drill.branchAbbr, program })}
        />
      ) : drill.level === "batches" ? (
        <BatchGrid
          branch={drill.branch}
          program={drill.program}
          onSelect={(batch) => setDrill({ level: "students", branch: drill.branch, branchAbbr: drill.branchAbbr, program: drill.program, batch })}
        />
      ) : (
        <StudentList branch={drill.branch} program={drill.program} batch={drill.batch} />
      )}
    </motion.div>
  );
}

// ── Level 1: Branch Cards ──
function BranchGrid({
  branches,
  onSelect,
}: {
  branches: { name: string; abbr: string }[];
  onSelect: (branch: { name: string; abbr: string }) => void;
}) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {branches.map((branch) => (
        <BranchCountCard key={branch.name} branch={branch} onSelect={onSelect} />
      ))}
    </motion.div>
  );
}

function BranchCountCard({
  branch,
  onSelect,
}: {
  branch: { name: string; abbr: string };
  onSelect: (b: { name: string; abbr: string }) => void;
}) {
  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const { data: count, isLoading } = useQuery({
    queryKey: ["demo-branch-count", branch.name],
    queryFn: () => getDemoStudentCountForBranch(branch.name),
    staleTime: 60_000,
  });

  return (
    <motion.div variants={itemVariants}>
      <Card
        className="cursor-pointer border-border-light hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
        onClick={() => onSelect(branch)}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[10px] bg-brand-wash flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary text-sm">{shortName}</h3>
                <p className="text-xs text-text-tertiary">{branch.abbr}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-text-primary tabular-nums">
                {isLoading ? "..." : <AnimatedNumber value={count ?? 0} />}
              </span>
              <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Level 2: Program (Class) Cards ──
function ProgramGrid({
  branch,
  onSelect,
}: {
  branch: string;
  onSelect: (program: string) => void;
}) {
  const { data: students, isLoading } = useQuery({
    queryKey: ["demo-branch-students", branch],
    queryFn: () => getDemoStudents(branch),
    staleTime: 60_000,
  });

  const groups = useMemo(() => {
    if (!students) return [];
    const map = new Map<string, number>();
    for (const s of students) {
      const prog = s.program || "Unassigned";
      map.set(prog, (map.get(prog) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([program, count]) => ({ program, count }))
      .sort((a, b) => b.count - a.count);
  }, [students]);

  if (isLoading) return <LoadingGrid />;

  return (
    <>
      <div className="flex justify-end">
        <ExportMenu
          students={students ?? []}
          filename={`demo-students-${branch.replace(/\s+/g, "-").toLowerCase()}`}
          disabled={!students?.length}
        />
      </div>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(({ program, count }) => (
          <motion.div key={program} variants={itemVariants}>
            <Card
              className="cursor-pointer border-border-light hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
              onClick={() => onSelect(program)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[10px] bg-success-light flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary text-sm">{program}</h3>
                      <p className="text-xs text-text-tertiary">{count} student{count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-text-primary tabular-nums">{count}</span>
                    <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}

// ── Level 3: Batch Cards ──
function BatchGrid({
  branch,
  program,
  onSelect,
}: {
  branch: string;
  program: string;
  onSelect: (batch: string) => void;
}) {
  const { data: allStudents, isLoading } = useQuery({
    queryKey: ["demo-branch-students", branch],
    queryFn: () => getDemoStudents(branch),
    staleTime: 60_000,
  });

  const groups = useMemo(() => {
    if (!allStudents) return [];
    const filtered = allStudents.filter((s) => (s.program || "Unassigned") === program);
    const map = new Map<string, number>();
    for (const s of filtered) {
      const batch = s.student_batch_name || "No Batch";
      map.set(batch, (map.get(batch) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([batch, count]) => ({ batch, count }))
      .sort((a, b) => a.batch.localeCompare(b.batch));
  }, [allStudents, program]);

  if (isLoading) return <LoadingGrid />;

  return (
    <>
      <div className="flex justify-end">
        <ExportMenu
          students={allStudents?.filter((s) => (s.program || "Unassigned") === program) ?? []}
          filename={`demo-students-${program.replace(/\s+/g, "-").toLowerCase()}`}
          disabled={!groups.length}
        />
      </div>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(({ batch, count }) => (
          <motion.div key={batch} variants={itemVariants}>
            <Card
              className="cursor-pointer border-border-light hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
              onClick={() => onSelect(batch)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[10px] bg-info-light flex items-center justify-center">
                      <Users className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary text-sm">{batch}</h3>
                      <p className="text-xs text-text-tertiary">{count} student{count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-text-primary tabular-nums">{count}</span>
                    <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}

// ── Level 4: Student List (Table layout) ──
function StudentList({
  branch,
  program,
  batch,
}: {
  branch: string;
  program: string;
  batch: string;
}) {
  const { data: allStudents, isLoading } = useQuery({
    queryKey: ["demo-branch-students", branch],
    queryFn: () => getDemoStudents(branch),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!allStudents) return [];
    return allStudents.filter(
      (s) =>
        (s.program || "Unassigned") === program &&
        (s.student_batch_name || "No Batch") === batch
    );
  }, [allStudents, program, batch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-text-tertiary">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading students...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-sm tabular-nums">
          {filtered.length} student{filtered.length !== 1 ? "s" : ""}
        </Badge>
        <ExportMenu
          students={filtered}
          filename={`demo-students-${batch.replace(/\s+/g, "-").toLowerCase()}`}
          disabled={!filtered.length}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-text-tertiary">No demo students in this batch</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border-light overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-[1.8fr_1fr_1fr_1.2fr_1fr_0.9fr_70px] gap-3 px-5 py-3 bg-app-bg/60 border-b border-border-light text-xs font-semibold text-text-tertiary uppercase tracking-wide">
            <span>Student</span>
            <span>Class</span>
            <span>Guardian</span>
            <span>Contact</span>
            <span>Location</span>
            <span>Joining Date</span>
            <span className="text-center">Status</span>
          </div>

          {/* Table rows */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="divide-y divide-border-light">
            {filtered.map((s, idx) => (
              <motion.div
                key={s.name}
                variants={itemVariants}
                className={`px-5 py-3.5 md:grid md:grid-cols-[1.8fr_1fr_1fr_1.2fr_1fr_0.9fr_70px] gap-3 items-center ${
                  idx % 2 === 0 ? "" : "bg-app-bg/30"
                }`}
              >
                {/* Student info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary truncate">{s.student_name}</p>
                    {s.gender && (
                      <span className="text-[10px] text-text-tertiary">{s.gender}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-tertiary truncate">{s.name}</p>
                  {s.date_of_birth && (
                    <p className="text-[11px] text-text-tertiary mt-0.5">
                      DOB: {new Date(s.date_of_birth).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>

                {/* Class */}
                <div className="min-w-0 mt-1 md:mt-0">
                  {s.program ? (
                    <span className="text-xs text-text-secondary flex items-center gap-1.5 truncate">
                      <GraduationCap className="h-3.5 w-3.5 text-success shrink-0" /> {s.program}
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">—</span>
                  )}
                </div>

                {/* Guardian */}
                <div className="min-w-0 mt-1 md:mt-0">
                  {(s.guardian_name || s.custom_parent_name) ? (
                    <span className="text-xs text-text-secondary flex items-center gap-1.5 truncate">
                      <User className="h-3.5 w-3.5 text-primary shrink-0" /> {s.guardian_name || s.custom_parent_name}
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">—</span>
                  )}
                </div>

                {/* Contact */}
                <div className="min-w-0 mt-1 md:mt-0 space-y-1">
                  {s.student_mobile_number ? (
                    <span className="text-xs text-text-secondary flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-success shrink-0" /> {s.student_mobile_number}
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">—</span>
                  )}
                  {s.student_email_id && (
                    <span className="text-xs text-text-tertiary flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-info shrink-0" /> {s.student_email_id}
                    </span>
                  )}
                </div>

                {/* Location / School */}
                <div className="min-w-0 mt-1 md:mt-0 space-y-1">
                  {s.custom_place ? (
                    <span className="text-xs text-text-secondary flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-error shrink-0" /> {s.custom_place}
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">—</span>
                  )}
                  {s.custom_school_name && (
                    <span className="text-xs text-text-tertiary flex items-center gap-1.5 truncate">
                      <School className="h-3.5 w-3.5 text-warning shrink-0" /> {s.custom_school_name}
                    </span>
                  )}
                </div>

                {/* Joining date */}
                <div className="mt-1 md:mt-0">
                  {s.joining_date ? (
                    <span className="text-xs text-text-secondary flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-warning shrink-0" />
                      {new Date(s.joining_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">—</span>
                  )}
                </div>

                {/* Status */}
                <div className="mt-2 md:mt-0 flex md:justify-center">
                  <Badge variant={s.enabled ? "success" : "error"} className="text-[10px]">
                    {s.enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Card>
      )}
    </>
  );
}

// ── Shared UI ──
function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-[72px] bg-border-light rounded-[14px] animate-pulse" />
      ))}
    </div>
  );
}

function ErrorCard() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <AlertCircle className="h-8 w-8 text-error mx-auto mb-2" />
        <p className="text-sm text-error">Failed to load data</p>
      </CardContent>
    </Card>
  );
}
