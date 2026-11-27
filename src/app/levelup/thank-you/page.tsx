import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import LevelUpThankYouView from "@/components/levelup/LevelUpThankYouView";

export const metadata: Metadata = {
  title: "Registration Complete | LevelUp GCC Scholarship Exam",
  description:
    "Your LevelUp GCC Scholarship Exam registration is confirmed. Start your exam now.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LevelUpThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FBFBFE] text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-[#5C34A4]" />
        </div>
      }
    >
      <LevelUpThankYouView />
    </Suspense>
  );
}
