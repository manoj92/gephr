import asyncio
import json
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set
from enum import Enum
import logging
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

class FederatedRole(Enum):
    COORDINATOR = "coordinator"
    PARTICIPANT = "participant"
    VALIDATOR = "validator"

class AggregationMethod(Enum):
    FEDAVG = "federated_averaging"
    FEDPROX = "federated_proximal"
    SCAFFOLD = "scaffold"
    FEDNOVA = "fed_nova"

class PrivacyLevel(Enum):
    BASIC = "basic"
    DIFFERENTIAL = "differential_privacy"
    HOMOMORPHIC = "homomorphic_encryption"
    SECURE_AGGREGATION = "secure_aggregation"

class FederatedLearningService:
    def __init__(self):
        self.participants: Dict[str, Dict[str, Any]] = {}
        self.training_rounds: Dict[str, Dict[str, Any]] = {}
        self.global_models: Dict[str, Dict[str, Any]] = {}
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        
    async def create_federated_session(
        self,
        coordinator_id: str,
        model_config: Dict[str, Any],
        training_config: Dict[str, Any],
        privacy_config: Dict[str, Any]
    ) -> str:
        """Create a new federated learning session"""
        session_id = str(uuid.uuid4())
        
        session = {
            "id": session_id,
            "coordinator_id": coordinator_id,
            "model_config": model_config,
            "training_config": training_config,
            "privacy_config": privacy_config,
            "participants": [],
            "current_round": 0,
            "status": "initializing",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "global_model": None,
            "metrics": {
                "accuracy": [],
                "loss": [],
                "participation_rate": [],
                "convergence_score": 0.0
            }
        }
        
        self.active_sessions[session_id] = session
        
        # Initialize global model
        await self._initialize_global_model(session_id)
        
        return session_id
    
    async def register_participant(
        self,
        session_id: str,
        participant_id: str,
        capabilities: Dict[str, Any],
        data_stats: Dict[str, Any]
    ) -> bool:
        """Register a participant for federated learning"""
        if session_id not in self.active_sessions:
            return False
        
        session = self.active_sessions[session_id]
        
        participant = {
            "id": participant_id,
            "capabilities": capabilities,
            "data_stats": data_stats,
            "status": "registered",
            "reputation_score": 1.0,
            "contribution_history": [],
            "last_participation": None,
            "privacy_budget": privacy_config.get("initial_budget", 10.0)
        }
        
        # Check if participant meets requirements
        if self._validate_participant(participant, session["training_config"]):
            session["participants"].append(participant)
            self.participants[participant_id] = participant
            logger.info(f"Participant {participant_id} registered for session {session_id}")
            return True
        
        return False
    
    def _validate_participant(
        self,
        participant: Dict[str, Any],
        training_config: Dict[str, Any]
    ) -> bool:
        """Validate if participant meets session requirements"""
        capabilities = participant["capabilities"]
        data_stats = participant["data_stats"]
        
        # Check minimum data requirements
        min_samples = training_config.get("min_samples_per_participant", 100)
        if data_stats.get("num_samples", 0) < min_samples:
            return False
        
        # Check computational capabilities
        min_compute = training_config.get("min_compute_power", 1.0)
        if capabilities.get("compute_score", 0) < min_compute:
            return False
        
        # Check network requirements
        min_bandwidth = training_config.get("min_bandwidth_mbps", 1.0)
        if capabilities.get("bandwidth_mbps", 0) < min_bandwidth:
            return False
        
        return True
    
    async def _initialize_global_model(self, session_id: str):
        """Initialize the global model for the session"""
        session = self.active_sessions[session_id]
        model_config = session["model_config"]
        
        # Create initial model weights (mock implementation)
        global_model = {
            "model_type": model_config["type"],
            "architecture": model_config["architecture"],
            "weights": self._generate_initial_weights(model_config),
            "version": 0,
            "created_at": datetime.now().isoformat()
        }
        
        session["global_model"] = global_model
        session["status"] = "ready"
        
        logger.info(f"Global model initialized for session {session_id}")
    
    def _generate_initial_weights(self, model_config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate initial model weights (mock implementation)"""
        # This would be replaced with actual model initialization
        num_layers = model_config.get("num_layers", 5)
        layer_size = model_config.get("layer_size", 256)
        
        weights = {}
        for i in range(num_layers):
            weights[f"layer_{i}"] = {
                "weights": np.random.normal(0, 0.1, (layer_size, layer_size)).tolist(),
                "bias": np.zeros(layer_size).tolist()
            }
        
        return weights
    
    async def start_training_round(self, session_id: str) -> bool:
        """Start a new training round"""
        if session_id not in self.active_sessions:
            return False
        
        session = self.active_sessions[session_id]
        
        if session["status"] != "ready":
            return False
        
        # Select participants for this round
        selected_participants = await self._select_participants(session)
        
        round_id = str(uuid.uuid4())
        training_round = {
            "id": round_id,
            "session_id": session_id,
            "round_number": session["current_round"] + 1,
            "selected_participants": selected_participants,
            "status": "training",
            "started_at": datetime.now().isoformat(),
            "participant_updates": {},
            "aggregated_weights": None,
            "metrics": {}
        }
        
        self.training_rounds[round_id] = training_round
        session["current_round"] += 1
        session["status"] = "training"
        
        # Send global model to selected participants
        await self._distribute_global_model(round_id, selected_participants)
        
        logger.info(f"Training round {training_round['round_number']} started for session {session_id}")
        return True
    
    async def _select_participants(
        self,
        session: Dict[str, Any]
    ) -> List[str]:
        """Select participants for training round based on strategy"""
        all_participants = session["participants"]
        training_config = session["training_config"]
        
        selection_strategy = training_config.get("participant_selection", "random")
        max_participants = training_config.get("max_participants_per_round", 10)
        
        if selection_strategy == "random":
            # Random selection
            import random
            selected = random.sample(
                all_participants,
                min(len(all_participants), max_participants)
            )
        elif selection_strategy == "reputation_based":
            # Select based on reputation scores
            sorted_participants = sorted(
                all_participants,
                key=lambda p: p["reputation_score"],
                reverse=True
            )
            selected = sorted_participants[:max_participants]
        elif selection_strategy == "data_quality":
            # Select based on data quality metrics
            sorted_participants = sorted(
                all_participants,
                key=lambda p: p["data_stats"].get("quality_score", 0),
                reverse=True
            )
            selected = sorted_participants[:max_participants]
        else:
            selected = all_participants[:max_participants]
        
        return [p["id"] for p in selected]
    
    async def _distribute_global_model(
        self,
        round_id: str,
        participant_ids: List[str]
    ):
        """Distribute global model to selected participants"""
        training_round = self.training_rounds[round_id]
        session = self.active_sessions[training_round["session_id"]]
        global_model = session["global_model"]
        
        # In a real implementation, this would send the model over network
        for participant_id in participant_ids:
            logger.info(f"Sending global model to participant {participant_id}")
            # Mock: participant receives model and starts training
            asyncio.create_task(
                self._simulate_participant_training(round_id, participant_id)
            )
    
    async def _simulate_participant_training(
        self,
        round_id: str,
        participant_id: str
    ):
        """Simulate participant training (mock implementation)"""
        # Simulate training time
        training_time = np.random.uniform(10, 30)  # 10-30 seconds
        await asyncio.sleep(training_time)
        
        # Generate mock local model update
        local_update = self._generate_local_update(participant_id)
        
        # Submit update
        await self.submit_local_update(round_id, participant_id, local_update)
    
    def _generate_local_update(self, participant_id: str) -> Dict[str, Any]:
        """Generate mock local model update"""
        # This would be replaced with actual local training results
        return {
            "participant_id": participant_id,
            "weights_delta": {
                f"layer_{i}": {
                    "weights": np.random.normal(0, 0.01, (256, 256)).tolist(),
                    "bias": np.random.normal(0, 0.01, 256).tolist()
                }
                for i in range(5)
            },
            "training_metrics": {
                "local_accuracy": np.random.uniform(0.7, 0.95),
                "local_loss": np.random.uniform(0.1, 0.5),
                "num_epochs": np.random.randint(5, 20),
                "num_samples": np.random.randint(100, 1000)
            },
            "privacy_spent": np.random.uniform(0.1, 1.0),
            "training_time": np.random.uniform(10, 30)
        }
    
    async def submit_local_update(
        self,
        round_id: str,
        participant_id: str,
        local_update: Dict[str, Any]
    ) -> bool:
        """Submit local model update from participant"""
        if round_id not in self.training_rounds:
            return False
        
        training_round = self.training_rounds[round_id]
        
        if participant_id not in training_round["selected_participants"]:
            return False
        
        # Apply privacy protection
        protected_update = await self._apply_privacy_protection(
            local_update,
            training_round["session_id"]
        )
        
        training_round["participant_updates"][participant_id] = protected_update
        
        # Check if all participants have submitted
        if len(training_round["participant_updates"]) == len(training_round["selected_participants"]):
            await self._aggregate_updates(round_id)
        
        logger.info(f"Local update received from participant {participant_id}")
        return True
    
    async def _apply_privacy_protection(
        self,
        local_update: Dict[str, Any],
        session_id: str
    ) -> Dict[str, Any]:
        """Apply privacy protection to local update"""
        session = self.active_sessions[session_id]
        privacy_config = session["privacy_config"]
        privacy_level = PrivacyLevel(privacy_config.get("level", "basic"))
        
        if privacy_level == PrivacyLevel.DIFFERENTIAL:
            return self._apply_differential_privacy(local_update, privacy_config)
        elif privacy_level == PrivacyLevel.SECURE_AGGREGATION:
            return self._apply_secure_aggregation(local_update, privacy_config)
        elif privacy_level == PrivacyLevel.HOMOMORPHIC:
            return self._apply_homomorphic_encryption(local_update, privacy_config)
        else:
            return local_update  # Basic privacy (no additional protection)
    
    def _apply_differential_privacy(
        self,
        local_update: Dict[str, Any],
        privacy_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply differential privacy to local update"""
        epsilon = privacy_config.get("epsilon", 1.0)
        delta = privacy_config.get("delta", 1e-5)
        
        # Add noise to weights (simplified implementation)
        protected_update = local_update.copy()
        noise_scale = 1.0 / epsilon
        
        for layer_name, layer_weights in protected_update["weights_delta"].items():
            # Add Gaussian noise to weights
            weights_shape = np.array(layer_weights["weights"]).shape
            noise = np.random.normal(0, noise_scale, weights_shape)
            protected_update["weights_delta"][layer_name]["weights"] = (
                np.array(layer_weights["weights"]) + noise
            ).tolist()
        
        return protected_update
    
    def _apply_secure_aggregation(
        self,
        local_update: Dict[str, Any],
        privacy_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply secure aggregation (mock implementation)"""
        # In real implementation, this would use cryptographic protocols
        protected_update = local_update.copy()
        protected_update["encrypted"] = True
        return protected_update
    
    def _apply_homomorphic_encryption(
        self,
        local_update: Dict[str, Any],
        privacy_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply homomorphic encryption (mock implementation)"""
        # In real implementation, this would use homomorphic encryption libraries
        protected_update = local_update.copy()
        protected_update["homomorphically_encrypted"] = True
        return protected_update
    
    async def _aggregate_updates(self, round_id: str):
        """Aggregate local updates into global model"""
        training_round = self.training_rounds[round_id]
        session = self.active_sessions[training_round["session_id"]]
        
        participant_updates = training_round["participant_updates"]
        aggregation_method = AggregationMethod(
            session["training_config"].get("aggregation_method", "federated_averaging")
        )
        
        if aggregation_method == AggregationMethod.FEDAVG:
            aggregated_weights = self._federated_averaging(participant_updates)
        elif aggregation_method == AggregationMethod.FEDPROX:
            aggregated_weights = self._federated_proximal(participant_updates)
        else:
            aggregated_weights = self._federated_averaging(participant_updates)
        
        # Update global model
        session["global_model"]["weights"] = aggregated_weights
        session["global_model"]["version"] += 1
        
        # Calculate round metrics
        round_metrics = self._calculate_round_metrics(participant_updates)
        training_round["metrics"] = round_metrics
        
        # Update session metrics
        session["metrics"]["accuracy"].append(round_metrics["avg_accuracy"])
        session["metrics"]["loss"].append(round_metrics["avg_loss"])
        session["metrics"]["participation_rate"].append(
            len(participant_updates) / len(session["participants"])
        )
        
        training_round["status"] = "completed"
        session["status"] = "ready"
        
        logger.info(f"Round {training_round['round_number']} aggregation completed")
    
    def _federated_averaging(
        self,
        participant_updates: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Implement FedAvg aggregation"""
        if not participant_updates:
            return {}
        
        # Calculate weights based on number of samples
        total_samples = sum(
            update["training_metrics"]["num_samples"]
            for update in participant_updates.values()
        )
        
        aggregated_weights = {}
        
        # Get structure from first participant
        first_update = next(iter(participant_updates.values()))
        
        for layer_name, layer_data in first_update["weights_delta"].items():
            aggregated_weights[layer_name] = {
                "weights": np.zeros_like(layer_data["weights"]),
                "bias": np.zeros_like(layer_data["bias"])
            }
        
        # Weighted averaging
        for participant_id, update in participant_updates.items():
            weight = update["training_metrics"]["num_samples"] / total_samples
            
            for layer_name, layer_data in update["weights_delta"].items():
                aggregated_weights[layer_name]["weights"] += (
                    weight * np.array(layer_data["weights"])
                )
                aggregated_weights[layer_name]["bias"] += (
                    weight * np.array(layer_data["bias"])
                )
        
        # Convert back to lists
        for layer_name in aggregated_weights:
            aggregated_weights[layer_name]["weights"] = (
                aggregated_weights[layer_name]["weights"].tolist()
            )
            aggregated_weights[layer_name]["bias"] = (
                aggregated_weights[layer_name]["bias"].tolist()
            )
        
        return aggregated_weights
    
    def _federated_proximal(
        self,
        participant_updates: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Implement FedProx aggregation (simplified)"""
        # For simplicity, use FedAvg with regularization
        return self._federated_averaging(participant_updates)
    
    def _calculate_round_metrics(
        self,
        participant_updates: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate metrics for the completed round"""
        accuracies = [
            update["training_metrics"]["local_accuracy"]
            for update in participant_updates.values()
        ]
        losses = [
            update["training_metrics"]["local_loss"]
            for update in participant_updates.values()
        ]
        
        return {
            "avg_accuracy": np.mean(accuracies),
            "std_accuracy": np.std(accuracies),
            "avg_loss": np.mean(losses),
            "std_loss": np.std(losses),
            "num_participants": len(participant_updates),
            "total_samples": sum(
                update["training_metrics"]["num_samples"]
                for update in participant_updates.values()
            )
        }
    
    async def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get status of federated learning session"""
        return self.active_sessions.get(session_id)
    
    async def get_global_model(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get current global model"""
        session = self.active_sessions.get(session_id)
        return session["global_model"] if session else None
    
    async def evaluate_global_model(
        self,
        session_id: str,
        test_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate global model on test data"""
        # Mock evaluation results
        return {
            "accuracy": np.random.uniform(0.8, 0.95),
            "precision": np.random.uniform(0.75, 0.9),
            "recall": np.random.uniform(0.7, 0.88),
            "f1_score": np.random.uniform(0.72, 0.89),
            "evaluated_at": datetime.now().isoformat()
        }

# Singleton instance
federated_learning_service = FederatedLearningService()