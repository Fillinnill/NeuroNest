import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, Bell, Eye, Volume2, Shield, User,
  Sparkles, Users, UserPlus, Check, X, ShieldAlert, AlertCircle, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    calmMode: true,
    highContrast: false,
    textToSpeech: true,
    notifications: true,
    dataSharing: false
  });

  // Guardian connections states
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingGuardians, setLoadingGuardians] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const wsRef = useRef(null);

  // ── Real-time WS connection to receive immediate access alert banners ──────
  useEffect(() => {
    if (!user?.id) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let wsUrl = `${protocol}://${window.location.host}/ws/notify/${user.id}`;
    if (import.meta.env.VITE_API_URL) {
      try {
        const url = new URL(import.meta.env.VITE_API_URL);
        const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws';
        wsUrl = `${wsProtocol}://${url.host}/ws/notify/${user.id}`;
      } catch (err) {
        console.error("Failed to parse VITE_API_URL for WebSocket:", err);
      }
    }
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'guardian_access') {
          showToast(data.message, 'warning');
        }
      } catch { /* noop */ }
    };

    return () => ws.close();
  }, [user?.id]);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 6000);
  };

  const fetchGuardianData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const [connRes, pendingRes] = await Promise.all([
        axios.get('/api/v1/connections/connections', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/v1/connections/requests/pending', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setConnections(connRes.data);
      setPendingRequests(pendingRes.data);
    } catch (err) {
      setErrorMessage('Failed to load guardian status logs.');
    } finally {
      setLoadingGuardians(false);
    }
  };

  useEffect(() => {
    fetchGuardianData();
  }, []);

  const handleRespondRequest = async (id, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/v1/connections/requests/${id}/respond`, { action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`Request successfully ${action}ed.`);
      fetchGuardianData();
    } catch {
      showToast('Failed to process request.', 'error');
    }
  };

  const handleRevokeConnection = async (id, guardianName) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/connections/connections/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`Access connection revoked for ${guardianName}.`);
      fetchGuardianData();
    } catch {
      showToast('Failed to revoke guardian access.', 'error');
    }
  };

  const handleToggleVisibility = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(`/api/v1/connections/connections/${id}/visibility`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(res.data.message);
      fetchGuardianData();
    } catch {
      showToast('Failed to change report visibility.', 'error');
    }
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SettingRow = ({ icon: Icon, title, description, settingKey }) => (
    <div className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl mb-4 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center gap-5">
        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
          <Icon size={22} />
        </div>
        <div>
          <h4 className="font-bold text-white">{title}</h4>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => toggleSetting(settingKey)}
        className={`w-14 h-7 rounded-full transition-all duration-300 relative ${settings[settingKey] ? 'bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-gray-700'}`}
      >
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform duration-300 ${settings[settingKey] ? 'transform translate-x-7' : ''}`} />
      </button>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto w-full fade-in relative">

      {/* ── Real-time Consent Banner Toast Alert ── */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl border shadow-xl flex items-start gap-3 max-w-md ${
              toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                : toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/50 text-red-200'
                : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <ShieldAlert className="shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="font-bold text-sm">Security Alert</h4>
              <p className="text-xs leading-normal mt-1">{toast.message}</p>
            </div>
            <button onClick={() => setToast({ ...toast, show: false })} className="text-gray-400 hover:text-white shrink-0">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-purple-500/20 rounded-2xl text-purple-400">
            <SettingsIcon size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">Preferences</h1>
            <p className="text-gray-400">Tailor your NeuroNest experience and manage guardian consent</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold border-4 border-white/10">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{user?.fullname || user?.username}</h3>
            <p className="text-purple-400 font-medium mb-6">@{user?.username}</p>
            <div className="space-y-3">
              <button className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all cursor-pointer">
                Edit Profile
              </button>
              <button className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold hover:bg-red-500/20 transition-all cursor-pointer">
                Deactivate Account
              </button>
            </div>
          </motion.div>

          <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-purple-500">
            <Sparkles className="text-purple-400" size={24} />
            <p className="text-sm text-gray-300">
              Your profile is optimized for <strong>Social Confidence</strong>.
            </p>
          </div>
        </div>

        {/* Main Settings Panel */}
        <div className="lg:col-span-2 space-y-8">

          {/* ── Guardian Access & Security Section ── */}
          <div className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 border-b border-white/5 pb-4">
              <Shield size={24} className="text-purple-400" /> Guardian Monitoring & Consent
            </h3>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="space-y-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <UserPlus size={14} /> Pending Access Requests
                </h4>
                <div className="space-y-2">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-black/30 border border-white/5 rounded-xl gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{req.guardian_name} (@{req.guardian_username})</p>
                        <p className="text-xs text-gray-400">{req.relationship_type} • "{req.reason || 'No description provided.'}"</p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleRespondRequest(req.id, 'accept')}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check size={12} /> Accept
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.id, 'reject')}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Connections list */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Active Approved Guardians</h4>
              {loadingGuardians ? (
                <div className="text-center py-4 text-xs text-gray-500">Checking connection lists…</div>
              ) : connections.length > 0 ? (
                <div className="space-y-3">
                  {connections.map(conn => (
                    <div key={conn.id} className="p-4 rounded-xl bg-white/3 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{conn.guardian_name}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold uppercase">
                            {conn.relationship_type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Connected since: {new Date(conn.granted_at).toLocaleDateString()}
                        </p>
                        {conn.last_accessed_at && (
                          <p className="text-[10px] text-amber-400/80 font-medium mt-1">
                            Last accessed reports: {new Date(conn.last_accessed_at).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Report Visibility Toggle */}
                        <button
                          onClick={() => handleToggleVisibility(conn.id)}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            conn.report_visibility === 1
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                          title="Limit report visibility (reduces details visible to parent)"
                        >
                          {conn.report_visibility === 1 ? <Eye size={12} /> : <EyeOff size={12} />}
                          {conn.report_visibility === 1 ? 'Full Reports' : 'Limited Reports'}
                        </button>

                        {/* Revoke Access Button */}
                        <button
                          onClick={() => handleRevokeConnection(conn.id, conn.guardian_name)}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldAlert size={12} /> Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center text-xs text-gray-500 bg-white/1">
                  No guardians currently connected to your learner profile.
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-8 space-y-10">
            {/* Accessibility */}
            <section>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Eye size={24} className="text-purple-400" /> Accessibility & Visuals
              </h3>
              <SettingRow
                icon={Eye} title="Calm Mode" settingKey="calmMode"
                description="Reduces animations, mutes harsh colors, and minimizes distractions."
              />
              <SettingRow
                icon={Eye} title="High Contrast" settingKey="highContrast"
                description="Increases text contrast for better readability."
              />
            </section>

            {/* Audio */}
            <section>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Volume2 size={24} className="text-purple-400" /> Audio & Speech
              </h3>
              <SettingRow
                icon={Volume2} title="Auto Text-to-Speech" settingKey="textToSpeech"
                description="Automatically read aloud AI responses during practice sessions."
              />
            </section>

            {/* Notifications & Privacy */}
            <section>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Shield size={24} className="text-purple-400" /> Privacy & Alerts
              </h3>
              <SettingRow
                icon={Bell} title="Practice Reminders" settingKey="notifications"
                description="Receive daily notifications to maintain your streak."
              />
              <SettingRow
                icon={Shield} title="Share Anonymous Data" settingKey="dataSharing"
                description="Help us improve by sharing anonymous usage statistics."
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
