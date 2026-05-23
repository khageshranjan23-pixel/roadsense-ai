import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { api } from '../services/api';
import { Card, Button, Badge, Skeleton } from '../components/ui';
import { CategoryRadarChart, ClassDistributionChart } from '../components/dashboard/AnalyticsCharts';
import { Play, Shield, BookOpen, Users, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { twMerge } from 'tailwind-merge';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  // States for student dashboard
  const [studentStats, setStudentStats] = useState<any>(null);
  
  // States for teacher dashboard
  const [classStats, setClassStats] = useState<any>(null);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  // States for admin dashboard
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [scenariosList, setScenariosList] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        if (profile.role === 'student') {
          const statsRes = await api.get(`/analytics/student/${profile.id}`);
          setStudentStats(statsRes.data);
        } else if (profile.role === 'teacher') {
          if (profile.school_id) {
            const classRes = await api.get(`/analytics/class/${profile.school_id}`);
            setClassStats(classRes.data);
            
            // Fetch list of students in school using Supabase JS client
            const { data } = await (await import('../lib/supabase')).supabase
              .from('profiles')
              .select('*')
              .eq('school_id', profile.school_id)
              .eq('role', 'student');
            setStudentsList(data || []);
          }
        } else if (profile.role === 'admin') {
          const platRes = await api.get('/analytics/platform');
          setPlatformStats(platRes.data);
          
          // Fetch scenarios for CRUD tables
          const { data: scs } = await (await import('../lib/supabase')).supabase.from('scenarios').select('*');
          setScenariosList(scs || []);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton variant="rect" className="h-16 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton variant="rect" className="h-40" />
          <Skeleton variant="rect" className="h-40" />
          <Skeleton variant="rect" className="h-40" />
        </div>
        <Skeleton variant="rect" className="h-80" />
      </div>
    );
  }

  // ========================================================
  // RENDER STUDENT DASHBOARD
  // ========================================================
  if (profile?.role === 'student') {
    const unlockedLevel = studentStats?.sessions_played > 0 ? (studentStats.avg_score >= 60 ? (studentStats.sessions_played >= 3 ? 3 : 2) : 1) : 1;
    
    // Fallback badges list to show earned vs unearned
    const availableBadges = [
      { type: 'First Step', name: 'First Step', desc: 'Completed first session', emoji: '🚶' },
      { type: 'Consistent', name: 'Consistent Learner', desc: 'Played 5 sessions', emoji: '📅' },
      { type: 'Perfect Round', name: 'Perfect Round', desc: 'All 5 correct', emoji: '🎯' },
      { type: 'Safety Champion', name: 'Safety Champion', desc: 'Score > 90% accuracy', emoji: '🏆' },
      { type: 'Speed Thinker', name: 'Speed Thinker', desc: 'Avg reaction < 2.5s', emoji: '⚡' },
      { type: 'Signal Master', name: 'Signal Master', desc: '100% correct on signals', emoji: '🚦' },
      { type: 'Risk Aware', name: 'Risk Aware', desc: 'Passed all high-risk checks', emoji: '🛡️' }
    ];

    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/10 rounded-2xl p-6">
          <div>
            <h2 className="text-xl font-extrabold text-white">Welcome back, {profile.full_name}!</h2>
            <p className="text-xs text-gray-400 mt-1">Ready to test your road safety decision skills today?</p>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => navigate('/simulation')}>
              <Play className="w-4 h-4 mr-2 fill-current" />
              Play Simulation
            </Button>
            <Button variant="outline" onClick={() => navigate('/advisor')} className="border-gray-800 hover:bg-gray-800">
              <Shield className="w-4 h-4 mr-2" />
              Safety Advisor
            </Button>
          </div>
        </div>

        {/* Progress Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Outer circle track */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="45" stroke="#1E293B" strokeWidth="8" fill="transparent" />
                <circle
                  cx="56"
                  cy="56"
                  r="45"
                  stroke="#2563EB"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - (studentStats?.avg_score || 0) / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-mono text-2xl font-black text-white">{Math.round(studentStats?.avg_score || 0)}%</span>
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Avg Accuracy</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-4">Calculated over {studentStats?.sessions_played} sessions</p>
          </Card>

          {/* Level Progression */}
          <Card className="col-span-2 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-200 mb-3">Gameplay Levels</h3>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((lvl) => {
                  const isLocked = lvl > unlockedLevel;
                  return (
                    <div
                      key={lvl}
                      className={twMerge(
                        "rounded-xl p-4 flex flex-col items-center justify-center border text-center transition-all duration-300",
                        isLocked 
                          ? "border-gray-800/40 bg-black/10 opacity-40 cursor-not-allowed" 
                          : "border-primary/20 bg-primary/5 hover:border-primary/40 cursor-pointer"
                      )}
                      onClick={() => !isLocked && navigate('/simulation')}
                    >
                      <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-mono font-bold text-sm mb-2">
                        {lvl}
                      </span>
                      <span className="text-xs font-bold text-gray-200">Level {lvl}</span>
                      <span className="text-[10px] text-gray-400 mt-1">
                        {isLocked ? '🔒 Locked' : '🟢 Unlocked'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {studentStats?.improvement_rate !== 0 && (
              <div className="mt-4 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                📈 Improvement rate: +{studentStats?.improvement_rate}% compared to early sessions!
              </div>
            )}
          </Card>
        </div>

        {/* Charts & Badges shelf */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-gray-200 mb-4">Category Skills Averages</h3>
            <CategoryRadarChart data={studentStats?.category_averages || {}} />
          </Card>

          <Card className="p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-200 mb-4">Badges Earned Shelf</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {availableBadges.map((badge, idx) => {
                  // Check if user has this badge earned in DB
                  // Assuming studentStats contains badge_type list
                  const isEarned = studentStats?.total_badges > idx; // Simple mock check for presentation
                  return (
                    <div
                      key={idx}
                      className={twMerge(
                        "rounded-xl p-3 flex flex-col items-center justify-center text-center border transition-all duration-200",
                        isEarned 
                          ? "border-violet-500/20 bg-violet-600/5" 
                          : "border-gray-800 bg-black/10 opacity-30"
                      )}
                      title={badge.desc}
                    >
                      <span className="text-2xl mb-1.5">{badge.emoji}</span>
                      <span className="text-[9px] font-bold text-gray-200 leading-tight">{badge.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-400">
              💡 <span className="font-semibold text-gray-300">Safety Tip:</span> {studentStats?.weakest_category && studentStats.weakest_category !== 'none' ? `Work on your ${studentStats.weakest_category.replace('_', ' ')} skills.` : 'Keep up the safe driving!'}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER TEACHER DASHBOARD
  // ========================================================
  if (profile?.role === 'teacher') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Class overview */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-extrabold text-white">Classroom Dashboard</h2>
            <p className="text-xs text-gray-400 mt-1">Review student safe road practices and risk analytics</p>
          </div>
          <Button variant="outline" className="border-gray-800 hover:bg-gray-800">
            Export Class Report (PDF)
          </Button>
        </div>

        {/* Classroom Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider block font-bold">Total Students</span>
              <span className="font-mono text-2xl font-black text-white">{classStats?.student_count || 0}</span>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider block font-bold">Class Average Score</span>
              <span className="font-mono text-2xl font-black text-white">{classStats?.avg_class_score || 0}%</span>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider block font-bold">Engagement Rate</span>
              <span className="font-mono text-2xl font-black text-white">{classStats?.engagement_rate || 0}%</span>
            </div>
          </Card>
        </div>

        {/* Charts & Heatmaps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-gray-200 mb-4">Class Accuracy Distribution</h3>
            <ClassDistributionChart distribution={classStats?.score_distribution || {}} />
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold text-gray-200 mb-4">Category Heatmap averages</h3>
            <CategoryRadarChart data={classStats?.category_class_averages || {}} />
          </Card>
        </div>

        {/* Students Table */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-200 mb-4">Student Performance Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase">
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Age Group</th>
                  <th className="pb-3 text-center">Avg Accuracy</th>
                  <th className="pb-3">Risk Rating</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentsList.map((std) => (
                  <tr key={std.id} className="border-b border-gray-800/50 hover:bg-gray-800/10 transition-colors">
                    <td className="py-3.5 pl-2 font-bold text-gray-100">{std.full_name}</td>
                    <td>{std.age_group || 'N/A'}</td>
                    <td className="text-center font-mono font-bold text-blue-400">82%</td>
                    <td>
                      <Badge variant="success">SAFE</Badge>
                    </td>
                    <td className="text-right pr-2">
                      <Button variant="ghost" size="sm" className="p-1 h-8" title="Review Report">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {studentsList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500 italic">No students registered in this school yet. Provide them the join code: {profile.school_id?.slice(0, 6)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // ========================================================
  // RENDER ADMIN DASHBOARD
  // ========================================================
  if (profile?.role === 'admin') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
        <div>
          <h2 className="text-xl font-extrabold text-white">System Admin Control Center</h2>
          <p className="text-xs text-gray-400 mt-1">Manage global road safety scenarios, user records, and platform health metrics</p>
        </div>

        {/* Platform stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Card className="p-4">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Users</span>
            <span className="font-mono text-2xl font-black text-white">{platformStats?.total_users || 0}</span>
          </Card>
          <Card className="p-4">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Sessions Completed</span>
            <span className="font-mono text-2xl font-black text-white">{platformStats?.total_sessions || 0}</span>
          </Card>
          <Card className="p-4">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Decisions Evaluated</span>
            <span className="font-mono text-2xl font-black text-white">{platformStats?.total_decisions || 0}</span>
          </Card>
          <Card className="p-4">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Active Schools</span>
            <span className="font-mono text-2xl font-black text-white">{platformStats?.top_schools?.length || 0}</span>
          </Card>
        </div>

        {/* Scenarios Management CRUD Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-200">Global Scenarios Registry</h3>
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Scenario
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase">
                  <th className="pb-3 pl-2">Title</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-center">Difficulty</th>
                  <th className="pb-3">Correct Answer</th>
                  <th className="pb-3">Source</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scenariosList.map((sc) => (
                  <tr key={sc.id} className="border-b border-gray-800/50 hover:bg-gray-800/10 transition-colors">
                    <td className="py-3.5 pl-2 font-bold text-gray-100">{sc.title}</td>
                    <td className="capitalize">{sc.scenario_type}</td>
                    <td className="text-center font-mono">Lvl {sc.level}</td>
                    <td>
                      <Badge variant={sc.correct_answer === 'CROSS_NOW' ? 'success' : 'warning'}>{sc.correct_answer}</Badge>
                    </td>
                    <td className="capitalize">{sc.source}</td>
                    <td className="text-right pr-2 flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm" className="p-1 h-8">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-1 h-8 text-red-400 hover:text-red-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};
export default Dashboard;
