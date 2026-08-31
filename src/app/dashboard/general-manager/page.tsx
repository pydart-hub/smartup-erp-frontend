"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  BookOpen,
  ClipboardCheck,
  Trophy,
  Calendar,
  Users,
  GraduationCap,
  MessageSquareWarning,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

interface CardItem {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  theme: {
    bg: string;
    border: string;
    hoverBorder: string;
    iconColor: string;
    glow: string;
  };
}

const cards: CardItem[] = [
  {
    title: "Academics",
    desc: "All branches overview with drill-down",
    icon: BookOpen,
    href: "/dashboard/general-manager/academics",
    theme: {
      bg: "bg-indigo-50/70 dark:bg-indigo-950/30",
      border: "border-indigo-100 dark:border-indigo-900/40",
      hoverBorder: "hover:border-indigo-400 dark:hover:border-indigo-500",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      glow: "rgba(99, 102, 241, 0.18)",
    },
  },
  {
    title: "Attendance",
    desc: "Branch-wise attendance analytics",
    icon: ClipboardCheck,
    href: "/dashboard/general-manager/attendance",
    theme: {
      bg: "bg-emerald-50/70 dark:bg-emerald-950/30",
      border: "border-emerald-100 dark:border-emerald-900/40",
      hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-500",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      glow: "rgba(16, 185, 129, 0.18)",
    },
  },
  {
    title: "Actions Needed",
    desc: "Weekly branch-wise follow-ups to close",
    icon: MessageSquareWarning,
    href: "/dashboard/general-manager/actions-needed",
    theme: {
      bg: "bg-rose-50/70 dark:bg-rose-950/30",
      border: "border-rose-100 dark:border-rose-900/40",
      hoverBorder: "hover:border-rose-400 dark:hover:border-rose-500",
      iconColor: "text-rose-600 dark:text-rose-400",
      glow: "rgba(244, 63, 94, 0.18)",
    },
  },
  {
    title: "Exams",
    desc: "Exam performance across branches",
    icon: Trophy,
    href: "/dashboard/general-manager/exams",
    theme: {
      bg: "bg-amber-50/70 dark:bg-amber-950/30",
      border: "border-amber-100 dark:border-amber-900/40",
      hoverBorder: "hover:border-amber-400 dark:hover:border-amber-500",
      iconColor: "text-amber-600 dark:text-amber-400",
      glow: "rgba(245, 158, 11, 0.18)",
    },
  },
  {
    title: "Schedule",
    desc: "Class schedules & topic coverage",
    icon: Calendar,
    href: "/dashboard/general-manager/course-schedule",
    theme: {
      bg: "bg-sky-50/70 dark:bg-sky-950/30",
      border: "border-sky-100 dark:border-sky-900/40",
      hoverBorder: "hover:border-sky-400 dark:hover:border-sky-500",
      iconColor: "text-sky-600 dark:text-sky-400",
      glow: "rgba(14, 165, 233, 0.18)",
    },
  },
  {
    title: "Instructors",
    desc: "Instructor performance metrics",
    icon: Users,
    href: "/dashboard/general-manager/instructors",
    theme: {
      bg: "bg-violet-50/70 dark:bg-violet-950/30",
      border: "border-violet-100 dark:border-violet-900/40",
      hoverBorder: "hover:border-violet-400 dark:hover:border-violet-500",
      iconColor: "text-violet-600 dark:text-violet-400",
      glow: "rgba(139, 92, 246, 0.18)",
    },
  },
  {
    title: "Topic Coverage",
    desc: "Curriculum progress tracking",
    icon: GraduationCap,
    href: "/dashboard/general-manager/topic-coverage",
    theme: {
      bg: "bg-orange-50/70 dark:bg-orange-950/30",
      border: "border-orange-100 dark:border-orange-900/40",
      hoverBorder: "hover:border-orange-400 dark:hover:border-orange-500",
      iconColor: "text-orange-600 dark:text-orange-400",
      glow: "rgba(249, 115, 22, 0.18)",
    },
  },
  {
    title: "Mentor Summary",
    desc: "Cross-branch mentor load & coverage",
    icon: Users,
    href: "/dashboard/general-manager/mentor-summary",
    theme: {
      bg: "bg-teal-50/70 dark:bg-teal-950/30",
      border: "border-teal-100 dark:border-teal-900/40",
      hoverBorder: "hover:border-teal-400 dark:hover:border-teal-500",
      iconColor: "text-teal-600 dark:text-teal-400",
      glow: "rgba(20, 184, 166, 0.18)",
    },
  },
  {
    title: "Mentor Feedback",
    desc: "Student follow-up logs & notes",
    icon: ClipboardCheck,
    href: "/dashboard/general-manager/mentor-feedback",
    theme: {
      bg: "bg-cyan-50/70 dark:bg-cyan-950/30",
      border: "border-cyan-100 dark:border-cyan-900/40",
      hoverBorder: "hover:border-cyan-400 dark:hover:border-cyan-500",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      glow: "rgba(6, 182, 212, 0.18)",
    },
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const cardItemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 280,
      damping: 22,
    },
  },
};

