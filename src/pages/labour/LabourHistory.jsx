import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { LabourCorrectionModal } from './LabourCorrectionModal';
import { Calendar, Clock, ArrowLeft, Filter, AlertTriangle, CheckCircle, FileEdit, RefreshCw } from 'lucide-react';

export function LabourHistory({ onBack }) {
  const [filterType, setFilterType] = useState('month'); // 'week', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateForCorrection, setSelectedDateForCorrection] = useState(null);

  const fetchMyAttendance = async () => {
    setLoading(true);
    try {
      let url = `/api/attendance/my?filter=${filterType}`;
      if (filterType === 'custom' && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAttendance();
  }, [filterType, startDate, endDate]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">MY ATTENDANCE</h1>
            <p className="text-xs text-slate-400">Personal attendance record & history</p>
          </div>
        </div>

        <button
          onClick={() => setSelectedDateForCorrection(new Date().toISOString().substring(0, 10))}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-900/40 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition"
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Request Correction</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setFilterType('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'week' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setFilterType('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'month' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'custom' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom Range
          </button>
        </div>

        {filterType === 'custom' && (
          <div className="flex items-center space-x-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
            />
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Present</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{summary.present_days}</p>
            <p className="text-[10px] text-slate-500">Days recorded</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Late</p>
            <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{summary.late_days}</p>
            <p className="text-[10px] text-slate-500">Arrivals</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Hours</p>
            <p className="text-xl sm:text-2xl font-black text-rose-400 mt-1">{summary.total_hours_formatted}</p>
            <p className="text-[10px] text-slate-500">Accumulated</p>
          </div>
        </div>
      )}

      {/* Attendance History List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mb-2" />
            <p className="text-xs">Loading attendance records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No attendance records found</p>
            <p className="text-xs text-slate-500 mt-1">No punches recorded for the selected period.</p>
          </div>
        ) : (
          records.map((r) => (
            <div
              key={r.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-rose-400" />
                  <span className="text-sm font-bold text-white tracking-wide">
                    {new Date(r.attendance_date + 'T12:00:00Z').toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Punch In</p>
                  <p className="font-bold text-slate-200 mt-0.5">{r.punch_in_display || '--:--'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Punch Out</p>
                  <p className="font-bold text-slate-200 mt-0.5">{r.punch_out_display || '--:--'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Total</p>
                  <p className="font-bold text-emerald-400 mt-0.5">{r.total_hours_formatted || '0h 00m'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Site: {r.site_name || 'Unassigned'}</span>
                <button
                  onClick={() => setSelectedDateForCorrection(r.attendance_date)}
                  className="text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1"
                >
                  <FileEdit className="w-3 h-3" />
                  <span>Fix Record</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Correction Request Modal */}
      {selectedDateForCorrection && (
        <LabourCorrectionModal
          isOpen={Boolean(selectedDateForCorrection)}
          initialDate={selectedDateForCorrection}
          onClose={() => setSelectedDateForCorrection(null)}
          onSuccess={fetchMyAttendance}
        />
      )}
    </div>
  );
}
