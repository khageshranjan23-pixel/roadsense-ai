# RoadSense AI — Scenario Service

from typing import Dict, Any, List
import json
from app.services.gemini_service import GeminiService

class ScenarioService:
    def __init__(self, supabase_client=None):
        self.gemini = GeminiService()
        self.supabase = supabase_client

    async def generate_scenario(
        self, 
        level: int, 
        scenario_type: str, 
        context: str = None
    ) -> Dict[str, Any]:
        """
        Uses Gemini 2.0 Flash to dynamically generate a road safety scenario
        and saves it to the Supabase database.
        """
        # Validate inputs
        if level not in {1, 2, 3}:
            level = 1
        valid_types = {'signal', 'pedestrian', 'vehicle', 'blind_spot', 'emergency', 'multiHazard'}
        if scenario_type not in valid_types:
            scenario_type = 'vehicle'
            
        prompt = f"""
        Generate a road safety scenario for level {level}.
        Return ONLY valid JSON. Do not include markdown code block formatting like ```json or ```.
        
        The scenario must reflect a realistic Indian road context. Include elements like:
        auto-rickshaws, two-wheelers, pedestrians walking on side streets, narrow school zones, or cows on the street.
        The scenario test category is: {scenario_type}.
        
        Difficulty scaling based on level {level}:
        - Level 1: Simple situation, one clear cue, slow traffic, clear weather.
        - Level 2: Moderate traffic speed, yellow signals, or dual objects (e.g., car + cyclist).
        - Level 3: Complex multi-hazard (e.g., speeding vehicle during rain at night, emergency vehicles, or blind spots).
        
        The JSON must strictly conform to the following schema:
        {{
          "title": "A short, engaging title suitable for children (e.g., 'The Rickshaw Rush')",
          "description": "A description of the starting scenario environment (e.g., 'You are standing near a school crossing. An auto-rickshaw is approaching from the right...')",
          "level": {level},
          "scenario_type": "{scenario_type}",
          "parameters": {{
            "vehicle_speed": "slow",
            "vehicle_type": "auto",
            "vehicle_direction": "right_left",
            "signal_color": "none",
            "pedestrians_present": false,
            "time_of_day": "day",
            "weather": "clear",
            "num_vehicles": 1
          }},
          "correct_answer": "WAIT",
          "explanation": "A concise, child-friendly explanation of the safety rule. Explain exactly why they should wait, cross, etc.",
          "wrong_answers": [
            "CROSS_NOW",
            "ALERT_EMERGENCY",
            "WAIT_FOR_OTHERS"
          ],
          "risk_level": "LOW"
        }}
        
        Note:
        - "parameters.vehicle_speed" must be one of: 'slow', 'medium', 'fast'.
        - "parameters.vehicle_type" must be one of: 'car', 'bus', 'truck', 'bike', 'auto'.
        - "parameters.vehicle_direction" must be one of: 'left_right', 'right_left', 'toward', 'away'.
        - "parameters.signal_color" must be one of: 'red', 'green', 'yellow', 'none'.
        - "parameters.time_of_day" must be one of: 'day', 'dusk', 'night'.
        - "parameters.weather" must be one of: 'clear', 'rain', 'fog'.
        - "correct_answer" must be one of: 'WAIT', 'CROSS_NOW', 'WAIT_FOR_OTHERS', 'ALERT_EMERGENCY'.
        - "risk_level" must be one of: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'.
        - "wrong_answers" must be a list containing exactly the three other choices from the correct_answer list, so that there are 4 unique choices in total.
        
        Additional context: {context if context else 'None'}
        """
        
        try:
            scenario_data = self.gemini.generate_json(prompt)
            # Add database source
            scenario_data["source"] = "ai_generated"
            scenario_data["is_active"] = True
            
            # Save to database if client is active
            if self.supabase:
                result = self.supabase.table("scenarios").insert(scenario_data).execute()
                if result.data:
                    return result.data[0]
            
            return scenario_data
            
        except Exception as e:
            # Fallback if AI generation fails
            fallback = self.get_fallback_scenario(level, scenario_type)
            if self.supabase:
                try:
                    result = self.supabase.table("scenarios").insert(fallback).execute()
                    if result.data:
                        return result.data[0]
                except:
                    pass
            return fallback

    def get_fallback_scenario(self, level: int, scenario_type: str) -> Dict[str, Any]:
        """
        Returns a hardcoded fallback scenario in case Gemini fails.
        """
        fallbacks = {
            "signal": {
                "title": "Red Light Stop",
                "description": "You are at a pedestrian crossing. The traffic light is red, but there are no cars on the road.",
                "level": 1,
                "scenario_type": "signal",
                "parameters": {
                    "vehicle_speed": "slow",
                    "vehicle_type": "car",
                    "vehicle_direction": "left_right",
                    "signal_color": "red",
                    "pedestrians_present": False,
                    "time_of_day": "day",
                    "weather": "clear",
                    "num_vehicles": 0
                },
                "correct_answer": "WAIT",
                "explanation": "Signal is red. Never cross on red, even if the road looks clear.",
                "wrong_answers": ["CROSS_NOW", "WAIT_FOR_OTHERS", "ALERT_EMERGENCY"],
                "risk_level": "MEDIUM",
                "source": "manual",
                "is_active": True
            },
            "pedestrian": {
                "title": "Busy Zebra Crossing",
                "description": "You are standing at a zebra crossing. Other kids are crossing, but the signal light is yellow.",
                "level": 2,
                "scenario_type": "pedestrian",
                "parameters": {
                    "vehicle_speed": "slow",
                    "vehicle_type": "auto",
                    "vehicle_direction": "right_left",
                    "signal_color": "yellow",
                    "pedestrians_present": True,
                    "time_of_day": "day",
                    "weather": "clear",
                    "num_vehicles": 1
                },
                "correct_answer": "WAIT_FOR_OTHERS",
                "explanation": "Always wait for pedestrians in front of you to clear the road and ensure all vehicles have fully stopped.",
                "wrong_answers": ["CROSS_NOW", "WAIT", "ALERT_EMERGENCY"],
                "risk_level": "MEDIUM",
                "source": "manual",
                "is_active": True
            },
            "vehicle": {
                "title": "Speeding Auto-Rickshaw",
                "description": "A yellow auto-rickshaw is driving very fast towards the pedestrian crossing. The signal just turned green.",
                "level": 2,
                "scenario_type": "vehicle",
                "parameters": {
                    "vehicle_speed": "fast",
                    "vehicle_type": "auto",
                    "vehicle_direction": "toward",
                    "signal_color": "green",
                    "pedestrians_present": False,
                    "time_of_day": "day",
                    "weather": "clear",
                    "num_vehicles": 1
                },
                "correct_answer": "WAIT",
                "explanation": "Even if the light is green, wait for fast approaching vehicles to stop before crossing.",
                "wrong_answers": ["CROSS_NOW", "WAIT_FOR_OTHERS", "ALERT_EMERGENCY"],
                "risk_level": "HIGH",
                "source": "manual",
                "is_active": True
            },
            "emergency": {
                "title": "Siren in the Rain",
                "description": "It is raining heavily. An ambulance is rushing down the street with its siren screaming.",
                "level": 3,
                "scenario_type": "emergency",
                "parameters": {
                    "vehicle_speed": "fast",
                    "vehicle_type": "truck",
                    "vehicle_direction": "toward",
                    "signal_color": "green",
                    "pedestrians_present": False,
                    "time_of_day": "dusk",
                    "weather": "rain",
                    "num_vehicles": 1
                },
                "correct_answer": "ALERT_EMERGENCY",
                "explanation": "Emergency vehicles like ambulances always have priority. Alert others and stay on the sidewalk.",
                "wrong_answers": ["CROSS_NOW", "WAIT", "WAIT_FOR_OTHERS"],
                "risk_level": "CRITICAL",
                "source": "manual",
                "is_active": True
            }
        }
        
        return fallbacks.get(scenario_type, fallbacks["vehicle"])
