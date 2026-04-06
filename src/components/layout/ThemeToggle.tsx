"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Playful sun ↔ moon theme toggle with:
 * - Bouncy spring entrance/exit
 * - Particle burst on click
 * - Ambient glow + gentle hover wobble
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [burst, setBurst] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const toggle = useCallback(() => {
    const root = document.documentElement;
    root.classList.add("theme-transitioning");

    const flash = document.createElement("div");
    flash.className = "theme-flash";
    document.body.appendChild(flash);

    // Trigger particle burst
    setBurst(true);
    setTimeout(() => setBurst(false), 700);

    setTheme(theme === "dark" ? "light" : "dark");

    setTimeout(() => {
      root.classList.remove("theme-transitioning");
      flash.remove();
    }, 600);
  }, [theme, setTheme]);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const isDark = theme === "dark";

  // Particle colors based on theme being switched TO
  const particleColors = isDark
    ? ["#f59e0b", "#fbbf24", "#fcd34d", "#f97316", "#fb923c"] // warm sun colors
    : ["#818cf8", "#a78bfa", "#c4b5fd", "#6366f1", "#93c5fd"]; // cool moon/star colors

  return (
    <motion.button
      ref={btnRef}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.85 }}
      className="relative w-9 h-9 rounded-full flex items-center justify-center
        bg-app-bg border border-border-light overflow-visible
        hover:border-primary/40 hover:bg-primary-light
        transition-colors duration-300 cursor-pointer group"
    >
      {/* Ambient glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: isDark
            ? [
                "0 0 8px 2px rgba(251,191,36,0.15)",
                "0 0 16px 4px rgba(251,191,36,0.25)",
                "0 0 8px 2px rgba(251,191,36,0.15)",
              ]
            : [
                "0 0 8px 2px rgba(99,102,241,0.1)",
                "0 0 14px 3px rgba(99,102,241,0.2)",
                "0 0 8px 2px rgba(99,102,241,0.1)",
              ],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Particle burst on toggle */}
      <AnimatePresence>
        {burst &&
          particleColors.map((color, i) => {
            const angle = (i / particleColors.length) * 360;
            const rad = (angle * Math.PI) / 180;
            return (
              <motion.span
                key={`particle-${i}-${Date.now()}`}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: color }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(rad) * 22,
                  y: Math.sin(rad) * 22,
                  opacity: 0,
                  scale: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            );
          })}
      </AnimatePresence>

      {/* Icon swap */}
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <motion.svg
              className="w-[18px] h-[18px] text-amber-300"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
              animate={{
                filter: [
                  "drop-shadow(0 0 3px rgba(251,191,36,0.3))",
                  "drop-shadow(0 0 8px rgba(251,191,36,0.5))",
                  "drop-shadow(0 0 3px rgba(251,191,36,0.3))",
                ],
                rotate: [0, -8, 0, 8, 0],
              }}
              transition={{
                filter: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <path d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </motion.svg>

            {/* Twinkling stars */}
            {[
              { x: -4, y: -6, size: 2, delay: 0 },
              { x: 6, y: -4, size: 1.5, delay: 0.4 },
              { x: 5, y: 5, size: 1.5, delay: 0.8 },
            ].map((star, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-amber-200"
                style={{
                  width: star.size,
                  height: star.size,
                  left: `calc(50% + ${star.x}px)`,
                  top: `calc(50% + ${star.y}px)`,
                }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: star.delay,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <motion.svg
              className="w-[18px] h-[18px] text-amber-500 group-hover:text-amber-600 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
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
    </motion.button>
  );
}
