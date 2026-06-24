"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";

/**
 * Instructor layout - protects all /dashboard/instructor/* routes.
 * Access should only be granted when the user actually has the Instructor role.
 */
export default function InstructorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { role, activeRole, user, isLoading, isAuthenticated } = useAuthStore();
  const effectiveRole = activeRole ?? role;
  const isInstructor = (user?.roles ?? []).includes("Instructor");

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (!isInstructor) {
      const roleRoutes: Record<string, string> = {
        "Branch Manager": "/dashboard/branch-manager",
        "General Manager": "/dashboard/general-manager",
        Director: "/dashboard/director",
        Mentor: "/dashboard/mentor",
        "Class Incharge": "/dashboard/class-incharge",
        Parent: "/dashboard/parent",
        Teacher: "/dashboard/teacher",
        Administrator: "/dashboard/admin",
      };
      const dest = roleRoutes[effectiveRole ?? ""] || "/dashboard/branch-manager";
      router.replace(dest);
    }
  }, [effectiveRole, isAuthenticated, isInstructor, isLoading, router]);

  if (isLoading || !isInstructor) {
    return <GifLoader />;
  }

  return <>{children}</>;
}
