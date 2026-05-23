import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Star, AlertTriangle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useSimulationStore } from '../stores/useSimulationStore';
import { Card, Button, Badge, Timer } from '../components/ui';
import ThreeScene from '../components/simulation/ThreeScene';
import toast from 'react-hot-toast';

export const Simulation: React.FC = () => {
  const navigate = useNavigate();
  const {
    sessionReport,
    currentLevel,
    currentQuestionIndex,
    scenarios,
    decisions,
    runningScore,
    streak,
    gameState,
    timeLeft,
    isFreezed,
    startSession,
    submitAnswer,
    nextQuestion,
    completeSession,
    resetSimulation,
    setGameState,
    setTimerActive,
    setTimeLeft
  } = useSimulationStore();

  // Setup screen states
  const [level, setLevel] = useState<number>(1);
  const [useUpload, setUseUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reaction timer tracking
  const questionStartRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  // Clean up on leave
  useEffect(() => {
    return () => resetSimulation();
  }, [resetSimulation]);

  // Loading phase progress messages
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const loadingMsgs = [
    "Analyzing your scene...",
    "Running YOLOv8 + DeepSORT CV tracking...",
    "Generating safe parameters...",
    "Building 3D environment...",
    "Get ready!"
  ];

  useEffect(() => {
    if (gameState !== 'loading') return;
    setLoadingMsgIdx(0);
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => Math.min(i + 1, loadingMsgs.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, [gameState]);

  // Briefing countdown (3 seconds)
  const [briefingCount, setBriefingCount] = useState(3);
  useEffect(() => {
    if (gameState !== 'briefing') return;
    setBriefingCount(3);
    const interval = setInterval(() => {
      setBriefingCount((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setGameState('playing');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, setGameState]);

  // Playing / Decision reaction timer countdown
  useEffect(() => {
    if (gameState !== 'playing') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }
    
    questionStartRef.current = Date.now();
    setTimeLeft(10);
    setTimerActive(true);

    timerRef.current = setInterval(() => {
      setTimeLeft(useSimulationStore.getState().timeLeft - 1);
      if (useSimulationStore.getState().timeLeft <= 0) {
        clearInterval(timerRef.current);
        // Timeout choice trigger
        handleDecisionSubmit('TIMEOUT');
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameState, currentQuestionIndex]);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleStartGame = async () => {
    try {
      await startSession(level, useUpload && uploadFile ? uploadFile : undefined);
    } catch (err) {
      toast.error('Failed to initiate simulation session.');
    }
  };

  const handleDecisionSubmit = async (answer: string) => {
    const reactionTime = Date.now() - questionStartRef.current;
    await submitAnswer(answer, answer === 'TIMEOUT' ? 10500 : reactionTime);
  };

  const handleNext = () => {
    nextQuestion();
  };

  const handleComplete = async () => {
    await completeSession();
  };

  // Helper variables
  const currentScenario = scenarios[currentQuestionIndex];
  const lastDecision = decisions[decisions.length - 1];

  // ========================================================
  // RENDER STEP 1: SETUP SCREEN
  // ========================================================
  if (gameState === 'setup') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 animate-in fade-in duration-300">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-white">Start Road Safety Simulation</h2>
          <p className="text-xs text-gray-400 mt-1">Select a difficulty level to test your hazard recognition skills</p>
        </div>

        <Card className="p-6 border-gray-800 space-y-6 bg-[#0D1B2E]/80">
          {/* Level Selection */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Select Level</label>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={twMerge(
                    "p-4 rounded-xl border text-center transition-all duration-200",
                    level === lvl
                      ? "border-primary bg-primary/10 text-white shadow-lg shadow-blue-500/10"
                      : "border-gray-800 bg-[#050D1A] text-gray-400 hover:text-gray-200"
                  )}
                >
                  <span className="block font-black text-lg">Level {lvl}</span>
                  <span className="text-[9px] uppercase mt-1 block">
                    {lvl === 1 ? 'Simple' : (lvl === 2 ? 'Moderate' : 'Complex')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Upload Toggle */}
          <div className="border-t border-gray-800 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-200">Play with Custom Media</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Upload a street photo/video and use computer vision to generate the level</p>
              </div>
              <button
                type="button"
                onClick={() => setUseUpload(!useUpload)}
                className={twMerge(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none",
                  useUpload ? "bg-primary" : "bg-gray-800"
                )}
              >
                <span className={twMerge("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", useUpload ? "translate-x-6" : "translate-x-1")} />
              </button>
            </div>

            {useUpload && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-800 hover:border-gray-700 bg-black/10 hover:bg-black/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors animate-in fade-in duration-200"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-gray-500 mb-2" />
                <span className="text-xs font-semibold text-gray-300">
                  {uploadFile ? uploadFile.name : 'Click to select image or video'}
                </span>
                <span className="text-[9px] text-gray-500 mt-1">Supports MP4, MOV, JPG, PNG (max 50MB)</span>
              </div>
            )}
          </div>

          {/* Start CTA */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartGame}
            disabled={useUpload && !uploadFile}
            className="w-full font-bold shadow-lg shadow-blue-500/10 mt-2"
          >
            Begin Simulation
          </Button>
        </Card>
      </div>
    );
  }

  // ========================================================
  // RENDER STEP 2: LOADING SCREEN
  // ========================================================
  if (gameState === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[70vh]">
        <div className="relative flex flex-col items-center max-w-sm text-center">
          {/* Animated Traffic Light cycling colors */}
          <div className="w-10 h-28 bg-[#0D1B2E] border border-gray-800 rounded-xl flex flex-col items-center justify-center gap-3 p-3.5 mb-8 shadow-2xl">
            <div className="w-5 h-5 rounded-full bg-red-500 shadow-lg shadow-red-500/30 animate-pulse" />
            <div className="w-5 h-5 rounded-full bg-yellow-500/20" />
            <div className="w-5 h-5 rounded-full bg-green-500/20" />
          </div>

          <h3 className="text-base font-extrabold text-gray-100">{loadingMsgs[loadingMsgIdx]}</h3>
          
          <div className="w-full bg-gray-800 h-1.5 rounded-full mt-5 overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-1000"
              style={{ width: `${((loadingMsgIdx + 1) / loadingMsgs.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER STEP 3: BRIEFING SCREEN
  // ========================================================
  if (gameState === 'briefing') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[70vh]">
        <div className="text-center space-y-4">
          <Badge variant="purple" className="text-xs py-1 px-3.5 font-extrabold tracking-wider uppercase">
            Level {currentLevel} Started
          </Badge>
          <h2 className="text-4xl font-black text-white tracking-tight">GET READY!</h2>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">
            You will have 5 seconds of 3D traffic simulation playback before the scene freezes. Decide the safest action immediately!
          </p>
          <div className="text-6xl font-black text-primary animate-ping mt-8">
            {briefingCount}
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER STEP 4: 3D PLAYING SCENE & OVERLAYS
  // ========================================================
  const isPlaying = gameState === 'playing';
  const isDecision = gameState === 'decision';
  const isFeedback = gameState === 'feedback';

  if (isPlaying || isDecision || isFeedback) {
    const choices = [
      { id: 'WAIT', text: 'WAIT', desc: 'Wait on the sidewalk', emoji: '🛑' },
      { id: 'CROSS_NOW', text: 'CROSS NOW', desc: 'Step onto the crosswalk', emoji: '🚶' },
      { id: 'WAIT_FOR_OTHERS', text: 'WAIT FOR OTHERS', desc: 'Let other kids cross first', emoji: '👥' },
      { id: 'ALERT_EMERGENCY', text: 'ALERT EMERGENCY', desc: 'Stay back, let sirened vehicles pass', emoji: '🚨' }
    ];

    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 flex-1 flex flex-col justify-center">
        {/* HUD Top Bar */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 bg-[#0D1B2E]/20 p-3 rounded-xl border border-gray-800/40">
          <div className="flex items-center gap-2">
            <Badge variant="purple">Q{currentQuestionIndex + 1} of 5</Badge>
            <Badge variant="gray">Level {currentLevel}</Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm font-bold text-gray-300">
              Score: <span className="text-white font-black text-base">{runningScore}</span>
            </span>
            {streak > 0 && (
              <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                🔥 {streak} Streak
              </span>
            )}
          </div>
        </div>

        {/* 3D Scene Wrapper */}
        <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-black/40">
          <ThreeScene scenarioParameters={currentScenario?.parameters} />

          {/* YOLO Annotation Overlays (Vignette & boxes when frozen) */}
          {isFreezed && !isFeedback && (
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-4 pointer-events-none animate-in fade-in duration-300">
              {/* TOP VIGNETTE */}
              <div className="bg-gradient-to-b from-black/80 to-transparent p-4 text-center">
                <p className="text-red-400 font-extrabold text-sm flex items-center justify-center gap-1.5 animate-pulse uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  SCENE FREEZED — CHOOSE ROAD ACTION
                </p>
              </div>

              {/* YOLO bounding boxes overlays drawn directly in HUD */}
              <div className="absolute top-1/3 left-1/3 border-2 border-red-500 bg-red-500/10 p-1 text-[10px] text-red-400 font-black rounded pointer-events-none animate-bounce">
                🚗 {currentScenario?.parameters?.vehicle_type?.toUpperCase()} — APPROACHING {currentScenario?.parameters?.vehicle_speed?.toUpperCase()}
              </div>

              {/* TIMER HUD OVERLAY */}
              <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur border border-gray-800 p-2.5 rounded-xl pointer-events-auto">
                <Timer timeLeft={timeLeft} />
              </div>
            </div>
          )}

          {/* Feedback shimmer wrapper */}
          <AnimatePresence>
            {isFeedback && lastDecision && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={twMerge(
                  "absolute inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm z-30",
                  lastDecision.is_correct ? "bg-emerald-950/80" : (lastDecision.was_timeout ? "bg-amber-950/80" : "bg-red-950/80")
                )}
              >
                {lastDecision.is_correct ? (
                  <div className="space-y-4 max-w-md animate-in zoom-in-95 duration-200">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
                    <h3 className="text-2xl font-black text-white">CORRECT!</h3>
                    <Badge variant="success" className="text-sm py-1 px-3">
                      +{lastDecision.points_earned} PTS — {lastDecision.points_earned === 100 ? 'Lightning Fast!' : 'Nice work!'}
                    </Badge>
                    <p className="text-xs text-gray-200 leading-relaxed mt-4 bg-black/30 p-3.5 rounded-xl border border-emerald-500/10">
                      {lastDecision.scenarios?.explanation || currentScenario?.explanation}
                    </p>
                  </div>
                ) : lastDecision.was_timeout ? (
                  <div className="space-y-4 max-w-md animate-in zoom-in-95 duration-200">
                    <Clock className="w-16 h-16 text-amber-400 mx-auto" />
                    <h3 className="text-2xl font-black text-white">TIME'S UP!</h3>
                    <p className="text-xs text-gray-200 leading-relaxed mt-4 bg-black/30 p-3.5 rounded-xl border border-amber-500/10">
                      In real traffic, always decide quickly. WAIT when unsure.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-md animate-in zoom-in-95 duration-200">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
                    <h3 className="text-2xl font-black text-white">NOT QUITE!</h3>
                    <div className="flex justify-center gap-2">
                      <Badge variant="danger">0 PTS</Badge>
                      <Badge variant="success">CORRECT: {lastDecision.correct_answer}</Badge>
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed mt-4 bg-black/30 p-3.5 rounded-xl border border-red-500/10">
                      {lastDecision.scenarios?.explanation || currentScenario?.explanation}
                    </p>
                  </div>
                )}
                
                <Button variant="outline" onClick={currentQuestionIndex === 4 ? handleComplete : handleNext} className="mt-8 font-bold border-white/20 bg-white/5 hover:bg-white/10 text-white">
                  {currentQuestionIndex === 4 ? 'Finish Level' : 'Next Question →'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Decision UI Cards grid (Only visible during decision step) */}
        {isDecision && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-300">
            {choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => handleDecisionSubmit(choice.id)}
                className="glass-panel text-left p-4 rounded-xl border border-gray-800 hover:border-primary/50 hover:scale-[1.03] transition-all duration-200 flex items-center gap-4 bg-[#0D1B2E]/90 shadow-lg hover:shadow-primary/5"
              >
                <span className="text-3xl p-2 rounded-lg bg-black/25">{choice.emoji}</span>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-200">{choice.text}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{choice.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // RENDER STEP 8: LEVEL COMPLETE SCREEN
  // ========================================================
  if (gameState === 'completed') {
    const report = sessionReport;
    const score = report?.total_score || 0;
    const grade = report?.grade || 'Beginner';
    
    // Calculate star rating (1-3 stars)
    const pct = report?.percentage_score || 0;
    const stars = pct >= 90 ? 3 : (pct >= 60 ? 2 : 1);

    return (
      <div className="max-w-xl mx-auto px-4 py-12 space-y-8 animate-in fade-in duration-300">
        <Card className="p-8 border-gray-800 text-center space-y-6 bg-[#0D1B2E]/80 shadow-2xl">
          <Badge variant="purple" className="text-xs uppercase font-extrabold tracking-wider px-3.5 py-1">
            Level Completed!
          </Badge>

          {/* Star animation fly in */}
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={twMerge(
                  "w-10 h-10 transition-colors duration-500",
                  s <= stars ? "text-amber-400 fill-amber-400 animate-bounce" : "text-gray-700"
                )}
                style={{ animationDelay: `${s * 150}ms` }}
              />
            ))}
          </div>

          <div>
            <h3 className="text-3xl font-black text-white tracking-tight">{grade}</h3>
            <p className="text-xs text-gray-400 mt-1">Accuracy Score: {pct}%</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-gray-800/80 py-4 max-w-sm mx-auto">
            <div>
              <span className="text-[10px] text-gray-500 uppercase block font-bold">Total Points</span>
              <span className="font-mono text-xl font-black text-white">{score}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase block font-bold">Reaction Speed</span>
              <span className="font-mono text-xl font-black text-white">
                {report?.avg_reaction_time_ms !== undefined ? (report.avg_reaction_time_ms / 1000).toFixed(1) : '0.0'}s
              </span>
            </div>
          </div>

          {/* Badges Earned section */}
          {report?.badges && report.badges.length > 0 && (
            <div className="space-y-2 max-w-sm mx-auto">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Badges Unlocked</span>
              <div className="flex justify-center gap-2 flex-wrap">
                {report.badges.map((b: any, idx: number) => (
                  <Badge key={idx} variant="purple" className="flex items-center gap-1 font-bold text-[10px] py-1">
                    <span>{b.icon_emoji}</span>
                    <span>{b.badge_name}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Learning Tip */}
          {report?.improvement_tip && (
            <div className="bg-black/30 border border-gray-800 p-4 rounded-xl text-left text-xs max-w-md mx-auto">
              <span className="font-bold text-primary text-[10px] uppercase block mb-1">Feedback Advisor Tip:</span>
              <p className="text-gray-300 leading-relaxed">{report.improvement_tip}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 border-gray-800 hover:bg-gray-800" onClick={resetSimulation}>
              Play Again
            </Button>
            {report?.session_id && (
              <Button variant="primary" className="flex-1" onClick={() => navigate(`/report/${report.session_id}`)}>
                View Full Report
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

function twMerge(...args: any[]) {
  return args.filter(Boolean).join(' ');
}

export default Simulation;
