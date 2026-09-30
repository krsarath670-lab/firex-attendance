import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Flame, Lock, User, ShieldCheck, AlertCircle, ArrowRight, UserCheck, HardHat } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please provide username/email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(identifier, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (userVal, passVal) => {
    setIdentifier(userVal);
    setPassword(passVal);
    setError('');
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
          <p className="mt-1 text-sm text-slate-400 font-medium">Labour Attendance Management System</p>
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
                Username / Email / Employee ID
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="e.g. LAB-0001 or engineer"
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
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
                />
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

          {/* Quick Test Accounts Section */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
              ⚡ Quick 1-Click Test Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('engineer', 'admin123')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-purple-500/30 rounded-xl text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">ENGINEER</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition" />
                </div>
                <p className="text-[10px] text-slate-400">Full System Access</p>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('supervisor', 'admin123')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-amber-500/30 rounded-xl text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">SUPERVISOR</span>
                  <UserCheck className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
                </div>
                <p className="text-[10px] text-slate-400">Management Access</p>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('labour1', 'labour123')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-emerald-500/30 rounded-xl text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">LABOUR 1</span>
                  <HardHat className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
                </div>
                <p className="text-[10px] text-slate-400">Mohammed (LAB-0001)</p>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('labour2', 'labour123')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-emerald-500/30 rounded-xl text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">LABOUR 2</span>
                  <HardHat className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
                </div>
                <p className="text-[10px] text-slate-400">Rajesh (LAB-0002)</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
