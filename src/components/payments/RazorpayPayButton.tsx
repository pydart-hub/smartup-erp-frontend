"use client";

import React, { useState, useCallback } from "react";
import { IndianRupee, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

// Razorpay type declarations
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: unknown) => void) => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayPayButtonProps {
  /** Amount in INR (e.g. 5000) */
  amount: number;
  /** Invoice / Fee record ID */
  invoiceId: string;
  /** Student name for description */
  studentName: string;
  /** Customer name (linked to student in Frappe) */
  customer: string;
  /** Parent's name for Razorpay prefill */
  parentName?: string;
  /** Parent's email for Razorpay prefill */
  parentEmail?: string;
  /** Parent's phone for Razorpay prefill */
  parentPhone?: string;
  /** Callback after successful payment */
  onSuccess?: (paymentId: string) => void;
  /** Callback after failed payment */
  onError?: (error: string) => void;
  /** Optional custom className */
  className?: string;
  /** Button size - compact for table rows */
  size?: "sm" | "md";
}

/** Load Razorpay checkout script dynamically */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayPayButton({
  amount,
  invoiceId,
  studentName,
  customer,
  parentName,
  parentEmail,
  parentPhone,
  onSuccess,
  onError,
  className = "",
  size = "sm",
}: RazorpayPayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handlePayment = useCallback(async () => {
    setLoading(true);
    setStatus("idle");

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay. Please check your internet connection.");
      }

      // 2. Create order on server
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount,
          invoice_id: invoiceId,
          student_name: studentName,
          customer,
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create payment order");
      }

      const orderData = await orderRes.json();

      // 3. Open Razorpay checkout
      const options: RazorpayOptions = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Smart Up ERP",
        description: `Fee payment for ${studentName} — ${invoiceId}`,
        order_id: orderData.order_id,
        prefill: {
          name: parentName || "",
          email: parentEmail || "",
          contact: parentPhone || "",
        },
        notes: {
          invoice_id: invoiceId,
          student_name: studentName,
        },
        theme: {
          color: "#6366f1", // primary indigo
        },
        handler: async (response: RazorpayResponse) => {
          // 4. Verify payment on server
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                invoice_id: invoiceId,
                amount,
                student_name: studentName,
                customer,
              }),
            });

            if (!verifyRes.ok) {
              const errData = await verifyRes.json().catch(() => ({}));
              throw new Error(errData.error || "Payment verification failed");
            }

            setStatus("success");
            setLoading(false);
            toast.success("Payment successful!", {
              description: `₹${amount.toLocaleString("en-IN")} paid for ${invoiceId}`,
            });
            onSuccess?.(response.razorpay_payment_id);
          } catch (verifyErr) {
            console.error("Payment verification error:", verifyErr);
            setStatus("error");
            setLoading(false);
            const msg = (verifyErr as Error).message || "Verification failed";
            toast.error("Payment verification failed", { description: msg });
            onError?.(msg);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.info("Payment cancelled");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: unknown) => {
        console.error("Razorpay payment failed:", response);
        setStatus("error");
        setLoading(false);
        toast.error("Payment failed", {
          description: "Please try again or contact support.",
        });
        onError?.("Payment failed");
      });

      rzp.open();
    } catch (err) {
      console.error("Payment initiation error:", err);
      setStatus("error");
      setLoading(false);
      const msg = (err as Error).message || "Something went wrong";
      toast.error("Payment error", { description: msg });
      onError?.(msg);
    }
  }, [amount, invoiceId, studentName, customer, parentName, parentEmail, parentPhone, onSuccess, onError]);

  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Paid
      </span>
    );
  }

  const sizeClasses = size === "sm"
    ? "h-8 px-3 text-xs rounded-[8px]"
    : "h-10 px-5 text-sm rounded-[10px]";

  return (
    <button
      onClick={handlePayment}
      disabled={loading || amount <= 0}
      className={`
        inline-flex items-center justify-center gap-1.5 font-medium
        bg-primary text-white hover:bg-primary-hover
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        disabled:pointer-events-none disabled:opacity-50
        transition-all duration-200 active:scale-[0.97]
        ${sizeClasses}
        ${status === "error" ? "bg-error hover:bg-red-700" : ""}
        ${className}
      `}
    >
      {loading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Processing…
        </>
      ) : status === "error" ? (
        <>
          <XCircle className="h-3.5 w-3.5" />
          Retry
        </>
      ) : (
        <>
          <IndianRupee className="h-3.5 w-3.5" />
          Pay ₹{amount.toLocaleString("en-IN")}
        </>
      )}
    </button>
  );
}
