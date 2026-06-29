"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface ThreeDCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  gradientFrom?: string;
  gradientTo?: string;
  badge?: string;
}

export function ThreeDCard({
  title,
  description,
  icon,
  onClick,
  gradientFrom = "from-indigo-600",
  gradientTo = "to-purple-600",
  badge,
}: ThreeDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // Motion values for tilt position
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for tilt rotation
  const rotateXSpring = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), {
    damping: 20,
    stiffness: 150,
  });
  const rotateYSpring = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), {
    damping: 20,
    stiffness: 150,
  });

  // Motion values for shine position
  const shineX = useSpring(useTransform(x, [-0.5, 0.5], ["0%", "100%"]), {
    damping: 25,
    stiffness: 120,
  });
  const shineY = useSpring(useTransform(y, [-0.5, 0.5], ["0%", "100%"]), {
    damping: 25,
    stiffness: 120,
  });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left - width / 2;
    const mouseY = event.clientY - rect.top - height / 2;

    // Normalize values between -0.5 and 0.5
    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <div
      className="perspective-[1000px] w-full max-w-sm aspect-[4/5] cursor-pointer"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      ref={cardRef}
    >
      <motion.div
        style={{
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "relative w-full h-full rounded-3xl p-8 flex flex-col justify-between overflow-hidden transition-shadow duration-300",
          "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-white/[0.05]",
          hovered
            ? "shadow-[0_20px_50px_rgba(99,102,241,0.25)] border-indigo-500/30"
            : "shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
        )}
      >
        {/* Glow / Shine effect */}
        <motion.div
          style={{
            background: `radial-gradient(circle 180px at ${shineX.get()} ${shineY.get()}, rgba(255,255,255,0.15), transparent)`,
          }}
          className="absolute inset-0 pointer-events-none z-10"
        />

        {/* Dynamic Background Gradient Blob */}
        <div
          className={cn(
            "absolute -right-20 -top-20 w-48 h-48 rounded-full blur-[60px] opacity-40 transition-all duration-500 bg-gradient-to-br",
            gradientFrom,
            gradientTo,
            hovered ? "scale-125 opacity-60" : "scale-100"
          )}
        />

        {/* Card Header (Badge & Icon) */}
        <div className="flex justify-between items-start" style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}>
          <div
            className={cn(
              "p-4 rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300",
              gradientFrom,
              gradientTo,
              hovered ? "scale-110 -translate-y-1 shadow-indigo-500/25" : "scale-100"
            )}
          >
            {icon}
          </div>
          {badge && (
            <span className="px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
              {badge}
            </span>
          )}
        </div>

        {/* Card Body & Action */}
        <div className="flex flex-col gap-3" style={{ transform: "translateZ(45px)", transformStyle: "preserve-3d" }}>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
            {description}
          </p>

          {/* Action indicator */}
          <div className="mt-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm group-hover:text-indigo-500">
            <span>Explore Now</span>
            <motion.span
              animate={hovered ? { x: 5 } : { x: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              →
            </motion.span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
