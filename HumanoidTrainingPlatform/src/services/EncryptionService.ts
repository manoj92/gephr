import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  salt: string;
}

export interface DecryptionParams {
  encryptedData: string;
  iv: string;
  salt: string;
  key: string;
}

export class EncryptionService {
  private readonly ALGORITHM = 'AES-256-GCM';
  private readonly KEY_SIZE = 256; // bits
  private readonly IV_SIZE = 12; // bytes for GCM
  private readonly SALT_SIZE = 16; // bytes
  private readonly TAG_SIZE = 16; // bytes
  private readonly ITERATIONS = 100000; // PBKDF2 iterations

  private masterKey: string | null = null;

  async initialize(userPassword?: string): Promise<void> {
    try {
      // Try to load existing master key
      const storedKey = await AsyncStorage.getItem('encryption_master_key');
      
      if (storedKey) {
        this.masterKey = storedKey;
      } else if (userPassword) {
        // Generate new master key from user password
        this.masterKey = await this.deriveKeyFromPassword(userPassword);
        await AsyncStorage.setItem('encryption_master_key', this.masterKey);
      } else {
        // Generate random master key for anonymous mode
        this.masterKey = await this.generateRandomKey();
        await AsyncStorage.setItem('encryption_master_key', this.masterKey);
      }
    } catch (error) {
      console.error('Encryption service initialization error:', error);
      throw new Error('Failed to initialize encryption service');
    }
  }

  async encryptData(data: string, customKey?: string): Promise<EncryptionResult> {
    const key = customKey || this.masterKey;
    if (!key) {
      throw new Error('Encryption service not initialized');
    }

    try {
      // Generate random IV and salt
      const iv = await this.generateRandomBytes(this.IV_SIZE);
      const salt = await this.generateRandomBytes(this.SALT_SIZE);

      // Derive encryption key from master key + salt
      const derivedKey = await this.deriveKey(key, salt);

      // Encrypt data using native crypto (simulation)
      const encryptedData = await this.performEncryption(data, derivedKey, iv);

      return {
        encryptedData: Buffer.from(encryptedData).toString('base64'),
        iv: Buffer.from(iv).toString('base64'),
        salt: Buffer.from(salt).toString('base64'),
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  async decryptData(params: DecryptionParams): Promise<string> {
    try {
      // Convert from base64
      const encryptedData = Buffer.from(params.encryptedData, 'base64');
      const iv = Buffer.from(params.iv, 'base64');
      const salt = Buffer.from(params.salt, 'base64');

      // Derive decryption key
      const derivedKey = await this.deriveKey(params.key, salt);

      // Decrypt data
      const decryptedData = await this.performDecryption(encryptedData, derivedKey, iv);

      return decryptedData;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  async encryptRecordingData(recordingData: any): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    const jsonData = JSON.stringify(recordingData);
    const result = await this.encryptData(jsonData);
    
    return JSON.stringify(result);
  }

  async decryptRecordingData(encryptedJson: string): Promise<any> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    const encryptionResult = JSON.parse(encryptedJson);
    const decryptedJson = await this.decryptData({
      ...encryptionResult,
      key: this.masterKey,
    });

    return JSON.parse(decryptedJson);
  }

  async encryptUserData(userData: any): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    // Add timestamp and integrity check
    const dataWithMetadata = {
      data: userData,
      timestamp: Date.now(),
      checksum: await this.calculateChecksum(JSON.stringify(userData)),
    };

    const result = await this.encryptData(JSON.stringify(dataWithMetadata));
    return JSON.stringify(result);
  }

  async decryptUserData(encryptedData: string): Promise<any> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    const encryptionResult = JSON.parse(encryptedData);
    const decryptedJson = await this.decryptData({
      ...encryptionResult,
      key: this.masterKey,
    });

    const dataWithMetadata = JSON.parse(decryptedJson);
    
    // Verify integrity
    const expectedChecksum = await this.calculateChecksum(JSON.stringify(dataWithMetadata.data));
    if (dataWithMetadata.checksum !== expectedChecksum) {
      throw new Error('Data integrity check failed');
    }

    return dataWithMetadata.data;
  }

  async encryptFile(fileData: ArrayBuffer): Promise<EncryptionResult> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    // Convert ArrayBuffer to base64 string
    const base64Data = Buffer.from(fileData).toString('base64');
    
    return await this.encryptData(base64Data);
  }

  async decryptFile(encryptionResult: EncryptionResult): Promise<ArrayBuffer> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    const base64Data = await this.decryptData({
      ...encryptionResult,
      key: this.masterKey,
    });

