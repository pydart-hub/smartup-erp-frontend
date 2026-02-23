export interface User {
  name: string;
  email: string;
  full_name: string;
  user_image?: string;
  role_profile_name?: string;
  roles: string[];
  api_key?: string;
  api_secret?: string;
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
