import * as crypto from 'crypto';

export const CryptoDigestAlgorithm = {
  SHA256: 'SHA-256',
};

export const getRandomBytesAsync = async (length: number): Promise<Uint8Array> => {
  return new Uint8Array(crypto.randomBytes(length));
};

export const digestStringAsync = async (algorithm: string, data: string): Promise<string> => {
  return crypto.createHash('sha256').update(data).digest('hex');
};
