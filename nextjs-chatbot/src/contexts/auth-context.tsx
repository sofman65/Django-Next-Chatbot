'use client';
import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, AuthState, LoginCredentials, SignupCredentials } from '@/types/auth';

interface AuthContextType {
  authState: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
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

  const checkTokenExpiration = (token: string | null): boolean => {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch (error) {
      console.error('Token parsing error:', error);
      return false;
    }
  };

  const refreshToken = useCallback(async () => {
    try {
      const newAccessToken = await fetch(`${BACKEND_URL}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: authState.refreshToken }),
      }).then(res => {
        if (!res.ok) throw new Error('Token refresh failed');
        return res.json();
      }).then(data => data.access);

      setAuthState(prev => ({
        ...prev,
        accessToken: newAccessToken,
      }));
      localStorage.setItem('accessToken', newAccessToken);
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }, [authState.refreshToken]);

  const logout = useCallback(async () => {
    try {
      if (authState.accessToken && checkTokenExpiration(authState.accessToken)) {
        await fetch(`${BACKEND_URL}/api/auth/logout/`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.accessToken}`
          },
          body: JSON.stringify({ refresh: authState.refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
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
  }, [authState, router]);

  useEffect(() => {
    if (!isLoading) return;
    
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const user = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');
        const storedrefreshToken = localStorage.getItem('refreshToken');
        
        console.log('Initial auth check:', { user, accessToken, storedrefreshToken });
        
        if (user && accessToken && storedrefreshToken) {
          if (checkTokenExpiration(accessToken)) {
            const parsedUser = JSON.parse(user);
            setAuthState({
              user: parsedUser,
              accessToken,
              refreshToken: storedrefreshToken,
            });
          } else if (checkTokenExpiration(storedrefreshToken)) {
            await refreshToken();
          } else {
            console.log('Tokens expired, logging out');
            await logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, [logout, refreshToken, isLoading, setIsLoading]);

  const login = async (credentials: LoginCredentials) => {
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
      
      if (!data.access || !data.refresh) {
        throw new Error('Invalid token response');
      }
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      
      setAuthState({
        user: data.user,
        accessToken: data.access,
        refreshToken: data.refresh,
      });
    
      console.log('Login successful, redirecting...');
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        throw new Error('Signup failed');
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
      console.error('Signup error:', error);
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