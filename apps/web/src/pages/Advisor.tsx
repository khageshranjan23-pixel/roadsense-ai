import React, { useState } from 'react';
import { AdvisorUploadZone, AdvisorChatWindow } from '../components/advisor/AdvisorChat';
import { useAdvisorStore } from '../stores/useAdvisorStore';
import { useUIStore } from '../stores/useUIStore';
import { Card, Badge } from '../components/ui';
import { Info, List, TrafficCone } from 'lucide-react';

export const Advisor: React.FC = () => {
  const { sceneContext, riskAssessment, detectedObjects } = useAdvisorStore();
  const { language, setLanguage } = useUIStore();
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Tips dynamically derived from detected objects
  const getDynamicTips = () => {
    const tips: string[] = [];
    if (detectedObjects.includes('car') || detectedObjects.includes('bus') || detectedObjects.includes('truck')) {
      tips.push("Heavy vehicles have longer braking distances. Never step in front of them.");
    }
    if (detectedObjects.includes('person')) {
      tips.push("Cross together with other pedestrians when possible for higher visibility.");
    }
    if (sceneContext?.traffic_light_color === 'red') {
      tips.push("Red light means STOP. It is illegal and highly dangerous to cross now.");
    }
    if (sceneContext?.traffic_light_color === 'yellow') {
      tips.push("Yellow light means prepare to stop. Vehicles may accelerate to beat the light; do not cross.");
    }
    if (tips.length === 0) {
      tips.push("Always look left, right, and left again before stepping off the curb.");
      tips.push("Use designated zebra crossings and wait for traffic to fully halt.");
    }
    return tips;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 flex-1 flex flex-col justify-center animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-extrabold text-white">AI Road Safety Advisor</h2>
          <p className="text-xs text-gray-400 mt-1">Real-time safety evaluations and conversation</p>
        </div>
        <div className="flex gap-2">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="px-3.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs font-bold text-gray-300 hover:text-white transition-colors"
          >
            Language: {language === 'en' ? 'English' : 'हिंदी'}
          </button>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="md:hidden px-3.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs font-bold text-gray-300 hover:text-white transition-colors flex items-center gap-1"
          >
            <List className="w-4 h-4" />
            Specs
          </button>
        </div>
      </div>

      {/* Three Panel Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Left Panel: Media Upload Box (4 cols) */}
        <div className="md:col-span-4 h-full">
          <AdvisorUploadZone />
        </div>

        {/* Center Panel: Conversation Chat Box (5 or 8 cols depending on right sidebar) */}
        <div className={twMerge("h-full transition-all duration-300", rightPanelOpen ? "md:col-span-5" : "md:col-span-8")}>
          <AdvisorChatWindow />
        </div>

        {/* Right Panel: Context specs and dynamic tips (3 cols) */}
        {rightPanelOpen && (
          <div className="md:col-span-3 h-full animate-in slide-in-from-right-4 duration-300">
            <Card className="h-full space-y-5 border-gray-800 bg-[#0D1B2E]/50">
              {/* Heading */}
              <div className="flex items-center gap-1.5 text-primary">
                <Info className="w-4 h-4" />
                <span className="font-bold text-xs uppercase tracking-wider">Scene Specifications</span>
              </div>

              {/* Specs parameters lists */}
              <div className="space-y-3.5 text-xs">
                {sceneContext ? (
                  <>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Risk Evaluation</span>
                      {riskAssessment && (
                        <Badge variant={riskAssessment === 'SAFE' ? 'success' : (riskAssessment === 'CAUTION' ? 'warning' : 'danger')}>
                          {riskAssessment}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Signal Light State</span>
                      <span className="font-semibold text-gray-200 capitalize">
                        {sceneContext.traffic_light_color === 'none' ? 'No signal detected' : `${sceneContext.traffic_light_color} phase`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Fastest Target Tracked</span>
                      <span className="font-mono text-gray-200 font-semibold">
                        {sceneContext.fastest_vehicle_speed > 0 ? `${sceneContext.fastest_vehicle_speed.toFixed(1)} pixels/frame` : '0.0 px/frame'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Proximity Clearance</span>
                      <span className="font-mono text-gray-200 font-semibold">
                        {sceneContext.closest_vehicle_distance < 999.0 ? `${Math.round(sceneContext.closest_vehicle_distance)} pixels` : 'Clear road'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500 italic py-4 text-center">
                    No active context. Upload a photo to extract scene coordinates.
                  </div>
                )}
              </div>

              {/* Dynamic educational safety tips */}
              <div className="border-t border-gray-800/80 pt-4 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-500">
                  <TrafficCone className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase tracking-wider">Safety Guidelines</span>
                </div>
                <ul className="space-y-2.5">
                  {getDynamicTips().map((tip, idx) => (
                    <li key={idx} className="text-[11px] text-gray-300 leading-normal flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

function twMerge(...args: any[]) {
  return args.filter(Boolean).join(' ');
}

export default Advisor;
