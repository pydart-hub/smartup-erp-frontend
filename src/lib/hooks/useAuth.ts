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
    user, isAuthenticated, isLoading, role, activeRole, switchableRoles,
    allowedCompanies, defaultCompany,
    isInstructor, instructorName, instructorDisplayName,
    allowedBatches, defaultBatch,
    setUser, setLoading, setActiveRole: storeSetActiveRole, clearAuth,
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
    const APP_ROLES = ["Director", "Management", "General Manager", "Branch Manager", "HR Manager", "Administrator", "Instructor", "Batch Coordinator", "Teacher", "Sales User", "Accounts User", "Parent"];
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

  /** Switch to a different role and navigate to its dashboard */
  function switchRole(newRole: string) {
    storeSetActiveRole(newRole);
    const route = ROLE_DASHBOARD_MAP[newRole] || "/dashboard/branch-manager";
    router.push(route);
  }

  function getDashboardRoute(): string {
    return role ? ROLE_DASHBOARD_MAP[role] || "/dashboard/branch-manager" : "/auth/login";
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    role,
    activeRole,
    switchableRoles,
    allowedCompanies,
    defaultCompany,
    isInstructor,
    instructorName,
    instructorDisplayName,
    allowedBatches,
    defaultBatch,
    login,
    logout,
    switchRole,
    getDashboardRoute,
  };
}
