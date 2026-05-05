"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, LayoutDashboard, Table2, PlusCircle, ChevronDown,
  Search, Building2, AlertCircle, Loader2, Trash2, X, Pencil,
  GraduationCap, CheckCircle2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import {
  getAchievementYears,
  getAchievementDashboard,
  getAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  type SubjectGrade,
  type OverallGrade,
  type StudentAchievement,
} from "@/lib/api/studentAchievements";
import { BRANCH_ADMISSION_TARGETS } from "@/lib/constants/branch-targets";

/* ── Constants ──────────────────────────────────────────────────────── */
const ACADEMIC_YEARS = ["2026-2027", "2027-2028"];
const GRADES: OverallGrade[] = ["A+", "A", "B+", "B", "C", "D", "Pass", "Fail"];
const BRANCH_OPTIONS = Object.keys(BRANCH_ADMISSION_TARGETS);

const GRADE_COLOR: Record<string, string> = {
  "A+":   "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  "A":    "bg-green-100 text-green-700 ring-1 ring-green-200",
  "B+":   "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200",
  "B":    "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  "C":    "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  "D":    "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
  "Pass": "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  "Fail": "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
};

const APLUS_COLORS = ["#10b981","#22c55e","#84cc16","#eab308","#f59e0b","#f97316","#ef4444","#94a3b8"];

/* ── Helpers ────────────────────────────────────────────────────────── */
const Pulse = ({ w = "w-20", h = "h-5" }: { w?: string; h?: string }) => (
  <span className={`inline-block ${w} ${h} bg-border-light rounded-lg animate-pulse`} />
);

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-border-light bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";
const labelCls = "block text-[11px] font-semibold text-text-tertiary uppercase tracking-wide mb-1.5";

