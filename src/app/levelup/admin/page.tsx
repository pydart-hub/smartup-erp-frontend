"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  Search,
  Download,
  CheckCircle2,
  Clock,
  RefreshCw,
  GraduationCap,
  Users,
  Building,
  Globe2,
  FileSpreadsheet,
  ArrowLeft,
  XCircle,
  Trash2,
} from "lucide-react";
import { LevelUpDeleteModal, LevelUpDeleteTarget } from "@/components/levelup/LevelUpDeleteModal";

interface AttemptRecord {
  id: string;
  studentName: string;
  email?: string | null;
  schoolName?: string;
  studentPhone: string | null;
  country: string;
  emirateCity: string;
  classLevel: string;
  curriculum: string;
  examTitle: string;
  status: "in_progress" | "submitted" | "auto_submitted";
  scoreObtained: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  startedAt: string;
  submittedAt: string | null;
  totalAnswersLogged: number;
}

interface RegistrationRecord {
  id: string;
  studentName: string;
  email?: string | null;
  schoolName?: string;
  phone: string;
  country: string;
  emirateCity: string;
  classLevel: string;
  curriculum: string;
  status: string;
  attemptId?: string | null;
  createdAt: string;
}

function formatDateTime(isoString: string | null | undefined) {
  if (!isoString) return { date: "—", time: "—", full: "—" };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { date: "—", time: "—", full: "—" };

  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return { date, time, full: `${date}, ${time}` };
}

