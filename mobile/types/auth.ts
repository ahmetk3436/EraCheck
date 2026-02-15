export interface User {
  id: string;
  email: string;
  isAppleUser?: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}
