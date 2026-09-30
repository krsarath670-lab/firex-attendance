import React, { useState, useEffect } from 'react';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import {
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Users,
  Clock,
  Zap,
  CheckCircle2,
} from 'lucide-react';

export function MonthlyAttendancePage() {
  const today = new Date().toISOString().substring(0, 10);
  const [year, setYear] = useState(today.substring(0, 4));
  const [month, setMonth] = useState(today.substring(5, 7));

  const [summary, setSummary] = useState([]);
  const [meta, setMeta] = useState(null);
  const [sites, setSites] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  const [departmentFilter, setDepartmentFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      let url = `/api/attendance/monthly?year=${year}&month=${month}`;
      if (departmentFilter) url += `&department=${departmentFilter}`;
      if (siteFilter) url += `&site_id=${siteFilter}`;
      if (supervisorFilter) url += `&supervisor_id=${supervisorFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.data || []);
        setMeta(data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching monthly attendance:', err);
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
    fetchMonthlyData();
  }, [year, month, departmentFilter, siteFilter, supervisorFilter]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthLabel = `${monthNames[parseInt(month, 10) - 1]} ${year}`;

  const handleExportExcel = () => {
    const exportRows = summary.map((s) => ({
      'Employee ID': s.employee_id,
      'Full Name': s.employee_name,
      Department: s.department || 'Project',
      Site: s.site_name,
      Supervisor: s.supervisor_name,
      'Present Days': s.present_days,
      'Late Days': s.late_days,
      'Leave Days': s.leave_days || 0,
      'Absent Days (Est)': s.absent_days,
      'Regular Hours': s.regular_hours_formatted || '0h 00m',
      'Overtime (OT)': s.ot_hours_formatted || '0h 00m',
      'Total Working Hours': s.total_hours_formatted || '0h 00m',
      'Avg Daily Hours': s.avg_hours_formatted,
      'Corrections Count': s.correction_count,
    }));
    exportToExcel(exportRows, `FIREX-Monthly-Attendance-${year}-${month}`);
  };

  const handleExportPDF = () => {
    const columns = ['Employee ID', 'Name', 'Dept', 'Present', 'Late', 'Absent', 'Regular', 'OT', 'Total'];
    const rows = summary.map((s) => [
      s.employee_id,
      s.employee_name,
      s.department || 'Project',
      s.present_days,
      s.late_days,
      s.absent_days,
      s.regular_hours_formatted || '0h 00m',
      s.ot_hours_formatted || '0h 00m',
      s.total_hours_formatted || '0h 00m',
    ]);
    exportToPDF({
      title: `Monthly Attendance & Overtime Summary — ${monthLabel}`,
      subtitle: `Company: FIREX • Total Workforce: ${summary.length} • Grand Total OT: ${meta?.grand_ot_hours || '0h 00m'}`,
      columns,
      rows,
      fileName: `FIREX-Monthly-Attendance-${year}-${month}`,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Monthly Attendance & Overtime Matrix</h1>
          <p className="text-xs text-slate-400">Aggregated labour attendance, regular hours, and Overtime (OT) reports</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-900/40 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-900/40 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {meta && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Active Workforce</div>
            <div className="text-2xl font-black text-white mt-1">{meta.total_employees} Workers</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Total Month Records</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{meta.total_records}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="text-[10px] uppercase font-bold text-sky-400">Grand Total Hours</div>
            <div className="text-2xl font-black text-sky-400 mt-1 font-mono">{meta.grand_total_hours || '0h 00m'}</div>
          </div>
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-lg bg-gradient-to-br from-amber-500/10 to-transparent">
            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center space-x-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Grand Total Overtime (OT)</span>
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1 font-mono">{meta.grand_ot_hours || '0h 00m'}</div>
          </div>
        </div>
      )}

      {/* Filter Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-md">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
            >
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={String(idx + 1).padStart(2, '0')}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
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
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Work Site</label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.site_name}
                </option>
              ))}
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
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Workforce Summary — {monthLabel}</h3>
          <span className="text-xs text-slate-400">{summary.length} Workers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="pb-3 px-3">Employee</th>
                <th className="pb-3 px-3">ID</th>
                <th className="pb-3 px-3">Daily Site</th>
                <th className="pb-3 px-3 text-center">Present</th>
                <th className="pb-3 px-3 text-center">Late</th>
                <th className="pb-3 px-3 text-center">Leave</th>
                <th className="pb-3 px-3 text-center">Absent (Est)</th>
                <th className="pb-3 px-3">Regular</th>
                <th className="pb-3 px-3 text-amber-400">OT</th>
                <th className="pb-3 px-3">Total Hours</th>
                <th className="pb-3 px-3">Avg Daily</th>
                <th className="pb-3 px-3 text-center">Corrections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="12" className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500 mb-2" />
                    Calculating monthly metrics...
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan="12" className="py-8 text-center text-slate-500">
                    No records found for this period.
                  </td>
                </tr>
              ) : (
                summary.map((s) => (
                  <tr key={s.employee_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-white">
                      <div className="flex items-center space-x-1.5">
                        <span>{s.employee_name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                            s.department === 'Maintenance'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {s.department || 'Project'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">{s.designation}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-300">{s.employee_id}</td>
                    <td className="py-3 px-3 text-slate-300">{s.site_name || 'Assigned Daily'}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">{s.present_days}</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-400">{s.late_days}</td>
                    <td className="py-3 px-3 text-center font-bold text-sky-400">{s.leave_days || 0}</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-400">{s.absent_days}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{s.regular_hours_formatted || '0h 00m'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">{s.ot_hours_formatted || '0h 00m'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">{s.total_hours_formatted}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{s.avg_hours_formatted}</td>
                    <td className="py-3 px-3 text-center text-slate-400">{s.correction_count}</td>
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
