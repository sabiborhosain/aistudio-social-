import React, { createContext, useContext, useState, useEffect } from 'react';
import { CurrentUser } from '../types.ts';
import { apiRequest } from '../services/api.ts';

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string, username: string, fullName: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  authModal: {
    isOpen: boolean;
    mode: 'login' | 'register' | 'forgot';
    open: (mode?: 'login' | 'register' | 'forgot') => void;
    close: () => void;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('devsphere_token'));
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'login' | 'register' | 'forgot' }>({
    isOpen: false,
    mode: 'login'
  });

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('devsphere_token');
    if (!storedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest<CurrentUser>('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        localStorage.removeItem('devsphere_token');
        setUser(null);
        setToken(null);
      }
    } catch {
      localStorage.removeItem('devsphere_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{ token: string; user: CurrentUser }>('/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    if (res.success && res.data?.token) {
      localStorage.setItem('devsphere_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setModalState(prev => ({ ...prev, isOpen: false }));
      return { success: true };
    }
    return { success: false, message: res.message || 'Login failed' };
  };

  const register = async (email: string, password: string, username: string, fullName: string) => {
    const res = await apiRequest<{ token: string; user: CurrentUser }>('/auth/register', {
      method: 'POST',
      body: { email, password, username, fullName }
    });

    if (res.success && res.data?.token) {
      localStorage.setItem('devsphere_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setModalState(prev => ({ ...prev, isOpen: false }));
      return { success: true };
    }
    return { success: false, message: res.message || 'Registration failed' };
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    localStorage.removeItem('devsphere_token');
    setToken(null);
    setUser(null);
  };

  const openModal = (mode: 'login' | 'register' | 'forgot' = 'login') => {
    setModalState({ isOpen: true, mode });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        authModal: {
          isOpen: modalState.isOpen,
          mode: modalState.mode,
          open: openModal,
          close: closeModal
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
