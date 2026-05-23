# RoadSense AI — Advisor Route Tests

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_advisor_chat_endpoint():
    """
    Verifies that the advisor chat endpoint parses parameters correctly
    and successfully initiates a streaming response.
    """
    # Test message payload
    payload = {
        "question": "Can I cross the street when there is a fast auto-rickshaw?",
        "scene_context": {
            "objects": [
                {"class_name": "auto", "direction": "toward_crossing", "distance": 120.0, "speed": 15.0}
            ],
            "traffic_light_color": "green",
            "fastest_vehicle_speed": 15.0,
            "closest_vehicle_distance": 120.0,
            "pedestrians_on_crossing": 0,
            "scene_complexity": "simple"
        },
        "conversation_history": []
    }
    
    # We bypass actual Gemini API during tests using a bypass/development mock
    # because GEMINI_API_KEY is likely not set or we want to run unit tests quickly.
    response = client.post("/api/v1/advisor/chat", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    
    # Verify the streamed response contains expected verdict keys
    # FastAPI TestClient reads StreamingResponse synchronously into response.text
    content = response.text
    assert "VERDICT:" in content
    assert "REASON:" in content
    assert "ADVICE:" in content

def test_advisor_analyze_no_file():
    """
    Ensure the advisor/analyze endpoint handles empty uploads gracefully.
    """
    response = client.post("/api/v1/advisor/analyze")
    assert response.status_code == 200
    assert response.json()["objects"] == []
    assert response.json()["traffic_light_color"] == "none"
