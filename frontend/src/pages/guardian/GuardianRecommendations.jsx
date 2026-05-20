import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  Sparkles, Award, Compass, MessageCircle, AlertCircle, Printer, Download, ShieldCheck
} from 'lucide-react';

const GuardianRecommendations = () => {
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
        setError(err.response?.data?.detail || 'Failed to load recommendations.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [guardianSession?.studentId]);

  const handlePrint = () => {
    window.print();
  };

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

  const latestReport = metrics?.ai_reports?.[0];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 fade-in print:p-0 print:bg-white print:text-black">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
        <div>
          <p className="text-xs font-bold text-amber-400/70 uppercase tracking-widest mb-1">AI Recommendations</p>
          <h1 className="text-3xl font-extrabold text-white">Actionable Insights</h1>
          <p className="text-gray-400 text-sm mt-1">AI-generated support guidelines and suggested exercises based on speech performance.</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/10 cursor-pointer transition-all shrink-0"
        >
          <Printer size={14} /> Download PDF Report
        </button>
      </header>

      {/* Print-only Header */}
      <div className="hidden print:block mb-8 border-b-2 border-gray-300 pb-4">
        <h1 className="text-2xl font-bold text-black">NeuroNest — Student Progress Report</h1>
        <p className="text-sm text-gray-600">Student: {guardianSession?.studentName}</p>
        <p className="text-sm text-gray-600">Generated on: {new Date().toLocaleDateString()}</p>
      </div>

      {latestReport ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Strengths */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[#0f1220] border border-purple-500/15 rounded-2xl p-6 border-t-4 border-t-purple-500 print:border-gray-200 print:text-black"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 print:bg-purple-100 print:text-purple-700">
                <Award size={18} />
              </div>
              <h3 className="font-bold text-white print:text-black">Key Strengths</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed print:text-gray-700">{latestReport.strengths}</p>
          </motion.div>

          {/* Card 2: Growth Areas */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0f1220] border border-blue-500/15 rounded-2xl p-6 border-t-4 border-t-blue-500 print:border-gray-200 print:text-black"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 print:bg-blue-100 print:text-blue-700">
                <MessageCircle size={18} />
              </div>
              <h3 className="font-bold text-white print:text-black">Areas Needing Support</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed print:text-gray-700">{latestReport.weaknesses}</p>
          </motion.div>

          {/* Card 3: Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#0f1220] border border-emerald-500/15 rounded-2xl p-6 border-t-4 border-t-emerald-500 print:border-gray-200 print:text-black"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 print:bg-emerald-100 print:text-emerald-700">
                <Compass size={18} />
              </div>
              <h3 className="font-bold text-white print:text-black">Recommended Exercises</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed print:text-gray-700">{latestReport.recommendations}</p>
          </motion.div>
        </div>
      ) : (
        <div className="bg-[#0f1220] border border-white/5 rounded-2xl p-10 text-center">
          <Sparkles size={36} className="text-gray-500 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-400 font-semibold">Generating recommendations…</p>
          <p className="text-xs text-gray-500 mt-1">Recommendations will be updated automatically as soon as the student records more sessions.</p>
        </div>
      )}

      {/* Guidelines Box */}
      <div className="bg-[#0f1220] border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-4 print:border-gray-200">
        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl flex-shrink-0 print:bg-amber-100 print:text-amber-700">
          <Compass size={20} />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-white print:text-black">How to use these recommendations</h3>
          <p className="text-xs text-gray-400 leading-relaxed print:text-gray-600">
            Encourage your student to practice recommended exercises without applying direct pressure. Focus on acknowledging their active streak and badge accomplishments to boost motivation positively.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuardianRecommendations;
