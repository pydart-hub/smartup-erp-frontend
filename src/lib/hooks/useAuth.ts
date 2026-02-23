"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { getCurrentUser, login as apiLogin, logout as apiLogout } from "@/lib/api/auth";
import { ROLE_DASHBOARD_MAP } from "@/lib/utils/constants";
import type { LoginCredentials } from "@/lib/types/user";

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, role, setUser, setLoading, clearAuth } = useAuthStore();

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
    // Redirect to role-specific dashboard
    const primaryRole = loggedUser.roles?.[0] || loggedUser.role_profile_name || "";
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
    login,
    logout,
    getDashboardRoute,
  };
}
