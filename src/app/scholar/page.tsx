"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Trophy,
  User,
  ArrowRight,
  ShieldCheck,
  Clock,
  HelpCircle,
  ChevronDown,
  FileCheck2,
  Check,
  Flame,
  Compass,
} from "lucide-react";

// Official SmartUp Color Palette:
// Primary Brand Purple: #673AB7 (Hover: #512DA8, Soft: #EDE7F6)
// Secondary Accent Green: #82C35B (Hover: #6FAF48, Soft: #EFF8E8)

const KERALA_DISTRICTS = [
  "Ernakulam",
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
];

const CLASSES = [
  { id: "Class 8", label: "Class 8", syllabus: "Mathematics, Physics & Chemistry fundamentals, Logical Reasoning", examDuration: "45 Mins", questions: 30 },
  { id: "Class 9", label: "Class 9", syllabus: "Science (Physics, Chem, Bio), Core Maths & Mental Ability", examDuration: "45 Mins", questions: 30 },
  { id: "Class 10", label: "Class 10", syllabus: "Target Board Mathematics, Physical Sciences & Analytical Aptitude", examDuration: "45 Mins", questions: 35 },
  { id: "Plus One (+1)", label: "+1 (Plus One)", syllabus: "Selected Stream Fundamentals (Physics/Chemistry/Maths/Commerce Basics)", examDuration: "60 Mins", questions: 40 },
  { id: "Plus Two (+2)", label: "+2 (Plus Two)", syllabus: "Entrance / Board Oriented Concepts & Subject Mastery Check", examDuration: "60 Mins", questions: 40 },
];

const SCHOLARSHIP_TIERS = [
  {
    tier: "Super 30 Diamond",
    percent: "100%",
    criteria: "Top 5% Performers",
    tag: "Full Scholarship",
    badgeColor: "bg-[#EDE7F6] text-[#673AB7] border-[#673AB7]/30",
    description: "Complete 100% tuition fee waiver across all academic batches for the full academic year.",
    perks: ["100% Free Tuition Fee", "1-on-1 Senior Mentor Access", "Free Premium Study Materials", "SmartUp Diamond Certificate"],
  },
  {
    tier: "Merit Gold",
    percent: "50%",
    criteria: "Top 15% Performers",
    tag: "High Merit",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-300",
    description: "Substantial 50% waiver on tuition fees with priority batch allocation and doubt clearance sessions.",
    perks: ["50% Tuition Fee Waiver", "Priority Academic Mentorship", "Curated Practice Workbooks", "Honor Merit Certificate"],
  },
  {
    tier: "Scholar Silver",
    percent: "25%",
    criteria: "Top 35% Performers",
    tag: "Merit Recognition",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    description: "A 25% scholarship waiver to encourage ambitious students striving for academic excellence.",
    perks: ["25% Tuition Fee Discount", "Subject Mastery Roadmaps", "Exam Strategy Session", "Official Scholarship Voucher"],
  },
  {
    tier: "Participation Star",
    percent: "Free",
    criteria: "All Test Takers",
    tag: "Guaranteed Benefit",
    badgeColor: "bg-[#EFF8E8] text-[#4E8F27] border-[#82C35B]/30",
    description: "Every student who attempts the test receives personalized computerized diagnosis & verified voucher.",
    perks: ["In-depth Strengths & Weakness Report", "Free 1-on-1 Academic Counseling", "Guaranteed Fee Benefit Voucher", "Verified Digital Certificate"],
  },
];

