import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// ── Frappe API Client ──
// All requests go through Next.js API routes to keep tokens server-side.
// The proxy route at /api/proxy/[...path] forwards to Frappe with auth headers.

const apiClient = axios.create({
  baseURL: "/api/proxy",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
  timeout: 30000,
});

// ── Request Interceptor ──
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add any request-level transforms here
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Session truly expired or missing — redirect to login.
      // Guard: only redirect if not already on the login page to avoid loops.
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/auth/login")
      ) {
        window.location.href = "/auth/login?session=expired";
      }
    }
    // 403 = authenticated but lacking permission for this resource.
    // Don't redirect — let the calling page handle it (show error, toast, etc.).
    return Promise.reject(error);
  }
);

export default apiClient;

// ── Direct Frappe client (for server-side API routes only) ──
export function createServerFrappeClient(apiKey: string, apiSecret: string) {
  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_FRAPPE_URL,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `token ${apiKey}:${apiSecret}`,
    },
    timeout: 30000,
  });
}
