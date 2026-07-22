"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

function NavProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) { clearInterval(interval); return prev; }
        const step = prev < 60 ? 3 : prev < 85 ? 1.5 : 0.5;
        return Math.min(prev + step, 95);
      });
    }, 80);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex flex-col items-center gap-2 w-48">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
        CRAFTING THE FUTURE
      </p>
      <div className="w-full flex flex-col gap-1">
        <div className="w-full h-1.5 rounded-full bg-white/40 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-primary/70 font-medium text-right tabular-nums">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}

export function NavigationLoader() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

  // Listen for any internal link clicks — show loader immediately
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      // Only trigger for internal navigation links (not external, hash, or current page)
      if (!href || href.startsWith("http") || href.startsWith("#") || href === pathname) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
      setIsLoading(true);
      startedRef.current = true;

      // Safety net: always hide after 3s in case of redirects that don't change
      // usePathname() (e.g. layout-level redirects that abort the transition before commit)
      maxTimerRef.current = setTimeout(() => {
        startedRef.current = false;
        setIsLoading(false);
      }, 3000);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  // When pathname changes, navigation completed — hide after 600ms minimum
  useEffect(() => {
    if (!startedRef.current) return;
    startedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    timerRef.current = setTimeout(() => setIsLoading(false), 600);
  }, [pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="nav-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] overflow-hidden pointer-events-none"
        >
          {/* Frosted glass base */}
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-950/60 backdrop-blur-[3px]" />
          {/* Diagonal sweeping sheen */}
          <motion.div
            className="absolute inset-y-0 w-[45%] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent skew-x-[-18deg]"
            animate={{ x: ["-50%", "220%"] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
          />
          {/* GIF + label — centered on viewport */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <video
                src="/logo-look.webm"
                autoPlay
                loop
                muted
                playsInline
                className="w-48 h-48 object-contain"
              />
              <NavProgress />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
