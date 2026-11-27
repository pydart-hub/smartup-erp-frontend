"use client";

import React, { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import SmartUpAnimatedLogo from "@/components/enquiry/SmartUpAnimatedLogo";

/**
 * Clean luminous ambient backdrop without moving background 3D particles.
 */
export function ThankYou3DStage() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      {/* Multi-layered luminous atmospheric gradients */}
      <div className="absolute -top-32 -left-24 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-[#7C3AED]/16 via-[#5C34A4]/10 to-transparent blur-[110px]" />
      <div className="absolute top-1/3 -right-28 w-[34rem] h-[34rem] rounded-full bg-gradient-to-bl from-[#F5C542]/16 via-[#A855F7]/10 to-transparent blur-[120px]" />
      <div className="absolute -bottom-36 left-1/3 w-[32rem] h-[32rem] rounded-full bg-gradient-to-tr from-[#10B981]/12 via-[#6366F1]/10 to-transparent blur-[110px]" />

      {/* Subtle architectural perspective dot grid */}
      <div
        className="absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(92,52,164,0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 75% 65% at 50% 45%, black 35%, transparent 100%)",
        }}
      />
    </div>
  );
}

interface ThankYou3DCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Interactive 3D perspective card shell with spring tilt, specular light tracking,
 * and layered elevation shadows.
 */
export function ThankYou3DCard({
  children,
  className = "",
}: ThankYou3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);
  const px = useMotionValue(280);
  const py = useMotionValue(180);

  const rotateX = useSpring(useTransform(normY, [-0.5, 0.5], [5.5, -5.5]), {
    stiffness: 180,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(normX, [-0.5, 0.5], [-5.5, 5.5]), {
    stiffness: 180,
    damping: 22,
  });

  const spotlight = useMotionTemplate`radial-gradient(380px circle at ${px}px ${py}px, rgba(124, 58, 237, 0.09), transparent 70%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    if (window.matchMedia?.("(pointer: coarse)")?.matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    px.set(relX);
    py.set(relY);
    normX.set(relX / rect.width - 0.5);
    normY.set(relY / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    normX.set(0);
    normY.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1200 }}
      className="relative w-full max-w-xl"
    >
      {/* 3D floating floor shadow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -bottom-7 top-10 rounded-[36px] bg-gradient-to-b from-[#5C34A4]/18 via-[#7C3AED]/14 to-transparent blur-2xl"
      />

      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={`relative rounded-[28px] sm:rounded-[32px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_28px_70px_-18px_rgba(92,52,164,0.28),0_10px_28px_-10px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-[#5C34A4]/10 overflow-hidden ${className}`}
      >
        {/* Top prismatic accent bar */}
        <div
          aria-hidden
          className="h-1.5 w-full bg-gradient-to-r from-[#5C34A4] via-[#8B5CF6] to-[#F5C542]"
        />

        {/* Cursor-tracking specular highlight */}
        <motion.div
          aria-hidden
          style={{ background: spotlight }}
          className="pointer-events-none absolute inset-0 z-0"
        />

        <div
          className="relative z-10 p-6 sm:p-10"
          style={{ transformStyle: "preserve-3d" }}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Shared floating 3D SmartUp logo emblem (no outer circle) paired with the
 * elevated emerald confirmation status pill.
 */
export function ThankYouHeroEmblem({ badgeText }: { badgeText: string }) {
  return (
    <>
      <div
        className="relative flex justify-center pt-1"
        style={{ transform: "translateZ(48px)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-24 rounded-full bg-gradient-to-r from-[#7C3AED]/25 via-[#A855F7]/20 to-[#F5C542]/20 blur-2xl"
        />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 3.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative -my-4 drop-shadow-[0_18px_28px_rgba(92,52,164,0.34)]"
        >
          <SmartUpAnimatedLogo size={160} />
        </motion.div>
      </div>

      <div style={{ transform: "translateZ(34px)" }}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-[0_10px_24px_-6px_rgba(16,185,129,0.55)] ring-2 ring-emerald-400/30">
          <CheckCircle2 className="w-4 h-4" />
          <span>{badgeText}</span>
        </div>
      </div>
    </>
  );
}
