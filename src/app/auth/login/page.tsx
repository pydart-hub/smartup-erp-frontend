"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { DM_Sans } from "next/font/google";
import { Play, BookOpen } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginFooter } from "@/components/auth/LoginFooter";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const SLIDES = [
  {
    image: "/login-slide-1.png",
    eyebrow: "SMARTUP LEARNING",
    title: "Building Future-Ready",
    accentTitle: "Students",
    description:
      "We combine academic excellence with real-world skills, ensuring holistic student development.",
    supportingText: "One standard of quality across all branches.",
  },
  {
    image: "/login-slide-2.png",
    eyebrow: "SMARTUP LEARNING",
    title: "Comprehensive Learning",
    accentTitle: "Solutions",
    description:
      "From tuition and school programs to entrance coaching and online classes — all under one platform.",
    supportingText:
      "Designed to support every stage of a student's academic journey.",
  },
  {
    image: "/login-slide-5.png",
    eyebrow: "SMARTUP LEARNING",
    title: "Enhancing Classroom",
    accentTitle: "Excellence",
    description:
      "Support teachers with insights on student performance, engagement, and academic trends.",
    supportingText:
      "Bridging traditional teaching with modern technology.",
  },
  {
    image: "/login-slide-3.png",
    eyebrow: "SMARTUP LEARNING",
    title: "Personalized Learning",
    accentTitle: "for Every Student",
    description:
      "Interactive learning paths, engaging content, and real-time progress tracking for students and parents.",
    supportingText:
      "Making education smarter, simpler, and more accessible.",
  },
  {
    image: "/login-slide-4.png",
    eyebrow: "SMARTUP LEARNING",
    title: "Manage Your Institution",
    accentTitle: "with Precision",
    description:
      "Monitor academic performance, payments, and operational data seamlessly through a centralized ERP system.",
    supportingText:
      "Simplify administration with data-driven control and visibility.",
  },
];

