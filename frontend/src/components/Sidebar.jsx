import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageCircle, BarChart2, Award, Settings, LogOut, BrainCircuit, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: MessageCircle, label: 'Practice Scenarios', path: '/dashboard/practice' },
    { icon: History, label: 'Session Logs', path: '/dashboard/sessions' },
    { icon: BarChart2, label: 'Analytics', path: '/dashboard/analytics' },
    { icon: Award, label: 'Achievements', path: '/dashboard/achievements' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 min-h-screen flex flex-col pt-8 pb-6">
      <div className="flex items-center gap-3 px-8 mb-12">
        <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
          <BrainCircuit size={28} />
        </div>
        <span className="font-bold text-2xl text-white tracking-tight">NeuroNest</span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-4 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                isActive 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 translate-x-2' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon size={22} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 mt-auto">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-4 px-5 py-3 w-full rounded-xl font-medium text-red-400 hover:bg-red-500/10 transition-all duration-300"
        >
          <LogOut size={22} />
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
