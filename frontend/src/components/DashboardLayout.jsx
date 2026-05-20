import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

const DashboardLayout = () => {
  const { user, parentSession, logout } = useAuth();
  const navigate = useNavigate();

  const handleExitGuardian = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col bg-[#0b041a] min-h-screen w-full">
      {/* Premium Guardian Mode Top Banner */}
      {parentSession?.isParentSession && (
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border-b border-amber-500/30 px-6 py-3 flex items-center justify-between text-amber-300 backdrop-blur-md sticky top-0 z-40 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 animate-pulse">
              <ShieldAlert size={18} />
            </div>
            <span className="text-sm font-medium tracking-wide">
              Guardian Mode: Viewing progress logs and reports for <strong className="text-white font-extrabold">{user?.fullname || user?.username}</strong> as parent <strong className="text-amber-400 font-bold">@{parentSession.parentUsername}</strong>.
            </span>
          </div>
          <button
            onClick={handleExitGuardian}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 hover:bg-amber-500/30 hover:text-white transition-all active:scale-95 shadow-md shadow-amber-500/5"
          >
            <LogOut size={14} />
            Exit Guardian Mode
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-screen">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
