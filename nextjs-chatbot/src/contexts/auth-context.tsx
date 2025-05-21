'use client';
// This file is a React context provider for authentication state management.
// It handles login, logout, and token refresh operations.
// It uses localStorage to persist authentication tokens and fetches user data from the backend.
// The context is used to provide authentication state and functions to the rest of the application.
// It also includes a custom hook `useAuth` to access the authentication context.
// The context is created using React's createContext and useContext hooks.
// The `AuthProvider` component wraps the application and provides the authentication context.
// The `useAuth` hook allows components to access the authentication context.
// The `AuthProvider` component manages the authentication state, including loading the initial state from localStorage,
// handling login and logout operations, and refreshing tokens.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

type AuthState = {
  accessToken: string | null;
  user: { id: number; username: string; role: string } | null;
};

type AuthContextType = {
  authState: AuthState;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (creds: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    accessToken: null,
    user: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Helper: persist to localStorage
  const persistTokens = (access: string, refresh: string) => {
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
    setAuthState((s) => ({ ...s, accessToken: access }));
  };

  // Load tokens + current user on mount
  useEffect(() => {
    const access = localStorage.getItem("access");
    const refresh = localStorage.getItem("refresh");
    if (access && refresh) {
      setAuthState((s) => ({ ...s, accessToken: access }));
      fetch(`${API_BASE}/api/auth/user/`, {
        headers: { Authorization: `Bearer ${access}` },
      })
        .then((r) => {
          if (!r.ok) throw new Error("User not valid");
          return r.json();
        })
        .then((user) => {
          setAuthState((s) => ({ ...s, user }));
          setIsLoading(false);
        })
        .catch(() => {
          setAuthState({ accessToken: null, user: null });
          setIsLoading(false);
        });
    } else {
      setAuthState({ accessToken: null, user: null });
      setIsLoading(false);
    }
  }, []);

  // Refresh token flow
  const refreshToken = useCallback(async () => {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) throw new Error("No refresh token");
    const res = await fetch(`${API_BASE}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) throw new Error("Refresh failed");
    const { access } = await res.json();
    persistTokens(access, refresh);
  }, []);

  // login()
  const login = useCallback(
    async (creds: { username: string; password: string }) => {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      if (!res.ok) {
        setIsLoading(false);
        throw new Error("Invalid credentials");
      }
      const { access, refresh } = await res.json();
      persistTokens(access, refresh);

      // fetch user profile
      const userRes = await fetch(`${API_BASE}/api/auth/user/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (!userRes.ok) {
        setIsLoading(false);
        throw new Error("User not found");
      }
      const user = await userRes.json();
      setAuthState({ accessToken: access, user });
      setIsLoading(false);
      router.push("/");
    },
    [router]
  );

  // logout()
  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refresh");
    await fetch(`${API_BASE}/api/auth/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setAuthState({ accessToken: null, user: null });
    setIsLoading(false);
  }, [router]);

  const isAuthenticated = !!authState.accessToken && !!authState.user;

  return (
    <AuthContext.Provider
      value={{
        authState,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
