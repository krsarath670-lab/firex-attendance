import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Filter,
  RefreshCw,
  AlertCircle,
  FileText,
  Search,
} from 'lucide-react';

export function LeaveManagementPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, leaveId: null, reason: '' });

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      let url = '/api/leaves?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        setLeaves(await res.json());
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter]);

  const handleApprove = async (leaveId) => {
    if (!window.confirm('Approve this leave request?')) return;
    setActionLoading(leaveId);
    try {
      const res = await fetch(`/api/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify({ status: 'Approved' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve leave.');
      alert(data.message);
      fetchLeaves();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModal.reason.trim()) {
      alert('Please specify a rejection reason.');
      return;
    }
    setActionLoading(rejectModal.leaveId);
    try {
      const res = await fetch(`/api/leaves/${rejectModal.leaveId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify({
          status: 'Rejected',
          rejection_reason: rejectModal.reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject leave.');
      alert(data.message);
      setRejectModal({ open: false, leaveId: null, reason: '' });
      fetchLeaves();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.employee_name?.toLowerCase().includes(q) ||
      l.employee_id?.toLowerCase().includes(q) ||
      l.leave_type?.toLowerCase().includes(q) ||
      l.reason?.toLowerCase().includes(q)
    );
  });

  const pendingCount = leaves.filter((l) => l.status === 'Pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'Approved').length;
  const rejectedCount = leaves.filter((l) => l.status === 'Rejected').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Leave Management</h1>
          <p className="text-xs text-slate-400">
            Review, approve, and track employee leave requests and balances
          </p>
        </div>

        <button
          onClick={fetchLeaves}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition flex items-center space-x-1.5 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-500' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Pending Requests
            </span>
            <div className="text-3xl font-black text-white mt-1">{pendingCount}</div>
          </div>
          <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              Approved Leaves
            </span>
            <div className="text-3xl font-black text-white mt-1">{approvedCount}</div>
          </div>
          <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
              Rejected Requests
            </span>
            <div className="text-3xl font-black text-white mt-1">{rejectedCount}</div>
          </div>
          <div className="w-12 h-12 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, leave type, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
            {['ALL', 'Pending', 'Approved', 'Rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  statusFilter === status
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaves List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 px-3">Employee</th>
                <th className="pb-3 px-3">Leave Type</th>
                <th className="pb-3 px-3">Date Range</th>
                <th className="pb-3 px-3">Days</th>
                <th className="pb-3 px-3">Reason</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500 mb-2" />
                    Loading leave requests...
                  </td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No leave requests found matching filters.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-3 font-semibold text-white">
                      <div>{l.employee_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{l.employee_id}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-slate-200">{l.leave_type}</span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-mono text-[11px]">
                      {l.start_date} → {l.end_date}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-white">
                      {l.total_days} {l.total_days === 1 ? 'day' : 'days'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 max-w-xs">
                      <div className="truncate" title={l.reason}>
                        {l.reason}
                      </div>
                      {l.rejection_reason && (
                        <div className="text-[10px] text-rose-400 truncate mt-0.5">
                          Rejection: {l.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          l.status === 'Approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : l.status === 'Rejected'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {l.status === 'Pending' ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleApprove(l.id)}
                            disabled={actionLoading === l.id}
                            title="Approve Leave"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => setRejectModal({ open: true, leaveId: l.id, reason: '' })}
                            disabled={actionLoading === l.id}
                            title="Reject Leave"
                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          Reviewed by {l.reviewed_by_name || 'Management'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-sm">Reject Leave Request</h3>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Reason for Rejection
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Insufficient project staffing during this week..."
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-white text-xs focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModal({ open: false, leaveId: null, reason: '' })}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectModal.leaveId}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
