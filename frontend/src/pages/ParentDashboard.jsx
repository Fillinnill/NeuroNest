import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Send, TrendingUp, AlertCircle, ShieldCheck, Sparkles, Activity, Clock, Zap, ArrowRight, BookOpen, Award, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ParentDashboard = () => {
  const { user, parentSession, guardianVerify } = useAuth();
  const [connections, setConnections] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentMetrics, setStudentMetrics] = useState(null);
  const [detailedMetrics, setDetailedMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isVerifyingStudent, setIsVerifyingStudent] = useState(false);
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Request form state
  const [requestForm, setRequestForm] = useState({
    student_username: '',
    relationship_type: 'Parent',
    reason: ''
  });
  const [requestStatus, setRequestStatus] = useState({ type: '', message: '' });

  const [verificationForm, setVerificationForm] = useState({
    student_username: '',
    student_password: '',
    student_verification_code: ''
  });
  const [verificationStatus, setVerificationStatus] = useState({ type: '', message: '' });

  const fetchConnections = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.get('/api/v1/connections/connections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnections(res.data);
      if (res.data.length > 0 && !selectedStudent) {
        setSelectedStudent(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching connected students', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('/api/v1/connections/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.slice(0, 6));
    } catch (err) {
      console.error('Error fetching guardian notifications', err);
    }
  };

  const fetchStudentMetrics = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/connections/students/metrics/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentMetrics(res.data);
    } catch (err) {
      console.error('Error fetching student metrics', err);
      setStudentMetrics(null);
    }
  };

  const fetchFullStudentMetrics = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/connections/students/metrics/${studentId}/full`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDetailedMetrics(res.data);
    } catch (err) {
      console.error('Error fetching detailed student metrics', err);
      setDetailedMetrics(null);
    }
  };

  const loadVerifiedStudent = async (studentId, studentName) => {
    setVerifiedStudent({ studentId, studentName });
    await fetchStudentMetrics(studentId);
    await fetchFullStudentMetrics(studentId);
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setVerificationStatus({ type: '', message: '' });
    setIsVerifyingStudent(true);

    try {
      const result = await guardianVerify({
        student_username: verificationForm.student_username,
        student_password: verificationForm.student_password,
        student_verification_code: verificationForm.student_verification_code
      });

      setVerificationStatus({
        type: 'success',
        message: `Secure access granted for ${result.student_name}. Your temporary guardian session is now active.`
      });
      await loadVerifiedStudent(result.student_id, result.student_name);
      setVerificationForm({ student_username: '', student_password: '', student_verification_code: '' });
      fetchConnections();
      fetchNotifications();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Unable to verify student credentials. Please try again.';
      setVerificationStatus({ type: 'error', message: detail });
    } finally {
      setIsVerifyingStudent(false);
    }
  };

  const clearSecureAccess = () => {
    setVerifiedStudent(null);
    setStudentMetrics(null);
    setDetailedMetrics(null);
    setVerificationStatus({ type: '', message: '' });
  };

  useEffect(() => {
    fetchConnections();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (parentSession?.studentId) {
      loadVerifiedStudent(parentSession.studentId, parentSession.studentName || 'Verified Student');
    }
  }, [parentSession]);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setRequestStatus({ type: '', message: '' });
    setIsSubmittingRequest(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/connections/requests/create', requestForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequestStatus({
        type: 'success',
        message: `Connection request sent! Ask @${requestForm.student_username} to accept it from their dashboard.`
      });
      setRequestForm({ student_username: '', relationship_type: 'Parent', reason: '' });
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to send request. Double check username.";
      setRequestStatus({ type: 'error', message: msg });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Recharts metric calculations
  const chartData = studentMetrics?.sessions.slice(0, 5).reverse().map(s => ({
    name: new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    'Duration (min)': s.duration_minutes
  })) || [
    { name: 'Mon', 'Duration (min)': 10 },
    { name: 'Tue', 'Duration (min)': 15 },
    { name: 'Wed', 'Duration (min)': 8 },
    { name: 'Thu', 'Duration (min)': 12 },
    { name: 'Fri', 'Duration (min)': 20 }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full min-h-screen fade-in pt-24 bg-gradient-to-br from-[#090514] via-[#0f0c24] to-[#0d071a]">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight flex items-center gap-2">
            <Users size={32} className="text-amber-500" /> Guardian Portal
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Monitor real-time communication growth, confidence indices, and AI-driven speech insights.
          </p>
        </div>
      </header>

      <div className="glass-card p-6 mb-10 border border-white/10 bg-white/5 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Secure Guardian Verification</h2>
            <p className="text-sm text-gray-400 max-w-2xl">
              Guardians must verify with the student's credentials or access code before accessing analytics. This creates a temporary, secure viewing session and sends an instant notification to the learner.
            </p>
          </div>

          {verifiedStudent ? (
            <div className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-4 text-amber-100 max-w-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-amber-300 font-semibold">Verified Student</p>
                  <p className="text-xl font-bold text-white mt-2">{verifiedStudent.studentName}</p>
                  <p className="text-xs text-gray-300 mt-1">Temporary access granted for approved analytics</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="text-[11px] px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/15 transition"
                  >
                    Download Report
                  </button>
                  <button
                    onClick={clearSecureAccess}
                    className="text-[11px] px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/15 transition"
                  >
                    Clear Secure Access
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerificationSubmit} className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-3 lg:col-span-2">
                {verificationStatus.message && (
                  <div className={`rounded-2xl p-4 text-sm border ${
                    verificationStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                      : 'bg-red-500/10 border-red-500/20 text-red-200'
                  }`}>
                    {verificationStatus.message}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-amber-300 font-semibold">Student Username</label>
                    <input
                      type="text"
                      required
                      value={verificationForm.student_username}
                      onChange={e => setVerificationForm({ ...verificationForm, student_username: e.target.value })}
                      placeholder="e.g. alex_learner"
                      className="input-premium text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-amber-300 font-semibold">Student Password</label>
                    <input
                      type="password"
                      value={verificationForm.student_password}
                      onChange={e => setVerificationForm({ ...verificationForm, student_password: e.target.value })}
                      placeholder="Student password"
                      className="input-premium text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-amber-300 font-semibold">Access Verification Code</label>
                  <input
                    type="text"
                    value={verificationForm.student_verification_code}
                    onChange={e => setVerificationForm({ ...verificationForm, student_verification_code: e.target.value })}
                    placeholder="Alternate verification code"
                    className="input-premium text-white"
                  />
                </div>
              </div>

              <div className="flex items-end justify-end">
                <button
                  type="submit"
                  disabled={isVerifyingStudent}
                  className="w-full rounded-3xl bg-gradient-to-r from-amber-600 to-yellow-500 text-white font-bold py-3 text-sm uppercase tracking-[0.14em] shadow-lg shadow-amber-500/20 hover:scale-[1.01] transition-transform"
                >
                  {isVerifyingStudent ? 'Verifying...' : 'Verify Access'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Connection Panel */}
        <div className="glass-card p-6 border-amber-500/20 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <UserPlus size={18} className="text-amber-400" /> Connect Student Profile
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Enter your child's NeuroNest username to request secure dashboard access.
            </p>

            {requestStatus.message && (
              <div className={`mb-6 p-4 rounded-xl text-xs border ${
                requestStatus.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {requestStatus.message}
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  Student Username
                </label>
                <input
                  type="text"
                  required
                  value={requestForm.student_username}
                  className="input-premium text-white py-2 text-sm border-white/10 focus:border-amber-500"
                  placeholder="e.g. alex_learner"
                  onChange={e => setRequestForm({ ...requestForm, student_username: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                    Relationship Type
                  </label>
                  <select
                    value={requestForm.relationship_type}
                    className="input-premium text-white py-2 text-sm bg-slate-950 border-white/10"
                    onChange={e => setRequestForm({ ...requestForm, relationship_type: e.target.value })}
                  >
                    <option value="Parent">Parent</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Educator">Educator</option>
                    <option value="Therapist">Therapist</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  Reason for access
                </label>
                <textarea
                  value={requestForm.reason}
                  className="input-premium text-white h-16 py-2 text-sm resize-none border-white/10 focus:border-amber-500"
                  placeholder="Provide a soft note explaining context..."
                  onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingRequest}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider"
              >
                <Send size={12} /> {isSubmittingRequest ? 'Sending...' : 'Request Access'}
              </button>
            </form>
          </div>
        </div>

        {/* Monitored Students Selector list */}
        <div className="lg:col-span-2 glass-card p-6 border-amber-500/20 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Users size={18} className="text-amber-400" /> Monitored Students Accounts
          </h3>
          <p className="text-xs text-gray-400 mb-6">
            Click on a connected student account below to retrieve approved progress metrics.
          </p>

          {connections.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {connections.map(conn => (
                <div
                  key={conn.id}
                  onClick={() => setSelectedStudent(conn)}
                  className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                    selectedStudent?.id === conn.id
                      ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/5'
                      : 'bg-white/5 border-white/5 hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-white text-base">{conn.student_name}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider">
                      {conn.relationship_type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Username: @{conn.student_username}</p>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Access approved on {new Date(conn.granted_at).toLocaleDateString()}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVerificationForm({
                        ...verificationForm,
                        student_username: conn.student_username
                      });
                      setSelectedStudent(conn);
                    }}
                    className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 text-[11px] uppercase tracking-[0.15em] text-amber-200 py-2 font-semibold hover:bg-white/10 transition"
                  >
                    Quick verify setup
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-44 border border-dashed border-white/10 rounded-xl flex flex-col justify-center items-center text-center p-6 bg-white/5">
              <Users size={32} className="text-gray-500 mb-2" />
              <p className="text-sm font-semibold text-gray-400">No active student profiles connected</p>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Use the Connection Panel on the left to send an access request to your child's learner profile username.
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {verifiedStudent && studentMetrics && (
          <motion.div
            key={verifiedStudent.studentId}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-10"
          >
            {/* Aggregate Progress Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-card p-6 border-l-4 border-amber-500">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Anxiety Streak</p>
                <h4 className="text-2xl font-extrabold text-white flex items-center gap-1.5">
                  <Zap size={20} className="text-amber-500" /> {studentMetrics.streak} Days
                </h4>
                <p className="text-[10px] text-gray-500 mt-1">Continuous practice logged</p>
              </div>

              <div className="glass-card p-6 border-l-4 border-blue-500">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Practice Duration</p>
                <h4 className="text-2xl font-extrabold text-white flex items-center gap-1.5">
                  <Clock size={20} className="text-blue-500" /> {studentMetrics.practice_minutes} mins
                </h4>
                <p className="text-[10px] text-gray-500 mt-1">Total voice/text exercise</p>
              </div>

              <div className="glass-card p-6 border-l-4 border-emerald-500">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Average Confidence</p>
                <h4 className="text-2xl font-extrabold text-white flex items-center gap-1.5">
                  <TrendingUp size={20} className="text-emerald-500" /> {studentMetrics.avg_confidence}%
                </h4>
                <p className="text-[10px] text-gray-500 mt-1">Speech clarity and pacing</p>
              </div>

              <div className="glass-card p-6 border-l-4 border-purple-500">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Emotional Index</p>
                <h4 className="text-2xl font-extrabold text-white flex items-center gap-1.5">
                  <Activity size={20} className="text-purple-500" /> {studentMetrics.avg_emotion}%
                </h4>
                <p className="text-[10px] text-gray-500 mt-1">Social scenario engagement</p>
              </div>
            </div>

            {/* Core analytics blocks */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="glass-card p-6 border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Confidence & Emotional Trend</h3>
                    <p className="text-xs text-gray-400">High-level trajectory from recent sessions.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchFullStudentMetrics(verifiedStudent.studentId)}
                    className="text-[11px] uppercase tracking-[0.16em] text-amber-300 font-semibold px-3 py-2 rounded-xl border border-amber-500/20 bg-white/5 hover:bg-white/10 transition"
                  >
                    Refresh
                  </button>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={detailedMetrics?.conversation_trend || []} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0d071a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                      <Line type="monotone" dataKey="confidence" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="emotion" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6 border-white/5">
                <h3 className="text-lg font-bold text-white mb-3">Daily Practice History</h3>
                <p className="text-xs text-gray-400 mb-6">Goal consistency and training rhythm over time.</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={detailedMetrics?.daily_history || []} margin={{ top: 12, right: 10, left: -14, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0d071a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                      <Bar dataKey="practice_minutes" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Practice Time */}
              <div className="lg:col-span-2 glass-card p-6 border-white/5">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Activity size={18} className="text-amber-500" /> Practice Time Pacing
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0d071a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        cursor={{ fill: '#ffffff02' }}
                      />
                      <Bar dataKey="Duration (min)" fill="#d97706" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Achievements Trophies */}
              <div className="glass-card p-6 border-white/5 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Award size={18} className="text-amber-500" /> Earned Badges & RPG Rewards
                  </h3>
                  <div className="space-y-4 max-h-56 overflow-y-auto pr-2 scrollbar-thin">
                    {studentMetrics.achievements.length > 0 ? (
                      studentMetrics.achievements.map(badge => (
                        <div key={badge.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                            <Award size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{badge.badge_name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Earned: {new Date(badge.earned_at).toLocaleDateString()}</p>
                          </div>
                          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-amber-300 font-bold font-mono">
                            +{badge.xp_reward} XP
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-8 italic">No badges unlocked yet. Keep practicing!</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Approved Reports & Safe Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Completed Practice Log (Strict privacy details) */}
              <div className="lg:col-span-2 glass-card p-6 border-white/5">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-500" /> Safe Practice Session Logs
                </h3>
                <p className="text-xs text-gray-400 mb-6 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-400" /> 
                  Approved high-level metadata only. Chat histories and transcripts are fully protected.
                </p>

                <div className="space-y-3">
                  {studentMetrics.sessions.length > 0 ? (
                    studentMetrics.sessions.slice(0, 4).map(session => (
                      <div key={session.id} className="p-3 rounded-lg bg-white/5 border border-white/5 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-white">{session.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{session.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="inline-block px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                            {session.duration_minutes} Mins
                          </span>
                          <span className="block text-[9px] text-gray-600 mt-1">
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 italic py-6 text-center">No social scenarios logged yet.</p>
                  )}
                </div>
              </div>

              {/* AI Report Summary */}
              <div className="glass-card p-6 border-white/5">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400 animate-pulse" /> AI Summarized Guidance
                </h3>
                <p className="text-xs text-gray-500 mb-6">
                  Constructive feedback synthesized by NeuroNest AI models.
                </p>

                {studentMetrics.ai_reports.length > 0 ? (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-[#a855f7]/5 border border-[#a855f7]/15">
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Key Strengths</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{studentMetrics.ai_reports[0].strengths}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/15">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Growth Areas</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{studentMetrics.ai_reports[0].weaknesses}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-[#10b981]/5 border border-[#10b981]/15">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Recommendations</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{studentMetrics.ai_reports[0].recommendations}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 rounded-lg border border-white/5 bg-white/5 flex flex-col justify-center items-center text-center p-4">
                    <AlertCircle size={24} className="text-gray-500 mb-1" />
                    <p className="text-xs text-gray-400 font-medium">Awaiting next weekly report</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Logs are compiled automatically each Sunday.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card p-6 border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Notifications & Activity</h3>
                  <p className="text-xs text-gray-400">Recent access alerts and report activity for your guardian account.</p>
                </div>
                <button
                  type="button"
                  onClick={fetchNotifications}
                  className="text-[11px] uppercase tracking-[0.16em] text-amber-300 font-semibold px-3 py-2 rounded-xl border border-amber-500/20 bg-white/5 hover:bg-white/10 transition"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.map(note => (
                    <div key={note.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] text-gray-400 uppercase tracking-[0.22em] mb-2">{note.type.replace('_', ' ')}</p>
                      <p className="text-sm text-white leading-relaxed">{note.message}</p>
                      <p className="text-[10px] text-gray-500 mt-2">{new Date(note.created_at).toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
                    No recent notifications yet. Guardian activity logs will appear here as your access is used.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-Diagnostic Disclaimer */}
      <footer className="mt-16 border-t border-white/10 pt-6 pb-4 text-center text-xs text-gray-400/80 flex items-center justify-center gap-2 max-w-4xl mx-auto">
        <ShieldCheck size={14} className="text-amber-500" />
        <span>
          NeuroNest provides supportive communication insights. It is strictly non-diagnostic and does not medically diagnose anxiety, autism, or other conditions.
        </span>
      </footer>
    </div>
  );
};

export default ParentDashboard;
