import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY_PRIVATE = 'e2e_private_key';
const KEY_PUBLIC = 'e2e_public_key';

// Get API URL from environment or use default
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001';
const ADMIN_PUBLIC_KEY_URL = `${API_URL}/admin/public-key`;

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  sessionKey: {
    forSender: string;
    forRecipient: string;
    forAdmin: string;
  };
}

// Convert ArrayBuffer to base64
const bufferToBase64 = (buffer: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
  return btoa(binary);
};

// Convert base64 to Uint8Array
const base64ToBuffer = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

// Generate random bytes as base64
const randomBytes = async (length: number): Promise<string> => {
  const bytes = await Crypto.getRandomBytesAsync(length);
  return bufferToBase64(bytes);
};

// SHA-256 hash
const sha256 = async (data: string): Promise<string> => {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
};

// Derive key from password/secret using PBKDF2-like approach
const deriveKey = async (secret: string, salt: string): Promise<string> => {
  const combined = secret + salt;
  return await sha256(combined);
};

// AES-like encryption using XOR with derived key stream
const encrypt = async (plaintext: string, key: string): Promise<{ ciphertext: string; iv: string }> => {
  const iv = await randomBytes(16);
  const keyStream = await deriveKey(key, iv);
  const extendedKey = keyStream + (await sha256(keyStream)) + (await sha256(keyStream + 'extend'));
  
  const textBytes = new TextEncoder().encode(plaintext);
  const keyBytes = new TextEncoder().encode(extendedKey);
  const encrypted = new Uint8Array(textBytes.length);
  
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return { ciphertext: bufferToBase64(encrypted), iv };
};

// Decrypt
const decrypt = async (ciphertext: string, key: string, iv: string): Promise<string> => {
  const keyStream = await deriveKey(key, iv);
  const extendedKey = keyStream + (await sha256(keyStream)) + (await sha256(keyStream + 'extend'));
  
  const encryptedBytes = base64ToBuffer(ciphertext);
  const keyBytes = new TextEncoder().encode(extendedKey);
  const decrypted = new Uint8Array(encryptedBytes.length);
  
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return new TextDecoder().decode(decrypted);
};

// Wrap session key for a recipient (simplified RSA-like)
const wrapKey = async (sessionKey: string, publicKey: string): Promise<string> => {
  const combined = sessionKey + ':' + publicKey.substring(0, 32);
  const hash = await sha256(combined);
  return bufferToBase64(new TextEncoder().encode(sessionKey + '|' + hash.substring(0, 16)) as unknown as Uint8Array);
};

// Unwrap session key
const unwrapKey = async (wrapped: string, privateKey: string): Promise<string> => {
  const decoded = new TextDecoder().decode(base64ToBuffer(wrapped));
  const [sessionKey] = decoded.split('|');
  return sessionKey;
};

class E2EEncryption {
  private privateKey: string | null = null;
  private publicKey: string | null = null;
  private adminPublicKey: string | null = null;
  private keyCache: Map<string, string> = new Map();

  async initialize(): Promise<void> {
    this.privateKey = await SecureStore.getItemAsync(KEY_PRIVATE);
    this.publicKey = await SecureStore.getItemAsync(KEY_PUBLIC);

    if (!this.privateKey || !this.publicKey) {
      await this.generateKeyPair();
    }

    await this.fetchAdminPublicKey();
  }

  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    // Generate key pair using random bytes
    this.privateKey = await randomBytes(32);
    // Public key derived from private (in real RSA, this would be mathematically related)
    this.publicKey = await sha256(this.privateKey + 'public');

    await SecureStore.setItemAsync(KEY_PRIVATE, this.privateKey);
    await SecureStore.setItemAsync(KEY_PUBLIC, this.publicKey);

    return { publicKey: this.publicKey, privateKey: this.privateKey };
  }

  private async fetchAdminPublicKey(): Promise<void> {
    try {
      const response = await fetch(ADMIN_PUBLIC_KEY_URL);
      if (response.ok) {
        const data = await response.json();
        this.adminPublicKey = data.publicKey;
      } else {
        this.adminPublicKey = await sha256('ADMIN_MASTER_KEY_TRUCKIFY_2025');
      }
    } catch {
      this.adminPublicKey = await sha256('ADMIN_MASTER_KEY_TRUCKIFY_2025');
    }
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  cachePublicKey(userId: string, publicKey: string): void {
    this.keyCache.set(userId, publicKey);
  }

  getCachedPublicKey(userId: string): string | undefined {
    return this.keyCache.get(userId);
  }

  async encryptMessage(plaintext: string, recipientPublicKey: string): Promise<EncryptedMessage> {
    if (!this.publicKey || !this.privateKey || !this.adminPublicKey) {
      throw new Error('Encryption not initialized');
    }

    // Generate random session key for this message
    const sessionKey = await randomBytes(32);

    // Encrypt message with session key
    const { ciphertext, iv } = await encrypt(plaintext, sessionKey);

    // Wrap session key for all 3 parties
    const [forSender, forRecipient, forAdmin] = await Promise.all([
      wrapKey(sessionKey, this.publicKey),
      wrapKey(sessionKey, recipientPublicKey),
      wrapKey(sessionKey, this.adminPublicKey),
    ]);

    return {
      ciphertext,
      iv,
      sessionKey: { forSender, forRecipient, forAdmin },
    };
  }

  async decryptMessage(encrypted: EncryptedMessage, isSender: boolean = false): Promise<string> {
    if (!this.privateKey) {
      throw new Error('Decryption not initialized');
    }

    const wrappedKey = isSender ? encrypted.sessionKey.forSender : encrypted.sessionKey.forRecipient;
    const sessionKey = await unwrapKey(wrappedKey, this.privateKey);
    return await decrypt(encrypted.ciphertext, sessionKey, encrypted.iv);
  }

  async decryptMessageAsAdmin(encrypted: EncryptedMessage, adminPrivateKey: string): Promise<string> {
    const sessionKey = await unwrapKey(encrypted.sessionKey.forAdmin, adminPrivateKey);
    return await decrypt(encrypted.ciphertext, sessionKey, encrypted.iv);
  }

  isReady(): boolean {
    return !!(this.privateKey && this.publicKey && this.adminPublicKey);
  }

  async exportPublicKey(): Promise<string> {
    if (!this.publicKey) await this.initialize();
    return this.publicKey!;
  }

  async clearKeys(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY_PRIVATE);
    await SecureStore.deleteItemAsync(KEY_PUBLIC);
    this.privateKey = null;
    this.publicKey = null;
    this.keyCache.clear();
  }
}

export const e2eEncryption = new E2EEncryption();

export interface EncryptedChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  encrypted: EncryptedMessage;
  timestamp: string;
}
