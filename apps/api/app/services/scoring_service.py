# RoadSense AI — Scoring Service

from typing import List, Dict, Any, Tuple

class ScoringService:
    @staticmethod
    def calculate_decision_score(
        answer: str, 
        correct_answer: str, 
        reaction_time_ms: int
    ) -> Dict[str, Any]:
        """
        Calculates points earned for a single decision based on correctness and reaction time.
        """
        is_correct = (answer == correct_answer)
        was_timeout = (reaction_time_ms > 10000)
        was_impulsive = (reaction_time_ms < 1500)
        
        points = 0
        if was_timeout:
            points = 0
            is_correct = False
        elif is_correct:
            if reaction_time_ms < 2000:
                points = 100  # Lightning Fast
            elif reaction_time_ms < 4000:
                points = 85   # Quick Thinker
            elif reaction_time_ms < 7000:
                points = 65   # Good
            else:
                points = 40   # Slow
        else:
            points = 0
            
        return {
            "is_correct": is_correct,
            "points": points,
            "was_impulsive": was_impulsive,
            "was_timeout": was_timeout
        }

    @staticmethod
    def assign_grade(percentage_score: float) -> str:
        """
        Assigns grade based on percentage score.
        90-100% -> 'Expert'
        75-89%  -> 'Proficient'
        60-74%  -> 'Developing'
        0-59%   -> 'Beginner'
        """
        if percentage_score >= 90.0:
            return "Expert"
        elif percentage_score >= 75.0:
            return "Proficient"
        elif percentage_score >= 60.0:
            return "Developing"
        else:
            return "Beginner"

    @staticmethod
    def determine_risk_tendency(decisions: List[Dict[str, Any]]) -> str:
        """
        Evaluates user's risk tendency based on wrong answers:
        - Choosing CROSS_NOW when incorrect is 'RISKY'.
        - Choosing WAIT when correct was CROSS_NOW is 'CAUTIOUS'.
        If >40% wrong answers are risky -> 'RISKY'
        If >40% are cautious -> 'CAUTIOUS'
        Else -> 'BALANCED'
        """
        wrong_decisions = [d for d in decisions if not d["is_correct"]]
        if not wrong_decisions:
            return "BALANCED"

        risky_count = 0
        cautious_count = 0

        for d in wrong_decisions:
            ans = d.get("answer_given", "")
            correct = d.get("correct_answer", "")
            
            # User chose to cross when they should have waited/alerted
            if ans == "CROSS_NOW" and correct in {"WAIT", "WAIT_FOR_OTHERS", "ALERT_EMERGENCY"}:
                risky_count += 1
            # User chose to wait when they should have crossed
            elif ans in {"WAIT", "WAIT_FOR_OTHERS"} and correct == "CROSS_NOW":
                cautious_count += 1

        total_wrong = len(wrong_decisions)
        risky_pct = risky_count / total_wrong
        cautious_pct = cautious_count / total_wrong

        if risky_pct > 0.40:
            return "RISKY"
        elif cautious_pct > 0.40:
            return "CAUTIOUS"
        else:
            return "BALANCED"

    @classmethod
    def evaluate_session(
        cls, 
        user_id: str,
        level: int,
        decisions: List[Dict[str, Any]], 
        scenarios: Dict[str, Dict[str, Any]], # scenario_id -> scenario dict
        history: List[Dict[str, Any]] = None # Previous sessions
    ) -> Dict[str, Any]:
        """
        Processes a full session (5 decisions) to calculate grades, category scores,
        bonus points, risk tendencies, and badges.
        """
        total_questions = len(decisions)
        if total_questions == 0:
            return {}

        correct_count = sum(1 for d in decisions if d["is_correct"])
        avg_reaction_time = int(sum(d["reaction_time_ms"] for d in decisions) / total_questions)
        
        # Calculate base points
        base_score = sum(d["points_earned"] for d in decisions)
        
        # Calculate bonuses
        perfect_bonus = 50 if correct_count == total_questions else 0
        no_timeouts = 25 if all(not d.get("was_timeout", False) for d in decisions) else 0
        speed_bonus = 25 if avg_reaction_time < 3000 else 0
        
        total_score = base_score + perfect_bonus + no_timeouts + speed_bonus
        # Max base points is 500. Max bonuses = 100. Max possible is 600
        max_possible_score = (total_questions * 100) + 100
        
        percentage_score = round((correct_count / total_questions) * 100.0, 2)
        grade = cls.assign_grade(percentage_score)
        risk_tendency = cls.determine_risk_tendency(decisions)

        # Category scores
        # Map scenario_type to the required categories
        cat_mapping = {
            "signal": "signal_knowledge",
            "vehicle": "risk_detection",
            "blind_spot": "situation_awareness",
            "pedestrian": "pedestrian_rules",
            "emergency": "emergency_protocol",
            "multiHazard": "risk_management"
        }
        
        cat_stats = {cat: {"correct": 0, "total": 0} for cat in cat_mapping.values()}
        
        for d in decisions:
            sid = d["scenario_id"]
            scenario = scenarios.get(str(sid), {})
            stype = scenario.get("scenario_type", "vehicle")
            cat = cat_mapping.get(stype, "risk_detection")
            
            cat_stats[cat]["total"] += 1
            if d["is_correct"]:
                cat_stats[cat]["correct"] += 1
                
        category_scores_list = []
        weakest_category = "risk_detection"
        lowest_pct = 101.0
        
        for cat, stats in cat_stats.items():
            if stats["total"] > 0:
                pct = round((stats["correct"] / stats["total"]) * 100.0, 2)
                category_scores_list.append({
                    "category": cat,
                    "correct": stats["correct"],
                    "total": stats["total"],
                    "percentage": pct
                })
                if pct < lowest_pct:
                    lowest_pct = pct
                    weakest_category = cat
            else:
                category_scores_list.append({
                    "category": cat,
                    "correct": 0,
                    "total": 0,
                    "percentage": 0.0
                })

        # Personalized tip based on weakest category
        tip_mapping = {
            "signal_knowledge": "Practice identifying signal phases and always wait for a solid green.",
            "risk_detection": "Scan left, right, then left again before making any decision near a road.",
            "situation_awareness": "Look for all objects in the scene — not just the most obvious one.",
            "risk_management": "When in doubt, the safest choice is always to wait.",
            "pedestrian_rules": "Always look for pedestrian signs and use zebra crossings when available.",
            "emergency_protocol": "Emergency vehicles always have right of way. Stop and let them pass."
        }
        improvement_tip = tip_mapping.get(weakest_category, "Always stay alert on the road.")

        # Evaluate Badges
        badges_to_award = []
        
        # 1. First Step
        is_first_session = (not history or len(history) == 0)
        if is_first_session:
            badges_to_award.append({
                "badge_type": "First Step",
                "badge_name": "First Step",
                "badge_description": "Completed your first road safety session!",
                "icon_emoji": "🚶"
            })
            
        # 2. Consistent (5 sessions total)
        total_sessions_count = 1 + (len(history) if history else 0)
        if total_sessions_count == 5:
            badges_to_award.append({
                "badge_type": "Consistent",
                "badge_name": "Consistent Learner",
                "badge_description": "Completed 5 full road safety sessions!",
                "icon_emoji": "📅"
            })
            
        # 3. Perfect Round (All 5 correct)
        if correct_count == total_questions:
            badges_to_award.append({
                "badge_type": "Perfect Round",
                "badge_name": "Perfect Round",
                "badge_description": "Answered all questions correctly in a session!",
                "icon_emoji": "🎯"
            })

        # 4. Safety Champion (Score > 90% accuracy)
        if percentage_score >= 90.0:
            badges_to_award.append({
                "badge_type": "Safety Champion",
                "badge_name": "Safety Champion",
                "badge_description": "Achieved a score of 90% or higher!",
                "icon_emoji": "🏆"
            })

        # 5. Speed Thinker (Avg reaction < 2.5s)
        if avg_reaction_time < 2500 and correct_count >= 4:
            badges_to_award.append({
                "badge_type": "Speed Thinker",
                "badge_name": "Speed Thinker",
                "badge_description": "Average reaction time under 2.5 seconds with high accuracy!",
                "icon_emoji": "⚡"
            })

        # 6. Signal Master (5/5 correct in signal_knowledge)
        if cat_stats["signal_knowledge"]["correct"] == 5 or (cat_stats["signal_knowledge"]["total"] > 0 and cat_stats["signal_knowledge"]["correct"] == cat_stats["signal_knowledge"]["total"] and cat_stats["signal_knowledge"]["correct"] >= 2):
            # Let's check: if we got all correct in signal knowledge (at least 2)
            badges_to_award.append({
                "badge_type": "Signal Master",
                "badge_name": "Signal Master",
                "badge_description": "Perfect score on traffic light scenarios!",
                "icon_emoji": "🚦"
            })

        # 7. Level 3 Cleared
        if level == 3 and percentage_score >= 60.0:
            badges_to_award.append({
                "badge_type": "Level 3 Cleared",
                "badge_name": "Road Graduate",
                "badge_description": "Completed Level 3 with a passing score!",
                "icon_emoji": "🎓"
            })

        # 8. Comeback Kid (Score improves > 20% compared to previous session)
        if history and len(history) > 0:
            last_session = history[0] # Assumed sorted descending by date
            last_pct = float(last_session.get("percentage_score", 0.0))
            if percentage_score > last_pct + 20.0:
                badges_to_award.append({
                    "badge_type": "Comeback Kid",
                    "badge_name": "Comeback Kid",
                    "badge_description": "Improved score by more than 20% from your last session!",
                    "icon_emoji": "🔥"
                })

        # 9. Risk Aware (Identify all HIGH/CRITICAL risk scenarios correctly)
        high_risk_correct = True
        high_risk_questions_seen = 0
        for d in decisions:
            sid = d["scenario_id"]
            scenario = scenarios.get(str(sid), {})
            rlevel = scenario.get("risk_level", "LOW")
            if rlevel in {"HIGH", "CRITICAL"}:
                high_risk_questions_seen += 1
                if not d["is_correct"]:
                    high_risk_correct = False
        if high_risk_questions_seen > 0 and high_risk_correct:
            badges_to_award.append({
                "badge_type": "Risk Aware",
                "badge_name": "Risk Aware",
                "badge_description": "Correctly decided in all high-risk scenarios!",
                "icon_emoji": "🛡️"
            })

        # 10. Quick Learner (Improve score in 3 consecutive sessions)
        if history and len(history) >= 2:
            prev1 = float(history[0].get("percentage_score", 0.0))
            prev2 = float(history[1].get("percentage_score", 0.0))
            if percentage_score > prev1 and prev1 > prev2:
                badges_to_award.append({
                    "badge_type": "Quick Learner",
                    "badge_name": "Quick Learner",
                    "badge_description": "Improved your score for three consecutive sessions!",
                    "icon_emoji": "📈"
                })

        return {
            "total_score": total_score,
            "max_possible_score": max_possible_score,
            "percentage_score": percentage_score,
            "avg_reaction_time_ms": avg_reaction_time,
            "risk_tendency": risk_tendency,
            "grade": grade,
            "category_scores": category_scores_list,
            "badges_earned": badges_to_award,
            "improvement_tip": improvement_tip
        }
