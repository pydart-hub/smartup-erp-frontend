import { create } from "zustand";
import type { User } from "@/lib/types/user";

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: string | null;

  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  role: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
      role: user.roles?.[0] || user.role_profile_name || null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  clearAuth: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      role: null,
    }),
}));
