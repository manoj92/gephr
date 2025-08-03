import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.training import TrainingSession


class TestTraining:
    """Test training session endpoints."""

    async def test_create_training_session(self, client: AsyncClient, auth_headers: dict):
        """Test creating a training session."""
        session_data = {
            "name": "Test Training Session",
            "description": "A test training session",
            "task_type": "pick_and_place",
            "difficulty_level": 3,
            "robot_type": "unitree_g1",
            "environment_config": {"lighting": "normal", "background": "clean"}
        }
        
        response = await client.post(
            "/api/v1/training/sessions",
            json=session_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == session_data["name"]
        assert data["description"] == session_data["description"]
        assert data["task_type"] == session_data["task_type"]
        assert data["difficulty_level"] == session_data["difficulty_level"]
        assert data["robot_type"] == session_data["robot_type"]
        assert data["status"] == "active"
        assert "id" in data

    async def test_get_training_sessions(self, client: AsyncClient, auth_headers: dict):
        """Test getting user's training sessions."""
        # First create a session
        session_data = {
            "name": "Test Session",
            "robot_type": "unitree_g1"
        }
        
        await client.post(
            "/api/v1/training/sessions",
            json=session_data,
            headers=auth_headers
        )
        
        # Then get sessions
        response = await client.get(
            "/api/v1/training/sessions",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == session_data["name"]

    async def test_get_training_session_by_id(self, client: AsyncClient, auth_headers: dict):
        """Test getting a specific training session."""
        # Create session
        session_data = {
            "name": "Specific Session",
            "robot_type": "unitree_g1"
        }
        
        create_response = await client.post(
            "/api/v1/training/sessions",
            json=session_data,
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Get session
        response = await client.get(
            f"/api/v1/training/sessions/{session_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
        assert data["name"] == session_data["name"]

    async def test_get_nonexistent_training_session(self, client: AsyncClient, auth_headers: dict):
        """Test getting a nonexistent training session."""
        response = await client.get(
            "/api/v1/training/sessions/nonexistent-id",
            headers=auth_headers
        )
        
        assert response.status_code == 404

    async def test_update_training_session(self, client: AsyncClient, auth_headers: dict):
        """Test updating a training session."""
        # Create session
        session_data = {
            "name": "Original Name",
            "robot_type": "unitree_g1"
        }
        
        create_response = await client.post(
            "/api/v1/training/sessions",
            json=session_data,
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Update session
        update_data = {
            "name": "Updated Name",
            "description": "Updated description"
        }
        
        response = await client.put(
            f"/api/v1/training/sessions/{session_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]

    async def test_delete_training_session(self, client: AsyncClient, auth_headers: dict):
        """Test deleting a training session."""
        # Create session
        session_data = {
            "name": "To Delete",
            "robot_type": "unitree_g1"
        }
        
        create_response = await client.post(
            "/api/v1/training/sessions",
            json=session_data,
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Delete session
        response = await client.delete(
            f"/api/v1/training/sessions/{session_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 204
        
        # Verify deletion
        get_response = await client.get(
            f"/api/v1/training/sessions/{session_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404

    async def test_create_gesture_data(self, client: AsyncClient, auth_headers: dict):
        """Test adding gesture data to a training session."""
        # Create session
        session_data = {
            "name": "Gesture Session",
            "robot_type": "unitree_g1"
        }
        
        create_response = await client.post(
            "/api/v1/training/sessions",
            json=session_data,
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Add gesture data
        from datetime import datetime
        gesture_data = {
            "training_session_id": session_id,
            "gesture_type": "pick",
            "gesture_name": "Pick Apple",
            "start_time": datetime.utcnow().isoformat(),
            "confidence_score": 0.85,
            "environment_state": {"object": "apple", "position": {"x": 0.5, "y": 0.3, "z": 0.1}},
            "lerobot_action": {"action_type": "pick", "gripper_position": 0.8}
        }
        
        response = await client.post(
            f"/api/v1/training/sessions/{session_id}/gestures",
            json=gesture_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["gesture_type"] == gesture_data["gesture_type"]
        assert data["gesture_name"] == gesture_data["gesture_name"]
        assert data["confidence_score"] == gesture_data["confidence_score"]
        assert data["sequence_number"] == 1

    async def test_get_session_gestures(self, client: AsyncClient, auth_headers: dict):
        """Test getting gestures for a training session."""
        # Create session and gesture
        session_data = {"name": "Gesture Test", "robot_type": "unitree_g1"}
        create_response = await client.post(
            "/api/v1/training/sessions",
            json=session_data,
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Add gesture
        from datetime import datetime
        gesture_data = {
            "training_session_id": session_id,
            "gesture_type": "place",
            "start_time": datetime.utcnow().isoformat(),
            "confidence_score": 0.9
        }
        
        await client.post(
            f"/api/v1/training/sessions/{session_id}/gestures",
            json=gesture_data,
            headers=auth_headers
        )
        
        # Get gestures
        response = await client.get(
            f"/api/v1/training/sessions/{session_id}/gestures",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["gesture_type"] == gesture_data["gesture_type"]

    async def test_training_session_unauthorized(self, client: AsyncClient):
        """Test training endpoints without authentication."""
        response = await client.get("/api/v1/training/sessions")
        assert response.status_code == 401
        
        response = await client.post(
            "/api/v1/training/sessions",
            json={"name": "Test", "robot_type": "unitree_g1"}
        )
        assert response.status_code == 401

    async def test_invalid_gesture_type(self, client: AsyncClient, auth_headers: dict):
        """Test creating gesture with invalid type."""
        # Create session
        session_data = {"name": "Invalid Gesture", "robot_type": "unitree_g1"}
        create_response = await client.post(
            "/api/v1/training/sessions",
            json=session_data,
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Try to add invalid gesture
        from datetime import datetime
        gesture_data = {
            "training_session_id": session_id,
            "gesture_type": "invalid_type",
            "start_time": datetime.utcnow().isoformat(),
            "confidence_score": 0.5
        }
        
        response = await client.post(
            f"/api/v1/training/sessions/{session_id}/gestures",
            json=gesture_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422

    async def test_invalid_confidence_score(self, client: AsyncClient, auth_headers: dict):
        """Test creating gesture with invalid confidence score."""
        # Create session
        session_data = {"name": "Invalid Confidence", "robot_type": "unitree_g1"}
        create_response = await client.post(
            "/api/v1/training/sessions",
            json=session_data,
            headers=auth_headers
        )
        session_id = create_response.json()["id"]
        
        # Try to add gesture with invalid confidence
        from datetime import datetime
        gesture_data = {
            "training_session_id": session_id,
            "gesture_type": "pick",
            "start_time": datetime.utcnow().isoformat(),
            "confidence_score": 1.5  # Invalid: > 1.0
        }
        
        response = await client.post(
            f"/api/v1/training/sessions/{session_id}/gestures",
            json=gesture_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422