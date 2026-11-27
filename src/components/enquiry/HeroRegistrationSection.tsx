"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import CountryPhoneInput from "@/components/common/CountryPhoneInput";
import {
  COUNTRIES,
  CountryConfig,
  formatE164,
  validatePhoneNumberStrict,
} from "@/lib/constants/countries";
import SmartUpAnimatedLogo from "@/components/enquiry/SmartUpAnimatedLogo";
import { KEY_FACTS } from "@/data/enquiry-content";
import {
  getEnquiryThankYouPath,
  saveEnquiryReceipt,
} from "@/lib/enquiry/receipt";
import type {
  BoardOption,
  CallTimeOption,
  ClassLevelOption,
  PlanOption,
  StreamOption,
  SubmissionReceipt,
} from "@/components/enquiry/types";

const GCC_DEFAULT_COUNTRY: CountryConfig =
  COUNTRIES.find((c) => c.code === "AE") || COUNTRIES[0];

const CLASS_OPTIONS: ClassLevelOption[] = [
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];

const PLAN_CHOICES: { value: PlanOption; label: string }[] = [
  { value: "1:1 Personal", label: "1:1" },
  { value: "1:3 Small Group", label: "1:3" },
  { value: "Micro Batch", label: "Micro" },
  { value: "Not sure", label: "Guide me" },
];

const BOARD_CHOICES: BoardOption[] = ["CBSE", "ICSE", "Kerala State", "Other"];
const CALL_TIME_CHOICES: CallTimeOption[] = [
  "Evening (GCC)",
  "Morning",
  "Afternoon",
  "Weekend",
];

interface HeroRegistrationSectionProps {
  selectedPlan: PlanOption;
  onPlanChange: (plan: PlanOption) => void;
}

