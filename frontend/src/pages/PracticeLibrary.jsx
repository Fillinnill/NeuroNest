import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, MessageSquare, Utensils, Briefcase, 
  GraduationCap, Phone, Heart, LifeBuoy, Sparkles, Clock, Target
} from 'lucide-react';

const scenarios = [
  {
    id: 'custom',
    title: 'Free Expression',
    description: 'Come up with your own topic, ask questions, start a conversation, or express your feelings freely.',
    icon: Sparkles,
    color: '#a855f7',
    difficulty: 'Flexible',
    time: 'Unlimited'
  },
  {
    id: 'friends',
    title: 'Making Friends',
    description: 'Practice introducing yourself and starting a conversation at a park or cafe.',
    icon: Users,
    color: '#a855f7',
    difficulty: 'Beginner',
    time: '5-10 mins'
  },
  {
    id: 'class',
    title: 'Speaking in Class',
    description: 'Practice raising your hand and answering a question or sharing an idea.',
    icon: GraduationCap,
    color: '#3b82f6',
    difficulty: 'Intermediate',
    time: '3-5 mins'
  },
  {
    id: 'food',
    title: 'Ordering Food',
    description: 'Practice ordering your favorite meal and handling follow-up questions from a waiter.',
    icon: Utensils,
    color: '#f59e0b',
    difficulty: 'Beginner',
    time: '5 mins'
  },
  {
    id: 'interview',
    title: 'Attending Interviews',
    description: 'Practice answering common interview questions with confidence.',
    icon: Briefcase,
    color: '#ef4444',
    difficulty: 'Advanced',
    time: '15-20 mins'
  },
  {
    id: 'discussion',
    title: 'Group Discussions',
    description: 'Learn how to jump into a conversation and share your thoughts with multiple people.',
    icon: MessageSquare,
    color: '#10b981',
    difficulty: 'Intermediate',
    time: '10-15 mins'
  },
  {
    id: 'phone',
    title: 'Phone Conversations',
    description: 'Practice the unique social cues of talking on the phone without visual feedback.',
    icon: Phone,
    color: '#6366f1',
    difficulty: 'Intermediate',
    time: '5-10 mins'
  },
  {
    id: 'emotional',
    title: 'Emotional Conversations',
    description: 'Practice expressing your feelings or supporting a friend through a tough time.',
    icon: Heart,
    color: '#ec4899',
    difficulty: 'Advanced',
    time: '10 mins'
  },
  {
    id: 'help',
    title: 'Asking for Help',
    description: 'Practice approaching a stranger or teacher to ask for directions or assistance.',
    icon: LifeBuoy,
    color: '#14b8a6',
    difficulty: 'Beginner',
    time: '3 mins'
  }
];

const PracticeLibrary = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-7xl mx-auto w-full fade-in">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="text-purple-400" size={32} />
          <h1 className="text-4xl font-bold text-white">Scenario Library</h1>
        </div>
        <p className="text-gray-400 text-lg">Choose a real-life situation to practice in a safe environment.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {scenarios.map((scenario, index) => {
          const isCustom = scenario.id === 'custom';
          return (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/dashboard/practice/${scenario.id}`)}
              className={`relative overflow-hidden p-6 cursor-pointer group transition-all duration-300 flex flex-col h-full ${
                isCustom 
                  ? 'glass-card border-2 border-purple-500/50 bg-gradient-to-br from-purple-900/25 via-indigo-900/10 to-transparent shadow-[0_0_30px_rgba(168,85,247,0.25)] hover:border-purple-400/80 md:col-span-2 lg:col-span-2' 
                  : 'glass-card hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {isCustom && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-purple-500/25 animate-pulse">
                  <Sparkles size={11} className="text-purple-200" /> Recommended Sandbox
                </div>
              )}
              
              <div 
                className="p-4 rounded-2xl mb-6 inline-flex self-start transition-transform group-hover:scale-110 group-hover:rotate-3"
                style={{ 
                  backgroundColor: `${scenario.color}20`, 
                  color: scenario.color,
                  boxShadow: isCustom ? `0 0 20px ${scenario.color}35` : 'none'
                }}
              >
                <scenario.icon size={28} />
              </div>
              
              <h3 className={`text-xl font-bold text-white mb-3 transition-colors ${
                isCustom ? 'text-purple-300 group-hover:text-purple-200' : 'group-hover:text-purple-400'
              }`}>
                {scenario.title}
              </h3>
              
              <p className={`text-sm mb-6 flex-1 ${isCustom ? 'text-gray-200' : 'text-gray-400'}`}>
                {scenario.description}
              </p>
              
              <div className="flex flex-wrap gap-3 mt-auto pt-4 border-t border-white/5">
                <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded flex items-center gap-1.5 ${
                  isCustom ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20' : 'bg-white/5 text-gray-500'
                }`}>
                  <Target size={11} /> {scenario.difficulty}
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded flex items-center gap-1.5 ${
                  isCustom ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20' : 'bg-white/5 text-gray-500'
                }`}>
                  <Clock size={11} /> {scenario.time}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default PracticeLibrary;
