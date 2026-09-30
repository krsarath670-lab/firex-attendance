import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { ManualAttendanceModal } from './ManualAttendanceModal';
import { exportToExcel, exportToCSV, exportToPDF } from '../../utils/exportUtils';
import {
  Calendar,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  MapPin,
  Clock,
  FileSpreadsheet,
  FileText,
  Camera,
  ShieldAlert,
  WifiOff,
  X,
  Zap,
  CalendarDays,
  Sun,
} from 'lucide-react';

export function DailyAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [records, setRecords] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [sites, setSites] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  const [departmentFilter, setDepartmentFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEmployeeId, setManualEmployeeId] = useState('');
  const [photoPreview, setPhotoPreview] = useState({ open: false, url: '', title: '' });

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      let url = `/api/attendance/daily?date=${date}`;
      if (departmentFilter) url += `&department=${departmentFilter}`;
      if (siteFilter) url += `&site_id=${siteFilter}`;
      if (supervisorFilter) url += `&supervisor_id=${supervisorFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setMetrics(data.summary || null);
        setSchedule(data.schedule || null);
      }
    } catch (err) {
      console.error('Error loading daily attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadMeta() {
      try {
        const [sitesRes, supRes] = await Promise.all([
          fetch('/api/sites', { headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` } }),
          fetch('/api/employees/supervisors-list', {
            headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
          }),
        ]);
        if (sitesRes.ok) setSites(await sitesRes.json());
        if (supRes.ok) setSupervisors(await supRes.json());
      } catch (err) {
        console.error(err);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    fetchDailyData();
  }, [date, departmentFilter, siteFilter, supervisorFilter, statusFilter, search]);

  const handleExportExcel = () => {
    const exportRows = records.map((r) => ({
      'Employee ID': r.employee_id,
      'Full Name': r.employee_name,
      Department: r.department || 'Project',
      Site: r.site_name,
      Supervisor: r.supervisor_name,
      Date: r.attendance_date,
      'Punch In': r.punch_in_display || 'Absent',
      'Punch Out': r.punch_out_display || '--:--',
      'Total Hours': r.total_hours_formatted || '0h 00m',
      'Regular Hours': r.regular_hours_formatted || '0h 00m',
      'Overtime (OT)': r.ot_hours_formatted || '0h 00m',
      Status: r.status,
      'Sync Status': r.sync_status || 'SYNCED',
      'Tamper Flag': r.tamper_flag ? 'YES (Clock Skew)' : 'NO',
      'Is Manual': r.is_manual ? 'Yes' : 'No',
    }));
    exportToExcel(exportRows, `FIREX-Daily-Attendance-${date}`);
  };

  const handleExportCSV = () => {
    const exportRows = records.map((r) => ({
      'Employee ID': r.employee_id,
      'Full Name': r.employee_name,
      Department: r.department || 'Project',
      Site: r.site_name,
      Supervisor: r.supervisor_name,
      Date: r.attendance_date,
      'Punch In': r.punch_in_display || 'Absent',
      'Punch Out': r.punch_out_display || '--:--',
      'Total Hours': r.total_hours_formatted || '0h 00m',
      'Regular Hours': r.regular_hours_formatted || '0h 00m',
      'Overtime (OT)': r.ot_hours_formatted || '0h 00m',
      Status: r.status,
      'Sync Status': r.sync_status || 'SYNCED',
      'Tamper Flag': r.tamper_flag ? 'YES' : 'NO',
      'Is Manual': r.is_manual ? 'Yes' : 'No',
    }));
    exportToCSV(exportRows, `FIREX-Daily-Attendance-${date}`);
  };

  const handleExportPDF = () => {
    const columns = ['Employee ID', 'Name', 'Dept', 'Site', 'Punch In', 'Punch Out', 'Total', 'OT', 'Status'];
    const rows = records.map((r) => [
      r.employee_id,
      r.employee_name,
      r.department || 'Project',
      r.site_name || 'Unassigned',
      r.punch_in_display || 'Absent',
      r.punch_out_display || '--:--',
      r.total_hours_formatted || '0h 00m',
      r.ot_hours_formatted || '0h 00m',
      r.status || 'Absent',
    ]);
    exportToPDF({
      title: `Daily Attendance Report — ${date}`,
      subtitle: `Company: FIREX • Total Workforce: ${records.length} Employees • Total OT: ${metrics?.total_ot_hours_formatted || '0h 00m'}`,
      columns,
      rows,
      fileName: `FIREX-Daily-Attendance-${date}`,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Daily Attendance & Overtime</h1>
          <p className="text-xs text-slate-400">View, audit, GPS locations, regular shift hours, and Overtime (OT)</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setManualEmployeeId('');
              setShowManualModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition"
          >
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </button>

          <button
            onClick={fetchDailyData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Shift Schedule Banner for Selected Date */}
      {schedule && (
        <div
          className={`p-4 rounded-3xl border flex items-center justify-between text-xs ${
            schedule.is_public_holiday
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : schedule.is_friday
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : schedule.is_saturday
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            {schedule.is_public_holiday || schedule.is_friday ? (
              <CalendarDays className="w-5 h-5 flex-shrink-0" />
            ) : (
              <Clock className="w-5 h-5 flex-shrink-0" />
            )}
            <div>
              <span className="font-bold block">
                {schedule.day_name}, {date}: {schedule.shift_name}
              </span>
              <span className="text-[11px] opacity-80">
                {schedule.is_holiday
                  ? 'Official Holiday • All worked hours calculated as 100% Holiday Overtime'
                  : `Shift Window: ${schedule.shift_start} to ${schedule.shift_end} (${schedule.expected_hours}h) • Before/after is recorded as OT`}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-right">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-950/60 border border-current">
              {schedule.is_holiday ? 'Holiday Rules' : 'Standard Shift'}
            </span>
          </div>
        </div>
      )}

      {/* Metrics Summary Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Workforce</div>
            <div className="text-xl font-black text-white mt-1">{metrics.total_labour}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Present Today</div>
            <div className="text-xl font-black text-emerald-400 mt-1">{metrics.present}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <div className="text-[10px] uppercase font-bold text-amber-400">Late Arrivals</div>
            <div className="text-xl font-black text-amber-400 mt-1">{metrics.late}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <div className="text-[10px] uppercase font-bold text-rose-400">Absent</div>
            <div className="text-xl font-black text-rose-400 mt-1">{metrics.absent}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
            <div className="text-[10px] uppercase font-bold text-cyan-400">Active Working</div>
            <div className="text-xl font-black text-cyan-400 mt-1">{metrics.currently_working}</div>
          </div>
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3.5 shadow-lg bg-gradient-to-br from-amber-500/10 to-transparent">
            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>Total Overtime</span>
            </div>
            <div className="text-xl font-black text-amber-300 mt-1 font-mono">{metrics.total_ot_hours_formatted || '0h 00m'}</div>
          </div>
        </div>
      )}

      {/* Date & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
          <Filter className="w-3.5 h-3.5 text-rose-500" />
          <span>Filters & Date Selection</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
            >
              <option value="">All Departments</option>
              <option value="Project">Project</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Supervisor</label>
            <select
              value={supervisorFilter}
              onChange={(e) => setSupervisorFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="">All Supervisors</option>
              {supervisors.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Present - Late">Present - Late</option>
              <option value="Holiday">Holiday / Weekly Off</option>
              <option value="Absent">Absent</option>
              <option value="Leave">On Leave</option>
              <option value="Corrected">Corrected</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Search Employee</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Daily Workforce Records ({records.length} Employees)</h3>
          <span className="text-xs text-slate-400">Date: {date} (Bahrain Time)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="pb-3 px-3">Employee</th>
                <th className="pb-3 px-3">ID</th>
                <th className="pb-3 px-3">Daily Site</th>
                <th className="pb-3 px-3">Punch In</th>
                <th className="pb-3 px-3">Punch Out</th>
                <th className="pb-3 px-3">Regular</th>
                <th className="pb-3 px-3 text-amber-400">OT</th>
                <th className="pb-3 px-3">Total</th>
                <th className="pb-3 px-3">Verification</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="11" className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500 mb-2" />
                    Loading daily attendance...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-8 text-center text-slate-500">
                    No attendance records found for this date.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id || r.employee_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-white">
                      <div className="flex items-center space-x-1.5">
                        <span>{r.employee_name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                            r.department === 'Maintenance'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {r.department || 'Project'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">{r.designation}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-300">{r.employee_id}</td>
                    <td className="py-3 px-3 text-slate-300">{r.site_name || 'Assigned Daily'}</td>
                    <td className="py-3 px-3">
                      <div className="font-mono font-medium text-slate-200">
                        {r.punch_in_display || '—'}
                      </div>
                      {r.punch_in_latitude && r.punch_in_longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${r.punch_in_latitude},${r.punch_in_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Punch In GPS: ${r.punch_in_latitude}, ${r.punch_in_longitude}`}
                          className="inline-flex items-center space-x-1 text-[10px] text-rose-400 hover:text-rose-300 underline font-mono mt-0.5"
                        >
                          <MapPin className="w-3 h-3 text-rose-500 flex-shrink-0" />
                          <span>GPS Map ↗</span>
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono font-medium text-slate-200">
                        {r.punch_out_display || '—'}
                      </div>
                      {r.punch_out_latitude && r.punch_out_longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${r.punch_out_latitude},${r.punch_out_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Punch Out GPS: ${r.punch_out_latitude}, ${r.punch_out_longitude}`}
                          className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 hover:text-emerald-300 underline font-mono mt-0.5"
                        >
                          <MapPin className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          <span>GPS Map ↗</span>
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {r.regular_hours_formatted || '0h 00m'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      {r.ot_hours_formatted || '0h 00m'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {r.total_hours_formatted || '0h 00m'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5 text-[10px]">
                        {r.punch_in_selfie && (
                          <button
                            onClick={() =>
                              setPhotoPreview({
                                open: true,
                                url: r.punch_in_selfie,
                                title: `${r.employee_name} - Punch In Photo`,
                              })
                            }
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg flex items-center space-x-1"
                            title="View punch-in selfie"
                          >
                            <Camera className="w-3 h-3" />
                            <span>In</span>
                          </button>
                        )}
                        {r.sync_status === 'OFFLINE_SYNCED' && (
                          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                            Offline Synced
                          </span>
                        )}
                        {r.tamper_flag && (
                          <span
                            className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded flex items-center space-x-0.5"
                            title="Clock skew detected against server authoritative time"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Skew</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5">
                        <StatusBadge status={r.status} />
                        {r.is_manual && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                            Manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setManualEmployeeId(r.employee_id);
                          setShowManualModal(true);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {photoPreview.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs">{photoPreview.title}</h3>
              <button
                onClick={() => setPhotoPreview({ open: false, url: '', title: '' })}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={photoPreview.url} alt="Selfie" className="w-full aspect-square object-cover rounded-2xl" />
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualModal && (
        <ManualAttendanceModal
          isOpen={showManualModal}
          preselectedEmployeeId={manualEmployeeId}
          onClose={() => setShowManualModal(false)}
          onSuccess={fetchDailyData}
        />
      )}
    </div>
  );
}
