# RoadSense AI — Media Analysis Route Tests

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_analyze_endpoint_invalid_file_type():
    """
    Ensure the endpoint rejects unsupported file types (like text files).
    """
    files = {"file": ("document.txt", b"plain text content", "text/plain")}
    response = client.post(
        "/api/v1/analyze/media", 
        files=files, 
        data={"analyze_for": "game"}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

def test_analyze_endpoint_file_too_large():
    """
    Ensure the endpoint rejects uploads exceeding 50MB.
    """
    # 51 MB of mock data
    large_data = b"0" * (51 * 1024 * 1024)
    files = {"file": ("large_video.mp4", large_data, "video/mp4")}
    response = client.post(
        "/api/v1/analyze/media", 
        files=files, 
        data={"analyze_for": "game"}
    )
    assert response.status_code == 400
    assert "size exceeds" in response.json()["detail"]

def test_health_endpoint():
    """
    Verify the analysis health status endpoint.
    """
    response = client.get("/api/v1/analyze/health")
    assert response.status_code == 200
    assert "status" in response.json()
    assert "yolo_loaded" in response.json()
