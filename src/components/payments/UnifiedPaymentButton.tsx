"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, X, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import RazorpayPayButton from "./RazorpayPayButton";
import CoFeePayButton from "./CoFeePayButton";

interface UnifiedPaymentButtonProps {
  amount: number;
  invoiceId: string;
  studentName: string;
  customer: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export default function UnifiedPaymentButton(props: UnifiedPaymentButtonProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [step, setStep] = useState<"amount" | "method">("amount");
  const [customAmount, setCustomAmount] = useState<number>(props.amount);

  // 3D Tilt States
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleOpen = () => {
    setCustomAmount(props.amount);
    setStep("amount");
    setShowOptions(true);
    setRotateX(0);
    setRotateY(0);
  };

  const handleClose = () => {
    setShowOptions(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateX(-y / 25);
    setRotateY(x / 25);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const formatCurrency = (val: number) => "₹" + val.toLocaleString("en-IN");
  const isAmountValid = customAmount > 0 && customAmount <= props.amount;
  const isFullPayment = customAmount === props.amount;

  const sizeClasses = props.size === "sm"
    ? "h-8 px-3 text-xs rounded-[8px]"
    : "h-10 px-5 text-sm rounded-[10px]";

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={props.amount <= 0}
        className={`
          inline-flex items-center justify-center gap-1.5 font-medium
          bg-primary text-white hover:bg-primary-hover
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
          disabled:pointer-events-none disabled:opacity-50
          transition-all duration-200 active:scale-[0.97]
          ${sizeClasses}
          ${props.className || ""}
        `}
      >
        <CreditCard className="h-3.5 w-3.5" />
        Pay Now ({formatCurrency(props.amount)})
      </button>

      <AnimatePresence>
        {showOptions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with Transparent Glass Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/20 backdrop-blur-xl"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30, rotateX: 12 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                rotateX: 0,
                transition: { type: "spring", stiffness: 260, damping: 20 }
              }}
              exit={{ opacity: 0, scale: 0.95, y: 15, rotateX: -6 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
                transformStyle: "preserve-3d",
              }}
              className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.12)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-slate-800/60 overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-5 right-5 z-20 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header info with Large Borderless Logo */}
              <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center">
                <div className="w-32 h-32 flex items-center justify-center overflow-hidden pointer-events-none mb-1">
                  <video
                    src="/logo-look.webm"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-150"
                  />
                </div>

                <h3 className="text-lg font-bold text-violet-900 dark:text-violet-200">
                  Select Payment Option
                </h3>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {props.studentName}
                </h4>
                <div className="mt-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-500">
                    {props.invoiceId}
                  </span>
                </div>

                <div className="w-full flex items-center justify-center gap-2 mt-3.5">
                  <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-900" />
                  <div className="w-10 h-1.5 rounded-full bg-violet-600/60" />
                  <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-900" />
                </div>
              </div>

              <div className="px-6 pb-6">
                <AnimatePresence mode="wait">
                  {/* ── STEP 1: AMOUNT ENTRY ────────────────────────── */}
                  {step === "amount" && (
                    <motion.div
                      key="step-amount"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      {/* Balances Grid */}
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/20 dark:bg-rose-950/10 py-2.5 px-3 text-center">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Total Outstanding
                          </span>
                          <span className="block text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                            {formatCurrency(props.amount)}
                          </span>
                        </div>

                        <div className={`rounded-xl border py-2.5 px-3 text-center shadow-inner transition-all duration-300 ${
                          customAmount === props.amount
                            ? "border-green-500 bg-green-50/50 dark:bg-green-950/20 dark:border-green-500"
                            : "border-slate-100 dark:border-slate-900 bg-slate-50/20 dark:bg-slate-900/10"
                        }`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Remaining
                          </span>
                          <span className={`block text-base font-extrabold mt-0.5 transition-colors duration-300 ${
                            customAmount === props.amount
                              ? "text-green-600 dark:text-green-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}>
                            {formatCurrency(Math.max(0, props.amount - (customAmount || 0)))}
                          </span>
                        </div>
                      </div>

                      {/* Input Section */}
                      <div className="relative group rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 p-5 flex flex-col items-center justify-center transition-all duration-300 hover:border-slate-200 dark:hover:border-slate-800/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                          Amount to Pay
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-2xl font-bold transition-colors duration-300 ${
                            isFullPayment ? "text-green-600 dark:text-green-400" : "text-violet-600 dark:text-violet-400"
                          }`}>₹</span>
                          <input
                            type="text"
                            autoFocus
                            value={customAmount || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                const num = Number(val);
                                setCustomAmount(num > props.amount ? props.amount : num);
                              }
                            }}
                            placeholder="0"
                            className={`bg-transparent border-0 p-0 text-3xl font-extrabold focus:outline-none focus:ring-0 w-36 text-center transition-colors duration-300 ${
                              isFullPayment ? "text-green-600 dark:text-green-400" : "text-violet-600 dark:text-violet-400"
                            }`}
                          />
                        </div>
                      </div>

                      {customAmount > props.amount && (
                        <p className="text-xs text-rose-500 text-center font-medium mt-1">
                          Amount cannot exceed outstanding balance.
                        </p>
                      )}

                      {/* Continue Button */}
                      <button
                        type="button"
                        disabled={!isAmountValid}
                        onClick={() => setStep("method")}
                        className="group relative overflow-hidden w-full py-3.5 px-6 rounded-xl bg-violet-600 text-white font-semibold text-sm shadow-sm disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 transition-transform duration-200"
                      >
                        <span className="absolute inset-0 bg-green-600 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out pointer-events-none" />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          Continue to Payment Mode
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </span>
                      </button>
                    </motion.div>
                  )}

                  {/* ── STEP 2: PAYMENT METHOD ──────────────────────── */}
                  {step === "method" && (
                    <motion.div
                      key="step-method"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      {/* Back button and Selected Amount display */}
                      <div className="flex items-center justify-between pb-2">
                        <button
                          onClick={() => setStep("amount")}
                          className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" /> Back
                        </button>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Paying amount:</span>
                          <span className="text-sm font-bold text-violet-600">{formatCurrency(customAmount || 0)}</span>
                        </div>
                      </div>

                      {/* Online options container */}
                      <div className="space-y-3">
                        {process.env.NEXT_PUBLIC_DISABLE_RAZORPAY !== "true" && (
                          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 p-4 hover:border-violet-500/55 transition-all duration-200">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Razorpay</h4>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                              Cards, UPI, Netbanking, or Wallets.
                            </p>
                            <div className="mt-3">
                              <RazorpayPayButton
                                {...props}
                                amount={customAmount || 0}
                                onSuccess={(id) => {
                                  handleClose();
                                  props.onSuccess?.(id);
                                }}
                                size="md"
                                className="w-full text-white rounded-xl shadow-sm"
                              />
                            </div>
                          </div>
                        )}

                        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 p-4 hover:border-emerald-500/50 transition-all duration-200">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">CoFee Payment</h4>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            Redirect to secure portal.
                          </p>
                          <div className="mt-3">
                            <CoFeePayButton
                              {...props}
                              amount={customAmount || 0}
                              size="md"
                              className="w-full text-white rounded-xl shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
