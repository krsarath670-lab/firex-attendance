import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { FileEdit, CheckCircle2, XCircle, Clock, Calendar, User, RefreshCw, MessageSquare } from 'lucide-react';

export function CorrectionReviewPage() {
  const [corrections, setCorrections] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCorrections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/corrections', {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        setCorrections(await res.json());
      }
    } catch (err) {
      console.error('Error fetching corrections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrections();
  }, []);

  const handleReview = async (id, action) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/attendance/corrections/${id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify({
          action, // 'APPROVE' or 'REJECT'
          review_notes: reviewNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review correction');

      alert(`Correction request ${action === 'APPROVE' ? 'Approved' : 'Rejected'} successfully!`);
      setReviewingId(null);
      setReviewNotes('');
      fetchCorrections();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  let displayed = corrections;
  if (filterStatus) {
    displayed = corrections.filter((c) => c.status === filterStatus);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Attendance Correction Requests</h1>
          <p className="text-xs text-slate-400">
            Review, approve, or reject employee punch modification requests with audit tracking
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-2xl p-1">
          <button
            onClick={() => setFilterStatus('Pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'Pending' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending ({corrections.filter((c) => c.status === 'Pending').length})
          </button>
          <button
            onClick={() => setFilterStatus('Approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'Approved' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilterStatus('Rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'Rejected' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterStatus === '' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mx-auto mb-2" />
            <p className="text-xs">Loading correction requests...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/80 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No correction requests found</p>
            <p className="text-xs text-slate-500 mt-1">All employee attendance requests are up to date.</p>
          </div>
        ) : (
          displayed.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <FileEdit className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">{c.employee_name}</span>
                    <span className="ml-2 text-xs font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-900/40">
                      {c.employee_id}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Submitted: {new Date(c.created_at).toLocaleString('en-US', { timeZone: 'Asia/Bahrain' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <StatusBadge status={c.status} />
                  <span className="text-xs font-mono text-slate-400">Date: {c.attendance_date}</span>
                </div>
              </div>

              {/* Comparison table between Original and Requested */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Original Record</p>
                  <p className="text-slate-300">
                    Punch In: <span className="font-mono text-slate-200 font-semibold">{c.original_punch_in || 'Missing'}</span>
                  </p>
                  <p className="text-slate-300">
                    Punch Out: <span className="font-mono text-slate-200 font-semibold">{c.original_punch_out || 'Missing'}</span>
                  </p>
                </div>

                <div className="bg-rose-950/20 rounded-2xl p-3.5 border border-rose-900/40 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-rose-400">Requested Change</p>
                  <p className="text-slate-200">
                    Requested In: <span className="font-mono text-emerald-400 font-bold">{c.requested_punch_in || '—'}</span>
                  </p>
                  <p className="text-slate-200">
                    Requested Out: <span className="font-mono text-emerald-400 font-bold">{c.requested_punch_out || '—'}</span>
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80 text-xs">
                <span className="text-slate-500 font-semibold block mb-0.5">Employee Reason:</span>
                <p className="text-slate-200 italic">"{c.reason}"</p>
              </div>

              {/* Review details if already reviewed */}
              {c.status !== 'Pending' && (
                <div className="text-[11px] text-slate-400 bg-slate-950/80 rounded-xl p-2.5 border border-slate-800">
                  <span>Reviewed by {c.reviewed_by_name || 'Management'} on {c.reviewed_at?.substring(0, 10)}. </span>
                  {c.review_notes && <span className="italic">Note: "{c.review_notes}"</span>}
                </div>
              )}

              {/* Action Buttons for Pending */}
              {c.status === 'Pending' && (
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <input
                    type="text"
                    placeholder="Add review comment or note (optional)..."
                    value={reviewingId === c.id ? reviewNotes : ''}
                    onChange={(e) => {
                      setReviewingId(c.id);
                      setReviewNotes(e.target.value);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleReview(c.id, 'REJECT')}
                      className="flex-1 sm:flex-none px-4 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-1"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>REJECT</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleReview(c.id, 'APPROVE')}
                      className="flex-1 sm:flex-none px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-1"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>APPROVE</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