/* ── Donut chart ────────────────────────────────────────────────────── */
function Donut({ slices, label }: { slices: { label: string; value: number; color: string }[]; label?: string }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (!total) return <div className="w-32 h-32 rounded-full bg-border-light/40 animate-pulse" />;
  const R = 48; const ri = 28; const C = 64;
  let sa = -Math.PI / 2;
  const paths = slices.map((sl) => {
    const pct = sl.value / total;
    if (pct === 0) return null;
    if (pct >= 1) {
      const p = `M ${C} ${C-R} A ${R} ${R} 0 1 1 ${C} ${C+R} L ${C} ${C+ri} A ${ri} ${ri} 0 1 0 ${C} ${C-ri} Z M ${C} ${C+R} A ${R} ${R} 0 1 1 ${C} ${C-R} L ${C} ${C-ri} A ${ri} ${ri} 0 1 0 ${C} ${C+ri} Z`;
      sa += 2 * Math.PI;
      return <path key={sl.label} d={p} fill={sl.color} />;
    }
    const angle = pct * 2 * Math.PI;
    const ea = sa + angle;
    const x1=C+R*Math.cos(sa); const y1=C+R*Math.sin(sa);
    const x2=C+R*Math.cos(ea); const y2=C+R*Math.sin(ea);
    const ix1=C+ri*Math.cos(ea); const iy1=C+ri*Math.sin(ea);
    const ix2=C+ri*Math.cos(sa); const iy2=C+ri*Math.sin(sa);
    const lg = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ri} ${ri} 0 ${lg} 0 ${ix2} ${iy2} Z`;
    sa = ea;
    return <path key={sl.label} d={d} fill={sl.color} className="hover:opacity-80 transition-opacity cursor-pointer" />;
  });
  return (
    <svg width={128} height={128} viewBox="0 0 128 128" className="shrink-0">
      {paths}
      <text x={C} y={C-5} textAnchor="middle" fill="#9ca3af" style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.5 }}>{label ?? "TOTAL"}</text>
      <text x={C} y={C+10} textAnchor="middle" fill="#111827" style={{ fontSize: 14, fontWeight: 800 }}>{total}</text>
    </svg>
  );
}

/* ── Section / Field layout helpers ─────────────────────────────────── */
function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-light bg-surface/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-light bg-background/30">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">{title}</p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD TAB
═══════════════════════════════════════════════════════════════════════ */
function DashboardTab({ year }: { year: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["achievements-dashboard", year],
    queryFn: () => getAchievementDashboard(year || undefined),
    staleTime: 0,
  });

  const distribution = data?.aplusDistribution ?? [];
  const nineAPlusStudents = distribution.find((d) => d.count === 9)?.students ?? 0;
  const eightAPlusStudents = distribution.find((d) => d.count === 8)?.students ?? 0;

  const kpis = [
    {
      label: "Total Students",
      value: data?.total ?? 0,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-500",
      icon: <GraduationCap className="h-4 w-4 text-white" />,
      fmt: (v: number) => String(v),
    },
    {
      label: "Full A+ Students",
      value: data?.fullAplusCount ?? 0,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      gradient: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-500",
      icon: <Trophy className="h-4 w-4 text-white" />,
      fmt: (v: number) => String(v),
    },
    {
      label: "9 A+ Students",
      value: nineAPlusStudents,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
      gradient: "from-violet-500 to-purple-600",
      iconBg: "bg-violet-500",
      icon: <Trophy className="h-4 w-4 text-white" />,
      fmt: (v: number) => String(v),
    },
    {
      label: "8 A+ Students",
      value: eightAPlusStudents,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      gradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-500",
      icon: <CheckCircle2 className="h-4 w-4 text-white" />,
      fmt: (v: number) => String(v),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Active year badge */}
      {year && (
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Showing data for <span className="font-semibold text-text-primary">{year}</span>
          <span className="text-text-quaternary">— switch "Year" in the header to change</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.07 }}
            className={`relative overflow-hidden rounded-2xl border ${k.border} ${k.bg} p-4 flex flex-col gap-3`}>
            <div className={`w-8 h-8 rounded-xl ${k.iconBg} shadow-sm flex items-center justify-center`}>{k.icon}</div>
            {isLoading ? <Pulse w="w-14" h="h-7" /> : <p className={`text-2xl font-black ${k.color} leading-none`}>{k.fmt(k.value)}</p>}
            <p className="text-[11px] font-medium text-text-tertiary">{k.label}</p>
            <div className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-10 bg-gradient-to-br ${k.gradient}`} />
          </motion.div>
        ))}
      </div>

      {isError && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> Failed to load dashboard data.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* A+ Distribution donut */}
        <div className="rounded-2xl border border-border-light bg-surface p-5">
          <p className="text-sm font-semibold text-text-primary">A+ Student Breakdown</p>
          <p className="text-[11px] text-text-tertiary mt-0.5 mb-4">Count of A+ subjects per student</p>
          {isLoading ? (
            <div className="flex gap-5 items-center">
              <div className="w-32 h-32 rounded-full bg-border-light/50 animate-pulse shrink-0" />
              <div className="space-y-2 flex-1">{[1,2,3].map(i=><Pulse key={i} w="w-full" />)}</div>
            </div>
          ) : (data?.aplusDistribution ?? []).length === 0 ? (
            <p className="text-sm text-text-tertiary py-4 text-center">No subject grades yet</p>
          ) : (() => {
            const dist = data!.aplusDistribution;
            const maxCount = dist[0]?.count ?? 0;
            const tot = dist.reduce((s,d) => s+d.students, 0);
            return (
              <div className="flex gap-5 items-center flex-wrap">
                <Donut label="STUDENTS" slices={dist.map((d,i) => ({
                  label: d.count === maxCount ? "Full A+" : `${d.count} A+`,
                  value: d.students,
                  color: APLUS_COLORS[i % APLUS_COLORS.length],
                }))} />
                <div className="space-y-2 flex-1 min-w-[120px]">
                  {dist.map((d,i) => {
                    const lbl = (d.count === maxCount && d.count > 0) ? `Full A+ (${d.count} subj.)` : `${d.count} A+`;
                    const pct = tot > 0 ? (d.students/tot)*100 : 0;
                    return (
                      <div key={d.count} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: APLUS_COLORS[i % APLUS_COLORS.length] }} />
                        <span className="text-xs text-text-primary flex-1 truncate">{lbl}</span>
                        <span className="text-[10px] text-text-tertiary tabular-nums">{pct.toFixed(0)}%</span>
                        <span className="text-xs font-bold text-text-primary w-5 text-right tabular-nums">{d.students}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Branch breakdown */}
        <div className="rounded-2xl border border-border-light bg-surface p-5">
          <p className="text-sm font-semibold text-text-primary">Branch Breakdown</p>
          <p className="text-[11px] text-text-tertiary mt-0.5 mb-4">Students per branch · A+ subject grades</p>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i=><Pulse key={i} w="w-full" h="h-10" />)}</div>
          ) : (data?.branchBreakdown ?? []).length === 0 ? (
            <p className="text-sm text-text-tertiary py-4 text-center">No data</p>
          ) : (
            <div className="space-y-3">
              {(data?.branchBreakdown ?? []).map((b,i) => (
                <motion.div key={b.branch} initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.05 }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                      <span className="text-xs font-medium text-text-primary truncate">{b.branch}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${GRADE_COLOR["A+"]}`}>A+ {b.aplus}</span>
                      <span className="text-[10px] text-text-tertiary">{b.total} students</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-border-light overflow-hidden">
                    <motion.div initial={{ width:0 }} animate={{ width:`${b.apluspct}%` }} transition={{ duration:0.6, delay:i*0.05 }}
                      className="h-full rounded-full bg-emerald-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject-wise table */}
      {!isLoading && (data?.subjectBreakdown ?? []).length > 0 && (
        <div className="rounded-2xl border border-border-light bg-surface p-5">
          <p className="text-sm font-semibold text-text-primary">Subject-wise Performance</p>
          <p className="text-[11px] text-text-tertiary mt-0.5 mb-4">Grade distribution per subject</p>
          <div className="overflow-x-auto rounded-xl border border-border-light">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-background/60 border-b border-border-light">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-tertiary uppercase tracking-wide">Subject</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-text-tertiary uppercase tracking-wide w-14">Total</th>
                  {["A+","A","B+","B","C","D","Pass","Fail"].map(g => (
                    <th key={g} className="text-center px-2 py-2.5 text-[10px] font-semibold text-text-tertiary uppercase w-10">{g}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.subjectBreakdown ?? []).map((s,i) => {
                  const gm = Object.fromEntries(s.grades.map(g => [g.grade, g.count]));
                  return (
                    <motion.tr key={s.subject} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.03 }}
                      className="border-b border-border-light/50 last:border-0 hover:bg-background/40 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-text-primary">{s.subject}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-text-primary">{s.total}</td>
                      {["A+","A","B+","B","C","D","Pass","Fail"].map(g => (
                        <td key={g} className="px-2 py-2.5 text-center">
                          {gm[g]
                            ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${GRADE_COLOR[g] ?? "bg-border-light text-text-secondary"}`}>{gm[g]}</span>
                            : <span className="text-border-light">—</span>}
                        </td>
                      ))}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EDIT MODAL
