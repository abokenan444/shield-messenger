import crypto from 'node:crypto';
import { config } from '../config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = config.fieldEncryptionKey;
  if (!hex || hex.length !== 64 || hex === '0'.repeat(64)) {
    throw new Error('FIELD_ENCRYPTION_KEY is not set or is the default placeholder. Generate a proper key.');
  }
  return Buffer.from(hex, 'hex');
}

/** Encrypt a plaintext string → "iv:ciphertext:tag" (all hex) */
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

/** Decrypt "iv:ciphertext:tag" → plaintext */
export function decryptField(packed: string): string {
  const key = getKey();
  const [ivHex, dataHex, tagHex] = packed.split(':');
  if (!ivHex || !dataHex || !tagHex) throw new Error('Invalid encrypted field format');
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString('utf8') + decipher.final('utf8');
}

/** HMAC-SHA256 for look-up without revealing plaintext (e.g. email hash) */
export function hmacField(value: string): string {
  const key = getKey();
  return crypto.createHmac('sha256', key).update(value.toLowerCase().trim()).digest('hex');
}

/** Hash an IP address for audit log (privacy-preserving) */
export function hashIp(ip: string): string {
  return hmacField(ip);
}
