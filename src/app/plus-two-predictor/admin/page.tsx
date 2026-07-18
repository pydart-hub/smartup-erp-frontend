"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const Background3D = dynamic(
  () => import("@/components/predictor/Background3D"),
  { ssr: false }
);

interface Submission {
  id: string;
  name: string;
  phone: string;
  district: string;
  stream: string;
  marksJson: Record<string, { p1te: number; p1ce: number }>;
  submittedAt: string;
}

const KERALA_DISTRICTS = [
  "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
  "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad",
  "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod",
];

const SUBJECT_CODES = ["ENG", "MAL", "PHY", "CHE", "MAT", "CSC"];
const SUBJECT_LABELS: Record<string, string> = {
  ENG: "English", MAL: "Malayalam", PHY: "Physics",
  CHE: "Chemistry", MAT: "Mathematics", CSC: "Computer Science",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function downloadCSV(submissions: Submission[]) {
  const headers = [
    "Name", "Phone", "District", "Stream", "Submitted At",
    ...SUBJECT_CODES.flatMap((c) => [`${c} P1 TE`, `${c} P1 CE`]),
  ];
  const rows = submissions.map((s) => [
    s.name, s.phone, s.district, s.stream, formatDate(s.submittedAt),
    ...SUBJECT_CODES.flatMap((c) => [
      s.marksJson?.[c]?.p1te ?? "", s.marksJson?.[c]?.p1ce ?? "",
    ]),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `predictor-submissions-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/predictor/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        onLogin();
      } else {
        setError("Invalid username or password.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 font-sans">
      <Background3D />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl shadow-purple-500/5 p-8 space-y-6 relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image src="/smartup-logo-v2.png" alt="SmartUp" width={34} height={34} className="object-contain drop-shadow-sm" />
          <span className="text-slate-800 text-lg tracking-[0.15em] uppercase font-black">SMART UP</span>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800">Admin Login</h2>
          <p className="text-xs text-slate-400">Plus Two Predictor — Submissions Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
              className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-slate-800 placeholder:text-slate-300 transition text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              autoComplete="current-password"
              required
              className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-slate-800 placeholder:text-slate-300 transition text-sm"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-lg border border-red-100"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-xl transition shadow-lg shadow-purple-500/15 text-sm tracking-wider cursor-pointer disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          <Link href="/plus-two-predictor" className="hover:text-violet-600 transition">
            ← Back to predictor
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (district) params.set("district", district);

      const res = await fetch(`/api/predictor/admin?${params.toString()}`);
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setTotal(data.total || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search, district, onLogout]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    await fetch("/api/predictor/admin/logout", { method: "POST" });
    onLogout();
  };

  return (
    <div className="min-h-screen relative py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-800 overflow-x-hidden">
      <Background3D />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/smartup-logo-v2.png" alt="SmartUp" width={32} height={32} className="object-contain drop-shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 text-base tracking-[0.15em] uppercase font-black">SMART UP</span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
              </div>
              <p className="text-xs text-slate-400">Plus Two Predictor — Submissions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadCSV(submissions)}
              disabled={submissions.length === 0}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition border border-emerald-200 cursor-pointer disabled:opacity-40"
            >
              ↓ Export CSV
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="text-2xl font-black text-purple-700">{total}</div>
            <div className="text-xs font-semibold text-slate-400 mt-0.5">Total Submissions</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="text-2xl font-black text-emerald-700">
              {new Set(submissions.map((s) => s.district)).size}
            </div>
            <div className="text-xs font-semibold text-slate-400 mt-0.5">Districts Covered</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="text-2xl font-black text-indigo-700">
              {new Set(submissions.map((s) => s.phone)).size}
            </div>
            <div className="text-xs font-semibold text-slate-400 mt-0.5">Unique Students</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="text-2xl font-black text-amber-600">
              {submissions.length > 0
                ? formatDate(submissions[0].submittedAt).split(",")[0]
                : "—"}
            </div>
            <div className="text-xs font-semibold text-slate-400 mt-0.5">Latest Submission</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or phone..."
            className="flex-1 min-w-[200px] p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 placeholder:text-slate-300 shadow-sm"
          />
          <select
            value={district}
            onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 shadow-sm cursor-pointer"
          >
            <option value="">All Districts</option>
            {KERALA_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <button
            onClick={fetchData}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
          >
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mr-3" />
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <span className="text-4xl">📋</span>
              <p className="text-sm font-semibold">No submissions found</p>
              <p className="text-xs">Students who complete the predictor will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10">#</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">District</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stream</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted At</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {submissions.map((sub, idx) => (
                    <React.Fragment key={sub.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 text-xs font-bold">
                          {(page - 1) * limit + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{sub.name}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">{sub.phone}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[11px] font-bold border border-purple-100">
                            {sub.district}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs font-semibold">{sub.stream}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(sub.submittedAt)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                            className="text-[11px] font-bold text-violet-600 hover:text-violet-800 underline underline-offset-2 cursor-pointer"
                          >
                            {expandedId === sub.id ? "Hide" : "View marks"}
                          </button>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {expandedId === sub.id && (
                          <motion.tr
                            key={`${sub.id}-expanded`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <td colSpan={7} className="px-4 py-4 bg-purple-50/20">
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {SUBJECT_CODES.map((code) => {
                                  const m = sub.marksJson?.[code];
                                  return (
                                    <div key={code} className="bg-white border border-purple-100 rounded-xl p-3 text-center shadow-sm">
                                      <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">
                                        {SUBJECT_LABELS[code]}
                                      </div>
                                      <div className="text-slate-700 font-black text-sm">
                                        {m ? `${m.p1te + m.p1ce}` : "—"}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {m ? `TE: ${m.p1te} · CE: ${m.p1ce}` : "No data"}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page Entry ───────────────────────────────────────────────────────────────
export default function PlusTwoPredictorAdmin() {
  const [authState, setAuthState] = useState<"checking" | "login" | "dashboard">("checking");

  // Check if already logged in by pinging the admin API
  useEffect(() => {
    fetch("/api/predictor/admin?page=1&limit=1")
      .then((res) => {
        setAuthState(res.ok ? "dashboard" : "login");
      })
      .catch(() => setAuthState("login"));
  }, []);

  if (authState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans text-slate-400 text-sm">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading...
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {authState === "login" ? (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoginForm onLogin={() => setAuthState("dashboard")} />
        </motion.div>
      ) : (
        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Dashboard onLogout={() => setAuthState("login")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
