import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, UserPlus, FileText, Settings, Heart, HelpCircle, Phone } from 'lucide-react';

const Signup = () => {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role') || 'student';
  
  const [role, setRole] = useState(roleParam); // 'student' or 'parent'
  const [formData, setFormData] = useState({
    fullname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    anxietyLevel: 5,
    communicationGoals: '',
    accessibilityPreferences: 'dark',
    relationshipToUser: 'Parent',
    phoneNumber: ''
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Common Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please double check.');
      return;
    }

    if (role === 'student' && (!formData.username || !formData.age)) {
      setError('Please fill in username and age fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (role === 'student') {
        await axios.post('/api/v1/auth/register', {
          email: formData.email,
          username: formData.username,
          password: formData.password,
          fullname: formData.fullname,
          age: parseInt(formData.age) || 18,
          anxiety_level: parseInt(formData.anxietyLevel) || 5,
          communication_goals: formData.communicationGoals,
          preferences: {
            role: 'student',
            accessibility: formData.accessibilityPreferences
          }
        });
      } else {
        // Parent Flow
        // Parents do not strictly need a student username in signup (they request it later)
        // We will assign them a unique username based on email/fullname
        const generatedUsername = `parent_${formData.email.split('@')[0]}_${Math.floor(Math.random() * 1000)}`;
        await axios.post('/api/v1/auth/register', {
          email: formData.email,
          username: generatedUsername,
          password: formData.password,
          fullname: formData.fullname,
          age: 40,
          anxiety_level: 1,
          communication_goals: 'Guardian Profile',
          preferences: {
            role: 'parent',
            relationship_to_user: formData.relationshipToUser,
            phone_number: formData.phoneNumber
          }
        });
      }
      navigate('/login?role=' + role);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail[0].msg : detail || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-24 px-4 pb-12 bg-gradient-to-br from-[#090514] via-[#0f0c24] to-[#0d071a]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-lg w-full p-10 border border-white/5 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-purple-500/10 text-purple-400 mb-4 border border-purple-500/15">
            <UserPlus size={32} />
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Create Account</h2>
          <p className="text-gray-400 text-sm">Join NeuroNest's sensory-friendly supportive ecosystem</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-8">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
              role === 'student'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            User / Learner
          </button>
          <button
            type="button"
            onClick={() => setRole('parent')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
              role === 'parent'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Parent / Guardian
          </button>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20"
          >
            {error}
          </motion.div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Common Fields */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
              <User size={14} /> Full Name
            </label>
            <input 
              type="text" 
              name="fullname"
              required
              value={formData.fullname}
              className="input-premium text-white"
              placeholder="Enter your full name"
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
              <Mail size={14} /> Email Address
            </label>
            <input 
              type="email" 
              name="email"
              required
              value={formData.email}
              className="input-premium text-white"
              placeholder="you@example.com"
              onChange={handleChange}
            />
          </div>

          {/* Student Specific Fields */}
          {role === 'student' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  <User size={14} /> Username
                </label>
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  className="input-premium text-white"
                  placeholder="Choose a username"
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    <HelpCircle size={14} /> Age
                  </label>
                  <input 
                    type="number" 
                    name="age"
                    value={formData.age}
                    className="input-premium text-white"
                    placeholder="E.g. 16"
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    <Settings size={14} /> Font Pref
                  </label>
                  <select 
                    name="accessibilityPreferences"
                    value={formData.accessibilityPreferences}
                    className="input-premium text-white bg-slate-900"
                    onChange={handleChange}
                  >
                    <option value="dark">Standard Dark</option>
                    <option value="minimal">Minimal / Low Motion</option>
                    <option value="dyslexic">Dyslexic Friendly Font</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    <Heart size={14} /> Baseline Anxiety Level ({formData.anxietyLevel})
                  </label>
                </div>
                <input 
                  type="range" 
                  name="anxietyLevel"
                  min="1"
                  max="10"
                  value={formData.anxietyLevel}
                  className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none"
                  onChange={handleChange}
                />
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>1 - Very Calm</span>
                  <span>5 - Moderate</span>
                  <span>10 - High Overload</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  <FileText size={14} /> Primary Communication Goals
                </label>
                <textarea 
                  name="communicationGoals"
                  value={formData.communicationGoals}
                  className="input-premium text-white h-20 py-2 resize-none"
                  placeholder="E.g., I want to practice speech pacing & handling job questions..."
                  onChange={handleChange}
                />
              </div>
            </motion.div>
          )}

          {/* Parent/Guardian Specific Fields */}
          {role === 'parent' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    <Heart size={14} /> Relationship
                  </label>
                  <select 
                    name="relationshipToUser"
                    value={formData.relationshipToUser}
                    className="input-premium text-white bg-slate-900"
                    onChange={handleChange}
                  >
                    <option value="Parent">Parent</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Educator">Educator</option>
                    <option value="Therapist">Therapist</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    <Phone size={14} /> Contact Number
                  </label>
                  <input 
                    type="tel" 
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    className="input-premium text-white"
                    placeholder="+1 (555) 019-2834"
                    onChange={handleChange}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Passwords */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                <Lock size={14} /> Password
              </label>
              <input 
                type="password" 
                name="password"
                required
                value={formData.password}
                className="input-premium text-white animate-none"
                placeholder="Choose password"
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                <Lock size={14} /> Confirm
              </label>
              <input 
                type="password" 
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                className="input-premium text-white animate-none"
                placeholder="Confirm password"
                onChange={handleChange}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="btn-premium w-full mt-4 cursor-pointer"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 font-bold hover:text-purple-300 transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
