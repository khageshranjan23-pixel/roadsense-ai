# RoadSense AI — Safety Engine Tests

import pytest
from app.cv.safety_engine import SafetyEngine

def test_rule_1_emergency_vehicle():
    """
    Rule 1: Emergency vehicle detected and approaching -> ALERT_EMERGENCY
    """
    analysis = {
        "objects": [
            {"class_name": "ambulance", "direction": "toward_crossing", "distance": 150.0, "speed": 15.0},
            {"class_name": "car", "direction": "lateral", "distance": 300.0, "speed": 5.0}
        ],
        "traffic_light_color": "green",
        "fastest_vehicle_speed": 15.0,
        "closest_vehicle_distance": 150.0,
        "pedestrians_on_crossing": 0,
        "scene_complexity": "moderate"
    }
    
    result = SafetyEngine.compute_ground_truth(analysis)
    assert result["correct_answer"] == "ALERT_EMERGENCY"
    assert "Emergency vehicle" in result["explanation"]

def test_rule_2_red_signal():
    """
    Rule 2: Signal is red -> WAIT
    """
    analysis = {
        "objects": [],
        "traffic_light_color": "red",
        "fastest_vehicle_speed": 0.0,
        "closest_vehicle_distance": 999.0,
        "pedestrians_on_crossing": 0,
        "scene_complexity": "simple"
    }
    
    result = SafetyEngine.compute_ground_truth(analysis)
    assert result["correct_answer"] == "WAIT"
    assert "Signal is red" in result["explanation"]

def test_rule_3_speeding_vehicle_approaching():
    """
    Rule 3: Speeding vehicle toward crossing and close -> WAIT
    """
    analysis = {
        "objects": [
            {"class_name": "car", "direction": "toward_crossing", "distance": 120.0, "speed": 14.0}
        ],
        "traffic_light_color": "green",
        "fastest_vehicle_speed": 14.0,
        "closest_vehicle_distance": 120.0,
        "pedestrians_on_crossing": 0,
        "scene_complexity": "simple"
    }
    
    result = SafetyEngine.compute_ground_truth(analysis)
    assert result["correct_answer"] == "WAIT"
    assert "approaching too fast" in result["explanation"]

def test_rule_4_pedestrians_crossing():
    """
    Rule 4: Pedestrians on crossing -> WAIT_FOR_OTHERS
    """
    analysis = {
        "objects": [
            {"class_name": "person", "bbox": [100, 150, 120, 250]} # center y overlaps crossing line
        ],
        "traffic_light_color": "green",
        "fastest_vehicle_speed": 0.0,
        "closest_vehicle_distance": 999.0,
        "pedestrians_on_crossing": 1,
        "scene_complexity": "simple"
    }
    
    result = SafetyEngine.compute_ground_truth(analysis)
    assert result["correct_answer"] == "WAIT_FOR_OTHERS"
    assert "Others are still crossing" in result["explanation"]

def test_rule_5_cross_now():
    """
    Rule 5: Signal is green AND no fast vehicles close -> CROSS_NOW
    """
    analysis = {
        "objects": [
            {"class_name": "car", "direction": "away_from_crossing", "distance": 350.0, "speed": 3.0}
        ],
        "traffic_light_color": "green",
        "fastest_vehicle_speed": 3.0,
        "closest_vehicle_distance": 350.0,
        "pedestrians_on_crossing": 0,
        "scene_complexity": "simple"
    }
    
    result = SafetyEngine.compute_ground_truth(analysis)
    assert result["correct_answer"] == "CROSS_NOW"
    assert "Signal is green and road is clear" in result["explanation"]

def test_rule_6_default_wait():
    """
    Rule 6: Default fallback -> WAIT
    """
    analysis = {
        "objects": [],
        "traffic_light_color": "none",
        "fastest_vehicle_speed": 0.0,
        "closest_vehicle_distance": 999.0,
        "pedestrians_on_crossing": 0,
        "scene_complexity": "simple"
    }
    
    result = SafetyEngine.compute_ground_truth(analysis)
    assert result["correct_answer"] == "WAIT"
    assert "unsure, always wait" in result["explanation"]

def test_risk_level_calculations():
    # Critical risk
    c1 = SafetyEngine.compute_risk_level({
        "objects": [{"class_name": "ambulance", "direction": "toward_crossing"}],
        "traffic_light_color": "green",
        "closest_vehicle_distance": 10.0,
        "fastest_vehicle_speed": 15.0,
        "scene_complexity": "simple"
    })
    assert c1 == "CRITICAL"
    
    # High risk
    c2 = SafetyEngine.compute_risk_level({
        "objects": [{"class_name": "car", "direction": "toward_crossing", "distance": 120.0}],
        "traffic_light_color": "red",
        "closest_vehicle_distance": 120.0,
        "fastest_vehicle_speed": 5.0,
        "scene_complexity": "simple"
    })
    assert c2 == "HIGH"
    
    # Medium risk
    c3 = SafetyEngine.compute_risk_level({
        "objects": [],
        "traffic_light_color": "yellow",
        "closest_vehicle_distance": 999.0,
        "fastest_vehicle_speed": 0.0,
        "scene_complexity": "moderate"
    })
    assert c3 == "MEDIUM"
    
    # Low risk
    c4 = SafetyEngine.compute_risk_level({
        "objects": [],
        "traffic_light_color": "green",
        "closest_vehicle_distance": 500.0,
        "fastest_vehicle_speed": 2.0,
        "scene_complexity": "simple"
    })
    assert c4 == "LOW"
