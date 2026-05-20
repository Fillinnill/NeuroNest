import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { ClipboardList, Key, ShieldCheck, AlertCircle } from 'lucide-react';

const GuardianAccessLog = () => {
  const { guardianSession } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guardianSession?.studentId) return;
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `/api/v1/connections/access-log/${guardianSession.studentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setLogs(res.data);
      } catch (err) {
        setError('Failed to fetch access audit logs.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [guardianSession?.studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 fade-in">
      <header>
        <p className="text-xs font-bold text-amber-400/70 uppercase tracking-widest mb-1">Audit Trail</p>
        <h1 className="text-3xl font-extrabold text-white">Access Logs</h1>
        <p className="text-gray-400 text-sm mt-1">Full transparent record of every time you requested student analytics, keeping data access completely traceable.</p>
      </header>

      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 w-fit text-xs text-amber-400">
        <ShieldCheck size={14} />
        Transparent Bidirectional Logging Enabled
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {logs.length > 0 ? (
        <div className="bg-[#0f1220] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/2">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Access Event</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time (IST)</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-white/1 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium text-white flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 flex-shrink-0">
                        <Key size={12} />
                      </div>
                      <span>{log.message}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                        Secure JWT
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f1220] border border-white/5 rounded-2xl p-12 text-center">
          <ClipboardList size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-semibold">No logs recorded yet</p>
          <p className="text-xs text-gray-500 mt-1">Logs of report viewing or logins will appear automatically.</p>
        </div>
      )}
    </div>
  );
};

export default GuardianAccessLog;
