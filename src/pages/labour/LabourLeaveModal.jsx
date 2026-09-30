import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, CheckCircle2, XCircle, AlertCircle, X, Send } from 'lucide-react';

export function LabourLeaveModal({ isOpen, onClose }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('list'); // 'list' or 'apply'
  const [formData, setFormData] = useState({
    leave_type: 'Annual Leave',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaves/my-leaves', {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        setLeaves(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaves();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.start_date || !formData.end_date || !formData.reason.trim()) {
      setError('Please fill all required fields.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/leaves/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit leave request.');

      setSuccess('Leave request submitted successfully!');
      setFormData({ leave_type: 'Annual Leave', start_date: '', end_date: '', reason: '' });
      setTimeout(() => {
        setTab('list');
        setSuccess('');
        fetchLeaves();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-rose-500" />
            <h3 className="text-base font-black text-white">Leave Requests</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switch */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => setTab('list')}
            className={`py-2 font-bold rounded-xl transition ${
              tab === 'list' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Requests ({leaves.length})
          </button>
          <button
            onClick={() => setTab('apply')}
            className={`py-2 font-bold rounded-xl transition ${
              tab === 'apply' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            + Apply Leave
          </button>
        </div>

        {/* Tab 1: List */}
        {tab === 'list' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className="text-center py-8 text-xs text-slate-500">Loading leave requests...</div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-slate-600" />
                <p>No leave requests found.</p>
                <button
                  onClick={() => setTab('apply')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Submit a Request
                </button>
              </div>
            ) : (
              leaves.map((l) => (
                <div key={l.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{l.leave_type}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        l.status === 'Approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : l.status === 'Rejected'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>

                  <div className="text-slate-400 text-[11px] flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {l.start_date} → {l.end_date} ({l.total_days} days)
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px] bg-slate-900/60 p-2 rounded-xl">
                    <span className="text-slate-500 font-semibold">Reason:</span> {l.reason}
                  </p>

                  {l.status === 'Rejected' && l.rejection_reason && (
                    <p className="text-rose-400 text-[11px] bg-rose-950/30 border border-rose-900/40 p-2 rounded-xl">
                      <span className="font-bold">Rejection Note:</span> {l.rejection_reason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Apply Form */}
        {tab === 'apply' && (
          <form onSubmit={handleSubmit} className="space-y-3 flex-1 overflow-y-auto pr-1">
            {error && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Leave Type</label>
              <select
                value={formData.leave_type}
                onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-rose-500"
              >
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Reason for Leave</label>
              <textarea
                rows="3"
                required
                placeholder="Describe reason for leave request..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-white text-xs focus:outline-none focus:border-rose-500"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit Leave Request'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
