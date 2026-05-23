import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar
} from 'recharts';

// ========================================================
// RADAR CHART FOR SAFETY CATEGORIES
// ========================================================
interface CategoryRadarProps {
  data: Record<string, number>; // { signal_knowledge: 85, ... }
}

export const CategoryRadarChart: React.FC<CategoryRadarProps> = ({ data }) => {
  // Format data for Recharts
  // Categories mappings
  const labelMapping: Record<string, string> = {
    signal_knowledge: 'Signals',
    risk_detection: 'Risk Detection',
    situation_awareness: 'Awareness',
    risk_management: 'Risk Mgmt',
    pedestrian_rules: 'Pedestrian Rules',
    emergency_protocol: 'Emergency'
  };

  const formattedData = Object.entries(data).map(([key, value]) => ({
    subject: labelMapping[key] || key,
    value: value,
    fullMark: 100
  }));

  if (formattedData.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-xs text-gray-500 italic">
        No category scores available yet. Play a session!
      </div>
    );
  }

  return (
    <div className="w-full h-[260px] flex items-center justify-center font-mono text-[10px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={formattedData}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" stroke="#94A3B8" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
          <Radar
            name="Accuracy"
            dataKey="value"
            stroke="#2563EB"
            fill="#2563EB"
            fillOpacity={0.25}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ========================================================
// LINE CHART FOR PROGRESS HISTORY
// ========================================================
interface PerformanceHistoryProps {
  history: Array<{ date: string; score: number }>;
}

export const PerformanceHistoryChart: React.FC<PerformanceHistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-gray-500 italic">
        No performance history available.
      </div>
    );
  }

  return (
    <div className="w-full h-[220px] font-mono text-[10px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="date" stroke="#64748B" />
          <YAxis domain={[0, 100]} stroke="#64748B" />
          <Tooltip
            contentStyle={{ backgroundColor: '#0D1B2E', borderColor: '#1E293B', borderRadius: '8px' }}
            labelClassName="text-gray-400 font-bold"
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#7C3AED"
            strokeWidth={3}
            activeDot={{ r: 6 }}
            dot={{ r: 4, stroke: '#7C3AED', strokeWidth: 2, fill: '#050D1A' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ========================================================
// BAR CHART FOR CLASS DISTRIBUTION
// ========================================================
interface DistributionProps {
  distribution: Record<string, number>; // { Expert: 5, Proficient: 10, ... }
}

export const ClassDistributionChart: React.FC<DistributionProps> = ({ distribution }) => {
  const formattedData = Object.entries(distribution).map(([grade, count]) => ({
    name: grade,
    Students: count
  }));

  const hasData = Object.values(distribution).some(v => v > 0);

  if (!hasData) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-gray-500 italic">
        No class distribution metrics.
      </div>
    );
  }

  return (
    <div className="w-full h-[220px] font-mono text-[10px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="name" stroke="#64748B" />
          <YAxis stroke="#64748B" allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0D1B2E', borderColor: '#1E293B', borderRadius: '8px' }}
          />
          <Bar dataKey="Students" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
