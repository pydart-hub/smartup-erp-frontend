"use client";

import { motion } from "framer-motion";
import { GraduationCap, KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-app-bg flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-hover relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
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
              Don&apos;t worry, it happens! We&apos;ll help you get back into your account.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Forgot Password Form */}
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
            <div className="mb-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-[12px] bg-primary-light flex items-center justify-center shrink-0">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Reset Password</h2>
                <p className="text-text-secondary mt-1">We&apos;ll send you a reset link</p>
              </div>
            </div>
            <ForgotPasswordForm />
          </div>

          <p className="text-center text-xs text-text-tertiary mt-6">
            Smartup Education Platform &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
