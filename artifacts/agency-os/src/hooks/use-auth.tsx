import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  organizationId: number;
  clientId?: number;
  projectId?: number;
  createdAt: string;
  accountType: 'staff' | 'client';
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem('agency_os_token');
    const storedUser = localStorage.getItem('agency_os_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('agency_os_token', data.token);
    localStorage.setItem('agency_os_user', JSON.stringify(data.user));

    if (data.user.accountType === 'client') {
      setLocation('/portal');
    } else {
      setLocation('/dashboard');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('agency_os_token');
    localStorage.removeItem('agency_os_user');
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ('staff' | 'client')[] }) {
  const { token, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!token || !user) {
      setLocation('/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.accountType)) {
      if (user.accountType === 'client') {
        setLocation('/portal');
      } else {
        setLocation('/dashboard');
      }
    }
  }, [isLoading, token, user, allowedRoles, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!token || !user) return null;
  if (allowedRoles && !allowedRoles.includes(user.accountType)) return null;
  return <>{children}</>;
}
