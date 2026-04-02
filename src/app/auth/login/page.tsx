"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { LoginForm } from "@/components/auth/LoginForm";

const HERO_IMAGES = [
  "/login-slide-1.jpg",
  "/login-slide-2.jpg",
  "/login-slide-3.jpg",
  "/login-slide-4.jpg",
];

const SLIDES = [
  {
    tag: "SMARTUP LEARNING",
    heading: "Empowering",
    highlight: "Education",
    description:
      "Complete education management — students, batches, attendance, and fees in one place",
  },
  {
    tag: "SMARTUP LEARNING",
    heading: "Smart Tools for",
    highlight: "Smart Schools",
    description:
      "Streamline admissions, track progress, and manage operations effortlessly",
  },
  {
    tag: "SMARTUP LEARNING",
    heading: "Where Learning",
    highlight: "Meets Excellence",
    description:
      "Manage every branch, every student, every rupee — all from one dashboard",
  },
  {
    tag: "SMARTUP LEARNING",
    heading: "Built for",
    highlight: "Every Branch",
    description:
      "One platform connecting all your centres — real-time insights at your fingertips",
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left Panel — Image Carousel + Text Overlay ── */}
      <div className="hidden lg:block lg:w-[68%] relative overflow-hidden">
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
              src={HERO_IMAGES[activeSlide]}
              alt="SmartUp Learning"
              fill
              className="object-cover"
              priority={activeSlide === 0}
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 z-10" />


        {/* Slide text at bottom */}
        <div className="absolute bottom-12 left-10 right-10 z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <p className="text-primary text-sm font-semibold tracking-widest mb-3">
                {slide.tag}
              </p>
              <h1 className="text-white text-4xl xl:text-5xl font-bold leading-tight">
                {slide.heading}
                <br />
                <span className="text-primary">{slide.highlight}</span>
              </h1>
              <p className="text-white/70 mt-4 text-base max-w-lg leading-relaxed">
                {slide.description}
              </p>
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

      {/* ── Right Panel — Login Form (dark bg) ── */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#0a1a18] relative overflow-hidden">
        {/* Ambient glow effects */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#2DD4BF]/6 rounded-full blur-[80px] pointer-events-none" />

        {/* Centered form */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-10 sm:px-12">
          <div className="w-full max-w-[420px]">
            {/* Mobile logo (hidden on lg+) */}
            <div className="lg:hidden text-center mb-10">
              <div className="inline-flex items-center gap-3 mb-2">
                <Image
                  src="/smartup-logo.png"
                  alt="SmartUp"
                  width={40}
                  height={40}
                  className="object-contain"
                />
                <span className="text-white text-lg font-bold tracking-wide">
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
              <div className="flex items-center gap-3 mb-6">
                <div className="hidden lg:flex w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-[#2DD4BF]/10 items-center justify-center border border-primary/20">
                  <Image
                    src="/smartup-logo.png"
                    alt=""
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Welcome back
                  </h2>
                  <p className="text-white/40 text-sm">
                    Sign in to continue to your dashboard
                  </p>
                </div>
              </div>

              {/* Glass card */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm p-6 sm:p-7">
                <LoginForm variant="dark" />
              </div>

              {/* Trust badges */}
              <div className="mt-6 flex items-center justify-center gap-6 text-white/25 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Secure login
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  256-bit encrypted
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-center pb-6 px-6">
          <p className="text-white/20 text-xs">
            SmartUp Learning &middot; Crafting the future since 2014
          </p>
        </div>
      </div>
    </div>
  );
}
