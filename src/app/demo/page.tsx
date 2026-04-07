"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, GraduationCap, Building2, Users, BookOpen, CreditCard, BarChart3, Bell, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const DEMO_ROLES = [
  {
    id: "parent",
    title: "Parent Portal",
    subtitle: "Experience the parent dashboard",
    description:
      "View your child's attendance, fee status, academic progress, and communicate with teachers — all in one place.",
    icon: Users,
    color: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/25",
    href: "/demo/parent",
    features: [
      { icon: BookOpen, label: "Academic Progress" },
      { icon: CreditCard, label: "Fee & Payments" },
      { icon: Bell, label: "Notifications" },
      { icon: MessageSquare, label: "Communication" },
    ],
  },
  {
    id: "branch-manager",
    title: "Branch Manager Portal",
    subtitle: "Experience the branch manager dashboard",
    description:
      "Manage students, staff, admissions, fees, and track branch performance with real-time analytics.",
    icon: Building2,
    color: "from-primary to-[#2DD4BF]",
    shadow: "shadow-primary/25",
    href: "/demo/branch-manager",
    features: [
      { icon: Users, label: "Student Management" },
      { icon: BarChart3, label: "Analytics & Reports" },
      { icon: CreditCard, label: "Fee Collection" },
      { icon: GraduationCap, label: "Academics" },
    ],
  },
];

export default function DemoSelectionPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a1a18] relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-6 py-6 flex items-center justify-between">
        <button
          onClick={() => router.push("/auth/login")}
          className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>
        <ThemeToggle />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pb-16">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <Image
              src="/smartup-logo.png"
              alt="SmartUp"
              width={36}
              height={36}
              className="object-contain"
            />
            <span className="text-white/60 text-sm font-semibold tracking-widest uppercase">
              SmartUp Demo
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Choose Your <span className="text-primary">Experience</span>
          </h1>
          <p className="text-white/40 text-base max-w-md mx-auto">
            Explore SmartUp with sample data. No login required.
          </p>
        </motion.div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
          {DEMO_ROLES.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                onClick={() => router.push(role.href)}
                className="group text-left rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm p-6 sm:p-7 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
              >
                {/* Icon + Title */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center shrink-0 ${role.shadow} shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                      {role.title}
                    </h3>
                    <p className="text-white/35 text-sm">{role.subtitle}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-white/45 text-sm leading-relaxed mb-5">
                  {role.description}
                </p>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {role.features.map((feat) => {
                    const FeatIcon = feat.icon;
                    return (
                      <span
                        key={feat.label}
                        className="inline-flex items-center gap-1.5 text-[11px] text-white/35 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1"
                      >
                        <FeatIcon className="w-3 h-3" />
                        {feat.label}
                      </span>
                    );
                  })}
                </div>

                {/* CTA */}
                <div
                  className={`inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${role.color} bg-clip-text text-transparent group-hover:gap-3 transition-all duration-200`}
                >
                  Explore Demo
                  <svg
                    className="w-4 h-4 text-primary transition-transform duration-200 group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-white/20 text-xs text-center"
        >
          This demo uses sample data only. No real student or financial information is displayed.
        </motion.p>
      </div>
    </div>
  );
}
