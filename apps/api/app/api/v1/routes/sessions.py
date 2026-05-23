# RoadSense AI — Game Session Endpoints

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from app.core.database import supabase_client
from app.core.security import get_current_user
from app.services.scoring_service import ScoringService
from app.services.scenario_service import ScenarioService
from loguru import logger
import datetime
import random

router = APIRouter()

class SessionStartRequest(BaseModel):
    level: int = Field(..., ge=1, le=3)
    use_uploaded_scenario: Optional[bool] = False
    scenario_ids: Optional[List[str]] = None

class DecisionSubmitRequest(BaseModel):
    scenario_id: str
    answer: str
    reaction_time_ms: int
    question_number: int

@router.post("/start")
async def start_session(
    payload: SessionStartRequest,
    user = Depends(get_current_user)
):
    """
    Creates a new game session and returns the session_id along with 5 scenarios.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is offline."
        )

    try:
        user_id = user.id if hasattr(user, "id") else user.get("id")
        
        # 1. Create a game session record
        session_data = {
            "user_id": user_id,
            "level": payload.level,
            "status": "in_progress",
            "total_score": 0,
            "max_possible_score": 0,
            "metadata": {
                "upload_used": payload.use_uploaded_scenario or False
            }
        }
        res_session = supabase_client.table("game_sessions").insert(session_data).execute()
        if not res_session.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create game session."
            )
        session_id = res_session.data[0]["id"]
        
        # 2. Retrieve scenarios
        scenarios = []
        if payload.scenario_ids:
            # Fetch specific scenarios
            res_scenarios = supabase_client.table("scenarios").select("*").in_("id", payload.scenario_ids).execute()
            scenarios = res_scenarios.data or []
        else:
            # Fetch by level
            res_scenarios = supabase_client.table("scenarios").select("*").eq("level", payload.level).eq("is_active", True).execute()
            scenarios = res_scenarios.data or []
            
        # Safeguard: if there are no scenarios in the DB, create fallback ones
        if len(scenarios) < 5:
            scenario_service = ScenarioService(supabase_client)
            types = ['signal', 'pedestrian', 'vehicle', 'blind_spot', 'emergency', 'multiHazard']
            for t in types:
                if len(scenarios) >= 5:
                    break
                # Create a fallback or generated scenario
                try:
                    sc = await scenario_service.generate_scenario(payload.level, t)
                    scenarios.append(sc)
                except Exception as e:
                    logger.warning(f"Error creating scenario: {e}")
                    
        random.shuffle(scenarios)
        selected_scenarios = scenarios[:5]
        
        return {
            "session_id": session_id,
            "scenarios": selected_scenarios
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start session: {str(e)}"
        )

@router.post("/{session_id}/decision")
def submit_decision(
    session_id: str,
    payload: DecisionSubmitRequest,
    user = Depends(get_current_user)
):
    """
    Submits a decision for a scenario within a session, calculates points,
    saves the decision record, and updates the session total score.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is offline."
        )

    try:
        user_id = user.id if hasattr(user, "id") else user.get("id")
        
        # 1. Fetch game session and verify owner
        res_session = supabase_client.table("game_sessions").select("*").eq("id", session_id).execute()
        if not res_session.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game session not found."
            )
        session_record = res_session.data[0]
        if session_record["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )
            
        # 2. Fetch scenario to verify answer
        res_scenario = supabase_client.table("scenarios").select("*").eq("id", payload.scenario_id).execute()
        if not res_scenario.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scenario not found."
            )
        scenario = res_scenario.data[0]
        
        # 3. Calculate points and correctness
        score_res = ScoringService.calculate_decision_score(
            answer=payload.answer,
            correct_answer=scenario["correct_answer"],
            reaction_time_ms=payload.reaction_time_ms
        )
        
        # 4. Save decision record
        decision_data = {
            "session_id": session_id,
            "scenario_id": payload.scenario_id,
            "question_number": payload.question_number,
            "answer_given": payload.answer,
            "correct_answer": scenario["correct_answer"],
            "is_correct": score_res["is_correct"],
            "reaction_time_ms": payload.reaction_time_ms,
            "points_earned": score_res["points"],
            "was_impulsive": score_res["was_impulsive"],
            "was_timeout": score_res["was_timeout"]
        }
        
        supabase_client.table("decisions").insert(decision_data).execute()
        
        # 5. Update session running total score
        new_running_score = session_record["total_score"] + score_res["points"]
        supabase_client.table("game_sessions").update({
            "total_score": new_running_score
        }).eq("id", session_id).execute()
        
        # 6. Check if any single-decision badges can be awarded
        badge_earned = None
        # Perfect Round can be awarded on the 5th correct decision (this is verified on complete)
        # Signal Master: if they got this correct and it's a signal scenario, check overall signal stats
        if score_res["is_correct"] and scenario["scenario_type"] == "signal":
            # Count correct signal decisions in this session so far
            res_sig = supabase_client.table("decisions").select("id", "is_correct").eq("session_id", session_id).execute()
            correct_sigs = sum(1 for d in (res_sig.data or []) if d["is_correct"])
            if correct_sigs == 5:
                # Award Signal Master
                badge_data = {
                    "user_id": user_id,
                    "badge_type": "Signal Master",
                    "badge_name": "Signal Master",
                    "badge_description": "Perfect score on traffic light scenarios!",
                    "icon_emoji": "🚦"
                }
                # Check duplicate
                check_badge = supabase_client.table("badges").select("*").eq("user_id", user_id).eq("badge_type", "Signal Master").execute()
                if not check_badge.data:
                    res_badge = supabase_client.table("badges").insert(badge_data).execute()
                    if res_badge.data:
                        badge_earned = res_badge.data[0]

        return {
            "is_correct": score_res["is_correct"],
            "points": score_res["points"],
            "running_score": new_running_score,
            "explanation": scenario["explanation"],
            "badge_earned": badge_earned
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit decision: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit decision: {str(e)}"
        )

