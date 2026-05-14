"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useAuthStore } from "@/lib/stores/authStore";
import { PARENT_NAV, INSTRUCTOR_NAV, DIRECTOR_NAV, HR_MANAGER_NAV, SALES_USER_NAV, GENERAL_MANAGER_NAV } from "@/lib/utils/constants";
import { NavigationLoader } from "@/components/NavigationLoader";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // useState keeps the same QueryClient across HMR / Fast Refresh cycles
  const [queryClient] = useState(makeQueryClient);
  const { activeRole, isInstructor: storeIsInstructor } = useAuthStore();
  const isParent = activeRole === "Parent";
  const isInstructor = activeRole === "Instructor" || (!activeRole && storeIsInstructor);
  const isDirector = activeRole === "Director" || activeRole === "Management";
  const isGeneralManager = activeRole === "General Manager";
  const isHRManager = activeRole === "HR Manager";
  const isSalesUser = activeRole === "Sales User";
  const isBranchManager = activeRole === "Branch Manager";

  // Determine sidebar nav items based on role
  // Branch Manager takes priority over Instructor — a user who is both
  // should see the full Branch Manager sidebar, not the limited Instructor one.
  const sidebarNav = isDirector
    ? DIRECTOR_NAV
    : isGeneralManager
      ? GENERAL_MANAGER_NAV
      : isHRManager
        ? HR_MANAGER_NAV
        : isBranchManager
          ? undefined  // falls through to default BRANCH_MANAGER_NAV in Sidebar
          : isSalesUser
            ? SALES_USER_NAV
            : isParent
              ? PARENT_NAV
              : isInstructor
                ? INSTRUCTOR_NAV
                : undefined;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-[#F0F4F8] dark:bg-[#080E1A] relative">
        {/* Global ambient orbs — fixed behind everything */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full bg-gradient-to-br from-teal-400/10 to-emerald-300/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-violet-500/8 to-indigo-400/5 blur-3xl" />
          <div className="absolute top-1/2 left-0 w-[400px] h-[300px] rounded-full bg-gradient-to-r from-blue-400/6 to-cyan-300/4 blur-3xl" />
        </div>

        {/* Sidebar – use role-specific nav items */}
        <Sidebar navItems={sidebarNav} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <Topbar />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Global navigation loading overlay */}
      <NavigationLoader />

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
            fontSize: "14px",
            backdropFilter: "blur(12px)",
            background: "rgba(255,255,255,0.85)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
