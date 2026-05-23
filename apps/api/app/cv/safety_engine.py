# RoadSense AI — Safety Engine

from typing import Dict, Any, List

class SafetyEngine:
    @staticmethod
    def compute_ground_truth(analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Computes the correct decision based on scene analysis parameters.
        Returns: {
            "correct_answer": "WAIT" | "CROSS_NOW" | "WAIT_FOR_OTHERS" | "ALERT_EMERGENCY",
            "explanation": str
        }
        """
        objects = analysis.get("objects", [])
        traffic_light_color = analysis.get("traffic_light_color", "none")
        fastest_vehicle_speed = analysis.get("fastest_vehicle_speed", 0.0)
        closest_vehicle_distance = analysis.get("closest_vehicle_distance", 999.0)
        pedestrians_on_crossing = analysis.get("pedestrians_on_crossing", 0)

        # Rule 1: Emergency vehicle detected and approaching
        for obj in objects:
            cname = obj.get("class_name", "").lower()
            if cname in {"ambulance", "fire truck", "fire_truck", "police"}:
                direction = obj.get("direction", "lateral")
                dist = obj.get("distance", 999.0)
                if direction == "toward_crossing" or dist < 250.0:
                    return {
                        "correct_answer": "ALERT_EMERGENCY",
                        "explanation": "Emergency vehicle approaching! Always stop and let them pass."
                    }

        # Rule 2: Signal color is RED
        if traffic_light_color == "red":
            return {
                "correct_answer": "WAIT",
                "explanation": "Signal is red. Never cross on red."
            }

        # Rule 3: Fast vehicle approaching
        # If any vehicle is moving toward the crossing fast and is close
        for obj in objects:
            cname = obj.get("class_name", "")
            if cname in {"car", "bus", "truck", "motorcycle", "bicycle"}:
                speed = obj.get("speed", 0.0)
                direction = obj.get("direction", "")
                dist = obj.get("distance", 999.0)
                if speed > 12.0 and direction == "toward_crossing" and dist < 200.0:
                    return {
                        "correct_answer": "WAIT",
                        "explanation": f"A {cname} is approaching too fast. Wait for it to pass."
                    }

        # Rule 4: Pedestrians on crossing
        if pedestrians_on_crossing > 0:
            return {
                "correct_answer": "WAIT_FOR_OTHERS",
                "explanation": "Others are still crossing. Wait for the crossing to be fully clear."
            }

        # Rule 5: Signal color is GREEN and no fast approaching vehicle within 200px
        # We also check that the signal isn't red, and closest vehicle is far
        if traffic_light_color == "green" and closest_vehicle_distance > 200.0 and fastest_vehicle_speed <= 12.0:
            return {
                "correct_answer": "CROSS_NOW",
                "explanation": "Signal is green and road is clear. Cross safely."
            }

        # Rule 6: Default Wait
        return {
            "correct_answer": "WAIT",
            "explanation": "When unsure, always wait and observe the traffic."
        }

    @staticmethod
    def compute_risk_level(analysis: Dict[str, Any]) -> str:
        """
        Determines risk level based on scene factors:
        'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
        """
        objects = analysis.get("objects", [])
        traffic_light_color = analysis.get("traffic_light_color", "none")
        closest_vehicle_distance = analysis.get("closest_vehicle_distance", 999.0)
        fastest_vehicle_speed = analysis.get("fastest_vehicle_speed", 0.0)
        complexity = analysis.get("scene_complexity", "simple")

        # 1. CRITICAL
        # Emergency vehicle approaching, or vehicle extremely close and fast
        for obj in objects:
            cname = obj.get("class_name", "").lower()
            if cname in {"ambulance", "fire truck", "fire_truck"} and obj.get("direction") == "toward_crossing":
                return "CRITICAL"
        if closest_vehicle_distance < 80.0 and fastest_vehicle_speed > 10.0:
            return "CRITICAL"

        # 2. HIGH
        # Red light but closest vehicle is close, or close approaching vehicles
        if traffic_light_color == "red" and closest_vehicle_distance < 150.0:
            return "HIGH"
        for obj in objects:
            if obj.get("direction") == "toward_crossing" and obj.get("distance", 999.0) < 150.0:
                return "HIGH"

        # 3. MEDIUM
        # Moderate complexity, yellow light, or vehicles are at medium distance
        if traffic_light_color == "yellow" or complexity == "moderate" or closest_vehicle_distance < 250.0:
            return "MEDIUM"

        # 4. LOW
        # Green light, slow vehicles, far away, simple scene
        return "LOW"
