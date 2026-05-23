import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Shield, LogOut, Globe, Sun, Moon } from 'lucide-react';

import { useAuthStore } from './stores/useAuthStore';
import { useUIStore } from './stores/useUIStore';

// Import Pages
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Simulation from './pages/Simulation';
import Report from './pages/Report';
import Advisor from './pages/Advisor';
import Profile from './pages/Profile';

// Import i18n
import './i18n';
import { useTranslation } from 'react-i18next';

// ========================================================
// PROTECTED ROUTE GUARD
// ========================================================
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050D1A] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// ========================================================
// APP LAYOUT WRAPPER (HEADER + NAVBAR)
// ========================================================
const Layout: React.FC = () => {
  const { profile, logout } = useAuthStore();
  const { theme, toggleTheme, language, setLanguage } = useUIStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const handleLanguageChange = () => {
    const nextLang = language === 'en' ? 'hi' : 'en';
    setLanguage(nextLang);
    i18n.changeLanguage(nextLang);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050D1A]">
      {/* Header bar */}
      <header className="border-b border-gray-800/80 bg-[#0D1B2E]/60 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">{t('app_title')}</span>
          </Link>

          {profile && (
            <nav className="hidden md:flex items-center gap-1.5 ml-8">
              <Link to="/dashboard" className="px-3.5 py-2 text-xs font-semibold text-gray-300 hover:text-white rounded-lg hover:bg-gray-800/50 transition-colors">
                {t('nav_dashboard')}
              </Link>
              <Link to="/advisor" className="px-3.5 py-2 text-xs font-semibold text-gray-300 hover:text-white rounded-lg hover:bg-gray-800/50 transition-colors">
                {t('nav_advisor')}
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={handleLanguageChange}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all flex items-center gap-1.5"
            title="Switch Language"
          >
            <Globe className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase">{language}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {profile ? (
            <div className="flex items-center gap-3 ml-2 border-l border-gray-800 pl-3">
              <Link to="/profile" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300 uppercase">
                  {profile.full_name.charAt(0)}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">
                  {profile.full_name}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2 border-l border-gray-800 pl-3">
              <Link to="/auth" className="text-xs font-semibold text-gray-400 hover:text-white px-2 py-1.5 transition-colors">
                {t('nav_login')}
              </Link>
              <Link to="/auth" className="bg-primary hover:bg-blue-600 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white transition-colors">
                {t('nav_signup')}
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main body content */}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={profile ? <Navigate to="/dashboard" replace /> : <Auth />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/simulation" element={<ProtectedRoute><Simulation /></ProtectedRoute>} />
          <Route path="/report/:sessionId" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/advisor" element={<ProtectedRoute><Advisor /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer bar */}
      <footer className="border-t border-gray-800/80 bg-[#050D1A] py-6 px-4 text-center">
        <p className="text-[11px] text-gray-600">{t('footer_copy')}</p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Load active auth session on start
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: '#0D1B2E', color: '#F9FAFB', border: '1px solid #1E293B' } }} />
      <Layout />
    </BrowserRouter>
  );
};
export default App;
