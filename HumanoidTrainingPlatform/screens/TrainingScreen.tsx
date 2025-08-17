import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions, 
  Animated,
  Alert,
  RefreshControl 
} from 'react-native';
import { LineChart, ProgressChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface TrainingSession {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  model: string;
  robot: string;
  metrics: {
    accuracy: number;
    loss: number;
    epochs: number;
    learningRate: number;
  };
}

interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  duration?: number;
  logs: string[];
}

interface PerformanceMetrics {
  accuracy: number[];
  loss: number[];
  validationAccuracy: number[];
  learningRate: number[];
  epochs: number[];
}

export default function TrainingScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'analytics' | 'debug'>('overview');
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [currentPipeline, setCurrentPipeline] = useState<PipelineStage[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [realTimeData, setRealTimeData] = useState<any>({});
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeScreen();
    connectWebSocket();
    startAnimations();
    loadTrainingSessions();
    
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, []);

  const initializeScreen = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const startAnimations = () => {
    const pulseAnimation = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulseAnimation());
    };
    pulseAnimation();
  };

  const connectWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
      
      const ws = new WebSocket(`ws://localhost:8000/ws/${userId}?token=${token}`);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('Training WebSocket connected');
        
        // Subscribe to training topics
        ws.send(JSON.stringify({
          type: 'subscribe',
          topic: 'training'
        }));
        
        ws.send(JSON.stringify({
          type: 'subscribe',
          topic: 'pipeline'
        }));
        
        ws.send(JSON.stringify({
          type: 'subscribe',
          topic: 'groot_training'
        }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        console.log('Training WebSocket disconnected');
        
        // Attempt reconnection after 5 seconds
        setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
      
      ws.onerror = (error) => {
        console.error('Training WebSocket error:', error);
        setIsConnected(false);
      };
      
      setWebsocket(ws);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.message_type) {
      case 'training_progress':
        updateTrainingProgress(data.data);
        break;
      case 'pipeline_stage_completed':
        updatePipelineStage(data.data);
        break;
      case 'groot_training_progress':
        updateGrootProgress(data.data);
        break;
      case 'training_completed':
        handleTrainingCompleted(data.data);
        break;
      case 'training_failed':
        handleTrainingFailed(data.data);
        break;
      default:
        console.log('Unknown message type:', data.message_type);
    }
    
    setRealTimeData(prev => ({
      ...prev,
      [data.message_type]: data.data,
      lastUpdate: new Date().toISOString()
    }));
  };

  const updateTrainingProgress = (data: any) => {
    setTrainingSessions(prev => 
      prev.map(session => 
        session.id === data.training_id 
          ? { ...session, progress: data.progress, status: 'running' }
          : session
      )
    );
  };

  const updatePipelineStage = (data: any) => {
    setCurrentPipeline(prev => 
      prev.map(stage => 
        stage.id === data.stage 
          ? { ...stage, status: 'completed', progress: 100 }
          : stage
      )
    );
  };

  const updateGrootProgress = (data: any) => {
    // Update GR00T specific progress
    console.log('GR00T training progress:', data);
  };

  const handleTrainingCompleted = (data: any) => {
    setTrainingSessions(prev => 
      prev.map(session => 
        session.id === data.training_id 
          ? { ...session, status: 'completed', progress: 100, endTime: new Date() }
          : session
      )
    );
    
    Alert.alert(
      'Training Completed!',
      `Training session ${data.training_id} has completed successfully.`,
      [{ text: 'OK' }]
    );
  };

  const handleTrainingFailed = (data: any) => {
    setTrainingSessions(prev => 
      prev.map(session => 
        session.id === data.training_id 
          ? { ...session, status: 'failed' }
          : session
      )
    );
    
    Alert.alert(
      'Training Failed',
      `Training session ${data.training_id} has failed. Please check the logs.`,
      [{ text: 'OK' }]
    );
  };

  const loadTrainingSessions = async () => {
    // Load mock training sessions - replace with API call
    const mockSessions: TrainingSession[] = [
      {
        id: 'training_001',
        name: 'GR00T Manipulation v3.1',
        status: 'running',
        progress: 67,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        model: 'GR00T N1',
        robot: 'Unitree G1',
        metrics: {
          accuracy: 0.89,
          loss: 0.23,
          epochs: 45,
          learningRate: 0.001
        }
      },
      {
        id: 'training_002',
        name: 'Custom Humanoid Navigation',
        status: 'completed',
        progress: 100,
        startTime: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        model: 'Custom NN',
        robot: 'Custom Humanoid',
        metrics: {
          accuracy: 0.94,
          loss: 0.12,
          epochs: 100,
          learningRate: 0.0005
        }
      }
    ];
    
    setTrainingSessions(mockSessions);
    
    // Load mock pipeline stages
    const mockPipeline: PipelineStage[] = [
      {
        id: 'data_preparation',
        name: 'Data Preparation',
        status: 'completed',
        progress: 100,
        duration: 320,
        logs: ['Data validation completed', 'Preprocessing successful', 'Dataset split: 80/20']
      },
      {
        id: 'model_training',
        name: 'Model Training',
        status: 'running',
        progress: 67,
        logs: ['Training started', 'Epoch 45/100 completed', 'Current accuracy: 89%']
      },
      {
        id: 'model_validation',
        name: 'Model Validation',
        status: 'pending',
        progress: 0,
        logs: []
      },
      {
        id: 'simulation_deployment',
        name: 'Simulation Deployment',
        status: 'pending',
        progress: 0,
        logs: []
      }
    ];
    
    setCurrentPipeline(mockPipeline);
    
    // Load mock performance metrics
    const mockMetrics: PerformanceMetrics = {
      accuracy: [0.45, 0.62, 0.71, 0.78, 0.83, 0.87, 0.89],
      loss: [0.89, 0.54, 0.41, 0.32, 0.28, 0.25, 0.23],
      validationAccuracy: [0.43, 0.58, 0.68, 0.75, 0.81, 0.85, 0.87],
      learningRate: [0.001, 0.001, 0.0008, 0.0008, 0.0006, 0.0006, 0.0005],
      epochs: [1, 10, 20, 30, 40, 45, 50]
    };
    
    setPerformanceMetrics(mockMetrics);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrainingSessions();
    setRefreshing(false);
  };

  const startNewTraining = () => {
    Alert.alert(
      'Start New Training',
      'Choose training type:',
      [
        { text: 'GR00T N1 Training', onPress: () => startGrootTraining() },
        { text: 'Custom Model', onPress: () => startCustomTraining() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const startGrootTraining = () => {
    // Implementation for starting GR00T training
    console.log('Starting GR00T training...');
  };

  const startCustomTraining = () => {
    // Implementation for starting custom training
    console.log('Starting custom training...');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#00C896';
      case 'running': return '#00E5FF';
      case 'failed': return '#FF4444';
      default: return '#666666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'running': return 'play-circle';
      case 'failed': return 'close-circle';
      default: return 'time';
    }
  };

  const renderTabButton = (tab: string, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab as any)}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={activeTab === tab ? '#0A0A0A' : '#FFFFFF'} 
      />
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderConnectionStatus = () => (
    <View style={styles.connectionStatus}>
      <Animated.View style={[styles.connectionDot, { transform: [{ scale: pulseAnim }] }]}>
        <View style={[styles.connectionIndicator, { backgroundColor: isConnected ? '#00C896' : '#FF4444' }]} />
      </Animated.View>
      <Text style={styles.connectionText}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Training Center</Text>
            <Text style={styles.subtitle}>Monitor and manage training sessions</Text>
          </View>
          {renderConnectionStatus()}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {renderTabButton('overview', 'Overview', 'grid-outline')}
          {renderTabButton('pipeline', 'Pipeline', 'git-network-outline')}
          {renderTabButton('analytics', 'Analytics', 'analytics-outline')}
          {renderTabButton('debug', 'Debug', 'bug-outline')}
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'pipeline' && renderPipelineTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
          {activeTab === 'debug' && renderDebugTab()}
        </ScrollView>
        
        {/* Floating Action Button */}
        <TouchableOpacity style={styles.fab} onPress={startNewTraining}>
          <Ionicons name="add" size={24} color="#0A0A0A" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );

  function renderOverviewTab() {
    return (
      <View style={styles.tabContent}>
        {/* Active Training Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Training Sessions</Text>
          {trainingSessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionName}>{session.name}</Text>
                <View style={styles.sessionStatus}>
                  <Ionicons 
                    name={getStatusIcon(session.status) as any}
                    size={20}
                    color={getStatusColor(session.status)}
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(session.status) }]}>
                    {session.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <View style={styles.sessionDetails}>
                <Text style={styles.sessionDetailText}>Model: {session.model}</Text>
                <Text style={styles.sessionDetailText}>Robot: {session.robot}</Text>
                <Text style={styles.sessionDetailText}>
                  Started: {session.startTime.toLocaleTimeString()}
                </Text>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text style={styles.progressPercentage}>{session.progress}%</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${session.progress}%`,
                        backgroundColor: getStatusColor(session.status)
                      }
                    ]} 
                  />
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Accuracy</Text>
                  <Text style={styles.metricValue}>{(session.metrics.accuracy * 100).toFixed(1)}%</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Loss</Text>
                  <Text style={styles.metricValue}>{session.metrics.loss.toFixed(3)}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Epochs</Text>
                  <Text style={styles.metricValue}>{session.metrics.epochs}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Learning Rate</Text>
                  <Text style={styles.metricValue}>{session.metrics.learningRate}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => startGrootTraining()}>
              <Ionicons name="brain-outline" size={32} color="#00E5FF" />
              <Text style={styles.actionTitle}>GR00T Training</Text>
              <Text style={styles.actionSubtitle}>Start advanced neural training</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => startCustomTraining()}>
              <Ionicons name="construct-outline" size={32} color="#00E5FF" />
              <Text style={styles.actionTitle}>Custom Model</Text>
              <Text style={styles.actionSubtitle}>Train custom neural network</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="download-outline" size={32} color="#00E5FF" />
              <Text style={styles.actionTitle}>Export Data</Text>
              <Text style={styles.actionSubtitle}>Download training datasets</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="analytics-outline" size={32} color="#00E5FF" />
              <Text style={styles.actionTitle}>View Reports</Text>
              <Text style={styles.actionSubtitle}>Analyze training results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  function renderPipelineTab() {
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training Pipeline Status</Text>
          
          {currentPipeline.map((stage, index) => (
            <View key={stage.id} style={styles.pipelineStage}>
              <View style={styles.stageHeader}>
                <View style={styles.stageIndicator}>
                  <View style={[
                    styles.stageNumber,
                    { backgroundColor: getStatusColor(stage.status) }
                  ]}>
                    <Text style={styles.stageNumberText}>{index + 1}</Text>
                  </View>
                  {index < currentPipeline.length - 1 && (
                    <View style={[
                      styles.stageLine,
                      { backgroundColor: stage.status === 'completed' ? '#00C896' : '#333333' }
                    ]} />
                  )}
                </View>
                
                <View style={styles.stageContent}>
                  <View style={styles.stageInfo}>
                    <Text style={styles.stageName}>{stage.name}</Text>
                    <Text style={[styles.stageStatus, { color: getStatusColor(stage.status) }]}>
                      {stage.status.toUpperCase()}
                    </Text>
                  </View>
                  
                  {stage.status === 'running' && (
                    <View style={styles.stageProgressContainer}>
                      <View style={styles.stageProgressBar}>
                        <View 
                          style={[
                            styles.stageProgressFill,
                            { width: `${stage.progress}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.stageProgressText}>{stage.progress}%</Text>
                    </View>
                  )}
                  
                  {stage.duration && (
                    <Text style={styles.stageDuration}>
                      Duration: {Math.floor(stage.duration / 60)}m {stage.duration % 60}s
                    </Text>
                  )}
                </View>
              </View>
              
              {stage.logs.length > 0 && (
                <View style={styles.stageLogs}>
                  <Text style={styles.stageLogsTitle}>Recent Logs:</Text>
                  {stage.logs.slice(-3).map((log, logIndex) => (
                    <Text key={logIndex} style={styles.stageLogText}>• {log}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderAnalyticsTab() {
    if (!performanceMetrics) {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.emptyStateText}>Loading analytics...</Text>
        </View>
      );
    }

    const chartConfig = {
      backgroundColor: '#1A1A1A',
      backgroundGradientFrom: '#1A1A1A',
      backgroundGradientTo: '#1A1A1A',
      decimalPlaces: 2,
      color: (opacity = 1) => `rgba(0, 229, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      style: { borderRadius: 16 },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#00E5FF'
      }
    };

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training Accuracy</Text>
          <LineChart
            data={{
              labels: performanceMetrics.epochs.map(e => e.toString()),
              datasets: [
                {
                  data: performanceMetrics.accuracy,
                  color: (opacity = 1) => `rgba(0, 229, 255, ${opacity})`,
                  strokeWidth: 3
                },
                {
                  data: performanceMetrics.validationAccuracy,
                  color: (opacity = 1) => `rgba(0, 200, 150, ${opacity})`,
                  strokeWidth: 3
                }
              ],
              legend: ['Training Accuracy', 'Validation Accuracy']
            }}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training Loss</Text>
          <LineChart
            data={{
              labels: performanceMetrics.epochs.map(e => e.toString()),
              datasets: [{
                data: performanceMetrics.loss,
                color: (opacity = 1) => `rgba(255, 68, 68, ${opacity})`,
                strokeWidth: 3
              }]
            }}
            width={width - 40}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(255, 68, 68, ${opacity})`
            }}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Best Accuracy</Text>
              <Text style={styles.summaryValue}>
                {(Math.max(...performanceMetrics.accuracy) * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Lowest Loss</Text>
              <Text style={styles.summaryValue}>
                {Math.min(...performanceMetrics.loss).toFixed(3)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Epochs</Text>
              <Text style={styles.summaryValue}>
                {Math.max(...performanceMetrics.epochs)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Avg Learning Rate</Text>
              <Text style={styles.summaryValue}>
                {(performanceMetrics.learningRate.reduce((a, b) => a + b, 0) / performanceMetrics.learningRate.length).toFixed(4)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  function renderDebugTab() {
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Real-time Data</Text>
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>WebSocket Connection</Text>
            <Text style={styles.debugText}>Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
            <Text style={styles.debugText}>
              Last Update: {realTimeData.lastUpdate || 'Never'}
            </Text>
          </View>
          
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>Recent Messages</Text>
            {Object.entries(realTimeData).map(([key, value]) => (
              <Text key={key} style={styles.debugText}>
                {key}: {JSON.stringify(value, null, 2).substring(0, 100)}...
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>App Version</Text>
            <Text style={styles.debugText}>1.0.0</Text>
          </View>
          
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>Platform</Text>
            <Text style={styles.debugText}>React Native</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Actions</Text>
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={() => connectWebSocket()}
          >
            <Text style={styles.debugButtonText}>Reconnect WebSocket</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={() => loadTrainingSessions()}
          >
            <Text style={styles.debugButtonText}>Refresh Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.debugButton, styles.debugButtonDanger]} 
            onPress={() => {
              setTrainingSessions([]);
              setCurrentPipeline([]);
              setPerformanceMetrics(null);
            }}
          >
            <Text style={styles.debugButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  animatedContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    color: '#00E5FF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    marginRight: 8,
  },
  connectionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  connectionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#00E5FF',
  },
  tabButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  activeTabButtonText: {
    color: '#0A0A0A',
  },
  scrollContainer: {
    flex: 1,
    marginTop: 20,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 16,
  },
  
  // Session Cards
  sessionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionName: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  sessionDetails: {
    marginBottom: 16,
  },
  sessionDetailText: {
    color: '#B0B0B0',
    fontSize: 14,
    marginBottom: 4,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercentage: {
    color: '#00E5FF',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    color: '#B0B0B0',
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    width: (width - 52) / 2,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  actionSubtitle: {
    color: '#B0B0B0',
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Pipeline
  pipelineStage: {
    marginBottom: 20,
  },
  stageHeader: {
    flexDirection: 'row',
  },
  stageIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stageNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stageLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
  },
  stageContent: {
    flex: 1,
  },
  stageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  stageStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  stageProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageProgressBar: {
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
    flex: 1,
    marginRight: 12,
  },
  stageProgressFill: {
    height: 6,
    backgroundColor: '#00E5FF',
    borderRadius: 3,
  },
  stageProgressText: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '600',
  },
  stageDuration: {
    color: '#B0B0B0',
    fontSize: 12,
  },
  stageLogs: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  stageLogsTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  stageLogText: {
    color: '#B0B0B0',
    fontSize: 11,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  
  // Charts
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  
  // Summary
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    width: (width - 52) / 2,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  summaryLabel: {
    color: '#B0B0B0',
    fontSize: 12,
    marginBottom: 8,
  },
  summaryValue: {
    color: '#00E5FF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // Debug
  debugCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  debugTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  debugText: {
    color: '#B0B0B0',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  debugButton: {
    backgroundColor: '#00E5FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  debugButtonDanger: {
    backgroundColor: '#FF4444',
  },
  debugButtonText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Empty State
  emptyStateText: {
    color: '#B0B0B0',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00E5FF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});