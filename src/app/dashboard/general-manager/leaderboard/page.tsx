"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Trophy, Users, Star, ChevronRight, Lock, Sparkles } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { useRef, useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";

const OPTIONS = [
  {
    id: "instructor-leaderboard",
    title: "Leaderboard Dashboard",
    description: "Discover top-performing instructors by scores, attendance, and student performance.",
    href: "/dashboard/general-manager/leaderboard/instructor",
    icon: Trophy,
    gradient: "from-[#4F46E5] via-[#4338CA] to-[#3730A3]",
    glow: "rgba(99,102,241,0.28)",
    glowHover: "rgba(99,102,241,0.52)",
    badgeColor: "from-[#4F46E5] to-[#3730A3]",
    particleColor: "#6366F1",
    status: "Active",
    disabled: false,
  },
  {
    id: "mentor-dashboard",
    title: "Mentor Dashboard",
    description: "Track mentor load, feedback reports, and student follow-up metrics.",
    href: "/dashboard/general-manager/leaderboard/mentor",
    icon: Users,
    gradient: "from-[#0D9488] via-[#0F766E] to-[#115E59]",
    glow: "rgba(20,184,166,0.28)",
    glowHover: "rgba(20,184,166,0.52)",
    badgeColor: "from-[#0D9488] to-[#115E59]",
    particleColor: "#14B8A6",
    status: "Active",
    disabled: false,
  },
];

// Floating particle component
function FloatingParticle({ color, delay, x, y }: { color: string; delay: number; x: number; y: number }) {
  const repeatDelay = 1 + (delay % 3);
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: 4, height: 4, background: color, opacity: 0 }}
      animate={{ y: [0, -30, -60], opacity: [0, 0.8, 0], scale: [0.5, 1, 0.3] }}
      transition={{ duration: 2.5, delay, repeat: Infinity, repeatDelay }}
    />
  );
}

// 3D tilt card
function TiltCard({ option, index }: { option: any; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = { stiffness: 200, damping: 20 };
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [12, -12]), springConfig);
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-12, 12]), springConfig);
  const glowX = useSpring(useTransform(rawX, [-0.5, 0.5], [0, 100]), springConfig);
  const glowY = useSpring(useTransform(rawY, [-0.5, 0.5], [0, 100]), springConfig);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (option.disabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rawX.set(x);
    rawY.set(y);
  }, [rawX, rawY, option.disabled]);

  const handleMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    setIsHovered(false);
  }, [rawX, rawY]);

  const Icon = option.icon;
  const [particles, setParticles] = useState<{ x: number; y: number; delay: number }[]>([]);
  useEffect(() => {
    if (option.disabled) return;
    setParticles(
      Array.from({ length: 8 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: i * 0.3,
      }))
    );
  }, [option.disabled]);

  const CardContent = (
    <div
      className={`relative overflow-hidden rounded-3xl border h-full flex flex-col ${
        option.disabled ? "opacity-60 cursor-not-allowed select-none" : ""
      }`}
      style={{
        background: isDark
          ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
          : `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.5)",
        boxShadow: isDark
          ? isHovered && !option.disabled
            ? `0 30px 80px -10px ${option.glowHover}, 0 0 0 1px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15)`
            : `0 10px 40px -10px ${option.glow}, 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.08)`
          : isHovered && !option.disabled
            ? `0 20px 60px -10px ${option.glowHover}, 0 4px 20px -4px rgba(0,0,0,0.05), 0 0 0 1.5px ${option.particleColor}55`
            : `0 8px 32px -4px rgba(31,38,135,0.1), 0 0 0 1px rgba(255,255,255,0.4)`,
        transition: "box-shadow 0.4s ease, border-color 0.3s ease",
      }}
    >
      {/* Animated gradient background */}
      {!option.disabled && (
        <motion.div
          className="absolute inset-0 opacity-0 pointer-events-none"
          animate={{ opacity: isHovered ? (isDark ? 0.12 : 0.08) : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${option.particleColor} 0%, transparent 60%)`,
          }}
        />
      )}

      {/* Shimmer line */}
      {!option.disabled && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${option.particleColor} 50%, transparent 100%)`,
            opacity: isHovered ? 0.8 : (isDark ? 0.3 : 0.5),
          }}
          animate={isHovered ? { scaleX: [0.5, 1, 0.5] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Floating particles */}
      {!option.disabled && particles.map((p, i) => (
        <FloatingParticle key={i} color={option.particleColor} delay={p.delay} x={p.x} y={p.y} />
      ))}

      {/* 3D depth layer */}
      <div className="relative p-7 md:p-8 flex flex-col flex-1" style={{ transform: option.disabled ? "none" : "translateZ(20px)" }}>
        {/* Top row */}
        <div className="flex items-start justify-between mb-6 pointer-events-none">
          <motion.div
            className="relative"
            animate={isHovered && !option.disabled ? { y: -4 } : { y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ transform: option.disabled ? "none" : "translateZ(30px)" }}
          >
            <Icon
              className="h-14 w-14 transition-all duration-300"
              style={{
                color: option.disabled ? "#94A3B8" : option.particleColor,
                filter: isHovered && !option.disabled
                  ? `drop-shadow(0 0 14px ${option.particleColor}) drop-shadow(0 4px 10px ${option.glow})`
                  : option.disabled ? "none" : `drop-shadow(0 2px 6px ${option.glow})`,
              }}
            />
          </motion.div>

          <motion.div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
              option.disabled
                ? "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                : `bg-gradient-to-r ${option.badgeColor} text-white`
            } text-xs font-bold shadow-md`}
            animate={isHovered && !option.disabled ? { scale: 1.05, y: -2 } : { scale: 1, y: 0 }}
            style={{ transform: option.disabled ? "none" : "translateZ(25px)" }}
          >
            {!option.disabled && <Star className="h-3 w-3 fill-white" />}
            {option.status}
          </motion.div>
        </div>

        {/* Content */}
        <div style={{ transform: option.disabled ? "none" : "translateZ(15px)" }} className="flex-1 flex flex-col pointer-events-none">
          <h2
            className="text-xl md:text-2xl font-black mb-2 leading-tight"
            style={{ color: isDark ? "#ffffff" : "#111827" }}
          >
            {option.title}
          </h2>
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: isDark ? "rgba(255,255,255,0.65)" : "#4B5563" }}
          >
            {option.description}
          </p>
        </div>

        {/* Action Area */}
        <div style={{ transform: option.disabled ? "none" : "translateZ(25px)" }} className="mt-auto">
          {option.disabled ? (
            <div
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-800/10 dark:bg-white/5 border border-slate-700/20 dark:border-white/10 text-slate-400 text-sm font-bold shadow-sm cursor-not-allowed"
            >
              <Lock className="h-4 w-4" />
              Locked
            </div>
          ) : (
            <Link href={option.href} className="inline-block relative z-10">
              <motion.div
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r ${option.gradient} text-white text-sm font-bold shadow-lg`}
                animate={isHovered ? { x: 4 } : { x: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  boxShadow: isHovered ? `0 8px 24px -4px ${option.glowHover}` : `0 4px 12px -2px ${option.glow}`,
                }}
              >
                <Sparkles className="h-4 w-4" />
                Open Dashboard
                <ChevronRight className="h-4 w-4" />
              </motion.div>
            </Link>
          )}
        </div>
      </div>

      {/* Corner decoration */}
      {!option.disabled && (
        <div
          className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none"
          style={{
            opacity: isDark ? 0.05 : 0.08,
            background: `radial-gradient(circle at 100% 100%, ${option.particleColor} 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );

  if (option.disabled) {
    return (
      <div className="h-full">
        {CardContent}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.23, 1, 0.32, 1] }}
      style={{ perspective: 1000 }}
      className="h-full"
    >
      <motion.div
        ref={cardRef}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="h-full"
      >
        {CardContent}
      </motion.div>
    </motion.div>
  );
}

