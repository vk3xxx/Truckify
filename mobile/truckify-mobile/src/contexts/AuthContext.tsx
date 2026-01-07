import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';
import { biometricService } from '../services/biometric';
import { offlineService } from '../services/offline';
import { passkeyService } from '../services/passkey';

interface User {
  id: string;
  email: string;
  user_type: 'shipper' | 'driver' | 'fleet_operator' | 'dispatcher' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  biometricEnabled: boolean;
  biometricType: string;
  hasPasskey: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithBiometric: () => Promise<boolean>;
  loginWithPasskey: (authData: any) => Promise<void>;
  register: (email: string, password: string, userType: string) => Promise<void>;
  registerWithPasskey: (authData: any, userType: string) => Promise<void>;
  logout: () => Promise<void>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  removePasskey: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometrics');
  const [hasPasskey, setHasPasskey] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    await offlineService.initialize();
    setIsOnline(offlineService.isConnected());
    
    offlineService.addConnectionListener((online) => {
      setIsOnline(online);
    });

    const bioEnabled = await biometricService.isEnabled();
    setBiometricEnabled(bioEnabled);
    
    if (await biometricService.isSupported()) {
      const name = await biometricService.getBiometricName();
      setBiometricType(name);
    }

    // Check passkey
    const passkey = await passkeyService.hasPasskey();
    setHasPasskey(passkey);

    await loadStoredAuth();
  };

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const userData = await SecureStore.getItemAsync('user');
      
      if (token && userData) {
        api.setToken(token);
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuthData = async (userData: User, accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    api.setToken(accessToken);
    setUser(userData);
    await offlineService.cache('user', userData);
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    if (response.success && response.data) {
      const { user, access_token, refresh_token } = response.data;
      await saveAuthData(user, access_token, refresh_token);
      await SecureStore.setItemAsync('auth_email', email);
      await SecureStore.setItemAsync('auth_password', password);
    }
  };

  const loginWithBiometric = async (): Promise<boolean> => {
    if (!biometricEnabled) return false;

    const result = await biometricService.authenticate();
    if (!result.success) return false;

    const email = await SecureStore.getItemAsync('auth_email');
    const password = await SecureStore.getItemAsync('auth_password');

    if (!email || !password) return false;

    try {
      await login(email, password);
      return true;
    } catch {
      if (!isOnline) {
        const cachedUser = await offlineService.getCached<User>('user');
        if (cachedUser) {
          setUser(cachedUser);
          return true;
        }
      }
      return false;
    }
  };

  const loginWithPasskey = async (authData: any) => {
    const { user, access_token, refresh_token } = authData;
    await saveAuthData(user, access_token, refresh_token);
    setHasPasskey(true);
  };

  const register = async (email: string, password: string, userType: string) => {
    const response = await api.register(email, password, userType);
    if (response.success && response.data) {
      const { user, access_token, refresh_token } = response.data;
      await saveAuthData(user, access_token, refresh_token);
      await SecureStore.setItemAsync('auth_email', email);
      await SecureStore.setItemAsync('auth_password', password);
    }
  };

  const registerWithPasskey = async (authData: any, userType: string) => {
    const { user, access_token, refresh_token } = authData;
    await saveAuthData(user, access_token, refresh_token);
    setHasPasskey(true);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user');
    api.setToken(null);
    setUser(null);
  };

  const enableBiometric = async (): Promise<boolean> => {
    const success = await biometricService.enable();
    if (success) setBiometricEnabled(true);
    return success;
  };

  const disableBiometric = async () => {
    await biometricService.disable();
    setBiometricEnabled(false);
  };

  const removePasskey = async () => {
    await passkeyService.removePasskey();
    setHasPasskey(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      isOnline,
      biometricEnabled,
      biometricType,
      hasPasskey,
      login,
      loginWithBiometric,
      loginWithPasskey,
      register,
      registerWithPasskey,
      logout,
      enableBiometric,
      disableBiometric,
      removePasskey,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
