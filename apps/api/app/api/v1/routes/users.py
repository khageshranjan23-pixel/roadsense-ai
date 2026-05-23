# RoadSense AI — User and Profile Management Endpoints

from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import supabase_client
from app.core.security import get_current_user
from loguru import logger

router = APIRouter()

@router.get("/me")
def get_my_profile(user = Depends(get_current_user)):
    """
    Retrieves the logged-in user's profile details, total sessions, average score,
    and total badge count.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is offline."
        )

    try:
        user_id = user.id if hasattr(user, "id") else user.get("id")
        
        # 1. Get profile data
        res_profile = supabase_client.table("profiles").select("*, schools(name)").eq("id", user_id).execute()
        if not res_profile.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found."
            )
        profile = res_profile.data[0]
        
        # 2. Get session aggregates
        res_sessions = supabase_client.table("game_sessions")\
            .select("percentage_score")\
            .eq("user_id", user_id)\
            .eq("status", "completed")\
            .execute()
        
        sessions = res_sessions.data or []
        total_sessions = len(sessions)
        avg_score = 0.0
        if total_sessions > 0:
            avg_score = round(sum(float(s["percentage_score"] or 0.0) for s in sessions) / total_sessions, 2)
            
        # 3. Get badges count
        res_badges = supabase_client.table("badges").select("id", count="exact").eq("user_id", user_id).execute()
        badge_count = res_badges.count if res_badges.count is not None else 0
        
        return {
            "profile": profile,
            "total_sessions": total_sessions,
            "avg_score": avg_score,
            "badge_count": badge_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch profile metadata: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query user profile details."
        )
