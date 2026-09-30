"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Trophy,
  User,
  School,
  Mail,
  ArrowRight,
  Lock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import CountryPhoneInput from "@/components/common/CountryPhoneInput";
import {
  COUNTRIES,
  CountryConfig,
  validatePhoneNumberStrict,
  formatE164,
} from "@/lib/constants/countries";

// GCC default is United Arab Emirates (+971)
const GCC_DEFAULT_COUNTRY: CountryConfig =
  COUNTRIES.find((c) => c.code === "AE") || COUNTRIES[0];

const CLASSES = [
  { id: "Class 8", label: "Class 8" },
  { id: "Class 9", label: "Class 9" },
  { id: "Class 10", label: "Class 10" },
  { id: "Plus One (+1)", label: "+1" },
  { id: "Plus Two (+2)", label: "+2" },
];

export default function LevelUpRegistrationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(GCC_DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [selectedClass, setSelectedClass] = useState("Class 10");
  const [syllabus, setSyllabus] = useState<"CBSE" | "State">("CBSE");
  const [district, setDistrict] = useState(GCC_DEFAULT_COUNTRY.regions[0] || "Dubai");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  // Returning Student Auto-Lookup State
  const [isExistingStudent, setIsExistingStudent] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [returningStudent, setReturningStudent] = useState<{
    name: string;
    email?: string;
    schoolName?: string;
    phone: string;
    classLevel: string;
    curriculum: string;
    country: string;
    emirateCity: string;
    registrationId: string;
    attemptId?: string | null;
  } | null>(null);

  // Check LocalStorage on initial load for returning student on same device
  useEffect(() => {
    try {
      const saved = localStorage.getItem("levelup_student");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) {
          fetch(`/api/levelup/check?phone=${encodeURIComponent(parsed.phone)}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.registered) {
                setReturningStudent({
                  name: data.studentName,
                  email: data.email || parsed.email || "",
                  schoolName: data.schoolName || parsed.schoolName || "",
                  phone: parsed.phone,
                  classLevel: data.classLevel,
                  curriculum: data.curriculum || "CBSE",
                  country: data.country || "UAE",
                  emirateCity: data.emirateCity || "Dubai",
                  registrationId: data.registrationId,
                  attemptId: data.attemptId,
                });
                setRegistrationId(data.registrationId);
                setName(data.studentName);
                if (data.email || parsed.email) {
                  setEmail(data.email || parsed.email);
                }
                if (data.schoolName || parsed.schoolName) {
                  setSchoolName(data.schoolName || parsed.schoolName);
                }
                setSelectedClass(data.classLevel);
                if (data.curriculum) {
                  setSyllabus(data.curriculum === "State" ? "State" : "CBSE");
                }
              }
            })
            .catch((err) => console.warn("Auto-lookup error:", err));
        }
      }
    } catch (e) {
      console.warn("Could not parse saved student details:", e);
    }
  }, []);

  // Live Phone Auto-Lookup when complete phone number is typed
  useEffect(() => {
    if (phone.length === selectedCountry.digitLength) {
      const validation = validatePhoneNumberStrict(phone, selectedCountry);
      if (validation.isValid) {
        const fullPhone = formatE164(selectedCountry.dialCode, phone);
        setIsCheckingPhone(true);
        fetch(`/api/levelup/check?phone=${encodeURIComponent(fullPhone)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.registered) {
              setName(data.studentName);
              if (data.email) {
                setEmail(data.email);
              }
              if (data.schoolName) {
                setSchoolName(data.schoolName);
              }
              setSelectedClass(data.classLevel);
              if (data.curriculum) {
                setSyllabus(data.curriculum === "State" ? "State" : "CBSE");
              }
              setRegistrationId(data.registrationId);
              setIsExistingStudent(true);
            } else {
              setIsExistingStudent(false);
            }
          })
          .catch((err) => console.warn("Live phone check error:", err))
          .finally(() => setIsCheckingPhone(false));
      }
    } else {
      setIsExistingStudent(false);
    }
  }, [phone, selectedCountry]);

  const handleCountryChange = (country: CountryConfig) => {
    setSelectedCountry(country);
    setPhone("");
    setDistrict(country.regions[0] || "");
    setIsExistingStudent(false);
  };

  const handleStartExam = async (regIdToUse?: string) => {
    const fullFormattedPhone = returningStudent
      ? returningStudent.phone
      : formatE164(selectedCountry.dialCode, phone);

    const activeRegId = regIdToUse || (returningStudent ? returningStudent.registrationId : registrationId);

    try {
      setIsStartingExam(true);
      const res = await fetch("/api/levelup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: returningStudent ? returningStudent.name : name.trim(),
          email: returningStudent?.email || email.trim(),
          schoolName: returningStudent?.schoolName || schoolName.trim(),
          phone: fullFormattedPhone,
          selectedClass: returningStudent ? returningStudent.classLevel : selectedClass,
          curriculum: returningStudent ? returningStudent.curriculum : syllabus,
          country: selectedCountry.name,
          emirateCity: district,
          registrationId: activeRegId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start LevelUp scholarship exam.");
      }

      if (data.sessionToken) {
        sessionStorage.setItem(`levelup_token_${data.attemptId}`, data.sessionToken);
      }

      window.location.href = `/levelup/exam/${data.attemptId}`;
    } catch (err: any) {
      alert(err.message || "Failed to start exam. Please try again.");
      setIsStartingExam(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter a valid student name.");
      return;
    }

    const validation = validatePhoneNumberStrict(phone, selectedCountry);
    if (!validation.isValid) {
      alert(validation.error || "Please enter a valid mobile number.");
      return;
    }

    const fullPhone = formatE164(selectedCountry.dialCode, phone);

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/levelup/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          schoolName: schoolName.trim(),
          phone: fullPhone,
          selectedClass,
          country: selectedCountry.name,
          emirateCity: district,
          curriculum: syllabus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register. Please check your details.");
      }

      setRegistrationId(data.registrationId);
      localStorage.setItem(
        "levelup_student",
        JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          schoolName: schoolName.trim(),
          phone: fullPhone,
          classLevel: selectedClass,
          curriculum: syllabus,
          country: selectedCountry.name,
          emirateCity: district,
        })
      );

      setIsSubmitted(true);
    } catch (err: any) {
      alert(err.message || "Failed to register. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFE] text-slate-800 flex flex-col justify-between selection:bg-[#5C34A4] selection:text-white font-sans relative overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="w-full bg-transparent py-5 px-6 sm:px-12 lg:px-20 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Title (Clickable link to admin portal) */}
          <a
            href="/levelup/admin"
            className="flex items-center gap-3.5 group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5C34A4] rounded-xl p-1 -m-1 transition-transform active:scale-95"
            title="LevelUp GCC Admin Center"
          >
            <div className="relative w-11 h-11 flex items-center justify-center shrink-0 group-hover:opacity-90 transition-opacity">
              <Image
                src="/smartup-logo-v2.png"
                alt="SmartUp LevelUp GCC"
                width={44}
                height={44}
                priority
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[19px] font-black tracking-tight text-slate-900 leading-none group-hover:text-[#5C34A4] transition-colors">
                SMART UP
              </span>
              <span className="text-[10px] font-bold text-slate-500 tracking-[0.18em] uppercase mt-1">
                Scholarship Exam
              </span>
            </div>
          </a>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-4 lg:py-6 w-full flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Headline, Subtitle & Poster Graphic */}
          <div className="lg:col-span-7 flex flex-col justify-center relative">
            {/* Background Soft Purple Circle Shapes */}
            <div className="absolute -left-16 -top-12 w-36 h-36 rounded-full bg-purple-100/60 pointer-events-none -z-10 blur-xl" />
            <div className="absolute -left-8 top-1/2 w-16 h-16 rounded-full bg-purple-200/40 pointer-events-none -z-10 blur-md" />

            {/* Tag / Eyebrow */}
            <div className="text-[11px] font-extrabold tracking-[0.22em] text-[#6C42B8] uppercase mb-3">
              SMARTUP SCHOLARSHIP EXAM
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black text-slate-900 tracking-tight leading-[1.08] mb-3">
              Make Parents <br />
              <span className="text-[#5C34A4]">Proud</span>
            </h1>

            {/* Subtitle */}
            <p className="text-[15px] sm:text-base text-slate-500 max-w-lg font-normal leading-relaxed mb-4">
              Take the <strong className="text-slate-800 font-semibold">SmartUp Scholarship Exam</strong> for Classes 8, 9, 10, +1 &amp; +2.
            </p>

            {/* Visual Hero Area: Poster Image with 3D Hover Tilt Effect */}
            <div className="relative w-full max-w-[560px] mx-auto lg:mx-0 flex justify-center items-center pt-4 pb-0 [perspective:1000px]">
              {/* Circular Soft Purple Glow Backdrop */}
              <div className="absolute w-80 h-80 sm:w-[420px] sm:h-[420px] rounded-full bg-[#EFEBFA]/80 -z-10" />
              <div className="absolute w-[460px] h-[460px] rounded-full bg-purple-100/30 -z-20 blur-3xl" />

              {/* 3D Hover Interactive Card Frame */}
              <motion.div
                whileHover={{
                  rotateY: -6,
                  rotateX: 6,
                  scale: 1.03,
                  y: -6,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative w-full max-w-[440px] aspect-square rounded-[32px] overflow-hidden shadow-2xl shadow-purple-950/20 border-4 border-white cursor-pointer transform-gpu"
                style={{ transformStyle: "preserve-3d" }}
              >
                <Image
                  src="/sclr.jpeg"
                  alt="SmartUp GCC Scholarship Level Up Exam"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 440px"
                />
                {/* Subtle Sheen Gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
              </motion.div>
            </div>
          </div>

          {/* Right Column: Register Now Form Card with 3D Hover Effect */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end [perspective:1000px]">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{
                rotateY: 4,
                rotateX: -3,
                scale: 1.015,
                y: -4,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="relative w-full max-w-[440px] bg-white rounded-[28px] p-7 sm:p-8 shadow-2xl shadow-purple-950/10 border border-slate-100 transform-gpu"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Floating 3D Graduation Cap Icon at top-right corner of card */}
              <div className="absolute -top-6 -right-2 sm:-right-4 w-20 h-20 sm:w-24 sm:h-24 pointer-events-none select-none z-20">
                <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 45L24 38L31 36L24 34L22 27L20 34L13 36L20 38L22 45Z" fill="#C4B5FD" opacity="0.8" />
                  <path d="M102 24L103.5 19L108 17.5L103.5 16L102 11L100.5 16L96 17.5L100.5 19L102 24Z" fill="#A78BFA" opacity="0.9" />
                  <circle cx="18" cy="58" r="2.5" fill="#DDD6FE" />
                  <circle cx="108" cy="38" r="2" fill="#C4B5FD" />
                  
                  <g filter="url(#capShadow)">
                    <path
                      d="M62 26L102 44L62 62L22 44L62 26Z"
                      fill="url(#capGradient)"
                    />
                    <path
                      d="M22 44L62 62L102 44L102 48L62 66L22 48Z"
                      fill="#5C34A4"
                    />
                    <path
                      d="M38 56C38 56 42 76 62 76C82 76 86 56 86 56L80 54C80 70 68 71 62 71C56 71 44 70 44 54L38 56Z"
                      fill="#4E2B8E"
                    />
                    <ellipse cx="62" cy="44" rx="4" ry="2.5" fill="#A78BFA" />
                    <path
                      d="M62 44C76 45 92 52 94 65L96 82C96 82 98 83 98 86C98 89 94 89 94 86L92 65"
                      stroke="#8B5CF6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="#8B5CF6"
                    />
                  </g>
                  <defs>
                    <linearGradient id="capGradient" x1="22" y1="26" x2="102" y2="62" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#9B78DC" />
                      <stop offset="0.5" stopColor="#7C50C7" />
                      <stop offset="1" stopColor="#673AB7" />
                    </linearGradient>
                    <filter id="capShadow" x="12" y="18" width="98" height="78" filterUnits="userSpaceOnUse">
                      <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#4C1D95" floodOpacity="0.25" />
                    </filter>
                  </defs>
                </svg>
              </div>

              {/* Form Title & Subtitle */}
              <div className="mb-5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Register Now
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-500 mt-1 font-medium">
                  Free Exam Slot Registration
                </p>
              </div>

              {/* Returning Student Auto-Detect Banner */}
              {returningStudent && !isSubmitted && (
                <div className="mb-5 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-purple-200/80 text-xs text-slate-800 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#5C34A4] font-extrabold text-sm">
                      <span className="text-base">👋</span>
                      <span>Welcome Back, {returningStudent.name}!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReturningStudent(null)}
                      className="text-[11px] text-[#5C34A4] hover:underline font-semibold"
                    >
                      New Student?
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    You registered previously for <strong>{returningStudent.classLevel}</strong>. You don't need to register again!
                  </p>
                  <button
                    type="button"
                    disabled={isStartingExam}
                    onClick={() => handleStartExam(returningStudent.registrationId)}
                    className="w-full py-2.5 px-4 font-bold text-xs text-white bg-[#5C34A4] hover:bg-[#4E2B8E] active:bg-[#43237E] disabled:opacity-70 rounded-xl transition-all shadow-md shadow-purple-900/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isStartingExam ? "Starting Scholarship Exam..." : "Start / Resume Exam Now"}</span>
                    {!isStartingExam && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {isSubmitted ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-purple-100 text-[#5C34A4] flex items-center justify-center mx-auto shadow-sm">
                    <Trophy className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900">Registration Complete!</h3>
                    <p className="text-xs text-slate-600">
                      Welcome, <strong className="text-[#5C34A4]">{name}</strong>. Your slot for{" "}
                      <strong className="text-slate-800">{selectedClass}</strong> has been logged.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 text-xs text-slate-700 space-y-2 text-left shadow-sm">
                    <div className="flex justify-between pb-1.5 border-b border-slate-200/50">
                      <span className="text-slate-500">Number:</span>
                      <span className="font-mono font-bold">{selectedCountry.dialCode} {phone}</span>
                    </div>
                    {email && (
                      <div className="flex justify-between pb-1.5 border-b border-slate-200/50">
                        <span className="text-slate-500">Email:</span>
                        <span className="font-medium text-slate-800 truncate max-w-[200px]">{email}</span>
                      </div>
                    )}
                    {schoolName && (
                      <div className="flex justify-between pb-1.5 border-b border-slate-200/50">
                        <span className="text-slate-500">School:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[200px]">{schoolName}</span>
                      </div>
                    )}
                    <div className="flex justify-between pb-1.5 border-b border-slate-200/50">
                      <span className="text-slate-500">Syllabus:</span>
                      <span className="font-bold text-[#5C34A4]">{syllabus === "State" ? "State Syllabus" : "CBSE Board"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Country & City:</span>
                      <span>{district}, {selectedCountry.name}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-[#5C34A4] text-left flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Your registration is saved in the LevelUp portal database.</span>
                  </div>

                  <button
                    type="button"
                    disabled={isStartingExam}
                    onClick={() => handleStartExam()}
                    className="w-full py-3.5 px-6 font-bold text-sm text-white bg-[#5C34A4] hover:bg-[#4E2B8E] active:bg-[#43237E] disabled:opacity-70 rounded-xl transition-all shadow-lg shadow-purple-900/25 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>{isStartingExam ? "Starting Scholarship Exam..." : "Take Scholarship Exam Now"}</span>
                    {!isStartingExam && <ArrowRight className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-xs font-bold text-slate-500 hover:text-[#5C34A4] hover:underline cursor-pointer pt-1 block mx-auto"
                  >
                    ← Register another student
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Student Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 tracking-wide">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Enter student name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-white border border-slate-200/90 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] transition"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 tracking-wide">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        placeholder="Enter email address (optional)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-white border border-slate-200/90 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] transition"
                      />
                    </div>
                  </div>

                  {/* School Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 tracking-wide">
                      School Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Enter your school name"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-white border border-slate-200/90 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] transition"
                      />
                    </div>
                  </div>

                  {/* Class / Grade */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 tracking-wide">
                      Class / Grade <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {CLASSES.map((c) => {
                        const isSelected = selectedClass === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedClass(c.id)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#5C34A4] text-white shadow-md shadow-purple-900/25"
                                : "bg-slate-50/60 hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Syllabus / Board */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 tracking-wide">
                      Syllabus / Board <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(["CBSE", "State"] as const).map((s) => {
                        const isSelected = syllabus === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSyllabus(s)}
                            className={`py-2.5 px-3 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                              isSelected
                                ? "bg-[#5C34A4] text-white shadow-md shadow-purple-900/20"
                                : "bg-slate-50/60 hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                            }`}
                          >
                            <span>{s === "CBSE" ? "CBSE Board" : "State Syllabus"}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Phone Number Field with Country Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 tracking-wide">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <CountryPhoneInput
                      selectedCountry={selectedCountry}
                      onCountryChange={handleCountryChange}
                      phone={phone}
                      onPhoneChange={setPhone}
                      required
                    />
                  </div>

                  {/* Existing Registration Notice */}
                  {isExistingStudent && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Existing Registration Detected</span>
                      </div>
                      <p className="text-[10px] text-emerald-700 leading-snug">
                        Welcome back, <strong>{name}</strong>! Your details for <strong>{selectedClass}</strong> were auto-fetched. Click below to continue directly to your exam.
                      </p>
                    </div>
                  )}

                  {/* Register for Exam Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || isCheckingPhone}
                      className="w-full py-3.5 px-6 font-bold text-sm text-white bg-[#5C34A4] hover:bg-[#4E2B8E] active:bg-[#43237E] disabled:opacity-70 rounded-xl transition-all shadow-lg shadow-purple-900/25 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span>
                        {isSubmitting
                          ? "Proceeding..."
                          : isCheckingPhone
                          ? "Checking Registration..."
                          : isExistingStudent
                          ? `Continue to Exam as ${name.split(" ")[0]}`
                          : "Register & Continue"}
                      </span>
                      {!isSubmitting && !isCheckingPhone && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-2 text-center text-xs text-slate-400">
        © 2026 SmartUp Learning Ventures • levelup.smartuplearning.net
      </footer>
    </div>
  );
}
