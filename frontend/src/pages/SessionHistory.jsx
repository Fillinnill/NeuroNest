import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { History, Calendar, Clock, ChevronRight, Search, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const SessionHistory = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/v1/sessions/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSessions(response.data);
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto w-full fade-in">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <History className="text-purple-400" size={28} />
            <h1 className="text-4xl font-bold text-white">Session Logs</h1>
          </div>
          <p className="text-gray-400">Review your past practice sessions and reflections.</p>
        </div>
        <Link to="/dashboard/sessions/new" className="btn-premium flex items-center gap-2">
          <Plus size={20} />
          Log New Session
        </Link>
      </header>

      <div className="mb-8 relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <input 
          type="text" 
          placeholder="Search sessions..." 
          className="input-premium pl-12"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-6 h-24 animate-pulse bg-white/5"></div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <History size={64} className="text-gray-600 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-2">No sessions yet</h3>
          <p className="text-gray-400 mb-8">Start practicing to see your history here!</p>
          <Link to="/dashboard/sessions/new" className="btn-premium inline-flex items-center gap-2">
            <Plus size={20} /> Record My First Session
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {sessions.map((session, index) => (
            <motion.div 
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 flex flex-col md:flex-row justify-between items-center hover:bg-white/10 group cursor-pointer"
            >
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                  <Calendar size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">{session.title}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock size={14} /> {session.duration_minutes} mins
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(session.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                <p className="text-sm text-gray-400 max-w-xs italic line-clamp-1">
                  "{session.description || 'No reflection added'}"
                </p>
                <ChevronRight className="text-gray-600 group-hover:text-white transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionHistory;
