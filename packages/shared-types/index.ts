// RoadSense AI — Shared TypeScript Type Definitions

export interface School {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country: string;
  join_code: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: 'student' | 'teacher' | 'admin';
  age_group?: '6-8' | '9-11' | '12-14' | '15-17';
  school_id?: string;
  schools?: { name: string }; // joined school name
  avatar_url?: string;
  preferred_language: 'en' | 'hi';
  created_at: string;
  updated_at: string;
}

export interface ScenarioParameters {
  vehicle_speed: 'slow' | 'medium' | 'fast';
  vehicle_type: 'car' | 'bus' | 'truck' | 'bike' | 'auto';
  vehicle_direction: 'left_right' | 'right_left' | 'toward' | 'away';
  signal_color: 'red' | 'green' | 'yellow' | 'none';
  pedestrians_present: boolean;
  time_of_day: 'day' | 'dusk' | 'night';
  weather: 'clear' | 'rain' | 'fog';
  num_vehicles: number;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  level: 1 | 2 | 3;
  scenario_type: 'signal' | 'pedestrian' | 'vehicle' | 'blind_spot' | 'emergency' | 'multiHazard';
  source: 'yolo_extracted' | 'ai_generated' | 'manual';
  parameters: ScenarioParameters;
  correct_answer: 'WAIT' | 'CROSS_NOW' | 'WAIT_FOR_OTHERS' | 'ALERT_EMERGENCY';
  explanation: string;
  wrong_answers: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  is_active: boolean;
  created_at: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  level: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  total_score: number;
  max_possible_score: number;
  percentage_score?: number;
  avg_reaction_time_ms?: number;
  risk_tendency?: 'RISKY' | 'CAUTIOUS' | 'BALANCED';
  grade?: 'Expert' | 'Proficient' | 'Developing' | 'Beginner';
  started_at: string;
  completed_at?: string;
  metadata?: {
    upload_used?: boolean;
    device?: string;
    browser?: string;
  };
}

export interface Decision {
  id: string;
  session_id: string;
  scenario_id: string;
  question_number: number;
  answer_given: string;
  correct_answer: string;
  is_correct: boolean;
  reaction_time_ms: number;
  points_earned: number;
  was_impulsive: boolean;
  was_timeout: boolean;
  created_at: string;
  scenarios?: {
    title: string;
    description: string;
    scenario_type: string;
    correct_answer: string;
    explanation: string;
  };
}

export interface CategoryScore {
  id: string;
  session_id: string;
  category: 'signal_knowledge' | 'risk_detection' | 'situation_awareness' | 'risk_management' | 'pedestrian_rules' | 'emergency_protocol';
  correct: number;
  total: number;
  percentage: number;
}

export interface Badge {
  id: string;
  user_id: string;
  badge_type: string;
  badge_name: string;
  badge_description?: string;
  icon_emoji?: string;
  earned_at: string;
}

export interface AdvisorQuery {
  id: string;
  user_id?: string;
  media_type: 'image' | 'video' | 'none';
  question_text: string;
  yolo_detected_objects?: string[];
  risk_assessment: 'SAFE' | 'CAUTION' | 'UNSAFE';
  ai_response_summary?: string;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface SceneContext {
  objects: Array<{
    track_id: string | number;
    class_name: string;
    bbox: [number, number, number, number];
    speed: number;
    direction: string;
    distance: number;
  }>;
  traffic_light_color: string;
  fastest_vehicle_speed: number;
  closest_vehicle_distance: number;
  pedestrians_on_crossing: number;
  scene_complexity: 'simple' | 'moderate' | 'complex';
  annotated_frame_base64?: string;
}

export interface SessionReport {
  session_id: string;
  level: number;
  total_score: number;
  max_possible_score: number;
  percentage_score: number;
  avg_reaction_time_ms: number;
  risk_tendency: 'RISKY' | 'CAUTIOUS' | 'BALANCED';
  grade: 'Expert' | 'Proficient' | 'Developing' | 'Beginner';
  decisions: Decision[];
  category_scores: CategoryScore[];
  badges: Badge[];
  improvement_tip: string;
}
