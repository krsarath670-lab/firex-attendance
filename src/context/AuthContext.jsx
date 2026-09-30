import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncOfflineQueue, getOfflineQueue } from '../utils/offlineQueue';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('firex_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('firex_token') || null);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(getOfflineQueue().length);

  // Network listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (token) {
        syncOfflineQueue(token).then((res) => {
          setQueuedCount(res.remaining || 0);
        });
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token]);

  // Fetch initial profile
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setEmployeeProfile(data.employee);
          localStorage.setItem('firex_user', JSON.stringify(data.user));
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Network error loading auth:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (identifier, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('firex_token', data.token);
    localStorage.setItem('firex_user', JSON.stringify(data.user));

    // Try sync any offline punch from previous session
    syncOfflineQueue(data.token).then((res) => {
      setQueuedCount(res.remaining || 0);
    });

    return data.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setEmployeeProfile(null);
    localStorage.removeItem('firex_token');
    localStorage.removeItem('firex_user');
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setEmployeeProfile(data.employee);
        localStorage.setItem('firex_user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerSync = async () => {
    if (!token) return;
    const res = await syncOfflineQueue(token);
    setQueuedCount(res.remaining || 0);
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        employeeProfile,
        loading,
        isOnline,
        queuedCount,
        login,
        logout,
        refreshUser,
        triggerSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
