import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans-main",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smartup ERP — Education Management Platform",
  description: "Complete education management: students, batches, attendance, and fees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
