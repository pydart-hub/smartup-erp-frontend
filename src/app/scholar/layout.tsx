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
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-purple-500 selection:text-white antialiased font-sans">
      {children}
    </div>
  );
}
