"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type {
  AuthState,
  LoginCredentials,
  SignupCredentials,
  User,
} from "@/types/auth";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [state, setState] = React.useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
  });

  // Check for existing auth state on mount
  React.useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    const user = localStorage.getItem("user");

    if (accessToken && refreshToken && user) {
      setState({
        accessToken,
        refreshToken,
        user: JSON.parse(user),
      });
    }
  }, []);

  const login = React.useCallback(
    async (credentials: LoginCredentials) => {
      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          throw new Error("Login failed");
        }

        const data = await response.json();

        // Store tokens and user data
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);
        localStorage.setItem("user", JSON.stringify(data.user));

        setState({
          accessToken: data.access,
          refreshToken: data.refresh,
          user: data.user,
        });

        router.push("/chat");
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const signup = React.useCallback(
    async (credentials: SignupCredentials) => {
      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          throw new Error("Signup failed");
        }

        // After successful signup, log the user in
        await login({
          username: credentials.username,
          password: credentials.password,
        });
      } catch (error) {
        console.error("Signup error:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [login],
  );

  const logout = React.useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
    });
    router.push("/login");
  }, [router]);

  const value = React.useMemo(
    () => ({
      ...state,
      login,
      signup,
      logout,
      isLoading,
    }),
    [state, login, signup, logout, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
