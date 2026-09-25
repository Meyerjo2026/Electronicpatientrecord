import * as CryptoJS from 'crypto-js';
import { z } from 'zod';
import { ulid } from 'ulid';

const EncryptionConfigSchema = z.object({
  algorithm: z.enum(['AES-256-GCM', 'AES-256-CBC']).default('AES-256-GCM'),
  keyDerivation: z.enum(['PBKDF2', 'Argon2', 'Scrypt']).default('PBKDF2'),
  pbkdf2Iterations: z.number().int().positive().default(100000),
  saltLength: z.number().int().positive().default(32),
  ivLength: z.number().int().positive().default(16),
  tagLength: z.number().int().positive().default(16),
});

export type EncryptionConfig = z.infer<typeof EncryptionConfigSchema>;

interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  tag?: string;
  algorithm: string;
  version: number;
}

interface FieldEncryptionKey {
  field: string;
  keyId: string;
  encryptedKey: string; // Wrapped with master key
  createdAt: string;
}

export class CryptoService {
  private config: EncryptionConfig;
  private masterKey: CryptoJS.lib.WordArray | null = null;
  private fieldKeys: Map<string, FieldEncryptionKey> = new Map();

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = EncryptionConfigSchema.parse(config);
  }

  async initialize(masterKey?: string): Promise<void> {
    if (masterKey) {
      this.masterKey = CryptoJS.enc.Hex.parse(masterKey);
    } else {
      // Generate new master key
      this.masterKey = CryptoJS.lib.WordArray.random(32); // 256-bit
    }
  }

  getMasterKeyHex(): string {
    if (!this.masterKey) throw new Error('CryptoService not initialized');
    return this.masterKey.toString(CryptoJS.enc.Hex);
  }

  // High-level encryption for PHI fields
  encryptField(fieldName: string, plaintext: string): EncryptedData {
    if (!this.masterKey) throw new Error('CryptoService not initialized');
    
    const fieldKey = this.getOrCreateFieldKey(fieldName);
    const salt = CryptoJS.lib.WordArray.random(this.config.saltLength / 2); // bytes
    const iv = CryptoJS.lib.WordArray.random(this.config.ivLength / 2);
    
    const key = CryptoJS.PBKDF2(fieldKey.encryptedKey, salt, {
      keySize: 256 / 32,
      iterations: this.config.pbkdf2Iterations,
    });

    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return {
      ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
      iv: iv.toString(CryptoJS.enc.Base64),
      salt: salt.toString(CryptoJS.enc.Base64),
      tag: (encrypted as any).tag?.toString(CryptoJS.enc.Base64),
      algorithm: this.config.algorithm,
      version: 1,
    };
  }

  decryptField(fieldName: string, encryptedData: EncryptedData): string {
    if (!this.masterKey) throw new Error('CryptoService not initialized');
    
    const fieldKey = this.fieldKeys.get(fieldName);
    if (!fieldKey) throw new Error(`No key found for field: ${fieldName}`);

    const salt = CryptoJS.enc.Base64.parse(encryptedData.salt);
    const iv = CryptoJS.enc.Base64.parse(encryptedData.iv);
    const ciphertext = CryptoJS.enc.Base64.parse(encryptedData.ciphertext);
    
    const key = CryptoJS.PBKDF2(fieldKey.encryptedKey, salt, {
      keySize: 256 / 32,
      iterations: this.config.pbkdf2Iterations,
    });

    let decrypted: string;
    
    {
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext,
        iv,
        salt,
      });
      
      decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }).toString(CryptoJS.enc.Utf8);
    }

    if (!decrypted) throw new Error('Decryption failed - invalid key or corrupted data');
    return decrypted;
  }

  // Full resource encryption (for storage)
  encryptResource(resource: any, fieldsToEncrypt: string[]): any {
    const encrypted = { ...resource };
    
    for (const field of fieldsToEncrypt) {
      const value = this.getNestedValue(resource, field);
      if (value !== undefined && value !== null) {
        const encryptedValue = this.encryptField(field, typeof value === 'string' ? value : JSON.stringify(value));
        this.setNestedValue(encrypted, field, encryptedValue);
      }
    }
    
    return encrypted;
  }

  decryptResource(resource: any, fieldsToDecrypt: string[]): any {
    const decrypted = { ...resource };
    
    for (const field of fieldsToDecrypt) {
      const value = this.getNestedValue(resource, field);
      if (value && typeof value === 'object' && value.ciphertext) {
        const decryptedValue = this.decryptField(field, value as EncryptedData);
        this.setNestedValue(decrypted, field, decryptedValue);
      }
    }
    
    return decrypted;
  }

  // Hash for indexing/searching (deterministic)
  hashForIndex(value: string): string {
    return CryptoJS.SHA256(value + 'prehospital-epr-index-salt').toString(CryptoJS.enc.Hex);
  }

  // Secure random generation
  generateSecureRandom(bytes: number): string {
    return CryptoJS.lib.WordArray.random(bytes).toString(CryptoJS.enc.Hex);
  }

  // Key wrapping for key escrow/recovery
  wrapKey(key: CryptoJS.lib.WordArray): string {
    if (!this.masterKey) throw new Error('CryptoService not initialized');
    // Use the master key hex as a passphrase so crypto-js generates its own
    // self-contained OpenSSL salt + IV and no manual IV bookkeeping is needed.
    return CryptoJS.AES.encrypt(
      key.toString(CryptoJS.enc.Hex),
      this.masterKey.toString(CryptoJS.enc.Hex)
    ).toString();
  }

  unwrapKey(wrappedKey: string): CryptoJS.lib.WordArray {
    if (!this.masterKey) throw new Error('CryptoService not initialized');
    const decrypted = CryptoJS.AES.decrypt(
      wrappedKey,
      this.masterKey.toString(CryptoJS.enc.Hex)
    );
    return CryptoJS.enc.Hex.parse(decrypted.toString(CryptoJS.enc.Utf8));
  }

  // Digital signatures for integrity
  sign(data: string, privateKeyPem: string): string {
    // Would use Web Crypto API or Node.js crypto for RSA/ECDSA signing
    // This is a placeholder using HMAC for demonstration
    return CryptoJS.HmacSHA256(data, this.masterKey!).toString(CryptoJS.enc.Hex);
  }

  verify(data: string, signature: string, publicKeyPem: string): boolean {
    const expected = this.sign(data, publicKeyPem);
    return CryptoJS.enc.Hex.parse(signature).toString() === expected;
  }

  private getOrCreateFieldKey(fieldName: string): FieldEncryptionKey {
    let fieldKey = this.fieldKeys.get(fieldName);
    if (!fieldKey) {
      const keyId = ulid();
      const rawKey = CryptoJS.lib.WordArray.random(32);
      const wrappedKey = this.wrapKey(rawKey);
      
      fieldKey = {
        field: fieldName,
        keyId,
        encryptedKey: wrappedKey,
        createdAt: new Date().toISOString(),
      };
      
      this.fieldKeys.set(fieldName, fieldKey);
    }
    return fieldKey;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Export/import field keys for backup/recovery
  exportFieldKeys(): FieldEncryptionKey[] {
    return Array.from(this.fieldKeys.values());
  }

  importFieldKeys(keys: FieldEncryptionKey[]): void {
    for (const key of keys) {
      this.fieldKeys.set(key.field, key);
    }
  }

  rotateFieldKey(fieldName: string): void {
    this.fieldKeys.delete(fieldName);
    this.getOrCreateFieldKey(fieldName);
  }
}

// Singleton instance
export const cryptoService = new CryptoService();

// PHI field definitions for automatic encryption
export const PHI_FIELDS = {
  Patient: [
    'name.0.given.0',
    'name.0.family',
    'telecom.0.value',
    'address.0.line.0',
    'address.0.city',
    'address.0.state',
    'address.0.postalCode',
    'birthDate',
    'identifier.0.value',
  ],
  Encounter: [
    'subject.display',
    'location.0.location.display',
  ],
  Observation: [
    'subject.display',
    'performer.0.display',
    'note.0.text',
  ],
  MedicationAdministration: [
    'subject.display',
    'performer.0.actor.display',
    'note.0.text',
  ],
  Procedure: [
    'subject.display',
    'performer.0.actor.display',
    'note.0.text',
  ],
  Condition: [
    'subject.display',
    'note.0.text',
  ],
};

export function getPhiFields(resourceType: string): string[] {
  return PHI_FIELDS[resourceType as keyof typeof PHI_FIELDS] || [];
}