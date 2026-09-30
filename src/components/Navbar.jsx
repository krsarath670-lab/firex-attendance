import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './StatusBadge';
import { Flame, LogOut, Wifi, WifiOff, RefreshCw, Key, ShieldCheck, User } from 'lucide-react';

export function Navbar({ onChangeView, currentView }) {
  const { user, logout, isOnline, queuedCount, triggerSync } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await triggerSync();
      alert(`Sync completed! ${res?.synced || 0} punches uploaded.`);
    } catch (err) {
      alert('Sync failed. Please check your internet connection.');
    } finally {
      setSyncing(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      setPassMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwords.next.length < 6) {
      setPassMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPassMsg({ type: 'success', text: 'Password changed successfully!' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswords({ current: '', next: '', confirm: '' });
        setPassMsg({ type: '', text: '' });
      }, 1500);
    } catch (err) {
      setPassMsg({ type: 'error', text: err.message || 'Failed to change password' });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onChangeView && onChangeView('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg sm:text-xl tracking-wider text-white">FIREX</span>
                <span className="text-xs font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/50">
                  ATTENDANCE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Labour Attendance Management</p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Online / Offline / Queue Status */}
            {!isOnline ? (
              <div className="flex items-center space-x-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-medium">
                <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                <span className="hidden sm:inline">Offline</span>
                {queuedCount > 0 && <span className="bg-amber-500 text-slate-950 font-bold px-1.5 rounded-full text-[10px]">{queuedCount}</span>}
              </div>
            ) : queuedCount > 0 ? (
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="flex items-center space-x-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-full text-xs font-medium transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>Sync ({queuedCount})</span>
              </button>
            ) : (
              <div className="hidden sm:flex items-center space-x-1.5 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded-full text-[11px]">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>Online</span>
              </div>
            )}

            {/* User Profile & Role */}
            {user && (
              <div className="flex items-center space-x-2 sm:space-x-3 pl-2 border-l border-slate-800">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{user.employee_id || user.username}</p>
                </div>

                <RoleBadge role={user.role} />

                {/* Password reset button */}
                <button
                  onClick={() => setShowPasswordModal(true)}
                  title="Change Password"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <Key className="w-4 h-4" />
                </button>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  title="Log out"
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition border border-rose-900/30"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2 mb-4">
              <Key className="w-5 h-5 text-rose-500" />
              <span>Change Account Password</span>
            </h3>

            {passMsg.text && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-medium ${
                  passMsg.type === 'success'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                }`}
              >
                {passMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">New Password (min 6 chars)</label>
                <input
                  type="password"
                  required
                  value={passwords.next}
                  onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
