"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Users,
  XCircle,
  Calendar,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { createCourseSchedule, getStudentGroups } from "@/lib/api/courseSchedule";
import apiClient from "@/lib/api/client";
import { createSalesOrder, getTuitionFeeItem, submitSalesOrder } from "@/lib/api/sales";
import { getO2OHourlyRate } from "@/lib/utils/o2oFeeRates";

const selectCls =
  "w-full h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50";

const inputCls =
  "w-full h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

const WEEKDAYS = [
  { key: 0, label: "Sun" },
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu" },
  { key: 5, label: "Fri" },
  { key: 6, label: "Sat" },
];

type Phase = "setup" | "labels" | "running" | "done";

type SessionLabelRow = {
  date: string;
  label: string;
};

type BillingResult = {
  salesOrder?: string;
  invoices?: string[];
  amount: number;
  hours: number;
  rate: number;
  error?: string;
};

function getMatchingDates(from: string, to: string, selectedDays: Set<number>): string[] {
  if (!from || !to || selectedDays.size === 0) return [];
  const dates: string[] = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cur <= end) {
    if (selectedDays.has(cur.getDay())) {
      dates.push(cur.toISOString().split("T")[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function getDurationHours(fromTime: string, toTime: string): number {
  const [fromH, fromM] = fromTime.split(":").map(Number);
  const [toH, toM] = toTime.split(":").map(Number);
  const fromMinutes = fromH * 60 + fromM;
  const toMinutes = toH * 60 + toM;
  const diff = toMinutes - fromMinutes;
  return diff > 0 ? diff / 60 : 0;
}

function extractStudentId(groupDocName: string, groupLabel?: string): string | null {
  const sources = [groupLabel ?? "", groupDocName];
  for (const src of sources) {
    const bracketMatch = src.match(/\((STU-[^)]+)\)/i);
    if (bracketMatch?.[1]) return bracketMatch[1].trim();

    const genericMatch = src.match(/(STU-[A-Z0-9 ]+-\d{2}-\d{3})/i);
    if (genericMatch?.[1]) return genericMatch[1].trim();
  }
  return null;
}

export default function OneToOneSchedulePage() {
  return (
    <React.Suspense>
      <OneToOneScheduleContent />
    </React.Suspense>
  );
}

function OneToOneScheduleContent() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const searchParams = useSearchParams();
  const branch = defaultCompany || (allowedCompanies.length > 0 ? allowedCompanies[0] : "");

  const preselectedGroup = searchParams.get("group") ?? "";

  const [phase, setPhase] = useState<Phase>("setup");
  const [scheduleMode, setScheduleMode] = useState<"bulk" | "single">("bulk");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  // Single-mode state
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [singleLabel, setSingleLabel] = useState("");

  const [setup, setSetup] = useState({
    student_group: preselectedGroup,
    from_time: "09:00",
    to_time: "10:30",
  });

  const [sessionRows, setSessionRows] = useState<SessionLabelRow[]>([]);
  const [globalLabel, setGlobalLabel] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ total: number; created: number; failed: { date: string; error: string }[]; billing?: BillingResult } | null>(null);

  const { data: groupRes } = useQuery({
    queryKey: ["o2o-student-groups", branch],
    queryFn: () =>
      getStudentGroups({
        branch: branch || undefined,
        oneToOneOnly: true,
        includeName: preselectedGroup || undefined,
      }),
    staleTime: 5 * 60_000,
  });
  const groups = groupRes?.data ?? [];

  const matchingDates = useMemo(
    () => getMatchingDates(fromDate, toDate, selectedDays),
    [fromDate, toDate, selectedDays],
  );

  const selectedGroupLabel = useMemo(() => {
    const g = groups.find((x) => x.name === setup.student_group);
    return g?.student_group_name ?? setup.student_group;
  }, [groups, setup.student_group]);

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
    setErrors((prev) => ({ ...prev, days: "" }));
  }

  function setField(field: keyof typeof setup, value: string) {
    setSetup((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validateSetup(): boolean {
    const e: Record<string, string> = {};
    if (!setup.student_group) e.student_group = "Required";
    if (!fromDate) e.fromDate = "Required";
    if (!toDate) e.toDate = "Required";
    if (fromDate && toDate && fromDate > toDate) e.toDate = "Must be after start date";
    if (setup.from_time >= setup.to_time) e.to_time = "End time must be after start time";
    if (selectedDays.size === 0) e.days = "Select at least one day";
    if (matchingDates.length === 0) e.days = "No dates match selected days in this range";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goToLabels() {
    if (!validateSetup()) return;
    setSessionRows(matchingDates.map((date) => ({ date, label: "" })));
    setPhase("labels");
  }

  function validateSingle(): boolean {
    const e: Record<string, string> = {};
    if (!setup.student_group) e.student_group = "Required";
    if (!singleDate) e.singleDate = "Required";
    if (setup.from_time >= setup.to_time) e.to_time = "End time must be after start time";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function createSingle() {
    if (!validateSingle()) return;
    const rows = [{ date: singleDate, label: singleLabel }];
    setSessionRows(rows);
    createSchedules(rows);
  }

  function setRowLabel(index: number, label: string) {
    setSessionRows((prev) => prev.map((row, i) => (i === index ? { ...row, label } : row)));
  }

  function fillAllLabels() {
    setSessionRows((prev) => prev.map((row) => ({ ...row, label: globalLabel })));
  }

  async function createSchedules(rowsOverride?: SessionLabelRow[]) {
    const rows = rowsOverride ?? sessionRows;
    setPhase("running");
    setProgress({ done: 0, total: rows.length });

    const out = { total: rows.length, created: 0, failed: [] as { date: string; error: string }[], billing: undefined as BillingResult | undefined };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await createCourseSchedule({
          student_group: setup.student_group,
          schedule_date: row.date,
          from_time: setup.from_time + ":00",
          to_time: setup.to_time + ":00",
          custom_branch: branch || undefined,
          custom_event_title: row.label.trim() || undefined,
        });
        out.created += 1;
      } catch (err: unknown) {
        const resp = (err as { response?: { data?: { exception?: string } } })?.response?.data;
        const msg = resp?.exception ? String(resp.exception) : "Failed to create schedule";
        out.failed.push({ date: row.date, error: msg.slice(0, 140) });
      }
      setProgress({ done: i + 1, total: rows.length });
    }

    // Duration-based O2O billing: amount = created sessions × duration hours × hourly rate.
    if (out.created > 0) {
      try {
        const selectedGroup = groups.find((g) => g.name === setup.student_group);
        const program = selectedGroup?.program?.trim();
        if (!program) throw new Error("Program is missing on selected One-to-One group.");

        const tuitionItem = await getTuitionFeeItem(program);
        if (!tuitionItem) throw new Error(`No tuition fee item found for program \"${program}\".`);

        const studentId = extractStudentId(setup.student_group, selectedGroup?.student_group_name);
        if (!studentId) throw new Error("Could not determine student from selected One-to-One group name.");

        const studentRes = await apiClient.get<{ data?: { customer?: string } }>(
          `/resource/Student/${encodeURIComponent(studentId)}?fields=["customer"]`,
        );
        const customer = studentRes.data?.data?.customer;
        if (!customer) throw new Error(`Student ${studentId} has no linked customer.`);

        const durationHours = getDurationHours(setup.from_time, setup.to_time);
        if (durationHours <= 0) throw new Error("Invalid session duration for billing.");

        const totalHours = Number((durationHours * out.created).toFixed(2));
        const ratePerHour = getO2OHourlyRate(program);
        const totalAmount = Number((totalHours * ratePerHour).toFixed(2));

        if (!branch) throw new Error("Branch is required to create billing documents.");

        const today = new Date().toISOString().split("T")[0];
        const soRes = await createSalesOrder({
          customer,
          company: branch,
          transaction_date: today,
          delivery_date: today,
          order_type: "Sales",
          items: [
            {
              item_code: tuitionItem.item_code,
              qty: 1,
              rate: totalAmount,
              description: `One-to-One tuition: ${out.created} session(s) x ${durationHours.toFixed(2)}h x ₹${ratePerHour}/h`,
            },
          ],
        });
        const salesOrderName = soRes.data.name;
        await submitSalesOrder(salesOrderName);

        const invRes = await fetch("/api/admission/create-invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            salesOrderName,
            schedule: [{ amount: totalAmount, dueDate: today, label: "One-to-One Tuition" }],
          }),
        });

        const invData = await invRes.json().catch(() => ({}));
        if (!invRes.ok) {
          const err = String((invData as { error?: string })?.error ?? `HTTP ${invRes.status}`);
          out.billing = {
            salesOrder: salesOrderName,
            amount: totalAmount,
            hours: totalHours,
            rate: ratePerHour,
            error: `Sales Order created, but invoice creation failed: ${err}`,
          };
        } else {
          out.billing = {
            salesOrder: salesOrderName,
            invoices: (invData as { invoices?: string[] })?.invoices ?? [],
            amount: totalAmount,
            hours: totalHours,
            rate: ratePerHour,
          };
        }
      } catch (err: unknown) {
        out.billing = {
          amount: 0,
          hours: 0,
          rate: 0,
          error: err instanceof Error ? err.message : "Billing creation failed",
        };
      }
    }

    setResult(out);
    setPhase("done");
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      <div className="flex items-center gap-3">
        <Link href="/dashboard/branch-manager/course-schedule">
          <button className="p-2 rounded-[10px] hover:bg-brand-wash text-text-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            One-to-One Schedule
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {scheduleMode === "bulk"
              ? "Step 1: assign dates and time · Step 2: add subject labels manually"
              : "Pick a single date and create one session instantly"}
          </p>
        </div>
      </div>

      {/* Mode toggle — only visible in setup phase */}
      {phase === "setup" && (
        <div className="flex gap-2 p-1 rounded-[12px] bg-surface border border-border-light w-fit">
          <button
            type="button"
            onClick={() => { setScheduleMode("bulk"); setErrors({}); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all ${
              scheduleMode === "bulk"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Layers className="h-4 w-4" />
            Bulk Schedule
          </button>
          <button
            type="button"
            onClick={() => { setScheduleMode("single"); setErrors({}); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all ${
              scheduleMode === "single"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Single Schedule
          </button>
        </div>
      )}

      {phase === "setup" && scheduleMode === "single" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                  Single Session Setup
                </h2>

                {/* Student Group */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Student Group *</label>
                  <select
                    className={`${selectCls} ${errors.student_group ? "border-error" : ""}`}
                    value={setup.student_group}
                    onChange={(e) => setField("student_group", e.target.value)}
                  >
                    <option value="">Select one-to-one group…</option>
                    {groups.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.student_group_name}
                        {g.program ? ` — ${g.program}` : ""}
                      </option>
                    ))}
                  </select>
                  {errors.student_group && <p className="text-xs text-error">{errors.student_group}</p>}
                </div>

                {/* From / To Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">From Time *</label>
                    <input
                      type="time"
                      className={`${inputCls} ${errors.from_time ? "border-error" : ""}`}
                      value={setup.from_time}
                      onChange={(e) => setField("from_time", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">To Time *</label>
                    <input
                      type="time"
                      className={`${inputCls} ${errors.to_time ? "border-error" : ""}`}
                      value={setup.to_time}
                      onChange={(e) => setField("to_time", e.target.value)}
                    />
                    {errors.to_time && <p className="text-xs text-error">{errors.to_time}</p>}
                  </div>
                </div>

                {/* Single Date */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Date *</label>
                  <input
                    type="date"
                    className={`${inputCls} ${errors.singleDate ? "border-error" : ""}`}
                    value={singleDate}
                    onChange={(e) => { setSingleDate(e.target.value); setErrors((prev) => ({ ...prev, singleDate: "" })); }}
                  />
                  {errors.singleDate && <p className="text-xs text-error">{errors.singleDate}</p>}
                </div>

                {/* Subject Label */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Subject Label</label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. Physics, Maths (optional)"
                    value={singleLabel}
                    onChange={(e) => setSingleLabel(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">Preview</h2>
                <div className="rounded-[10px] border-l-4 border-l-primary bg-primary/5 p-3 space-y-1.5 text-xs">
                  <p className="text-text-secondary flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {selectedGroupLabel || "No group selected"}
                  </p>
                  <p className="text-text-secondary flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {setup.from_time} - {setup.to_time}
                  </p>
                  {singleDate && (
                    <p className="text-text-secondary flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(singleDate + "T00:00:00").toLocaleDateString("en-IN", {
                        weekday: "short", day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  )}
                  {singleLabel && (
                    <p className="text-primary font-medium">{singleLabel}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-primary/10 text-primary border-0">1 session</Badge>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={createSingle}>
              Create Schedule &amp; Bill
            </Button>
          </div>
        </div>
      )}

      {phase === "setup" && scheduleMode === "bulk" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                  One-to-One Setup
                </h2>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Student Group *</label>
                  <select
                    className={`${selectCls} ${errors.student_group ? "border-error" : ""}`}
                    value={setup.student_group}
                    onChange={(e) => setField("student_group", e.target.value)}
                  >
                    <option value="">Select one-to-one group…</option>
                    {groups.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.student_group_name}
                        {g.program ? ` — ${g.program}` : ""}
                      </option>
                    ))}
                  </select>
                  {errors.student_group && <p className="text-xs text-error">{errors.student_group}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">From Time *</label>
                    <input
                      type="time"
                      className={`${inputCls} ${errors.from_time ? "border-error" : ""}`}
                      value={setup.from_time}
                      onChange={(e) => setField("from_time", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">To Time *</label>
                    <input
                      type="time"
                      className={`${inputCls} ${errors.to_time ? "border-error" : ""}`}
                      value={setup.to_time}
                      onChange={(e) => setField("to_time", e.target.value)}
                    />
                    {errors.to_time && <p className="text-xs text-error">{errors.to_time}</p>}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-text-primary">Repeat on Days *</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((wd) => {
                      const active = selectedDays.has(wd.key);
                      return (
                        <button
                          key={wd.key}
                          type="button"
                          onClick={() => toggleDay(wd.key)}
                          className={`flex items-center justify-center w-12 h-12 rounded-[12px] text-sm font-semibold transition-all border-2 ${
                            active
                              ? "bg-primary text-white border-primary"
                              : "bg-surface text-text-secondary border-border-light hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          {wd.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.days && <p className="text-xs text-error">{errors.days}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Start Date *</label>
                    <input
                      type="date"
                      className={`${inputCls} ${errors.fromDate ? "border-error" : ""}`}
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                    {errors.fromDate && <p className="text-xs text-error">{errors.fromDate}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">End Date *</label>
                    <input
                      type="date"
                      className={`${inputCls} ${errors.toDate ? "border-error" : ""}`}
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                    {errors.toDate && <p className="text-xs text-error">{errors.toDate}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">Preview</h2>

                <div className="rounded-[10px] border-l-4 border-l-primary bg-primary/5 p-3 space-y-1.5 text-xs">
                  <p className="text-text-secondary flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {selectedGroupLabel || "No group selected"}
                  </p>
                  <p className="text-text-secondary flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {setup.from_time} - {setup.to_time}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-primary/10 text-primary border-0">
                    {matchingDates.length} date{matchingDates.length !== 1 ? "s" : ""}
                  </Badge>
                  <span className="text-xs text-text-tertiary">generated</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {matchingDates.map((d) => (
                    <div key={d} className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] bg-surface-secondary text-xs">
                      <CalendarDays className="h-3 w-3 text-text-tertiary" />
                      <span className="text-text-primary font-medium">
                        {new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={goToLabels}>
              Next: Add Subject Labels
            </Button>
          </div>
        </div>
      )}

      {phase === "labels" && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                Step 2: Subject Labels (manual)
              </h2>
              <Badge variant="default" className="bg-primary/10 text-primary border-0">
                {sessionRows.length} sessions
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={globalLabel}
                onChange={(e) => setGlobalLabel(e.target.value)}
                className={inputCls}
                placeholder="Type a subject label (e.g. Physics)"
              />
              <Button variant="outline" onClick={fillAllLabels}>
                Fill All
              </Button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto rounded-[10px] border border-border-light">
              {sessionRows.map((row, idx) => (
                <div key={row.date} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 p-3 border-b border-border-light last:border-b-0">
                  <div className="text-xs font-medium text-text-primary">
                    {new Date(row.date + "T00:00:00").toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <input
                    value={row.label}
                    onChange={(e) => setRowLabel(idx, e.target.value)}
                    className={inputCls}
                    placeholder="Subject label (optional)"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPhase("setup")}>Back</Button>
              <Button onClick={() => createSchedules()}>Create {sessionRows.length} Schedules</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {phase === "running" && (
          <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-8 space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-text-primary">Creating schedules…</p>
                    <p className="text-sm text-text-secondary mt-1">{progress.done} of {progress.total} completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {phase === "done" && result && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  {result.failed.length === 0 ? (
                    <CheckCircle2 className="h-8 w-8 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-8 w-8 text-error flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      {result.failed.length === 0 ? "One-to-One schedules created" : `${result.created} of ${result.total} created`}
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">
                      {result.created} created · {result.failed.length} failed · {result.total} total
                    </p>
                  </div>
                </div>

                {result.failed.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.failed.map((f) => (
                      <div key={f.date} className="text-sm bg-error/5 border border-error/10 rounded-[8px] p-2">
                        <span className="font-medium">{f.date}</span>
                        <span className="text-text-secondary ml-2">{f.error}</span>
                      </div>
                    ))}
                  </div>
                )}

                {result.billing && (
                  <div className={`rounded-[10px] border p-3 text-sm ${result.billing.error ? "bg-error/5 border-error/20" : "bg-success/5 border-success/20"}`}>
                    <p className="font-semibold text-text-primary">Duration-Based Billing</p>
                    {result.billing.error ? (
                      <p className="text-text-secondary mt-1">{result.billing.error}</p>
                    ) : (
                      <div className="text-text-secondary mt-1 space-y-1">
                        <p>Hours: {result.billing.hours.toFixed(2)} · Rate: ₹{result.billing.rate}/h</p>
                        <p>Total: ₹{result.billing.amount.toLocaleString("en-IN")}</p>
                        <p>Sales Order: {result.billing.salesOrder}</p>
                        <p>Invoices: {(result.billing.invoices ?? []).join(", ") || "Created"}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Link href="/dashboard/branch-manager/course-schedule">
                    <Button>View Schedules</Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPhase("setup");
                      setSessionRows([]);
                      setResult(null);
                      setProgress({ done: 0, total: 0 });
                      setSingleLabel("");
                    }}
                  >
                    Create More
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
