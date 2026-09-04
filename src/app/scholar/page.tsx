"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  HelpCircle,
  MapPin,
  Phone,
  School,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Zap,
} from "lucide-react";

const SCHOLARSHIP_TIERS = [
  {
    tier: "Diamond Scholar",
    percentage: "100%",
    criteria: "Top 5% Performers (Score 90%+)",
    badge: "100% Fee Waiver",
    glow: "from-amber-400/20 via-purple-500/20 to-indigo-500/20",
    border: "border-amber-400/50",
    textColor: "text-amber-400",
  },
  {
    tier: "Gold Scholar",
    percentage: "75%",
    criteria: "Score 80% – 89%",
    badge: "75% Scholarship",
    glow: "from-purple-500/20 to-blue-500/20",
    border: "border-purple-400/40",
    textColor: "text-purple-400",
  },
  {
    tier: "Silver Scholar",
    percentage: "50%",
    criteria: "Score 70% – 79%",
    badge: "50% Scholarship",
    glow: "from-blue-500/20 to-teal-500/20",
    border: "border-blue-400/40",
    textColor: "text-blue-400",
  },
  {
    tier: "Bronze Scholar",
    percentage: "25%",
    criteria: "Score 55% – 69%",
    badge: "25% Scholarship",
    glow: "from-teal-500/20 to-emerald-500/20",
    border: "border-teal-400/40",
    textColor: "text-teal-400",
  },
];

const ELIGIBLE_CLASSES = [
  {
    level: "Class 8",
    curriculum: "Science & Maths Foundation",
    duration: "45 Mins",
    marks: "60 Marks",
  },
  {
    level: "Class 9",
    curriculum: "Physics, Chemistry, Maths & Bio",
    duration: "45 Mins",
    marks: "60 Marks",
  },
  {
    level: "Class 10",
    curriculum: "Board Focus & Aptitude",
    duration: "45 Mins",
    marks: "60 Marks",
  },
  {
    level: "Plus One (+1)",
    curriculum: "Science (PCMB / PCMC)",
    duration: "60 Mins",
    marks: "80 Marks",
  },
  {
    level: "Plus Two (+2)",
    curriculum: "Entrance Foundation (NEET/JEE)",
    duration: "60 Mins",
    marks: "80 Marks",
  },
];

const BRANCHES = [
  "Smart Up Kadavanthara",
  "Smart Up Edappally",
  "Smart Up Vennala",
  "Smart Up Eraveli",
  "Smart Up Fortkochi",
  "Smart Up Chullickal",
  "Smart Up Palluruthy",
  "Smart Up Thopumpadi",
  "Smart Up Moolamkuzhi",
];

