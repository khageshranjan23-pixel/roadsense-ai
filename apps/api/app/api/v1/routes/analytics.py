# RoadSense AI — Analytics and Dashboard Endpoints

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import supabase_client
from app.core.security import get_current_user, require_roles
from loguru import logger
import datetime

router = APIRouter()

@router.get("/student/{user_id}")
def get_student_analytics(
    user_id: str,
    user = Depends(get_current_user)
):
    """
    Returns detailed analytics for a single student profile.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is offline."
        )

    try:
        # 1. Fetch completed sessions
        res_sessions = supabase_client.table("game_sessions")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("status", "completed")\
            .order("completed_at", desc=False)\
            .execute()
            
        sessions = res_sessions.data or []
        sessions_played = len(sessions)
        
        if sessions_played == 0:
            return {
                "sessions_played": 0,
                "avg_score": 0.0,
                "best_score": 0.0,
                "score_over_time": [],
                "category_averages": {},
                "strongest_category": "none",
                "weakest_category": "none",
                "total_badges": 0,
                "risk_tendency_history": [],
                "improvement_rate": 0.0
            }

        # Calculations
        scores = [float(s["percentage_score"] or 0.0) for s in sessions]
        avg_score = round(sum(scores) / sessions_played, 2)
        best_score = max(scores)
        
        score_over_time = []
        for s in sessions:
            dt = s.get("completed_at", "")
            date_str = dt.split("T")[0] if dt else ""
            score_over_time.append({
                "date": date_str,
                "score": float(s["percentage_score"] or 0.0)
            })

        # Category Averages
        session_ids = [s["id"] for s in sessions]
        res_cats = supabase_client.table("category_scores")\
            .select("category, percentage")\
            .in_("session_id", session_ids)\
            .execute()
            
        cat_data = res_cats.data or []
        cat_sums = {}
        cat_counts = {}
        
        for item in cat_data:
            cat = item["category"]
            pct = float(item["percentage"] or 0.0)
            cat_sums[cat] = cat_sums.get(cat, 0.0) + pct
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
            
        category_averages = {}
        for cat in cat_sums:
            category_averages[cat] = round(cat_sums[cat] / cat_counts[cat], 2)
            
        strongest_category = max(category_averages, key=category_averages.get) if category_averages else "none"
        weakest_category = min(category_averages, key=category_averages.get) if category_averages else "none"

        # Badge count
        res_badges = supabase_client.table("badges").select("id", count="exact").eq("user_id", user_id).execute()
        total_badges = res_badges.count if res_badges.count is not None else 0

        # Risk tendency history (last 5 sessions)
        risk_tendency_history = [s["risk_tendency"] for s in sessions[-5:] if s.get("risk_tendency")]

        # Improvement rate (last 3 sessions avg vs first 3 sessions avg)
        improvement_rate = 0.0
        if sessions_played >= 2:
            first_3 = scores[:3]
            last_3 = scores[-3:]
            avg_first = sum(first_3) / len(first_3)
            avg_last = sum(last_3) / len(last_3)
            improvement_rate = round(avg_last - avg_first, 2)

        return {
            "sessions_played": sessions_played,
            "avg_score": avg_score,
            "best_score": best_score,
            "score_over_time": score_over_time,
            "category_averages": category_averages,
            "strongest_category": strongest_category,
            "weakest_category": weakest_category,
            "total_badges": total_badges,
            "risk_tendency_history": risk_tendency_history,
            "improvement_rate": improvement_rate
        }

    except Exception as e:
        logger.error(f"Failed to fetch student analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query student analytics."
        )

@router.get("/class/{school_id}", dependencies=[Depends(require_roles(["teacher", "admin"]))])
def get_class_analytics(
    school_id: str,
    user = Depends(get_current_user)
):
    """
    Returns analytics for a class/school (available only to teachers and admins).
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is offline."
        )

    try:
        # 1. Fetch students in the school
        res_students = supabase_client.table("profiles").select("*").eq("school_id", school_id).eq("role", "student").execute()
        students = res_students.data or []
        student_count = len(students)
        
        if student_count == 0:
            return {
                "student_count": 0,
                "avg_class_score": 0.0,
                "score_distribution": {"Expert": 0, "Proficient": 0, "Developing": 0, "Beginner": 0},
                "category_class_averages": {},
                "highest_risk_students": [],
                "most_challenging_scenario_type": "none",
                "engagement_rate": 0.0
            }
            
        student_ids = [s["id"] for s in students]
        
        # 2. Fetch all completed sessions for these students
        res_sessions = supabase_client.table("game_sessions")\
            .select("*")\
            .in_("user_id", student_ids)\
            .eq("status", "completed")\
            .execute()
            
        sessions = res_sessions.data or []
        total_sessions = len(sessions)
        
        avg_class_score = 0.0
        score_distribution = {"Expert": 0, "Proficient": 0, "Developing": 0, "Beginner": 0}
        
        # Student specific scores to identify lowest scorers
        student_scores = {}
        student_sessions_count = {}
        
        for s in sessions:
            uid = s["user_id"]
            pct = float(s["percentage_score"] or 0.0)
            student_scores[uid] = student_scores.get(uid, 0.0) + pct
            student_sessions_count[uid] = student_sessions_count.get(uid, 0) + 1
            
            grade = s.get("grade", "Beginner")
            if grade in score_distribution:
                score_distribution[grade] += 1
                
        if total_sessions > 0:
            avg_class_score = round(sum(float(s["percentage_score"] or 0.0) for s in sessions) / total_sessions, 2)
            
        # Calculate student average scores and find highest risk (bottom 20%)
        student_averages = []
        students_played_count = 0
        for s_profile in students:
            uid = s_profile["id"]
            if uid in student_scores:
                avg = student_scores[uid] / student_sessions_count[uid]
                student_averages.append({
                    "profile": s_profile,
                    "avg_score": avg,
                    "sessions_played": student_sessions_count[uid]
                })
                if student_sessions_count[uid] >= 3:
                    students_played_count += 1
            else:
                student_averages.append({
                    "profile": s_profile,
                    "avg_score": 0.0,
                    "sessions_played": 0
                })
                
        # Sort ascending by score
        student_averages.sort(key=lambda x: x["avg_score"])
        
        # Bottom 20% scorers
        num_at_risk = max(1, int(len(student_averages) * 0.20))
        highest_risk_students = [item["profile"] for item in student_averages[:num_at_risk]]

        # Category Class Averages
        category_class_averages = {}
        if total_sessions > 0:
            session_ids = [s["id"] for s in sessions]
            res_cats = supabase_client.table("category_scores")\
                .select("category, percentage")\
                .in_("session_id", session_ids)\
                .execute()
                
            cat_data = res_cats.data or []
            sums = {}
            counts = {}
            for item in cat_data:
                cat = item["category"]
                pct = float(item["percentage"] or 0.0)
                sums[cat] = sums.get(cat, 0.0) + pct
                counts[cat] = counts.get(cat, 0) + 1
                
            for cat in sums:
                category_class_averages[cat] = round(sums[cat] / counts[cat], 2)

        # Most challenging scenario type (lowest average category score)
        most_challenging = "none"
        if category_class_averages:
            most_challenging = min(category_class_averages, key=category_class_averages.get)

        # Engagement rate (% of students playing > 3 sessions)
        engagement_rate = round((students_played_count / student_count) * 100.0, 2)

        return {
            "student_count": student_count,
            "avg_class_score": avg_class_score,
            "score_distribution": score_distribution,
            "category_class_averages": category_class_averages,
            "highest_risk_students": highest_risk_students,
            "most_challenging_scenario_type": most_challenging,
            "engagement_rate": engagement_rate
        }

    except Exception as e:
        logger.error(f"Failed to fetch class analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query class analytics."
        )

