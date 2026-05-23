import { create } from 'zustand';
import { api } from '../services/api';
import { Scenario, Decision, SessionReport } from '@roadsense-ai/shared-types';

interface SimulationState {
  currentSessionId: string | null;
  currentLevel: number;
  currentQuestionIndex: number; // 0 to 4
  scenarios: Scenario[];
  decisions: Decision[];
  runningScore: number;
  streak: number;
  timerActive: boolean;
  timeLeft: number; // 10 to 0 seconds
  isAnalyzing: boolean;
  isFreezed: boolean;
  isLoading: boolean;
  gameState: 'setup' | 'loading' | 'briefing' | 'playing' | 'decision' | 'feedback' | 'completed';
  sessionReport: SessionReport | null;
  activeUploadContext: any | null;
  
  startSession: (level: number, uploadFile?: File) => Promise<void>;
  submitAnswer: (answer: string, reactionTimeMs: number) => Promise<void>;
  nextQuestion: () => void;
  completeSession: () => Promise<void>;
  resetSimulation: () => void;
  setGameState: (state: 'setup' | 'loading' | 'briefing' | 'playing' | 'decision' | 'feedback' | 'completed') => void;
  setTimerActive: (active: boolean) => void;
  setTimeLeft: (time: number) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  currentSessionId: null,
  currentLevel: 1,
  currentQuestionIndex: 0,
  scenarios: [],
  decisions: [],
  runningScore: 0,
  streak: 0,
  timerActive: false,
  timeLeft: 10,
  isAnalyzing: false,
  isFreezed: false,
  isLoading: false,
  gameState: 'setup',
  sessionReport: null,
  activeUploadContext: null,

  setGameState: (gameState) => set({ gameState }),
  setTimerActive: (timerActive) => set({ timerActive }),
  setTimeLeft: (timeLeft) => set({ timeLeft }),

  startSession: async (level, uploadFile) => {
    set({ isLoading: true, gameState: 'loading', isAnalyzing: !!uploadFile, activeUploadContext: null });
    try {
      let scenarioIds: string[] | undefined = undefined;

      // 1. Handle custom media upload
      if (uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('analyze_for', 'game');
        
        const analyzeRes = await api.post('/analyze/media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        // Save the analysis output for 3D overlay rendering
        set({ activeUploadContext: analyzeRes.data });

        // Let's create the scenario in database first
        const scenarioData = {
          title: "Custom Scenario Upload",
          description: "Analyze the scene and decide the safest action.",
          level: level,
          scenario_type: "vehicle",
          source: "yolo_extracted",
          parameters: analyzeRes.data.scenario,
          correct_answer: analyzeRes.data.correct_answer,
          explanation: analyzeRes.data.explanation,
          wrong_answers: ["CROSS_NOW", "WAIT", "WAIT_FOR_OTHERS", "ALERT_EMERGENCY"].filter(
            a => a !== analyzeRes.data.correct_answer
          ).slice(0, 3),
          risk_level: analyzeRes.data.risk_level,
          is_active: true
        };

        // Insert into Supabase
        const { data: dbScenarios, error: dbError } = await (await import('../lib/supabase')).supabase
          .from('scenarios')
          .insert(scenarioData)
          .select();
        
        if (dbError) throw dbError;
        if (dbScenarios && dbScenarios.length > 0) {
          scenarioIds = [dbScenarios[0].id];
        }
      }

      // 2. Start game session
      const startRes = await api.post('/sessions/start', {
        level,
        use_uploaded_scenario: !!uploadFile,
        scenario_ids: scenarioIds
      });

      const { session_id, scenarios } = startRes.data;
      
      set({
        currentSessionId: session_id,
        currentLevel: level,
        currentQuestionIndex: 0,
        scenarios,
        decisions: [],
        runningScore: 0,
        streak: 0,
        isLoading: false,
        isAnalyzing: false,
        isFreezed: false,
        gameState: 'briefing'
      });
    } catch (err) {
      set({ isLoading: false, isAnalyzing: false, gameState: 'setup' });
      throw err;
    }
  },

  submitAnswer: async (answer, reactionTimeMs) => {
    const { currentSessionId, scenarios, currentQuestionIndex, streak } = get();
    if (!currentSessionId || scenarios.length === 0) return;
    
    const scenario = scenarios[currentQuestionIndex];
    set({ timerActive: false });
    
    try {
      const res = await api.post(`/sessions/${currentSessionId}/decision`, {
        scenario_id: scenario.id,
        answer,
        reaction_time_ms: reactionTimeMs,
        question_number: currentQuestionIndex + 1
      });

      const { is_correct, points, running_score } = res.data;

      const newDecision: Decision = {
        id: Math.random().toString(),
        session_id: currentSessionId,
        scenario_id: scenario.id,
        question_number: currentQuestionIndex + 1,
        answer_given: answer,
        correct_answer: scenario.correct_answer,
        is_correct,
        reaction_time_ms: reactionTimeMs,
        points_earned: points,
        was_impulsive: reactionTimeMs < 1500,
        was_timeout: reactionTimeMs > 10000,
        created_at: new Date().toISOString()
      };

      set((state) => ({
        decisions: [...state.decisions, newDecision],
        runningScore: running_score,
        streak: is_correct ? streak + 1 : 0,
        gameState: 'feedback'
      }));
    } catch (err) {
      console.error(err);
    }
  },

  nextQuestion: () => {
    const { currentQuestionIndex, scenarios } = get();
    if (currentQuestionIndex + 1 < scenarios.length) {
      set({
        currentQuestionIndex: currentQuestionIndex + 1,
        gameState: 'playing',
        isFreezed: false,
        timeLeft: 10
      });
    } else {
      set({ gameState: 'completed' });
    }
  },

  completeSession: async () => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;

    set({ isLoading: true });
    try {
      const res = await api.post(`/sessions/${currentSessionId}/complete`);
      set({
        sessionReport: res.data,
        isLoading: false,
        gameState: 'completed'
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  resetSimulation: () => {
    set({
      currentSessionId: null,
      currentQuestionIndex: 0,
      scenarios: [],
      decisions: [],
      runningScore: 0,
      streak: 0,
      timerActive: false,
      timeLeft: 10,
      isFreezed: false,
      gameState: 'setup',
      sessionReport: null,
      activeUploadContext: null
    });
  }
}));
