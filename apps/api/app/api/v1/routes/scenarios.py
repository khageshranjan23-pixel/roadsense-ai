# RoadSense AI — Scenario Management Endpoints

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from app.core.database import supabase_client
from app.core.security import get_current_user
from app.services.scenario_service import ScenarioService
from loguru import logger
import random

router = APIRouter()

class ScenarioGenerateRequest(BaseModel):
    level: int = Field(..., ge=1, le=3, description="Level difficulty (1-3)")
    scenario_type: str = Field(..., description="Type of scenario: 'signal', 'pedestrian', 'vehicle', 'blind_spot', 'emergency', 'multiHazard'")
    context: Optional[str] = Field(None, description="Optional custom context text")

@router.get("/")
def get_scenarios(
    level: Optional[int] = Query(None, ge=1, le=3),
    type: Optional[str] = Query(None),
    count: int = Query(5, ge=1, le=20),
    randomize: bool = Query(True, alias="random"),
    user = Depends(get_current_user)
):
    """
    Retrieves scenarios filtered by level and type, and shuffles them.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is offline."
        )

    try:
        query = supabase_client.table("scenarios").select("*").eq("is_active", True)
        
        if level is not None:
            query = query.eq("level", level)
            
        if type is not None:
            query = query.eq("scenario_type", type)
            
        res = query.execute()
        scenarios = res.data or []
        
        if randomize:
            random.shuffle(scenarios)
            
        return scenarios[:count]
        
    except Exception as e:
        logger.error(f"Failed to fetch scenarios: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query scenarios."
        )

@router.post("/generate")
async def generate_scenario(
    payload: ScenarioGenerateRequest,
    user = Depends(get_current_user)
):
    """
    Generates a new scenario using Gemini 2.0 Flash and saves it to the database.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is offline."
        )

    try:
        service = ScenarioService(supabase_client)
        new_scenario = await service.generate_scenario(
            level=payload.level,
            scenario_type=payload.scenario_type,
            context=payload.context
        )
        return new_scenario
    except Exception as e:
        logger.error(f"Failed to generate scenario: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate scenario: {str(e)}"
        )
