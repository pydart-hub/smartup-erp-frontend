"use client";

import React, { useState, useCallback } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface CoFeePayButtonProps {
  /** Amount in INR (e.g. 5000) */
  amount: number;
  /** Invoice / Fee record ID */
  invoiceId: string;
  /** Student name for description */
  studentName: string;
  /** Customer name */
  customer: string;
  /** Parent's name */
  parentName?: string;
  /** Parent's email */
  parentEmail?: string;
  /** Parent's phone */
  parentPhone?: string;
  /** Optional custom redirect URL after payment completion */
  redirectTo?: string;
  /** Optional custom className */
  className?: string;
  /** Button size - compact for table rows */
  size?: "sm" | "md";
}

export default function CoFeePayButton({
  amount,
  invoiceId,
  studentName,
  customer,
  parentName,
  parentEmail,
  parentPhone,
  redirectTo,
  className = "",
  size = "sm",
}: CoFeePayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = useCallback(async () => {
    setLoading(true);

    try {
      // 1. Create order on server specifying cofee
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount,
          invoice_id: invoiceId,
          student_name: studentName,
          customer,
          gateway: "cofee",
          redirect_to: redirectTo || (typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined),
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create CoFee payment order");
      }

      const orderData = await orderRes.json();
      if (!orderData.payment_link) {
        throw new Error("No payment link returned by CoFee");
      }

      // Save order_id to localStorage for the callback page
      if (orderData.order_id) {
        localStorage.setItem("cofee_pending_order_id", orderData.order_id);
      }

      // 2. Redirect to CoFee hosted checkout
      toast.success("Redirecting to payment gateway...");
      window.location.href = orderData.payment_link;
    } catch (err) {
      console.error("CoFee initiation error:", err);
      setLoading(false);
      const msg = (err as Error).message || "Something went wrong";
      toast.error("Payment error", { description: msg });
    }
  }, [amount, invoiceId, studentName, customer, parentName, parentEmail, parentPhone, redirectTo]);

  const sizeClasses = size === "sm"
    ? "h-8 px-3 text-xs rounded-[8px]"
    : "h-10 px-5 text-sm rounded-[10px]";

  return (
    <button
      onClick={handlePayment}
      disabled={loading || amount <= 0}
      className={`
        group relative overflow-hidden
        inline-flex items-center justify-center gap-1.5 font-medium
        bg-violet-600 text-white
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50
        disabled:pointer-events-none disabled:opacity-50
        transition-all duration-200 active:scale-[0.97]
        ${sizeClasses}
        ${className}
      `}
    >
      {/* Green sliding background */}
      <span className="absolute inset-0 bg-green-600 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out pointer-events-none" />

      {/* Content wrapper */}
      <span className="relative z-10 flex items-center justify-center gap-1.5 w-full h-full">
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Redirecting…
          </>
        ) : (
          <>
            Pay via CoFee
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </>
        )}
      </span>
    </button>
  );
}
