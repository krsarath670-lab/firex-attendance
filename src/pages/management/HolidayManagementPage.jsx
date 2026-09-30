import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  Search,
  RefreshCw,
  Sun,
  X,
  Info,
} from 'lucide-react';

export function HolidayManagementPage() {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    is_official: true,
    remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  async function fetchHolidays() {
    setLoading(true);
    try {
      const url = selectedYear ? `/api/holidays?year=${selectedYear}` : '/api/holidays';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHolidays(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setEditingHoliday(null);
    setFormData({
      date: new Date().toISOString().substring(0, 10),
      name: '',
      is_official: true,
      remarks: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (h) => {
    setEditingHoliday(h);
    setFormData({
      date: h.date,
      name: h.name,
      is_official: h.is_official !== false,
      remarks: h.remarks || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      const url = editingHoliday ? `/api/holidays/${editingHoliday.id}` : '/api/holidays';
      const method = editingHoliday ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save public holiday');

      setMsg({
        type: 'success',
        text: editingHoliday ? 'Holiday updated successfully!' : 'Public holiday added successfully!',
      });
      setIsModalOpen(false);
      fetchHolidays();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from Public Holidays?`)) return;

    try {
      const res = await fetch(`/api/holidays/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      setMsg({ type: 'success', text: `Holiday "${name}" deleted.` });
      fetchHolidays();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm('Populate official Bahrain public holidays for 2026 and 2027?')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/holidays/seed-default', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seed');

      setMsg({ type: 'success', text: data.message });
      fetchHolidays();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredHolidays = holidays.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.date.includes(search) ||
    (h.remarks && h.remarks.toLowerCase().includes(search.toLowerCase()))
  );

  const todayStr = new Date().toISOString().substring(0, 10);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2.5">
            <CalendarDays className="w-7 h-7 text-rose-500" />
            <span>Public Holidays Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure official Bahrain public holidays. On holidays and Fridays, attendance automatically exempts non-working staff and computes 100% overtime for workers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSeedDefaults}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-2xl text-xs font-bold border border-amber-500/20 flex items-center space-x-1.5 transition"
            title="Auto-load official Bahrain holidays"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Load Bahrain Holidays</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Public Holiday</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent border border-amber-500/20 rounded-3xl p-4 flex items-start space-x-3 text-xs text-amber-200">
        <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-300">Bahrain Shift & Holiday Policy Active:</p>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            • <strong className="text-white">Sunday to Thursday:</strong> Regular Shift 07:30 AM to 04:30 PM (9 hrs). Work before 07:30 AM or after 04:30 PM is Overtime (OT).<br/>
            • <strong className="text-white">Saturday:</strong> Half Day Shift 07:30 AM to 01:00 PM (5.5 hrs). Work after 01:00 PM is Overtime.<br/>
            • <strong className="text-white">Friday:</strong> Official Weekly Off (Holiday). Non-punched staff are marked as <span className="text-emerald-400 font-semibold">Friday (Weekly Off)</span>.<br/>
            • <strong className="text-white">Public Holidays:</strong> Automatically marked as <span className="text-amber-400 font-semibold">Public Holiday</span> for all employees. If staff punches in on a holiday or Friday, 100% of the duration is calculated as Overtime.
          </p>
        </div>
      </div>

      {msg.text && (
        <div
          className={`p-4 rounded-3xl text-xs flex items-center space-x-2 ${
            msg.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Filter and Year selection Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-3xl p-3.5 shadow-xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search holiday name or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Year:</span>
          {['2025', '2026', '2027', '2028', ''].map((yr) => (
            <button
              key={yr || 'all'}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedYear === yr
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {yr || 'All Years'}
            </button>
          ))}
          <button
            onClick={fetchHolidays}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Holidays List / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Holiday Name</th>
                <th className="py-3.5 px-4">Date & Day</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Remarks</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading public holidays...
                  </td>
                </tr>
              ) : filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <Sun className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No public holidays registered for this selection.
                    <br />
                    <button
                      onClick={handleOpenAdd}
                      className="mt-3 text-rose-400 font-bold hover:underline inline-block"
                    >
                      + Add your first holiday
                    </button>
                  </td>
                </tr>
              ) : (
                filteredHolidays.map((h) => {
                  const d = new Date(h.date);
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                  const isPast = h.date < todayStr;
                  const isToday = h.date === todayStr;

                  return (
                    <tr key={h.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        <span>{h.name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-white font-bold">{h.date}</div>
                        <div className="text-[10px] text-slate-400">{dayName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full text-[10px] font-bold">
                          {h.is_official !== false ? 'Official Public Holiday' : 'Custom Company Holiday'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                        {h.remarks || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {isToday ? (
                          <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full text-[10px] font-bold animate-pulse">
                            Active Today
                          </span>
                        ) : isPast ? (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px]">
                            Past
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">
                            Upcoming
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(h)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                          title="Edit Holiday"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id, h.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add/Edit Public Holiday */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-rose-500" />
                <span>{editingHoliday ? 'Edit Public Holiday' : 'Add Public Holiday'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Holiday Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eid Al Fitr, Bahrain National Day"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Remarks / Description (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Additional context or official gazette notes..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div>
                  <span className="font-semibold text-white block text-xs">Official Paid Holiday</span>
                  <span className="text-[10px] text-slate-400">
                    Staff not working receive holiday exemption; staff working receive OT.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_official}
                  onChange={(e) => setFormData({ ...formData, is_official: e.target.checked })}
                  className="w-5 h-5 text-rose-600 rounded bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/30 transition flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Save Holiday'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
