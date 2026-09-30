import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  MapPin,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building,
  RefreshCw,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
} from 'lucide-react';

export function SiteSchedulePage() {
  const { user } = useAuth();

  // Helper for tomorrow's date in YYYY-MM-DD
  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().substring(0, 10);
  };

  const getTodayDate = () => new Date().toISOString().substring(0, 10);

  const [date, setDate] = useState(getTomorrowDate());
  const [departmentTab, setDepartmentTab] = useState('ALL'); // 'ALL', 'Project', 'Maintenance'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'SCHEDULED', 'PENDING'

  const [data, setData] = useState({
    summary: {
      total_workers: 0,
      scheduled_count: 0,
      pending_count: 0,
      project_workers: 0,
      maintenance_workers: 0,
    },
    recent_sites: [],
    workers: [],
  });

  const [loading, setLoading] = useState(true);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [bulkSiteInput, setBulkSiteInput] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Single worker quick edit modal
  const [singleModal, setSingleModal] = useState({
    open: false,
    worker: null,
    siteName: '',
  });

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      let url = `/api/schedule?date=${date}`;
      if (departmentTab !== 'ALL') url += `&department=${departmentTab}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load site schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    setSelectedEmpIds([]);
  }, [date, departmentTab, search]);

  const filteredWorkers = data.workers.filter((w) => {
    if (statusFilter === 'SCHEDULED') return w.is_scheduled;
    if (statusFilter === 'PENDING') return !w.is_scheduled;
    return true;
  });

  const handleSelectAll = () => {
    if (selectedEmpIds.length === filteredWorkers.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(filteredWorkers.map((w) => w.employee_id));
    }
  };

  const handleToggleSelect = (empId) => {
    if (selectedEmpIds.includes(empId)) {
      setSelectedEmpIds(selectedEmpIds.filter((id) => id !== empId));
    } else {
      setSelectedEmpIds([...selectedEmpIds, empId]);
    }
  };

  const handleBulkAssign = async (e) => {
    if (e) e.preventDefault();
    if (!bulkSiteInput.trim()) {
      alert('Please enter or select a Site Name.');
      return;
    }
    if (selectedEmpIds.length === 0) {
      alert('Please select at least one worker from the list.');
      return;
    }

    setSubmittingBulk(true);
    setFeedback({ type: '', text: '' });

    try {
      const res = await fetch('/api/schedule/bulk-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify({
          date,
          employee_ids: selectedEmpIds,
          site_name: bulkSiteInput.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to assign site');

      setFeedback({ type: 'success', text: resData.message });
      setSelectedEmpIds([]);
      setBulkSiteInput('');
      fetchSchedule();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleSingleAssign = async (e) => {
    e.preventDefault();
    if (!singleModal.siteName.trim()) {
      alert('Please enter a Site Name.');
      return;
    }

    try {
      const res = await fetch('/api/schedule/assign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify({
          date,
          employee_id: singleModal.worker.employee_id,
          site_name: singleModal.siteName.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to assign');

      setSingleModal({ open: false, worker: null, siteName: '' });
      setFeedback({ type: 'success', text: resData.message });
      fetchSchedule();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClearAssignment = async (empId) => {
    if (!window.confirm('Clear scheduled site for this worker?')) return;

    try {
      const res = await fetch(`/api/schedule/assign?date=${date}&employee_id=${empId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        fetchSchedule();
      }
    } catch (err) {
      alert('Failed to clear assignment');
    }
  };

  const isTomorrow = date === getTomorrowDate();
  const isToday = date === getTodayDate();

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-white">Daily Site Scheduling</h1>
            <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-mono uppercase font-bold">
              Evening Workflow
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Engineers & Supervisors schedule next day work sites for Project & Maintenance workers
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDate(getTodayDate())}
            className={`px-3 py-2 rounded-2xl text-xs font-bold transition border ${
              isToday
                ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/30'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            Today ({getTodayDate()})
          </button>
          <button
            onClick={() => setDate(getTomorrowDate())}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition border flex items-center space-x-1.5 ${
              isTomorrow
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/30'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Tomorrow (Next Day)</span>
          </button>
          <button
            onClick={fetchSchedule}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Total Labour</span>
          <div className="text-2xl font-black text-white">{data.summary.total_workers}</div>
          <span className="text-[10px] text-slate-500">Active workforce</span>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-4 shadow-xl bg-gradient-to-br from-slate-900 to-emerald-950/30">
          <span className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">Scheduled</span>
          <div className="text-2xl font-black text-emerald-400">{data.summary.scheduled_count}</div>
          <span className="text-[10px] text-emerald-500">Ready for site</span>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-4 shadow-xl bg-gradient-to-br from-slate-900 to-amber-950/30">
          <span className="text-[10px] font-bold uppercase text-amber-400 block mb-1">Pending Site</span>
          <div className="text-2xl font-black text-amber-400">{data.summary.pending_count}</div>
          <span className="text-[10px] text-amber-500">Needs evening assign</span>
        </div>

        <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-4 shadow-xl">
          <span className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">Project Dept</span>
          <div className="text-2xl font-black text-cyan-400">{data.summary.project_workers}</div>
          <span className="text-[10px] text-slate-500">Installation & civil</span>
        </div>

        <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-4 shadow-xl">
          <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">Maintenance Dept</span>
          <div className="text-2xl font-black text-purple-400">{data.summary.maintenance_workers}</div>
          <span className="text-[10px] text-slate-500">Service & inspection</span>
        </div>
      </div>

      {/* Date & Filter Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Department Tabs */}
          <div className="flex items-center space-x-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setDepartmentTab('ALL')}
              className={`px-3 py-1.5 rounded-xl transition ${
                departmentTab === 'ALL' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Departments ({data.summary.total_workers})
            </button>
            <button
              onClick={() => setDepartmentTab('Project')}
              className={`px-3 py-1.5 rounded-xl transition ${
                departmentTab === 'Project' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Project ({data.summary.project_workers})
            </button>
            <button
              onClick={() => setDepartmentTab('Maintenance')}
              className={`px-3 py-1.5 rounded-xl transition ${
                departmentTab === 'Maintenance' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Maintenance ({data.summary.maintenance_workers})
            </button>
          </div>

          {/* Date Picker & Status Filter */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-2xl">
              <Calendar className="w-3.5 h-3.5 text-rose-500" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-xs text-white font-mono focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled Only</option>
              <option value="PENDING">Pending Site Only</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search worker by name, ID, or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Bulk Scheduling Action Box */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-rose-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-black text-white">Bulk Assign Site for {date}</span>
          </div>
          <span className="text-xs text-slate-400">
            Selected: <strong className="text-rose-400 font-mono text-sm">{selectedEmpIds.length}</strong> of{' '}
            {filteredWorkers.length} workers
          </span>
        </div>

        {/* Dynamic recent site chips if any */}
        {data.recent_sites && data.recent_sites.length > 0 && (
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Recently Used Sites (Click to pick or type below):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {data.recent_sites.map((siteName) => (
                <button
                  key={siteName}
                  type="button"
                  onClick={() => setBulkSiteInput(siteName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    bulkSiteInput === siteName
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  📍 {siteName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Input and Submit Button */}
        <form onSubmit={handleBulkAssign} className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <div className="relative flex-1 w-full">
            <Building className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
            <input
              type="text"
              required
              placeholder="Type or select site (e.g. Al Seef Commercial Tower, BAPCO Refinery, Customer Site...)"
              value={bulkSiteInput}
              onChange={(e) => setBulkSiteInput(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={submittingBulk || selectedEmpIds.length === 0}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white rounded-2xl text-xs font-black tracking-wider uppercase shadow-xl shadow-rose-600/30 flex items-center justify-center space-x-2 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {submittingBulk ? 'Assigning...' : `Assign Site to (${selectedEmpIds.length}) Workers`}
            </span>
          </button>
        </form>

        {feedback.text && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* Workers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800"
            >
              {selectedEmpIds.length === filteredWorkers.length && filteredWorkers.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-rose-500" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>
                {selectedEmpIds.length === filteredWorkers.length && filteredWorkers.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </span>
            </button>
            <span className="text-xs text-slate-400">
              Showing {filteredWorkers.length} worker{filteredWorkers.length === 1 ? '' : 's'}
            </span>
          </div>

          <span className="text-xs text-slate-400 font-mono">Date: {date}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 px-3 w-10">Select</th>
                <th className="pb-3 px-3">Worker Name & ID</th>
                <th className="pb-3 px-3">Department</th>
                <th className="pb-3 px-3">Designation</th>
                <th className="pb-3 px-3">Scheduled Work Site</th>
                <th className="pb-3 px-3">Scheduled By</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500 mb-2" />
                    Loading workers and schedules...
                  </td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No workers matching the selected department/filter.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((w) => {
                  const isSelected = selectedEmpIds.includes(w.employee_id);
                  return (
                    <tr
                      key={w.employee_id}
                      className={`hover:bg-slate-800/40 transition ${isSelected ? 'bg-rose-950/20' : ''}`}
                    >
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(w.employee_id)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        <div>{w.full_name}</div>
                        <div className="text-[10px] text-rose-400 font-mono font-normal">
                          {w.employee_id} {w.mobile ? `• ${w.mobile}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            w.department === 'Maintenance'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {w.department || 'Project'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{w.designation}</td>
                      <td className="py-3 px-3">
                        {w.is_scheduled ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                            <span className="font-bold text-white text-xs">{w.scheduled_site}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-amber-400/90 font-medium">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0"></span>
                            <span>Pending Site Assignment</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {w.scheduled_by ? (
                          <div>
                            <span className="text-slate-300 font-medium">{w.scheduled_by}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() =>
                              setSingleModal({
                                open: true,
                                worker: w,
                                siteName: w.scheduled_site || '',
                              })
                            }
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 rounded-lg text-xs font-semibold transition"
                          >
                            {w.is_scheduled ? 'Change Site' : 'Assign Site'}
                          </button>
                          {w.is_scheduled && (
                            <button
                              onClick={() => handleClearAssignment(w.employee_id)}
                              title="Clear assignment"
                              className="p-1 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Worker Assign Modal */}
      {singleModal.open && singleModal.worker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-rose-500" />
              <span>Assign Site for {singleModal.worker.full_name}</span>
            </h3>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1">
              <div>
                <span className="text-slate-500">Employee ID: </span>
                <span className="text-rose-400 font-mono font-bold">{singleModal.worker.employee_id}</span>
              </div>
              <div>
                <span className="text-slate-500">Department: </span>
                <span className="text-white font-semibold">{singleModal.worker.department}</span>
              </div>
              <div>
                <span className="text-slate-500">Target Date: </span>
                <span className="text-white font-mono font-semibold">{date}</span>
              </div>
            </div>

            <form onSubmit={handleSingleAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Site Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al Seef Commercial Tower"
                  value={singleModal.siteName}
                  onChange={(e) => setSingleModal({ ...singleModal, siteName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>

              {/* Quick site chips */}
              <div className="flex flex-wrap gap-1">
                {data.recent_sites.slice(0, 6).map((site) => (
                  <button
                    key={site}
                    type="button"
                    onClick={() => setSingleModal({ ...singleModal, siteName: site })}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-semibold"
                  >
                    {site}
                  </button>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSingleModal({ open: false, worker: null, siteName: '' })}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default SiteSchedulePage;