@router.get("/platform", dependencies=[Depends(require_roles(["admin"]))])
def get_platform_analytics(
    user = Depends(get_current_user)
):
    """
    Returns platform-wide metrics (Admin only).
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is offline."
        )

    try:
        # Total counts
        res_users = supabase_client.table("profiles").select("id", count="exact").execute()
        total_users = res_users.count
        
        res_sessions = supabase_client.table("game_sessions").select("id", count="exact").eq("status", "completed").execute()
        total_sessions = res_sessions.count
        
        res_decisions = supabase_client.table("decisions").select("id", count="exact").execute()
        total_decisions = res_decisions.count

        # Average score by level
        res_lvl = supabase_client.table("game_sessions")\
            .select("level, percentage_score")\
            .eq("status", "completed")\
            .execute()
            
        lvls = res_lvl.data or []
        lvl_sums = {1: 0.0, 2: 0.0, 3: 0.0}
        lvl_cnts = {1: 0, 2: 0, 3: 0}
        
        for item in lvls:
            lvl = int(item["level"])
            pct = float(item["percentage_score"] or 0.0)
            if lvl in lvl_sums:
                lvl_sums[lvl] += pct
                lvl_cnts[lvl] += 1
                
        avg_scores_by_level = {}
        for lvl in lvl_sums:
            avg_scores_by_level[str(lvl)] = round(lvl_sums[lvl] / lvl_cnts[lvl], 2) if lvl_cnts[lvl] > 0 else 0.0

        # Top schools leaderboard
        res_schools = supabase_client.table("schools").select("id, name").execute()
        schools = res_schools.data or []
        
        top_schools = []
        for school in schools:
            # Query profiles
            res_sp = supabase_client.table("profiles").select("id").eq("school_id", school["id"]).eq("role", "student").execute()
            s_ids = [p["id"] for p in (res_sp.data or [])]
            
            if s_ids:
                res_ss = supabase_client.table("game_sessions").select("percentage_score").in_("user_id", s_ids).eq("status", "completed").execute()
                s_sessions = res_ss.data or []
                if s_sessions:
                    s_avg = round(sum(float(s["percentage_score"] or 0.0) for s in s_sessions) / len(s_sessions), 2)
                    top_schools.append({
                        "school_id": school["id"],
                        "name": school["name"],
                        "avg_score": s_avg,
                        "students": len(s_ids)
                    })
                    
        top_schools.sort(key=lambda x: x["avg_score"], reverse=True)

        return {
            "total_users": total_users,
            "total_sessions": total_sessions,
            "total_decisions": total_decisions,
            "daily_active_users": [], # Mock or query active logs if exists
            "avg_scores_by_level": avg_scores_by_level,
            "scenario_completion_rates": {},
            "most_failed_scenarios": [],
            "top_schools": top_schools[:5]
        }

    except Exception as e:
        logger.error(f"Failed to fetch platform analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query platform-wide analytics."
        )
