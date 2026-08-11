"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const gateway = searchParams.get("gateway");
  let orderId = searchParams.get("order_id");
  const invoiceId = searchParams.get("invoice_id");
  const amountStr = searchParams.get("amount");
  const studentName = searchParams.get("student_name");
  const customer = searchParams.get("customer");
  const redirectTo = searchParams.get("redirect_to");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function verifyPayment() {
      if (!orderId && typeof window !== "undefined") {
        orderId = localStorage.getItem("cofee_pending_order_id") || null;
      }

      if (gateway !== "cofee" || !orderId || !invoiceId) {
        setStatus("error");
        setErrorMessage("Invalid payment callback parameters.");
        return;
      }

      try {
        const amount = amountStr ? parseFloat(amountStr) : 0;
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gateway: "cofee",
            order_id: orderId,
            invoice_id: invoiceId,
            amount,
            student_name: studentName ? decodeURIComponent(studentName) : "",
            customer: customer ? decodeURIComponent(customer) : "",
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to verify payment with backend");
        }

        setStatus("success");
        toast.success("Payment recorded successfully!");

        // Redirect to parent dashboard after 3 seconds
        setTimeout(() => {
          router.push(redirectTo || "/dashboard/parent/fees");
        }, 3000);
      } catch (err) {
        console.error("Callback verification failed:", err);
        setStatus("error");
        setErrorMessage((err as Error).message || "Something went wrong during payment verification.");
      }
    }

    verifyPayment();
  }, [gateway, orderId, invoiceId, amountStr, studentName, customer, router, redirectTo]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-[16px] border border-border-light bg-card p-8 shadow-lg">
        {status === "verifying" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Verifying Payment</h2>
            <p className="text-sm text-text-secondary">
              We are communicating with the payment gateway to confirm your payment. Please do not close or refresh this page.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
            <CheckCircle2 className="h-12 w-12 text-success" />
            <h2 className="text-lg font-semibold text-text-primary">Payment Successful!</h2>
            <p className="text-sm text-text-secondary">
              Thank you! Your payment has been successfully verified and recorded.
            </p>
            <p className="text-xs text-text-tertiary mt-2">
              {redirectTo ? "Redirecting you back..." : "Redirecting you to the fees dashboard..."}
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
            <XCircle className="h-12 w-12 text-error" />
            <h2 className="text-lg font-semibold text-text-primary">Verification Failed</h2>
            <p className="text-sm text-text-secondary">
              {errorMessage}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              If amount was deducted, please contact support with Order ID: <span className="font-mono">{orderId || "N/A"}</span>
            </p>
            <button
              onClick={() => router.push(redirectTo || "/dashboard/parent/fees")}
              className="mt-4 px-5 py-2 text-sm font-medium bg-primary text-white rounded-[10px] hover:bg-primary-hover transition-colors"
            >
              {redirectTo ? "Go Back" : "Go to Fees Dashboard"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
