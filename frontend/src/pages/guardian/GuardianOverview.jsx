import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  ShieldCheck, User, Lock, Eye, EyeOff, ArrowRight,
  TrendingUp, Activity, Zap, CheckCircle, AlertCircle,
  Brain, Heart, Calendar, Target, KeyRound, UserCheck
} from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';

// ── Student Access Panel ────────────────────────────────────────────────────
const StudentAccessPanel = ({ onVerified }) => {
  const { guardianVerify } = useAuth();
  const [form, setForm] = useState({ studentUsername: '', studentPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await guardianVerify(form.studentUsername, form.studentPassword);
      onVerified(session);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail[0].msg : detail || 'Verification failed. Check credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Welcome header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-5">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">Access Student Reports</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Enter your child's NeuroNest credentials to securely access their progress analytics and reports.
          </p>
        </div>

        {/* Security note */}
        <div className="mb-6 p-4 rounded-2xl bg-white/2 border border-white/8 flex gap-3">
          <UserCheck size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed">
            The student will receive an <span className="text-white font-semibold">instant notification</span> whenever you access their reports. Raw conversations and private chats are never shown.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[#0f1220] border border-white/8 rounded-3xl p-7 shadow-2xl">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20 flex items-center gap-2"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <User size={12} /> Student Username
              </label>
              <input
                type="text"
                required
                id="verify-student-username"
                value={form.studentUsername}
                onChange={e => setForm({ ...form, studentUsername: e.target.value })}
                placeholder="e.g. alex_learner"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <KeyRound size={12} /> Student Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  id="verify-student-password"
                  value={form.studentPassword}
                  onChange={e => setForm({ ...form, studentPassword: e.target.value })}
                  placeholder="Student's account password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500/50 focus:bg-white/8 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              id="verify-submit-btn"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white font-bold shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2 disabled:opacity-60"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
              ) : (
                <><ShieldCheck size={16} /> Unlock Reports <ArrowRight size={14} /></>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// ── Metric card ─────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, unit = '', color, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-[#0f1220] border border-white/5 rounded-2xl p-5 flex flex-col gap-3 border-l-4 ${color}`}
  >
    <div className="flex items-center justify-between">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <Icon size={18} className="text-gray-600" />
    </div>
    <h3 className="text-3xl font-extrabold text-white">
      {value ?? '—'}
      <span className="text-lg font-normal text-gray-400 ml-1">{unit}</span>
    </h3>
    {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
  </motion.div>
);

const EmotionalRing = ({ confidence, emotion }) => {
  const data = [
    { name: 'Emotional', value: emotion || 0, fill: '#a855f7' },
    { name: 'Confidence', value: confidence || 0, fill: '#f59e0b' },
  ];
  return (
    <div className="h-48 relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" data={data} startAngle={90} endAngle={-270}>
          <RadialBar dataKey="value" cornerRadius={6} />
          <Tooltip contentStyle={{ backgroundColor: '#0c0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-extrabold text-white">
          {Math.round(((confidence || 0) + (emotion || 0)) / 2)}%
        </span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Wellness</span>
      </div>
    </div>
  );
};

const getLevelBadge = (score) => {
  if (score >= 85) return { label: 'Advanced', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
  if (score >= 70) return { label: 'Developing', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
  if (score >= 50) return { label: 'Progressing', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
  return { label: 'Building', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
};

// ── Main Overview ───────────────────────────────────────────────────────────
const GuardianOverview = () => {
  const { guardianSession, setGuardianSession } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState('');
  // If session was just set by the panel, re-fetch metrics
  const [activeSession, setActiveSession] = useState(guardianSession);

  useEffect(() => {
    if (activeSession?.studentId) {
      fetchMetrics(activeSession.studentId);
    }
  }, [activeSession]);

  const fetchMetrics = async (studentId) => {
    setLoadingMetrics(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/connections/students/metrics/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load student data. Please try again.');
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleVerified = (session) => {
    setActiveSession(session);
  };

  // No student unlocked yet — show access panel
  if (!activeSession) {
    return <StudentAccessPanel onVerified={handleVerified} />;
  }

  // Loading metrics
  if (loadingMetrics) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading {activeSession.studentName}'s reports…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-red-400 font-semibold">{error}</p>
        <button
          onClick={() => setActiveSession(null)}
          className="text-sm text-amber-400 hover:text-amber-300 underline cursor-pointer"
        >
          Try a different student
        </button>
      </div>
    );
  }

  const level = metrics ? getLevelBadge(metrics.avg_confidence) : null;
  const getAnxietyLabel = (lvl) => {
    if (lvl == null) return null;
    if (lvl <= 3) return 'Low';
    if (lvl <= 6) return 'Moderate';
    return 'High';
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-amber-400/70 uppercase tracking-widest mb-1">Student Overview</p>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {metrics?.student?.fullname || activeSession?.studentName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {metrics?.student?.age && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                <User size={11} /> Age {metrics.student.age}
              </span>
            )}
            {level && (
              <span className={`flex items-center gap-1.5 text-xs font-bold border rounded-full px-3 py-1 ${level.bg} ${level.color}`}>
                <Brain size={11} /> {level.label} Communicator
              </span>
            )}
            {getAnxietyLabel(metrics?.student?.anxiety_level) && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                <Heart size={11} /> Anxiety: {getAnxietyLabel(metrics.student.anxiety_level)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setActiveSession(null)}
          className="text-xs text-gray-500 hover:text-amber-400 border border-white/10 hover:border-amber-500/30 px-4 py-2 rounded-xl transition-all cursor-pointer"
        >
          Switch Student
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp}  label="Confidence"     value={metrics?.avg_confidence} unit="%" color="border-amber-500"  sub="Avg across sessions" />
        <StatCard icon={Activity}    label="Emotional Index" value={metrics?.avg_emotion}    unit="%" color="border-purple-500" sub="Social engagement score" />
        <StatCard icon={Zap}         label="Practice Streak" value={metrics?.streak}         unit="days" color="border-blue-500"   sub="Consecutive active days" />
        <StatCard icon={CheckCircle} label="Sessions Done"   value={metrics?.sessions?.length || 0} color="border-emerald-500" sub="Total completed sessions" />
      </div>

      {/* Wellness + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#0f1220] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity size={16} className="text-amber-400" /> Wellness Overview
          </h3>
          <EmotionalRing confidence={metrics?.avg_confidence} emotion={metrics?.avg_emotion} />
          <div className="flex justify-center gap-6 mt-4">
            <span className="flex items-center gap-2 text-xs text-gray-400"><span className="w-3 h-3 rounded-full bg-amber-500" /> Confidence</span>
            <span className="flex items-center gap-2 text-xs text-gray-400"><span className="w-3 h-3 rounded-full bg-purple-500" /> Emotional</span>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#0f1220] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Target size={16} className="text-amber-400" /> Communication Goals
          </h3>
          {metrics?.student?.communication_goals ? (
            <p className="text-sm text-gray-300 leading-relaxed">{metrics.student.communication_goals}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">No goals set yet by the student.</p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-white/3 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Practice Time</p>
              <p className="text-xl font-bold text-white">{metrics?.practice_minutes || 0} <span className="text-sm text-gray-400 font-normal">min</span></p>
            </div>
            <div className="p-3 rounded-xl bg-white/3 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tasks Completed</p>
              <p className="text-xl font-bold text-white">{metrics?.completed_tasks || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-[#0f1220] border border-white/5 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-amber-400" /> Recent Sessions
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <ShieldCheck size={10} /> Summaries only
          </span>
        </h3>
        {metrics?.sessions?.length > 0 ? (
          <div className="space-y-2">
            {metrics.sessions.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 hover:border-amber-500/20 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-white">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold">{s.duration_minutes} min</span>
                  <p className="text-[10px] text-gray-600 mt-1">{new Date(s.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <CheckCircle size={28} className="text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No sessions completed yet.</p>
          </div>
        )}
      </div>

      {/* AI Report */}
      {metrics?.ai_reports?.length > 0 && (
        <div className="bg-[#0f1220] border border-amber-500/10 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Brain size={16} className="text-amber-400" /> Latest AI Insight
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">Strengths</p>
              <p className="text-xs text-gray-300 leading-relaxed">{metrics.ai_reports[0].strengths}</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Growth Areas</p>
              <p className="text-xs text-gray-300 leading-relaxed">{metrics.ai_reports[0].weaknesses}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Recommendations</p>
              <p className="text-xs text-gray-300 leading-relaxed">{metrics.ai_reports[0].recommendations}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardianOverview;