export default function LevelUpAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<"attempts" | "registrations">("attempts");
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LevelUpDeleteTarget | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionNotification, setActionNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const openDeleteModal = (target: LevelUpDeleteTarget) => {
    setDeleteTarget(target);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (target: LevelUpDeleteTarget) => {
    const res = await fetch("/api/levelup/admin/attempts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: target.id, type: target.type }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to delete entry.");
    }

    setActionNotification({
      type: "success",
      message: data.message || `Entry for ${target.studentName} deleted successfully.`,
    });

    setTimeout(() => {
      setActionNotification(null);
    }, 4000);

    await fetchData();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch("/api/levelup/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Invalid username or password");
        setIsLoggingIn(false);
        return;
      }

      setIsAuthenticated(true);
      fetchData();
    } catch {
      setLoginError("Login failed. Check server connectivity.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/levelup/admin/attempts");
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      setAttempts(data.attempts || []);
      setRegistrations(data.registrations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const exportToCSV = () => {
    const rows =
      activeTab === "attempts"
        ? attempts.map((a) => {
            const start = formatDateTime(a.startedAt);
            const sub = formatDateTime(a.submittedAt);
            return [
              a.id,
              a.studentName,
              a.email || "",
              a.studentPhone || "",
              a.schoolName || "",
              a.country,
              a.emirateCity,
              a.classLevel,
              a.curriculum,
              a.status,
              a.scoreObtained,
              a.totalMarks,
              `${a.percentage}%`,
              start.full,
              sub.full !== "—" ? sub.full : "",
            ];
          })
        : registrations.map((r) => {
            const regDt = formatDateTime(r.createdAt);
            return [
              r.id,
              r.studentName,
              r.email || "",
              r.phone,
              r.schoolName || "",
              r.country,
              r.emirateCity,
              r.classLevel,
              r.curriculum,
              r.status,
              r.attemptId || "Not started",
              regDt.full,
            ];
          });

    const headers =
      activeTab === "attempts"
        ? [
            "Attempt ID",
            "Student Name",
            "Email",
            "Phone",
            "School",
            "Country",
            "City",
            "Class",
            "Curriculum",
            "Status",
            "Score",
            "Total",
            "Percentage",
            "Started At",
            "Submitted At",
          ]
        : [
            "Registration ID",
            "Student Name",
            "Email",
            "Phone",
            "School",
            "Country",
            "City",
            "Class",
            "Curriculum",
            "Status",
            "Attempt ID",
            "Registered At",
          ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `levelup_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAttempts = attempts.filter((a) =>
    `${a.studentName} ${a.email || ""} ${a.studentPhone} ${a.schoolName} ${a.country} ${a.emirateCity} ${a.classLevel}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const filteredRegistrations = registrations.filter((r) =>
    `${r.studentName} ${r.email || ""} ${r.phone} ${r.schoolName} ${r.country} ${r.emirateCity} ${r.classLevel}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center p-4">
        <div className="bg-[#121722] border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">LevelUp GCC Admin Login</h2>
            <p className="text-xs text-slate-400 mt-1">Dedicated Middle East portal administration</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Admin Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@LevelUp"
                className="w-full bg-[#181F2E] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181F2E] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {loginError && (
              <p className="text-xs text-rose-400 font-medium bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? "Verifying..." : "Access Control Center"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#10141E] px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/levelup"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                LevelUp GCC Admin Center
                <span className="text-xs font-normal px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  smartup_online DB
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Tracking registrations & exam attempts across UAE, Saudi, Qatar, Oman, Kuwait, and Bahrain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export {activeTab === "attempts" ? "Attempts" : "Registrations"} CSV</span>
            </button>

            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-1">
        {/* Toast / Notification Banner */}
        {actionNotification && (
          <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-xs font-semibold text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionNotification.message}</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#121722] border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400 font-semibold uppercase">Total GCC Registrations</span>
            <div className="text-3xl font-black text-white mt-1">{registrations.length}</div>
          </div>
          <div className="bg-[#121722] border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400 font-semibold uppercase">Exams Submitted</span>
            <div className="text-3xl font-black text-emerald-400 mt-1">
              {attempts.filter((a) => a.status === "submitted" || a.status === "auto_submitted").length}
            </div>
          </div>
          <div className="bg-[#121722] border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400 font-semibold uppercase">Tests In Progress</span>
            <div className="text-3xl font-black text-amber-400 mt-1">
              {attempts.filter((a) => a.status === "in_progress").length}
            </div>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 p-1 bg-[#121722] border border-slate-800 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("attempts")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "attempts"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Exam Attempts ({attempts.length})
            </button>
            <button
              onClick={() => setActiveTab("registrations")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "registrations"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Registered Students ({registrations.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate, city, phone..."
              className="w-full bg-[#121722] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="bg-[#121722] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            {activeTab === "attempts" ? (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#181F2E] border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Country & City</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Attempted At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Percentage</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAttempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-800/30 transition-all">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{att.studentName}</div>
                        {att.email && <div className="text-[11px] text-emerald-400 font-mono">{att.email}</div>}
                        <div className="text-[11px] text-slate-500">{att.studentPhone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div>{att.country}</div>
                        <div className="text-[11px] text-slate-500">{att.emirateCity}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div>{att.classLevel}</div>
                        <div className="text-[11px] text-slate-500">{att.curriculum}</div>
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const started = formatDateTime(att.startedAt);
                          const submitted = formatDateTime(att.submittedAt);
                          const isSubmitted = att.status === "submitted" || att.status === "auto_submitted";

                          return (
                            <div>
                              <div className="font-medium text-white">
                                {isSubmitted && submitted.date !== "—" ? submitted.date : started.date}
                              </div>
                              {isSubmitted ? (
                                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>{submitted.time !== "—" ? submitted.time : started.time}</span>
                                  {started.time !== "—" && submitted.time !== "—" && started.time !== submitted.time && (
                                    <span className="text-slate-500 text-[10px]" title={`Started: ${started.time}`}>
                                      ({started.time} start)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[11px] text-amber-400 font-mono flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Started {started.time}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            att.status === "submitted" || att.status === "auto_submitted"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {att.scoreObtained} / {att.totalMarks}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">{att.percentage}%</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`/levelup/result/${att.id}`}
                            target="_blank"
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-all inline-block"
                          >
                            Scorecard
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              openDeleteModal({
                                id: att.id,
                                type: "attempt",
                                studentName: att.studentName,
                                phone: att.studentPhone,
                                classLevel: `Class ${att.classLevel} (${att.curriculum})`,
                                countryCity: `${att.emirateCity ? att.emirateCity + ", " : ""}${att.country}`,
                                details: `Score: ${att.scoreObtained}/${att.totalMarks} (${att.percentage}%)`,
                              })
                            }
                            title="Delete this student's exam attempt"
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAttempts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No exam attempts recorded yet in smartup_online database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#181F2E] border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Candidate Name</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">School</th>
                    <th className="py-3 px-4">Country & City</th>
                    <th className="py-3 px-4">Class / Syllabus</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered On</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-800/30 transition-all">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{reg.studentName}</div>
                        {reg.email && <div className="text-[11px] text-emerald-400 font-mono">{reg.email}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{reg.phone}</td>
                      <td className="py-3 px-4 text-slate-400">{reg.schoolName || "—"}</td>
                      <td className="py-3 px-4">
                        <div>{reg.country}</div>
                        <div className="text-[11px] text-slate-500">{reg.emirateCity}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div>{reg.classLevel}</div>
                        <div className="text-[11px] text-slate-500">{reg.curriculum}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {reg.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const regDt = formatDateTime(reg.createdAt);
                          return (
                            <div>
                              <div className="font-medium text-white">{regDt.date}</div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{regDt.time}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            openDeleteModal({
                              id: reg.id,
                              type: "registration",
                              studentName: reg.studentName,
                              phone: reg.phone,
                              classLevel: `${reg.classLevel} (${reg.curriculum})`,
                              countryCity: `${reg.emirateCity ? reg.emirateCity + ", " : ""}${reg.country}`,
                              details: reg.schoolName ? `School: ${reg.schoolName}` : undefined,
                            })
                          }
                          title="Delete this registration record"
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRegistrations.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No registrations recorded yet in smartup_online database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <LevelUpDeleteModal
        isOpen={isDeleteModalOpen}
        target={deleteTarget}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
