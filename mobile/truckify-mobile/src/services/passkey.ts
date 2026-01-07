import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://10.0.10.214:8001';
const PASSKEY_CREDENTIAL_KEY = 'passkey_credential_id';

interface PasskeyCredential {
  id: string;
  rawId: string;
  type: string;
  response: {
    clientDataJSON: string;
    attestationObject?: string;
    authenticatorData?: string;
    signature?: string;
    userHandle?: string;
  };
}

interface WebAuthnChallenge {
  challenge: string;
  rpId: string;
  rpName: string;
  userId?: string;
  userName?: string;
  userDisplayName?: string;
  timeout?: number;
  allowCredentials?: { id: string; type: string }[];
}

class PasskeyService {
  private isSupported: boolean = false;

  constructor() {
    // Passkeys supported on iOS 16+ and Android 9+
    this.isSupported = Platform.OS === 'ios' || Platform.OS === 'android';
  }

  isPasskeySupported(): boolean {
    return this.isSupported;
  }

  // Check if user has a registered passkey
  async hasPasskey(): Promise<boolean> {
    const credentialId = await SecureStore.getItemAsync(PASSKEY_CREDENTIAL_KEY);
    return !!credentialId;
  }

  // Get stored credential ID
  async getStoredCredentialId(): Promise<string | null> {
    return await SecureStore.getItemAsync(PASSKEY_CREDENTIAL_KEY);
  }

  // Begin passkey registration - get challenge from server
  async beginRegistration(email: string): Promise<WebAuthnChallenge> {
    const response = await fetch(`${API_URL}/passkey/register/begin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to begin registration');
    }

    const data = await response.json();
    return data.data;
  }

  // Complete passkey registration - send credential to server
  async completeRegistration(email: string, credential: PasskeyCredential): Promise<any> {
    const response = await fetch(`${API_URL}/passkey/register/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        credential: {
          id: credential.id,
          rawId: credential.rawId,
          type: credential.type,
          response: {
            clientDataJSON: credential.response.clientDataJSON,
            attestationObject: credential.response.attestationObject,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to complete registration');
    }

    // Store credential ID for future logins
    await SecureStore.setItemAsync(PASSKEY_CREDENTIAL_KEY, credential.id);

    return await response.json();
  }

  // Begin passkey authentication - get challenge from server
  async beginAuthentication(email?: string): Promise<WebAuthnChallenge> {
    const response = await fetch(`${API_URL}/passkey/login/begin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to begin authentication');
    }

    const data = await response.json();
    return data.data;
  }

  // Complete passkey authentication - verify with server
  async completeAuthentication(credential: PasskeyCredential): Promise<any> {
    const response = await fetch(`${API_URL}/passkey/login/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: {
          id: credential.id,
          rawId: credential.rawId,
          type: credential.type,
          response: {
            clientDataJSON: credential.response.clientDataJSON,
            authenticatorData: credential.response.authenticatorData,
            signature: credential.response.signature,
            userHandle: credential.response.userHandle,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Authentication failed');
    }

    return await response.json();
  }

  // Remove stored passkey
  async removePasskey(): Promise<void> {
    await SecureStore.deleteItemAsync(PASSKEY_CREDENTIAL_KEY);
  }

  // Helper to encode ArrayBuffer to base64url
  arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // Helper to decode base64url to ArrayBuffer
  base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const passkeyService = new PasskeyService();
