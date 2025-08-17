/**
 * Advanced File Upload Component
 * Handles multiple file types with progress tracking, validation, and preview
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants/theme';
import { GlassCard } from '../ui/GlassCard';
import { AdvancedButton } from '../ui/AdvancedButton';
import { usePulseAnimation, useShakeAnimation } from '../animations/AnimationLibrary';

const { width: screenWidth } = Dimensions.get('window');

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
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
  };
}

interface FileUploaderProps {
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  onFilesSelected?: (files: FileItem[]) => void;
  onUploadProgress?: (fileId: string, progress: number) => void;
  onUploadComplete?: (fileId: string, result: any) => void;
  onUploadError?: (fileId: string, error: string) => void;
  style?: any;
  allowCamera?: boolean;
  allowMultiple?: boolean;
  showPreview?: boolean;
}

// ==================== CONSTANTS ====================

const SUPPORTED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'],
  audio: ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac'],
  document: ['application/pdf', 'text/plain', 'application/json'],
  data: ['application/zip', 'application/x-zip-compressed'],
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB default
const MAX_FILES = 10; // default max files

// ==================== UTILITY FUNCTIONS ====================

const getFileTypeCategory = (mimeType: string): string => {
  for (const [category, types] of Object.entries(SUPPORTED_TYPES)) {
    if (types.some(type => mimeType.includes(type.split('/')[1]))) {
      return category;
    }
  }
  return 'unknown';
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const generateThumbnail = async (file: FileItem): Promise<string | undefined> => {
  if (file.type.startsWith('image/')) {
    return file.uri;
  }
  
  if (file.type.startsWith('video/')) {
    try {
      // Generate video thumbnail (implementation would depend on video processing library)
      // For now, return a placeholder
      return undefined;
    } catch (error) {
      console.error('Failed to generate video thumbnail:', error);
      return undefined;
    }
  }
  
  return undefined;
};

// ==================== MAIN COMPONENT ====================

export const FileUploader: React.FC<FileUploaderProps> = ({
  acceptedTypes = Object.values(SUPPORTED_TYPES).flat(),
  maxFileSize = MAX_FILE_SIZE,
  maxFiles = MAX_FILES,
  onFilesSelected,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  style,
  allowCamera = true,
  allowMultiple = true,
  showPreview = true,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const pulseAnim = usePulseAnimation();
  const shakeAnim = useShakeAnimation();
  const dragAnim = useRef(new Animated.Value(0)).current;

  // Request permissions on mount
  React.useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (allowCamera) {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!cameraPermission.granted || !mediaLibraryPermission.granted) {
        Alert.alert(
          'Permissions Required',
          'Camera and media library permissions are required to upload photos and videos.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const validateFile = (file: any): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds limit of ${formatFileSize(maxFileSize)}`;
    }

    // Check file type
    if (file.type && !acceptedTypes.some(type => file.type.includes(type.split('/')[1]))) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    // Check max files limit
    if (files.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    return null;
  };

  const processFiles = async (selectedFiles: any[]) => {
    const newFiles: FileItem[] = [];

    for (const file of selectedFiles) {
      const validation = validateFile(file);
      if (validation) {
        Alert.alert('File Validation Error', validation);
        continue;
      }

      const fileItem: FileItem = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name || `file_${Date.now()}`,
        uri: file.uri,
        type: file.type || file.mimeType || 'application/octet-stream',
        size: file.size || 0,
        mimeType: file.type || file.mimeType,
        uploadStatus: 'pending',
        uploadProgress: 0,
      };

      // Generate thumbnail
      const thumbnail = await generateThumbnail(fileItem);
      if (thumbnail) {
        fileItem.thumbnail = thumbnail;
      }

      // Extract metadata for media files
      if (fileItem.type.startsWith('image/') || fileItem.type.startsWith('video/')) {
        try {
          const info = await FileSystem.getInfoAsync(fileItem.uri);
          if (info.exists) {
            fileItem.metadata = {
              // Additional metadata would be extracted here
            };
          }
        } catch (error) {
          console.warn('Failed to extract file metadata:', error);
        }
      }

      newFiles.push(fileItem);
    }

    if (newFiles.length > 0) {
      const updatedFiles = allowMultiple ? [...files, ...newFiles] : newFiles;
      setFiles(updatedFiles);
      onFilesSelected?.(updatedFiles);
    }
  };

  const pickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: allowMultiple,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled) {
        await processFiles(result.assets);
      }
    } catch (error) {
      console.error('Error picking from library:', error);
      Alert.alert('Error', 'Failed to pick files from library');
    }
  };

  const pickFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled) {
        await processFiles(result.assets);
      }
    } catch (error) {
      console.error('Error taking photo/video:', error);
      Alert.alert('Error', 'Failed to capture from camera');
    }
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: allowMultiple,
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const files = Array.isArray(result.assets) ? result.assets : [result.assets];
        await processFiles(files);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents');
    }
  };

  const uploadFile = async (file: FileItem) => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, uploadStatus: 'uploading' } : f
      ));

      // Simulate upload progress
      const uploadProgress = (progress: number) => {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, uploadProgress: progress } : f
        ));
        onUploadProgress?.(file.id, progress);
      };

      // Simulate upload with progress updates
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        uploadProgress(i);
      }

      // Mock upload completion
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, uploadStatus: 'completed', uploadProgress: 100 } : f
      ));

      onUploadComplete?.(file.id, { success: true, url: `uploaded/${file.name}` });
    } catch (error) {
      console.error('Upload failed:', error);
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, uploadStatus: 'error' } : f
      ));
      onUploadError?.(file.id, error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const uploadAllFiles = async () => {
    setIsUploading(true);
    const pendingFiles = files.filter(f => f.uploadStatus === 'pending');
    
    try {
      await Promise.all(pendingFiles.map(file => uploadFile(file)));
    } catch (error) {
      console.error('Batch upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesSelected?.(updatedFiles);
  };

  const retryUpload = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      uploadFile(file);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return 'image-outline';
    if (type.startsWith('video/')) return 'videocam-outline';
    if (type.startsWith('audio/')) return 'musical-notes-outline';
    if (type.includes('pdf')) return 'document-text-outline';
    if (type.includes('zip')) return 'archive-outline';
    return 'document-outline';
  };

  const renderFilePreview = (file: FileItem) => {
    if (file.type.startsWith('image/') && file.thumbnail) {
      return (
        <Image source={{ uri: file.thumbnail }} style={styles.previewImage} />
      );
    }

    if (file.type.startsWith('video/')) {
      return (
        <Video
          source={{ uri: file.uri }}
          style={styles.previewVideo}
          useNativeControls={false}
          shouldPlay={false}
          isLooping={false}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.previewIcon}>
        <Ionicons name={getFileIcon(file.type) as any} size={40} color={COLORS.primary} />
      </View>
    );
  };

  const renderUploadZone = () => (
    <Animated.View
      style={[
        styles.uploadZone,
        {
          transform: [
            {
              scale: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.02],
              }),
            },
          ],
          borderColor: isDragOver ? COLORS.primary : COLORS.border,
        },
      ]}
    >
      <LinearGradient
        colors={[COLORS.primary + '10', 'transparent']}
        style={styles.uploadZoneGradient}
      />
      
      <Ionicons name="cloud-upload-outline" size={48} color={COLORS.primary} />
      <Text style={styles.uploadZoneTitle}>Drop files here or tap to browse</Text>
      <Text style={styles.uploadZoneSubtitle}>
        Supports: {acceptedTypes.slice(0, 3).join(', ')}
        {acceptedTypes.length > 3 && ` +${acceptedTypes.length - 3} more`}
      </Text>
      <Text style={styles.uploadZoneInfo}>
        Max size: {formatFileSize(maxFileSize)} • Max files: {maxFiles}
      </Text>
      
      <View style={styles.uploadButtons}>
        <AdvancedButton
          variant="primary"
          size="medium"
          onPress={pickFromLibrary}
          style={styles.uploadButton}
          effectType="glow"
        >
          <Ionicons name="images-outline" size={16} color={COLORS.background} />
          <Text style={styles.uploadButtonText}>Gallery</Text>
        </AdvancedButton>
        
        {allowCamera && (
          <AdvancedButton
            variant="secondary"
            size="medium"
            onPress={pickFromCamera}
            style={styles.uploadButton}
            effectType="ripple"
          >
            <Ionicons name="camera-outline" size={16} color={COLORS.text} />
            <Text style={[styles.uploadButtonText, { color: COLORS.text }]}>Camera</Text>
          </AdvancedButton>
        )}
        
        <AdvancedButton
          variant="secondary"
          size="medium"
          onPress={pickDocuments}
          style={styles.uploadButton}
          effectType="morph"
        >
          <Ionicons name="document-outline" size={16} color={COLORS.text} />
          <Text style={[styles.uploadButtonText, { color: COLORS.text }]}>Files</Text>
        </AdvancedButton>
      </View>
    </Animated.View>
  );

  const renderFileList = () => (
    <View style={styles.fileList}>
      <View style={styles.fileListHeader}>
        <Text style={styles.fileListTitle}>
          Selected Files ({files.length}/{maxFiles})
        </Text>
        
        {files.some(f => f.uploadStatus === 'pending') && (
          <AdvancedButton
            variant="primary"
            size="small"
            onPress={uploadAllFiles}
            style={styles.uploadAllButton}
            effectType="pulse"
            disabled={isUploading}
          >
            <Ionicons name="cloud-upload" size={14} color={COLORS.background} />
            <Text style={styles.uploadAllButtonText}>Upload All</Text>
          </AdvancedButton>
        )}
      </View>
      
      <ScrollView style={styles.fileScrollView} showsVerticalScrollIndicator={false}>
        {files.map((file) => (
          <GlassCard key={file.id} style={styles.fileItem} intensity={40}>
            <View style={styles.fileItemContent}>
              {showPreview && (
                <View style={styles.filePreview}>
                  {renderFilePreview(file)}
                </View>
              )}
              
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                <Text style={styles.fileType}>{getFileTypeCategory(file.type)}</Text>
                
                {file.uploadStatus === 'uploading' && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${file.uploadProgress || 0}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>{file.uploadProgress || 0}%</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.fileActions}>
                {file.uploadStatus === 'pending' && (
                  <TouchableOpacity
                    onPress={() => uploadFile(file)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
                
                {file.uploadStatus === 'completed' && (
                  <View style={styles.statusIcon}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  </View>
                )}
                
                {file.uploadStatus === 'error' && (
                  <TouchableOpacity
                    onPress={() => retryUpload(file.id)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="refresh" size={20} color={COLORS.warning} />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  onPress={() => removeFile(file.id)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {files.length === 0 ? renderUploadZone() : renderFileList()}
    </View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  uploadZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
    margin: SPACING.lg,
    padding: SPACING.xl,
    position: 'relative',
    minHeight: 300,
  },
  uploadZoneGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  uploadZoneTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    fontWeight: '600',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  uploadZoneSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  uploadZoneInfo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    fontSize: 11,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  uploadButtonText: {
    ...TYPOGRAPHY.button,
    fontSize: 12,
    fontWeight: '500',
  },
  fileList: {
    flex: 1,
    margin: SPACING.lg,
  },
  fileListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  fileListTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    fontWeight: '600',
  },
  uploadAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  uploadAllButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    fontSize: 11,
    fontWeight: '500',
  },
  fileScrollView: {
    flex: 1,
  },
  fileItem: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  fileItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  filePreview: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  previewIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  fileSize: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  fileType: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '600',
    minWidth: 30,
  },
  fileActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.sm,
  },
  statusIcon: {
    padding: SPACING.sm,
  },
});

export default FileUploader;