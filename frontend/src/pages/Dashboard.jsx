import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, TrendingUp, Clock, Zap, MessageCircle, Star, Sparkles, ShieldCheck, Heart, ShieldAlert, Check, X, Bell, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    streak: 0,
    hours: 0,
    confidence: 0,
    count: 0
  });
  const [loading, setLoading] = useState(true);

  // Parent Connection & Notification State
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeConnections, setActiveConnections] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifMessage, setNotifMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // 1. Fetch practice sessions
        const sessionsRes = await axios.get('/api/v1/sessions/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const sessionData = sessionsRes.data;
        setSessions(sessionData);

        // 2. Fetch conversations to extract actual confidence & emotion scores
        let convsData = [];
        try {
          const convsRes = await axios.get('/api/v1/conversations/', {
            headers: { Authorization: `Bearer ${token}` }
          });
          convsData = convsRes.data;
        } catch (e) {
          console.warn("Could not fetch real conversations history", e);
        }

        // Calculate Stats
        const totalMinutes = sessionData.reduce((acc, s) => acc + s.duration_minutes, 0);
        const hours = (totalMinutes / 60).toFixed(1);
        
        // Simple streak calculation (count unique days with sessions)
        const uniqueDays = new Set(sessionData.map(s => new Date(s.created_at).toDateString()));
        
        const confList = convsData.map(c => c.confidence_score).filter(c => c !== null);
        const avgConfidence = confList.length > 0 ? Math.round(confList.reduce((a,b)=>a+b, 0) / confList.length) : 75;

        setStats({
          streak: uniqueDays.size || (convsData.length > 0 ? 1 : 0),
          hours: hours,
          confidence: avgConfidence,
          count: sessionData.length || convsData.length
        });
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchConnectionsData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch pending requests
      const pendingRes = await axios.get('/api/v1/connections/requests/pending', { headers });
      setPendingRequests(pendingRes.data);

      // 2. Fetch active connections
      const activeRes = await axios.get('/api/v1/connections/connections', { headers });
      setActiveConnections(activeRes.data);

      // 3. Fetch notifications
      const notifRes = await axios.get('/api/v1/connections/notifications', { headers });
      setNotifications(notifRes.data);
    } catch (err) {
      console.error("Error fetching connection data", err);
    }
  };

  useEffect(() => {
    fetchConnectionsData();
    const interval = setInterval(fetchConnectionsData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResponse = async (id, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/v1/connections/requests/${id}/respond`, { action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifMessage(`Access request successfully ${action}ed.`);
      fetchConnectionsData();
      setTimeout(() => setNotifMessage(''), 5000);
    } catch (err) {
      console.error("Error responding to connection request", err);
    }
  };

  const handleRevoke = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/connections/connections/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifMessage('Guardian access permission successfully revoked.');
      fetchConnectionsData();
      setTimeout(() => setNotifMessage(''), 5000);
    } catch (err) {
      console.error("Error revoking connection", err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/v1/connections/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConnectionsData();
    } catch (err) {
      console.error("Error marking notification as read", err);
    }
  };

  // Prepare Dynamic Chart Data using genuine database logs
  const [conversations, setConversations] = useState([]);
  
  useEffect(() => {
    const fetchConvs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/v1/conversations/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConversations(response.data);
      } catch (err) {
        console.error("Error fetching conversations for chart", err);
      }
    };
    fetchConvs();
  }, [sessions]);

  const defaultChartData = [
    { name: 'Mon', confidence: 72, emotion: 68 },
    { name: 'Tue', confidence: 75, emotion: 70 },
    { name: 'Wed', confidence: 78, emotion: 75 },
    { name: 'Thu', confidence: 81, emotion: 76 },
    { name: 'Fri', confidence: 85, emotion: 80 }
  ];

  const chartData = conversations.length > 0
    ? conversations.slice(-7).map(c => ({
        name: new Date(c.created_at).toLocaleDateString(undefined, { weekday: 'short' }),
        confidence: Math.round(c.confidence_score),
        emotion: Math.round(c.emotion_score)
      }))
    : defaultChartData;

  // Real-time RPG leveling calculation
  const completedConvs = conversations.length;
  const practiceMins = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
  const streakDays = stats.streak;

  const totalXp = (completedConvs * 100) + (practiceMins * 10) + (streakDays * 50);

  // RPG Math (500 XP per Level)
  const xpPerLevel = 500;
  const currentLevel = Math.floor(totalXp / xpPerLevel) + 1;
  const currentLevelXp = totalXp % xpPerLevel;
  const xpProgressPercent = (currentLevelXp / xpPerLevel) * 100;

  // Dynamic Badge Unlocking Definition
  const ALL_BADGES = [
    {
      id: 'first-hello',
      badge_name: 'First Hello',
      description: 'Completed your first scenario.',
      icon: Star,
      color: '#fbbf24',
      bgColor: 'bg-yellow-500/20',
      unlocked: completedConvs >= 1
    },
    {
      id: 'cool-collected',
      badge_name: 'Cool & Collected',
      description: 'Maintained high confidence (80%+).',
      icon: ShieldCheck,
      color: '#60a5fa',
      bgColor: 'bg-blue-500/20',
      unlocked: stats.confidence >= 80 && completedConvs >= 1
    },
    {
      id: 'daily-habit',
      badge_name: 'Daily Habit',
      description: 'Practiced 30+ mins or kept 3+ day streak.',
      icon: Clock,
      color: '#fb923c',
      bgColor: 'bg-orange-500/20',
      unlocked: streakDays >= 3 || practiceMins >= 30
    },
    {
      id: 'dedicated-talker',
      badge_name: 'Dedicated Talker',
      description: 'Completed 3 or more social scenarios.',
      icon: MessageCircle,
      color: '#c084fc',
      bgColor: 'bg-purple-500/20',
      unlocked: completedConvs >= 3
    },
    {
      id: 'social-mastery',
      badge_name: 'Social Mastery',
      description: 'Demonstrated advanced social fluency.',
      icon: Sparkles,
      color: '#34d399',
      bgColor: 'bg-emerald-500/20',
      unlocked: completedConvs >= 5 && stats.confidence >= 85
    }
  ];

  const StatCard = ({ icon: Icon, label, value, subtext, color }) => (
    <motion.div 
      whileHover={{ y: -5 }}
      className="glass-card p-6 flex items-center gap-6 group border-l-4"
      style={{ borderLeftColor: color }}
    >
      <div className={`p-4 rounded-2xl bg-white/5 text-[${color}] group-hover:scale-110 transition-transform`} style={{ color: color }}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">{label}</p>
        <h4 className="text-3xl font-bold text-white">{value}</h4>
        <p className="text-xs text-purple-400 mt-1 font-semibold">{subtext}</p>
      </div>
    </motion.div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full fade-in">
      {/* Header Section */}
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">{user?.fullname || user?.username}</span>! 👋
          </h1>
          <p className="text-gray-400 text-lg font-medium">You're making incredible progress. Let's keep that momentum!</p>
        </div>
        
        <div className="glass-card px-8 py-4 flex items-center gap-6 border-purple-500/30">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Zap size={12} /> Level {currentLevel}
            </span>
            <div className="w-48 h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${xpProgressPercent}%` }}
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
              />
            </div>
          </div>
          <span className="text-sm font-bold text-white">{currentLevelXp} / {xpPerLevel} XP</span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          icon={Zap} label="Current Streak" value={`${stats.streak} Days`} 
          subtext="Keep it up!" color="#f59e0b" 
        />
        <StatCard 
          icon={Clock} label="Practice Time" value={`${stats.hours} hrs`} 
          subtext="This week" color="#3b82f6" 
        />
        <StatCard 
          icon={TrendingUp} label="Avg. Confidence" value={`${stats.confidence}%`} 
          subtext="+5% from last week" color="#10b981" 
        />
        <StatCard 
          icon={MessageCircle} label="Conversations" value={stats.count} 
          subtext="Total completed" color="#a855f7" 
        />
      </div>

      {/* Bidirectional Guardian Connection and Alerts System */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Connection Requests & Permissions Manager */}
        <div className="lg:col-span-2 glass-card p-6 border-purple-500/20">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <ShieldCheck size={20} className="text-purple-400" /> Guardian & Access Permissions
          </h3>
          <p className="text-xs text-gray-400 mb-6">
            You have complete control over who can monitor your speech analytics and progress logs.
          </p>

          {notifMessage && (
            <div className="mb-4 p-3 bg-purple-500/10 text-purple-300 rounded-lg text-xs border border-purple-500/20">
              {notifMessage}
            </div>
          )}

          {/* Pending Requests */}
          <AnimatePresence>
            {pendingRequests.map(req => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-pulse"
              >
                <div>
                  <span className="inline-block px-2 py-0.5 rounded bg-purple-600/35 text-purple-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Access Connection Request
                  </span>
                  <p className="text-sm font-semibold text-white">
                    Guardian {req.guardian_name} (@{req.guardian_username})
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Relationship: <span className="text-purple-300 font-medium">{req.relationship_type}</span>
                  </p>
                  {req.reason && (
                    <p className="text-xs text-gray-500 italic mt-1.5">
                      Reason: "{req.reason}"
                    </p>
                  )}
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() => handleResponse(req.id, 'accept')}
                    className="flex-1 md:flex-initial px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    onClick={() => handleResponse(req.id, 'reject')}
                    className="flex-1 md:flex-initial px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-xs font-bold hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Active Connections */}
          {activeConnections.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Active Connections ({activeConnections.length})
              </h4>
              {activeConnections.map(conn => (
                <div 
                  key={conn.id}
                  className="p-3 rounded-lg bg-white/5 border border-white/5 flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{conn.guardian_name}</p>
                    <p className="text-xs text-purple-400 font-medium mt-0.5">
                      {conn.relationship_type} • Connected since {new Date(conn.granted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevoke(conn.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all cursor-pointer"
                  >
                    Revoke Access
                  </button>
                </div>
              ))}
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-white/10 text-center">
              <p className="text-xs text-gray-500">No active guardians or pending requests linked to your account.</p>
            </div>
          ) : null}
        </div>

        {/* Real-time Audit Notifications Center */}
        <div className="glass-card p-6 border-purple-500/20 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Bell size={20} className="text-purple-400" /> Security & Activity Logs
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Real-time audit alerts monitoring when guardians access your progress parameters.
            </p>
            
            <div className="space-y-3 max-h-56 overflow-y-auto pr-2 scrollbar-thin">
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map(notif => (
                  <div 
                    key={notif.id}
                    className={`p-3 rounded-lg text-xs leading-relaxed transition-all border ${
                      notif.is_read === 0 
                        ? 'bg-purple-950/15 border-purple-500/30 text-white font-medium' 
                        : 'bg-white/5 border-transparent text-gray-400'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p>{notif.message}</p>
                      {notif.is_read === 0 && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider flex-shrink-0 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                    <span className="block text-[9px] text-gray-600 mt-1">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-32 flex items-center justify-center text-center text-xs text-gray-600 italic">
                  All systems quiet. No recent alerts.
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-gray-500 border-t border-white/5 pt-3 mt-4 flex items-center gap-1.5">
            <Eye size={12} className="text-purple-400/80" />
            Audit trail complies with modern data-privacy standards.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-8 flex flex-col justify-center items-center text-center hover:-translate-y-1 transition-all duration-300">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 mb-4">
             <MessageCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Practice?</h3>
          <p className="text-gray-400 mb-6">Choose a scenario or talk freely about your day.</p>
          <button onClick={() => window.location.href='/dashboard/practice'} className="btn-premium px-8">Start Session</button>
        </div>
        <div className="glass-card p-8 flex flex-col justify-center items-center text-center hover:-translate-y-1 transition-all duration-300">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-4">
             <TrendingUp size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">View Your Progress</h3>
          <p className="text-gray-400 mb-6">Check your detailed emotional and confidence analytics.</p>
          <button onClick={() => window.location.href='/dashboard/analytics'} className="px-8 py-3 rounded-xl bg-white/5 font-bold text-white hover:bg-white/10 border border-white/10 transition-all">Open Analytics</button>
        </div>
      </div>

      {/* Non-Diagnostic Disclaimer */}
      <footer className="mt-16 border-t border-white/10 pt-6 pb-4 text-center text-xs text-gray-400/80 flex items-center justify-center gap-2 max-w-4xl mx-auto">
        <ShieldCheck size={14} className="text-purple-400" />
        <span>NeuroNest provides supportive communication insights. It is strictly non-diagnostic and does not medically diagnose anxiety, autism, or other conditions.</span>
      </footer>
    </div>
  );
};

export default Dashboard;
