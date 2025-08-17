import mediapipe as mp
import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
import json
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

logger = logging.getLogger(__name__)

class HandTrackingService:
    """
    Advanced hand tracking service using MediaPipe for real-time hand pose detection
    and gesture recognition for robot training data collection.
    """
    
    def __init__(self):
        # Initialize MediaPipe hands
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Hand detection configuration
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
        # Gesture recognition models
        self.gesture_history = []
        self.gesture_buffer_size = 10
        
        # Thread pool for processing
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Gesture templates for recognition
        self.gesture_templates = {
            'open_hand': self._define_open_hand_template(),
            'closed_fist': self._define_closed_fist_template(),
            'point': self._define_pointing_template(),
            'pinch': self._define_pinch_template(),
            'thumbs_up': self._define_thumbs_up_template(),
            'peace': self._define_peace_template()
        }
    
    def _define_open_hand_template(self) -> Dict:
        """Define the template for open hand gesture"""
        return {
            'finger_states': [1, 1, 1, 1, 1],  # All fingers extended
            'angle_ranges': {
                'thumb_index': (30, 90),
                'index_middle': (0, 30),
                'middle_ring': (0, 30),
                'ring_pinky': (0, 30)
            }
        }
    
    def _define_closed_fist_template(self) -> Dict:
        """Define the template for closed fist gesture"""
        return {
            'finger_states': [0, 0, 0, 0, 0],  # All fingers closed
            'angle_ranges': {
                'thumb_index': (0, 45),
                'index_middle': (0, 20),
                'middle_ring': (0, 20),
                'ring_pinky': (0, 20)
            }
        }
    
    def _define_pointing_template(self) -> Dict:
        """Define the template for pointing gesture"""
        return {
            'finger_states': [0, 1, 0, 0, 0],  # Only index finger extended
            'angle_ranges': {
                'thumb_index': (45, 90),
                'index_middle': (45, 90),
                'middle_ring': (0, 30),
                'ring_pinky': (0, 30)
            }
        }
    
    def _define_pinch_template(self) -> Dict:
        """Define the template for pinch gesture"""
        return {
            'finger_states': [1, 1, 0, 0, 0],  # Thumb and index touching
            'angle_ranges': {
                'thumb_index': (0, 30),
                'index_middle': (30, 90),
                'middle_ring': (0, 30),
                'ring_pinky': (0, 30)
            }
        }
    
    def _define_thumbs_up_template(self) -> Dict:
        """Define the template for thumbs up gesture"""
        return {
            'finger_states': [1, 0, 0, 0, 0],  # Only thumb extended
            'angle_ranges': {
                'thumb_index': (60, 120),
                'index_middle': (0, 30),
                'middle_ring': (0, 30),
                'ring_pinky': (0, 30)
            }
        }
    
    def _define_peace_template(self) -> Dict:
        """Define the template for peace sign gesture"""
        return {
            'finger_states': [0, 1, 1, 0, 0],  # Index and middle fingers extended
            'angle_ranges': {
                'thumb_index': (30, 60),
                'index_middle': (30, 60),
                'middle_ring': (45, 90),
                'ring_pinky': (0, 30)
            }
        }
    
    async def process_frame(self, image_data: bytes) -> Dict:
        """
        Process a single frame for hand tracking
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dictionary containing hand tracking results
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, self._process_frame_sync, image_data
        )
    
    def _process_frame_sync(self, image_data: bytes) -> Dict:
        """Synchronous frame processing"""
        try:
            # Convert bytes to image
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {"error": "Invalid image data"}
            
            # Convert BGR to RGB
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Process with MediaPipe
            results = self.hands.process(rgb_image)
            
            # Extract hand data
            hand_data = []
            if results.multi_hand_landmarks:
                for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                    # Get hand information
                    handedness = results.multi_handedness[idx].classification[0]
                    
                    # Extract landmark coordinates
                    landmarks = []
                    for landmark in hand_landmarks.landmark:
                        landmarks.append({
                            'x': landmark.x,
                            'y': landmark.y,
                            'z': landmark.z,
                            'visibility': getattr(landmark, 'visibility', 1.0)
                        })
                    
                    # Calculate hand metrics
                    metrics = self._calculate_hand_metrics(landmarks)
                    
                    # Recognize gesture
                    gesture = self._recognize_gesture(landmarks)
                    
                    hand_data.append({
                        'hand_type': handedness.label,  # 'Left' or 'Right'
                        'confidence': handedness.score,
                        'landmarks': landmarks,
                        'gesture': gesture,
                        'metrics': metrics,
                        'timestamp': datetime.utcnow().isoformat()
                    })
            
            return {
                'hands_detected': len(hand_data),
                'hands': hand_data,
                'frame_processed': True,
                'processing_time_ms': 0,  # Could add timing
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing frame: {str(e)}")
            return {"error": str(e), "frame_processed": False}
    
    def _calculate_hand_metrics(self, landmarks: List[Dict]) -> Dict:
        """Calculate hand pose metrics"""
        try:
            # Calculate finger extensions
            finger_states = self._get_finger_states(landmarks)
            
            # Calculate distances between key points
            distances = self._calculate_distances(landmarks)
            
            # Calculate angles
            angles = self._calculate_angles(landmarks)
            
            return {
                'finger_states': finger_states,
                'distances': distances,
                'angles': angles,
                'hand_openness': sum(finger_states) / 5.0,
                'hand_size': self._calculate_hand_size(landmarks)
            }
            
        except Exception as e:
            logger.error(f"Error calculating hand metrics: {str(e)}")
            return {}
    
    def _get_finger_states(self, landmarks: List[Dict]) -> List[int]:
        """Determine if each finger is extended (1) or closed (0)"""
        # MediaPipe hand landmark indices
        tip_ids = [4, 8, 12, 16, 20]  # Thumb, Index, Middle, Ring, Pinky tips
        pip_ids = [3, 6, 10, 14, 18]  # PIP joints
        
        finger_states = []
        
        for i in range(5):
            if i == 0:  # Thumb (special case)
                # Thumb is extended if tip is further from wrist than MCP
                if landmarks[tip_ids[i]]['x'] > landmarks[2]['x']:  # Right hand
                    finger_states.append(1)
                else:
                    finger_states.append(0)
            else:  # Other fingers
                # Finger is extended if tip is higher than PIP
                if landmarks[tip_ids[i]]['y'] < landmarks[pip_ids[i]]['y']:
                    finger_states.append(1)
                else:
                    finger_states.append(0)
        
        return finger_states
    
    def _calculate_distances(self, landmarks: List[Dict]) -> Dict:
        """Calculate distances between key landmarks"""
        distances = {}
        
        # Distance between thumb tip and index tip
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        distances['thumb_index'] = np.sqrt(
            (thumb_tip['x'] - index_tip['x'])**2 + 
            (thumb_tip['y'] - index_tip['y'])**2
        )
        
        # Distance between index and middle fingertips
        middle_tip = landmarks[12]
        distances['index_middle'] = np.sqrt(
            (index_tip['x'] - middle_tip['x'])**2 + 
            (index_tip['y'] - middle_tip['y'])**2
        )
        
        # Palm width (approximate)
        wrist = landmarks[0]
        middle_mcp = landmarks[9]
        distances['palm_width'] = np.sqrt(
            (wrist['x'] - middle_mcp['x'])**2 + 
            (wrist['y'] - middle_mcp['y'])**2
        )
        
        return distances
    
    def _calculate_angles(self, landmarks: List[Dict]) -> Dict:
        """Calculate angles between finger segments"""
        angles = {}
        
        # Calculate angle between thumb and index finger
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        wrist = landmarks[0]
        
        # Vectors from wrist to fingertips
        v1 = np.array([thumb_tip['x'] - wrist['x'], thumb_tip['y'] - wrist['y']])
        v2 = np.array([index_tip['x'] - wrist['x'], index_tip['y'] - wrist['y']])
        
        # Calculate angle
        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
        angles['thumb_index'] = np.arccos(np.clip(cos_angle, -1.0, 1.0)) * 180 / np.pi
        
        return angles
    
    def _calculate_hand_size(self, landmarks: List[Dict]) -> float:
        """Calculate approximate hand size"""
        wrist = landmarks[0]
        middle_tip = landmarks[12]
        
        return np.sqrt(
            (wrist['x'] - middle_tip['x'])**2 + 
            (wrist['y'] - middle_tip['y'])**2
        )
    
    def _recognize_gesture(self, landmarks: List[Dict]) -> Dict:
        """Recognize gesture from hand landmarks"""
        try:
            metrics = self._calculate_hand_metrics(landmarks)
            finger_states = metrics.get('finger_states', [])
            
            if not finger_states:
                return {'name': 'unknown', 'confidence': 0.0}
            
            # Compare with gesture templates
            best_match = {'name': 'unknown', 'confidence': 0.0}
            
            for gesture_name, template in self.gesture_templates.items():
                confidence = self._calculate_gesture_confidence(
                    finger_states, metrics, template
                )
                
                if confidence > best_match['confidence']:
                    best_match = {'name': gesture_name, 'confidence': confidence}
            
            # Apply temporal smoothing
            self.gesture_history.append(best_match)
            if len(self.gesture_history) > self.gesture_buffer_size:
                self.gesture_history.pop(0)
            
            # Get most frequent gesture from recent history
            stable_gesture = self._get_stable_gesture()
            
            return stable_gesture
            
        except Exception as e:
            logger.error(f"Error recognizing gesture: {str(e)}")
            return {'name': 'unknown', 'confidence': 0.0}
    
    def _calculate_gesture_confidence(self, finger_states: List[int], 
                                    metrics: Dict, template: Dict) -> float:
        """Calculate confidence score for gesture template match"""
        template_fingers = template['finger_states']
        
        # Calculate finger state similarity
        finger_score = sum(1 for i, j in zip(finger_states, template_fingers) if i == j) / 5.0
        
        # Could add angle and distance matching here for higher accuracy
        
        return finger_score
    
    def _get_stable_gesture(self) -> Dict:
        """Get the most stable gesture from recent history"""
        if not self.gesture_history:
            return {'name': 'unknown', 'confidence': 0.0}
        
        # Count gesture occurrences
        gesture_counts = {}
        for gesture in self.gesture_history:
            name = gesture['name']
            if name not in gesture_counts:
                gesture_counts[name] = []
            gesture_counts[name].append(gesture['confidence'])
        
        # Find most frequent gesture with highest average confidence
        best_gesture = {'name': 'unknown', 'confidence': 0.0}
        for name, confidences in gesture_counts.items():
            avg_confidence = sum(confidences) / len(confidences)
            frequency = len(confidences) / len(self.gesture_history)
            
            # Combined score considering both frequency and confidence
            score = avg_confidence * frequency
            
            if score > best_gesture['confidence']:
                best_gesture = {'name': name, 'confidence': score}
        
        return best_gesture
    
    async def process_video_stream(self, video_path: str) -> List[Dict]:
        """Process a video file for hand tracking"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, self._process_video_sync, video_path
        )
    
    def _process_video_sync(self, video_path: str) -> List[Dict]:
        """Synchronous video processing"""
        results = []
        cap = cv2.VideoCapture(video_path)
        
        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Convert frame to bytes
            _, buffer = cv2.imencode('.jpg', frame)
            frame_data = buffer.tobytes()
            
            # Process frame
            result = self._process_frame_sync(frame_data)
            result['frame_number'] = frame_count
            results.append(result)
            
            frame_count += 1
        
        cap.release()
        return results
    
    def export_leerobot_format(self, tracking_data: List[Dict]) -> Dict:
        """Export hand tracking data in LeRobot-compatible format"""
        leerobot_data = {
            'metadata': {
                'version': '1.0',
                'created_at': datetime.utcnow().isoformat(),
                'data_type': 'hand_tracking',
                'total_frames': len(tracking_data)
            },
            'observations': [],
            'actions': []
        }
        
        for frame_data in tracking_data:
            if frame_data.get('frame_processed'):
                # Create observation
                observation = {
                    'timestamp': frame_data['timestamp'],
                    'hands_detected': frame_data['hands_detected'],
                    'hand_poses': []
                }
                
                # Create actions from gestures
                actions = []
                
                for hand in frame_data.get('hands', []):
                    hand_pose = {
                        'hand_type': hand['hand_type'],
                        'landmarks': hand['landmarks'],
                        'confidence': hand['confidence']
                    }
                    observation['hand_poses'].append(hand_pose)
                    
                    # Convert gesture to robot action
                    gesture = hand.get('gesture', {})
                    if gesture.get('name') != 'unknown' and gesture.get('confidence', 0) > 0.5:
                        action = self._gesture_to_robot_action(gesture, hand)
                        if action:
                            actions.append(action)
                
                leerobot_data['observations'].append(observation)
                leerobot_data['actions'].extend(actions)
        
        return leerobot_data
    
    def _gesture_to_robot_action(self, gesture: Dict, hand_data: Dict) -> Optional[Dict]:
        """Convert hand gesture to robot action"""
        gesture_name = gesture['name']
        confidence = gesture['confidence']
        
        action_mapping = {
            'open_hand': {'type': 'release', 'force': 0.0},
            'closed_fist': {'type': 'grasp', 'force': 1.0},
            'point': {'type': 'point', 'direction': 'forward'},
            'pinch': {'type': 'precision_grasp', 'force': 0.3},
            'thumbs_up': {'type': 'positive_feedback', 'value': 1},
            'peace': {'type': 'two_finger_grasp', 'force': 0.5}
        }
        
        if gesture_name in action_mapping:
            base_action = action_mapping[gesture_name]
            
            return {
                'timestamp': hand_data['timestamp'],
                'hand_type': hand_data['hand_type'],
                'action_type': base_action['type'],
                'parameters': base_action,
                'confidence': confidence,
                'source': 'hand_tracking'
            }
        
        return None
    
    def cleanup(self):
        """Cleanup resources"""
        if hasattr(self, 'hands'):
            self.hands.close()
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=True)