function Interactive3DCard({ card }: { card: CardItem }) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 240, mass: 0.5 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), springConfig);
  
  const glareX = useSpring(useTransform(x, [-0.5, 0.5], [10, 90]), springConfig);
  const glareY = useSpring(useTransform(y, [-0.5, 0.5], [10, 90]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      variants={cardItemVariants}
      style={{ perspective: 1000 }}
      className="h-full"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => router.push(card.href)}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? `0 14px 28px -8px ${card.theme.glow}, 0 4px 10px -4px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9)`
            : "0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px -1px rgba(15, 23, 42, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.75)",
        }}
        whileHover={{
          scale: 1.02,
          transition: { duration: 0.2, ease: "easeOut" },
        }}
        whileTap={{
          scale: 0.98,
        }}
        className={`group relative h-full flex flex-col justify-between text-left cursor-pointer select-none rounded-xl p-4 bg-white dark:bg-[#151c2c] transition-colors duration-200 border border-slate-200/70 dark:border-slate-800/80 ${card.theme.hoverBorder}`}
      >
        {/* Soft 3D glare light effect on hover */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden"
          style={{
            background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
          }}
        />

        {/* Card Content with 3D Depth */}
        <div style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }}>
          {/* Top Row: Compact Minimal Icon + Micro Action Arrow */}
          <div className="flex items-center justify-between mb-3">
            {/* Minimal Soft-Tinted 3D Icon Tile */}
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.theme.bg} ${card.theme.border} border shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_2px_4px_rgba(0,0,0,0.03)] group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),_0_4px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ${card.theme.iconColor}`}
              style={{ transform: "translateZ(15px)" }}
            >
              <card.icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
            </div>

            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-all duration-200"
              style={{ transform: "translateZ(10px)" }}
            >
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>

          {/* Title & Description */}
          <div style={{ transform: "translateZ(15px)" }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-slate-950 dark:group-hover:text-white transition-colors duration-200">
              {card.title}
            </h3>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 leading-snug font-normal line-clamp-2">
              {card.desc}
            </p>
          </div>
        </div>

        {/* Micro footer hint */}
        <div
          className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10.5px] font-medium text-slate-400 dark:text-slate-500"
          style={{ transform: "translateZ(10px)" }}
        >
          <span className="group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
            View details
          </span>
          <span className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 text-slate-400">
            →
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function GeneralManagerDashboard() {
  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            General Manager Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Cross-branch academic oversight — all 9 branches at a glance
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
          <Sparkles className="w-3 h-3 text-slate-500 dark:text-slate-400" />
          <span>Interactive View</span>
        </div>
      </div>

      {/* Compact 3D Animated Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4"
      >
        {cards.map((card) => (
          <Interactive3DCard key={card.title} card={card} />
        ))}
      </motion.div>
    </div>
  );
}