═══════════════════════════════════════════════════════════════════════ */
function EditModal({ rec, onClose }: { rec: StudentAchievement; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<StudentAchievement>({ ...rec });

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const addSubj = () => setForm(f => ({ ...f, subject_grades: [...f.subject_grades, { subject:"", score:0, max_score:0, grade:"" }] }));
  const removeSubj = (i: number) => setForm(f => ({ ...f, subject_grades: f.subject_grades.filter((_,idx) => idx!==i) }));
  const setSG = (i: number, k: keyof SubjectGrade, v: string|number) => setForm(f => {
    const sgs = [...f.subject_grades]; sgs[i] = { ...sgs[i], [k]: v }; return { ...f, subject_grades: sgs };
  });

  const mutation = useMutation({
    mutationFn: updateAchievement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["achievements-list"] });
      qc.invalidateQueries({ queryKey: ["achievements-dashboard"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity:0, scale:0.95, y:10 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95, y:10 }}
        className="bg-background rounded-2xl border border-border-light w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-surface/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Pencil className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Edit Record</p>
              <p className="text-[11px] text-text-tertiary">{rec.student_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-border-light/60 flex items-center justify-center text-text-tertiary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="overflow-y-auto flex-1 p-5 space-y-4">
          {mutation.isError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />{(mutation.error as Error).message}
            </div>
          )}

          <Section title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Student Name *"><input required value={form.student_name} onChange={e=>set("student_name",e.target.value)} className={inputCls} /></Field>
              <Field label="Date of Birth"><input type="date" value={form.date_of_birth} onChange={e=>set("date_of_birth",e.target.value)} className={inputCls} /></Field>
              <Field label="Gender">
                <select value={form.gender} onChange={e=>set("gender",e.target.value)} className={inputCls}>
                  <option value="">Select…</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </Field>
              <Field label="Phone"><input value={form.phone} onChange={e=>set("phone",e.target.value)} className={inputCls} /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={e=>set("email",e.target.value)} className={inputCls} /></Field>
              <Field label="Address" span2><textarea value={form.address} onChange={e=>set("address",e.target.value)} rows={2} className={inputCls} /></Field>
              <Field label="City"><input value={form.city} onChange={e=>set("city",e.target.value)} className={inputCls} /></Field>
              <Field label="State"><input value={form.state} onChange={e=>set("state",e.target.value)} className={inputCls} /></Field>
            </div>
          </Section>

          <Section title="Academic Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Academic Year *">
                <select required value={form.academic_year} onChange={e=>set("academic_year",e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {ACADEMIC_YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field label="Class / Program"><input value={form.program} onChange={e=>set("program",e.target.value)} className={inputCls} /></Field>
              <Field label="School"><input value={form.school} onChange={e=>set("school",e.target.value)} className={inputCls} /></Field>
              <Field label="SmartUp Branch">
                <select value={form.branch} onChange={e=>set("branch",e.target.value)} className={inputCls}>
                  <option value="">Select branch…</option>
                  {BRANCH_OPTIONS.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Subject Grades" action={
            <button type="button" onClick={addSubj} className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              <PlusCircle className="h-3.5 w-3.5" /> Add
            </button>
          }>
            {form.subject_grades.length === 0
              ? <p className="text-xs text-text-tertiary py-1">No subjects. Click Add to begin.</p>
              : <div className="space-y-2">
                  {form.subject_grades.map((sg,i) => (
                    <div key={i} className="grid grid-cols-[1fr_140px_32px] gap-2 items-center">
                      <input value={sg.subject} onChange={e=>setSG(i,"subject",e.target.value)} placeholder="Subject name" className={inputCls} />
                      <select value={sg.grade} onChange={e=>setSG(i,"grade",e.target.value)} className={inputCls}>
                        <option value="">Grade…</option>
                        {GRADES.map(g=><option key={g} value={g}>{g}</option>)}
                      </select>
                      <button type="button" onClick={()=>removeSubj(i)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-rose-500 hover:bg-rose-50 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>}
          </Section>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Save Changes
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border-light text-sm text-text-secondary hover:bg-border-light/40 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DATA VIEW TAB
═══════════════════════════════════════════════════════════════════════ */
function DataTab({ year }: { year: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editRec, setEditRec] = useState<StudentAchievement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; student_name: string } | null>(null);
  const limit = 15;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["achievements-list", year, search, page],
    queryFn: () => getAchievements({ year: year||undefined, search: search||undefined, page, limit }),
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => deleteAchievement(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["achievements-list"] });
      qc.invalidateQueries({ queryKey: ["achievements-dashboard"] });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {editRec && <EditModal rec={editRec} onClose={() => setEditRec(null)} />}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity:0, scale:0.95, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95 }}
              className="bg-background rounded-2xl border border-border-light w-full max-w-xs shadow-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-4 space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Delete record?</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{deleteTarget.student_name}</p>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">This will permanently remove the student record and all subject grades. This cannot be undone.</p>
                {deleteMutation.isError && (
                  <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{(deleteMutation.error as Error).message}</p>
                )}
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button onClick={() => deleteMutation.mutate(deleteTarget.name)} disabled={deleteMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors">
                  {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </button>
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border-light text-sm text-text-secondary hover:bg-border-light/40 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by student name…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border-light bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
        </div>
        {year && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/8 border border-primary/20 text-xs font-medium text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {year}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border-light bg-surface overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_110px_70px_90px_28px_28px_28px] gap-2 px-4 py-2.5 border-b border-border-light bg-background/60 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
          <span>Student</span><span>Year</span><span>School</span><span>Class</span><span>Branch</span>
          <span /><span /><span />
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{[1,2,3,4,5].map(i=><Pulse key={i} w="w-full" h="h-10" />)}</div>
        ) : isError ? (
          <div className="p-5 flex items-center gap-2 text-rose-500 text-sm"><AlertCircle className="h-4 w-4" />Failed to load records.</div>
        ) : (data?.records ?? []).length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-text-tertiary">
            <GraduationCap className="h-8 w-8 opacity-30" />
            <p className="text-sm">No records found</p>
          </div>
        ) : (
          <div>
            {(data?.records ?? []).map((rec, i) => (
              <div key={rec.name} className="border-b border-border-light/60 last:border-0">
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.02 }}
                  onClick={() => setExpandedRow(expandedRow === rec.name ? null : rec.name)}
                  className="grid grid-cols-[1fr_90px_110px_70px_90px_28px_28px_28px] gap-2 px-4 py-3 hover:bg-background/50 cursor-pointer items-center transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{rec.student_name}</p>
                    {rec.phone && <p className="text-[10px] text-text-tertiary mt-0.5">{rec.phone}</p>}
                  </div>
                  <span className="text-xs text-text-secondary truncate">{rec.academic_year || "—"}</span>
                  <span className="text-xs text-text-secondary truncate">{rec.school || "—"}</span>
                  <span className="text-xs text-text-secondary truncate">{rec.program || "—"}</span>
                  <span className="text-xs text-text-secondary truncate">{rec.branch || "—"}</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setEditRec(rec); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:text-primary hover:bg-primary/10 transition-colors">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={e => { e.stopPropagation(); setDeleteTarget({ name: rec.name, student_name: rec.student_name }); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:text-rose-500 hover:bg-rose-50 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <motion.span animate={{ rotate: expandedRow === rec.name ? 0 : -90 }} transition={{ duration:0.15 }} className="text-text-tertiary flex justify-center">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.span>
                </motion.div>

                <AnimatePresence initial={false}>
                  {expandedRow === rec.name && (
                    <motion.div key="exp" initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
                      exit={{ height:0, opacity:0 }} transition={{ duration:0.18 }} className="overflow-hidden">
                      <div className="px-4 py-4 bg-background/30 border-t border-border-light/40 space-y-3">
                        {/* Info pills */}
                        <div className="flex flex-wrap gap-2">
                          {rec.date_of_birth && <InfoPill label="DOB" value={rec.date_of_birth} />}
                          {rec.gender && <InfoPill label="Gender" value={rec.gender} />}
                          {rec.email && <InfoPill label="Email" value={rec.email} />}
                          {(rec.city || rec.state) && <InfoPill label="Location" value={[rec.city,rec.state].filter(Boolean).join(", ")} />}
                        </div>
                        {rec.address && <p className="text-xs text-text-secondary"><span className="font-medium text-text-tertiary">Address: </span>{rec.address}</p>}
                        {rec.remarks && <p className="text-xs text-text-secondary"><span className="font-medium text-text-tertiary">Remarks: </span>{rec.remarks}</p>}

                        {/* Subject grades */}
                        {rec.subject_grades?.length > 0 ? (
                          <div>
                            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-2">Subject Grades</p>
                            <div className="flex flex-wrap gap-2">
                              {rec.subject_grades.map((sg,si) => (
                                <div key={si} className="flex items-center gap-2 bg-surface border border-border-light rounded-xl px-3 py-1.5">
                                  <span className="text-xs font-semibold text-text-primary">{sg.subject}</span>
                                  {sg.grade && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${GRADE_COLOR[sg.grade] ?? "bg-border-light text-text-secondary"}`}>
                                      {sg.grade}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-text-tertiary">No subject grades recorded.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between text-xs text-text-tertiary">
          <span className="font-medium">Page {page + 1}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p=>p-1)}
              className="px-4 py-2 rounded-xl border border-border-light bg-surface hover:bg-background/50 disabled:opacity-40 transition-colors font-medium text-text-secondary">
              ← Previous
            </button>
            <button disabled={(data.records ?? []).length < limit} onClick={() => setPage(p=>p+1)}
              className="px-4 py-2 rounded-xl border border-border-light bg-surface hover:bg-background/50 disabled:opacity-40 transition-colors font-medium text-text-secondary">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-surface border border-border-light rounded-lg px-2.5 py-1 text-xs">
      <span className="text-text-tertiary font-medium">{label}:</span>
      <span className="text-text-primary">{value}</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ADD ENTRY TAB
═══════════════════════════════════════════════════════════════════════ */
function AddEntryTab({ year }: { year: string }) {
  const qc = useQueryClient();

  const blank = useCallback(() => ({
    student_name: "", date_of_birth: "", gender: "", phone: "", email: "",
    address: "", city: "", state: "", school: "", program: "", branch: "",
    academic_year: year || "2026-2027",
    overall_grade: "" as OverallGrade,
    total_score: 0, max_total: 500, rank: 0, remarks: "",
    subject_grades: [] as SubjectGrade[],
  }), [year]);

  const [form, setForm] = useState(blank);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const addSubj = () => setForm(f => ({ ...f, subject_grades: [...f.subject_grades, { subject:"", score:0, max_score:0, grade:"" }] }));
  const removeSubj = (i: number) => setForm(f => ({ ...f, subject_grades: f.subject_grades.filter((_,idx) => idx!==i) }));
  const setSG = (i: number, k: keyof SubjectGrade, v: string|number) => setForm(f => {
    const sgs = [...f.subject_grades]; sgs[i] = { ...sgs[i], [k]: v }; return { ...f, subject_grades: sgs };
  });

  const mutation = useMutation({
    mutationFn: createAchievement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["achievements-dashboard"] });
      qc.invalidateQueries({ queryKey: ["achievements-list"] });
      setSubmitted(true);
      setForm(blank());
    },
  });

  return (
    <form onSubmit={e => { e.preventDefault(); if (!form.student_name || !form.academic_year) return; setSubmitted(false); mutation.mutate(form); }}
      className="space-y-4 max-w-2xl">
      {submitted && (
        <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
          className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Record saved successfully!
        </motion.div>
      )}
      {mutation.isError && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />{(mutation.error as Error).message}
        </div>
      )}

      <Section title="Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Student Name *"><input required value={form.student_name} onChange={e=>set("student_name",e.target.value)} placeholder="Full name" className={inputCls} /></Field>
          <Field label="Date of Birth"><input type="date" value={form.date_of_birth} onChange={e=>set("date_of_birth",e.target.value)} className={inputCls} /></Field>
          <Field label="Gender">
            <select value={form.gender} onChange={e=>set("gender",e.target.value)} className={inputCls}>
              <option value="">Select…</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
          <Field label="Phone"><input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="Mobile number" className={inputCls} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="Email address" className={inputCls} /></Field>
          <Field label="Address" span2><textarea value={form.address} onChange={e=>set("address",e.target.value)} rows={2} placeholder="Home address…" className={inputCls} /></Field>
          <Field label="City"><input value={form.city} onChange={e=>set("city",e.target.value)} placeholder="City" className={inputCls} /></Field>
          <Field label="State"><input value={form.state} onChange={e=>set("state",e.target.value)} placeholder="State" className={inputCls} /></Field>
        </div>
      </Section>

      <Section title="Academic Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Academic Year *">
            <select required value={form.academic_year} onChange={e=>set("academic_year",e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {ACADEMIC_YEARS.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Class / Program"><input value={form.program} onChange={e=>set("program",e.target.value)} placeholder="e.g. 10th, 12th, NEET" className={inputCls} /></Field>
          <Field label="School"><input value={form.school} onChange={e=>set("school",e.target.value)} placeholder="School name" className={inputCls} /></Field>
          <Field label="SmartUp Branch">
            <select value={form.branch} onChange={e=>set("branch",e.target.value)} className={inputCls}>
              <option value="">Select branch…</option>
              {BRANCH_OPTIONS.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Subject Grades" action={
        <button type="button" onClick={addSubj} className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          <PlusCircle className="h-3.5 w-3.5" /> Add Subject
        </button>
      }>
        {form.subject_grades.length === 0
          ? <p className="text-xs text-text-tertiary py-1">No subjects added. Click "Add Subject" to begin.</p>
          : <div className="space-y-2">
              {form.subject_grades.map((sg,i) => (
                <motion.div key={i} initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
                  className="grid grid-cols-[1fr_140px_32px] gap-2 items-center">
                  <input value={sg.subject} onChange={e=>setSG(i,"subject",e.target.value)} placeholder="Subject name" className={inputCls} />
                  <select value={sg.grade} onChange={e=>setSG(i,"grade",e.target.value)} className={inputCls}>
                    <option value="">Grade…</option>
                    {GRADES.map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                  <button type="button" onClick={()=>removeSubj(i)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-rose-500 hover:bg-rose-50 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>}
      </Section>

      <div className="flex gap-2">
        <button type="submit" disabled={mutation.isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          Save Record
        </button>
        <button type="button" onClick={() => { setForm(blank()); setSubmitted(false); mutation.reset(); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-light text-sm text-text-secondary hover:bg-border-light/40 transition-colors">
          <X className="h-4 w-4" /> Clear
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════ */
type Tab = "dashboard" | "data" | "add";

export default function StudentAchievementsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [year, setYear] = useState("");

  const { data: yearsData } = useQuery({
    queryKey: ["achievement-years"],
    queryFn: getAchievementYears,
    staleTime: 300_000,
  });
  const years = useMemo(() => yearsData?.years ?? [], [yearsData]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { key: "data",      label: "Records",   icon: <Table2 className="h-3.5 w-3.5" /> },
    { key: "add",       label: "Add Entry", icon: <PlusCircle className="h-3.5 w-3.5" /> },
  ];

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="space-y-5">
      <BreadcrumbNav />

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 p-6 text-white shadow-lg">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-indigo-100 text-sm font-medium uppercase tracking-widest mb-1">Director Academics</p>
            <h1 className="text-3xl font-bold tracking-tight">A+ Cabinet</h1>
            <p className="text-indigo-100 text-sm mt-1">Board exam results, grade trends, and subject-wise achievement records.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/90 text-slate-700 px-3 py-2 shrink-0">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Year</label>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="text-sm bg-transparent border-0 focus:outline-none text-slate-700 font-semibold cursor-pointer"
            >
              <option value="">All Years</option>
              {years.map(y => <option key={y.name} value={y.name}>{y.name}</option>)}
            </select>
          </div>
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 right-24 w-24 h-24 rounded-full bg-white/5" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface border border-border-light rounded-2xl p-1 w-fit">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
              activeTab === tab.key
                ? "bg-background shadow-sm text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-3 }} transition={{ duration:0.15 }}>
          {activeTab === "dashboard" && <DashboardTab year={year} />}
          {activeTab === "data"      && <DataTab year={year} />}
          {activeTab === "add"       && <AddEntryTab year={year} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
