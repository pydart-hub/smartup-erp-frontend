"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { getCurrentUser, login as apiLogin, logout as apiLogout } from "@/lib/api/auth";
import { ROLE_DASHBOARD_MAP } from "@/lib/utils/constants";
import type { LoginCredentials } from "@/lib/types/user";

export function useAuth() {
  const router = useRouter();
  const {
    user, isAuthenticated, isLoading, role,
    allowedCompanies, defaultCompany,
    isInstructor, instructorName, instructorDisplayName,
    allowedBatches, defaultBatch,
    setUser, setLoading, clearAuth,
  } = useAuthStore();

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    }
    if (!isAuthenticated) {
      checkSession();
    }
  }, [isAuthenticated, setUser, setLoading]);

  async function login(credentials: LoginCredentials) {
    const loggedUser = await apiLogin(credentials);
    setUser(loggedUser);
    // Redirect to role-specific dashboard — pick the best app role, not just roles[0]
    const APP_ROLES = ["Director", "Management", "Branch Manager", "HR Manager", "Administrator", "Instructor", "Batch Coordinator", "Teacher", "Accounts User", "Parent"];
    const primaryRole = APP_ROLES.find((r) => loggedUser.roles?.includes(r)) || loggedUser.role_profile_name || "";
    const dashboardRoute = ROLE_DASHBOARD_MAP[primaryRole] || "/dashboard/branch-manager";
    router.push(dashboardRoute);
    return loggedUser;
  }

  async function logout() {
    await apiLogout();
    clearAuth();
    router.push("/auth/login");
  }

  function getDashboardRoute(): string {
    return role ? ROLE_DASHBOARD_MAP[role] || "/dashboard/branch-manager" : "/auth/login";
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    role,
    allowedCompanies,
    defaultCompany,
    isInstructor,
    instructorName,
    instructorDisplayName,
    allowedBatches,
    defaultBatch,
    login,
    logout,
    getDashboardRoute,
  };
}
