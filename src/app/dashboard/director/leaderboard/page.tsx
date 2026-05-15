"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Trophy, School, Users, Star, ChevronRight, Sparkles } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { useRef, useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";

const OPTIONS = [
  {
    title: "Branch Leaderboard",
    description: "View branch-wise ranking, targets, and performance insights.",
    href: "/dashboard/director/leaderboard/branch",
    icon: School,
    gradient: "from-teal-500 via-teal-600 to-cyan-600",
    glow: "rgba(26,158,143,0.28)",
    glowHover: "rgba(26,158,143,0.52)",
    badge: "#1",
    badgeColor: "from-teal-500 to-cyan-600",
    particleColor: "#2dd4bf",
    rank: "1st",
  },
  {
    title: "Instructor Leaderboard",
    description: "Discover top-performing instructors by student results.",
    href: "/dashboard/director/leaderboard/instructor",
    icon: Users,
    gradient: "from-emerald-500 via-teal-600 to-teal-700",
    glow: "rgba(16,185,129,0.28)",
    glowHover: "rgba(16,185,129,0.52)",
    badge: "#2",
    badgeColor: "from-emerald-500 to-teal-600",
    particleColor: "#34d399",
    rank: "2nd",
  },
];

// Floating particle component
function FloatingParticle({ color, delay, x, y }: { color: string; delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: 4, height: 4, background: color, opacity: 0 }}
      animate={{ y: [0, -30, -60], opacity: [0, 0.8, 0], scale: [0.5, 1, 0.3] }}
      transition={{ duration: 2.5, delay, repeat: Infinity, repeatDelay: Math.random() * 3 + 1 }}
    />
  );
}

