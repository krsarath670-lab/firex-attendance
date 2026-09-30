import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Clock, Calendar, User } from 'lucide-react';

export function ManualAttendanceModal({ isOpen, onClose, onSuccess, preselectedEmployeeId = '' }) {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId || '');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [punchInTime, setPunchInTime] = useState('07:00');
  const [punchOutTime, setPunchOutTime] = useState('17:00');
  const [statusOverride, setStatusOverride] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch('/api/employees', {
          headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
          if (!employeeId && data.length > 0) {
            setEmployeeId(data[0].employee_id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    if (isOpen) {
      loadEmployees();
      if (preselectedEmployeeId) setEmployeeId(preselectedEmployeeId);
    }
  }, [isOpen, preselectedEmployeeId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId || !date || !punchInTime || !reason.trim()) {
      setError('Employee, date, punch-in time, and audit reason are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify({
          employee_id: employeeId,
          date,
          punch_in_time: punchInTime,
          punch_out_time: punchOutTime,
          status: statusOverride || undefined,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save manual attendance');

      alert('Manual attendance record saved with audit trail.');
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">Manual Attendance Entry</h3>
        <p className="text-xs text-slate-400 mb-5">
          Record authorized attendance adjustments with mandatory audit trail log.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
            >
              {employees.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.full_name} ({emp.employee_id}) — {emp.site_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Attendance Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Punch In Time</label>
              <input
                type="time"
                required
                value={punchInTime}
                onChange={(e) => setPunchInTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Punch Out Time</label>
              <input
                type="time"
                value={punchOutTime}
                onChange={(e) => setPunchOutTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Status Override (Optional)</label>
            <select
              value={statusOverride}
              onChange={(e) => setStatusOverride(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
            >
              <option value="">Auto-calculate based on working hours</option>
              <option value="Present">Present</option>
              <option value="Present - Late">Present - Late</option>
              <option value="Early Checkout">Early Checkout</option>
              <option value="Leave">Leave</option>
              <option value="Holiday">Holiday</option>
              <option value="Off Day">Off Day</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Audit Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Device breakdown on site / Supervisor verified on-site presence"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
