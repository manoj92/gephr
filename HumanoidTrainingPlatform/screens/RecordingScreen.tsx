import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';

export default function RecordingScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [gestureCount, setGestureCount] = useState(0);

  const intervalRef = useRef(null);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    setGestureCount(0);
    intervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    Alert.alert('Recording Saved', `Recorded ${gestureCount} gestures in ${Math.floor(recordingTime / 60)}:${recordingTime % 60} minutes`);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>🎥 Recording Studio</Text>
          <Text style={styles.subtitle}>Capture Robot Training Data</Text>
        </View>

        {/* Recording Status */}
        <View style={styles.recordingStatus}>
          <View style={[styles.statusIndicator, isRecording && styles.recordingIndicator]} />
          <Text style={styles.statusText}>
            {isRecording ? 'Recording in Progress' : 'Ready to Record'}
          </Text>
        </View>

        {/* Recording Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{formatTime(recordingTime)}</Text>
            <Text style={styles.metricLabel}>Duration</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{gestureCount}</Text>
            <Text style={styles.metricLabel}>Gestures</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>HD</Text>
            <Text style={styles.metricLabel}>Quality</Text>
          </View>
        </View>

        {/* Camera Preview Placeholder */}
        <View style={styles.cameraPreview}>
          <Text style={styles.cameraText}>📹 Camera Preview</Text>
          <Text style={styles.cameraSubtext}>Hand tracking and gesture detection active</Text>
        </View>

        {/* Recording Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.controlButton, styles.recordButton]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.controlButtonText}>
              {isRecording ? '⏹️ Stop Recording' : '🔴 Start Recording'}
            </Text>
          </TouchableOpacity>

          <View style={styles.settingsRow}>
            <TouchableOpacity style={styles.settingButton}>
              <Text style={styles.settingText}>⚙️ Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingButton}>
              <Text style={styles.settingText}>📊 Calibrate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recording Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recording Options</Text>
          <TouchableOpacity style={styles.optionCard}>
            <Text style={styles.optionTitle}>Gesture Type</Text>
            <Text style={styles.optionValue}>Manual Task</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard}>
            <Text style={styles.optionTitle}>Robot Model</Text>
            <Text style={styles.optionValue}>Unitree G1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard}>
            <Text style={styles.optionTitle}>Environment</Text>
            <Text style={styles.optionValue}>Indoor Kitchen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { padding: 20, alignItems: 'center' },
  title: { fontSize: 24, color: '#00E5FF', fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#B0B0B0', textAlign: 'center' },
  recordingStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#808080', marginRight: 8 },
  recordingIndicator: { backgroundColor: '#FF5252' },
  statusText: { color: '#FFFFFF', fontSize: 16 },
  metricsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginBottom: 20 },
  metric: { alignItems: 'center' },
  metricValue: { fontSize: 24, color: '#00E5FF', fontWeight: 'bold' },
  metricLabel: { fontSize: 12, color: '#808080', marginTop: 4 },
  cameraPreview: { backgroundColor: '#1A1A1A', height: 200, marginHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  cameraText: { color: '#FFFFFF', fontSize: 18, marginBottom: 8 },
  cameraSubtext: { color: '#808080', fontSize: 14 },
  controls: { paddingHorizontal: 20, marginBottom: 20 },
  controlButton: { backgroundColor: '#FF5252', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  recordButton: { backgroundColor: '#FF5252' },
  controlButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  settingButton: { backgroundColor: '#1A1A1A', flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  settingText: { color: '#FFFFFF', fontSize: 14 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginBottom: 12 },
  optionCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionTitle: { color: '#FFFFFF', fontSize: 16 },
  optionValue: { color: '#00E5FF', fontSize: 16, fontWeight: '600' },
});