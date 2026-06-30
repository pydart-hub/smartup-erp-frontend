"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookOpen, User, GraduationCap, Play, AlertCircle, ArrowLeft, MapPin, Phone } from "lucide-react";

type ActiveExam = {
  publishingId: string;
  slug: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
};

export default function ExamSiteLandingPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentBranch, setStudentBranch] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [exams, setExams] = useState<ActiveExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingExams, setFetchingExams] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available exams when class level changes
  useEffect(() => {
    if (!classLevel) {
      setExams([]);
      setSelectedExamId("");
      return;
    }

    const fetchActiveExams = async () => {
      setFetchingExams(true);
      setError(null);
      try {
        const res = await fetch(`/api/public-exam/active?classLevel=${classLevel}`);
        const data = await res.json();
        if (res.ok) {
          setExams(data.exams || []);
          if (data.exams?.length > 0) {
            setSelectedExamId(data.exams[0].publishingId);
          } else {
            setSelectedExamId("");
          }
        } else {
          setError(data.error || "Failed to load exams");
        }
      } catch (err) {
        console.error(err);
        setError("Network error fetching exams");
      } finally {
        setFetchingExams(false);
      }
    };

    fetchActiveExams();
  }, [classLevel]);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!studentBranch) {
      setError("Please select your branch");
      return;
    }
    if (!studentPhone.trim()) {
      setError("Please enter your phone number");
      return;
    }
    if (!classLevel) {
      setError("Please select your class");
      return;
    }
    if (!selectedExamId) {
      setError("No active exam selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/public-exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          studentBranch,
          studentPhone,
          classLevel,
          publishingId: selectedExamId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Save session token in session storage for fallback auth
        sessionStorage.setItem(`exam_token_${data.attemptId}`, data.sessionToken);
        router.push(`/exam-site/attempt/${data.attemptId}`);
      } else {
        setError(data.error || "Failed to start the exam");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to establish server connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/smartup-logo-v2.png"
            alt="SmartUp Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <span className="text-xl font-bold tracking-wider text-white">SMARTUP</span>
        </div>
        <button
          onClick={() => router.push("/auth/login")}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-emerald-400 text-sm font-semibold mb-3">
              <BookOpen className="w-4 h-4" />
              Diagnosis Portal
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Begin Your Diagnosis
            </h1>
            <p className="mt-2 text-slate-400 text-sm sm:text-base">
              Enter your credentials to access the standalone assessment.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-3xl p-6 sm:p-10 shadow-2xl transition-all duration-300">
            <form onSubmit={handleStartExam} className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Student Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              {/* Branch Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Select Your Branch
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <select
                    required
                    value={studentBranch}
                    onChange={(e) => setStudentBranch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 text-sm appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select your branch</option>
                    <option value="SmartUp KADAVANTHARA">SmartUp KADAVANTHARA</option>
                    <option value="SmartUp Edappally">SmartUp Edappally</option>
                    <option value="SmartUp VENNALA">SmartUp VENNALA</option>
                    <option value="SmartUp ERAVELI">SmartUp ERAVELI</option>
                    <option value="SmartUp FORTKOCHI">SmartUp FORTKOCHI</option>
                    <option value="SmartUp CHULLIKAL">SmartUp CHULLIKAL</option>
                    <option value="SmartUp PALLURUTHY">SmartUp PALLURUTHY</option>
                    <option value="SmartUp THOPPUMPADY">SmartUp THOPPUMPADY</option>
                    <option value="SmartUp MOOLAMKUZHI">SmartUp MOOLAMKUZHI</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-500" />
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              {/* Class Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Select Your Class
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <select
                    required
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 text-sm appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select your class</option>
                    <option value="8">Class 8</option>
                    <option value="9">Class 9</option>
                    <option value="10">Class 10</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-500" />
                </div>
              </div>

              {/* Subject Selection */}
              {classLevel && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Available Subject Exams
                  </label>
                  {fetchingExams ? (
                    <div className="text-center py-4 text-xs text-slate-500">Checking active exams...</div>
                  ) : exams.length === 0 ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-400 text-xs">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>No active diagnosis exams published for Class {classLevel} right now.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 max-h-[160px] overflow-y-auto pr-1">
                      {exams.map((exam) => {
                        const isSelected = selectedExamId === exam.publishingId;
                        return (
                          <button
                            key={exam.publishingId}
                            type="button"
                            onClick={() => setSelectedExamId(exam.publishingId)}
                            className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                              isSelected
                                ? "bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                                : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider">{exam.subjectName}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {exam.totalQuestions} Questions • {exam.durationMinutes} Mins
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? "border-emerald-500" : "border-slate-700"
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Error Box */}
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 text-rose-400 text-xs animate-shake">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !selectedExamId || fetchingExams}
                className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.3)] disabled:shadow-none hover:translate-y-[-1px] active:translate-y-[1px] disabled:translate-y-0 disabled:text-slate-500 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Diagnosis Exam</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-500">
        © 2026 SmartUp Learning Ventures. All Rights Reserved.
      </footer>
    </div>
  );
}
