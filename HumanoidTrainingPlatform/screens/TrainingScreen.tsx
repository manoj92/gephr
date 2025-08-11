import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function TrainingScreen() {
  const [currentData, setCurrentData] = useState(null);
  const [labelingMode, setLabelingMode] = useState(false);
  const [labels, setLabels] = useState([]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>🏷️ Training & Labeling</Text>
          <Text style={styles.subtitle}>Process and Label Training Data</Text>
        </View>

        {/* Training Pipeline Status */}
        <View style={styles.pipelineContainer}>
          <Text style={styles.sectionTitle}>Training Pipeline</Text>
          <View style={styles.pipelineStep}>
            <View style={[styles.stepIndicator, styles.stepCompleted]} />
            <Text style={styles.stepText}>Data Collection ✓</Text>
          </View>
          <View style={styles.pipelineStep}>
            <View style={[styles.stepIndicator, styles.stepActive]} />
            <Text style={styles.stepText}>Labeling in Progress</Text>
          </View>
          <View style={styles.pipelineStep}>
            <View style={styles.stepIndicator} />
            <Text style={styles.stepText}>Model Training</Text>
          </View>
          <View style={styles.pipelineStep}>
            <View style={styles.stepIndicator} />
            <Text style={styles.stepText}>Validation</Text>
          </View>
        </View>

        {/* Data Labeling Interface */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Labeling</Text>
          <View style={styles.labelingInterface}>
            <View style={styles.dataPreview}>
              <Text style={styles.previewText}>📹 Gesture Frame #1247</Text>
              <Text style={styles.previewSubtext}>Timestamp: 00:02:34</Text>
            </View>
            
            <View style={styles.labelOptions}>
              <TouchableOpacity style={styles.labelButton}>
                <Text style={styles.labelButtonText}>✋ Grasp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.labelButton}>
                <Text style={styles.labelButtonText}>👉 Point</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.labelButton}>
                <Text style={styles.labelButtonText}>🤏 Pinch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.labelButton}>
                <Text style={styles.labelButtonText}>✋ Release</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.labelingControls}>
              <TouchableOpacity style={styles.controlBtn}>
                <Text style={styles.controlBtnText}>⏮️ Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlBtn}>
                <Text style={styles.controlBtnText}>⏭️ Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Training Models */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training Models</Text>
          <View style={styles.modelCard}>
            <Text style={styles.modelName}>Manipulation Model v2.1</Text>
            <View style={styles.modelProgress}>
              <View style={[styles.progressBar, { width: '75%' }]} />
            </View>
            <Text style={styles.modelStatus}>Training: 75% complete</Text>
          </View>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🚀 Start New Training</Text>
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
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginBottom: 12 },
  pipelineContainer: { paddingHorizontal: 20, marginBottom: 20 },
  pipelineStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#333333', marginRight: 12 },
  stepCompleted: { backgroundColor: '#00C896' },
  stepActive: { backgroundColor: '#00E5FF' },
  stepText: { color: '#FFFFFF', fontSize: 14 },
  labelingInterface: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16 },
  dataPreview: { alignItems: 'center', marginBottom: 16 },
  previewText: { color: '#FFFFFF', fontSize: 16, marginBottom: 4 },
  previewSubtext: { color: '#808080', fontSize: 12 },
  labelOptions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  labelButton: { backgroundColor: '#333333', padding: 12, borderRadius: 8, width: (width - 80) / 2, alignItems: 'center', marginBottom: 8 },
  labelButtonText: { color: '#FFFFFF', fontSize: 14 },
  labelingControls: { flexDirection: 'row', justifyContent: 'space-between' },
  controlBtn: { backgroundColor: '#00E5FF', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center', marginHorizontal: 4 },
  controlBtnText: { color: '#0A0A0A', fontSize: 14, fontWeight: '600' },
  modelCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 16 },
  modelName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  modelProgress: { backgroundColor: '#333333', height: 8, borderRadius: 4, marginBottom: 8 },
  progressBar: { backgroundColor: '#00E5FF', height: 8, borderRadius: 4 },
  modelStatus: { color: '#808080', fontSize: 12 },
  actionButton: { backgroundColor: '#00E5FF', padding: 16, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#0A0A0A', fontSize: 16, fontWeight: '600' },
});