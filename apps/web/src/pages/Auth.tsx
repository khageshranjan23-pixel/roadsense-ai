import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { Card, Button } from '../components/ui';
import toast from 'react-hot-toast';
import { Shield, Lock, Mail, User, School, Calendar } from 'lucide-react';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { login, signup, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [ageGroup, setAgeGroup] = useState<'6-8' | '9-11' | '12-14' | '15-17'>('9-11');
  const [schoolCode, setSchoolCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all credentials.');
      return;
    }

    try {
      if (activeTab === 'login') {
        await login(email, password);
        toast.success('Logged in successfully!');
        navigate('/dashboard');
      } else {
        if (!fullName) {
          toast.error('Please enter your full name.');
          return;
        }
        await signup(email, password, fullName, role, role === 'student' ? ageGroup : undefined, role === 'student' ? schoolCode : undefined);
        toast.success('Sign up complete! Welcome.');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed.');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[80vh] relative">
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-100">Welcome to RoadSense AI</h2>
          <p className="text-xs text-gray-500 mt-1">Enterprise platform for AI road safety</p>
        </div>

        <Card className="p-6 border-gray-800 bg-[#0D1B2E]/90 shadow-2xl">
          {/* Tab Selector */}
          <div className="flex border-b border-gray-800 pb-3 mb-6 gap-2">
            <button
              onClick={() => setActiveTab('login')}
              className={twMerge(
                "flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === 'login' 
                  ? "bg-primary text-white" 
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30"
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={twMerge(
                "flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === 'signup' 
                  ? "bg-primary text-white" 
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30"
              )}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'signup' && (
              <>
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-[#050D1A] border border-gray-800 focus:border-primary rounded-lg pl-9 pr-3 py-2.5 text-xs text-gray-200 placeholder-gray-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Role Toggles */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">I am a</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={twMerge(
                        "py-2 rounded-lg border text-xs font-semibold text-center transition-all",
                        role === 'student'
                          ? "border-primary bg-primary/5 text-blue-400"
                          : "border-gray-800 bg-[#050D1A] text-gray-400 hover:text-gray-200"
                      )}
                    >
                      Student / Child
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={twMerge(
                        "py-2 rounded-lg border text-xs font-semibold text-center transition-all",
                        role === 'teacher'
                          ? "border-primary bg-primary/5 text-blue-400"
                          : "border-gray-800 bg-[#050D1A] text-gray-400 hover:text-gray-200"
                      )}
                    >
                      Teacher / Parent
                    </button>
                  </div>
                </div>

                {/* Student specific fields */}
                {role === 'student' && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                    {/* Age Group */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Age Group</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-gray-500 absolute left-3 top-3 pointer-events-none" />
                        <select
                          value={ageGroup}
                          onChange={(e: any) => setAgeGroup(e.target.value)}
                          className="w-full bg-[#050D1A] border border-gray-800 focus:border-primary rounded-lg pl-9 pr-3 py-2.5 text-xs text-gray-200 outline-none transition-colors appearance-none"
                        >
                          <option value="6-8">6 - 8 yrs</option>
                          <option value="9-11">9 - 11 yrs</option>
                          <option value="12-14">12 - 14 yrs</option>
                          <option value="15-17">15 - 17 yrs</option>
                        </select>
                      </div>
                    </div>

                    {/* School Code */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">School Code</label>
                      <div className="relative">
                        <School className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          maxLength={6}
                          value={schoolCode}
                          onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                          placeholder="6-char Code"
                          className="w-full bg-[#050D1A] border border-gray-800 focus:border-primary rounded-lg pl-9 pr-3 py-2.5 text-xs text-gray-200 placeholder-gray-600 outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full bg-[#050D1A] border border-gray-800 focus:border-primary rounded-lg pl-9 pr-3 py-2.5 text-xs text-gray-200 placeholder-gray-600 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#050D1A] border border-gray-800 focus:border-primary rounded-lg pl-9 pr-3 py-2.5 text-xs text-gray-200 placeholder-gray-600 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full font-bold mt-4"
            >
              {activeTab === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

function twMerge(...args: any[]) {
  return args.filter(Boolean).join(' ');
}

export default Auth;
