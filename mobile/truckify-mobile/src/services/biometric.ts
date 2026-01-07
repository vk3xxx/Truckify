import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

class BiometricService {
  // Check if device supports biometrics
  async isSupported(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  }

  // Get available biometric type
  async getBiometricType(): Promise<BiometricType> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'facial';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
    return 'none';
  }

  // Get friendly name for biometric type
  async getBiometricName(): Promise<string> {
    const type = await this.getBiometricType();
    switch (type) {
      case 'facial': return 'Face ID';
      case 'fingerprint': return 'Touch ID';
      case 'iris': return 'Iris Scan';
      default: return 'Biometrics';
    }
  }

  // Check if user has enabled biometric login
  async isEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  }

  // Enable biometric login
  async enable(): Promise<boolean> {
    const supported = await this.isSupported();
    if (!supported) return false;

    // Verify user can authenticate
    const result = await this.authenticate('Enable biometric login');
    if (result.success) {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      return true;
    }
    return false;
  }

  // Disable biometric login
  async disable(): Promise<void> {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  }

  // Authenticate with biometrics
  async authenticate(promptMessage?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const biometricName = await this.getBiometricName();
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || `Login with ${biometricName}`,
        cancelLabel: 'Use Password',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error === 'user_cancel' ? 'Cancelled' : 'Authentication failed',
      };
    } catch (error) {
      return { success: false, error: 'Biometric authentication unavailable' };
    }
  }
}

export const biometricService = new BiometricService();
