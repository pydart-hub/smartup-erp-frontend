"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";

/**
 * Content Admin layout — protects all /dashboard/content-admin/* routes.
 * Access is granted only when the user has the "Content Admin" role.
 */
export default function ContentAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { role, activeRole, user, isLoading, isAuthenticated } = useAuthStore();
  const effectiveRole = activeRole ?? role;
  const isContentAdmin = (user?.roles ?? []).includes("Content Admin");

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (!isContentAdmin) {
      const roleRoutes: Record<string, string> = {
        "Branch Manager": "/dashboard/branch-manager",
        "General Manager": "/dashboard/general-manager",
        Director: "/dashboard/director",
        Management: "/dashboard/director",
        Mentor: "/dashboard/mentor",
        "HR Manager": "/dashboard/hr-manager",
        "Class Incharge": "/dashboard/class-incharge",
        Instructor: "/dashboard/instructor",
        "Sales User": "/dashboard/sales-user",
        Parent: "/dashboard/parent",
      };
      const dest = roleRoutes[effectiveRole ?? ""] || "/dashboard/branch-manager";
      router.replace(dest);
    }
  }, [effectiveRole, isAuthenticated, isContentAdmin, isLoading, router]);

  if (isLoading || !isContentAdmin) {
    return <GifLoader />;
  }

  return <>{children}</>;
}
