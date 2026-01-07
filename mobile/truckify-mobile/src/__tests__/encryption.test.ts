import { e2eEncryption } from '../services/encryption';

// Mock fetch for admin key
global.fetch = jest.fn(() =>
  Promise.resolve({ ok: false } as Response)
);

describe('E2E Encryption', () => {
  beforeEach(async () => {
    await e2eEncryption.clearKeys();
  });

  test('initializes and generates key pair', async () => {
    await e2eEncryption.initialize();
    expect(e2eEncryption.isReady()).toBe(true);
    expect(e2eEncryption.getPublicKey()).toBeTruthy();
  });

  test('encrypts and decrypts message as sender', async () => {
    await e2eEncryption.initialize();
    const recipientKey = 'recipient_public_key_123';
    const plaintext = 'Hello, this is a secret message!';

    const encrypted = await e2eEncryption.encryptMessage(plaintext, recipientKey);

    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.sessionKey.forSender).toBeTruthy();
    expect(encrypted.sessionKey.forRecipient).toBeTruthy();
    expect(encrypted.sessionKey.forAdmin).toBeTruthy();

    // Decrypt as sender
    const decrypted = await e2eEncryption.decryptMessage(encrypted, true);
    expect(decrypted).toBe(plaintext);
  });

  test('encrypted message differs from plaintext', async () => {
    await e2eEncryption.initialize();
    const plaintext = 'Secret data';
    const encrypted = await e2eEncryption.encryptMessage(plaintext, 'recipient_key');

    expect(encrypted.ciphertext).not.toBe(plaintext);
    expect(atob(encrypted.ciphertext)).not.toBe(plaintext);
  });

  test('different messages produce different ciphertexts', async () => {
    await e2eEncryption.initialize();
    const encrypted1 = await e2eEncryption.encryptMessage('Message 1', 'key');
    const encrypted2 = await e2eEncryption.encryptMessage('Message 2', 'key');

    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
  });

  test('same message encrypted twice produces different ciphertexts (random IV)', async () => {
    await e2eEncryption.initialize();
    const plaintext = 'Same message';
    const encrypted1 = await e2eEncryption.encryptMessage(plaintext, 'key');
    const encrypted2 = await e2eEncryption.encryptMessage(plaintext, 'key');

    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
  });

  test('caches public keys', async () => {
    await e2eEncryption.initialize();
    e2eEncryption.cachePublicKey('user123', 'public_key_abc');

    expect(e2eEncryption.getCachedPublicKey('user123')).toBe('public_key_abc');
    expect(e2eEncryption.getCachedPublicKey('unknown')).toBeUndefined();
  });

  test('clears keys on logout', async () => {
    await e2eEncryption.initialize();
    expect(e2eEncryption.isReady()).toBe(true);

    await e2eEncryption.clearKeys();
    expect(e2eEncryption.getPublicKey()).toBeNull();
  });

  test('handles unicode messages', async () => {
    await e2eEncryption.initialize();
    const plaintext = '你好世界 🚛 مرحبا';
    const encrypted = await e2eEncryption.encryptMessage(plaintext, 'key');
    const decrypted = await e2eEncryption.decryptMessage(encrypted, true);

    expect(decrypted).toBe(plaintext);
  });

  test('handles empty message', async () => {
    await e2eEncryption.initialize();
    const encrypted = await e2eEncryption.encryptMessage('', 'key');
    const decrypted = await e2eEncryption.decryptMessage(encrypted, true);

    expect(decrypted).toBe('');
  });

  test('handles long messages', async () => {
    await e2eEncryption.initialize();
    const plaintext = 'A'.repeat(10000);
    const encrypted = await e2eEncryption.encryptMessage(plaintext, 'key');
    const decrypted = await e2eEncryption.decryptMessage(encrypted, true);

    expect(decrypted).toBe(plaintext);
  });
});
