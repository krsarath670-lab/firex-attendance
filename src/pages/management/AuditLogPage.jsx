import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, User, Calendar } from 'lucide-react';

export function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/audit', {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  let displayed = logs;
  if (search) {
    const q = search.toLowerCase();
    displayed = logs.filter(
      (l) =>
        l.employee_id?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        l.changed_by_name?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q)
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">System Audit Trail</h1>
          <p className="text-xs text-slate-400">
            Immutable log of all punch events, manual adjustments, and administrative actions
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition flex items-center space-x-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by action, worker ID, changed by..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Audit Events ({displayed.length})</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 px-3">Timestamp (Bahrain)</th>
                <th className="pb-3 px-3">Action</th>
                <th className="pb-3 px-3">Employee ID</th>
                <th className="pb-3 px-3">Changed By</th>
                <th className="pb-3 px-3">Reason / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 font-sans">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500 mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 font-sans">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                displayed.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(l.changed_at).toLocaleString('en-US', { timeZone: 'Asia/Bahrain' })}
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-rose-950/80 text-rose-300 border border-rose-900/50 px-2 py-0.5 rounded text-[10px] font-bold">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">{l.employee_id || '—'}</td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-xs">{l.changed_by_name || 'System'}</td>
                    <td className="py-3 px-3 text-slate-400 font-sans text-xs max-w-xs truncate">
                      {l.reason || JSON.stringify(l.new_value || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