export default function LoginPage() {
  const [activeSlide, setActiveSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const slide = SLIDES[activeSlide];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative">
      {/* ── Left Panel — Image Carousel + Text Overlay ── */}
      <div className="absolute inset-0 lg:relative lg:block lg:w-[68%] overflow-hidden z-0">
        {/* Crossfade background images */}
        <AnimatePresence initial={false}>
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={slide.image}
              alt="SmartUp Learning"
              fill
              className="object-cover"
              priority={activeSlide === 0}
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-black/40 lg:bg-[linear-gradient(90deg,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.4)_34%,rgba(0,0,0,0.1)_58%,rgba(0,0,0,0.8)_100%)] z-10" />

        <div className="hidden lg:block absolute inset-0 z-20 pointer-events-none">
          <div className="absolute left-10 top-10 inline-flex items-center gap-3 rounded-full border border-white/12 bg-black/18 px-4 py-2 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#5f2ea8]/90" />
            <span className={`${dmSans.className} text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-white/78`}>
              Smartup Learning Ventures
            </span>
          </div>
        </div>

        {/* Slide text at bottom */}
        <div className="hidden lg:block absolute bottom-12 left-10 right-10 z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-[27rem]"
            >
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`${dmSans.className} mb-1.5 text-[0.82rem] font-bold uppercase tracking-[0.18em] text-[#a374f5]`}
              >
                {slide.eyebrow}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scaleX: 0.35 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="mb-3 h-px w-12 origin-left bg-gradient-to-r from-[#5f2ea8]/90 to-transparent"
              />
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.05, ease: "easeOut" }}
                className={`${dmSans.className} max-w-[26rem] text-white text-[2.5rem] xl:text-[2.8rem] font-bold leading-[1] tracking-[-0.045em]`}
              >
                <span className="block">{slide.title}</span>
                <span className="block text-[#a374f5]">{slide.accentTitle}</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.16, ease: "easeOut" }}
                className={`${dmSans.className} mt-3 max-w-[24rem] text-[0.96rem] font-medium leading-7 tracking-[0.003em] text-white/82`}
              >
                {slide.description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.28, ease: "easeOut" }}
                className={`${dmSans.className} mt-3 max-w-[24rem] text-[0.9rem] font-normal leading-6 tracking-[0.002em] text-white/80`}
              >
                <span className="inline-block border-b border-[#5f2ea8]/40 pb-0.5">{slide.supportingText}</span>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Progress bar indicators */}
          <div className="flex gap-2 mt-8">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className="relative h-1 rounded-full overflow-hidden bg-white/20 transition-all duration-300"
                style={{ width: i === activeSlide ? 48 : 12 }}
              >
                {i === activeSlide && (
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-white rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 6, ease: "linear" }}
                    key={`bar-${activeSlide}`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel — Login Form (light bg) ── */}
      <div className="flex-1 flex flex-col min-h-screen bg-black/30 lg:bg-[#f1f5f9] relative z-10 overflow-hidden backdrop-blur-md lg:backdrop-blur-none">
        {/* Centered form */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-10 sm:px-12">
          <div className="w-full max-w-[420px]">
            {/* Mobile logo (hidden on lg+) */}
            <div className="lg:hidden text-center mb-10">
              <div className="inline-flex items-center gap-3 mb-2 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-lg">
                <Image
                  src="/smartup-logo-v2.png"
                  alt="SmartUp"
                  width={36}
                  height={36}
                  className="object-contain"
                />
                <span className="text-white text-lg font-bold tracking-wide drop-shadow-md">
                  SMART UP
                </span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {/* Greeting with icon */}
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                <Image
                  src="/smartup-logo-v2.png"
                  alt="SmartUp"
                  width={68}
                  height={68}
                  className="hidden lg:block object-contain drop-shadow-[4px_4px_8px_rgba(163,177,198,0.5)]"
                />
                <div className="text-center lg:text-left">
                  <h2 className="text-2xl font-bold text-white lg:text-slate-800 drop-shadow-md lg:drop-shadow-[2px_2px_4px_rgba(255,255,255,0.8)]">
                    Welcome back
                  </h2>
                  <p className="text-white/90 lg:text-slate-500 text-sm drop-shadow-md lg:drop-shadow-none mt-1 font-medium">
                    Sign in to continue to your dashboard
                  </p>
                </div>
              </div>

              {/* Skeuomorphic 3D card */}
              <div className="rounded-[2rem] bg-[#f1f5f9] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.4)] lg:shadow-[12px_12px_24px_rgba(163,177,198,0.4),-12px_-12px_24px_rgba(255,255,255,0.9)] p-6 sm:p-9 backdrop-blur-none transition-all duration-300 relative">
                {/* Inner highlight for 3D effect */}
                <div className="absolute inset-0 rounded-[2rem] border-2 border-white/60 pointer-events-none hidden lg:block"></div>
                <LoginForm variant="light" />
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex items-center justify-center gap-6 text-white/80 lg:text-slate-400 text-[11px] font-medium lg:drop-shadow-[1px_1px_1px_rgba(255,255,255,1)]">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Secure login
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  256-bit encrypted
                </span>
              </div>

              {/* Demo & Diagnosis Exam Buttons */}
              <div className="mt-5 flex justify-center gap-4">
                <Link
                  href="/demo"
                  className="group inline-flex items-center gap-2 text-sm font-medium text-white/90 lg:text-slate-500 hover:text-white lg:hover:text-[#5f2ea8] border border-white/30 lg:border-slate-200 hover:border-white/50 lg:hover:border-[#5f2ea8]/30 rounded-xl px-5 py-2.5 bg-white/10 lg:bg-white hover:bg-white/20 lg:hover:bg-[#5f2ea8]/5 transition-all duration-200 shadow-sm backdrop-blur-sm lg:backdrop-blur-none"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Try Demo
                </Link>
                <Link
                  href="/exam-site"
                  className="group inline-flex items-center gap-2 text-sm font-medium text-white/90 lg:text-slate-500 hover:text-white lg:hover:text-emerald-600 border border-white/30 lg:border-slate-200 hover:border-white/50 lg:hover:border-emerald-600/30 rounded-xl px-5 py-2.5 bg-white/10 lg:bg-white hover:bg-white/20 lg:hover:bg-emerald-600/5 transition-all duration-200 shadow-sm backdrop-blur-sm lg:backdrop-blur-none"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Diagnosis Exam
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer — Legal & Contact */}
        <div className="lg:bg-transparent bg-black/20">
          <LoginFooter />
        </div>
      </div>
    </div>
  );
}
