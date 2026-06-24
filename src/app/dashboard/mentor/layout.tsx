"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";

export default function MentorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { role, activeRole, user, isLoading, isAuthenticated } = useAuthStore();
  const effectiveRole = activeRole ?? role;
  const isMentor = effectiveRole === "Mentor" || (user?.roles ?? []).includes("Mentor");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (!isMentor) {
      const roleRoutes: Record<string, string> = {
        "Branch Manager": "/dashboard/branch-manager",
        "General Manager": "/dashboard/general-manager",
        Director: "/dashboard/director",
        Parent: "/dashboard/parent",
        Instructor: "/dashboard/instructor",
        "Class Incharge": "/dashboard/class-incharge",
        Administrator: "/dashboard/branch-manager",
      };
      router.replace(roleRoutes[effectiveRole ?? ""] || "/dashboard/branch-manager");
    }
  }, [effectiveRole, isAuthenticated, isLoading, isMentor, router]);

  if (isLoading || !isMentor) return <GifLoader />;
  return <>{children}</>;
}
