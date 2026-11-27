import type { Metadata } from "next";
import MetaPixelProvider from "@/components/analytics/MetaPixelProvider";

export const metadata: Metadata = {
  title: "Smart Up CBSE Crash Course (Classes 8–12) | Book Free Demo",
  description:
    "Live online CBSE Board Exam Crash Course for Classes 8 to 12 — built for Malayali families across the GCC. 1:1 Personal, 1:3 Small Group & Micro Batch plans.",
  icons: {
    icon: "/smartup-logo-v2.png",
    apple: "/smartup-logo-v2.png",
  },
  openGraph: {
    title: "Smart Up CBSE Crash Course — Classes 8 to 12",
    description:
      "Live online classes, previous-year papers & parent progress updates built for Malayali families across the GCC.",
    images: ["/smartup-logo-v2.png"],
  },
};

export default function EnquiryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-[#F5C542] selection:text-[#0B1B3F] antialiased font-sans">
      <MetaPixelProvider />
      {children}
    </div>
  );
}

