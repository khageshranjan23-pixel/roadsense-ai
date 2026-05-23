# RoadSense AI — Road Safety Advisor Chat Endpoints

from typing import List, Optional, Dict, Any
import os
import tempfile
import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.core.database import supabase_client
from app.core.security import get_current_user
from app.cv.scene_analyzer import SceneAnalyzer
from app.services.gemini_service import GeminiService
from loguru import logger

router = APIRouter()

class ChatMessage(BaseModel):
    role: str # 'user' | 'model'
    content: str

class AdvisorChatRequest(BaseModel):
    question: str
    scene_context: Optional[Dict[str, Any]] = None
    conversation_history: Optional[List[ChatMessage]] = []

# Instantiate GeminiService
_gemini = GeminiService()

@router.post("/analyze")
async def advisor_analyze(
    file: UploadFile = File(None),
    user = Depends(get_current_user)
):
    """
    Optional media upload for Advisor. Runs YOLO detection and returns scene context.
    """
    if not file:
        return {"objects": [], "traffic_light_color": "none", "pedestrians_on_crossing": 0}

    # Validate file extension
    filename = file.filename or ""
    _, ext = os.path.splitext(filename.lower())
    if ext not in {".jpg", ".png", ".webp", ".jpeg", ".mp4", ".avi", ".mov"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format."
        )

    # Save to temp
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"adv_{os.urandom(8).hex()}{ext}")
    
    try:
        # Check size
        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Max 50MB."
            )
            
        with open(temp_path, "wb") as buffer:
            buffer.write(contents)
            
        analyzer = SceneAnalyzer()
        is_video = ext in {".mp4", ".avi", ".mov"}
        
        if is_video:
            analysis = analyzer.analyze_video(temp_path)
        else:
            analysis = analyzer.analyze_image(temp_path)
            
        return {
            "objects": analysis["objects"],
            "traffic_light_color": analysis["traffic_light_color"],
            "fastest_vehicle_speed": analysis["fastest_vehicle_speed"],
            "closest_vehicle_distance": analysis["closest_vehicle_distance"],
            "pedestrians_on_crossing": analysis["pedestrians_on_crossing"],
            "scene_complexity": analysis["scene_complexity"],
            "annotated_frame_base64": analysis.get("annotated_frame_base64", "")
        }
        
    except Exception as e:
        logger.error(f"Advisor Media Analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze upload."
        )
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

@router.post("/chat")
def advisor_chat(
    payload: AdvisorChatRequest,
    user = Depends(get_current_user)
):
    """
    Streams a safety advice conversation based on optional scene context and message history.
    Logs query metadata to the Supabase database.
    """
    user_id = user.id if hasattr(user, "id") else user.get("id")
    
    system_instruction = """You are RoadSense AI — an expert road safety advisor.
    You analyze road scenes using computer vision data and answer questions about safety.
    Always respond in this exact format:
    
    VERDICT: [SAFE / CAUTION / UNSAFE]
    REASON: [1-2 sentences explaining why]
    ADVICE: [What the person should do next]
    
    If scene_context is provided, reference specific detected objects (e.g. "We detected a car speeding at 12 px/frame").
    Keep language simple enough for a 10-year-old to understand.
    Never be overly alarming, but always prioritize safety.
    If asked in Hindi, respond in Hindi (but maintain the structural labels VERDICT:, REASON:, ADVICE:)."""
    
    # Compile prompt from question and scene context
    prompt = payload.question
    if payload.scene_context:
        prompt = f"Scene Context: {json.dumps(payload.scene_context)}\n\nQuestion: {payload.question}"

    # Log query to advisor_queries (Anonymized, background fire-and-forget or try-except)
    media_type = "none"
    detected_objects = None
    risk_assessment = "SAFE"
    
    if payload.scene_context:
        detected_objects = [obj["class_name"] for obj in payload.scene_context.get("objects", [])]
        # Map to verdict
        pedestrians = payload.scene_context.get("pedestrians_on_crossing", 0)
        tl_color = payload.scene_context.get("traffic_light_color", "none")
        closest_dist = payload.scene_context.get("closest_vehicle_distance", 999.0)
        
        if tl_color == "red" or closest_dist < 150.0:
            risk_assessment = "UNSAFE"
        elif tl_color == "yellow" or pedestrians > 0 or closest_dist < 250.0:
            risk_assessment = "CAUTIOUS"

    # Convert chat history to dicts for GeminiService
    history_dicts = []
    for msg in payload.conversation_history:
        history_dicts.append({
            "role": msg.role,
            "content": msg.content
        })

    def response_generator():
        # Stream response chunks from Gemini
        ai_response = ""
        try:
            for chunk in _gemini.chat_stream(
                system_instruction=system_instruction,
                prompt=prompt,
                conversation_history=history_dicts
            ):
                ai_response += chunk
                yield chunk
        except Exception as e:
            logger.error(f"Gemini Streaming Error: {e}")
            yield "VERDICT: CAUTION\nREASON: Streaming service experienced a glitch.\nADVICE: Please try again or rephrase."
            return

        # Save query to DB after stream completes
        if supabase_client:
            try:
                db_data = {
                    "user_id": user_id,
                    "media_type": "image" if payload.scene_context else "none",
                    "question_text": payload.question,
                    "yolo_detected_objects": detected_objects,
                    "risk_assessment": "SAFE" if risk_assessment == "SAFE" else ("CAUTION" if risk_assessment == "CAUTIOUS" else "UNSAFE"),
                    "ai_response_summary": ai_response[:500] # Save short summary
                }
                supabase_client.table("advisor_queries").insert(db_data).execute()
            except Exception as db_err:
                logger.error(f"Failed to log advisor query: {db_err}")

    return StreamingResponse(response_generator(), media_type="text/event-stream")