@router.post("/{session_id}/complete")
def complete_session(
    session_id: str,
    user = Depends(get_current_user)
):
    """
    Finalizes a game session, compiles scores, risk tendencies, grades,
    saves category scores, and awards session-completion badges.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is offline."
        )

    try:
        user_id = user.id if hasattr(user, "id") else user.get("id")
        
        # 1. Fetch session and check ownership
        res_session = supabase_client.table("game_sessions").select("*").eq("id", session_id).execute()
        if not res_session.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game session not found."
            )
        session_record = res_session.data[0]
        if session_record["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )
            
        # 2. Fetch all decisions for this session
        res_decisions = supabase_client.table("decisions").select("*").eq("session_id", session_id).execute()
        decisions_list = res_decisions.data or []
        if not decisions_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot complete session with zero decisions."
            )
            
        # 3. Fetch all related scenarios to check categories
        scenario_ids = [d["scenario_id"] for d in decisions_list]
        res_scenarios = supabase_client.table("scenarios").select("*").in_("id", scenario_ids).execute()
        scenarios_map = {str(s["id"]): s for s in (res_scenarios.data or [])}
        
        # 4. Fetch user's session history
        res_history = supabase_client.table("game_sessions").select("*").eq("user_id", user_id).eq("status", "completed").order("completed_at", desc=True).execute()
        history_list = res_history.data or []
        
        # 5. Evaluate session metrics
        eval_res = ScoringService.evaluate_session(
            user_id=user_id,
            level=session_record["level"],
            decisions=decisions_list,
            scenarios=scenarios_map,
            history=history_list
        )
        
        # 6. Save game_sessions update
        update_data = {
            "status": "completed",
            "total_score": eval_res["total_score"],
            "max_possible_score": eval_res["max_possible_score"],
            "percentage_score": eval_res["percentage_score"],
            "avg_reaction_time_ms": eval_res["avg_reaction_time_ms"],
            "risk_tendency": eval_res["risk_tendency"],
            "grade": eval_res["grade"],
            "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        supabase_client.table("game_sessions").update(update_data).eq("id", session_id).execute()
        
        # 7. Save category scores
        # Delete existing first to prevent duplicates on double-posting
        supabase_client.table("category_scores").delete().eq("session_id", session_id).execute()
        for cat_score in eval_res["category_scores"]:
            cat_score["session_id"] = session_id
            supabase_client.table("category_scores").insert(cat_score).execute()
            
        # 8. Award earned badges
        newly_awarded_badges = []
        for badge in eval_res["badges_earned"]:
            # Check duplicate badge type
            check = supabase_client.table("badges").select("*").eq("user_id", user_id).eq("badge_type", badge["badge_type"]).execute()
            if not check.data:
                badge["user_id"] = user_id
                res_b = supabase_client.table("badges").insert(badge).execute()
                if res_b.data:
                    newly_awarded_badges.append(res_b.data[0])
                    
        # Compile response
        report = {
            "session_id": session_id,
            "level": session_record["level"],
            "total_score": eval_res["total_score"],
            "max_possible_score": eval_res["max_possible_score"],
            "percentage_score": eval_res["percentage_score"],
            "avg_reaction_time_ms": eval_res["avg_reaction_time_ms"],
            "risk_tendency": eval_res["risk_tendency"],
            "grade": eval_res["grade"],
            "decisions": decisions_list,
            "category_scores": eval_res["category_scores"],
            "badges_earned": newly_awarded_badges,
            "improvement_tip": eval_res["improvement_tip"]
        }
        return report

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to complete session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete session: {str(e)}"
        )

@router.get("/{session_id}/report")
def get_session_report(
    session_id: str,
    user = Depends(get_current_user)
):
    """
    Retrieves the complete report for a completed session.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is offline."
        )

    try:
        user_id = user.id if hasattr(user, "id") else user.get("id")
        
        # Fetch session
        res_session = supabase_client.table("game_sessions").select("*").eq("id", session_id).execute()
        if not res_session.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found."
            )
        session_rec = res_session.data[0]
        if session_rec["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )
            
        # Fetch decisions
        res_decisions = supabase_client.table("decisions").select("*, scenarios(title, description, scenario_type, correct_answer, explanation)").eq("session_id", session_id).execute()
        decisions = res_decisions.data or []
        
        # Fetch category scores
        res_cats = supabase_client.table("category_scores").select("*").eq("session_id", session_id).execute()
        category_scores = res_cats.data or []
        
        # Fetch badges earned in this session (same timestamp window or earned specifically)
        # Simply return all badges earned by user to show in the report shelf
        res_badges = supabase_client.table("badges").select("*").eq("user_id", user_id).execute()
        badges = res_badges.data or []
        
        # Find weakest category for personal tip
        weakest_category = "risk_detection"
        lowest_pct = 101.0
        for cat in category_scores:
            pct = float(cat.get("percentage", 0.0))
            if pct < lowest_pct:
                lowest_pct = pct
                weakest_category = cat.get("category", "risk_detection")
                
        tip_mapping = {
            "signal_knowledge": "Practice identifying signal phases and always wait for a solid green.",
            "risk_detection": "Scan left, right, then left again before making any decision near a road.",
            "situation_awareness": "Look for all objects in the scene — not just the most obvious one.",
            "risk_management": "When in doubt, the safest choice is always to wait.",
            "pedestrian_rules": "Always look for pedestrian signs and use zebra crossings when available.",
            "emergency_protocol": "Emergency vehicles always have right of way. Stop and let them pass."
        }
        
        return {
            "session_id": session_id,
            "level": session_rec["level"],
            "total_score": session_rec["total_score"],
            "max_possible_score": session_rec["max_possible_score"],
            "percentage_score": float(session_rec["percentage_score"] or 0.0),
            "avg_reaction_time_ms": session_rec["avg_reaction_time_ms"],
            "risk_tendency": session_rec["risk_tendency"],
            "grade": session_rec["grade"],
            "decisions": decisions,
            "category_scores": category_scores,
            "badges": badges,
            "improvement_tip": tip_mapping.get(weakest_category, "Always stay alert on the road.")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch session report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query session report."
        )

@router.get("/history")
def get_session_history(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    user = Depends(get_current_user)
):
    """
    Retrieves a list of completed sessions with summary stats for the current user.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is offline."
        )

    try:
        user_id = user.id if hasattr(user, "id") else user.get("id")
        
        res = supabase_client.table("game_sessions")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("status", "completed")\
            .order("completed_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
            
        return res.data or []
        
    except Exception as e:
        logger.error(f"Failed to fetch session history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query session history."
        )
