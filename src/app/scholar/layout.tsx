import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SmartUp Scholarship Exam 2026 — Candidate Registration",
  description:
    "Register for SmartUp Scholarship Exam 2026. Enter your details to book your test slot and claim tuition fee waivers.",
};

export default function ScholarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 selection:bg-[#673AB7] selection:text-white antialiased font-sans">
      {children}
    </div>
  );
}
