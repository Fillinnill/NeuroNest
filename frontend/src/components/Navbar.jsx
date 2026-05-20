import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrainCircuit, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed w-full bg-black/20 backdrop-blur-xl z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
              <BrainCircuit size={28} />
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">
              NeuroNest
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8 items-center">
            <a href="/#features" className="text-gray-400 hover:text-white transition-colors font-medium">Features</a>
            <a href="/#about" className="text-gray-400 hover:text-white transition-colors font-medium">About</a>
            
            {user ? (
              <div className="flex items-center gap-4">
                <Link to={(user.role === 'parent' || user.role === 'admin') ? '/parent' : '/dashboard'} className="flex items-center gap-2 text-purple-400 font-medium hover:text-purple-300 transition-colors">
                  <LayoutDashboard size={20} />
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <Link to="/login" className="text-gray-400 font-medium hover:text-white transition-colors">
                  Log in
                </Link>
                <Link to="/select-role" className="px-6 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
