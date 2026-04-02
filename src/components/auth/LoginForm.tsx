"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";

interface LoginFormProps {
  variant?: "light" | "dark";
}

export function LoginForm({ variant = "light" }: LoginFormProps) {
  const isDark = variant === "dark";
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormValues) {
    try {
      setServerError("");
      await login({ email: data.email, password: data.password });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      setServerError(err.response?.data?.error || err.message || "Login failed. Please try again.");
    }
  }

  const inputBase = isDark
    ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:border-primary/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(26,158,143,0.12)]"
    : "bg-surface border border-border-input text-text-primary placeholder:text-text-tertiary focus:border-primary focus:shadow-[0_0_0_3px_rgba(26,158,143,0.12)]";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Server Error */}
      <AnimatePresence>
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl bg-red-500/10 border border-red-500/15 px-4 py-3 flex items-start gap-2.5"
          >
            <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-red-400 font-medium">{serverError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email */}
      <div className="space-y-2">
        <label className={`block text-[13px] font-medium ${isDark ? "text-white/60" : "text-text-primary"}`}>
          Email address
        </label>
        <input
          type="email"
          placeholder="you@smartup.com"
          autoComplete="email"
          className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 ${inputBase}`}
          {...register("email")}
        />
        {errors.email?.message && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={`block text-[13px] font-medium ${isDark ? "text-white/60" : "text-text-primary"}`}>
            Password
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-medium text-primary/80 hover:text-primary transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            className={`w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all duration-200 ${inputBase}`}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 ${isDark ? "text-white/30 hover:text-white/60 hover:bg-white/5" : "text-text-tertiary hover:text-text-secondary hover:bg-black/5"} transition-all`}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password?.message && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group w-full relative flex items-center justify-center gap-2 rounded-xl text-white font-semibold py-3.5 px-6 text-sm transition-all duration-300 disabled:opacity-50 overflow-hidden bg-gradient-to-r from-primary to-[#2DD4BF] shadow-[0_4px_20px_-4px_rgba(26,158,143,0.5)] hover:shadow-[0_6px_28px_-4px_rgba(26,158,143,0.65)] hover:scale-[1.01] active:scale-[0.99]"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
