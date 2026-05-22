"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { ROLE_DASHBOARD_MAP } from "@/lib/utils/constants";

/**
 * Class Incharge layout — protects all /dashboard/class-incharge/* routes.
 * If the user does NOT have the "Class Incharge" role they are redirected
 * to their correct dashboard based on their primary role.
 */
export default function ClassInchargeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { role, activeRole, isLoading, isAuthenticated, user } = useAuthStore();

  const effectiveRole = activeRole ?? role;
  // Allow if Class Incharge is active/primary role OR present in the user's full role list.
  // This handles users who have the role but whose activeRole was set to something else
  // (e.g. instructors who are also class incharges, accessed the instructor dashboard).
  const isClassIncharge =
    effectiveRole === "Class Incharge" ||
    (user?.roles ?? []).includes("Class Incharge");

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (!isClassIncharge) {
      const dest = ROLE_DASHBOARD_MAP[effectiveRole ?? ""] ?? "/dashboard/branch-manager";
      router.replace(dest);
    }
  }, [isLoading, isAuthenticated, isClassIncharge, effectiveRole, router]);

  if (isLoading || !isClassIncharge) {
    return <GifLoader />;
  }

  return <>{children}</>;
}
