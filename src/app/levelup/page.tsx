"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Trophy,
  User,
  School,
  ArrowRight,
  Lock,
  Globe2,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Building,
} from "lucide-react";
import CountryPhoneInput from "@/components/common/CountryPhoneInput";
import {
  COUNTRIES,
  CountryConfig,
  validatePhoneNumberStrict,
  formatE164,
  getCountryByDialCode,
} from "@/lib/constants/countries";

const GCC_DEFAULT_COUNTRY: CountryConfig =
  COUNTRIES.find((c) => c.code === "AE") || COUNTRIES[0];

const GCC_CLASSES = [
  { id: "Class 8", label: "Class 8" },
  { id: "Class 9", label: "Class 9" },
  { id: "Class 10", label: "Class 10" },
  { id: "Plus One (+1)", label: "Grade 11 (+1)" },
  { id: "Plus Two (+2)", label: "Grade 12 (+2)" },
];

const CURRICULUMS = ["CBSE", "ICSE", "British / IGCSE", "State"];

export default function LevelUpRegistrationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(GCC_DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [selectedClass, setSelectedClass] = useState("Class 10");
  const [curriculum, setCurriculum] = useState("CBSE");
  const [emirateCity, setEmirateCity] = useState(GCC_DEFAULT_COUNTRY.regions[0] || "Dubai");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  // Returning Candidate Auto-Lookup
  const [returningStudent, setReturningStudent] = useState<{
    name: string;
    schoolName?: string;
    phone: string;
    classLevel: string;
    curriculum: string;
    country: string;
    emirateCity: string;
    registrationId: string;
    attemptId?: string | null;
  } | null>(null);

  // Check LocalStorage on initial load
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
                if (data.schoolName || parsed.schoolName) {
                  setSchoolName(data.schoolName || parsed.schoolName);
                }
                setSelectedClass(data.classLevel);
                if (data.curriculum) setCurriculum(data.curriculum);
              }
            })
            .catch(() => {});
        }
      }
    } catch {}
  }, []);

  const handleCountryChange = (c: CountryConfig) => {
    setSelectedCountry(c);
    setEmirateCity(c.regions[0] || "");
  };

  const handleStartExam = async (regIdToUse?: string) => {
    const fullPhone = formatE164(selectedCountry.dialCode, phone);
    const activeRegId = regIdToUse || registrationId;

    setIsStartingExam(true);
    try {
      const res = await fetch("/api/levelup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          schoolName: schoolName.trim(),
          phone: fullPhone,
          selectedClass,
          country: selectedCountry.name,
          emirateCity,
          curriculum,
          registrationId: activeRegId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Unable to start exam. Please try again.");
        setIsStartingExam(false);
        return;
      }

      router.push(`/levelup/exam/${data.attemptId}`);
    } catch {
      alert("Network error starting exam. Please try again.");
      setIsStartingExam(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter candidate full name.");
      return;
    }

    const phoneValidation = validatePhoneNumberStrict(phone, selectedCountry);
    if (!phoneValidation.isValid) {
      alert(phoneValidation.error || "Please enter a valid phone number.");
      return;
    }

    const fullPhone = formatE164(selectedCountry.dialCode, phone);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/levelup/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          schoolName: schoolName.trim(),
          phone: fullPhone,
          selectedClass,
          country: selectedCountry.name,
          emirateCity,
          curriculum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Registration error. Please check your details.");
        setIsSubmitting(false);
        return;
      }

      setRegistrationId(data.registrationId);
      localStorage.setItem(
        "levelup_student",
        JSON.stringify({
          name: name.trim(),
          schoolName: schoolName.trim(),
          phone: fullPhone,
          classLevel: selectedClass,
          curriculum,
          country: selectedCountry.name,
          emirateCity,
        })
      );

      // Launch exam directly
      await handleStartExam(data.registrationId);
    } catch {
      alert("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] flex flex-col justify-between relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Navigation */}
      <header className="border-b border-slate-800/80 bg-[#10141E]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/20">
              LU
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                LEVELUP <span className="text-emerald-400 font-extrabold text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30">GCC</span>
              </span>
              <p className="text-[11px] text-slate-400">SmartUp GCC Scholarship Examination 2026-27</p>
            </div>
          </div>

          <a
            href="/levelup/admin"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-xl transition-all"
          >
            <Lock className="w-3.5 h-3.5" /> GCC Portal Admin
          </a>
        </div>
      </header>

      {/* Main Registration Form */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 z-10 flex-1 flex flex-col justify-center">
        {/* Returning student banner */}
        {returningStudent && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <p className="text-sm font-bold text-white">Welcome back, {returningStudent.name}!</p>
                <p className="text-xs text-slate-400">
                  Registered for {returningStudent.classLevel} • {returningStudent.country}
                </p>
              </div>
            </div>

            {returningStudent.attemptId ? (
              <button
                onClick={() => router.push(`/levelup/result/${returningStudent.attemptId}`)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                View Your Scorecard
              </button>
            ) : (
              <button
                onClick={() => handleStartExam(returningStudent.registrationId)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Start Test Now
              </button>
            )}
          </div>
        )}

        <div className="bg-[#121722]/90 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-xl relative">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Middle East & GCC Scholarship Test
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Candidate Registration
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              For students residing in UAE, Saudi Arabia, Qatar, Oman, Kuwait, and Bahrain. Enter your details to start the scholarship assessment.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Student Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aayan Mohammed"
                    className="w-full bg-[#181F2E] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* School Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  School Name in GCC
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. Indian High School Dubai"
                    className="w-full bg-[#181F2E] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Phone with Country Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Mobile / WhatsApp Number <span className="text-rose-400">*</span>
              </label>
              <CountryPhoneInput
                selectedCountry={selectedCountry}
                phone={phone}
                onCountryChange={handleCountryChange}
                onPhoneChange={setPhone}
              />
            </div>

            {/* Class Pill Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Class / Grade <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {GCC_CLASSES.map((cls) => {
                  const isSelected = selectedClass === cls.id;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClass(cls.id)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        isSelected
                          ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                          : "bg-[#181F2E] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      {cls.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Curriculum */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Curriculum / Syllabus
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CURRICULUMS.map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setCurriculum(cur)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                        curriculum === cur
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "bg-[#181F2E] border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              {/* City / Emirate */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  City / Emirate in {selectedCountry.name}
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={emirateCity}
                    onChange={(e) => setEmirateCity(e.target.value)}
                    placeholder="e.g. Dubai / Riyadh / Doha"
                    className="w-full bg-[#181F2E] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isStartingExam}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting || isStartingExam ? (
                <span>Launching LevelUp Exam...</span>
              ) : (
                <>
                  <span>Begin LevelUp Scholarship Test</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#10141E]/80 py-4 text-center text-xs text-slate-500">
        © 2026 SmartUp Learning Ventures LLC • Middle East & GCC Operations • levelup.smartuplearning.net
      </footer>
    </div>
  );
}
