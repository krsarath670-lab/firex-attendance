import React, { useState, useEffect } from 'react';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { Calendar, Filter, Download, FileSpreadsheet, RefreshCw, Users, Clock } from 'lucide-react';

export function MonthlyAttendancePage() {
  const today = new Date().toISOString().substring(0, 10);
  const [year, setYear] = useState(today.substring(0, 4));
  const [month, setMonth] = useState(today.substring(5, 7));

  const [summary, setSummary] = useState([]);
  const [sites, setSites] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  const [siteFilter, setSiteFilter] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      let url = `/api/attendance/monthly?year=${year}&month=${month}`;
      if (siteFilter) url += `&site_id=${siteFilter}`;
      if (supervisorFilter) url += `&supervisor_id=${supervisorFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || []);
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
  }, [year, month, siteFilter, supervisorFilter]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthLabel = `${monthNames[parseInt(month, 10) - 1]} ${year}`;

  const handleExportExcel = () => {
    const exportRows = summary.map((s) => ({
      'Employee ID': s.employee_id,
      'Full Name': s.full_name,
      Department: s.department,
      Site: s.site_name,
      Supervisor: s.supervisor_name,
      'Days Present': s.present_days,
      'Days Late': s.late_days,
      'Days Absent (Est)': s.absent_estimated,
      'Total Hours': s.total_hours_formatted,
      'Avg Daily Hours': s.avg_hours_formatted,
      'Corrections Count': s.correction_count,
    }));
    exportToExcel(exportRows, `FIREX-Monthly-Attendance-${year}-${month}`);
  };

  const handleExportPDF = () => {
    const columns = ['Employee ID', 'Name', 'Site', 'Present', 'Late', 'Absent', 'Total Hours', 'Avg Hours'];
    const rows = summary.map((s) => [
      s.employee_id,
      s.full_name,
      s.site_name || 'Unassigned',
      s.present_days,
      s.late_days,
      s.absent_estimated,
      s.total_hours_formatted,
      s.avg_hours_formatted,
    ]);
    exportToPDF({
      title: `Monthly Attendance Summary — ${monthLabel}`,
      subtitle: `Company: FIREX • Total Active Workers: ${summary.length}`,
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
          <h1 className="text-2xl font-black text-white">Monthly Attendance</h1>
          <p className="text-xs text-slate-400">Aggregated labour attendance and working hour reports</p>
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

      {/* Filter Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-md">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
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
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2027">2027</option>
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
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 px-3">Employee</th>
                <th className="pb-3 px-3">ID</th>
                <th className="pb-3 px-3">Site</th>
                <th className="pb-3 px-3">Supervisor</th>
                <th className="pb-3 px-3 text-center">Present</th>
                <th className="pb-3 px-3 text-center">Late</th>
                <th className="pb-3 px-3 text-center">Absent (Est)</th>
                <th className="pb-3 px-3">Total Hours</th>
                <th className="pb-3 px-3">Avg Daily</th>
                <th className="pb-3 px-3 text-center">Corrections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500 mb-2" />
                    Calculating monthly metrics...
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-500">
                    No records found for this period.
                  </td>
                </tr>
              ) : (
                summary.map((s) => (
                  <tr key={s.employee_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-white">
                      <div>{s.full_name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{s.department}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-300">{s.employee_id}</td>
                    <td className="py-3 px-3 text-slate-300">{s.site_name || 'Unassigned'}</td>
                    <td className="py-3 px-3 text-slate-400">{s.supervisor_name || 'Unassigned'}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">{s.present_days}</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-400">{s.late_days}</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-400">{s.absent_estimated}</td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-400">{s.total_hours_formatted}</td>
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
