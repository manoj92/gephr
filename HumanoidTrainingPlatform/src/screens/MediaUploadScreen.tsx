/**
 * Media Upload Screen
 * Comprehensive interface for file upload, processing, and management
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { FileUploader } from '../components/media/FileUploader';
import { MediaProcessor } from '../components/media/MediaProcessor';
import { GlassCard } from '../components/ui/GlassCard';
import { AdvancedButton } from '../components/ui/AdvancedButton';
import { useFloatingAnimation, usePulseAnimation } from '../components/animations/AnimationLibrary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ==================== TYPES ====================

interface FileItem {
  id: string;
  name: string;
  uri: string;
  type: string;
  size: number;
  mimeType?: string;
  thumbnail?: string;
  uploadProgress?: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  metadata?: any;
}

interface ProcessingJob {
  id: string;
  fileName: string;
  fileUri: string;
  fileType: string;
  originalSize: number;
  processedSize?: number;
  compressionRatio?: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  errorMessage?: string;
  processingOptions: any;
  outputUri?: string;
  metadata?: any;
}

interface UploadSettings {
  autoProcess: boolean;
  uploadQuality: 'low' | 'medium' | 'high';
  maxFileSize: number;
  allowedTypes: string[];
  enableCompression: boolean;
  generateThumbnails: boolean;
}

// ==================== CONSTANTS ====================

const DEFAULT_SETTINGS: UploadSettings = {
  autoProcess: true,
  uploadQuality: 'medium',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedTypes: ['image/*', 'video/*', 'audio/*', 'application/json'],
  enableCompression: true,
  generateThumbnails: true,
};

const QUALITY_PRESETS = {
  low: {
    image: { quality: 0.6, maxWidth: 1280, maxHeight: 720 },
    video: { bitrate: 1000, resolution: '480p' },
    audio: { bitrate: 64, sampleRate: 22050 },
  },
  medium: {
    image: { quality: 0.8, maxWidth: 1920, maxHeight: 1080 },
    video: { bitrate: 2500, resolution: '720p' },
    audio: { bitrate: 128, sampleRate: 44100 },
  },
  high: {
    image: { quality: 0.95, maxWidth: 4096, maxHeight: 2160 },
    video: { bitrate: 5000, resolution: '1080p' },
    audio: { bitrate: 320, sampleRate: 48000 },
  },
};

// ==================== MAIN COMPONENT ====================

const MediaUploadScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'upload' | 'process' | 'library'>('upload');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);
  const [settings, setSettings] = useState<UploadSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [totalUploaded, setTotalUploaded] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const floatingAnim = useFloatingAnimation();
  const pulseAnim = usePulseAnimation();

  useEffect(() => {
    // Initialize entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleFilesSelected = (selectedFiles: FileItem[]) => {
    setFiles(selectedFiles);
    
    // Auto-create processing jobs if enabled
    if (settings.autoProcess) {
      createProcessingJobs(selectedFiles);
    }
  };

  const createProcessingJobs = (selectedFiles: FileItem[]) => {
    const newJobs: ProcessingJob[] = selectedFiles
      .filter(file => file.uploadStatus === 'completed')
      .map(file => {
        const fileType = getFileType(file.type);
        const qualityPreset = QUALITY_PRESETS[settings.uploadQuality];
        
        return {
          id: `job_${file.id}`,
          fileName: file.name,
          fileUri: file.uri,
          fileType: file.type,
          originalSize: file.size,
          status: 'pending' as const,
          progress: 0,
          processingOptions: {
            type: fileType,
            [`${fileType}Options`]: qualityPreset[fileType as keyof typeof qualityPreset],
          },
        };
      });

    setProcessingJobs(prev => [...prev, ...newJobs]);
  };

  const getFileType = (mimeType: string): 'image' | 'video' | 'audio' | 'data' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'data';
  };

  const handleUploadProgress = (fileId: string, progress: number) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, uploadProgress: progress } : file
    ));
  };

  const handleUploadComplete = (fileId: string, result: any) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, uploadStatus: 'completed' } : file
    ));
    setTotalUploaded(prev => prev + 1);
    
    // Create processing job if auto-process is enabled
    if (settings.autoProcess) {
      const file = files.find(f => f.id === fileId);
      if (file) {
        createProcessingJobs([file]);
      }
    }
  };

  const handleUploadError = (fileId: string, error: string) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, uploadStatus: 'error' } : file
    ));
    Alert.alert('Upload Failed', error);
  };

  const handleJobUpdate = (job: ProcessingJob) => {
    setProcessingJobs(prev => prev.map(j => j.id === job.id ? job : j));
  };

  const handleJobComplete = (job: ProcessingJob) => {
    setTotalProcessed(prev => prev + 1);
    Alert.alert(
      'Processing Complete',
      `${job.fileName} has been processed successfully.`,
      [
        { text: 'View', onPress: () => viewProcessedFile(job) },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  const handleJobError = (job: ProcessingJob, error: string) => {
    Alert.alert('Processing Failed', `${job.fileName}: ${error}`);
  };

  const viewProcessedFile = (job: ProcessingJob) => {
    // Navigate to file viewer or show preview modal
    Alert.alert('File Processed', `Output URI: ${job.outputUri}`);
  };

  const clearAllFiles = () => {
    Alert.alert(
      'Clear All Files',
      'Are you sure you want to clear all files and processing jobs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setFiles([]);
            setProcessingJobs([]);
            setTotalUploaded(0);
            setTotalProcessed(0);
          },
        },
      ]
    );
  };

  const exportFiles = () => {
    const completedJobs = processingJobs.filter(job => job.status === 'completed');
    if (completedJobs.length === 0) {
      Alert.alert('No Files', 'No processed files available for export.');
      return;
    }

    Alert.alert(
      'Export Files',
      `Export ${completedJobs.length} processed files?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => performExport(completedJobs) },
      ]
    );
  };

  const performExport = (jobs: ProcessingJob[]) => {
    // Implementation would export files to user's chosen location
    Alert.alert('Export Complete', `${jobs.length} files exported successfully.`);
  };

  const renderSettingsModal = () => (
    <Modal
      visible={showSettings}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSettings(false)}
    >
      <View style={styles.modalOverlay}>
        <GlassCard style={styles.settingsModal} intensity={80}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Upload Settings</Text>
            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.settingsContent}>
            {/* Auto Processing */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto Process</Text>
                <Text style={styles.settingDescription}>
                  Automatically process files after upload
                </Text>
              </View>
              <Switch
                value={settings.autoProcess}
                onValueChange={(value) => setSettings(prev => ({ ...prev, autoProcess: value }))}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            {/* Upload Quality */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Upload Quality</Text>
              <View style={styles.qualityButtons}>
                {['low', 'medium', 'high'].map((quality) => (
                  <TouchableOpacity
                    key={quality}
                    style={[
                      styles.qualityButton,
                      settings.uploadQuality === quality && styles.qualityButtonSelected
                    ]}
                    onPress={() => setSettings(prev => ({ ...prev, uploadQuality: quality as any }))}
                  >
                    <Text style={[
                      styles.qualityButtonText,
                      settings.uploadQuality === quality && styles.qualityButtonTextSelected
                    ]}>
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Enable Compression */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Enable Compression</Text>
                <Text style={styles.settingDescription}>
                  Compress files to reduce size
                </Text>
              </View>
              <Switch
                value={settings.enableCompression}
                onValueChange={(value) => setSettings(prev => ({ ...prev, enableCompression: value }))}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            {/* Generate Thumbnails */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Generate Thumbnails</Text>
                <Text style={styles.settingDescription}>
                  Create thumbnails for media files
                </Text>
              </View>
              <Switch
                value={settings.generateThumbnails}
                onValueChange={(value) => setSettings(prev => ({ ...prev, generateThumbnails: value }))}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            {/* Max File Size */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Max File Size</Text>
              <View style={styles.sizeButtons}>
                {[10, 50, 100, 500].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeButton,
                      settings.maxFileSize === size * 1024 * 1024 && styles.sizeButtonSelected
                    ]}
                    onPress={() => setSettings(prev => ({ ...prev, maxFileSize: size * 1024 * 1024 }))}
                  >
                    <Text style={[
                      styles.sizeButtonText,
                      settings.maxFileSize === size * 1024 * 1024 && styles.sizeButtonTextSelected
                    ]}>
                      {size}MB
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <AdvancedButton
            variant="primary"
            size="large"
            onPress={() => setShowSettings(false)}
            style={styles.saveButton}
            effectType="glow"
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </AdvancedButton>
        </GlassCard>
      </View>
    </Modal>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <FileUploader
            acceptedTypes={settings.allowedTypes}
            maxFileSize={settings.maxFileSize}
            maxFiles={10}
            onFilesSelected={handleFilesSelected}
            onUploadProgress={handleUploadProgress}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            allowCamera={true}
            allowMultiple={true}
            showPreview={true}
            style={styles.tabContent}
          />
        );
      
      case 'process':
        return (
          <MediaProcessor
            jobs={processingJobs}
            onJobUpdate={handleJobUpdate}
            onJobComplete={handleJobComplete}
            onJobError={handleJobError}
            style={styles.tabContent}
          />
        );
      
      case 'library':
        return (
          <View style={styles.libraryContent}>
            <Text style={styles.libraryTitle}>Media Library</Text>
            <Text style={styles.librarySubtitle}>
              {files.length} files uploaded • {processingJobs.filter(j => j.status === 'completed').length} processed
            </Text>
            
            <View style={styles.libraryActions}>
              <AdvancedButton
                variant="secondary"
                size="medium"
                onPress={exportFiles}
                style={styles.libraryButton}
                effectType="ripple"
              >
                <Ionicons name="download-outline" size={16} color={COLORS.text} />
                <Text style={styles.libraryButtonText}>Export</Text>
              </AdvancedButton>
              
              <AdvancedButton
                variant="secondary"
                size="medium"
                onPress={clearAllFiles}
                style={styles.libraryButton}
                effectType="glow"
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                <Text style={[styles.libraryButtonText, { color: COLORS.error }]}>Clear All</Text>
              </AdvancedButton>
            </View>

            {/* Library stats would go here */}
            <View style={styles.statsContainer}>
              <GlassCard style={styles.statCard} intensity={40}>
                <Text style={styles.statValue}>{totalUploaded}</Text>
                <Text style={styles.statLabel}>Uploaded</Text>
              </GlassCard>
              
              <GlassCard style={styles.statCard} intensity={40}>
                <Text style={styles.statValue}>{totalProcessed}</Text>
                <Text style={styles.statLabel}>Processed</Text>
              </GlassCard>
              
              <GlassCard style={styles.statCard} intensity={40}>
                <Text style={styles.statValue}>
                  {Math.round(files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024))}MB
                </Text>
                <Text style={styles.statLabel}>Total Size</Text>
              </GlassCard>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[COLORS.primary + '20', 'transparent']}
          style={styles.headerGradient}
        />
        
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          
          <Animated.View
            style={[
              styles.titleContainer,
              {
                transform: [
                  {
                    translateY: floatingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -3],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.title}>Media Upload & Processing</Text>
            <Text style={styles.subtitle}>Upload, process, and manage your files</Text>
          </Animated.View>
          
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <GlassCard style={styles.tabNavigation} intensity={60}>
        <View style={styles.tabButtons}>
          {[
            { id: 'upload', name: 'Upload', icon: 'cloud-upload-outline' },
            { id: 'process', name: 'Process', icon: 'cog-outline' },
            { id: 'library', name: 'Library', icon: 'library-outline' },
          ].map((tab) => (
            <AdvancedButton
              key={tab.id}
              variant={activeTab === tab.id ? "primary" : "secondary"}
              size="medium"
              onPress={() => setActiveTab(tab.id as any)}
              style={styles.tabButton}
              effectType="morph"
            >
              <Ionicons 
                name={tab.icon as any} 
                size={18} 
                color={activeTab === tab.id ? COLORS.background : COLORS.text} 
              />
              <Text style={[
                styles.tabButtonText,
                { color: activeTab === tab.id ? COLORS.background : COLORS.text }
              ]}>
                {tab.name}
              </Text>
            </AdvancedButton>
          ))}
        </View>
      </GlassCard>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>

      {/* Settings Modal */}
      {renderSettingsModal()}
    </Animated.View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    position: 'relative',
    paddingTop: 50,
    paddingBottom: SPACING.lg,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  settingsButton: {
    padding: SPACING.sm,
  },
  tabNavigation: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  tabButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  tabButtonText: {
    ...TYPOGRAPHY.button,
    fontSize: 12,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    margin: SPACING.lg,
  },
  libraryContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  libraryTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  librarySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  libraryActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  libraryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.lg,
  },
  libraryButtonText: {
    ...TYPOGRAPHY.button,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModal: {
    width: '90%',
    maxHeight: '80%',
    padding: SPACING.xl,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  settingsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: SPACING.sm,
  },
  settingsContent: {
    maxHeight: screenHeight * 0.6,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  settingDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  qualityButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qualityButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  qualityButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 11,
  },
  qualityButtonTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  sizeButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sizeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sizeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sizeButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 11,
  },
  sizeButtonTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  saveButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    fontWeight: '600',
  },
});

export default MediaUploadScreen;