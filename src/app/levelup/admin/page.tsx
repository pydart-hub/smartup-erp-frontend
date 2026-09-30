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
} from "lucide-react";

interface AttemptRecord {
  id: string;
  studentName: string;
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
        ? attempts.map((a) => [
            a.id,
            a.studentName,
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
            a.startedAt,
            a.submittedAt || "",
          ])
        : registrations.map((r) => [
            r.id,
            r.studentName,
            r.phone,
            r.schoolName || "",
            r.country,
            r.emirateCity,
            r.classLevel,
            r.curriculum,
            r.status,
            r.attemptId || "Not started",
            r.createdAt,
          ]);

    const headers =
      activeTab === "attempts"
        ? [
            "Attempt ID",
            "Student Name",
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
    `${a.studentName} ${a.studentPhone} ${a.schoolName} ${a.country} ${a.emirateCity} ${a.classLevel}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const filteredRegistrations = registrations.filter((r) =>
    `${r.studentName} ${r.phone} ${r.schoolName} ${r.country} ${r.emirateCity} ${r.classLevel}`
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
                        <a
                          href={`/levelup/result/${att.id}`}
                          target="_blank"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-all inline-block"
                        >
                          Scorecard
                        </a>
                      </td>
                    </tr>
                  ))}
                  {filteredAttempts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-800/30 transition-all">
                      <td className="py-3 px-4 font-bold text-white">{reg.studentName}</td>
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
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredRegistrations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
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
    </div>
  );
}
