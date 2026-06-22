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
  const { role, isLoading, isAuthenticated } = useAuthStore();
  const isMentor = role === "Mentor";

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
        Administrator: "/dashboard/branch-manager",
      };
      router.replace(roleRoutes[role ?? ""] || "/dashboard/branch-manager");
    }
  }, [isAuthenticated, isLoading, isMentor, role, router]);

  if (isLoading || !isMentor) return <GifLoader />;
  return <>{children}</>;
}
