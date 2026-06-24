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
    ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:border-[#673AB7]/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(103,58,183,0.12)]"
    : "bg-[#f1f5f9] border-none text-slate-700 placeholder:text-slate-400 shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] focus:shadow-[inset_6px_6px_12px_rgba(163,177,198,0.7),inset_-6px_-6px_12px_rgba(255,255,255,0.9)]";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
      {/* Server Error */}
      <AnimatePresence>
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl bg-red-500/10 border border-red-500/15 px-4 py-3 flex items-start gap-2.5 shadow-[inset_2px_2px_4px_rgba(239,68,68,0.2)]"
          >
            <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-red-400 font-medium">{serverError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email */}
      <div className="space-y-2.5">
        <label className={`block text-[13px] font-bold tracking-wide ${isDark ? "text-white/60" : "text-slate-600 drop-shadow-[1px_1px_1px_rgba(255,255,255,1)]"}`}>
          Email address
        </label>
        <input
          type="email"
          placeholder="you@smartup.com"
          autoComplete="email"
          className={`w-full rounded-2xl px-5 py-4 text-sm outline-none transition-all duration-300 ${inputBase}`}
          {...register("email")}
        />
        {errors.email?.message && (
          <p className="text-xs text-red-400 font-medium pl-1">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className={`block text-[13px] font-bold tracking-wide ${isDark ? "text-white/60" : "text-slate-600 drop-shadow-[1px_1px_1px_rgba(255,255,255,1)]"}`}>
            Password
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-bold text-[#673AB7] hover:text-[#512DA8] transition-colors drop-shadow-[1px_1px_1px_rgba(255,255,255,1)]"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            className={`w-full rounded-2xl px-5 py-4 pr-12 text-sm outline-none transition-all duration-300 ${inputBase}`}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-xl p-2 ${isDark ? "text-white/30 hover:text-white/60 hover:bg-white/5" : "text-slate-400 hover:text-[#673AB7] active:shadow-[inset_2px_2px_4px_rgba(163,177,198,0.5)]"} transition-all`}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password?.message && (
          <p className="text-xs text-red-400 font-medium pl-1">{errors.password.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-4 pb-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group w-full relative flex items-center justify-center gap-2 rounded-2xl text-white font-bold py-4 px-6 text-sm transition-all duration-300 disabled:opacity-50 bg-gradient-to-br from-[#7E57C2] to-[#673AB7] shadow-[6px_6px_12px_rgba(163,177,198,0.6),-6px_-6px_12px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-2px_4px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_8px_rgba(163,177,198,0.6),-4px_-4px_8px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.4),inset_-2px_-2px_4px_rgba(0,0,0,0.2)] active:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.4),inset_-6px_-6px_12px_rgba(255,255,255,0.1)] active:scale-[0.98] border border-[#673AB7]/30"
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
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