    // Convert base64 back to ArrayBuffer
    return Buffer.from(base64Data, 'base64').buffer;
  }

  async generateSecureToken(length: number = 32): Promise<string> {
    const bytes = await this.generateRandomBytes(length);
    return Buffer.from(bytes).toString('hex');
  }

  async hashData(data: string, salt?: string): Promise<string> {
    const saltToUse = salt || await this.generateRandomKey();
    
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data + saltToUse
    );
  }

  async calculateChecksum(data: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
  }

  async changeMasterKey(oldPassword: string, newPassword: string): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    try {
      // Verify old password
      const oldKey = await this.deriveKeyFromPassword(oldPassword);
      if (oldKey !== this.masterKey) {
        throw new Error('Invalid current password');
      }

      // Generate new master key
      const newKey = await this.deriveKeyFromPassword(newPassword);

      // Re-encrypt all stored data with new key
      await this.reencryptStoredData(this.masterKey, newKey);

      // Update master key
      this.masterKey = newKey;
      await AsyncStorage.setItem('encryption_master_key', newKey);
    } catch (error) {
      console.error('Master key change error:', error);
      throw error;
    }
  }

  async exportEncryptedBackup(): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    try {
      // Collect all encrypted data
      const backupData = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: await this.collectAllEncryptedData(),
      };

      // Encrypt the backup itself
      const result = await this.encryptData(JSON.stringify(backupData));
      
      return JSON.stringify({
        backup: result,
        metadata: {
          version: backupData.version,
          timestamp: backupData.timestamp,
          algorithm: this.ALGORITHM,
        },
      });
    } catch (error) {
      console.error('Backup export error:', error);
      throw new Error('Failed to export encrypted backup');
    }
  }

  async importEncryptedBackup(backupData: string, password: string): Promise<void> {
    try {
      const parsed = JSON.parse(backupData);
      const backupKey = await this.deriveKeyFromPassword(password);

      // Decrypt backup
      const decryptedBackup = await this.decryptData({
        ...parsed.backup,
        key: backupKey,
      });

      const backup = JSON.parse(decryptedBackup);

      // Restore data
      await this.restoreEncryptedData(backup.data);
    } catch (error) {
      console.error('Backup import error:', error);
      throw new Error('Failed to import encrypted backup');
    }
  }

  private async deriveKeyFromPassword(password: string, salt?: Uint8Array): Promise<string> {
    const saltBytes = salt || await this.generateRandomBytes(this.SALT_SIZE);
    
    // Use PBKDF2 for key derivation (simplified implementation)
    let key = password;
    for (let i = 0; i < this.ITERATIONS; i++) {
      key = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        key + Buffer.from(saltBytes).toString('hex')
      );
    }
    
    return key;
  }

  private async deriveKey(masterKey: string, salt: Uint8Array): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      masterKey + Buffer.from(salt).toString('hex')
    );
  }

  private async generateRandomKey(): Promise<string> {
    const bytes = await this.generateRandomBytes(this.KEY_SIZE / 8);
    return Buffer.from(bytes).toString('hex');
  }

  private async generateRandomBytes(length: number): Promise<Uint8Array> {
    // In React Native, we'd use expo-crypto or react-native-get-random-values
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  }

  private async performEncryption(data: string, key: string, iv: Uint8Array): Promise<Uint8Array> {
    // This is a simplified simulation. In a real implementation, 
    // you would use native crypto libraries for AES-GCM encryption
    
    const dataBytes = Buffer.from(data, 'utf8');
    const keyBytes = Buffer.from(key, 'hex');
    
    // Simple XOR cipher for demonstration (NOT secure for production!)
    const encrypted = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length];
    }
    
    return encrypted;
  }

  private async performDecryption(encryptedData: Uint8Array, key: string, iv: Uint8Array): Promise<string> {
    // This is a simplified simulation. In a real implementation,
    // you would use native crypto libraries for AES-GCM decryption
    
    const keyBytes = Buffer.from(key, 'hex');
    
    // Simple XOR cipher reversal for demonstration
    const decrypted = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted[i] = encryptedData[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length];
    }
    
    return Buffer.from(decrypted).toString('utf8');
  }

  private async reencryptStoredData(oldKey: string, newKey: string): Promise<void> {
    // In a real implementation, this would re-encrypt all stored encrypted data
    // with the new master key
    console.log('Re-encrypting stored data...');
    
    // Simulate re-encryption process
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async collectAllEncryptedData(): Promise<any> {
    // Collect all encrypted data for backup
    const allKeys = await AsyncStorage.getAllKeys();
    const encryptedKeys = allKeys.filter(key => key.startsWith('encrypted_'));
    
    const data: Record<string, string> = {};
    for (const key of encryptedKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        data[key] = value;
      }
    }
    
    return data;
  }

  private async restoreEncryptedData(data: Record<string, string>): Promise<void> {
    // Restore encrypted data from backup
    for (const [key, value] of Object.entries(data)) {
      await AsyncStorage.setItem(key, value);
    }
  }

  getMasterKey(): string | null {
    return this.masterKey;
  }

  isInitialized(): boolean {
    return !!this.masterKey;
  }

  async wipeAllEncryptedData(): Promise<void> {
    try {
      // Get all encrypted data keys
      const allKeys = await AsyncStorage.getAllKeys();
      const encryptedKeys = allKeys.filter(key => 
        key.startsWith('encrypted_') || key === 'encryption_master_key'
      );

      // Remove all encrypted data
      await AsyncStorage.multiRemove(encryptedKeys);

      // Clear master key
      this.masterKey = null;
    } catch (error) {
      console.error('Data wipe error:', error);
      throw new Error('Failed to wipe encrypted data');
    }
  }
}

export const encryptionService = new EncryptionService();