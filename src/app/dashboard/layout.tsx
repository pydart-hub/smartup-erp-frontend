"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useAuthStore } from "@/lib/stores/authStore";
import { PARENT_NAV, INSTRUCTOR_NAV, DIRECTOR_NAV, HR_MANAGER_NAV, SALES_USER_NAV } from "@/lib/utils/constants";

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
  const { role, isInstructor: storeIsInstructor } = useAuthStore();
  const isParent = role === "Parent";
  const isInstructor = storeIsInstructor || role === "Instructor";
  const isDirector = role === "Director" || role === "Management";
  const isHRManager = role === "HR Manager";
  const isSalesUser = role === "Sales User";

  // Determine sidebar nav items based on role
  const sidebarNav = isDirector
    ? DIRECTOR_NAV
    : isHRManager
      ? HR_MANAGER_NAV
      : isSalesUser
        ? SALES_USER_NAV
        : isParent
          ? PARENT_NAV
          : isInstructor
            ? INSTRUCTOR_NAV
            : undefined;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-app-bg">
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

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "10px",
            border: "1px solid var(--color-border-light)",
            boxShadow: "var(--shadow-dropdown)",
            fontSize: "14px",
          },
        }}
      />
    </QueryClientProvider>
  );
}
