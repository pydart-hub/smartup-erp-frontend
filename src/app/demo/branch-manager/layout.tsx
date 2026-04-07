"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  LayoutDashboard,
  GraduationCap,
  ClipboardCheck,
  IndianRupee,
  MessageSquareWarning,
  ChevronLeft,
  Menu,
  LogOut,
  Play,
  Users,
  TrendingUp,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const DEMO_BM_NAV = [
  { label: "Dashboard",  href: "/demo/branch-manager",            icon: LayoutDashboard },
  { label: "Students",   href: "/demo/branch-manager/students",   icon: GraduationCap },
  { label: "Attendance", href: "/demo/branch-manager/attendance",    icon: ClipboardCheck },
  { label: "Performance", href: "/demo/branch-manager/performance", icon: TrendingUp },
  { label: "Fees",       href: "/demo/branch-manager/fees",         icon: IndianRupee },
  { label: "Staff",      href: "/demo/branch-manager/staff",       icon: Users },
  { label: "Complaints", href: "/demo/branch-manager/complaints",  icon: MessageSquareWarning },
];

export default function DemoBranchManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border-light flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-border-light">
          <Image src="/smartup-logo.png" alt="SmartUp" width={32} height={32} className="object-contain" />
          <div>
            <span className="text-sm font-bold text-text-primary tracking-wide">SMART UP</span>
            <div className="flex items-center gap-1.5">
              <Play className="w-2.5 h-2.5 text-primary fill-primary" />
              <span className="text-[10px] text-primary font-semibold tracking-wider">DEMO</span>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {DEMO_BM_NAV.map((navItem) => {
            const Icon = navItem.icon;
            const isActive = pathname === navItem.href;
            return (
              <Link
                key={navItem.href}
                href={navItem.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-light text-primary"
                    : "text-text-secondary hover:bg-border-light hover:text-text-primary"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {navItem.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border-light space-y-2">
          <div className="px-3 py-2 rounded-[10px] bg-primary-light/50 border border-primary/10">
            <p className="text-xs font-semibold text-primary">Demo Mode</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">Using sample data only</p>
          </div>
          <button
            onClick={() => router.push("/demo")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium text-text-secondary hover:bg-border-light hover:text-text-primary transition-colors w-full"
          >
            <ChevronLeft className="w-[18px] h-[18px]" />
            Back to Roles
          </button>
          <button
            onClick={() => router.push("/auth/login")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium text-text-secondary hover:bg-error-light hover:text-error transition-colors w-full"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Exit Demo
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-surface border-b border-border-light flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-border-light text-text-secondary"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-medium text-text-primary">Priya Menon</p>
              <p className="text-[11px] text-text-tertiary">Branch Manager • Demo</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary text-sm font-bold">
              P
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
