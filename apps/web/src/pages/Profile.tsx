import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { api } from '../services/api';
import { Card, Button, Badge, Skeleton } from '../components/ui';
import { User, Mail, School, History, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export const Profile: React.FC = () => {
  const { profile, updateProfile, logout } = useAuthStore();
  const [name, setName] = useState(profile?.full_name || '');
  const [language, setLanguage] = useState(profile?.preferred_language || 'en');
  const [schoolCode, setSchoolCode] = useState('');
  
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name);
      setLanguage(profile.preferred_language);
    }
  }, [profile]);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await api.get('/sessions/history?limit=10&offset=0');
        setHistory(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    
    setIsSaving(true);
    try {
      await updateProfile({ full_name: name, preferred_language: language });
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleJoinSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolCode.trim()) return;

    setIsSaving(true);
    try {
      // 1. Resolve school id from join code
      const { data: school, error } = await (await import('../lib/supabase')).supabase
        .from('schools')
        .select('id')
        .eq('join_code', schoolCode)
        .single();
      
      if (error || !school) {
        toast.error('Invalid school code.');
        setIsSaving(false);
        return;
      }

      // 2. Update profile with school_id
      await updateProfile({ school_id: school.id });
      toast.success('Joined school successfully!');
      setSchoolCode('');
    } catch (err) {
      toast.error('Failed to link school.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 flex-1 flex flex-col justify-center animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-extrabold text-white">My Account</h2>
        <p className="text-xs text-gray-400 mt-1">Manage credentials, review earned safety badges, and session logs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Side: Avatar Card */}
        <Card className="flex flex-col items-center text-center p-6 bg-[#0D1B2E]/90 border-gray-800">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 border border-white/10 flex items-center justify-center text-3xl font-black text-white shadow-xl mb-4 uppercase">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <h3 className="font-extrabold text-base text-gray-100">{profile?.full_name}</h3>
          <span className="text-[10px] text-primary uppercase font-bold tracking-wider mt-1">{profile?.role}</span>
          
          <div className="w-full border-t border-gray-800/80 my-5 pt-4 text-left space-y-3 text-xs">
            <div className="flex items-center gap-2.5 text-gray-400">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>{profile?.role === 'admin' ? 'admin@roadsense.ai' : 'student@roadsense.ai'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-400">
              <School className="w-4 h-4 text-gray-500" />
              <span>{profile?.schools?.name || 'No school linked'}</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full border-red-500/20 hover:bg-red-500/10 text-red-400 font-bold" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </Card>

        {/* Right Side: Tab details */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Form */}
          <Card className="p-6 border-gray-800 bg-[#0D1B2E]/80">
            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-1.5">
              <User className="w-4 h-4 text-primary" />
              Profile Details
            </h3>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#050D1A] border border-gray-800 focus:border-primary rounded-lg px-3 py-2 text-xs text-gray-200 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block">Preferred Language</label>
                  <select
                    value={language}
                    onChange={(e: any) => setLanguage(e.target.value)}
                    className="w-full bg-[#050D1A] border border-gray-800 focus:border-primary rounded-lg px-3 py-2.5 text-xs text-gray-200 outline-none transition-colors"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi (हिंदी)</option>
                  </select>
                </div>
              </div>
              <Button type="submit" variant="primary" size="sm" isLoading={isSaving} className="font-bold">
                Save Changes
              </Button>
            </form>
          </Card>

          {/* Join School Code (For students only) */}
          {profile?.role === 'student' && !profile.school_id && (
            <Card className="p-6 border-gray-800 bg-[#0D1B2E]/80 animate-in fade-in duration-300">
              <h3 className="text-sm font-bold text-gray-200 mb-2 flex items-center gap-1.5">
                <School className="w-4 h-4 text-primary" />
                Join School
              </h3>
              <p className="text-[10px] text-gray-400 mb-4">Link your account to your school classroom to share progress reports with teachers.</p>
              
              <form onSubmit={handleJoinSchool} className="flex gap-3">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-char Code"
                  className="bg-[#050D1A] border border-gray-800 focus:border-primary rounded-lg px-3.5 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none transition-colors"
                />
                <Button type="submit" variant="outline" size="sm" isLoading={isSaving} className="border-gray-800 hover:bg-gray-800 font-bold">
                  Join School
                </Button>
              </form>
            </Card>
          )}

          {/* Game Sessions History logs */}
          <Card className="p-6 border-gray-800 bg-[#0D1B2E]/85">
            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-1.5">
              <History className="w-4 h-4 text-primary" />
              Recent Gameplay Sessions
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 font-bold uppercase">
                    <th className="pb-3 pl-2">Date</th>
                    <th className="pb-3">Level</th>
                    <th className="pb-3 text-center">Score</th>
                    <th className="pb-3 text-center">Grade</th>
                    <th className="pb-3 pr-2 text-right">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((sess) => {
                    const dt = sess.completed_at ? sess.completed_at.split('T')[0] : 'N/A';
                    return (
                      <tr key={sess.id} className="border-b border-gray-800/50 hover:bg-gray-800/10 transition-colors">
                        <td className="py-3 pl-2 text-gray-300 font-medium">{dt}</td>
                        <td className="font-bold text-gray-300">Level {sess.level}</td>
                        <td className="text-center font-mono font-bold text-blue-400">{sess.total_score} pts</td>
                        <td className="text-center">
                          <Badge variant="purple">{sess.grade || 'Developing'}</Badge>
                        </td>
                        <td className="text-right pr-2">
                          <Link to={`/report/${sess.id}`} className="text-primary hover:text-blue-400 font-semibold transition-colors">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {history.length === 0 && !isLoadingHistory && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500 italic">No completed sessions found. Play a simulation first!</td>
                    </tr>
                  )}
                  {isLoadingHistory && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center">
                        <Skeleton variant="text" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default Profile;
