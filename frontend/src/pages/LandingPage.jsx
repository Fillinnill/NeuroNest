import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Shield, Heart, Sparkles, ArrowRight, Activity, Award, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="glass-card p-8 hover-lift"
  >
    <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-transparent pt-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium text-sm mb-8"
            >
              <Sparkles size={16} />
              <span>A safe space for neurodivergent minds</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold text-white leading-tight mb-8"
            >
              Build social confidence, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                at your own pace.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              NeuroNest is a gamified, AI-powered platform designed to help you practice real-world social interactions in a calm, judgment-free environment.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/select-role" className="btn-premium flex items-center justify-center gap-2 text-lg px-8 py-4">
                Start Practicing Free <ArrowRight size={20} />
              </Link>
              <a 
                href="#about" 
                className="px-8 py-4 rounded-xl font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white text-lg flex items-center justify-center hover:scale-105 active:scale-95 shadow-lg"
              >
                See How It Works
              </a>
            </motion.div>
          </div>
        </div>
        
        {/* Decorative soft background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-3xl -z-10 animate-float" />
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-transparent border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Designed for your comfort</h2>
            <p className="text-lg text-gray-400">Every feature is built with accessibility and sensory-friendliness in mind.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Shield}
              title="Judgment-Free AI"
              description="Practice conversations with our patient AI. Make mistakes, learn, and try again without any pressure or judgment."
              delay={0.1}
            />
            <FeatureCard 
              icon={MessageCircle}
              title="Real-World Scenarios"
              description="From ordering food to job interviews, practice the specific situations that cause you anxiety until you feel ready."
              delay={0.2}
            />
            <FeatureCard 
              icon={Heart}
              title="Emotional Feedback"
              description="Get gentle, constructive feedback on your tone and communication style to help you grow your confidence."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* About / How It Works Section */}
      <section id="about" className="py-24 bg-transparent border-t border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Beautiful Graphics/Details */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass-card p-10 relative"
            >
              <div className="absolute top-0 right-0 p-4 text-purple-400">
                <Sparkles size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-6">Interactive Experience Suite</h3>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Voice & Text Practice</h4>
                    <p className="text-sm text-gray-400">Choose between real-time mic speaking or standard keyboard typing.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Speech Analytics</h4>
                    <p className="text-sm text-gray-400">Track your pacing speed (WPM), speech pause counts, and latency gaps.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <Award size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Daily Streaks & XP Rewards</h4>
                    <p className="text-sm text-gray-400">Earn trophies, accumulate continuous daily streaks, and levels.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: Text Description */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-bold text-white">How NeuroNest Empowers You</h2>
              <p className="text-gray-300 leading-relaxed text-lg">
                NeuroNest bridges the gap between digital therapy and everyday life. By providing a zero-stress, gamified interface, you can safely trial conversation options, build social fluency, and manage general anxiety at a pace that respects your neurological rhythm.
              </p>
              <p className="text-gray-300 leading-relaxed text-lg">
                Additionally, guardians and mentors receive complete access to an aggregate progress dashboard, tracking performance improvements without compromising personal conversation transcript privacy.
              </p>
              <div>
                <Link to="/select-role" className="btn-premium inline-flex items-center gap-2 mt-4 text-base">
                  Start Your Journey <ArrowRight size={18} />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Glow effect on background */}
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl -z-10" />
      </section>
    </div>
  );
};

export default LandingPage;
