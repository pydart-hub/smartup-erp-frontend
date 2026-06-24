"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Trophy, School, Users, Star, ChevronRight, Sparkles, CalendarDays } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { useRef, useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";

const OPTIONS = [
  {
    id: "branch",
    type: "single",
    title: "Branch Leaderboard",
    description: "View branch-wise ranking, targets, and performance insights.",
    href: "/dashboard/director/leaderboard/branch",
    icon: School,
    gradient: "from-[#7E57C2] via-[#673AB7] to-[#512DA8]",
    glow: "rgba(103,58,183,0.28)",
    glowHover: "rgba(103,58,183,0.52)",
    badgeColor: "from-[#7E57C2] to-[#512DA8]",
    particleColor: "#7E57C2",
    rank: "1st",
  },
  {
    id: "instructor",
    type: "split",
    title: "Instructor Leaderboard",
    description: "Discover top-performing instructors by student results.",
    icon: Users,
    gradient: "from-[#7E57C2] via-[#673AB7] to-[#512DA8]",
    glow: "rgba(103,58,183,0.28)",
    glowHover: "rgba(103,58,183,0.52)",
    badgeColor: "from-[#7E57C2] to-[#673AB7]",
    particleColor: "#673AB7",
    rank: "2nd",
    splits: [
      { title: "Monthly", href: "/dashboard/director/leaderboard/instructor?period=month", icon: CalendarDays },
      { title: "All Time", href: "/dashboard/director/leaderboard/instructor?period=all", icon: Users },
    ]
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
  const [particles, setParticles] = useState<{ x: number; y: number; delay: number }[]>([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: 8 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: i * 0.3,
      }))
    );
  }, []);

  const CardContent = (
    <div
      className="relative overflow-hidden rounded-3xl border h-full flex flex-col"
      style={{
        background: isDark
          ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
          : `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.5)",
        boxShadow: isDark
          ? isHovered
            ? `0 30px 80px -10px ${option.glowHover}, 0 0 0 1px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15)`
            : `0 10px 40px -10px ${option.glow}, 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.08)`
          : isHovered
            ? `0 20px 60px -10px ${option.glowHover}, 0 4px 20px -4px rgba(0,0,0,0.05), 0 0 0 1.5px ${option.particleColor}55`
            : `0 8px 32px -4px rgba(31,38,135,0.1), 0 0 0 1px rgba(255,255,255,0.4)`,
        transition: "box-shadow 0.4s ease, border-color 0.3s ease",
      }}
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 opacity-0 pointer-events-none"
        animate={{ opacity: isHovered ? (isDark ? 0.12 : 0.08) : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${option.particleColor} 0%, transparent 60%)`,
        }}
      />

      {/* Shimmer line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${option.particleColor} 50%, transparent 100%)`,
          opacity: isHovered ? 0.8 : (isDark ? 0.3 : 0.5),
        }}
        animate={isHovered ? { scaleX: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <FloatingParticle key={i} color={option.particleColor} delay={p.delay} x={p.x} y={p.y} />
      ))}

      {/* 3D depth layer */}
      <div className="relative p-7 md:p-8 flex flex-col flex-1" style={{ transform: "translateZ(20px)" }}>
        {/* Top row */}
        <div className="flex items-start justify-between mb-6 pointer-events-none">
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
        <div style={{ transform: "translateZ(15px)" }} className="flex-1 flex flex-col pointer-events-none">
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
        <div style={{ transform: "translateZ(25px)" }} className="mt-auto">
          {option.type === "single" ? (
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
                Open Leaderboard
                <ChevronRight className="h-4 w-4" />
              </motion.div>
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-3 relative z-10">
              {option.splits.map((split: any, idx: number) => {
                const SplitIcon = split.icon;
                return (
                  <Link href={split.href} key={idx} className="block">
                    <motion.div
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`
                        flex flex-col items-center justify-center p-4 rounded-2xl border transition-all
                        ${isDark 
                          ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20' 
                          : 'bg-white/50 border-white/60 hover:bg-white/80 hover:border-white'
                        }
                      `}
                      style={{
                        boxShadow: isHovered ? `0 8px 24px -4px ${option.glow}` : `0 4px 12px -2px rgba(0,0,0,0.05)`,
                      }}
                    >
                      <SplitIcon className={`h-6 w-6 mb-2`} style={{ color: option.particleColor }} />
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {split.title}
                      </span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Corner decoration */}
      <div
        className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none"
        style={{
          opacity: isDark ? 0.05 : 0.08,
          background: `radial-gradient(circle at 100% 100%, ${option.particleColor} 0%, transparent 70%)`,
        }}
      />
    </div>
  );

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

export default function DirectorLeaderboardIndexPage() {
  return (
    <div className="relative min-h-[70vh] w-full overflow-hidden rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 p-6 md:p-10 border border-slate-200/50 dark:border-white/5 shadow-xl">
      {/* Background ambient orbs */}
      <BackgroundOrb x="5%" y="10%" size={400} color="#512DA8" delay={0} />
      <BackgroundOrb x="60%" y="20%" size={350} color="#7E57C2" delay={2} />
      <BackgroundOrb x="70%" y="60%" size={450} color="#673AB7" delay={4} />

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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7E57C2] via-[#673AB7] to-[#512DA8] flex items-center justify-center shadow-2xl shadow-[#673AB7]/40 ring-1 ring-white/20">
                <Trophy className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ background: "radial-gradient(circle, rgba(103,58,183,0.4) 0%, transparent 70%)" }}
              />
            </motion.div>

            <div>
              <motion.h1
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #512DA8 0%, #673AB7 45%, #7E57C2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Leaderboards
              </motion.h1>
              <motion.p
                className="text-base text-slate-600 dark:text-slate-400 mt-1"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-stretch mt-8">
          {OPTIONS.map((option, index) => (
            <TiltCard key={option.id} option={option} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
