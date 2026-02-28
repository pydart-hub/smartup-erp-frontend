export interface User {
  name: string;
  email: string;
  full_name: string;
  user_image?: string;
  role_profile_name?: string;
  roles: string[];
  api_key?: string;
  api_secret?: string;
  /** Companies (branches) this user has access to via User Permission */
  allowed_companies?: string[];
  /** Default company (branch) for this user */
  default_company?: string;
  /** Instructor name (Frappe Instructor doctype name) — only set for instructors */
  instructor_name?: string;
  /** Display name of the instructor */
  instructor_display_name?: string;
  /** Student Batch Names this instructor can access (from User Permission) */
  allowed_batches?: string[];
  /** Default batch for this instructor */
  default_batch?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}
