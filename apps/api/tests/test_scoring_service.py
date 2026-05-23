# RoadSense AI — Scoring Service Tests

import pytest
from app.services.scoring_service import ScoringService

def test_calculate_decision_score_correct():
    """
    Test various reaction time bands for correct answers.
    """
    # Lightning Fast (<2s) -> 100
    r1 = ScoringService.calculate_decision_score("WAIT", "WAIT", 1200)
    assert r1["is_correct"] is True
    assert r1["points"] == 100
    assert r1["was_impulsive"] is True
    assert r1["was_timeout"] is False

    # Quick Thinker (<4s) -> 85
    r2 = ScoringService.calculate_decision_score("CROSS_NOW", "CROSS_NOW", 3000)
    assert r2["is_correct"] is True
    assert r2["points"] == 85
    assert r2["was_impulsive"] is False
    assert r2["was_timeout"] is False

    # Good (<7s) -> 65
    r3 = ScoringService.calculate_decision_score("WAIT", "WAIT", 5000)
    assert r3["is_correct"] is True
    assert r3["points"] == 65

    # Slow (<=10s) -> 40
    r4 = ScoringService.calculate_decision_score("WAIT", "WAIT", 8500)
    assert r4["is_correct"] is True
    assert r4["points"] == 40

def test_calculate_decision_score_incorrect():
    # Incorrect -> 0
    r = ScoringService.calculate_decision_score("CROSS_NOW", "WAIT", 2000)
    assert r["is_correct"] is False
    assert r["points"] == 0

def test_calculate_decision_score_timeout():
    # Timeout (>10s) -> 0
    r = ScoringService.calculate_decision_score("WAIT", "WAIT", 11000)
    assert r["is_correct"] is False
    assert r["points"] == 0
    assert r["was_timeout"] is True

def test_assign_grade():
    assert ScoringService.assign_grade(95.0) == "Expert"
    assert ScoringService.assign_grade(85.0) == "Proficient"
    assert ScoringService.assign_grade(70.0) == "Developing"
    assert ScoringService.assign_grade(45.0) == "Beginner"

def test_determine_risk_tendency():
    # Risky tendency: wrong choice, user crossed when they shouldn't
    decisions = [
        {"is_correct": False, "answer_given": "CROSS_NOW", "correct_answer": "WAIT"},
        {"is_correct": False, "answer_given": "CROSS_NOW", "correct_answer": "WAIT_FOR_OTHERS"},
        {"is_correct": True, "answer_given": "WAIT", "correct_answer": "WAIT"}
    ]
    assert ScoringService.determine_risk_tendency(decisions) == "RISKY"

    # Cautious tendency: wrong choice, user waited when they should have crossed
    decisions2 = [
        {"is_correct": False, "answer_given": "WAIT", "correct_answer": "CROSS_NOW"},
        {"is_correct": False, "answer_given": "WAIT_FOR_OTHERS", "correct_answer": "CROSS_NOW"}
    ]
    assert ScoringService.determine_risk_tendency(decisions2) == "CAUTIOUS"

    # Balanced tendency
    decisions3 = [
        {"is_correct": True, "answer_given": "CROSS_NOW", "correct_answer": "CROSS_NOW"}
    ]
    assert ScoringService.determine_risk_tendency(decisions3) == "BALANCED"

def test_evaluate_session():
    decisions = [
        {"scenario_id": "s1", "is_correct": True, "reaction_time_ms": 2500, "points_earned": 85},
        {"scenario_id": "s2", "is_correct": True, "reaction_time_ms": 2800, "points_earned": 85},
        {"scenario_id": "s3", "is_correct": True, "reaction_time_ms": 3200, "points_earned": 85},
        {"scenario_id": "s4", "is_correct": True, "reaction_time_ms": 1800, "points_earned": 100},
        {"scenario_id": "s5", "is_correct": True, "reaction_time_ms": 2200, "points_earned": 85}
    ]
    
    scenarios = {
        "s1": {"scenario_type": "signal", "risk_level": "LOW"},
        "s2": {"scenario_type": "signal", "risk_level": "LOW"},
        "s3": {"scenario_type": "vehicle", "risk_level": "MEDIUM"},
        "s4": {"scenario_type": "pedestrian", "risk_level": "LOW"},
        "s5": {"scenario_type": "emergency", "risk_level": "HIGH"}
    }
    
    # 5/5 correct, avg speed < 3000ms -> +50 perfect, +25 no timeout, +25 speed bonus
    res = ScoringService.evaluate_session("u1", 1, decisions, scenarios)
    assert res["percentage_score"] == 100.0
    assert res["grade"] == "Expert"
    assert res["total_score"] == (85 + 85 + 85 + 100 + 85) + 50 + 25 + 25
    
    # Verify badges awarded
    badge_types = [b["badge_type"] for b in res["badges_earned"]]
    assert "Perfect Round" in badge_types
    assert "Safety Champion" in badge_types
    assert "Speed Thinker" in badge_types
    assert "First Step" in badge_types # Since history is empty
