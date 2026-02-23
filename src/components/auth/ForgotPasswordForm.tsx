"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, Send, CheckCircle } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/lib/validators/auth";
import { forgotPassword } from "@/lib/api/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    try {
      setServerError("");
      await forgotPassword({ email: data.email });
      setSuccess(true);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      setServerError(err.response?.data?.error || "Something went wrong. Please try again.");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center space-y-4"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-success-light flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Check your email</h3>
            <p className="text-sm text-text-secondary">
              If this email is registered, a password reset link has been sent.
              Please check your inbox and spam folder.
            </p>
            <Link href="/auth/login">
              <Button variant="outline" size="md" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sign In
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {/* Server Error */}
            <AnimatePresence>
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-[10px] bg-error-light border border-error/20 p-3"
                >
                  <p className="text-sm text-error font-medium">{serverError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-sm text-text-secondary">
              Enter the email address associated with your account. We&apos;ll send you a link to reset your password.
            </p>

            {/* Email */}
            <Input
              label="Email Address"
              type="email"
              placeholder="you@smartup.com"
              autoComplete="email"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
              {!isSubmitting && <Send className="h-4 w-4 ml-1" />}
            </Button>

            {/* Back to login */}
            <div className="text-center">
              <Link
                href="/auth/login"
                className="text-sm text-primary hover:text-primary-hover transition-colors font-medium inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
