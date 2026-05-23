-- RoadSense AI — Supabase Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Schools (grouping for teachers and students)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  join_code TEXT UNIQUE NOT NULL,  -- 6-character code for students to join
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  age_group TEXT CHECK (age_group IN ('6-8', '9-11', '12-14', '15-17')),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Scenarios (pre-built + AI-generated)
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('signal', 'pedestrian', 'vehicle', 'blind_spot', 'emergency', 'multiHazard')),
  source TEXT CHECK (source IN ('yolo_extracted', 'ai_generated', 'manual')),
  parameters JSONB NOT NULL,
  -- parameters shape: {
  --   vehicle_speed: 'slow'|'medium'|'fast',
  --   vehicle_type: 'car'|'bus'|'truck'|'bike'|'auto',
  --   vehicle_direction: 'left_right'|'right_left'|'toward'|'away',
  --   signal_color: 'red'|'green'|'yellow'|'none',
  --   pedestrians_present: boolean,
  --   time_of_day: 'day'|'dusk'|'night',
  --   weather: 'clear'|'rain'|'fog',
  --   num_vehicles: integer
  -- }
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('WAIT', 'CROSS_NOW', 'WAIT_FOR_OTHERS', 'ALERT_EMERGENCY')),
  explanation TEXT NOT NULL,
  wrong_answers TEXT[] NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Game Sessions
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  total_score INTEGER DEFAULT 0,
  max_possible_score INTEGER DEFAULT 0,
  percentage_score NUMERIC(5,2),
  avg_reaction_time_ms INTEGER,
  risk_tendency TEXT CHECK (risk_tendency IN ('RISKY', 'CAUTIOUS', 'BALANCED')),
  grade TEXT CHECK (grade IN ('Expert', 'Proficient', 'Developing', 'Beginner')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB  -- device, browser, upload_used boolean
);

-- 5. Individual Decision Records
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  answer_given TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  reaction_time_ms INTEGER NOT NULL,
  points_earned INTEGER NOT NULL,
  was_impulsive BOOLEAN DEFAULT FALSE,  -- answered < 1500ms
  was_timeout BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Category Scores per Session
CREATE TABLE category_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('signal_knowledge', 'risk_detection', 'situation_awareness', 'risk_management', 'pedestrian_rules', 'emergency_protocol')),
  correct INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  percentage NUMERIC(5,2)
);

-- 7. Badges
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  icon_emoji TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Advisor Query Logs (for analysis, no PII stored)
CREATE TABLE advisor_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'none')),
  question_text TEXT NOT NULL,
  yolo_detected_objects JSONB,
  risk_assessment TEXT CHECK (risk_assessment IN ('SAFE', 'CAUTION', 'UNSAFE')),
  ai_response_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX ON decisions(session_id);
CREATE INDEX ON decisions(scenario_id);
CREATE INDEX ON game_sessions(user_id);
CREATE INDEX ON game_sessions(status);
CREATE INDEX ON category_scores(session_id);
CREATE INDEX ON badges(user_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_queries ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- RLS POLICIES
-- ========================================================

-- Policies for schools
CREATE POLICY "Allow public select on schools" ON schools
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin all on schools" ON schools
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies for profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Teachers can read school profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher' AND school_id = profiles.school_id)
  );

CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Enable insert for authenticated users" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users on own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Policies for scenarios
CREATE POLICY "Allow authenticated read on scenarios" ON scenarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin manage scenarios" ON scenarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies for game_sessions
CREATE POLICY "Users can read own sessions" ON game_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can read student sessions" ON game_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles s, profiles t
      WHERE s.id = game_sessions.user_id
        AND t.id = auth.uid()
        AND t.role = 'teacher'
        AND s.school_id = t.school_id
    )
  );

CREATE POLICY "Admins can read all sessions" ON game_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own sessions" ON game_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON game_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete sessions" ON game_sessions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies for decisions
CREATE POLICY "Users can read own decisions" ON decisions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM game_sessions WHERE game_sessions.id = decisions.session_id AND game_sessions.user_id = auth.uid())
  );

CREATE POLICY "Teachers can read student decisions" ON decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs, profiles s, profiles t
      WHERE gs.id = decisions.session_id
        AND s.id = gs.user_id
        AND t.id = auth.uid()
        AND t.role = 'teacher'
        AND s.school_id = t.school_id
    )
  );

CREATE POLICY "Admins can read all decisions" ON decisions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own decisions" ON decisions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM game_sessions WHERE game_sessions.id = decisions.session_id AND game_sessions.user_id = auth.uid())
  );

-- Policies for category_scores
CREATE POLICY "Users can read own category scores" ON category_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM game_sessions WHERE game_sessions.id = category_scores.session_id AND game_sessions.user_id = auth.uid())
  );

CREATE POLICY "Teachers can read student category scores" ON category_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs, profiles s, profiles t
      WHERE gs.id = category_scores.session_id
        AND s.id = gs.user_id
        AND t.id = auth.uid()
        AND t.role = 'teacher'
        AND s.school_id = t.school_id
    )
  );

CREATE POLICY "Admins can read all category scores" ON category_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert category scores" ON category_scores
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM game_sessions WHERE game_sessions.id = category_scores.session_id AND game_sessions.user_id = auth.uid())
  );

-- Policies for badges
CREATE POLICY "Users can read own badges" ON badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can read student badges" ON badges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles s, profiles t
      WHERE s.id = badges.user_id
        AND t.id = auth.uid()
        AND t.role = 'teacher'
        AND s.school_id = t.school_id
    )
  );

CREATE POLICY "Admins can read all badges" ON badges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own badges" ON badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for advisor_queries
CREATE POLICY "Users can read own queries" ON advisor_queries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all queries" ON advisor_queries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert queries" ON advisor_queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
