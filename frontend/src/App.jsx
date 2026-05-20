import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardLayout from './components/DashboardLayout';
import GuardianLayout from './components/GuardianLayout';
import Dashboard from './pages/Dashboard';
import AIPractice from './pages/AIPractice';
import PracticeLibrary from './pages/PracticeLibrary';
import Settings from './pages/Settings';
import CreateSession from './pages/CreateSession';
import SessionHistory from './pages/SessionHistory';
import Achievements from './pages/Achievements';
import Analytics from './pages/Analytics';
import RoleSelection from './pages/RoleSelection';
// Guardian pages
import GuardianOverview from './pages/guardian/GuardianOverview';
import GuardianSessions from './pages/guardian/GuardianSessions';
import GuardianAnalytics from './pages/guardian/GuardianAnalytics';
import GuardianRecommendations from './pages/guardian/GuardianRecommendations';
import GuardianNotifications from './pages/guardian/GuardianNotifications';
import GuardianAccessLog from './pages/guardian/GuardianAccessLog';

// ── Protected route for regular students (blocks guardians) ─────────────────
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  // Guardians who accidentally hit /dashboard get redirected to their portal
  if (user.role === 'parent') return <Navigate to="/parent" />;
  return children;
};

// ── Protected route for guardians — requires role=parent only ───────────────
// Student verification happens INSIDE the dashboard, not on login
const GuardianRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'parent' && user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<><Navbar /><LandingPage /></>} />
            <Route path="/select-role" element={<><Navbar /><RoleSelection /></>} />
            <Route path="/login" element={<><Navbar /><Login /></>} />
            <Route path="/signup" element={<><Navbar /><Signup /></>} />

            {/* Student dashboard routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardLayout /></ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="practice" element={<PracticeLibrary />} />
              <Route path="practice/:id" element={<AIPractice />} />
              <Route path="sessions" element={<SessionHistory />} />
              <Route path="sessions/new" element={<CreateSession />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Guardian dashboard routes — fully separate layout */}
            <Route path="/parent" element={
              <GuardianRoute><GuardianLayout /></GuardianRoute>
            }>
              <Route index element={<GuardianOverview />} />
              <Route path="sessions" element={<GuardianSessions />} />
              <Route path="analytics" element={<GuardianAnalytics />} />
              <Route path="recommendations" element={<GuardianRecommendations />} />
              <Route path="notifications" element={<GuardianNotifications />} />
              <Route path="access-log" element={<GuardianAccessLog />} />
            </Route>

            {/* Legacy /parent redirect */}
            <Route path="/parent-old" element={<Navigate to="/parent" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