const FAQS = [
  {
    q: "Is there any registration fee for the scholarship exam?",
    a: "No, the SmartUp Scholarship Exam registration is 100% free for all students from Classes 8 to Plus Two.",
  },
  {
    q: "How and when will the exam be conducted?",
    a: "The exam can be taken online directly on this portal or at your nearest SmartUp center. Once registered, your test instructions and slot details are provided immediately.",
  },
  {
    q: "How will the results and scholarship waivers be awarded?",
    a: "Results are computerized and evaluated immediately. Your official scholarship waiver voucher and rank certificate will be available on your screen and dispatched via SMS/WhatsApp.",
  },
  {
    q: "Can I choose my preferred SmartUp branch?",
    a: "Yes! Qualified candidates can redeem their scholarship waiver voucher at any of the 9+ SmartUp branches across Kerala (Kadavanthara, Edappally, Vennala, etc.).",
  },
];

export default function ScholarRegistrationPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedClass, setSelectedClass] = useState("Class 10");
  const [district, setDistrict] = useState("Ernakulam");
  const [school, setSchool] = useState("");
  const [agree, setAgree] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Interactive UI States
  const [activeTierIndex, setActiveTierIndex] = useState(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const currentClassInfo = CLASSES.find((c) => c.id === selectedClass) || CLASSES[2];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || phone.replace(/\D/g, "").length < 10) {
      alert("Please enter a valid student name and 10-digit mobile number.");
      return;
    }
    if (!agree) {
      alert("Please agree to receive exam updates.");
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-800 flex flex-col justify-between selection:bg-[#673AB7] selection:text-white relative overflow-hidden font-sans">
      {/* Subtle Dynamic Ambient Lighting in Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] bg-[#673AB7]/6 rounded-full blur-[140px]" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-[#82C35B]/8 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[25%] w-[600px] h-[600px] bg-[#EDE7F6]/60 rounded-full blur-[180px]" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/smartup-logo-v2.png"
              alt="SmartUp"
              width={42}
              height={42}
              priority
              className="object-contain"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-wider text-slate-900 uppercase leading-none">
                  SMART UP
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#82C35B]" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#673AB7] tracking-widest uppercase mt-0.5">
                Scholarship Exam Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF8E8] text-[#4E8F27] border border-[#82C35B]/30">
              <span className="w-2 h-2 rounded-full bg-[#82C35B] animate-pulse" />
              Batch 2026-27
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE7F6] text-[#673AB7] border border-[#673AB7]/20">
              <Flame className="w-3.5 h-3.5 text-[#673AB7]" />
              <span className="font-bold">100% Waiver Available</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero & Registration Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full flex-1 flex flex-col justify-center">
        {/* Main Grid: Info + Form */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Branding, Value Props & Fast Highlights */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EDE7F6] text-[#673AB7] text-xs font-bold tracking-wide border border-[#673AB7]/20">
              <Sparkles className="w-4 h-4 text-[#673AB7]" />
              <span>SmartUp Talent & Scholarship Search 2026</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.18]">
              Register for SmartUp{" "}
              <span className="text-[#673AB7]">Scholarship Exam</span> & Win Up To{" "}
              <span className="text-[#82C35B] underline decoration-[#82C35B]/40 decoration-wavy">
                100% Fee Waiver
              </span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Book your official academic evaluation slot. Get instant performance analytics, national percentile benchmarking, and certified fee waiver vouchers redeemable across all SmartUp centers.
            </p>

            {/* Quick Interactive Exam Overview Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-3 text-center shadow-xs">
                <Clock className="w-4 h-4 mx-auto text-[#673AB7] mb-1" />
                <div className="text-[11px] text-slate-500 font-medium">Duration</div>
                <div className="text-xs font-bold text-slate-900">{currentClassInfo.examDuration}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-3 text-center shadow-xs">
                <FileCheck2 className="w-4 h-4 mx-auto text-[#82C35B] mb-1" />
                <div className="text-[11px] text-slate-500 font-medium">Format</div>
                <div className="text-xs font-bold text-slate-900">{currentClassInfo.questions} MCQs</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-3 text-center shadow-xs">
                <Award className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                <div className="text-[11px] text-slate-500 font-medium">Max Waiver</div>
                <div className="text-xs font-bold text-[#673AB7]">100% Fee</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-3 text-center shadow-xs">
                <Compass className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                <div className="text-[11px] text-slate-500 font-medium">Mode</div>
                <div className="text-xs font-bold text-slate-900">Online / Center</div>
              </div>
            </div>

            {/* Dynamic Class Blueprint Alert */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#EDE7F6] text-[#673AB7] shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Tested Syllabus for {selectedClass}:</span>
                  <span className="text-[10px] bg-[#EFF8E8] text-[#4E8F27] font-semibold px-2 py-0.5 rounded-md">Live Preview</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {currentClassInfo.syllabus}
                </p>
              </div>
            </div>

            {/* Live Counter Social Proof */}
            <div className="flex items-center gap-3 pt-1 text-xs text-slate-500">
              <div className="flex -space-x-2 overflow-hidden">
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#673AB7] text-white flex items-center justify-center font-bold text-[10px]">A</div>
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#82C35B] text-white flex items-center justify-center font-bold text-[10px]">S</div>
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">R</div>
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-indigo-500 text-white flex items-center justify-center font-bold text-[10px]">M</div>
              </div>
              <div className="font-medium">
                <strong className="text-slate-800">4,800+ Students</strong> evaluated this academic year
              </div>
            </div>
          </div>

          {/* Right Column: Clean White Detail Entry Card */}
          <div className="lg:col-span-6 flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-lg bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 space-y-5 relative"
            >
              {/* Header inside form */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#EDE7F6] text-[#673AB7]">
                    <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      Reserve Exam Slot
                    </h2>
                    <p className="text-xs text-slate-500">
                      Step 1 of 2 • Free Candidate Registration
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-[#4E8F27] bg-[#EFF8E8] border border-[#82C35B]/30 px-2.5 py-1 rounded-full">
                  100% Free
                </span>
              </div>

              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-6 text-center space-y-5"
                >
                  <div className="w-16 h-16 rounded-full bg-[#EFF8E8] text-[#4E8F27] flex items-center justify-center mx-auto border border-[#82C35B]/30 shadow-xs">
                    <Trophy className="w-8 h-8" />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4E8F27] bg-[#EFF8E8] px-3 py-1 rounded-full">
                      Slot Reserved Successfully
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 pt-1">
                      Welcome, {name}!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto">
                      Your registration for <strong className="text-slate-800">{selectedClass}</strong> has been logged in the SmartUp candidate register.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs text-slate-700 space-y-2 text-left">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">Candidate Name:</span>
                      <span className="font-bold text-slate-900">{name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">Target Grade:</span>
                      <span className="font-bold text-[#673AB7]">{selectedClass}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">Contact Number:</span>
                      <span className="font-mono font-medium">+91 {phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">District:</span>
                      <span className="font-medium text-slate-900">{district}</span>
                    </div>
                    {school && (
                      <div className="flex justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">School:</span>
                        <span className="font-medium text-slate-900 truncate max-w-[200px]">{school}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div className="p-3 rounded-xl bg-[#EDE7F6]/60 border border-[#673AB7]/20 text-xs text-[#673AB7] text-left flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#673AB7] mt-0.5" />
                      <span>An SMS & WhatsApp confirmation with your test credentials will be dispatched to <strong>+91 {phone}</strong>.</span>
                    </div>

                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-xs font-bold text-slate-500 hover:text-[#673AB7] hover:underline cursor-pointer transition pt-1"
                    >
                      ← Register another student
                    </button>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Student Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Student Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Nair"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Class Selection Buttons (Interactive Pills) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Select Class / Grade <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-[#673AB7] font-semibold">{currentClassInfo.examDuration}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {CLASSES.map((c) => {
                        const isSelected = selectedClass === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedClass(c.id)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-[#673AB7] text-white border-[#673AB7] shadow-sm scale-[1.02]"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Phone & District */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Mobile Number */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 text-xs font-bold bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-600">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="10-digit number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                          className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-r-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* District */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        District <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs cursor-pointer"
                      >
                        {KERALA_DISTRICTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* School Name (Optional) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      School Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. St. Albert's Higher Secondary School"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs"
                    />
                  </div>

                  {/* Consent Checkbox */}
                  <div className="flex items-start gap-2.5 pt-0.5">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#673AB7] focus:ring-[#673AB7] transition cursor-pointer"
                    />
                    <label htmlFor="consent" className="text-[11px] text-slate-500 leading-snug cursor-pointer select-none">
                      I agree to the exam guidelines and consent to receive exam schedule & scholarship notifications from SmartUp.
                    </label>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 font-bold text-sm text-white bg-[#673AB7] hover:bg-[#512DA8] active:bg-[#4527A0] rounded-xl transition-all shadow-md shadow-[#673AB7]/25 flex items-center justify-center gap-2 cursor-pointer mt-1 group"
                  >
                    <span>Proceed to Scholarship Exam</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#82C35B]" />
                    <span>Free registration • Official SmartUp Academic Evaluation</span>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </div>

        {/* Interactive Content Block 1: Scholarship Tiers & Slab Explorer */}
        <section className="mt-16 sm:mt-24 pt-10 border-t border-slate-200/80">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#673AB7] bg-[#EDE7F6] px-3 py-1 rounded-full">
              Scholarship Matrix
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Transparent Fee Waiver Slabs
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Click through the slabs below to explore performance criteria and associated academic privileges.
            </p>
          </div>

          {/* Interactive Tier Tabs */}
          <div className="flex justify-center flex-wrap gap-2 mb-6">
            {SCHOLARSHIP_TIERS.map((tier, idx) => {
              const isActive = activeTierIndex === idx;
              return (
                <button
                  key={tier.tier}
                  onClick={() => setActiveTierIndex(idx)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                    isActive
                      ? "bg-[#673AB7] text-white border-[#673AB7] shadow-md shadow-[#673AB7]/20 scale-105"
                      : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/90"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? "bg-[#82C35B]" : "bg-slate-300"}`} />
                  <span>{tier.percent} Waiver</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {tier.criteria}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Slab Card View */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTierIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${SCHOLARSHIP_TIERS[activeTierIndex].badgeColor}`}>
                      {SCHOLARSHIP_TIERS[activeTierIndex].tag}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Criteria: {SCHOLARSHIP_TIERS[activeTierIndex].criteria}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                    {SCHOLARSHIP_TIERS[activeTierIndex].tier}
                  </h3>
                </div>

                <div className="flex items-baseline gap-1 bg-[#EFF8E8] border border-[#82C35B]/30 px-4 py-2 rounded-2xl">
                  <span className="text-3xl font-black text-[#4E8F27]">
                    {SCHOLARSHIP_TIERS[activeTierIndex].percent}
                  </span>
                  <span className="text-xs font-bold text-[#4E8F27]">Waiver</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 my-4 leading-relaxed">
                {SCHOLARSHIP_TIERS[activeTierIndex].description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {SCHOLARSHIP_TIERS[activeTierIndex].perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-slate-700 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <div className="w-5 h-5 rounded-full bg-[#EFF8E8] text-[#4E8F27] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="font-medium">{perk}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Interactive Content Block 2: Frequently Asked Questions */}
        <section className="mt-16 sm:mt-20 max-w-3xl mx-auto w-full">
          <div className="text-center space-y-1.5 mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#673AB7] bg-[#EDE7F6] px-3 py-1 rounded-full">
              Common Inquiries
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 text-[#673AB7] shrink-0" />
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                        isOpen ? "rotate-180 text-[#673AB7]" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 mt-16">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SmartUp Learning Ventures © {new Date().getFullYear()} • All rights reserved</span>
          <div className="flex items-center gap-4 text-slate-400 font-mono">
            <span>Official Scholarship Examination Portal</span>
            <span>•</span>
            <span>scholar.smartuplearning.net</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
