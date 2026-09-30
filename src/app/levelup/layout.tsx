import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LevelUp GCC Scholarship Exam 2026 — SmartUp Learning",
  description:
    "Official LevelUp GCC Online Scholarship Examination Portal for UAE, Saudi Arabia, Qatar, Oman, Kuwait, and Bahrain.",
};

export default function LevelUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FBFBFE] text-slate-800 selection:bg-[#5C34A4] selection:text-white antialiased font-sans">
      {children}
    </div>
  );
}
