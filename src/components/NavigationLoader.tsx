"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function NavigationLoader() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setIsLoading(true);
      startedRef.current = true;
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  // When pathname changes, navigation completed — hide after 600ms minimum
  useEffect(() => {
    if (!startedRef.current) return;
    startedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsLoading(false), 600);
  }, [pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/loading.gif"
                alt="Loading"
                className="w-48 h-48 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="px-3.5 py-1 rounded-full
                  bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                  border border-white/70 dark:border-white/10
                  shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
              >
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Loading…</p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
