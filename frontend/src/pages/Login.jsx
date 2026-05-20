import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogIn, User, Lock, Eye, EyeOff, ArrowRight,
  BrainCircuit, ShieldCheck, GraduationCap
} from 'lucide-react';

const Login = () => {
  const [role, setRole] = useState('student'); // 'student' | 'guardian'
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(formData.username, formData.password);
      const userRole = user?.role || 'user';

      if (userRole === 'parent') {
        // Guardian goes straight to their dashboard — student panel is inside
        navigate('/parent');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail[0].msg : detail || 'Invalid credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#090514] via-[#0f0c24] to-[#0d071a] pt-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400">
            <BrainCircuit size={28} />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">NeuroNest</span>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">Welcome back</h1>
            <p className="text-gray-400 text-sm">Sign in to continue</p>
          </div>

          {/* ── Role Selector ── */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/8 mb-7">
            <button
              type="button"
              onClick={() => setRole('student')}
              id="role-student"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                role === 'student'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <GraduationCap size={16} />
              Learner / Student
            </button>
            <button
              type="button"
              onClick={() => setRole('guardian')}
              id="role-guardian"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                role === 'guardian'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShieldCheck size={16} />
              Parent / Guardian
            </button>
          </div>

          {/* Role context hint */}
          <motion.p
            key={role}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs text-center mb-6 px-4 py-2.5 rounded-xl border ${
              role === 'guardian'
                ? 'text-amber-300/80 bg-amber-500/5 border-amber-500/15'
                : 'text-purple-300/80 bg-purple-500/5 border-purple-500/15'
            }`}
          >
            {role === 'guardian'
              ? '🔒 Sign in with your own guardian account credentials. You\'ll verify your child\'s identity on the dashboard.'
              : '🎯 Sign in to continue your communication practice sessions.'}
          </motion.p>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20"
            >
              {error}
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                role === 'guardian' ? 'text-amber-400' : 'text-purple-400'
              }`}>
                <User size={12} />
                {role === 'guardian' ? 'Guardian' : ''} Username or Email
              </label>
              <input
                type="text"
                required
                id="login-username"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                placeholder={role === 'guardian' ? 'Your guardian account username' : 'Your username or email'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                role === 'guardian' ? 'text-amber-400' : 'text-purple-400'
              }`}>
                <Lock size={12} />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  id="login-password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Your account password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              id="login-submit"
              className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer mt-2 ${
                isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
              } ${
                role === 'guardian'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 shadow-lg shadow-amber-500/15'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/15'
              }`}
            >
              {isSubmitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-7 pt-6 border-t border-white/5">
            Don't have an account?{' '}
            <Link
              to={role === 'guardian' ? '/signup?role=parent' : '/signup'}
              className={`font-bold transition-colors ${
                role === 'guardian' ? 'text-amber-400 hover:text-amber-300' : 'text-purple-400 hover:text-purple-300'
              }`}
            >
              Sign up {role === 'guardian' ? 'as Guardian' : 'as Learner'}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
