"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { useFeatureFlagsStore } from "@/lib/stores/featureFlagsStore";

export default function LoginPage() {
  const router = useRouter();
  const { flags } = useFeatureFlagsStore();

  // Dev: if auth is turned off, skip login and go straight to dashboard
  useEffect(() => {
    if (!flags.auth) {
      router.replace("/dashboard/branch-manager");
    }
  }, [flags.auth, router]);

  if (!flags.auth) return null;

  return (
    <div className="min-h-screen bg-app-bg flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-hover relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-16 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-[20px] mb-8 backdrop-blur-sm">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Smartup ERP</h1>
            <p className="text-lg text-white/80 max-w-md leading-relaxed">
              Complete education management platform — students, batches, attendance, and fees in one place.
            </p>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-12 grid grid-cols-2 gap-4 max-w-md w-full"
          >
            {[
              { label: "Student Management", icon: "👨‍🎓" },
              { label: "Batch & Classes", icon: "📚" },
              { label: "Attendance Tracking", icon: "✅" },
              { label: "Fee Management", icon: "💰" },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-[12px] px-4 py-3"
              >
                <span className="text-xl">{feature.icon}</span>
                <span className="text-sm font-medium text-white/90">{feature.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-[16px] mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Smartup ERP</h1>
          </div>

          {/* Form Card */}
          <div className="bg-surface rounded-[20px] shadow-card p-8 border border-border-light">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
              <p className="text-text-secondary mt-1">Sign in to your account to continue</p>
            </div>
            <LoginForm />
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-text-tertiary mt-6">
            Smartup Education Platform &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
