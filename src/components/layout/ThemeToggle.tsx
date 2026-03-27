"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Animated sun/moon theme toggle with:
 * - Spring-bounce icon morph
 * - Smooth whole-screen color crossfade
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const toggle = useCallback(() => {
    const root = document.documentElement;

    // Enable smooth transitions on every element
    root.classList.add("theme-transitioning");

    // Brief flash overlay for visual punch
    const flash = document.createElement("div");
    flash.className = "theme-flash";
    document.body.appendChild(flash);

    // Swap theme immediately — CSS transitions handle the rest
    setTheme(theme === "dark" ? "light" : "dark");

    // Clean up after transitions finish
    setTimeout(() => {
      root.classList.remove("theme-transitioning");
      flash.remove();
    }, 600);
  }, [theme, setTheme]);

  // Avoid hydration mismatch — render nothing on server
  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      ref={btnRef}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className="relative w-9 h-9 rounded-full flex items-center justify-center
        bg-app-bg border border-border-light overflow-hidden
        hover:border-primary/40 hover:bg-primary-light
        transition-colors duration-300 cursor-pointer group"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ rotate: -120, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 120, scale: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Moon SVG */}
            <motion.svg
              className="w-[18px] h-[18px] text-amber-300"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
              animate={{ filter: ["drop-shadow(0 0 4px rgba(251,191,36,0.3))", "drop-shadow(0 0 8px rgba(251,191,36,0.5))", "drop-shadow(0 0 4px rgba(251,191,36,0.3))"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <path d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </motion.svg>
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 120, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -120, scale: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Sun SVG — spins slowly on hover */}
            <motion.svg
              className="w-[18px] h-[18px] text-amber-500 group-hover:text-amber-600 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
