import React, { useState, useEffect } from 'react';
import { exportToExcel, exportToCSV, exportToPDF } from '../../utils/exportUtils';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  Building,
  FileText,
  Filter,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

export function ReportsPage() {
  const today = new Date().toISOString().substring(0, 10);
  const [reportType, setReportType] = useState('daily'); // 'daily', 'monthly', 'employee'

  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.substring(5, 7));
  const [year, setYear] = useState(today.substring(0, 4));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');

  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [empRes, sitesRes, supRes] = await Promise.all([
          fetch('/api/employees', { headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` } }),
          fetch('/api/sites', { headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` } }),
          fetch('/api/employees/supervisors-list', {
            headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
          }),
        ]);
        if (empRes.ok) {
          const emps = await empRes.json();
          setEmployees(emps);
          if (emps.length > 0) setSelectedEmployeeId(emps[0].employee_id);
        }
        if (sitesRes.ok) setSites(await sitesRes.json());
        if (supRes.ok) setSupervisors(await supRes.json());
      } catch (err) {
        console.error(err);
      }
    }
    loadMeta();
  }, []);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (reportType === 'daily') {
        endpoint = `/api/reports/daily?date=${date}`;
        if (siteFilter) endpoint += `&site_id=${siteFilter}`;
        if (supervisorFilter) endpoint += `&supervisor_id=${supervisorFilter}`;
      } else if (reportType === 'monthly') {
        endpoint = `/api/reports/monthly?month=${month}&year=${year}`;
        if (siteFilter) endpoint += `&site_id=${siteFilter}`;
        if (supervisorFilter) endpoint += `&supervisor_id=${supervisorFilter}`;
      } else if (reportType === 'employee') {
        endpoint = `/api/reports/employee?employee_id=${selectedEmployeeId}`;
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        setReportData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateReport();
  }, [reportType, date, month, year, selectedEmployeeId, siteFilter, supervisorFilter]);

  // Export handlers
  const handleExportExcel = () => {
    if (!reportData) return;
    if (reportType === 'daily' || reportType === 'monthly') {
      exportToExcel(reportData.rows, `FIREX-${reportType.toUpperCase()}-REPORT`);
    } else if (reportType === 'employee') {
      const rows = reportData.records.map((r) => ({
        Date: r.attendance_date,
        'Punch In': r.punch_in_display,
        'Punch Out': r.punch_out_display,
        Hours: r.total_hours_formatted,
        Status: r.status,
      }));
      exportToExcel(rows, `FIREX-Employee-${reportData.employee?.employee_id}-Report`);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    if (reportType === 'daily' || reportType === 'monthly') {
      exportToCSV(reportData.rows, `FIREX-${reportType.toUpperCase()}-REPORT`);
    } else if (reportType === 'employee') {
      const rows = reportData.records.map((r) => ({
        Date: r.attendance_date,
        'Punch In': r.punch_in_display,
        'Punch Out': r.punch_out_display,
        Hours: r.total_hours_formatted,
        Status: r.status,
      }));
      exportToCSV(rows, `FIREX-Employee-${reportData.employee?.employee_id}-Report`);
    }
  };

  const handleExportPDF = () => {
    if (!reportData) return;

    if (reportType === 'daily') {
      const columns = ['Employee ID', 'Name', 'Site', 'Punch In', 'Punch Out', 'Hours', 'Status'];
      const rows = reportData.rows.map((r) => [
        r.employee_id,
        r.employee_name,
        r.site_name,
        r.punch_in,
        r.punch_out,
        r.working_hours,
        r.status,
      ]);
      exportToPDF({
        title: `Daily Attendance Report — ${date}`,
        subtitle: `Company: FIREX • Total Workforce: ${reportData.total_records}`,
        columns,
        rows,
        fileName: `FIREX-Daily-Report-${date}`,
      });
    } else if (reportType === 'monthly') {
      const columns = ['Employee ID', 'Name', 'Site', 'Present', 'Late', 'Absent', 'Total Hours', 'Avg Hours'];
      const rows = reportData.rows.map((r) => [
        r.employee_id,
        r.employee_name,
        r.site_name,
        r.days_present,
        r.days_late,
        r.days_absent,
        r.total_hours,
        r.avg_daily_hours,
      ]);
      exportToPDF({
        title: `Monthly Attendance Report — ${month}/${year}`,
        subtitle: `Company: FIREX • Total Records: ${reportData.total_records}`,
        columns,
        rows,
        fileName: `FIREX-Monthly-Report-${month}-${year}`,
      });
    } else if (reportType === 'employee') {
      const emp = reportData.employee;
      const columns = ['Date', 'Punch In', 'Punch Out', 'Working Hours', 'Status'];
      const rows = reportData.records.map((r) => [
        r.attendance_date,
        r.punch_in_display || 'Absent',
        r.punch_out_display || '--:--',
        r.total_hours_formatted || '0h 00m',
        r.status,
      ]);
      exportToPDF({
        title: `Individual Attendance Report — ${emp.full_name} (${emp.employee_id})`,
        subtitle: `Site: ${emp.site_name} • Department: ${emp.department} • Total Hours: ${reportData.summary?.total_hours}`,
        columns,
        rows,
        fileName: `FIREX-Report-${emp.employee_id}`,
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Attendance Reports & Exports</h1>
          <p className="text-xs text-slate-400">
            Generate and export official company attendance reports in Excel, CSV, or PDF
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-900/40 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-900/40 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <FileText className="w-4 h-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-900/40 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Report Configuration Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        {/* Type Selector Tabs */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-2xl border border-slate-800/80 max-w-md">
          <button
            onClick={() => setReportType('daily')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              reportType === 'daily' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              reportType === 'monthly' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly Summary
          </button>
          <button
            onClick={() => setReportType('employee')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              reportType === 'employee' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Employee Report
          </button>
        </div>

        {/* Dynamic Filters depending on report type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {reportType === 'daily' && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Select Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          {reportType === 'monthly' && (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="09">September</option>
                  <option value="08">August</option>
                  <option value="07">July</option>
                  <option value="06">June</option>
                  <option value="05">May</option>
                  <option value="04">April</option>
                  <option value="03">March</option>
                  <option value="02">February</option>
                  <option value="01">January</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
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
                </select>
              </div>
            </>
          )}

          {reportType === 'employee' && (
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Select Labour Employee</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.full_name} ({emp.employee_id}) — {emp.site_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType !== 'employee' && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Site Filter</label>
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
          )}
        </div>
      </div>

      {/* Report Preview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Report Preview</h3>
            <p className="text-[11px] text-slate-400">
              Company: FIREX • {reportType.toUpperCase()} ATTENDANCE REPORT
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {reportData?.total_records || reportData?.records?.length || 0} Records
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mx-auto mb-2" />
            <p className="text-xs">Generating report data...</p>
          </div>
        ) : !reportData ? (
          <p className="text-center py-8 text-xs text-slate-500">No report generated.</p>
        ) : (
          <div className="overflow-x-auto">
            {reportType === 'employee' ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="pb-2 px-2">Date</th>
                    <th className="pb-2 px-2">Punch In</th>
                    <th className="pb-2 px-2">Punch Out</th>
                    <th className="pb-2 px-2">Hours</th>
                    <th className="pb-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reportData.records?.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-2 font-mono text-white">{r.attendance_date}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-300">{r.punch_in_display || 'Absent'}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-300">{r.punch_out_display || '--:--'}</td>
                      <td className="py-2.5 px-2 font-mono text-emerald-400 font-bold">{r.total_hours_formatted}</td>
                      <td className="py-2.5 px-2 font-semibold text-rose-400">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="pb-2 px-2">Employee ID</th>
                    <th className="pb-2 px-2">Name</th>
                    <th className="pb-2 px-2">Site</th>
                    {reportType === 'daily' ? (
                      <>
                        <th className="pb-2 px-2">Punch In</th>
                        <th className="pb-2 px-2">Punch Out</th>
                        <th className="pb-2 px-2">Hours</th>
                        <th className="pb-2 px-2">Status</th>
                      </>
                    ) : (
                      <>
                        <th className="pb-2 px-2 text-center">Present</th>
                        <th className="pb-2 px-2 text-center">Late</th>
                        <th className="pb-2 px-2">Total Hours</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reportData.rows?.map((r, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-300">{r.employee_id}</td>
                      <td className="py-2.5 px-2 font-semibold text-white">{r.employee_name}</td>
                      <td className="py-2.5 px-2 text-slate-300">{r.site_name}</td>
                      {reportType === 'daily' ? (
                        <>
                          <td className="py-2.5 px-2 font-mono text-slate-200">{r.punch_in}</td>
                          <td className="py-2.5 px-2 font-mono text-slate-200">{r.punch_out}</td>
                          <td className="py-2.5 px-2 font-mono text-emerald-400 font-bold">{r.working_hours}</td>
                          <td className="py-2.5 px-2 font-semibold text-rose-400">{r.status}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-2 text-center font-bold text-emerald-400">{r.days_present}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-amber-400">{r.days_late}</td>
                          <td className="py-2.5 px-2 font-mono text-rose-400 font-bold">{r.total_hours}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
