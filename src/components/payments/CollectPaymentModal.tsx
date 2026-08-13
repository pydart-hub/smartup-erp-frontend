"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Wallet, Banknote, Loader2, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import RazorpayPayButton from "./RazorpayPayButton";
import CoFeePayButton from "./CoFeePayButton";
import type { SalesInvoice } from "@/lib/types/sales";

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesInvoice;
  studentName: string;
  studentId?: string;
  customer: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  onPaymentDone: (invoiceId: string) => void;
  allowOffline?: boolean;
}

function formatDateInputLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CollectPaymentModal({
  isOpen,
  onClose,
  invoice,
  studentName,
  studentId,
  customer,
  parentName = "",
  parentEmail = "",
  parentPhone = "",
  onPaymentDone,
  allowOffline = true,
}: CollectPaymentModalProps) {
  const queryClient = useQueryClient();

  // ── Form / Flow States ──────────────────────────────────────
  const [step, setStep] = useState<"amount" | "method">("amount");
  const [methodSubStep, setMethodSubStep] = useState<"selection" | "online" | "cash">("selection");
  const [amountInput, setAmountInput] = useState<string>("");
  const [payMethodTab, setPayMethodTab] = useState<"online" | "cash">("online");

  // Cash details
  const [cashMode, setCashMode] = useState<"Cash" | "UPI" | "Bank Transfer" | "Cheque">("Cash");
  const [cashRef, setCashRef] = useState("");
  
  // Date calculations
  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);

  const todayStr = useMemo(() => formatDateInputLocal(today), [today]);
  const yesterdayStr = useMemo(() => formatDateInputLocal(yesterday), [yesterday]);
  const [cashDate, setCashDate] = useState(todayStr);

  // ── 3D Tilt Effect States ───────────────────────────────────
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

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

  // Reset modal state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setStep("amount");
      setMethodSubStep("selection");
      setAmountInput(String(invoice.outstanding_amount));
      setPayMethodTab("online");
      setCashMode("Cash");
      setCashRef("");
      setCashDate(todayStr);
    }
  }, [isOpen, invoice, todayStr]);

  // ── Cash Recording Mutation ─────────────────────────────────
  const recordCashMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payments/record-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invoice_id: invoice.name,
          amount: Number(amountInput),
          mode_of_payment: cashMode,
          posting_date: cashDate,
          reference_no: cashRef || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Payment recorded: ${data.payment_entry}`);
      onPaymentDone(invoice.name);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const parsedAmount = Number(amountInput) || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= invoice.outstanding_amount;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with Transparent Glass Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
            className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.12)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-slate-800/60 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]"
          >
             {/* Close Button */}
             <button
               onClick={onClose}
               className="absolute top-5 right-5 z-20 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
             >
               <X className="h-5 w-5" />
             </button>

             {/* Scrollable Container Wrapper */}
             <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
               {/* Header info with Large Borderless Logo */}
               <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center">
                 {/* Logo Badge - Increased size, transparent integration */}
                 <div className="w-36 h-36 flex items-center justify-center overflow-hidden pointer-events-none mb-2">
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
                   Collect Payment
                 </h3>
                 <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
                   {studentName}
                 </h4>
                 {studentId && (
                   <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                     {studentId}
                   </p>
                 )}
                 
                 {/* Gap + Invoice Badge */}
                 <div className="mt-2.5">
                   <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-500">
                     {invoice.name}
                   </span>
                 </div>

                 {/* Dotted separator with pill in Logo Violet color */}
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
                       {/* Balances Grid (Total Outstanding & Remaining) */}
                       <div className="grid grid-cols-2 gap-3.5">
                         {/* Total Outstanding Balance */}
                         <div className="rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/20 dark:bg-rose-950/10 py-2.5 px-3 text-center">
                           <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                             Total Outstanding
                           </span>
                           <span className="block text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                             {formatCurrency(invoice.outstanding_amount)}
                           </span>
                         </div>

                         {/* Remaining Balance */}
                         {(() => {
                           const remaining = Math.max(0, invoice.outstanding_amount - parsedAmount);
                           const isZero = remaining === 0;
                           return (
                             <div 
                               className={`rounded-xl border py-2.5 px-3 text-center shadow-inner transition-all duration-300 ${
                                 isZero 
                                   ? "border-green-500 bg-green-50/50 dark:bg-green-950/20 dark:border-green-500" 
                                   : "border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20"
                               }`}
                             >
                               <span 
                                 className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                                   isZero ? "text-green-600 dark:text-green-400" : "text-rose-500"
                                 }`}
                               >
                                 Remaining Balance
                               </span>
                               <span 
                                 className={`block text-base font-black mt-0.5 transition-colors duration-300 ${
                                   isZero ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-455"
                                 }`}
                               >
                                 {formatCurrency(remaining)}
                               </span>
                             </div>
                           );
                         })()}
                       </div>

                       {/* Amount to Pay (Single Large Centered Input) - Colored Green only on Full Payment, otherwise Violet */}
                       {(() => {
                         const isFullPayment = parsedAmount === invoice.outstanding_amount;
                         return (
                           <div 
                             className={`rounded-2xl border p-6 text-center flex flex-col justify-center relative transition-all duration-300 ${
                               isFullPayment 
                                 ? "border-green-500 bg-green-50/50 dark:bg-green-950/10 shadow-[0_8px_30px_rgba(34,197,94,0.06)]" 
                                 : "border-violet-600 bg-slate-50/50 dark:bg-slate-900/10 shadow-[0_8px_30px_rgba(124,58,237,0.06)]"
                             }`}
                           >
                             <span 
                               className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                                 isFullPayment ? "text-green-600 dark:text-green-500" : "text-violet-600 dark:text-violet-400"
                               }`}
                             >
                               Amount to Pay
                             </span>
                             <div 
                               className={`flex items-center justify-center gap-1.5 mt-3 text-3xl font-extrabold transition-colors duration-300 ${
                                 isFullPayment ? "text-green-600 dark:text-green-400" : "text-violet-600 dark:text-violet-400"
                               }`}
                             >
                               <span>₹</span>
                               <input
                                 type="text"
                                 inputMode="decimal"
                                 autoFocus
                                 value={amountInput}
                                 onChange={(e) => {
                                   const val = e.target.value;
                                   if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                     setAmountInput(val);
                                   }
                                 }}
                                 placeholder="0"
                                 className={`bg-transparent border-0 p-0 text-3xl font-extrabold focus:outline-none focus:ring-0 w-36 text-center transition-colors duration-300 ${
                                   isFullPayment ? "text-green-600 dark:text-green-400" : "text-violet-600 dark:text-violet-400"
                                 }`}
                               />
                             </div>
                           </div>
                         );
                       })()}

                       {Number(amountInput) > invoice.outstanding_amount && (
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
                         {/* Green Slide-in Background from Left to Right */}
                         <span className="absolute inset-0 bg-green-600 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out pointer-events-none" />
                         
                         {/* Content aligned relative z-10 to sit above absolute background */}
                         {/* Content aligned relative z-10 to sit above absolute background */}
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
                           onClick={() => {
                             if (methodSubStep === "selection") {
                               setStep("amount");
                             } else {
                               setMethodSubStep("selection");
                             }
                           }}
                           className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                         >
                           <ArrowLeft className="h-3.5 w-3.5" /> Back
                         </button>
                         <div className="text-right">
                           <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Paying amount:</span>
                           <span className="text-sm font-bold text-violet-600">{formatCurrency(parsedAmount)}</span>
                         </div>
                       </div>

                       {/* SUB-STEP: SELECTION */}
                       {methodSubStep === "selection" && (
                         <div className="space-y-3.5">
                           {/* Option 1: Online Payment */}
                           <button
                             type="button"
                             onClick={() => setMethodSubStep("online")}
                             className="w-full text-left p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 hover:border-violet-500/55 hover:shadow-[0_8px_30px_rgba(124,58,237,0.04)] transition-all duration-200 flex items-center gap-4 group"
                           >
                             <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-955/35 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform duration-200">
                               <CreditCard className="h-6 w-6" />
                             </div>
                             <div className="flex-1">
                               <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                                 Online Payment
                                 <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 text-slate-400" />
                               </h4>
                               <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                 Pay securely via Card, UPI, Netbanking, or CoFee.
                               </p>
                             </div>
                           </button>

                           {/* Option 2: Cash / Offline Payment */}
                           {allowOffline && (
                             <button
                               type="button"
                               onClick={() => setMethodSubStep("cash")}
                               className="w-full text-left p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 hover:border-green-500/50 hover:shadow-[0_8px_30px_rgba(34,197,94,0.04)] transition-all duration-200 flex items-center gap-4 group"
                             >
                               <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-955/35 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-105 transition-transform duration-200">
                                 <Wallet className="h-6 w-6" />
                               </div>
                               <div className="flex-1">
                                 <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                                   Cash / Offline Payment
                                   <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 text-slate-400" />
                                 </h4>
                                 <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                   Record physical cash receipt or bank transfer.
                                 </p>
                               </div>
                             </button>
                           )}
                         </div>
                       )}

                       {/* SUB-STEP: ONLINE METHODS */}
                       {methodSubStep === "online" && (
                         <div className="space-y-3">
                           {process.env.NEXT_PUBLIC_DISABLE_RAZORPAY !== "true" && (
                             <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 p-4 hover:border-violet-500/55 transition-all duration-200">
                               <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Razorpay</h4>
                               <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                 Cards, UPI, Netbanking, or Wallets.
                               </p>
                               <div className="mt-3">
                                 <RazorpayPayButton
                                   amount={parsedAmount}
                                   invoiceId={invoice.name}
                                   studentName={studentName}
                                   customer={customer}
                                   parentName={parentName}
                                   parentEmail={parentEmail}
                                   parentPhone={parentPhone}
                                   onSuccess={(id) => {
                                     onClose();
                                     onPaymentDone(invoice.name);
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
                                 amount={parsedAmount}
                                 invoiceId={invoice.name}
                                 studentName={studentName}
                                 customer={customer}
                                 parentName={parentName}
                                 parentEmail={parentEmail}
                                 parentPhone={parentPhone}
                                 size="md"
                                 className="w-full text-white rounded-xl shadow-sm"
                               />
                             </div>
                           </div>
                         </div>
                       )}

                       {/* SUB-STEP: CASH / OFFLINE FORM */}
                       {methodSubStep === "cash" && allowOffline && (
                         <div className="space-y-4">
                           {/* Mode selectors */}
                           <div className="flex flex-col gap-1.5">
                             <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Payment Mode</label>
                             <div className="grid grid-cols-4 gap-1.5">
                               {(["Cash", "UPI", "Bank Transfer", "Cheque"] as const).map((m) => (
                                 <button
                                   key={m}
                                   type="button"
                                   onClick={() => {
                                     setCashMode(m);
                                     if (m === "Cash") setCashRef("");
                                   }}
                                   className={`px-1 py-2 text-[10px] font-bold rounded-xl border transition-all ${
                                     cashMode === m
                                       ? "border-violet-600 bg-violet-50 text-violet-600 dark:bg-violet-955/20"
                                       : "border-slate-200 dark:border-slate-800 bg-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                                   }`}
                                 >
                                   {m}
                                 </button>
                               ))}
                             </div>
                           </div>

                           {/* Reference / UTR Input */}
                           <div className="flex flex-col gap-1.5">
                             <Input
                               label={
                                 cashMode === "Cash"
                                   ? "Receipt number (optional)"
                                   : cashMode === "UPI"
                                   ? "UTR Number"
                                   : cashMode === "Cheque"
                                   ? "Cheque Number"
                                   : "Transaction Reference"
                               }
                               placeholder="Enter reference details"
                               value={cashRef}
                               onChange={(e) => setCashRef(e.target.value)}
                               className="bg-transparent"
                             />
                             {cashMode !== "Cash" && !cashRef.trim() && (
                               <p className="text-[10px] text-rose-500 font-medium">Required for {cashMode} payments</p>
                             )}
                           </div>

                           {/* Payment date input */}
                           <div className="flex flex-col gap-1.5">
                             <Input
                               label="Payment Date"
                               type="date"
                               value={cashDate}
                               onChange={(e) => setCashDate(e.target.value)}
                               min={yesterdayStr}
                               max={todayStr}
                             />
                             <p className="text-[10px] text-slate-400 dark:text-slate-500">
                               Only today and yesterday are allowed.
                             </p>
                           </div>

                           {/* Actions */}
                           <div className="flex gap-3 pt-2">
                             <Button variant="outline" size="md" onClick={() => setMethodSubStep("selection")} className="flex-1">
                               Cancel
                             </Button>
                             <Button
                               variant="primary"
                               size="md"
                               className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                               disabled={
                                 recordCashMutation.isPending || 
                                 (cashMode !== "Cash" && !cashRef.trim())
                               }
                               onClick={() => recordCashMutation.mutate()}
                             >
                               {recordCashMutation.isPending ? (
                                 <><Loader2 className="h-4 w-4 animate-spin" /> Recording...</>
                               ) : (
                                 <><Banknote className="h-4 w-4" /> Record {formatCurrency(parsedAmount)}</>
                               )}
                             </Button>
                           </div>
                         </div>
                       )}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             </div>
           </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
