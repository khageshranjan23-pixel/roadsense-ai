FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required by OpenCV and FFmpeg
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download YOLOv8n model during docker build so it is baked in, avoiding cold-start downloads
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

COPY app/ ./app/

# Expose port 8080 for Google Cloud Run compatibility
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
