import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SoundEffect = 
  | 'button_click'
  | 'button_hover'
  | 'success'
  | 'error'
  | 'notification'
  | 'recording_start'
  | 'recording_stop'
  | 'scan_complete'
  | 'robot_connect'
  | 'robot_disconnect'
  | 'achievement_unlock'
  | 'level_up'
  | 'coin_collect'
  | 'whoosh'
  | 'beep'
  | 'chime';

export interface AudioSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
}

class AudioService {
  private sounds: Map<SoundEffect, Audio.Sound> = new Map();
  private backgroundMusic: Audio.Sound | null = null;
  private settings: AudioSettings = {
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 0.8,
    musicVolume: 0.3,
  };
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });

      // Load settings
      await this.loadSettings();

      // Load sound effects
      await this.loadSoundEffects();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const savedSettings = await AsyncStorage.getItem('audioSettings');
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.error('Failed to load audio settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('audioSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save audio settings:', error);
    }
  }

  private async loadSoundEffects(): Promise<void> {
    // Define sound effect configurations
    const soundConfigs: Array<{ effect: SoundEffect; frequency?: number; duration?: number }> = [
      { effect: 'button_click', frequency: 800, duration: 100 },
      { effect: 'button_hover', frequency: 600, duration: 50 },
      { effect: 'success', frequency: 1000, duration: 300 },
      { effect: 'error', frequency: 300, duration: 500 },
      { effect: 'notification', frequency: 700, duration: 200 },
      { effect: 'recording_start', frequency: 900, duration: 400 },
      { effect: 'recording_stop', frequency: 500, duration: 300 },
      { effect: 'scan_complete', frequency: 1200, duration: 600 },
      { effect: 'robot_connect', frequency: 1500, duration: 800 },
      { effect: 'robot_disconnect', frequency: 400, duration: 400 },
      { effect: 'achievement_unlock', frequency: 1800, duration: 1000 },
      { effect: 'level_up', frequency: 2000, duration: 1200 },
      { effect: 'coin_collect', frequency: 1600, duration: 200 },
      { effect: 'whoosh', frequency: 200, duration: 300 },
      { effect: 'beep', frequency: 1000, duration: 100 },
      { effect: 'chime', frequency: 1400, duration: 500 },
    ];

    // Generate and load sound effects
    for (const config of soundConfigs) {
      try {
        const soundData = this.generateTone(config.frequency || 800, config.duration || 200);
        const sound = new Audio.Sound();
        
        // In a real app, you would load actual audio files
        // For demonstration, we'll use the Audio.Sound.createAsync method
        await sound.loadAsync({
          uri: this.createDataURI(soundData),
        });
        
        this.sounds.set(config.effect, sound);
      } catch (error) {
        console.error(`Failed to load sound effect ${config.effect}:`, error);
      }
    }
  }

  private generateTone(frequency: number, duration: number): string {
    // Generate a simple sine wave tone
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * (duration / 1000));
    const data: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      const time = i / sampleRate;
      const amplitude = Math.sin(2 * Math.PI * frequency * time);
      
      // Apply envelope to prevent clicks
      const envelope = Math.min(
        1,
        Math.min(i / (sampleRate * 0.01), (samples - i) / (sampleRate * 0.01))
      );
      
      data.push(amplitude * envelope * 0.3); // Reduce volume
    }
    
    return this.encodeWAV(data, sampleRate);
  }

  private encodeWAV(samples: number[], sampleRate: number): string {
    // Simple WAV encoding (this is a simplified version)
    const length = samples.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    // Convert to base64
    const bytes = new Uint8Array(buffer);
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    return btoa(binary);
  }

  private createDataURI(wavData: string): string {
    return `data:audio/wav;base64,${wavData}`;
  }

  async playSoundEffect(effect: SoundEffect, volume?: number): Promise<void> {
    if (!this.isInitialized || !this.settings.soundEnabled) {
      return;
    }

    try {
      const sound = this.sounds.get(effect);
      if (!sound) {
        console.warn(`Sound effect ${effect} not found`);
        return;
      }

      const effectiveVolume = volume ?? this.settings.soundVolume;
      await sound.setVolumeAsync(effectiveVolume);
      await sound.replayAsync();
    } catch (error) {
      console.error(`Failed to play sound effect ${effect}:`, error);
    }
  }

  async playBackgroundMusic(uri?: string): Promise<void> {
    if (!this.isInitialized || !this.settings.musicEnabled) {
      return;
    }

    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.stopAsync();
        await this.backgroundMusic.unloadAsync();
      }

      if (uri) {
        this.backgroundMusic = new Audio.Sound();
        await this.backgroundMusic.loadAsync({ uri });
        await this.backgroundMusic.setVolumeAsync(this.settings.musicVolume);
        await this.backgroundMusic.setIsLoopingAsync(true);
        await this.backgroundMusic.playAsync();
      }
    } catch (error) {
      console.error('Failed to play background music:', error);
    }
  }

  async stopBackgroundMusic(): Promise<void> {
    if (this.backgroundMusic) {
      try {
        await this.backgroundMusic.stopAsync();
      } catch (error) {
        console.error('Failed to stop background music:', error);
      }
    }
  }

  async pauseBackgroundMusic(): Promise<void> {
    if (this.backgroundMusic) {
      try {
        await this.backgroundMusic.pauseAsync();
      } catch (error) {
        console.error('Failed to pause background music:', error);
      }
    }
  }

  async resumeBackgroundMusic(): Promise<void> {
    if (this.backgroundMusic) {
      try {
        await this.backgroundMusic.playAsync();
      } catch (error) {
        console.error('Failed to resume background music:', error);
      }
    }
  }

  async updateSettings(newSettings: Partial<AudioSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();

    // Update background music volume if playing
    if (this.backgroundMusic && newSettings.musicVolume !== undefined) {
      try {
        await this.backgroundMusic.setVolumeAsync(this.settings.musicVolume);
      } catch (error) {
        console.error('Failed to update music volume:', error);
      }
    }
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  // Convenience methods for common sound effects
  async playButtonClick(): Promise<void> {
    await this.playSoundEffect('button_click');
  }

  async playSuccess(): Promise<void> {
    await this.playSoundEffect('success');
  }

  async playError(): Promise<void> {
    await this.playSoundEffect('error');
  }

  async playNotification(): Promise<void> {
    await this.playSoundEffect('notification');
  }

  async playRecordingStart(): Promise<void> {
    await this.playSoundEffect('recording_start');
  }

  async playRecordingStop(): Promise<void> {
    await this.playSoundEffect('recording_stop');
  }

  async playRobotConnect(): Promise<void> {
    await this.playSoundEffect('robot_connect');
  }

  async playRobotDisconnect(): Promise<void> {
    await this.playSoundEffect('robot_disconnect');
  }

  async playAchievementUnlock(): Promise<void> {
    await this.playSoundEffect('achievement_unlock');
  }

  async playLevelUp(): Promise<void> {
    await this.playSoundEffect('level_up');
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.stopAsync();
        await this.backgroundMusic.unloadAsync();
      }

      for (const sound of this.sounds.values()) {
        await sound.unloadAsync();
      }

      this.sounds.clear();
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to cleanup audio service:', error);
    }
  }
}

export const audioService = new AudioService();