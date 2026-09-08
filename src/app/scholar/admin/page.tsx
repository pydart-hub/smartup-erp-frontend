"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Search,
  Download,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  GraduationCap,
  Users,
  BookOpen,
  ArrowLeft,
  Calendar,
  Phone,
  MapPin,
  FileSpreadsheet,
  BarChart3,
  Layers,
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

export default function ScholarAdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Login form state (empty values by default, clean placeholders)
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
  const [examScope, setExamScope] = useState<"scholarship" | "all">("scholarship");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  // Check existing session
  useEffect(() => {
    const savedToken = sessionStorage.getItem("scholar_admin_token");
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchData(savedToken, examScope);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/scholar/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please check credentials.");
      }

      sessionStorage.setItem("scholar_admin_token", data.token);
      setToken(data.token);
      setIsAuthenticated(true);
      setPassword("");
      fetchData(data.token, examScope);
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

  const fetchData = async (authToken: string, scope = examScope) => {
    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/scholar/admin/attempts?scope=${scope}`, {
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

  const handleScopeChange = (newScope: "scholarship" | "all") => {
    setExamScope(newScope);
    if (token) {
      fetchData(token, newScope);
    }
  };

  // Filtered attempts
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

  // Filtered registrations
  const filteredRegistrations = registrations.filter((r) => {
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.studentPhone.includes(searchQuery) ||
      r.district.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass =
      classFilter === "all" || r.classLevel.toString().includes(classFilter.replace("Class ", "").trim());

    return matchesSearch && matchesClass;
  });

  const exportCSV = () => {
    const rows = [
      [
        "Student Name",
        "Phone Number",
        "Class",
        "Syllabus",
        "District",
        "Exam Title",
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
        `"${a.examTitle.replace(/"/g, '""')}"`,
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
    link.setAttribute("download", `scholar_attendees_${examScope}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // VIEW 1: Full-Page Login
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center items-center p-4 sm:p-6">
        {/* Back to Scholar Public Page */}
        <div className="w-full max-w-md mb-4 flex justify-between items-center">
          <button
            onClick={() => router.push("/scholar")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#5C34A4] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Scholarship Exam</span>
          </button>
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-purple-950/5 border border-slate-200/80 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-[#5C34A4] to-[#452084] p-7 text-white text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">SmartUp Control Center</h1>
            <p className="text-xs text-white/80 mt-1">Scholarship Exam Administration &amp; Logs</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-7 space-y-5">
            {loginError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Admin Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter administrator username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-[#5C34A4] hover:bg-[#4d288d] text-white text-sm font-bold shadow-lg shadow-[#5C34A4]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Access Control Center</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: Full-Page Dashboard
  // -------------------------------------------------------------
  const totalCompleted = attempts.filter((a) => a.status === "submitted" || a.status === "auto_submitted").length;
  const totalInProgress = attempts.filter((a) => a.status === "in_progress").length;

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-slate-800 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/scholar")}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Return to Public Exam Page"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#5C34A4] flex items-center justify-center text-white shadow-sm">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  Scholarship Exam Control Center
                </h1>
                <p className="text-[11px] text-slate-400 mt-1">
                  Candidate Registrations &amp; Live Test Attempts
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Exam Scope Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold">
              <button
                onClick={() => handleScopeChange("scholarship")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  examScope === "scholarship"
                    ? "bg-white text-[#5C34A4] shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Scholarship Exams
              </button>
              <button
                onClick={() => handleScopeChange("all")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  examScope === "all"
                    ? "bg-white text-[#5C34A4] shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Public Exams
              </button>
            </div>

            <button
              onClick={() => token && fetchData(token, examScope)}
              disabled={isLoadingData}
              className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? "animate-spin text-[#5C34A4]" : ""}`} />
            </button>

            <button
              onClick={exportCSV}
              disabled={filteredAttempts.length === 0}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200/60 rounded-xl transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col space-y-6">
        {/* Scope notification banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/80 border border-purple-200/70 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#5C34A4] text-white flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Viewing:{" "}
                <span className="text-[#5C34A4]">
                  {examScope === "scholarship"
                    ? "Dedicated Scholarship Exam 2026-27 Candidates"
                    : "All Online Diagnosis & Scholarship Exam Attempts"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                {examScope === "scholarship"
                  ? "Showing students taking the official SmartUp Scholarship Exam (Classes 8, 9, 10, +1 & +2)."
                  : "Showing all historical diagnosis and public exam attempts stored in the portal database."}
              </div>
            </div>
          </div>
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => handleScopeChange(examScope === "scholarship" ? "all" : "scholarship")}
              className="text-xs font-bold text-[#5C34A4] underline"
            >
              Switch to {examScope === "scholarship" ? "All Public Exams" : "Scholarship Only"}
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Attended</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2">{attempts.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Students who started test</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-emerald-600 mt-2">{totalCompleted}</div>
            <div className="text-[11px] text-slate-400 mt-1">Submitted &amp; scored</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-600 mt-2">{totalInProgress}</div>
            <div className="text-[11px] text-slate-400 mt-1">Currently taking exam</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-violet-600">
              <span className="text-xs font-bold uppercase tracking-wider">Slot Registrations</span>
              <BookOpen className="w-4 h-4 text-violet-500" />
            </div>
            <div className="text-3xl font-black text-violet-600 mt-2">{registrations.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Landing page signups</div>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab("attempts")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "attempts"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Exam Attempts ({filteredAttempts.length})
              </button>
              <button
                onClick={() => setActiveTab("registrations")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "registrations"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Raw Registrations ({filteredRegistrations.length})
              </button>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student, phone, or district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20"
                />
              </div>

              {activeTab === "attempts" && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                </select>
              )}

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
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex-1 flex flex-col">
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center h-80 text-slate-400 gap-2">
              <RefreshCw className="w-7 h-7 animate-spin text-[#5C34A4]" />
              <span className="text-xs font-medium">Fetching candidate logs...</span>
            </div>
          ) : activeTab === "attempts" ? (
            /* Tab 1: Exam Attempts Table */
            filteredAttempts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-slate-400 gap-2">
                <BookOpen className="w-9 h-9 text-slate-300" />
                <span className="text-xs font-medium">No candidate attempts found for current filters.</span>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class &amp; Syllabus</th>
                      <th className="py-3 px-4">Exam Paper</th>
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
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{item.studentPhone || "No phone"}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">Class {item.classLevel}</div>
                            <div className="text-[10px] text-[#5C34A4] font-bold mt-0.5">{item.syllabus}</div>
                          </td>
                          <td className="py-3 px-4 max-w-[180px]">
                            <div className="font-medium text-slate-700 truncate" title={item.examTitle}>
                              {item.examTitle}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{item.district}</span>
                            </div>
                          </td>
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
                                  ? "text-blue-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {item.percentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold">
                            <span className="text-emerald-600">{item.correctCount}</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="text-rose-500">{item.wrongCount}</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="text-slate-400">{item.unansweredCount}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {new Date(item.startedAt).toLocaleString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <a
                              href={`/scholar/result/${item.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#5C34A4] hover:text-[#452084] font-bold text-[11px] bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors"
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
              </div>
            )
          ) : (
            /* Tab 2: Registrations Table */
            filteredRegistrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-slate-400 gap-2">
                <Users className="w-9 h-9 text-slate-300" />
                <span className="text-xs font-medium">No candidate registrations found for current filters.</span>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Syllabus</th>
                      <th className="py-3 px-4">District</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4 text-center">Attempt Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{reg.studentName}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{reg.studentPhone}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{reg.classLevel}</td>
                        <td className="py-3 px-4 font-bold text-[#5C34A4]">{reg.syllabus}</td>
                        <td className="py-3 px-4 text-slate-600">{reg.district}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(reg.createdAt).toLocaleString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {reg.attemptId ? (
                            <a
                              href={`/scholar/result/${reg.attemptId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#5C34A4] hover:text-[#452084] font-bold text-[11px] bg-purple-50 px-2 py-1 rounded-lg"
                            >
                              <span>View Attempt</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Registered Only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
