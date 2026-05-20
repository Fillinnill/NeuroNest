import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { FileText, ChevronDown, ChevronUp, ShieldCheck, AlertCircle, Filter, Clock, Calendar } from 'lucide-react';

const SESSION_TYPES = ['All', 'Social', 'Presentation', 'Interview', 'Free Expression', 'Other'];

const GuardianSessions = () => {
  const { guardianSession } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  useEffect(() => {
    if (!guardianSession?.studentId) return;
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `/api/v1/connections/students/metrics/${guardianSession.studentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMetrics(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [guardianSession?.studentId]);

  const sessions = metrics?.sessions || [];
  const filtered = filter === 'All' ? sessions : sessions.filter(s =>
    s.description?.toLowerCase().includes(filter.toLowerCase()) ||
    s.title?.toLowerCase().includes(filter.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 fade-in">
      <header>
        <p className="text-xs font-bold text-amber-400/70 uppercase tracking-widest mb-1">Session Reports</p>
        <h1 className="text-3xl font-extrabold text-white">Practice History</h1>
        <p className="text-gray-400 text-sm mt-1">Completed session summaries — private transcripts are never shared.</p>
      </header>

      {/* Privacy badge */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 w-fit">
        <ShieldCheck size={14} className="text-emerald-400" />
        <span className="text-xs text-emerald-400 font-medium">Summarised metadata only · No raw conversation data</span>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {SESSION_TYPES.map(t => (
          <button
            key={t}
            onClick={() => { setFilter(t); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              filter === t
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-white/3 border-white/10 text-gray-400 hover:border-amber-500/20'
            }`}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-500 self-center">{filtered.length} sessions</span>
      </div>

      {/* Sessions table */}
      {paginated.length > 0 ? (
        <div className="space-y-3">
          {paginated.map((session, idx) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-[#0f1220] border border-white/5 rounded-2xl overflow-hidden hover:border-amber-500/20 transition-colors"
            >
              <button
                className="w-full flex items-center gap-4 p-5 text-left cursor-pointer"
                onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
              >
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 flex-shrink-0">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{session.title || 'Practice Session'}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{session.description || 'Communication practice'}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock size={11} /> {session.duration_minutes} min
                  </span>
                  <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar size={11} /> {new Date(session.created_at).toLocaleDateString()}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                    Completed
                  </span>
                  {expandedId === session.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </div>
              </button>

              <AnimatePresence>
                {expandedId === session.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/5 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">Session Type</p>
                        <p className="text-sm text-gray-300">{session.description || 'Communication Practice'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">Duration</p>
                        <p className="text-sm text-gray-300">{session.duration_minutes} minutes</p>
                      </div>
                      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Date Completed</p>
                        <p className="text-sm text-gray-300">{new Date(session.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="sm:col-span-3 p-4 rounded-xl bg-white/3 border border-white/5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <ShieldCheck size={10} className="text-emerald-400" /> Privacy Notice
                        </p>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Raw conversation transcripts and private AI dialogue are protected and not accessible to guardians. Only session-level metadata is displayed here.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle size={36} className="text-gray-600 mb-3" />
          <p className="text-gray-400 font-semibold">No sessions found</p>
          <p className="text-xs text-gray-500 mt-1">Try a different filter or check back after the student completes sessions.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
          >Prev</button>
          <span className="text-sm text-gray-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
          >Next</button>
        </div>
      )}
    </div>
  );
};

export default GuardianSessions;
