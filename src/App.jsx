import React from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { LabourHome } from './pages/labour/LabourHome';
import { ManagementLayout } from './pages/management/ManagementLayout';
import { RefreshCw } from 'lucide-react';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30 animate-pulse">
          <RefreshCw className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading FIREX Attendance...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      <Navbar />

      <div className="flex-1">
        {user.role === 'LABOUR' ? (
          <main className="p-4 sm:p-6 max-w-lg mx-auto w-full">
            <LabourHome />
          </main>
        ) : (
          <ManagementLayout />
        )}
      </div>
    </div>
  );
}

export default App;
