"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  X,
  Search,
  Download,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  GraduationCap,
  Users,
  Award,
  BookOpen,
  Filter,
} from "lucide-react";

interface AttemptRecord {
  id: string;
  studentName: string;
  studentPhone: string | null;
  district: string;
  classLevel: string;
  syllabus: string;
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
  diagnosedLevel?: string | null;
}

interface RegistrationRecord {
  id: string;
  studentName: string;
  studentPhone: string;
  district: string;
  classLevel: string;
  syllabus: string;
  status: string;
  attemptId: string | null;
  createdAt: string;
}

interface ScholarAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScholarAdminModal({ isOpen, onClose }: ScholarAdminModalProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data state
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<"attempts" | "registrations">("attempts");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  // Check existing session on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem("scholar_admin_token");
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchData(savedToken);
    }
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/scholar/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      sessionStorage.setItem("scholar_admin_token", data.token);
      setToken(data.token);
      setIsAuthenticated(true);
      setPassword("");
      fetchData(data.token);
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("scholar_admin_token");
    setIsAuthenticated(false);
    setToken(null);
    setAttempts([]);
    setRegistrations([]);
    setUsername("");
    setPassword("");
  };

  const fetchData = async (authToken: string) => {
    setIsLoadingData(true);
    try {
      const res = await fetch("/api/scholar/admin/attempts", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const data = await res.json();
      if (data.success) {
        setAttempts(data.attempts || []);
        setRegistrations(data.registrations || []);
      }
    } catch (err) {
      console.error("Failed to load scholar data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Filtered lists
  const filteredAttempts = attempts.filter((item) => {
    const matchesSearch =
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.studentPhone && item.studentPhone.includes(searchQuery)) ||
      item.district.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && (item.status === "submitted" || item.status === "auto_submitted")) ||
      (statusFilter === "in_progress" && item.status === "in_progress");

    const matchesClass =
      classFilter === "all" || item.classLevel.toString().includes(classFilter.replace("Class ", "").trim());

    return matchesSearch && matchesStatus && matchesClass;
  });

  const exportCSV = () => {
    const rows = [
      [
        "Student Name",
        "Phone Number",
        "Class",
        "Syllabus",
        "District",
        "Status",
        "Score",
        "Total Marks",
        "Percentage",
        "Correct",
        "Wrong",
        "Unanswered",
        "Started At",
        "Submitted At",
      ],
      ...filteredAttempts.map((a) => [
        `"${a.studentName.replace(/"/g, '""')}"`,
        `"${a.studentPhone || ""}"`,
        `"Class ${a.classLevel}"`,
        `"${a.syllabus}"`,
        `"${a.district}"`,
        `"${a.status}"`,
        a.scoreObtained,
        a.totalMarks,
        `${a.percentage}%`,
        a.correctCount,
        a.wrongCount,
        a.unansweredCount,
        `"${new Date(a.startedAt).toLocaleString()}"`,
        a.submittedAt ? `"${new Date(a.submittedAt).toLocaleString()}"` : '"In Progress"',
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `scholar_exam_attendees_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className={`w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col ${
          isAuthenticated ? "max-w-6xl max-h-[92vh]" : "max-w-md"
        }`}
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#5C34A4] to-[#452084] p-5 sm:px-8 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {isAuthenticated ? "Scholarship Exam Control Center" : "Scholar Portal Admin Login"}
              </h2>
              <p className="text-xs text-white/80">
                {isAuthenticated
                  ? "Real-time student attempt logs & scores"
                  : "Authorized SmartUp Administrator Access"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View 1: Login Form */}
        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
            {loginError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin@SmartUp"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-4 rounded-xl bg-[#5C34A4] hover:bg-[#4d288d] text-white text-sm font-bold shadow-md shadow-[#5C34A4]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Access Exam Records</span>
              )}
            </button>
          </form>
        ) : (
          /* View 2: Full Data Explorer */
          <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Attended</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{attempts.length}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {attempts.filter((a) => a.status === "submitted" || a.status === "auto_submitted").length}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">In Progress</div>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {attempts.filter((a) => a.status === "in_progress").length}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registrations</div>
                <div className="text-2xl font-black text-violet-600 mt-1">{registrations.length}</div>
              </div>
            </div>

            {/* Filter & Action Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by student name, phone, or district..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                </select>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
                >
                  <option value="all">All Classes</option>
                  <option value="8">Class 8</option>
                  <option value="9">Class 9</option>
                  <option value="10">Class 10</option>
                  <option value="11">+1</option>
                  <option value="12">+2</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => token && fetchData(token)}
                  disabled={isLoadingData}
                  className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingData ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={exportCSV}
                  disabled={filteredAttempts.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl bg-white min-h-[300px]">
              {isLoadingData ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#5C34A4]" />
                  <span className="text-xs font-medium">Fetching exam attempts...</span>
                </div>
              ) : filteredAttempts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
                  <BookOpen className="w-8 h-8 text-slate-300" />
                  <span className="text-xs font-medium">No student exam attempts match your query.</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-200 text-slate-500 font-bold z-10">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class & Syllabus</th>
                      <th className="py-3 px-4">District</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Score / Total</th>
                      <th className="py-3 px-4 text-center">Performance</th>
                      <th className="py-3 px-4 text-center">Correct / Wrong</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredAttempts.map((item) => {
                      const isCompleted = item.status === "submitted" || item.status === "auto_submitted";
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.studentName}</div>
                            <div className="text-[11px] text-slate-400">{item.studentPhone || "No phone"}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">Class {item.classLevel}</div>
                            <div className="text-[10px] text-[#5C34A4] font-bold">{item.syllabus}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{item.district}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
                              }`}
                            >
                              {item.status === "in_progress" ? (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>In Progress</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Submitted</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-slate-900">{item.scoreObtained}</span>
                            <span className="text-slate-400"> / {item.totalMarks}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-black text-xs ${
                                item.percentage >= 75
                                  ? "text-emerald-600"
                                  : item.percentage >= 40
                                  ? "text-indigo-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {item.percentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-emerald-600 font-bold">{item.correctCount}</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="text-rose-500 font-bold">{item.wrongCount}</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="text-slate-400">{item.unansweredCount}</span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(item.startedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <a
                              href={`/scholar/result/${item.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5C34A4] hover:underline"
                            >
                              <span>View Result</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
