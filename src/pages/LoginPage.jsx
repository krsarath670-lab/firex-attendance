import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Flame,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState(() => localStorage.getItem('firex_last_username') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setError('Please provide username/email/employee ID and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(cleanId, cleanPass);
      localStorage.setItem('firex_last_username', cleanId);
    } catch (err) {
      setError(err.message || 'Invalid username, employee ID, or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-rose-700/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 items-center justify-center shadow-xl shadow-red-600/30 mb-4 ring-4 ring-rose-500/20">
            <Flame className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wider">
            FIREX <span className="text-rose-500">ATTENDANCE</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400 font-medium">Workforce Attendance & Shift Management</p>
          <div className="mt-2 inline-flex items-center space-x-1.5 bg-slate-900 border border-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Bahrain Operations (UTC+3)</span>
          </div>
        </div>

        {/* Login Box */}
        <div className="mt-8 bg-slate-900/90 backdrop-blur border border-slate-800 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl">
          {error && (
            <div className="mb-6 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Username / Employee ID / Phone / Email
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="e.g. engineer001, supervisor001, LAB-0001"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 flex items-center justify-center space-x-2 transition transform active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to FIREX</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