export default function HeroRegistrationSection({
  selectedPlan,
  onPlanChange,
}: HeroRegistrationSectionProps) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [parentName, setParentName] = useState("");
  const [selectedCountry, setSelectedCountry] =
    useState<CountryConfig>(GCC_DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState(GCC_DEFAULT_COUNTRY.regions[0] || "Dubai");
  const [classLevel, setClassLevel] = useState<ClassLevelOption>("Class 10");
  const [stream, setStream] = useState<StreamOption>("Science");
  const [board, setBoard] = useState<BoardOption>("CBSE");
  const [email, setEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [preferredCallTime, setPreferredCallTime] =
    useState<CallTimeOption>("Evening (GCC)");
  const [showOptional, setShowOptional] = useState(false);

  const [utmParams, setUtmParams] = useState<{
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referrer?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isHigherSecondary =
    classLevel === "Class 11" || classLevel === "Class 12";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setUtmParams({
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
      referrer: document.referrer || undefined,
    });
  }, []);

  useEffect(() => {
    if (!isHigherSecondary && stream !== "Science") {
      setStream("Science");
    }
  }, [isHigherSecondary, stream]);

  const handleCountryChange = (newCountry: CountryConfig) => {
    setSelectedCountry(newCountry);
    setCity(newCountry.regions[0] || "");
    setPhone("");
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!studentName.trim() || studentName.trim().length < 2) {
      setErrorMessage("Please enter the student's full name.");
      return;
    }

    if (!parentName.trim() || parentName.trim().length < 2) {
      setErrorMessage("Please enter the parent/guardian's name.");
      return;
    }

    const phoneCheck = validatePhoneNumberStrict(phone, selectedCountry);
    if (!phoneCheck.isValid) {
      setErrorMessage(
        phoneCheck.error || "Please enter a valid mobile/WhatsApp number."
      );
      return;
    }

    const e164Phone = formatE164(selectedCountry.dialCode, phone);

    setIsSubmitting(true);
    let didRedirect = false;
    try {
      const res = await fetch("/api/enquiry/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          parentName: parentName.trim(),
          phone: e164Phone,
          email: email.trim(),
          country: selectedCountry.name,
          city,
          classLevel,
          stream: isHigherSecondary ? stream : "Science",
          board,
          preferredPlan: selectedPlan,
          schoolName: schoolName.trim(),
          preferredCallTime,
          ...utmParams,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(
          data.error || "Could not submit registration. Please try again."
        );
        return;
      }

      const receiptPayload: SubmissionReceipt = {
        referenceCode: data.referenceCode,
        studentName: data.studentName,
        classLevel: data.classLevel,
        preferredPlan: data.preferredPlan,
        updated: data.updated,
      };
      saveEnquiryReceipt(receiptPayload);
      didRedirect = true;
      router.push(getEnquiryThankYouPath(data.referenceCode));
    } catch {
      setErrorMessage(
        "Network error while submitting your enquiry. Please try again."
      );
    } finally {
      if (!didRedirect) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <section
      id="register"
      className="relative overflow-hidden bg-gradient-to-b from-[#FAF8FF] via-white to-white pt-8 pb-14 sm:pt-12 sm:pb-18 border-b border-slate-100"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/4 w-[28rem] h-[28rem] rounded-full bg-[#EDE7F6]/60 blur-[110px]"
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Minimal Editorial Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-6 space-y-6"
        >
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white border border-slate-200/80 px-3.5 py-1.5 shadow-2xs">
            <SmartUpAnimatedLogo size={26} />
            <span className="text-xs font-bold text-[#5C34A4]">
              CBSE Crash Course · GCC
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black tracking-[-0.03em] leading-[1.08] text-slate-900">
              CBSE board prep,{" "}
              <span className="text-[#5C34A4]">ready to score.</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md">
              Live online classes, previous-year papers &amp; parent updates for
              Malayali families across the GCC.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md pt-1">
            {KEY_FACTS.map((fact) => (
              <div
                key={fact.label}
                className="rounded-2xl bg-white border border-slate-200/75 px-4 py-3.5 shadow-2xs"
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {fact.label}
                </span>
                <span className="mt-0.5 block text-sm font-bold text-slate-900">
                  {fact.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Primary Card: Student Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="lg:col-span-6 w-full"
        >
          <div className="rounded-[24px] sm:rounded-[28px] bg-white border border-slate-200/90 p-5 sm:p-7 shadow-[0_24px_64px_-16px_rgba(92,52,164,0.16)]">
            <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="pb-1">
                  <h2 className="text-lg font-black text-slate-900">
                    Book a Free Demo
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Get fee structure &amp; batch schedule.
                  </p>
                </div>

                {errorMessage && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="studentName"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Student Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="studentName"
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Student name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] transition"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="parentName"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Parent Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="parentName"
                      type="text"
                      required
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Parent name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] transition"
                    />
                  </div>
                </div>

                {/* Full-width WhatsApp input so country code + digits fit comfortably */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp / Mobile <span className="text-rose-500">*</span>
                  </label>
                  <CountryPhoneInput
                    selectedCountry={selectedCountry}
                    onCountryChange={handleCountryChange}
                    phone={phone}
                    onPhoneChange={setPhone}
                    compactSelect
                    required
                  />
                </div>

                {/* City & Class */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <label
                      htmlFor="citySelect"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      {selectedCountry.regionLabel}
                    </label>
                    <select
                      id="citySelect"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] transition"
                    >
                      {selectedCountry.regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-7">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Class <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {CLASS_OPTIONS.map((cls) => {
                        const active = classLevel === cls;
                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setClassLevel(cls)}
                            className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              active
                                ? "bg-[#5C34A4] text-white border-[#5C34A4]"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:border-[#5C34A4]/40"
                            }`}
                          >
                            {cls.replace("Class ", "")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {isHigherSecondary && (
                  <div className="grid grid-cols-2 gap-2">
                    {(["Science", "Commerce"] as StreamOption[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setStream(opt)}
                        className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          stream === opt
                            ? "bg-[#5C34A4] text-white border-[#5C34A4]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:border-[#5C34A4]/40"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Plan
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-1.5">
                    {PLAN_CHOICES.map((plan) => {
                      const active = selectedPlan === plan.value;
                      return (
                        <button
                          key={plan.value}
                          type="button"
                          onClick={() => onPlanChange(plan.value)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            active
                              ? "bg-[#F5F3FF] text-[#5C34A4] border-[#5C34A4]"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {plan.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowOptional((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5C34A4] hover:underline cursor-pointer"
                  >
                    <span>
                      {showOptional
                        ? "Hide optional details"
                        : "+ Optional details"}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        showOptional ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showOptional && (
                    <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-100">
                      <select
                        aria-label="Current Board"
                        value={board}
                        onChange={(e) =>
                          setBoard(e.target.value as BoardOption)
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#5C34A4]"
                      >
                        {BOARD_CHOICES.map((b) => (
                          <option key={b} value={b}>
                            Board: {b}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="Preferred Call Time"
                        value={preferredCallTime}
                        onChange={(e) =>
                          setPreferredCallTime(e.target.value as CallTimeOption)
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#5C34A4]"
                      >
                        {CALL_TIME_CHOICES.map((slot) => (
                          <option key={slot} value={slot}>
                            Call: {slot}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="School name"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#5C34A4]"
                      />

                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#5C34A4]"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group w-full py-3.5 px-6 rounded-xl bg-[#5C34A4] hover:bg-[#4B288A] disabled:opacity-60 text-white text-sm font-bold shadow-[0_12px_28px_-8px_rgba(92,52,164,0.45)] transition-all cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Book Free Demo</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
