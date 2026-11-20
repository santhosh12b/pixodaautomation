import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface AuthUser {
  username: string;
  name: string;
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'tec_auth_token';
const USER_KEY = 'tec_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // First try the backend login endpoint
      try {
        const res = await api.login({ username: username.trim(), password: password.trim() });
        if (res && res.token) {
          const authUser = res.user || { username: 'theeditingcrew', name: 'The Editing Crew' };
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USER_KEY, JSON.stringify(authUser));
          setToken(res.token);
          setUser(authUser);
          return { success: true };
        }
      } catch (apiErr) {
        // Fallback credential check for offline / immediate client verification
        if (username.trim() === 'theeditingcrew' && password.trim() === 'Dunesday@17') {
          const clientToken = 'tec_auth_token_theeditingcrew';
          const authUser = { username: 'theeditingcrew', name: 'The Editing Crew', role: 'admin' };
          localStorage.setItem(TOKEN_KEY, clientToken);
          localStorage.setItem(USER_KEY, JSON.stringify(authUser));
          setToken(clientToken);
          setUser(authUser);
          return { success: true };
        }
        const errorMsg = apiErr instanceof Error ? apiErr.message : 'Invalid username or password';
        return { success: false, error: errorMsg };
      }

      if (username.trim() === 'theeditingcrew' && password.trim() === 'Dunesday@17') {
        const clientToken = 'tec_auth_token_theeditingcrew';
        const authUser = { username: 'theeditingcrew', name: 'The Editing Crew', role: 'admin' };
        localStorage.setItem(TOKEN_KEY, clientToken);
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        setToken(clientToken);
        setUser(authUser);
        return { success: true };
      }

      return { success: false, error: 'Invalid username or password' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

