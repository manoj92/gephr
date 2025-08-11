import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Dimensions, ActivityIndicator, Modal, Switch, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { mappingService } from '../services/MappingService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MappingScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isMapping, setIsMapping] = useState(false);
  const [mapName, setMapName] = useState('');
  const [trackingState, setTrackingState] = useState('not_tracking');
  const [pointCount, setPointCount] = useState(0);
  const [mappingQuality, setMappingQuality] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock simulation data
  const [simulationData, setSimulationData] = useState({
    pointsGenerated: 0,
    roomsDetected: 0,
    objectsIdentified: 0,
  });

  // Mapping configuration
  const [config, setConfig] = useState({
    enableLidar: true,
    enableDepthCamera: true,
    enableVisualOdometry: true,
    quality: 'medium' as 'low' | 'medium' | 'high',
    maxPointCloudSize: 100000,
    voxelSize: 0.05,
  });

  useEffect(() => {
    if (isMapping) {
      // Simulate real-time mapping data updates
      const interval = setInterval(() => {
        setSimulationData(prev => ({
          pointsGenerated: prev.pointsGenerated + Math.floor(Math.random() * 50) + 10,
          roomsDetected: Math.min(prev.roomsDetected + (Math.random() > 0.95 ? 1 : 0), 6),
          objectsIdentified: prev.objectsIdentified + (Math.random() > 0.98 ? 1 : 0),
        }));

        setPointCount(prev => prev + Math.floor(Math.random() * 100) + 20);
        setMappingQuality(prev => Math.min(prev + 0.01, 1.0));
        
        // Simulate tracking state changes
        const states = ['normal', 'limited', 'relocating'];
        setTrackingState(states[Math.floor(Math.random() * states.length)]);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isMapping]);

  const handleStartMapping = async () => {
    if (!mapName.trim()) {
      setMapName(`Map_${new Date().toLocaleDateString().replace(/\//g, '-')}`);
    }

    try {
      setLoading(true);
      await mappingService.startMapping(mapName || 'New Map');
      setIsMapping(true);
      setPointCount(0);
      setMappingQuality(0);
      setSimulationData({ pointsGenerated: 0, roomsDetected: 0, objectsIdentified: 0 });
      Alert.alert('Mapping Started', `3D environment mapping has begun for "${mapName}"`);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleStopMapping = async () => {
    if (!isMapping) return;

    try {
      setLoading(true);
      const mapData = await mappingService.stopMapping();
      setIsMapping(false);
      setTrackingState('not_tracking');
      
      Alert.alert(
        'Mapping Complete',
        `Mapping session completed!\n\nPoints captured: ${pointCount.toLocaleString()}\nRooms detected: ${simulationData.roomsDetected}\nObjects identified: ${simulationData.objectsIdentified}\n\nMap has been saved.`,
        [
          { text: 'OK' },
          { text: 'Export', onPress: handleExportMap }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to stop mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMap = async () => {
    if (!isMapping) {
      Alert.alert('No Active Session', 'No active mapping session to save');
      return;
    }

    try {
      // Simulate saving current state
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Map Saved', 'Current mapping progress has been saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save map');
    }
  };

  const handleLoadMap = () => {
    Alert.alert(
      'Load Previous Map',
      'This feature allows you to load and continue working on a previously saved map.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Load', onPress: () => Alert.alert('Coming Soon', 'Map loading functionality is being developed.') }
      ]
    );
  };

  const handleRoomPress = (roomName: string) => {
    Alert.alert(
      `${roomName} Details`,
      `Room: ${roomName}\nMapping Status: ${roomsData.find(r => r.name === roomName)?.status}\nObjects Detected: ${roomsData.find(r => r.name === roomName)?.objects}\n\nYou can set waypoints and define interaction zones for robots in this room.`
    );
  };

  const handleObjectPress = (objectName: string) => {
    const object = objectsData.find(obj => obj.name === objectName);
    Alert.alert(
      `${objectName} Details`,
      `Object: ${objectName}\nLocation: ${object?.room}\nStatus: ${object?.status}\n\nThis object has been identified and can be used for robot interaction training.`
    );
  };

  const handleCalibrateSensors = async () => {
    Alert.alert(
      'Sensor Calibration',
      'This will calibrate the LIDAR, depth cameras, and IMU sensors. Keep the device steady.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Calibration',
          onPress: async () => {
            setLoading(true);
            try {
              await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate calibration
              Alert.alert('Calibration Complete', 'All sensors have been calibrated successfully!');
            } catch (error) {
              Alert.alert('Calibration Failed', 'Sensor calibration failed. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleExportMap = async () => {
    try {
      setLoading(true);
      const plyData = mappingService.exportPointCloud();
      // In a real app, this would save to file system or share
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Export Complete',
        `3D map data has been exported in PLY format.\n\nPoint cloud contains ${pointCount.toLocaleString()} points.\nFile size: ~${Math.round(plyData.length / 1024)}KB\n\nCompatible with MeshLab, CloudCompare, and other 3D software.`
      );
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export map data');
    } finally {
      setLoading(false);
    }
  };

  const handleMapSettings = () => {
    setShowSettings(true);
  };

  const updateMappingConfig = () => {
    mappingService.updateConfig(config);
    setShowSettings(false);
    Alert.alert('Settings Updated', 'Mapping configuration has been updated.');
  };

  const roomsData = [
    { id: 1, name: 'Living Room', status: 'Mapped', objects: 15 },
    { id: 2, name: 'Kitchen', status: 'In Progress', objects: 8 },
    { id: 3, name: 'Bedroom', status: 'Not Mapped', objects: 0 },
    { id: 4, name: 'Office', status: 'Mapped', objects: 12 },
  ];

  const objectsData = [
    { id: 1, name: 'Coffee Table', room: 'Living Room', status: 'Mapped' },
    { id: 2, name: 'Kitchen Counter', room: 'Kitchen', status: 'Mapped' },
    { id: 3, name: 'Desk Chair', room: 'Office', status: 'Mapped' },
    { id: 4, name: 'Sofa', room: 'Living Room', status: 'Mapped' },
    { id: 5, name: 'Refrigerator', room: 'Kitchen', status: 'In Progress' },
  ];

  const renderRoomCard = (room: typeof roomsData[0]) => (
    <TouchableOpacity 
      key={room.id} 
      style={styles.roomCard}
      onPress={() => handleRoomPress(room.name)}
    >
      <View style={styles.roomHeader}>
        <Text style={styles.roomName}>{room.name}</Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: room.status === 'Mapped' ? COLORS.success : 
                          room.status === 'In Progress' ? COLORS.warning : COLORS.error 
        }]}>
          <Text style={styles.statusText}>{room.status}</Text>
        </View>
      </View>
      <Text style={styles.objectCount}>{room.objects} objects detected</Text>
    </TouchableOpacity>
  );

  const renderObjectCard = (object: typeof objectsData[0]) => (
    <TouchableOpacity 
      key={object.id} 
      style={styles.objectCard}
      onPress={() => handleObjectPress(object.name)}
    >
      <View style={styles.objectInfo}>
        <Text style={styles.objectName}>{object.name}</Text>
        <Text style={styles.objectRoom}>{object.room}</Text>
      </View>
      <View style={[styles.objectStatus, { 
        backgroundColor: object.status === 'Mapped' ? COLORS.success : COLORS.warning 
      }]}>
        <Text style={styles.objectStatusText}>{object.status}</Text>
      </View>
    </TouchableOpacity>
  );

  const getTrackingStatusColor = () => {
    switch (trackingState) {
      case 'normal': return COLORS.success;
      case 'limited': return COLORS.warning;
      case 'relocating': return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Environment Mapping</Text>
            {isMapping && (
              <View style={styles.statusContainer}>
                <View style={[styles.statusIndicator, { backgroundColor: getTrackingStatusColor() }]} />
                <Text style={styles.statusText}>
                  {trackingState.replace('_', ' ').toUpperCase()} - {(mappingQuality * 100).toFixed(0)}% Quality
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={handleMapSettings}>
            <Text style={styles.settingsButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {!isMapping && (
          <View style={styles.nameInput}>
            <Text style={styles.inputLabel}>Map Name</Text>
            <TextInput
              style={styles.textInput}
              value={mapName}
              onChangeText={setMapName}
              placeholder={`Map_${new Date().toLocaleDateString().replace(/\//g, '-')}`}
            />
          </View>
        )}

        <View style={styles.mappingControls}>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={[styles.startButton, isMapping && styles.buttonDisabled]} 
              onPress={handleStartMapping}
              disabled={isMapping || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <Text style={styles.startButtonText}>
                  {isMapping ? 'Mapping...' : 'Start Mapping'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.stopButton, !isMapping && styles.buttonDisabled]} 
              onPress={handleStopMapping}
              disabled={!isMapping || loading}
            >
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSaveMap}>
              <Text style={styles.actionButtonText}>Save Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleLoadMap}>
              <Text style={styles.actionButtonText}>Load Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isMapping && (
          <View style={styles.realTimeStats}>
            <Text style={styles.statsTitle}>Real-time Mapping Data</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{pointCount.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Points Captured</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{simulationData.roomsDetected}</Text>
                <Text style={styles.statLabel}>Rooms Detected</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{simulationData.objectsIdentified}</Text>
                <Text style={styles.statLabel}>Objects Found</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{(mappingQuality * 100).toFixed(0)}%</Text>
                <Text style={styles.statLabel}>Quality</Text>
              </View>
            </View>
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Mapping Progress</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${mappingQuality * 100}%` }]} />
              </View>
            </View>
          </View>
        )}

        <View style={styles.mapVisualization}>
          <Text style={styles.visualizationTitle}>3D Map View</Text>
          <View style={styles.mapPlaceholder}>
            {isMapping ? (
              <>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.mapPlaceholderText}>Mapping in Progress</Text>
                <Text style={styles.mapSubtext}>
                  {pointCount.toLocaleString()} points captured
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.mapPlaceholderText}>3D Environment Visualization</Text>
                <Text style={styles.mapSubtext}>Start mapping to see real-time 3D data</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.utilitySection}>
          <TouchableOpacity 
            style={[styles.utilityButton, loading && styles.buttonDisabled]} 
            onPress={handleCalibrateSensors}
            disabled={loading}
          >
            <Text style={styles.utilityButtonText}>Calibrate Sensors</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.utilityButton, pointCount === 0 && styles.buttonDisabled]} 
            onPress={handleExportMap}
            disabled={pointCount === 0 || loading}
          >
            <Text style={styles.utilityButtonText}>Export Map Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.roomsSection}>
          <Text style={styles.sectionTitle}>Detected Rooms</Text>
          {roomsData.map(renderRoomCard)}
        </View>

        <View style={styles.objectsSection}>
          <Text style={styles.sectionTitle}>Identified Objects</Text>
          {objectsData.map(renderObjectCard)}
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mapping Settings</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Enable LiDAR</Text>
              <Switch
                value={config.enableLidar}
                onValueChange={(value) => setConfig({...config, enableLidar: value})}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Enable Depth Camera</Text>
              <Switch
                value={config.enableDepthCamera}
                onValueChange={(value) => setConfig({...config, enableDepthCamera: value})}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Visual Odometry</Text>
              <Switch
                value={config.enableVisualOdometry}
                onValueChange={(value) => setConfig({...config, enableVisualOdometry: value})}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <Text style={styles.settingLabel}>Quality Level</Text>
            <View style={styles.qualityButtons}>
              {(['low', 'medium', 'high'] as const).map((quality) => (
                <TouchableOpacity
                  key={quality}
                  style={[styles.qualityButton, config.quality === quality && styles.qualityButtonSelected]}
                  onPress={() => setConfig({...config, quality})}
                >
                  <Text style={[styles.qualityButtonText, config.quality === quality && styles.qualityButtonTextSelected]}>
                    {quality.charAt(0).toUpperCase() + quality.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSettings(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={updateMappingConfig}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  settingsButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  nameInput: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
  },
  mappingControls: {
    marginBottom: SPACING.lg,
  },
  controlRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    textAlign: 'center',
  },
  stopButton: {
    backgroundColor: COLORS.error,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flex: 0.3,
  },
  stopButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  realTimeStats: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 0.48,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  statValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  progressContainer: {
    marginTop: SPACING.sm,
  },
  progressLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  actionButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
  },
  actionButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  settingLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  qualityButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flex: 1,
  },
  qualityButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  qualityButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    textAlign: 'center',
  },
  qualityButtonTextSelected: {
    color: COLORS.background,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  saveButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.background,
    marginTop: SPACING.md,
  },
  mapVisualization: {
    marginBottom: SPACING.xl,
  },
  visualizationTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  mapSubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  utilitySection: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  utilityButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
  },
  utilityButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    textAlign: 'center',
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  roomsSection: {
    marginBottom: SPACING.xl,
  },
  roomCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  roomName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.background,
    fontWeight: '600',
  },
  objectCount: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  objectsSection: {
    marginBottom: SPACING.xl,
  },
  objectCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  objectInfo: {
    flex: 1,
  },
  objectName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  objectRoom: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  objectStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  objectStatusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.background,
    fontWeight: '600',
  },
});

export default MappingScreen;