// 3D tilt card
function TiltCard({ option, index }: { option: typeof OPTIONS[0]; index: number }) {
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
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rawX.set(x);
    rawY.set(y);
  }, [rawX, rawY]);

  const handleMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    setIsHovered(false);
  }, [rawX, rawY]);

  const Icon = option.icon;
  const particles = Array.from({ length: 8 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: i * 0.3,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.23, 1, 0.32, 1] }}
      style={{ perspective: 1000 }}
    >
      <motion.div
        ref={cardRef}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Link href={option.href} className="block">
          <div
            className="relative overflow-hidden rounded-3xl border cursor-pointer"
            style={{
              background: isDark
                ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
                : `linear-gradient(135deg, #ffffff 0%, #ffffff 60%, ${option.particleColor}18 100%)`,
              backdropFilter: isDark ? "blur(20px)" : "none",
              borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)",
              boxShadow: isDark
                ? isHovered
                  ? `0 30px 80px -10px ${option.glowHover}, 0 0 0 1px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15)`
                  : `0 10px 40px -10px ${option.glow}, 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.08)`
                : isHovered
                  ? `0 20px 60px -10px ${option.glow}, 0 4px 20px -4px rgba(0,0,0,0.08), 0 0 0 1.5px ${option.particleColor}55`
                  : `0 2px 12px -2px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)`,
              transition: "box-shadow 0.4s ease, border-color 0.3s ease",
            }}
          >
            {/* Animated gradient background */}
            <motion.div
              className="absolute inset-0 opacity-0"
              animate={{ opacity: isHovered ? (isDark ? 0.12 : 0.06) : 0 }}
              transition={{ duration: 0.3 }}
              style={{
                background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${option.particleColor} 0%, transparent 60%)`,
              }}
            />

            {/* Shimmer line */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${option.particleColor} 50%, transparent 100%)`,
                opacity: isHovered ? 0.8 : (isDark ? 0.3 : 0.5),
              }}
              animate={isHovered ? { scaleX: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Floating rising particles — both themes */}
            {particles.map((p, i) => (
              <FloatingParticle key={i} color={option.particleColor} delay={p.delay} x={p.x} y={p.y} />
            ))}

            {/* 3D depth layer */}
            <div className="relative p-7 md:p-8" style={{ transform: "translateZ(20px)" }}>
              {/* Top row */}
              <div className="flex items-start justify-between mb-6">
                {/* Icon with 3D effect */}
                <motion.div
                  className="relative"
                  animate={isHovered ? { y: -4 } : { y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ transform: "translateZ(30px)" }}
                >
                  <Icon
                    className="h-14 w-14 transition-all duration-300"
                    style={{
                      color: option.particleColor,
                      filter: isHovered
                        ? `drop-shadow(0 0 14px ${option.particleColor}) drop-shadow(0 4px 10px ${option.glow})`
                        : `drop-shadow(0 2px 6px ${option.glow})`,
                    }}
                  />
                </motion.div>

                {/* Badge */}
                <motion.div
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r ${option.badgeColor} text-white text-xs font-bold shadow-lg`}
                  animate={isHovered ? { scale: 1.05, y: -2 } : { scale: 1, y: 0 }}
                  style={{ transform: "translateZ(25px)" }}
                >
                  <Star className="h-3 w-3 fill-white" />
                  {option.rank}
                </motion.div>
              </div>

              {/* Content */}
              <div style={{ transform: "translateZ(15px)" }}>
                <h2
                  className="text-xl md:text-2xl font-black mb-2 leading-tight"
                  style={{ color: isDark ? "#ffffff" : "#111827" }}
                >
                  {option.title}
                </h2>
                <p
                  className="text-sm leading-relaxed mb-5"
                  style={{ color: isDark ? "rgba(255,255,255,0.55)" : "#6B7280" }}
                >
                  {option.description}
                </p>

                {/* CTA */}
                <motion.div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${option.gradient} text-white text-sm font-bold shadow-lg`}
                  animate={isHovered ? { x: 4 } : { x: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    boxShadow: isHovered ? `0 8px 24px -4px ${option.glowHover}` : `0 4px 12px -2px ${option.glow}`,
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Open Leaderboard
                  <ChevronRight className="h-3.5 w-3.5" />
                </motion.div>
              </div>
            </div>

            {/* Corner decoration */}
            <div
              className="absolute bottom-0 right-0 w-32 h-32"
              style={{
                opacity: isDark ? 0.05 : 0.08,
                background: `radial-gradient(circle at 100% 100%, ${option.particleColor} 0%, transparent 70%)`,
              }}
            />
          </div>
        </Link>
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
      className="absolute rounded-full pointer-events-none blur-3xl"
      style={{ left: x, top: y, width: size, height: size, background: color, opacity: isDark ? 0.06 : 0.04 }}
      animate={{ scale: [1, 1.3, 1], opacity: isDark ? [0.04, 0.08, 0.04] : [0.02, 0.05, 0.02] }}
      transition={{ duration: 6 + delay, repeat: Infinity, delay }}
    />
  );
}

export default function DirectorLeaderboardIndexPage() {
  return (
    <div className="relative max-w-6xl mx-auto space-y-8 min-h-[60vh]">
      {/* Background ambient orbs */}
      <BackgroundOrb x="10%" y="20%" size={400} color="#1a9e8f" delay={0} />
      <BackgroundOrb x="60%" y="10%" size={350} color="#34d399" delay={2} />
      <BackgroundOrb x="80%" y="60%" size={300} color="#2dd4bf" delay={4} />

      {/* Header */}
      <div className="space-y-4">
        <BreadcrumbNav />

        <motion.div
          className="flex items-center gap-4"
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 flex items-center justify-center shadow-2xl shadow-teal-500/40">
              <Trophy className="h-7 w-7 text-white drop-shadow-lg" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-2xl"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ background: "radial-gradient(circle, rgba(45,212,191,0.4) 0%, transparent 70%)" }}
            />
          </motion.div>

          <div>
            <motion.h1
              className="text-3xl md:text-4xl font-black"
              style={{
                background: "linear-gradient(135deg, #168577 0%, #1a9e8f 45%, #2dd4bf 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Leaderboard
            </motion.h1>
            <motion.p
              className="text-sm text-text-tertiary mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              Choose which leaderboard you want to open.
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {OPTIONS.map((option, index) => (
          <TiltCard key={option.title} option={option} index={index} />
        ))}
      </div>
    </div>
  );
}
