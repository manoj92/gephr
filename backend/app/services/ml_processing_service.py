import numpy as np
import cv2
import pickle
import json
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
import logging
from concurrent.futures import ThreadPoolExecutor
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import joblib
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class MLProcessingService:
    """
    Machine Learning processing service for the Humanoid Training Platform.
    Handles gesture recognition, anomaly detection, pattern analysis, and model training.
    """
    
    def __init__(self):
        self.models_dir = Path("models")
        self.models_dir.mkdir(exist_ok=True)
        
        # Initialize models
        self.gesture_classifier = None
        self.anomaly_detector = None
        self.pattern_analyzer = None
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=50)
        
        # Gesture labels
        self.gesture_labels = [
            'open_hand', 'closed_fist', 'point', 'pinch', 
            'thumbs_up', 'peace', 'grab', 'release', 'wave'
        ]
        
        # Thread pool for CPU-intensive tasks
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Model performance metrics
        self.model_metrics = {}
        
        # Load pre-trained models if available
        asyncio.create_task(self.load_models())
    
    async def load_models(self):
        """Load pre-trained models from disk"""
        try:
            # Load gesture classifier
            gesture_model_path = self.models_dir / "gesture_classifier.joblib"
            if gesture_model_path.exists():
                self.gesture_classifier = joblib.load(gesture_model_path)
                logger.info("Loaded gesture classifier model")
            
            # Load anomaly detector
            anomaly_model_path = self.models_dir / "anomaly_detector.joblib"
            if anomaly_model_path.exists():
                self.anomaly_detector = joblib.load(anomaly_model_path)
                logger.info("Loaded anomaly detector model")
            
            # Load scaler and PCA
            scaler_path = self.models_dir / "scaler.joblib"
            if scaler_path.exists():
                self.scaler = joblib.load(scaler_path)
                
            pca_path = self.models_dir / "pca.joblib"
            if pca_path.exists():
                self.pca = joblib.load(pca_path)
            
            # Load model metrics
            metrics_path = self.models_dir / "model_metrics.json"
            if metrics_path.exists():
                with open(metrics_path, 'r') as f:
                    self.model_metrics = json.load(f)
                    
        except Exception as e:
            logger.error(f"Error loading models: {e}")
    
    async def save_models(self):
        """Save trained models to disk"""
        try:
            if self.gesture_classifier:
                joblib.dump(
                    self.gesture_classifier,
                    self.models_dir / "gesture_classifier.joblib"
                )
            
            if self.anomaly_detector:
                joblib.dump(
                    self.anomaly_detector,
                    self.models_dir / "anomaly_detector.joblib"
                )
            
            joblib.dump(self.scaler, self.models_dir / "scaler.joblib")
            joblib.dump(self.pca, self.models_dir / "pca.joblib")
            
            # Save metrics
            with open(self.models_dir / "model_metrics.json", 'w') as f:
                json.dump(self.model_metrics, f, indent=2)
                
            logger.info("Models saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving models: {e}")
    
    def extract_hand_features(self, landmarks: List[Dict]) -> np.ndarray:
        """Extract feature vector from hand landmarks"""
        try:
            if len(landmarks) != 21:
                raise ValueError("Expected 21 hand landmarks")
            
            features = []
            
            # Convert landmarks to numpy array
            points = np.array([[lm['x'], lm['y'], lm['z']] for lm in landmarks])
            
            # Normalize relative to wrist (landmark 0)
            wrist = points[0]
            normalized_points = points - wrist
            
            # Flatten coordinates
            features.extend(normalized_points.flatten())
            
            # Calculate distances between key points
            tip_indices = [4, 8, 12, 16, 20]  # Fingertips
            for i, tip1 in enumerate(tip_indices):
                for tip2 in tip_indices[i+1:]:
                    dist = np.linalg.norm(points[tip1] - points[tip2])
                    features.append(dist)
            
            # Calculate angles between finger segments
            finger_connections = [
                (0, 1, 2), (0, 5, 9), (0, 9, 13), (0, 13, 17), (0, 17, 20),  # From wrist
                (1, 2, 3), (5, 6, 7), (9, 10, 11), (13, 14, 15), (17, 18, 19)  # Finger segments
            ]
            
            for p1, p2, p3 in finger_connections:
                v1 = points[p1] - points[p2]
                v2 = points[p3] - points[p2]
                
                # Calculate angle
                cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8)
                angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
                features.append(angle)
            
            # Calculate palm normal vector
            palm_points = [points[0], points[5], points[17]]  # Wrist, index base, pinky base
            v1 = palm_points[1] - palm_points[0]
            v2 = palm_points[2] - palm_points[0]
            normal = np.cross(v1, v2)
            normal = normal / (np.linalg.norm(normal) + 1e-8)
            features.extend(normal)
            
            # Hand span and size features
            span = np.linalg.norm(points[4] - points[20])  # Thumb to pinky
            features.append(span)
            
            # Finger extension ratios
            for tip_idx in tip_indices:
                mcp_idx = tip_idx - 3 if tip_idx != 4 else 1  # MCP joint
                extension_ratio = np.linalg.norm(points[tip_idx] - points[0]) / (
                    np.linalg.norm(points[mcp_idx] - points[0]) + 1e-8
                )
                features.append(extension_ratio)
            
            return np.array(features, dtype=np.float32)
            
        except Exception as e:
            logger.error(f"Error extracting hand features: {e}")
            return np.zeros(100, dtype=np.float32)  # Return zero vector on error
    
    async def classify_gesture(self, landmarks: List[Dict]) -> Dict[str, Any]:
        """Classify hand gesture from landmarks"""
        try:
            if not self.gesture_classifier:
                return {
                    'gesture': 'unknown',
                    'confidence': 0.0,
                    'error': 'No gesture classifier available'
                }
            
            # Extract features
            features = self.extract_hand_features(landmarks)
            
            # Preprocess features
            loop = asyncio.get_event_loop()
            features_scaled = await loop.run_in_executor(
                self.executor,
                self._preprocess_features,
                features.reshape(1, -1)
            )
            
            # Predict gesture
            prediction = await loop.run_in_executor(
                self.executor,
                self.gesture_classifier.predict,
                features_scaled
            )
            
            # Get prediction probabilities
            probabilities = await loop.run_in_executor(
                self.executor,
                self.gesture_classifier.predict_proba,
                features_scaled
            )
            
            gesture_idx = prediction[0]
            confidence = np.max(probabilities[0])
            gesture_name = self.gesture_labels[gesture_idx] if gesture_idx < len(self.gesture_labels) else 'unknown'
            
            # Get all class probabilities
            class_probabilities = {}
            for i, label in enumerate(self.gesture_labels):
                if i < len(probabilities[0]):
                    class_probabilities[label] = float(probabilities[0][i])
            
            return {
                'gesture': gesture_name,
                'confidence': float(confidence),
                'probabilities': class_probabilities,
                'features_extracted': len(features),
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error classifying gesture: {e}")
            return {
                'gesture': 'unknown',
                'confidence': 0.0,
                'error': str(e)
            }
    
    def _preprocess_features(self, features: np.ndarray) -> np.ndarray:
        """Preprocess features for model input"""
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Apply PCA if fitted
        if hasattr(self.pca, 'components_'):
            features_scaled = self.pca.transform(features_scaled)
        
        return features_scaled
    
    async def detect_anomalies(self, training_data: List[Dict]) -> Dict[str, Any]:
        """Detect anomalies in training data"""
        try:
            if not training_data:
                return {'anomalies': [], 'total_samples': 0}
            
            # Extract features from all samples
            features_list = []
            sample_metadata = []
            
            for i, sample in enumerate(training_data):
                if 'landmarks' in sample:
                    features = self.extract_hand_features(sample['landmarks'])
                    features_list.append(features)
                    sample_metadata.append({
                        'index': i,
                        'timestamp': sample.get('timestamp'),
                        'confidence': sample.get('confidence', 1.0)
                    })
            
            if not features_list:
                return {'anomalies': [], 'total_samples': 0}
            
            features_array = np.array(features_list)
            
            # Train anomaly detector if not available
            if not self.anomaly_detector:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    self.executor,
                    self._train_anomaly_detector,
                    features_array
                )
            
            # Detect anomalies
            loop = asyncio.get_event_loop()
            anomaly_scores = await loop.run_in_executor(
                self.executor,
                self.anomaly_detector.decision_function,
                features_array
            )
            
            # Identify anomalies (negative scores indicate anomalies)
            anomaly_threshold = np.percentile(anomaly_scores, 5)  # Bottom 5% as anomalies
            anomaly_indices = np.where(anomaly_scores < anomaly_threshold)[0]
            
            anomalies = []
            for idx in anomaly_indices:
                anomalies.append({
                    'sample_index': sample_metadata[idx]['index'],
                    'anomaly_score': float(anomaly_scores[idx]),
                    'timestamp': sample_metadata[idx]['timestamp'],
                    'reason': 'Statistical outlier in hand pose features',
                    'severity': 'high' if anomaly_scores[idx] < anomaly_threshold * 0.5 else 'medium'
                })
            
            return {
                'anomalies': anomalies,
                'total_samples': len(training_data),
                'anomaly_rate': len(anomalies) / len(training_data),
                'threshold_used': float(anomaly_threshold),
                'analysis_timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error detecting anomalies: {e}")
            return {'anomalies': [], 'total_samples': 0, 'error': str(e)}
    
    def _train_anomaly_detector(self, features: np.ndarray):
        """Train the anomaly detection model"""
        self.anomaly_detector = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        self.anomaly_detector.fit(features)
    
    async def analyze_training_patterns(self, training_sessions: List[Dict]) -> Dict[str, Any]:
        """Analyze patterns in training data"""
        try:
            if not training_sessions:
                return {'patterns': [], 'insights': []}
            
            insights = []
            patterns = []
            
            # Extract session metrics
            session_durations = []
            accuracy_scores = []
            data_points_collected = []
            gesture_distributions = {}
            
            for session in training_sessions:
                duration = session.get('duration_minutes', 0)
                accuracy = session.get('accuracy_score', 0)
                data_points = session.get('data_points_collected', 0)
                
                session_durations.append(duration)
                accuracy_scores.append(accuracy)
                data_points_collected.append(data_points)
                
                # Count gesture types
                gestures = session.get('gestures_captured', [])
                for gesture in gestures:
                    gesture_name = gesture.get('gesture', 'unknown')
                    gesture_distributions[gesture_name] = gesture_distributions.get(gesture_name, 0) + 1
            
            # Calculate statistics
            avg_duration = np.mean(session_durations) if session_durations else 0
            avg_accuracy = np.mean(accuracy_scores) if accuracy_scores else 0
            avg_data_points = np.mean(data_points_collected) if data_points_collected else 0
            
            # Performance trends
            if len(accuracy_scores) > 1:
                accuracy_trend = self._calculate_trend(accuracy_scores)
                if accuracy_trend > 0.05:
                    insights.append({
                        'type': 'improvement',
                        'message': f"Accuracy improving over time (+{accuracy_trend:.1%} trend)",
                        'score': accuracy_trend
                    })
                elif accuracy_trend < -0.05:
                    insights.append({
                        'type': 'decline',
                        'message': f"Accuracy declining over time ({accuracy_trend:.1%} trend)",
                        'score': accuracy_trend
                    })
            
            # Identify most/least practiced gestures
            if gesture_distributions:
                most_practiced = max(gesture_distributions, key=gesture_distributions.get)
                least_practiced = min(gesture_distributions, key=gesture_distributions.get)
                
                patterns.append({
                    'type': 'gesture_preference',
                    'most_practiced': most_practiced,
                    'least_practiced': least_practiced,
                    'distribution': gesture_distributions
                })
                
                # Suggest areas for improvement
                total_gestures = sum(gesture_distributions.values())
                for gesture, count in gesture_distributions.items():
                    frequency = count / total_gestures
                    if frequency < 0.05:  # Less than 5% of total
                        insights.append({
                            'type': 'recommendation',
                            'message': f"Consider practicing {gesture} more (only {frequency:.1%} of sessions)",
                            'gesture': gesture,
                            'frequency': frequency
                        })
            
            # Session consistency analysis
            duration_std = np.std(session_durations) if len(session_durations) > 1 else 0
            if duration_std / avg_duration > 0.5:  # High variability
                insights.append({
                    'type': 'consistency',
                    'message': "Training session duration varies significantly. Consider consistent session lengths.",
                    'variability': duration_std / avg_duration
                })
            
            # Clustering analysis for session types
            if len(training_sessions) >= 5:
                cluster_results = await self._cluster_training_sessions(training_sessions)
                patterns.extend(cluster_results.get('clusters', []))
            
            return {
                'patterns': patterns,
                'insights': insights,
                'statistics': {
                    'avg_duration_minutes': avg_duration,
                    'avg_accuracy': avg_accuracy,
                    'avg_data_points': avg_data_points,
                    'total_sessions': len(training_sessions),
                    'gesture_distribution': gesture_distributions
                },
                'analysis_timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing training patterns: {e}")
            return {'patterns': [], 'insights': [], 'error': str(e)}
    
    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate linear trend in values"""
        if len(values) < 2:
            return 0.0
        
        x = np.arange(len(values))
        y = np.array(values)
        
        # Simple linear regression
        slope = np.corrcoef(x, y)[0, 1] * (np.std(y) / np.std(x))
        return slope
    
    async def _cluster_training_sessions(self, sessions: List[Dict]) -> Dict[str, Any]:
        """Cluster training sessions to identify patterns"""
        try:
            # Extract features for clustering
            features = []
            for session in sessions:
                feature_vector = [
                    session.get('duration_minutes', 0),
                    session.get('accuracy_score', 0),
                    session.get('data_points_collected', 0),
                    len(session.get('gestures_captured', [])),
                    session.get('completion_rate', 0)
                ]
                features.append(feature_vector)
            
            features_array = np.array(features)
            
            # Normalize features
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features_array)
            
            # Perform clustering
            loop = asyncio.get_event_loop()
            n_clusters = min(3, len(sessions) // 2)  # Reasonable number of clusters
            
            if n_clusters >= 2:
                kmeans = await loop.run_in_executor(
                    self.executor,
                    self._fit_kmeans,
                    features_scaled,
                    n_clusters
                )
                
                cluster_labels = kmeans.labels_
                
                # Analyze clusters
                clusters = []
                for cluster_id in range(n_clusters):
                    cluster_sessions = [
                        sessions[i] for i, label in enumerate(cluster_labels) 
                        if label == cluster_id
                    ]
                    
                    if cluster_sessions:
                        cluster_features = features_array[cluster_labels == cluster_id]
                        cluster_stats = {
                            'avg_duration': float(np.mean(cluster_features[:, 0])),
                            'avg_accuracy': float(np.mean(cluster_features[:, 1])),
                            'avg_data_points': float(np.mean(cluster_features[:, 2])),
                            'session_count': len(cluster_sessions)
                        }
                        
                        # Characterize cluster
                        if cluster_stats['avg_accuracy'] > 0.8:
                            cluster_type = 'high_performance'
                        elif cluster_stats['avg_duration'] > 20:
                            cluster_type = 'extended_sessions'
                        else:
                            cluster_type = 'standard_sessions'
                        
                        clusters.append({
                            'cluster_id': cluster_id,
                            'type': cluster_type,
                            'characteristics': cluster_stats,
                            'session_indices': [
                                i for i, label in enumerate(cluster_labels) 
                                if label == cluster_id
                            ]
                        })
                
                return {'clusters': clusters}
            
            return {'clusters': []}
            
        except Exception as e:
            logger.error(f"Error clustering training sessions: {e}")
            return {'clusters': []}
    
    def _fit_kmeans(self, features: np.ndarray, n_clusters: int) -> KMeans:
        """Fit KMeans clustering model"""
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        kmeans.fit(features)
        return kmeans
    
    async def train_gesture_classifier(self, training_data: List[Dict]) -> Dict[str, Any]:
        """Train or update the gesture classification model"""
        try:
            if len(training_data) < 10:
                return {
                    'success': False,
                    'error': 'Need at least 10 training samples'
                }
            
            # Extract features and labels
            features_list = []
            labels_list = []
            
            for sample in training_data:
                if 'landmarks' in sample and 'gesture' in sample:
                    features = self.extract_hand_features(sample['landmarks'])
                    gesture = sample['gesture']
                    
                    if gesture in self.gesture_labels:
                        features_list.append(features)
                        labels_list.append(self.gesture_labels.index(gesture))
            
            if len(features_list) < 10:
                return {
                    'success': False,
                    'error': 'Not enough valid training samples'
                }
            
            features_array = np.array(features_list)
            labels_array = np.array(labels_list)
            
            # Split data for training and validation
            split_idx = int(0.8 * len(features_array))
            X_train, X_val = features_array[:split_idx], features_array[split_idx:]
            y_train, y_val = labels_array[:split_idx], labels_array[split_idx:]
            
            # Train preprocessing components
            loop = asyncio.get_event_loop()
            training_result = await loop.run_in_executor(
                self.executor,
                self._train_classifier_sync,
                X_train, y_train, X_val, y_val
            )
            
            # Save models
            await self.save_models()
            
            return training_result
            
        except Exception as e:
            logger.error(f"Error training gesture classifier: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _train_classifier_sync(self, X_train, y_train, X_val, y_val) -> Dict[str, Any]:
        """Synchronous classifier training"""
        # Fit scaler and PCA
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_train_pca = self.pca.fit_transform(X_train_scaled)
        
        # Transform validation data
        X_val_scaled = self.scaler.transform(X_val)
        X_val_pca = self.pca.transform(X_val_scaled)
        
        # Train classifier
        self.gesture_classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=20,
            random_state=42,
            n_jobs=-1
        )
        
        self.gesture_classifier.fit(X_train_pca, y_train)
        
        # Evaluate model
        train_pred = self.gesture_classifier.predict(X_train_pca)
        val_pred = self.gesture_classifier.predict(X_val_pca)
        
        train_accuracy = accuracy_score(y_train, train_pred)
        val_accuracy = accuracy_score(y_val, val_pred)
        
        # Calculate per-class metrics
        precision, recall, f1, support = precision_recall_fscore_support(
            y_val, val_pred, average='weighted'
        )
        
        # Update model metrics
        self.model_metrics = {
            'gesture_classifier': {
                'train_accuracy': float(train_accuracy),
                'val_accuracy': float(val_accuracy),
                'precision': float(precision),
                'recall': float(recall),
                'f1_score': float(f1),
                'training_samples': len(X_train),
                'validation_samples': len(X_val),
                'last_trained': datetime.utcnow().isoformat()
            }
        }
        
        return {
            'success': True,
            'metrics': self.model_metrics['gesture_classifier'],
            'features_used': X_train.shape[1],
            'pca_components': self.pca.n_components_
        }
    
    async def get_model_status(self) -> Dict[str, Any]:
        """Get status of all ML models"""
        status = {
            'gesture_classifier': {
                'available': self.gesture_classifier is not None,
                'metrics': self.model_metrics.get('gesture_classifier', {}),
                'supported_gestures': self.gesture_labels
            },
            'anomaly_detector': {
                'available': self.anomaly_detector is not None,
                'last_updated': self.model_metrics.get('anomaly_detector', {}).get('last_trained')
            },
            'preprocessing': {
                'scaler_fitted': hasattr(self.scaler, 'scale_'),
                'pca_fitted': hasattr(self.pca, 'components_')
            },
            'system': {
                'models_directory': str(self.models_dir),
                'executor_threads': self.executor._max_workers
            }
        }
        
        return status
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            self.executor.shutdown(wait=True)
            await self.save_models()
        except Exception as e:
            logger.error(f"Error during ML service cleanup: {e}")

# Global ML processing service instance
ml_service = MLProcessingService()