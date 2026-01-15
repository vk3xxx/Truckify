import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User } from '../api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  register: (email: string, password: string, userType: string) => Promise<void>;
  logout: () => Promise<void>;
  enableBiometric: (password: string) => Promise<void>;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  useEffect(() => {
    checkAuth();
    checkBiometric();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = await authApi.getStoredUser();
      const isAuth = await authApi.isAuthenticated();

      if (isAuth && storedUser) {
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBiometric = async () => {
    const available = await authApi.isBiometricAvailable();
    const enabled = await authApi.isBiometricLoginEnabled();
    setIsBiometricAvailable(available);
    setIsBiometricEnabled(enabled);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const loginWithBiometric = async () => {
    try {
      const response = await authApi.loginWithBiometric();
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, userType: string) => {
    try {
      const response = await authApi.register(email, password, userType);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const enableBiometric = async (password: string) => {
    try {
      await authApi.enableBiometricLogin(password);
      setIsBiometricEnabled(true);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithBiometric,
        register,
        logout,
        enableBiometric,
        isBiometricAvailable,
        isBiometricEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
