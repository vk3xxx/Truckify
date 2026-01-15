import { apiClient } from './client';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

export interface User {
  id: string;
  email: string;
  user_type: 'shipper' | 'driver' | 'fleet_operator' | 'dispatcher' | 'admin';
  email_verified: boolean;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export const authApi = {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login', { email, password });
    const data = response.data.data;

    // Store tokens securely
    await SecureStore.setItemAsync('accessToken', data.access_token);
    await SecureStore.setItemAsync('refreshToken', data.refresh_token);
    await SecureStore.setItemAsync('user', JSON.stringify(data.user));

    // Optionally store credentials for biometric login
    await SecureStore.setItemAsync('savedEmail', email);

    return data;
  },

  /**
   * Register new user
   */
  async register(email: string, password: string, userType: string): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      user_type: userType,
    });
    const data = response.data.data;

    await SecureStore.setItemAsync('accessToken', data.access_token);
    await SecureStore.setItemAsync('refreshToken', data.refresh_token);
    await SecureStore.setItemAsync('user', JSON.stringify(data.user));

    return data;
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
  },

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  },

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometric(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to login',
      fallbackLabel: 'Use password',
      cancelLabel: 'Cancel',
    });
    return result.success;
  },

  /**
   * Enable biometric login for current user
   */
  async enableBiometricLogin(password: string): Promise<void> {
    await SecureStore.setItemAsync('biometricPassword', password);
    await SecureStore.setItemAsync('biometricEnabled', 'true');
  },

  /**
   * Check if biometric login is enabled
   */
  async isBiometricLoginEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync('biometricEnabled');
    return enabled === 'true';
  },

  /**
   * Login with biometrics
   */
  async loginWithBiometric(): Promise<LoginResponse> {
    const authenticated = await this.authenticateWithBiometric();
    if (!authenticated) {
      throw new Error('Biometric authentication failed');
    }

    const email = await SecureStore.getItemAsync('savedEmail');
    const password = await SecureStore.getItemAsync('biometricPassword');

    if (!email || !password) {
      throw new Error('No saved credentials');
    }

    return this.login(email, password);
  },

  /**
   * Get stored user
   */
  async getStoredUser(): Promise<User | null> {
    const userString = await SecureStore.getItemAsync('user');
    return userString ? JSON.parse(userString) : null;
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await SecureStore.getItemAsync('accessToken');
    return !!token;
  },
};
