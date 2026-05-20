import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, FileText, Send } from 'lucide-react';

const CreateSession = () => {
  const [formData, setFormData] = useState({ title: '', description: '', duration_minutes: 30 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/sessions/', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/dashboard');
    } catch (err) {
      console.error("Failed to create session", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto w-full fade-in">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Log Practice Session</h1>
        <p className="text-gray-400">Recording your progress helps AI tailor your learning path.</p>
      </header>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit} 
        className="glass-card p-10 space-y-8"
      >
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-purple-400 uppercase tracking-wider">
            <FileText size={16} /> Session Title
          </label>
          <input 
            type="text" 
            required
            className="input-premium"
            placeholder="e.g., Practicing Small Talk at the Café"
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-purple-400 uppercase tracking-wider">
            <Clock size={16} /> Duration (minutes)
          </label>
          <input 
            type="number" 
            required
            className="input-premium"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-purple-400 uppercase tracking-wider">
            <Calendar size={16} /> Description & Reflection
          </label>
          <textarea 
            rows="4"
            className="input-premium resize-none"
            placeholder="How did it go? What felt easy or difficult?"
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          ></textarea>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="btn-premium w-full flex items-center justify-center gap-3"
        >
          {isSubmitting ? 'Saving...' : (
            <>
              <Send size={20} />
              Save Session
            </>
          )}
        </button>
      </motion.form>
    </div>
  );
};

export default CreateSession;
