import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Brain, Sparkles, ArrowRight, Activity, BookOpen } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { Card, Button } from '../components/ui';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuthStore();

  const handleStart = () => {
    if (profile) {
      navigate('/simulation');
    } else {
      navigate('/auth');
    }
  };

  const handleAdvisor = () => {
    if (profile) {
      navigate('/advisor');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="relative overflow-hidden flex-1 flex flex-col justify-center">
      {/* Background Glowing Orbs */}
      <div className="absolute top-20 left-1/4 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen Safety E-Learning</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
          AI-Powered Road Safety <br />
          <span className="text-gradient">Education & Evaluation</span>
        </h1>
        
        <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('landing_desc')} Experience CV scene reconstruction and interactive 3D simulations.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="primary" size="lg" onClick={handleStart} className="w-full sm:w-auto font-bold">
            {t('cta_start')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" size="lg" onClick={handleAdvisor} className="w-full sm:w-auto font-bold border-gray-800 hover:bg-gray-800/40">
            {t('cta_advisor')}
          </Button>
        </div>

        {/* Stats Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mt-20">
          <Card className="flex flex-col items-center justify-center py-6">
            <span className="font-mono text-3xl font-extrabold text-blue-400">18,248</span>
            <span className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">{t('stats_played')}</span>
          </Card>
          <Card className="flex flex-col items-center justify-center py-6">
            <span className="font-mono text-3xl font-extrabold text-violet-400">91,092</span>
            <span className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">{t('stats_decisions')}</span>
          </Card>
          <Card className="flex flex-col items-center justify-center py-6">
            <span className="font-mono text-3xl font-extrabold text-emerald-400">4,812</span>
            <span className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">{t('stats_protected')}</span>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-24 text-left">
          <Card hoverEffect className="flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-100 mb-2">{t('card_cv_title')}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{t('card_cv_desc')}</p>
            </div>
          </Card>

          <Card hoverEffect className="flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-5">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-100 mb-2">{t('card_sim_title')}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{t('card_sim_desc')}</p>
            </div>
          </Card>

          <Card hoverEffect className="flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-100 mb-2">{t('card_advisor_title')}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{t('card_advisor_desc')}</p>
            </div>
          </Card>
        </div>

        {/* Research citations */}
        <div className="border-t border-gray-800/80 max-w-4xl mx-auto mt-28 pt-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('research_title')}</span>
          </div>
          <p className="text-[11px] text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {t('research_desc')}
          </p>
          <p className="text-[10px] text-primary/75 font-mono mt-3 font-semibold">
            Nawaz et al., Applied Sciences 2025 (Route2School Methodology)
          </p>
        </div>
      </div>
    </div>
  );
};
export default Landing;