export default function ScholarDemoPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedClass, setSelectedClass] = useState("Class 10");
  const [school, setSchool] = useState("");
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || phone.replace(/\D/g, "").length < 10) {
      alert("Please provide a valid student name and 10-digit mobile number.");
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070913] text-slate-100">
      {/* Ambient background light gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-tr from-purple-600/20 via-indigo-600/25 to-pink-500/10 blur-[130px] opacity-70" />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] bg-blue-600/15 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-purple-900/20 blur-[150px] pointer-events-none" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070913]/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/smartup-logo-v2.png"
              alt="SmartUp"
              width={42}
              height={42}
              className="object-contain drop-shadow-md"
            />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-wider text-white uppercase leading-none">
                SMART UP
              </span>
              <span className="text-[11px] font-semibold text-purple-400 tracking-widest uppercase">
                Scholarship Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Registration Open for 2026
            </span>
            <a
              href="#register"
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              Register Now
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-24">
        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>SmartUp Talent & Scholarship Search 2026</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]"
          >
            Unlock Up To{" "}
            <span className="bg-gradient-to-r from-amber-300 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              100% Scholarship
            </span>{" "}
            On Your Tuition Fees
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal"
          >
            Empowering students of Classes 8, 9, 10, Plus One & Plus Two to achieve academic excellence.
            Take the online scholarship test and get certified rewards.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <a
              href="#register"
              className="flex items-center gap-2.5 px-7 py-4 text-base font-bold text-white bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:opacity-95 rounded-2xl transition-all shadow-xl shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-5 h-5 text-amber-300" />
              <span>Register for Exam</span>
              <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="#tiers"
              className="flex items-center gap-2 px-6 py-4 text-base font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all"
            >
              <span>View Scholarship Tiers</span>
            </a>
          </motion.div>

          {/* Highlights Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 border-t border-white/10 text-left">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="text-2xl font-black text-amber-400">100%</div>
              <div className="text-xs text-slate-400 font-medium">Max Fee Waiver</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="text-2xl font-black text-purple-400">Classes 8–12</div>
              <div className="text-xs text-slate-400 font-medium">CBSE & State Board</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="text-2xl font-black text-indigo-400">45 Mins</div>
              <div className="text-xs text-slate-400 font-medium">MCQ Online Format</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="text-2xl font-black text-emerald-400">Instant</div>
              <div className="text-xs text-slate-400 font-medium">Result & Certificate</div>
            </div>
          </div>
        </section>

        {/* Scholarship Tiers Section */}
        <section id="tiers" className="space-y-10 scroll-mt-28">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Scholarship Award Tiers
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Merit-based scholarships designed to reward top talent with substantial tuition fee waivers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SCHOLARSHIP_TIERS.map((tier, idx) => (
              <motion.div
                key={tier.tier}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`relative p-6 rounded-3xl bg-white/[0.02] border ${tier.border} backdrop-blur-xl flex flex-col justify-between space-y-6 hover:bg-white/[0.04] transition-all group`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {tier.tier}
                    </span>
                    <Award className={`w-5 h-5 ${tier.textColor}`} />
                  </div>
                  <div>
                    <div className={`text-4xl font-black ${tier.textColor}`}>
                      {tier.percentage}
                    </div>
                    <div className="text-xs font-semibold text-white/90 mt-1">
                      {tier.badge}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-white/5">
                    {tier.criteria}
                  </p>
                </div>

                <div className="pt-4 flex items-center gap-2 text-xs font-medium text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Valid for Academic Year 2026-27</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Classes Eligibility Section */}
        <section className="space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Eligible Classes & Exam Pattern
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Exams are tailored to the respective grade syllabus with objective MCQ questions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {ELIGIBLE_CLASSES.map((c) => (
              <div
                key={c.level}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-purple-500/40 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-white">{c.level}</span>
                  <GraduationCap className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-xs text-slate-300 font-medium">
                  {c.curriculum}
                </div>
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {c.duration}
                  </span>
                  <span>{c.marks}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Registration Form & Preview Section */}
        <section id="register" className="scroll-mt-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Form Details */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero Registration Fee • Free Online Attempt</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Register Candidate for Scholarship
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Fill in the student details to book a seat for the upcoming SmartUp Scholarship Exam.
                Our counsellors will coordinate the test timing and syllabus guide.
              </p>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Instant computerized test grading with comprehensive performance analytics</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Digital Scholarship Certificate redeemable at any SmartUp Learning branch</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Personalized 1-on-1 academic counseling with top faculty mentors</span>
                </div>
              </div>
            </div>

            {/* Right Column: The Interactive Registration Card */}
            <div className="lg:col-span-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-2xl relative">
                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-10 space-y-5"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-white">Registration Demo Confirmed!</h3>
                      <p className="text-sm text-slate-300 max-w-sm mx-auto">
                        Thank you, <span className="text-purple-300 font-bold">{name}</span>. Your seat for{" "}
                        <span className="text-purple-300 font-bold">{selectedClass}</span> has been logged.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-slate-300 space-y-1 text-left">
                      <div><strong className="text-white">Mobile:</strong> +91 {phone}</div>
                      <div><strong className="text-white">Preferred Branch:</strong> {branch}</div>
                      {school && <div><strong className="text-white">School:</strong> {school}</div>}
                    </div>

                    <div className="pt-3">
                      <button
                        onClick={() => setIsSubmitted(false)}
                        className="text-xs font-semibold text-purple-400 hover:text-purple-300 underline cursor-pointer"
                      >
                        Submit another candidate
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Student Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Menon"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                          Mobile Number *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            placeholder="10-digit number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                          Grade / Class *
                        </label>
                        <div className="relative">
                          <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 text-sm bg-[#121629] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition appearance-none"
                          >
                            {ELIGIBLE_CLASSES.map((c) => (
                              <option key={c.level} value={c.level}>
                                {c.level}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        School Name (Optional)
                      </label>
                      <div className="relative">
                        <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="e.g. Bhavan's Vidya Mandir"
                          value={school}
                          onChange={(e) => setSchool(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Preferred SmartUp Branch
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm bg-[#121629] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition appearance-none"
                        >
                          {BRANCHES.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-3 py-4 font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:opacity-95 rounded-xl transition shadow-lg shadow-purple-600/30 cursor-pointer"
                    >
                      Book Scholarship Exam Slot
                    </button>

                    <p className="text-[11px] text-center text-slate-500 pt-1">
                      By registering, you agree to receive exam guidelines & admission updates from SmartUp.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#05060d] py-10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">SmartUp Learning Ventures</span>
            <span>•</span>
            <span>All rights reserved © 2026</span>
          </div>
          <div>
            <span>Portal: </span>
            <span className="font-mono text-purple-400">scholar.smartuplearning.net</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
