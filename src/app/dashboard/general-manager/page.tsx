"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, ClipboardCheck, Trophy, Calendar, Users, GraduationCap } from "lucide-react";

const cards = [
  { title: "Academics", desc: "All branches overview with drill-down", icon: BookOpen, href: "/dashboard/general-manager/academics", color: "bg-primary/10 text-primary" },
  { title: "Attendance", desc: "Branch-wise attendance analytics", icon: ClipboardCheck, href: "/dashboard/general-manager/attendance", color: "bg-success/10 text-success" },
  { title: "Exams", desc: "Exam performance across branches", icon: Trophy, href: "/dashboard/general-manager/exams", color: "bg-warning/10 text-warning" },
  { title: "Schedule", desc: "Class schedules & topic coverage", icon: Calendar, href: "/dashboard/general-manager/course-schedule", color: "bg-info/10 text-info" },
  { title: "Instructors", desc: "Instructor performance metrics", icon: Users, href: "/dashboard/general-manager/instructors", color: "bg-purple-100 text-purple-700" },
  { title: "Topic Coverage", desc: "Curriculum progress tracking", icon: GraduationCap, href: "/dashboard/general-manager/topic-coverage", color: "bg-orange-100 text-orange-700" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function GeneralManagerDashboard() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary">General Manager Dashboard</h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Cross-branch academic oversight — all 9 branches at a glance
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {cards.map((card) => (
          <motion.button
            key={card.title}
            variants={item}
            onClick={() => router.push(card.href)}
            className="text-left bg-surface rounded-[12px] border border-border-light p-5 hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors">
              {card.title}
            </p>
            <p className="text-xs text-text-tertiary mt-1">{card.desc}</p>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
