import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import ThankYouView from "@/components/enquiry/ThankYouView";

export const metadata: Metadata = {
  title: "Registration Confirmed | Smart Up CBSE Crash Course",
  description:
    "Thank you for registering for the Smart Up CBSE Crash Course. Our counsellor will reach out shortly.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EnquiryThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8FF] text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-[#5C34A4]" />
        </div>
      }
    >
      <ThankYouView />
    </Suspense>
  );
}
