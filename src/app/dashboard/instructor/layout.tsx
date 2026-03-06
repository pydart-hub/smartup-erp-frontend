"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { Loader2 } from "lucide-react";

/**
 * Instructor layout — protects all /dashboard/instructor/* routes.
 * If the user is NOT an instructor, they are redirected to their
 * correct dashboard based on their primary role.
 */
export default function InstructorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { role, isLoading, isAuthenticated, isInstructor: storeIsInstructor } = useAuthStore();
  const isInstructor = storeIsInstructor || role === "Instructor";

  useEffect(() => {
    // Wait until auth check finishes
    if (isLoading) return;

    // Not authenticated → handled by middleware, but safety fallback
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    // Authenticated but NOT an instructor → redirect to their own dashboard
    if (!isInstructor) {
      const ROLE_ROUTES: Record<string, string> = {
        "Branch Manager": "/dashboard/branch-manager",
        Parent: "/dashboard/parent",
        Teacher: "/dashboard/teacher",
        Administrator: "/dashboard/admin",
      };
      const dest = ROLE_ROUTES[role ?? ""] || "/dashboard/branch-manager";
      router.replace(dest);
    }
  }, [isLoading, isAuthenticated, isInstructor, role, router]);

  // While auth is loading, show spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-6 w-6 text-primary" />
      </div>
    );
  }

  // Not instructor → show nothing while redirect happens
  if (!isInstructor) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-6 w-6 text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
