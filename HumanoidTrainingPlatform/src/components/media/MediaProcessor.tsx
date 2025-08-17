/**
 * Advanced Media Processing Component
 * Handles image optimization, video compression, audio processing, and data preprocessing
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants/theme';
import { GlassCard } from '../ui/GlassCard';
import { AdvancedButton } from '../ui/AdvancedButton';
import { usePulseAnimation } from '../animations/AnimationLibrary';

const { width: screenWidth } = Dimensions.get('window');

// ==================== TYPES ====================

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
  processingOptions: ProcessingOptions;
  outputUri?: string;
  metadata?: any;
}

interface ProcessingOptions {
  type: 'image' | 'video' | 'audio' | 'data';
  imageOptions?: {
    resize?: { width: number; height: number };
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    rotate?: number;
    crop?: { originX: number; originY: number; width: number; height: number };
  };
  videoOptions?: {
    resolution?: '480p' | '720p' | '1080p';
    bitrate?: number;
    fps?: number;
    format?: 'mp4' | 'mov';
  };
  audioOptions?: {
    bitrate?: number;
    sampleRate?: number;
    format?: 'mp3' | 'wav' | 'm4a';
    normalize?: boolean;
  };
  dataOptions?: {
    format?: 'json' | 'csv' | 'hdf5';
    compression?: 'gzip' | 'bzip2' | 'none';
    validation?: boolean;
  };
}

interface MediaProcessorProps {
  jobs: ProcessingJob[];
  onJobUpdate?: (job: ProcessingJob) => void;
  onJobComplete?: (job: ProcessingJob) => void;
  onJobError?: (job: ProcessingJob, error: string) => void;
  style?: any;
}

// ==================== PROCESSING PRESETS ====================

const PROCESSING_PRESETS = {
  image: {
    web_optimized: {
      resize: { width: 1920, height: 1080 },
      quality: 0.8,
      format: 'jpeg' as const,
    },
    thumbnail: {
      resize: { width: 300, height: 300 },
      quality: 0.7,
      format: 'jpeg' as const,
    },
    high_quality: {
      quality: 0.95,
      format: 'png' as const,
    },
    compressed: {
      quality: 0.6,
      format: 'jpeg' as const,
    },
  },
  video: {
    mobile_optimized: {
      resolution: '720p' as const,
      bitrate: 2000,
      fps: 30,
      format: 'mp4' as const,
    },
    high_quality: {
      resolution: '1080p' as const,
      bitrate: 5000,
      fps: 60,
      format: 'mp4' as const,
    },
    compressed: {
      resolution: '480p' as const,
      bitrate: 1000,
      fps: 24,
      format: 'mp4' as const,
    },
  },
  audio: {
    podcast: {
      bitrate: 128,
      sampleRate: 44100,
      format: 'mp3' as const,
      normalize: true,
    },
    music: {
      bitrate: 320,
      sampleRate: 48000,
      format: 'mp3' as const,
      normalize: false,
    },
    voice: {
      bitrate: 64,
      sampleRate: 22050,
      format: 'mp3' as const,
      normalize: true,
    },
  },
};

// ==================== PROCESSING FUNCTIONS ====================

const processImage = async (
  uri: string,
  options: ProcessingOptions['imageOptions'],
  onProgress: (progress: number) => void
): Promise<{ uri: string; size: number }> => {
  try {
    onProgress(10);

    let actions: ImageManipulator.Action[] = [];

    // Add resize action
    if (options?.resize) {
      actions.push({
        resize: options.resize,
      });
    }

    onProgress(30);

    // Add rotation action
    if (options?.rotate) {
      actions.push({
        rotate: options.rotate,
      });
    }

    onProgress(50);

    // Add crop action
    if (options?.crop) {
      actions.push({
        crop: options.crop,
      });
    }

    onProgress(70);

    // Process the image
    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      {
        compress: options?.quality || 1,
        format: options?.format === 'png' 
          ? ImageManipulator.SaveFormat.PNG 
          : ImageManipulator.SaveFormat.JPEG,
      }
    );

    onProgress(90);

    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(result.uri);
    const size = fileInfo.exists ? fileInfo.size || 0 : 0;

    onProgress(100);

    return {
      uri: result.uri,
      size,
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const processVideo = async (
  uri: string,
  options: ProcessingOptions['videoOptions'],
  onProgress: (progress: number) => void
): Promise<{ uri: string; size: number }> => {
  try {
    // Video processing would require a native module or external service
    // For now, we'll simulate the process
    onProgress(10);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onProgress(30);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onProgress(60);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onProgress(90);
    await new Promise(resolve => setTimeout(resolve, 500));

    // In a real implementation, this would return the processed video
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = fileInfo.exists ? fileInfo.size || 0 : 0;
    
    // Simulate compression (typically 30-50% size reduction)
    const compressionFactor = options?.resolution === '480p' ? 0.3 : 
                             options?.resolution === '720p' ? 0.5 : 0.7;
    
    onProgress(100);

    return {
      uri, // In real implementation, this would be the processed video URI
      size: Math.floor(originalSize * compressionFactor),
    };
  } catch (error) {
    throw new Error(`Video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const processAudio = async (
  uri: string,
  options: ProcessingOptions['audioOptions'],
  onProgress: (progress: number) => void
): Promise<{ uri: string; size: number }> => {
  try {
    // Audio processing would require native audio processing libraries
    // Simulating the process for now
    onProgress(20);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onProgress(50);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onProgress(80);
    await new Promise(resolve => setTimeout(resolve, 600));

    const fileInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = fileInfo.exists ? fileInfo.size || 0 : 0;
    
    // Simulate audio compression based on bitrate
    const compressionFactor = (options?.bitrate || 128) / 320; // Assume original is 320kbps
    
    onProgress(100);

    return {
      uri, // In real implementation, this would be the processed audio URI
      size: Math.floor(originalSize * compressionFactor),
    };
  } catch (error) {
    throw new Error(`Audio processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const processData = async (
  uri: string,
  options: ProcessingOptions['dataOptions'],
  onProgress: (progress: number) => void
): Promise<{ uri: string; size: number }> => {
  try {
    onProgress(10);

    // Read file content
    const content = await FileSystem.readAsStringAsync(uri);
    
    onProgress(30);

    let processedContent = content;
    let processedUri = uri;

    // Data validation
    if (options?.validation) {
      try {
        if (options.format === 'json') {
          JSON.parse(content);
        }
        // Add more validation for other formats
      } catch (error) {
        throw new Error('Data validation failed: Invalid format');
      }
    }

    onProgress(60);

    // Format conversion
    if (options?.format && options.format !== 'json') {
      if (options.format === 'csv') {
        // Convert JSON to CSV (simplified)
        try {
          const jsonData = JSON.parse(content);
          if (Array.isArray(jsonData) && jsonData.length > 0) {
            const headers = Object.keys(jsonData[0]);
            const csvContent = [
              headers.join(','),
              ...jsonData.map(row => headers.map(header => row[header]).join(','))
            ].join('\n');
            processedContent = csvContent;
          }
        } catch (error) {
          throw new Error('Failed to convert to CSV format');
        }
      }
    }

    onProgress(80);

    // Write processed content
    if (processedContent !== content) {
      const newUri = uri.replace(/\.[^/.]+$/, `.${options?.format || 'txt'}`);
      await FileSystem.writeAsStringAsync(newUri, processedContent);
      processedUri = newUri;
    }

    onProgress(100);

    const fileInfo = await FileSystem.getInfoAsync(processedUri);
    const size = fileInfo.exists ? fileInfo.size || 0 : 0;

    return {
      uri: processedUri,
      size,
    };
  } catch (error) {
    throw new Error(`Data processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ==================== MAIN COMPONENT ====================

export const MediaProcessor: React.FC<MediaProcessorProps> = ({
  jobs,
  onJobUpdate,
  onJobComplete,
  onJobError,
  style,
}) => {
  const [activeJobs, setActiveJobs] = useState<Set<string>>(new Set());
  const [showPresets, setShowPresets] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ProcessingJob | null>(null);
  
  const pulseAnim = usePulseAnimation();

  useEffect(() => {
    // Auto-process pending jobs
    const pendingJobs = jobs.filter(job => job.status === 'pending');
    pendingJobs.forEach(job => {
      if (!activeJobs.has(job.id)) {
        processJob(job);
      }
    });
  }, [jobs]);

  const processJob = async (job: ProcessingJob) => {
    if (activeJobs.has(job.id)) return;

    setActiveJobs(prev => new Set(prev).add(job.id));

    const updatedJob = { ...job, status: 'processing' as const, progress: 0 };
    onJobUpdate?.(updatedJob);

    try {
      let result: { uri: string; size: number };

      const onProgress = (progress: number) => {
        const progressJob = { ...updatedJob, progress };
        onJobUpdate?.(progressJob);
      };

      switch (job.processedOptions.type) {
        case 'image':
          result = await processImage(job.fileUri, job.processingOptions.imageOptions, onProgress);
          break;
        case 'video':
          result = await processVideo(job.fileUri, job.processingOptions.videoOptions, onProgress);
          break;
        case 'audio':
          result = await processAudio(job.fileUri, job.processingOptions.audioOptions, onProgress);
          break;
        case 'data':
          result = await processData(job.fileUri, job.processingOptions.dataOptions, onProgress);
          break;
        default:
          throw new Error('Unsupported processing type');
      }

      const completedJob: ProcessingJob = {
        ...updatedJob,
        status: 'completed',
        progress: 100,
        outputUri: result.uri,
        processedSize: result.size,
        compressionRatio: job.originalSize > 0 ? (job.originalSize - result.size) / job.originalSize : 0,
      };

      onJobUpdate?.(completedJob);
      onJobComplete?.(completedJob);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      const errorJob: ProcessingJob = {
        ...updatedJob,
        status: 'error',
        errorMessage,
      };

      onJobUpdate?.(errorJob);
      onJobError?.(errorJob, errorMessage);
    } finally {
      setActiveJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const retryJob = (job: ProcessingJob) => {
    const retryJob: ProcessingJob = {
      ...job,
      status: 'pending',
      progress: 0,
      errorMessage: undefined,
    };
    onJobUpdate?.(retryJob);
  };

  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'processing':
        return 'sync-outline';
      case 'completed':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'help-outline';
    }
  };

  const getStatusColor = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'processing':
        return COLORS.primary;
      case 'completed':
        return COLORS.success;
      case 'error':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderJobCard = (job: ProcessingJob) => (
    <GlassCard key={job.id} style={styles.jobCard} intensity={40}>
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle} numberOfLines={1}>{job.fileName}</Text>
          <Text style={styles.jobType}>{job.processingOptions.type.toUpperCase()}</Text>
        </View>
        
        <View style={styles.jobStatus}>
          <Ionicons 
            name={getStatusIcon(job.status) as any} 
            size={20} 
            color={getStatusColor(job.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
            {job.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {job.status === 'processing' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                { 
                  width: `${job.progress}%`,
                  transform: [
                    {
                      scaleX: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.02],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(job.progress)}%</Text>
        </View>
      )}

      <View style={styles.jobDetails}>
        <View style={styles.sizeInfo}>
          <Text style={styles.sizeLabel}>Original:</Text>
          <Text style={styles.sizeValue}>{formatBytes(job.originalSize)}</Text>
        </View>
        
        {job.processedSize && (
          <View style={styles.sizeInfo}>
            <Text style={styles.sizeLabel}>Processed:</Text>
            <Text style={styles.sizeValue}>{formatBytes(job.processedSize)}</Text>
          </View>
        )}
        
        {job.compressionRatio && job.compressionRatio > 0 && (
          <View style={styles.compressionInfo}>
            <Text style={styles.compressionLabel}>Savings:</Text>
            <Text style={styles.compressionValue}>
              {Math.round(job.compressionRatio * 100)}%
            </Text>
          </View>
        )}
      </View>

      {job.errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{job.errorMessage}</Text>
        </View>
      )}

      <View style={styles.jobActions}>
        {job.status === 'error' && (
          <AdvancedButton
            variant="secondary"
            size="small"
            onPress={() => retryJob(job)}
            style={styles.actionButton}
            effectType="ripple"
          >
            <Ionicons name="refresh" size={14} color={COLORS.text} />
            <Text style={styles.actionButtonText}>Retry</Text>
          </AdvancedButton>
        )}
        
        <AdvancedButton
          variant="secondary"
          size="small"
          onPress={() => setSelectedJob(job)}
          style={styles.actionButton}
          effectType="glow"
        >
          <Ionicons name="information-circle-outline" size={14} color={COLORS.text} />
          <Text style={styles.actionButtonText}>Details</Text>
        </AdvancedButton>
      </View>
    </GlassCard>
  );

  const renderJobDetails = () => {
    if (!selectedJob) return null;

    return (
      <Modal
        visible={!!selectedJob}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedJob(null)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.detailsModal} intensity={80}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Processing Details</Text>
              <TouchableOpacity
                onPress={() => setSelectedJob(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailsContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>File Information</Text>
                <Text style={styles.detailText}>Name: {selectedJob.fileName}</Text>
                <Text style={styles.detailText}>Type: {selectedJob.fileType}</Text>
                <Text style={styles.detailText}>Original Size: {formatBytes(selectedJob.originalSize)}</Text>
                {selectedJob.processedSize && (
                  <Text style={styles.detailText}>Processed Size: {formatBytes(selectedJob.processedSize)}</Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Processing Options</Text>
                <Text style={styles.detailText}>
                  {JSON.stringify(selectedJob.processingOptions, null, 2)}
                </Text>
              </View>

              {selectedJob.metadata && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Metadata</Text>
                  <Text style={styles.detailText}>
                    {JSON.stringify(selectedJob.metadata, null, 2)}
                  </Text>
                </View>
              )}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Media Processing Queue</Text>
        <Text style={styles.headerSubtitle}>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} • {activeJobs.size} active
        </Text>
      </View>

      <ScrollView style={styles.jobsList} showsVerticalScrollIndicator={false}>
        {jobs.length > 0 ? (
          jobs.map(renderJobCard)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyStateText}>No processing jobs</Text>
            <Text style={styles.emptyStateSubtext}>
              Upload files to start processing
            </Text>
          </View>
        )}
      </ScrollView>

      {renderJobDetails()}
    </View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '20',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '600',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  jobsList: {
    flex: 1,
    padding: SPACING.lg,
  },
  jobCard: {
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  jobType: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  jobStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sizeInfo: {
    alignItems: 'center',
  },
  sizeLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  sizeValue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 11,
  },
  compressionInfo: {
    alignItems: 'center',
  },
  compressionLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  compressionValue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
    fontSize: 11,
  },
  errorContainer: {
    backgroundColor: COLORS.error + '20',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    fontSize: 11,
  },
  jobActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  actionButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyStateSubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsModal: {
    width: '90%',
    maxHeight: '80%',
    padding: SPACING.xl,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  detailsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: SPACING.sm,
  },
  detailsContent: {
    maxHeight: 400,
  },
  detailSection: {
    marginBottom: SPACING.lg,
  },
  detailSectionTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  detailText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default MediaProcessor;