import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  Bell, ShieldAlert, CheckCircle, Info, Sparkles, AlertCircle, Eye, EyeOff
} from 'lucide-react';

const GuardianNotifications = () => {
  const { guardianSession } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/connections/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      setError('Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/v1/connections/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/connections/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'access_request':
        return { icon: ShieldAlert, bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'access_alert':
        return { icon: CheckCircle, bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'permission_change':
        return { icon: AlertCircle, bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      default:
        return { icon: Info, bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 fade-in">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-amber-400/70 uppercase tracking-widest mb-1">Alert Center</p>
          <h1 className="text-3xl font-extrabold text-white">Notifications</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time alerts, connection approvals, and access logs.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </header>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {notifications.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {notifications.map((notif, idx) => {
              const style = getNotificationIcon(notif.type);
              const Icon = style.icon;
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`flex gap-4 p-5 rounded-2xl border transition-all duration-300 ${
                    notif.is_read === 0
                      ? 'bg-[#0f1220] border-amber-500/20 shadow-md shadow-amber-500/2'
                      : 'bg-white/2 border-white/5 opacity-70'
                  }`}
                >
                  <div className={`p-3 rounded-xl border flex-shrink-0 ${style.bg}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-relaxed ${notif.is_read === 0 ? 'font-bold text-white' : 'text-gray-300'}`}>
                        {notif.message}
                      </p>
                      {notif.is_read === 0 && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer flex-shrink-0"
                          title="Mark as read"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                    <span className="block text-[10px] text-gray-500 mt-2">
                      {new Date(notif.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-[#0f1220] border border-white/5 rounded-2xl p-12 text-center">
          <Bell size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-semibold">No notifications yet</p>
          <p className="text-xs text-gray-500 mt-1">Alerts regarding student permissions or new reports will be shown here.</p>
        </div>
      )}
    </div>
  );
};

export default GuardianNotifications;
