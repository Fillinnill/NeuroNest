import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // guardianSession: { studentId, studentName, guardianName } — set after student verification inside dashboard
  const [guardianSession, setGuardianSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Rehydrate on page refresh ──────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser(token).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const saved = localStorage.getItem('guardian_session');
    if (saved) {
      try { setGuardianSession(JSON.parse(saved)); }
      catch { localStorage.removeItem('guardian_session'); }
    }
  }, []);

  // ── Fetch user profile ─────────────────────────────────────────────────────
  const fetchUser = async (token) => {
    try {
      const res = await axios.get('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      return res.data;
    } catch (err) {
      localStorage.removeItem('token');
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: Standard login (student OR guardian with own credentials) ───────
  const login = async (username, password) => {
    // Force a complete hard-reset of the client auth state to prevent role contamination
    localStorage.removeItem('token');
    localStorage.removeItem('guardian_session');
    setUser(null);
    setGuardianSession(null);

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const res = await axios.post('/api/v1/auth/login', formData);
    const { access_token, role } = res.data;
    localStorage.setItem('token', access_token);

    // Fetch full profile (includes role in the User schema now)
    const fetchedUser = await fetchUser(access_token);
    // Return effective role (prefer response field which is fastest)
    return { ...fetchedUser, role: role || fetchedUser.role || 'child' };
  };


  // ── Step 2: Guardian verifies student identity (called from inside /parent) ─
  const guardianVerify = async (studentUsername, studentPassword) => {
    const token = localStorage.getItem('token');
    const res = await axios.post(
      '/api/v1/auth/guardian-verify',
      { student_username: studentUsername, student_password: studentPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { access_token, student_id, student_name, guardian_name } = res.data;

    // Replace token with guardian-scoped one (valid 8 h)
    localStorage.setItem('token', access_token);

    const session = { studentId: student_id, studentName: student_name, guardianName: guardian_name };
    localStorage.setItem('guardian_session', JSON.stringify(session));
    setGuardianSession(session);

    // Refresh user state with new scoped token
    await fetchUser(access_token);
    return session;
  };

  const clearGuardianSession = () => {
    localStorage.removeItem('guardian_session');
    setGuardianSession(null);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('guardian_session');
    setUser(null);
    setGuardianSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      guardianSession,
      login,
      guardianVerify,
      clearGuardianSession,
      logout,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
