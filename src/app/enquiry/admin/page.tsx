"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  Pencil,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

interface FollowUpItem {
  id: string;
  counsellorName: string;
  channel: string;
  outcome: string;
  remarks: string | null;
  createdAt: string;
}

interface LeadRecord {
  id: string;
  referenceCode: string;
  studentName: string;
  parentName: string;
  phone: string;
  email: string | null;
  country: string;
  city: string | null;
  classLevel: string;
  stream: string;
  board: string;
  preferredPlan: string;
  schoolName: string | null;
  preferredCallTime: string | null;
  status: string;
  assignedCounsellor: string | null;
  notes: string | null;
  utmSource: string | null;
  createdAt: string;
  followUps: FollowUpItem[];
}

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  new: { label: "New", badge: "bg-purple-50 text-[#5C34A4] border-purple-200" },
  contacted: {
    label: "Contacted",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  demo_scheduled: {
    label: "Demo Scheduled",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  diagnostic_done: {
    label: "Diagnostic Done",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  enrolled: {
    label: "Enrolled",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  not_interested: {
    label: "Not Interested",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export default function EnquiryAdminPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    byStatus: Record<string, number>;
  }>({ total: 0, byStatus: {} });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  const [editingLead, setEditingLead] = useState<LeadRecord | null>(null);
  const [editStatus, setEditStatus] = useState("new");
  const [editCounsellor, setEditCounsellor] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (classFilter !== "all") params.set("classLevel", classFilter);
      if (planFilter !== "all") params.set("plan", planFilter);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/enquiry/admin/leads?${params.toString()}`);
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "Failed to load leads.");
        return;
      }
      setLeads(data.leads || []);
      setSummary(data.summary || { total: 0, byStatus: {} });
    } catch {
      setLoadError("Network error while fetching leads.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, classFilter, planFilter, search]);

  useEffect(() => {
    fetch("/api/enquiry/admin/auth")
      .then((res) => res.json())
      .then((data) => {
        setAuthenticated(Boolean(data.authenticated));
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchLeads();
    }
  }, [authenticated, fetchLeads]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/enquiry/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Invalid credentials");
        return;
      }
      setAuthenticated(true);
    } catch {
      setAuthError("Unable to reach server.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/enquiry/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
    setLeads([]);
  };

  const openEditor = (lead: LeadRecord) => {
    setEditingLead(lead);
    setEditStatus(lead.status);
    setEditCounsellor(lead.assignedCounsellor || "");
    setEditNotes(lead.notes || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/enquiry/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingLead.id,
          status: editStatus,
          assignedCounsellor: editCounsellor,
          notes: editNotes,
        }),
      });
      if (res.ok) {
        setEditingLead(null);
        fetchLeads();
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      "Reference",
      "Student",
      "Parent",
      "Phone",
      "Country",
      "City",
      "Class",
      "Stream",
      "Board",
      "Plan",
      "Status",
      "Counsellor",
      "Notes",
      "Created At",
    ];
    const escape = (val: string | null | undefined) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    const rows = leads.map((l) =>
      [
        l.referenceCode,
        l.studentName,
        l.parentName,
        l.phone,
        l.country,
        l.city,
        l.classLevel,
        l.stream,
        l.board,
        l.preferredPlan,
        l.status,
        l.assignedCounsellor,
        l.notes,
        new Date(l.createdAt).toISOString(),
      ]
        .map(escape)
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartup-crash-course-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC]">
        <Loader2 className="w-6 h-6 animate-spin text-[#5C34A4]" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200/90 p-7 shadow-xl shadow-[#5C34A4]/10">
          <div className="flex items-center gap-3 mb-6">
            <Image
              src="/smartup-logo-v2.png"
              alt="Smart Up"
              width={36}
              height={36}
              className="object-contain"
            />
            <div>
              <h1 className="text-base font-black text-slate-900">
                Enquiry Leads Portal
              </h1>
              <p className="text-xs text-slate-500">
                CBSE Crash Course Counsellor Login
              </p>
            </div>
          </div>

          {authError && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 font-medium">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@Enquiry"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C34A4]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C34A4]"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 rounded-xl bg-[#5C34A4] hover:bg-[#4B288A] text-white text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{loggingIn ? "Signing in..." : "Sign In"}</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/enquiry"
              className="text-xs font-semibold text-[#5C34A4] hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Landing Page</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFC] text-slate-900">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src="/smartup-logo-v2.png"
              alt="Smart Up"
              width={30}
              height={30}
              className="object-contain"
            />
            <div>
              <span className="text-sm font-black text-slate-900 block leading-none">
                CBSE Crash Course Enquiries
              </span>
              <span className="text-[11px] text-slate-500">
                Isolated Database: smartup_enquiry
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={exportCsv}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={fetchLeads}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Total Leads
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {summary.total}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4">
            <span className="text-[11px] font-bold uppercase text-[#5C34A4]">
              New
            </span>
            <p className="text-2xl font-black text-[#5C34A4] mt-1">
              {summary.byStatus?.new || 0}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4">
            <span className="text-[11px] font-bold uppercase text-amber-600">
              Demo Scheduled
            </span>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {summary.byStatus?.demo_scheduled || 0}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4">
            <span className="text-[11px] font-bold uppercase text-emerald-600">
              Enrolled
            </span>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {summary.byStatus?.enrolled || 0}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, parent, phone, ref code..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#5C34A4]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="all">All Classes</option>
            {["Class 8", "Class 9", "Class 10", "Class 11", "Class 12"].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              )
            )}
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="all">All Plans</option>
            {["1:1 Personal", "1:3 Small Group", "Micro Batch", "Not sure"].map(
              (p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              )
            )}
          </select>
        </div>

        {loadError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 font-medium">
            {loadError}
          </div>
        )}

        {/* Leads Table */}
        <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Ref / Date</th>
                  <th className="py-3 px-4">Student &amp; Parent</th>
                  <th className="py-3 px-4">WhatsApp &amp; Location</th>
                  <th className="py-3 px-4">Academic &amp; Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-slate-400"
                    >
                      {loading ? "Loading enquiries..." : "No enquiries found."}
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const st = STATUS_LABELS[lead.status] || STATUS_LABELS.new;
                    const waDigits = lead.phone.replace(/\D/g, "");
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4 align-top">
                          <span className="font-mono font-bold text-[#5C34A4] block">
                            {lead.referenceCode}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(lead.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <span className="font-bold text-slate-900 block">
                            {lead.studentName}
                          </span>
                          <span className="text-slate-500">
                            Parent: {lead.parentName}
                          </span>
                          {lead.schoolName && (
                            <span className="block text-[11px] text-slate-400">
                              {lead.schoolName}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <span className="font-mono font-semibold text-slate-900 block">
                            {lead.phone}
                          </span>
                          <span className="text-slate-500">
                            {lead.city ? `${lead.city}, ` : ""}
                            {lead.country}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <span className="font-bold text-slate-800 block">
                            {lead.classLevel} · {lead.stream} ({lead.board})
                          </span>
                          <span className="text-[#5C34A4] font-semibold">
                            {lead.preferredPlan}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${st.badge}`}
                          >
                            {st.label}
                          </span>
                          {lead.assignedCounsellor && (
                            <span className="block text-[11px] text-slate-500 mt-1">
                              {lead.assignedCounsellor}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top text-right space-x-1.5 whitespace-nowrap">
                          <a
                            href={`https://wa.me/${waDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => openEditor(lead)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Update</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Update Enquiry
                </h2>
                <p className="text-xs text-slate-500">
                  {editingLead.studentName} · {editingLead.referenceCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pipeline Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Counsellor
                </label>
                <input
                  type="text"
                  value={editCounsellor}
                  onChange={(e) => setEditCounsellor(e.target.value)}
                  placeholder="Counsellor name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Demo timing, fee discussed, parent feedback..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#5C34A4] text-white text-xs font-bold cursor-pointer"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
