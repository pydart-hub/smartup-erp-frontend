"use client";

import { useEffect, useState } from "react";

export function GifLoader({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const gifSize = size === "lg" ? "w-48 h-48" : size === "sm" ? "w-16 h-16" : "w-32 h-32";
  const containerH = size === "lg" ? "h-[300px]" : size === "sm" ? "h-24" : "h-64";
  const barW = size === "sm" ? "w-24" : "w-48";

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate smooth progress: fast at first, slows near the end
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
    <div className={`flex flex-col items-center justify-center gap-4 ${className ?? containerH}`}>
      <video
        autoPlay
        loop
        muted
        playsInline
        className={`${gifSize} object-contain shrink-0`}
      >
        <source src="/logo-look.webm" type="video/webm" />
      </video>
      <p className="-mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
        CRAFTING THE FUTURE
      </p>
      <div className={`${barW} flex flex-col gap-1`}>
        <div className="w-full h-1.5 rounded-full bg-border-light overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-text-tertiary font-medium text-right tabular-nums">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
