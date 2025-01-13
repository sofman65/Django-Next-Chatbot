'use client';
import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  role: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthContextType {
  authState: AuthState;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  signup: (credentials: { username: string; password: string; role_name: string }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const initAuth = useCallback(async () => {
    try {
      const user = localStorage.getItem('user');
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // Debugging: Log the retrieved values
      console.log('Auth data from storage:', { user, accessToken, refreshToken });

      // Check if this is a fresh session (all values null)
      if (user === null && accessToken === null && refreshToken === null) {
        console.log('Fresh session detected - no auth data in storage');
        setAuthState({
          user: null,
          accessToken: null,
          refreshToken: null,
        });
        return;
      }

      // Check if any required token is missing or invalid
      if (!user || user === 'undefined' || !accessToken || accessToken === 'undefined' || !refreshToken || refreshToken === 'undefined') {
        console.warn('Missing or invalid auth data in storage - clearing potentially corrupted data');
        // Clear any potentially corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setAuthState({
          user: null,
          accessToken: null,
          refreshToken: null,
        });
        return;
      }

      // If we have valid data, set the auth state
      setAuthState({
        user: JSON.parse(user),
        accessToken,
        refreshToken,
      });

    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear invalid data from storage
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setAuthState({
        user: null,
        accessToken: null,
        refreshToken: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (credentials: { username: string; password: string }) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);

      setAuthState({
        user: data.user,
        accessToken: data.access,
        refreshToken: data.refresh,
      });

      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (credentials: { username: string; password: string; role_name: string }) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/auth/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Signup failed');
      }

      // Automatically login after successful signup
      await login({
        username: credentials.username,
        password: credentials.password,
      });
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = authState.refreshToken;
      if (refreshToken) {
        await fetch(`${BACKEND_URL}/api/auth/logout/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      }

      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      setAuthState({
        user: null,
        accessToken: null,
        refreshToken: null,
      });

      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = authState.refreshToken;
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await fetch(`${BACKEND_URL}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) throw new Error('Token refresh failed');

      const data = await response.json();
      
      localStorage.setItem('accessToken', data.access);
      setAuthState(prev => ({
        ...prev,
        accessToken: data.access,
      }));

      return data.access;
    } catch (error) {
      console.error('Token refresh error:', error);
      await logout();
      throw error;
    }
  };

  const isAuthenticated = !!authState.accessToken;

  return (
    <AuthContext.Provider value={{ 
      authState, 
      login, 
      signup, 
      logout, 
      isAuthenticated,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}