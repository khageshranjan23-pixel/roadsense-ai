# RoadSense AI — Media Analysis Endpoints

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.cv.scene_analyzer import SceneAnalyzer
from app.cv.safety_engine import SafetyEngine
from loguru import logger

router = APIRouter()

# Initialize SceneAnalyzer lazily
_analyzer = None

def get_analyzer():
    global _analyzer
    if _analyzer is None:
        try:
            _analyzer = SceneAnalyzer()
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
    return _analyzer

MAX_SIZE_BYTES = 50 * 1024 * 1024 # 50 MB
ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".jpg", ".png", ".webp", ".jpeg"}

@router.post("/media")
async def analyze_media(
    file: UploadFile = File(...),
    analyze_for: str = Form("game") # 'game' | 'advisor'
):
    """
    Accepts an image or video, runs YOLOv8 object detection and DeepSORT tracking,
    determines ground-truth safety decisions, and returns metadata and the annotated base64 frame.
    """
    # 1. Validate File Size
    # Read file size in chunks to prevent loading entire large files into memory first
    size = 0
    chunk_size = 1024 * 1024
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds maximum allowed limit of 50MB."
            )
            
    # Seek back to start after reading
    await file.seek(0)
    
    # 2. Validate Extension
    filename = file.filename or ""
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Supported extensions: {ALLOWED_EXTENSIONS}"
        )

    # 3. Save to Temp File
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"upload_{os.urandom(8).hex()}{ext}")
    
    try:
        with open(temp_path, "wb") as buffer:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                buffer.write(chunk)
                
        # 4. Perform Scene Analysis
        analyzer = get_analyzer()
        if not analyzer:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Computer Vision model is currently offline."
            )
            
        is_video = ext in {".mp4", ".avi", ".mov"}
        
        if is_video:
            analysis = analyzer.analyze_video(temp_path)
        else:
            analysis = analyzer.analyze_image(temp_path)
            
        # 5. Safety Engine Evaluation
        safety_eval = SafetyEngine.compute_ground_truth(analysis)
        risk_level = SafetyEngine.compute_risk_level(analysis)
        
        # 6. Build Scenario Parameters
        # Map traffic light color
        color_map = {"red": "red", "green": "green", "yellow": "yellow", "none": "none", "unknown": "none"}
        sig_color = color_map.get(analysis["traffic_light_color"], "none")
        
        # Map fastest vehicle type or default to car
        vtype = "car"
        for obj in analysis["objects"]:
            if obj["class_name"] in {"car", "bus", "truck", "motorcycle", "bicycle"}:
                vtype = "bike" if obj["class_name"] == "bicycle" else obj["class_name"]
                if vtype == "motorcycle":
                    vtype = "bike"
                break
                
        # Map direction
        vdirection = "left_right"
        for obj in analysis["objects"]:
            if obj["class_name"] in {"car", "bus", "truck", "motorcycle", "bicycle"}:
                vdirection = obj.get("direction", "left_right")
                break
                
        scenario_params = {
            "vehicle_speed": "fast" if analysis["fastest_vehicle_speed"] > 10.0 else ("medium" if analysis["fastest_vehicle_speed"] > 4.0 else "slow"),
            "vehicle_type": vtype,
            "vehicle_direction": vdirection,
            "signal_color": sig_color,
            "pedestrians_present": analysis["pedestrians_on_crossing"] > 0,
            "time_of_day": "day", # Default from analysis
            "weather": "clear",   # Default from analysis
            "num_vehicles": len([o for o in analysis["objects"] if o["class_name"] in {"car", "bus", "truck", "motorcycle", "bicycle"}])
        }
        
        # Format return payload
        return {
            "scenario": scenario_params,
            "correct_answer": safety_eval["correct_answer"],
            "risk_level": risk_level,
            "explanation": safety_eval["explanation"],
            "detected_objects": analysis["objects"],
            "annotated_frame_base64": analysis["annotated_frame_base64"],
            "freeze_at_ms": analysis.get("freeze_at_ms", 0)
        }
        
    except ValueError as val_err:
        logger.error(f"Media Analysis Error: {val_err}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err)
        )
    except Exception as e:
        logger.critical(f"Server Error during analyze: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process media file."
        )
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

@router.get("/health")
def health_check():
    """
    Returns CV loading status and api status.
    """
    return {
        "status": "ok",
        "yolo_loaded": get_analyzer() is not None
    }