// Animated background orb
function BackgroundOrb({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none blur-[80px]"
      style={{ left: x, top: y, width: size, height: size, background: color, opacity: isDark ? 0.15 : 0.08 }}
      animate={{ scale: [1, 1.2, 1], opacity: isDark ? [0.1, 0.2, 0.1] : [0.05, 0.12, 0.05] }}
      transition={{ duration: 8 + delay, repeat: Infinity, delay }}
    />
  );
}

export default function GMLeaderboardsSelectorPage() {
  return (
    <div className="relative min-h-[70vh] w-full overflow-hidden rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 p-6 md:p-10 border border-slate-200/50 dark:border-white/5 shadow-xl">
      {/* Background ambient orbs */}
      <BackgroundOrb x="5%" y="10%" size={400} color="#4338CA" delay={0} />
      <BackgroundOrb x="60%" y="20%" size={350} color="#6366F1" delay={2} />
      <BackgroundOrb x="70%" y="60%" size={450} color="#4F46E5" delay={4} />

      <div className="relative max-w-5xl mx-auto space-y-8 z-10">
        {/* Header */}
        <div className="space-y-4">
          <BreadcrumbNav />

          <motion.div
            className="flex items-center gap-5"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Trophy with 3D animation */}
            <motion.div
              className="relative"
              animate={{ rotateY: [0, 15, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ perspective: 400 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4F46E5] via-[#4338CA] to-[#3730A3] flex items-center justify-center shadow-2xl shadow-[#4338CA]/40 ring-1 ring-white/20">
                <Trophy className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)" }}
              />
            </motion.div>

            <div>
              <motion.h1
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #3730A3 0%, #4338CA 45%, #4F46E5 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Dashboards
              </motion.h1>
              <motion.p
                className="text-base text-slate-600 dark:text-slate-400 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                Choose which dashboard you want to open.
              </motion.p>
            </div>
          </motion.div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-stretch mt-8">
          {OPTIONS.map((option, index) => (
            <TiltCard key={option.id} option={option} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
