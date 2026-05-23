import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Card, Button, Badge, Skeleton } from '../components/ui';
import { CategoryRadarChart } from '../components/dashboard/AnalyticsCharts';
import { Share2, Download, Shield, Check, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const Report: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/sessions/${sessionId}/report`);
        setReport(res.data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load session report.');
      } finally {
        setIsLoading(true); // wait, let's keep it true or false?
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [sessionId]);

  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Report link copied to clipboard!');
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    toast.loading('Generating PDF report...', { id: 'pdf' });
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#050D1A',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width
      const pageHeight = 295; // A4 height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`roadsense-safety-report-${sessionId?.slice(0, 8)}.pdf`);
      toast.success('PDF download complete!', { id: 'pdf' });
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed.', { id: 'pdf' });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton variant="rect" className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton variant="rect" className="h-80" />
          <Skeleton variant="rect" className="h-80" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-xl font-bold text-white">Report not found</h3>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const accuracy = report.percentage_score;
  const grade = report.grade;

  // Grade Emojis
  const gradeIcons: Record<string, string> = {
    Expert: '🏆',
    Proficient: '⭐',
    Developing: '📈',
    Beginner: '🌱'
  };

  // Mapped categories list for display
  const categoryLabelMap: Record<string, string> = {
    signal_knowledge: 'Signals & Traffic Lights',
    risk_detection: 'Risk Detection',
    situation_awareness: 'Situation Awareness',
    risk_management: 'Risk Management',
    pedestrian_rules: 'Pedestrian Rules',
    emergency_protocol: 'Emergency Protocols'
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Action controls */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" className="border-gray-800 hover:bg-gray-800" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-gray-800 hover:bg-gray-800" onClick={handleShare}>
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Share
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownloadPDF}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* PDF Export Scope container */}
      <div ref={reportRef} className="space-y-6 p-1 bg-[#050D1A] rounded-2xl">
        {/* Header grade banner */}
        <div className="bg-gradient-to-r from-blue-600/15 via-purple-600/10 to-transparent border border-blue-500/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="text-6xl p-4 bg-black/25 rounded-2xl border border-white/5 shadow-inner">
            {gradeIcons[grade] || '🌱'}
          </div>
          <div className="text-center sm:text-left space-y-1.5">
            <Badge variant="purple" className="text-xs uppercase tracking-wider font-extrabold px-3 py-0.5">
              Grade Assigned
            </Badge>
            <h2 className="text-3xl font-black text-white leading-none">{grade} Class Safety</h2>
            <p className="text-xs text-gray-400">Road Safety evaluation complete. Level {report.level} review.</p>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <span className="text-[10px] text-gray-500 uppercase font-bold block">Total Points</span>
            <span className="font-mono text-2xl font-black text-white">{report.total_score}</span>
            <span className="text-[9px] text-gray-600 block mt-0.5">Max {report.max_possible_score}</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[10px] text-gray-500 uppercase font-bold block">Accuracy Rating</span>
            <span className="font-mono text-2xl font-black text-blue-400">{accuracy}%</span>
            <span className="text-[9px] text-gray-600 block mt-0.5">Correct choices</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[10px] text-gray-500 uppercase font-bold block">Reaction Speed</span>
            <span className="font-mono text-2xl font-black text-violet-400">{(report.avg_reaction_time_ms / 1000).toFixed(1)}s</span>
            <span className="text-[9px] text-gray-600 block mt-0.5">Avg reaction speed</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[10px] text-gray-500 uppercase font-bold block">Risk Tendency</span>
            <span className="font-mono text-sm font-black text-amber-400 uppercase leading-8">{report.risk_tendency}</span>
          </Card>
        </div>

        {/* Graphs & Tip shelf */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Radar chart of categories */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-gray-200 mb-4">Category Safety Breakdown</h3>
            {/* Convert list to dictionary */}
            <CategoryRadarChart
              data={report.category_scores.reduce((acc: any, cur: any) => {
                acc[cur.category] = cur.percentage;
                return acc;
              }, {})}
            />
          </Card>

          {/* Feedback Advisor Tip & Badges earned */}
          <div className="space-y-6 flex flex-col">
            <Card className="p-6 bg-gradient-to-br from-blue-600/5 to-transparent border border-blue-500/10 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-primary mb-3">
                  <Shield className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase tracking-wider">Advisor Personal Tip</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-medium">
                  {report.improvement_tip}
                </p>
              </div>
              <p className="text-[10px] text-gray-500 mt-4 leading-normal">
                Our Advisor uses research from the Route2School study (Belgium) to highlight areas of impulsiveness and optimize road safety reactions.
              </p>
            </Card>

            {/* Badges Shelf */}
            <Card className="p-6">
              <h3 className="text-sm font-bold text-gray-200 mb-4">Badges Earned</h3>
              <div className="flex gap-2 flex-wrap">
                {report.badges && report.badges.map((b: any, idx: number) => (
                  <div key={idx} className="bg-violet-500/5 border border-violet-500/20 rounded-xl px-3 py-2 flex items-center gap-2" title={b.badge_description}>
                    <span className="text-xl">{b.icon_emoji}</span>
                    <div>
                      <h4 className="text-[10px] font-extrabold text-white leading-none">{b.badge_name}</h4>
                      <span className="text-[8px] text-gray-500 mt-0.5 block">{b.badge_type}</span>
                    </div>
                  </div>
                ))}
                {(!report.badges || report.badges.length === 0) && (
                  <span className="text-xs text-gray-500 italic">No badges earned in this session.</span>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Detailed Decisions Ledger */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-200 mb-4">Questions Performance Review</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase">
                  <th className="pb-3 pl-2">Q#</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Your Choice</th>
                  <th className="pb-3 text-center">Correct Option</th>
                  <th className="pb-3 text-center">Reaction Time</th>
                  <th className="pb-3 pr-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {report.decisions.map((dec: any) => {
                  const type = dec.scenarios?.scenario_type || 'vehicle';
                  const label = categoryLabelMap[type] || type;

                  return (
                    <tr key={dec.id} className="border-b border-gray-800/50 hover:bg-gray-800/10 transition-colors">
                      <td className="py-3.5 pl-2 font-bold text-gray-400">#{dec.question_number}</td>
                      <td>
                        <span className="font-bold text-gray-200 block">{dec.scenarios?.title || 'Safety Check'}</span>
                        <span className="text-[10px] text-gray-500 block capitalize mt-0.5">{label}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          {dec.is_correct ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <span className={dec.is_correct ? 'text-emerald-400' : 'text-red-400 font-medium'}>
                            {dec.answer_given}
                          </span>
                        </div>
                      </td>
                      <td className="text-center font-semibold text-gray-300">{dec.correct_answer}</td>
                      <td className="text-center font-mono">{(dec.reaction_time_ms / 1000).toFixed(2)}s</td>
                      <td className="text-right pr-2 font-mono font-bold text-blue-400">+{dec.points_earned}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="flex justify-center gap-3 pt-4">
        <Button variant="outline" className="border-gray-800 hover:bg-gray-800" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
        <Button variant="primary" onClick={() => navigate('/simulation')}>
          Play Another Level
        </Button>
      </div>
    </div>
  );
};

export default Report;
