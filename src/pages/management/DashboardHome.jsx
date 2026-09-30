import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  Briefcase,
  CheckCircle,
  FileEdit,
  UserPlus,
  FileSpreadsheet,
  Building,
  Settings,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
  MapPin,
} from 'lucide-react';

export function DashboardHome({ onNavigate }) {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/daily', {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const metrics = dashboardData?.summary || {
    total_labour: 0,
    present: 0,
    late: 0,
    absent: 0,
    currently_working: 0,
    checked_out: 0,
    leave_count: 0,
    correction_requests: 0,
  };

  let records = dashboardData?.records || [];
  if (search) {
    const q = search.toLowerCase();
    records = records.filter(
      (r) =>
        r.employee_name?.toLowerCase().includes(q) ||
        r.employee_id?.toLowerCase().includes(q) ||
        r.site_name?.toLowerCase().includes(q)
    );
  }
  if (statusFilter) {
    records = records.filter((r) => r.status?.toLowerCase().includes(statusFilter.toLowerCase()));
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 border border-red-900/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">
              MANAGEMENT DASHBOARD • {user?.role}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Welcome, {user?.name}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Live Workforce Attendance Overview • Today: {dashboardData?.date || 'Today'} (Bahrain Time)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchDashboard}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-700/80 transition flex items-center space-x-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => onNavigate('schedule')}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-rose-950/60 text-rose-300 hover:text-white border border-rose-500/40 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Evening Site Scheduling</span>
            </button>

            <button
              onClick={() => onNavigate('employees', { openAdd: true })}
              className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-2 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total Labour</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{metrics.total_labour}</p>
          <p className="text-[9px] text-slate-500">Active workers</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Present</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{metrics.present}</p>
          <p className="text-[9px] text-slate-500">Punched in</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Late</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">{metrics.late}</p>
          <p className="text-[9px] text-slate-500">Past grace</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Absent</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1">{metrics.absent}</p>
          <p className="text-[9px] text-slate-500">No punch</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Working Now</span>
            <Briefcase className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-black text-teal-400 mt-1">{metrics.currently_working}</p>
          <p className="text-[9px] text-slate-500">On duty</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Checked Out</span>
            <CheckCircle className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-400 mt-1">{metrics.checked_out}</p>
          <p className="text-[9px] text-slate-500">Completed</p>
        </div>

        <div
          onClick={() => onNavigate('leaves')}
          className="bg-slate-900/90 hover:bg-slate-800 border border-purple-500/30 rounded-2xl p-3.5 shadow-sm cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-purple-400">On Leave</span>
            <Building className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400 mt-1">{metrics.leave_count || 0}</p>
          <p className="text-[9px] text-purple-300/80">Approved leave</p>
        </div>

        <div
          onClick={() => onNavigate('corrections')}
          className="bg-slate-900/90 hover:bg-slate-800 border border-yellow-500/30 rounded-2xl p-3.5 shadow-sm cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-yellow-400">Corrections</span>
            <FileEdit className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-black text-yellow-400 mt-1">{metrics.correction_requests}</p>
          <p className="text-[9px] text-slate-400">Pending review</p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">QUICK ACTIONS</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          <button
            onClick={() => onNavigate('daily')}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition"
          >
            <Clock className="w-4 h-4 text-rose-400 mb-1" />
            <p className="text-xs font-bold text-white">Daily Attendance</p>
            <p className="text-[10px] text-slate-400">Live roster view</p>
          </button>

          <button
            onClick={() => onNavigate('monthly')}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-400 mb-1" />
            <p className="text-xs font-bold text-white">Monthly Attendance</p>
            <p className="text-[10px] text-slate-400">Hours & summaries</p>
          </button>

          <button
            onClick={() => onNavigate('employees')}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition"
          >
            <Users className="w-4 h-4 text-emerald-400 mb-1" />
            <p className="text-xs font-bold text-white">Labour Employees</p>
            <p className="text-[10px] text-slate-400">Directory & status</p>
          </button>

          <button
            onClick={() => onNavigate('corrections')}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition"
          >
            <FileEdit className="w-4 h-4 text-amber-400 mb-1" />
            <p className="text-xs font-bold text-white">Correction Requests</p>
            <p className="text-[10px] text-slate-400">Approve / Reject</p>
          </button>

          <button
            onClick={() => onNavigate('sites')}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition"
          >
            <Building className="w-4 h-4 text-purple-400 mb-1" />
            <p className="text-xs font-bold text-white">Work Sites</p>
            <p className="text-[10px] text-slate-400">GPS & Geofences</p>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-rose-400 mb-1" />
            <p className="text-xs font-bold text-white">Reports & Export</p>
            <p className="text-[10px] text-slate-400">Excel, CSV, PDF</p>
          </button>
        </div>
      </div>

      {/* Live Today Attendance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">Today's Attendance Feed</h3>
            <p className="text-xs text-slate-400">Real-time status for all active workers</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search employee or site..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 w-48 sm:w-60"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Present - Late">Present - Late</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 px-3">Employee</th>
                <th className="pb-3 px-3">ID</th>
                <th className="pb-3 px-3">Site</th>
                <th className="pb-3 px-3">Punch In</th>
                <th className="pb-3 px-3">Punch Out</th>
                <th className="pb-3 px-3">Hours</th>
                <th className="pb-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id || r.employee_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-white">
                      <div>{r.employee_name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{r.designation}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-300">{r.employee_id}</td>
                    <td className="py-3 px-3 text-slate-300">{r.site_name || 'Unassigned'}</td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-200">
                      {r.punch_in_display || '--:--'}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-200">
                      {r.punch_out_display || '--:--'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {r.total_hours_formatted || '0h 00m'}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={r.status} />
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
