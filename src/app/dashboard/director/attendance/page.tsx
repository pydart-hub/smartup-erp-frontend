"use client";

import { type ComponentType } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { GraduationCap, Briefcase, ChevronRight, Sparkles } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";

// ─── Logo palette ─────────────────────────────────────────────────────────────
const TEAL   = "#673AB7";
const GREEN  = "#7E57C2";
const AQUA   = "#512DA8";

// ─── 3-D tilt card ────────────────────────────────────────────────────────────
function TiltCard({
  href,
  label,
  description,
  icon: Icon,
  gradientFrom,
  gradientTo,
  delay,
  badge,
}: {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  gradientFrom: string;
  gradientTo: string;
  delay: number;
  badge: string;
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 260, damping: 28 });
  const sy = useSpring(my, { stiffness: 260, damping: 28 });
  const rotX = useTransform(sy, [-0.5, 0.5], ["14deg", "-14deg"]);
  const rotY = useTransform(sx, [-0.5, 0.5], ["-14deg", "14deg"]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width  / 2)) / r.width);
    my.set((e.clientY - (r.top  + r.height / 2)) / r.height);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: "900px" }}
    >
      <motion.div
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        onMouseMove={onMove}
        onMouseLeave={() => { mx.set(0); my.set(0); }}
      >
        <Link href={href} className="block group">
          {/* Gradient border shell */}
          <div
            className="relative rounded-2xl p-[2px] transition-all duration-500"
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
              boxShadow: `0 8px 40px 0 ${gradientFrom}33`,
            }}
          >
            {/* Inner card */}
            <div className="relative overflow-hidden rounded-[14px] bg-white/95 dark:bg-[#0c1829]/95 backdrop-blur-xl p-6 h-full">

              {/* Soft background glow */}
              <div
                className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full blur-3xl opacity-15 transition-opacity duration-500 group-hover:opacity-30"
                style={{ background: `radial-gradient(circle, ${gradientFrom}, ${gradientTo})` }}
              />

              {/* Badge */}
              <div
                className="mb-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                style={{ background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` }}
              >
                <Sparkles className="h-2.5 w-2.5" />
                {badge}
              </div>

              {/* Icon */}
              <div style={{ transform: "translateZ(24px)" }} className="relative z-10 mb-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
                >
                  <Icon className="h-8 w-8 text-white drop-shadow" />
                </div>
              </div>

              {/* Text */}
              <div style={{ transform: "translateZ(16px)" }} className="relative z-10">
                <h3 className="text-xl font-bold text-text-primary">{label}</h3>
                <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">{description}</p>
              </div>

              {/* CTA */}
              <div
                style={{ transform: "translateZ(10px)" }}
                className="relative z-10 mt-5 flex items-center gap-1.5"
              >
                <span
                  className="text-sm font-semibold bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` }}
                >
                  View Report
                </span>
                <motion.div
                  className="group-hover:translate-x-1 transition-transform duration-300"
                >
                  <ChevronRight className="h-4 w-4" style={{ color: gradientFrom }} />
                </motion.div>
              </div>

              {/* Bottom shimmer line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${gradientFrom}, ${gradientTo}, transparent)` }}
              />
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ─── Options ──────────────────────────────────────────────────────────────────
const OPTIONS = [
  {
    label: "Students",
    description: "View and analyze student attendance across all branches and class batches",
    href: "/dashboard/director/attendance/students",
    icon: GraduationCap,
    gradientFrom: TEAL,
    gradientTo: AQUA,
    badge: "All Branches",
    delay: 0.35,
  },
  {
    label: "Staff",
    description: "Monitor and track staff attendance records across all branches",
    href: "/dashboard/director/attendance/staff",
    icon: Briefcase,
    gradientFrom: GREEN,
    gradientTo: TEAL,
    badge: "All Staff",
    delay: 0.5,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DirectorAttendancePage() {
  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-2xl font-bold text-text-primary">Attendance</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Real-time tracking for students &amp; staff across every branch
        </p>
      </motion.div>

      {/* Tilt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {OPTIONS.map((opt) => (
          <TiltCard key={opt.href} {...opt} />
        ))}
      </div>
    </div>
  );
}

