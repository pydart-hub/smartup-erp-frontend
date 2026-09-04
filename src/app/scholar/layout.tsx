import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SmartUp Scholarship Exam 2026 — Merit & Talent Search",
  description:
    "Apply for SmartUp Scholarship Exam 2026. Win up to 100% tuition fee waiver for Classes 8, 9, 10, Plus One, and Plus Two.",
};

export default function ScholarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0E071A] text-slate-100 selection:bg-[#82C35B] selection:text-[#0E071A] antialiased font-sans">
      {children}
    </div>
  );
}
