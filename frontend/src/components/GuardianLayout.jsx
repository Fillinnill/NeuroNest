import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  BrainCircuit, LayoutDashboard, FileText, BarChart2, Sparkles,
  Bell, ClipboardList, LogOut, ChevronLeft, ChevronRight,
  Shield, User, Menu, X, ChevronDown
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview',         path: '/parent' },
  { icon: FileText,        label: 'Session Reports',  path: '/parent/sessions' },
  { icon: BarChart2,       label: 'Analytics',        path: '/parent/analytics' },
  { icon: Sparkles,        label: 'AI Recommendations', path: '/parent/recommendations' },
  { icon: Bell,            label: 'Notifications',    path: '/parent/notifications' },
  { icon: ClipboardList,   label: 'Access Log',       path: '/parent/access-log' },
];

const GuardianLayout = () => {
  const { user, guardianSession, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);

  // ── Real-time WS for guardian notifications ─────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let wsUrl = `${protocol}://${window.location.host}/ws/notify/${user.id}`;
    if (import.meta.env.VITE_API_URL) {
      try {
        const url = new URL(import.meta.env.VITE_API_URL);
        const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws';
        wsUrl = `${wsProtocol}://${url.host}/ws/notify/${user.id}`;
      } catch (err) {
        console.error("Failed to parse VITE_API_URL for WebSocket:", err);
      }
    }
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'permission_change') {
          setUnreadCount(c => c + 1);
        }
      } catch { /* noop */ }
    };

    // Keep-alive ping every 25 s
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping');
    }, 25000);

    return () => { clearInterval(ping); ws.close(); };
  }, [user?.id]);

  // ── Fetch unread notifications count ────────────────────────────────────
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/v1/connections/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUnreadCount(res.data.filter(n => n.is_read === 0).length);
      } catch { /* noop */ }
    };
    fetchUnread();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarWidth = collapsed ? 'w-20' : 'w-64';

  return (
    <div className="flex min-h-screen bg-[#080b14]">

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col
        bg-[#0c0f1e] border-r border-white/5
        transition-all duration-300 ease-in-out
        ${sidebarWidth}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className={`flex items-center gap-3 px-5 py-6 border-b border-white/5 ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="p-2 bg-amber-500/15 rounded-xl text-amber-400 flex-shrink-0">
            <BrainCircuit size={24} />
          </div>
          {!collapsed && (
            <div>
              <span className="font-bold text-lg text-white tracking-tight">NeuroNest</span>
              <span className="block text-[10px] text-amber-400/80 font-semibold uppercase tracking-widest">Guardian Portal</span>
            </div>
          )}
        </div>

        {/* Student Chip — shows active student or a prompt */}
        {!collapsed && (
          <div className="mx-4 mt-4 p-3 rounded-xl border border-amber-500/15 bg-amber-500/5">
            {guardianSession ? (
              <>
                <p className="text-[10px] text-amber-400/60 font-bold uppercase tracking-widest mb-1">Monitoring</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {guardianSession.studentName?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-white truncate">{guardianSession.studentName}</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] text-amber-400/60 font-bold uppercase tracking-widest mb-1">Student Access</p>
                <p className="text-xs text-gray-400">Verify a student on the Overview page to unlock reports.</p>
              </>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/parent'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={`flex-shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                  {!collapsed && item.label === 'Notifications' && unreadCount > 0 && (
                    <span className="ml-auto text-[10px] bg-amber-500 text-black font-bold px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex items-center justify-center mx-3 mb-3 py-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all text-xs gap-2"
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>

        {/* Logout */}
        <div className="border-t border-white/5 p-3">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>

        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-[#0c0f1e]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex items-center gap-2">
            <Shield size={16} className="text-amber-400" />
            <span className="text-sm font-semibold text-gray-300">Guardian Dashboard</span>
            {guardianSession && (
              <span className="hidden sm:inline-flex items-center gap-1.5 ml-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Live Session
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button
              onClick={() => navigate('/parent/notifications')}
              className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full text-[9px] font-bold text-black flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-sm font-bold text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-white">{user?.fullname || user?.username}</p>
                <p className="text-[10px] text-amber-400/70">Guardian</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Footer disclaimer */}
        <footer className="border-t border-white/5 px-8 py-4 flex items-center justify-center gap-2 text-[11px] text-gray-600">
          <Shield size={12} className="text-amber-500/50" />
          NeuroNest Guardian Portal provides analytical summaries only. Private conversations and raw data are never accessible.
        </footer>
      </div>
    </div>
  );
};

export default GuardianLayout;
