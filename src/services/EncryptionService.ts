import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface EncryptionConfig {
  keyDerivationIterations: number;
  keySize: number;
  ivSize: number;
  saltSize: number;
}

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
  iterations: number;
}

export class EncryptionService {
  private readonly config: EncryptionConfig = {
    keyDerivationIterations: 10000,
    keySize: 256 / 32,
    ivSize: 128 / 32,
    saltSize: 128 / 32,
  };

  private masterKey: string | null = null;
  private readonly MASTER_KEY_STORAGE = 'encryption_master_key';

  constructor() {
    this.initializeMasterKey();
  }

  private async initializeMasterKey(): Promise<void> {
    try {
      let storedKey = await SecureStore.getItemAsync(this.MASTER_KEY_STORAGE);
      
      if (!storedKey) {
        storedKey = this.generateSecureKey();
        await SecureStore.setItemAsync(this.MASTER_KEY_STORAGE, storedKey);
      }
      
      this.masterKey = storedKey;
    } catch (error) {
      console.error('Failed to initialize master key:', error);
      this.masterKey = this.generateSecureKey();
    }
  }

  private generateSecureKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  private deriveKey(password: string, salt: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: this.config.keySize,
      iterations: this.config.keyDerivationIterations,
      hasher: CryptoJS.algo.SHA256
    });
  }

  /**
   * Encrypt sensitive data using AES-256-CBC with PBKDF2 key derivation
   */
  public async encryptData(plaintext: string, customPassword?: string): Promise<EncryptedData> {
    if (!this.masterKey && !customPassword) {
      throw new Error('Encryption service not initialized');
    }

    const password = customPassword || this.masterKey!;
    const salt = CryptoJS.lib.WordArray.random(this.config.saltSize);
    const iv = CryptoJS.lib.WordArray.random(this.config.ivSize);
    
    const key = this.deriveKey(password, salt);
    
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return {
      data: encrypted.toString(),
      iv: iv.toString(),
      salt: salt.toString(),
      iterations: this.config.keyDerivationIterations
    };
  }

  /**
   * Decrypt data using the stored encryption parameters
   */
  public async decryptData(encryptedData: EncryptedData, customPassword?: string): Promise<string> {
    if (!this.masterKey && !customPassword) {
      throw new Error('Encryption service not initialized');
    }

    const password = customPassword || this.masterKey!;
    const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
    
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: this.config.keySize,
      iterations: encryptedData.iterations,
      hasher: CryptoJS.algo.SHA256
    });

    const decrypted = CryptoJS.AES.decrypt(encryptedData.data, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!plaintext) {
      throw new Error('Decryption failed - invalid password or corrupted data');
    }

    return plaintext;
  }

  /**
   * Encrypt user credentials with additional security
   */
  public async encryptCredentials(credentials: {
    username: string;
    password: string;
    apiKey?: string;
  }): Promise<EncryptedData> {
    const payload = JSON.stringify({
      ...credentials,
      timestamp: Date.now(),
      deviceId: await this.getDeviceId()
    });

    return this.encryptData(payload);
  }

  /**
   * Decrypt user credentials
   */
  public async decryptCredentials(encryptedData: EncryptedData): Promise<{
    username: string;
    password: string;
    apiKey?: string;
    timestamp: number;
    deviceId: string;
  }> {
    const decrypted = await this.decryptData(encryptedData);
    const parsed = JSON.parse(decrypted);
    
    // Verify timestamp (credentials expire after 30 days)
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (Date.now() - parsed.timestamp > maxAge) {
      throw new Error('Credentials have expired');
    }

    // Verify device ID
    const currentDeviceId = await this.getDeviceId();
    if (parsed.deviceId !== currentDeviceId) {
      throw new Error('Credentials are not valid for this device');
    }

    return parsed;
  }

  /**
   * Generate hash for data integrity verification
   */
  public generateHash(data: string, algorithm: 'SHA256' | 'SHA512' = 'SHA256'): string {
    const hasher = algorithm === 'SHA256' ? CryptoJS.SHA256 : CryptoJS.SHA512;
    return hasher(data).toString();
  }

  /**
   * Verify data integrity using hash
   */
  public verifyHash(data: string, hash: string, algorithm: 'SHA256' | 'SHA512' = 'SHA256'): boolean {
    const calculatedHash = this.generateHash(data, algorithm);
    return calculatedHash === hash;
  }

  /**
   * Generate HMAC for message authentication
   */
  public generateHMAC(message: string, secret?: string): string {
    const key = secret || this.masterKey;
    if (!key) throw new Error('No key available for HMAC generation');
    
    return CryptoJS.HmacSHA256(message, key).toString();
  }

  /**
   * Verify HMAC for message authentication
   */
  public verifyHMAC(message: string, hmac: string, secret?: string): boolean {
    const calculatedHMAC = this.generateHMAC(message, secret);
    return calculatedHMAC === hmac;
  }

  /**
   * Encrypt hand tracking data for secure transmission
   */
  public async encryptHandTrackingData(data: {
    poses: any[];
    timestamp: number;
    sessionId: string;
  }): Promise<EncryptedData> {
    const payload = JSON.stringify({
      ...data,
      deviceId: await this.getDeviceId(),
      integrity: this.generateHash(JSON.stringify(data))
    });

    return this.encryptData(payload);
  }

  /**
   * Decrypt and verify hand tracking data
   */
  public async decryptHandTrackingData(encryptedData: EncryptedData): Promise<{
    poses: any[];
    timestamp: number;
    sessionId: string;
    deviceId: string;
  }> {
    const decrypted = await this.decryptData(encryptedData);
    const parsed = JSON.parse(decrypted);
    
    // Verify data integrity
    const originalData = {
      poses: parsed.poses,
      timestamp: parsed.timestamp,
      sessionId: parsed.sessionId
    };
    
    const calculatedHash = this.generateHash(JSON.stringify(originalData));
    if (calculatedHash !== parsed.integrity) {
      throw new Error('Data integrity check failed');
    }

    return parsed;
  }

  /**
   * Generate secure robot authentication token
   */
  public async generateRobotAuthToken(robotId: string, userId: string): Promise<{
    token: string;
    expiresAt: number;
    signature: string;
  }> {
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
    const payload = {
      robotId,
      userId,
      expiresAt,
      nonce: CryptoJS.lib.WordArray.random(128/8).toString()
    };

    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = this.generateHMAC(token);

    return { token, expiresAt, signature };
  }

  /**
   * Verify robot authentication token
   */
  public verifyRobotAuthToken(token: string, signature: string): {
    valid: boolean;
    payload?: {
      robotId: string;
      userId: string;
      expiresAt: number;
      nonce: string;
    };
  } {
    try {
      // Verify signature
      if (!this.verifyHMAC(token, signature)) {
        return { valid: false };
      }

      // Decode and verify payload
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);

      // Check expiration
      if (Date.now() > payload.expiresAt) {
        return { valid: false };
      }

      return { valid: true, payload };
    } catch (error) {
      console.error('Token verification failed:', error);
      return { valid: false };
    }
  }

  /**
   * Secure data wipe for sensitive information
   */
  public async secureWipe(keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map(key => SecureStore.deleteItemAsync(key)));
      
      // Clear master key if requested
      if (keys.includes(this.MASTER_KEY_STORAGE)) {
        this.masterKey = null;
      }
    } catch (error) {
      console.error('Secure wipe failed:', error);
      throw error;
    }
  }

  /**
   * Get unique device identifier for binding encrypted data
   */
  private async getDeviceId(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync('device_id');
      
      if (!deviceId) {
        deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await SecureStore.setItemAsync('device_id', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Failed to get device ID:', error);
      return `fallback_${Date.now()}`;
    }
  }

  /**
   * Export encrypted backup of all user data
   */
  public async createEncryptedBackup(userData: any, backupPassword: string): Promise<EncryptedData> {
    const backupData = {
      ...userData,
      timestamp: Date.now(),
      version: '1.0.0',
      deviceId: await this.getDeviceId()
    };

    return this.encryptData(JSON.stringify(backupData), backupPassword);
  }

  /**
   * Restore data from encrypted backup
   */
  public async restoreEncryptedBackup(encryptedBackup: EncryptedData, backupPassword: string): Promise<any> {
    const decrypted = await this.decryptData(encryptedBackup, backupPassword);
    const backupData = JSON.parse(decrypted);

    // Verify backup integrity
    if (!backupData.timestamp || !backupData.version || !backupData.deviceId) {
      throw new Error('Invalid backup format');
    }

    return backupData;
  }
}

export const encryptionService = new EncryptionService();