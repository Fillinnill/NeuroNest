import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Users, ArrowRight, Sparkles, ShieldAlert } from 'lucide-react';

const RoleSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24 px-4 bg-gradient-to-br from-[#090514] via-[#0f0c24] to-[#0d071a]">
      <div className="max-w-4xl w-full text-center mb-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex p-3 rounded-2xl bg-purple-500/10 text-purple-400 mb-6 border border-purple-500/20"
        >
          <Sparkles size={28} className="animate-pulse" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-5xl font-extrabold text-white mb-4 tracking-tight"
        >
          Who are you?
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-gray-400 text-lg max-w-lg mx-auto"
        >
          Select your path to enter the NeuroNest community in a calm, non-overwhelming space.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Learner/Student Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          whileHover={{ y: -8, transition: { duration: 0.2 } }}
          className="glass-card p-10 flex flex-col justify-between border border-white/5 hover:border-purple-500/35 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all duration-300 relative group overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 text-purple-500/5 group-hover:text-purple-500/10 transition-colors pointer-events-none">
            <User size={120} />
          </div>
          <div>
            <div className="inline-flex p-4 rounded-2xl bg-purple-500/10 text-purple-400 mb-6 border border-purple-500/10 group-hover:scale-110 transition-transform duration-300">
              <User size={32} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">User / Learner</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Practice speaking scenarios, earn cool confidence badges, and build strong conversation habits in a calming, structured sandbox designed for neurodivergent individuals.
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => navigate('/login?role=student')}
              className="btn-premium w-full flex items-center justify-center gap-2 group/btn cursor-pointer"
            >
              Log In as Student
              <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/signup?role=student')}
              className="w-full py-3 rounded-xl bg-white/5 text-purple-300 font-bold border border-purple-500/10 hover:bg-purple-500/10 transition-all text-sm cursor-pointer"
            >
              Create Learner Account
            </button>
          </div>
        </motion.div>

        {/* Guardian/Parent Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          whileHover={{ y: -8, transition: { duration: 0.2 } }}
          className="glass-card p-10 flex flex-col justify-between border border-white/5 hover:border-amber-500/35 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-300 relative group overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 text-amber-500/5 group-hover:text-amber-500/10 transition-colors pointer-events-none">
            <Users size={120} />
          </div>
          <div>
            <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 text-amber-400 mb-6 border border-amber-500/10 group-hover:scale-110 transition-transform duration-300">
              <Users size={32} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Parent / Guardian</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Connect to your child's profile, view progress trends, and access simplified daily anxiety reports to encourage their achievements non-intrusively.
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => navigate('/login?role=parent')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 flex items-center justify-center gap-2 group/btn cursor-pointer transition-all text-sm"
            >
              Log In as Guardian
              <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/signup?role=parent')}
              className="w-full py-3 rounded-xl bg-white/5 text-amber-300 font-bold border border-amber-500/10 hover:bg-amber-500/10 transition-all text-sm cursor-pointer"
            >
              Create Guardian Account
            </button>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-16 flex items-center gap-2 text-xs text-gray-500 border-t border-white/5 pt-6 w-full max-w-sm justify-center"
      >
        <ShieldAlert size={14} />
        Bidirectional student consent is strictly required for data sharing.
      </motion.div>
    </div>
  );
};

export default RoleSelection;
