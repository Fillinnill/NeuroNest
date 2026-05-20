import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Award, Zap, ShieldCheck, Clock, MessageCircle, Sparkles, CheckCircle2, Lock } from 'lucide-react';
import axios from 'axios';

const Achievements = () => {
  const [sessions, setSessions] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [stats, setStats] = useState({ streak: 0, confidence: 75 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const sessionsRes = await axios.get('/api/v1/sessions/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSessions(sessionsRes.data);

        const convsRes = await axios.get('/api/v1/conversations/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const convsData = convsRes.data;
        setConversations(convsData);

        const uniqueDays = new Set(sessionsRes.data.map(s => new Date(s.created_at).toDateString()));
        const confList = convsData.map(c => c.confidence_score).filter(c => c !== null);
        const avgConfidence = confList.length > 0 ? Math.round(confList.reduce((a,b)=>a+b, 0) / confList.length) : 75;

        setStats({
          streak: uniqueDays.size || (convsData.length > 0 ? 1 : 0),
          confidence: avgConfidence
        });
      } catch (err) {
        console.error("Error fetching achievements data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const completedConvs = conversations.length;
  const practiceMins = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
  const streakDays = stats.streak;

  const totalXp = (completedConvs * 100) + (practiceMins * 10) + (streakDays * 50);
  const xpPerLevel = 500;
  const currentLevel = Math.floor(totalXp / xpPerLevel) + 1;
  const currentLevelXp = totalXp % xpPerLevel;
  const xpProgressPercent = (currentLevelXp / xpPerLevel) * 100;

  const badges = [
    {
      id: 'first-hello',
      badge_name: 'First Hello',
      description: 'Completed your first scenario.',
      icon: Star,
      color: '#fbbf24',
      bgColor: 'bg-yellow-500/20',
      requirement: 'Complete 1 conversation',
      unlocked: completedConvs >= 1
    },
    {
      id: 'cool-collected',
      badge_name: 'Cool & Collected',
      description: 'Maintained high confidence (80%+).',
      icon: ShieldCheck,
      color: '#60a5fa',
      bgColor: 'bg-blue-500/20',
      requirement: 'Average confidence >= 80%',
      unlocked: stats.confidence >= 80 && completedConvs >= 1
    },
    {
      id: 'daily-habit',
      badge_name: 'Daily Habit',
      description: 'Practiced 30+ mins or kept 3+ day streak.',
      icon: Clock,
      color: '#fb923c',
      bgColor: 'bg-orange-500/20',
      requirement: 'Streak >= 3 days OR Practice >= 30 mins',
      unlocked: streakDays >= 3 || practiceMins >= 30
    },
    {
      id: 'dedicated-talker',
      badge_name: 'Dedicated Talker',
      description: 'Completed 3 or more social scenarios.',
      icon: MessageCircle,
      color: '#c084fc',
      bgColor: 'bg-purple-500/20',
      requirement: 'Complete 3 conversations',
      unlocked: completedConvs >= 3
    },
    {
      id: 'social-mastery',
      badge_name: 'Social Mastery',
      description: 'Demonstrated advanced social fluency.',
      icon: Sparkles,
      color: '#34d399',
      bgColor: 'bg-emerald-500/20',
      requirement: 'Complete 5 conversations with 85%+ confidence',
      unlocked: completedConvs >= 5 && stats.confidence >= 85
    }
  ];

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full fade-in">
      <header className="mb-12">
        <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight flex items-center gap-4">
          Achievements & Badges
          <Award className="text-purple-400" size={44} />
        </h1>
        <p className="text-gray-400 text-lg">Earn XP, level up, and unlock special badges as you practice your communication skills.</p>
      </header>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-6 border-l-4 border-purple-500">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest block mb-2">Total Accumulated XP</span>
          <h2 className="text-4xl font-extrabold text-white flex items-center gap-2">
            <Zap className="text-yellow-400 fill-yellow-400" size={32} />
            {totalXp} <span className="text-sm font-semibold text-gray-500">XP</span>
          </h2>
        </div>

        <div className="glass-card p-6 border-l-4 border-indigo-500">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-2">Current Rank</span>
          <h2 className="text-4xl font-extrabold text-white flex items-center gap-2">
            <Award className="text-indigo-400" size={32} />
            Level {currentLevel}
          </h2>
        </div>

        <div className="glass-card p-6 border-l-4 border-emerald-500">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">Badges Unlocked</span>
          <h2 className="text-4xl font-extrabold text-white flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" size={32} />
            {unlockedCount} / {badges.length}
          </h2>
        </div>
      </div>

      {/* Level XP Progress Bar */}
      <div className="glass-card p-8 mb-12">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-lg text-white">Level Progression</span>
          <span className="text-sm font-bold text-purple-400">{currentLevelXp} / {xpPerLevel} XP to Level {currentLevel + 1}</span>
        </div>
        <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${xpProgressPercent}%` }}
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
          />
        </div>
      </div>

      {/* Badges Grid */}
      <h3 className="text-2xl font-bold text-white mb-8">Your Badges Collection</h3>
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading achievements...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div 
                key={badge.id}
                className={`glass-card p-8 relative flex flex-col items-center text-center transition-all duration-300 border-t-4 ${
                  badge.unlocked 
                    ? 'border-t-purple-500/80 bg-white/5 opacity-100 hover:-translate-y-1' 
                    : 'border-t-white/5 bg-white/2 opacity-40'
                }`}
              >
                {!badge.unlocked && (
                  <div className="absolute top-4 right-4 text-gray-500">
                    <Lock size={18} />
                  </div>
                )}
                
                <div 
                  className={`p-5 rounded-2xl mb-6 flex items-center justify-center ${
                    badge.unlocked ? badge.bgColor : 'bg-white/5 text-gray-600'
                  }`}
                  style={{ color: badge.unlocked ? badge.color : undefined }}
                >
                  <Icon size={40} className={badge.unlocked ? 'animate-pulse' : ''} />
                </div>
                
                <h4 className="text-xl font-bold text-white mb-2">{badge.badge_name}</h4>
                <p className="text-sm text-gray-300 mb-4 leading-relaxed">{badge.description}</p>
                
                <div className="mt-auto pt-4 border-t border-white/5 w-full">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest block">Requirement</span>
                  <span className={`text-xs font-bold mt-1 block ${badge.unlocked ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {badge.requirement}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Achievements;
