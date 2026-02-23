import axios from "axios";
import type { LoginCredentials, ForgotPasswordPayload, User } from "@/lib/types/user";

const authApi = axios.create({
  baseURL: "/api/auth",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export async function login(credentials: LoginCredentials): Promise<User> {
  const { data } = await authApi.post("/login", credentials);
  return data.user;
}

export async function logout(): Promise<void> {
  await authApi.post("/logout");
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
  const { data } = await authApi.post("/forgot-password", payload);
  return data;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data } = await authApi.get("/me");
    return data.user;
  } catch {
    return null;
  }
}
