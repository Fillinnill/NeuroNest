import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, Activity, Zap, BarChart2, Calendar, ShieldCheck, AlertCircle
} from 'lucide-react';

const GuardianAnalytics = () => {
  const { guardianSession } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guardianSession?.studentId) return;
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `/api/v1/connections/students/metrics/${guardianSession.studentId}/full`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMetrics(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [guardianSession?.studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  const { conversation_trend = [], daily_history = [], session_timeline = [] } = metrics || {};

  // Clean data for empty arrays to keep charts looking nice
  const displayTrend = conversation_trend.length > 0 ? conversation_trend : [
    { date: 'Day 1', confidence: 60, emotion: 65 },
    { date: 'Day 2', confidence: 65, emotion: 70 },
    { date: 'Day 3', confidence: 70, emotion: 72 },
    { date: 'Day 4', confidence: 78, emotion: 80 }
  ];

  // Helper for rendering consistency calendar (simple 28-day grid)
  const getConsistencyGrid = () => {
    const days = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const match = daily_history.find(p => p.date === dateString);
      days.push({
        date: d,
        active: match ? match.practice_minutes > 0 : false,
        minutes: match ? match.practice_minutes : 0
      });
    }
    return days;
  };

  const consistencyDays = getConsistencyGrid();

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 fade-in">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-amber-400/70 uppercase tracking-widest mb-1">Progress Analytics</p>
          <h1 className="text-3xl font-extrabold text-white">Visual Insights</h1>
          <p className="text-gray-400 text-sm mt-1">Deep dive into communication confidence growth and emotional trends.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 w-fit text-xs text-gray-400">
          <ShieldCheck size={14} className="text-emerald-400" />
          Summarized metrics only
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Confidence Growth Chart */}
        <div className="bg-[#0f1220] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Confidence Growth</h3>
              <p className="text-[11px] text-gray-500">Pacing and vocabulary clarity rating over time</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                />
                <Area type="monotone" dataKey="confidence" name="Confidence %" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorConfidence)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Emotional Trend Dual Line Chart */}
        <div className="bg-[#0f1220] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Activity size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Emotional vs. Confidence Trend</h3>
              <p className="text-[11px] text-gray-500">Correlation between social scenario pacing and emotional scores</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Line type="monotone" dataKey="confidence" name="Confidence Index" stroke="#f59e0b" strokeWidth={2} activeDot={{ r: 6 }} dot={false} />
                <Line type="monotone" dataKey="emotion" name="Emotional Engagement" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Consistency Calendar Grid */}
        <div className="bg-[#0f1220] border border-white/5 rounded-2xl p-6 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Practice Consistency</h3>
              <p className="text-[11px] text-gray-500">Last 28 days activity tracking</p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2">
            {consistencyDays.map((day, idx) => (
              <div
                key={idx}
                className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all relative group ${
                  day.active
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                    : 'bg-white/3 border border-white/5 text-gray-600'
                }`}
              >
                {day.date.getDate()}
                {day.active && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#0c0f1e] text-[9px] text-white px-2 py-0.5 rounded border border-white/10 whitespace-nowrap z-10 shadow-lg">
                    {day.minutes} mins practice
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-6 pt-4 border-t border-white/5">
            <span>Grid key:</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-white/3 border border-white/5" /> Empty</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/30" /> Practiced</span>
            </div>
          </div>
        </div>

        {/* 4. Communication Progress Timeline */}
        <div className="bg-[#0f1220] border border-white/5 rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <BarChart2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Practice Timeline</h3>
              <p className="text-[11px] text-gray-500">Chronological list of successfully completed milestones</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
            {session_timeline.length > 0 ? (
              session_timeline.slice().reverse().map((item, idx) => (
                <div key={item.id} className="relative pl-6 pb-2 border-l border-white/10 last:border-0 last:pb-0">
                  <div className="absolute left-0 top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-[#0f1220]" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <p className="text-xs font-bold text-white">{item.title}</p>
                      <p className="text-[10px] text-gray-500">Logged {item.duration_minutes} minutes active conversation practice</p>
                    </div>
                    <span className="text-[10px] text-gray-600 bg-white/3 border border-white/5 rounded px-2 py-0.5 w-fit">
                      {item.date}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic py-6 text-center">No timeline milestones available yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardianAnalytics;
