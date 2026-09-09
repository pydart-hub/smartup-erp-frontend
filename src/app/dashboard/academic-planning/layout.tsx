"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { ROLE_DASHBOARD_MAP } from "@/lib/utils/constants";

/**
 * Academic Planning Dept layout - protects all /dashboard/academic-planning/* routes.
 * If the user does NOT have permission they are redirected to their authorized dashboard.
 */
export default function AcademicPlanningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { role, activeRole, isLoading, isAuthenticated, user } = useAuthStore();

  const effectiveRole = activeRole ?? role;
  const userRoles = user?.roles ?? [];

  const isAllowed =
    effectiveRole === "Academic Planning Dept" ||
    userRoles.includes("Academic Planning Dept") ||
    userRoles.includes("Director") ||
    userRoles.includes("Administrator") ||
    userRoles.includes("System Manager") ||
    userRoles.includes("General Manager");

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (!isAllowed) {
      const dest = ROLE_DASHBOARD_MAP[effectiveRole ?? ""] ?? "/dashboard";
      router.replace(dest);
    }
  }, [isLoading, isAuthenticated, isAllowed, effectiveRole, router]);

  if (isLoading || !isAllowed) {
    return <GifLoader />;
  }

  return <>{children}</>;
}