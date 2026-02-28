"use client";

import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useFeatureFlagsStore } from "@/lib/stores/featureFlagsStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { PARENT_NAV, INSTRUCTOR_NAV, DIRECTOR_NAV } from "@/lib/utils/constants";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { flags } = useFeatureFlagsStore();
  const { role, isInstructor: storeIsInstructor } = useAuthStore();
  const isParent = role === "Parent";
  const isInstructor = storeIsInstructor || role === "Instructor";
  const isDirector = role === "Director" || role === "Management";

  // Determine sidebar nav items based on role
  const sidebarNav = isDirector
    ? DIRECTOR_NAV
    : isParent
      ? PARENT_NAV
      : isInstructor
        ? INSTRUCTOR_NAV
        : undefined;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-app-bg">
        {/* Sidebar – use role-specific nav items */}
        {(isDirector || isParent || isInstructor || flags.sidebar) && (
          <Sidebar navItems={sidebarNav} />
        )}

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
