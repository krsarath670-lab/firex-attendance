import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  HardDrive,
  Clock,
  FileJson,
  RotateCcw,
} from 'lucide-react';

export function BackupManagementPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const fetchBackupLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backup/logs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupLogs();
  }, []);

  const handleCreateBackup = async () => {
    setBackingUp(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create backup.');
      setMsg({ type: 'success', text: `Backup created successfully: ${data.backup.filename}` });
      fetchBackupLogs();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBackingUp(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/backup/download', {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (!res.ok) throw new Error('Download failed.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FIREX_Attendance_Backup_${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading backup: ' + err.message);
    }
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const backupData = JSON.parse(evt.target.result);
        const confirmRestore = window.confirm(
          `WARNING: Restoring will overwrite existing records. A safety snapshot will be taken automatically. Are you sure you want to restore from "${file.name}"?`
        );
        if (!confirmRestore) return;

        setRestoring(true);
        const res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
          },
          body: JSON.stringify({ backupData }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Restore failed.');

        setMsg({ type: 'success', text: 'Database successfully restored from backup file.' });
        fetchBackupLogs();
      } catch (err) {
        setMsg({ type: 'error', text: 'Restore error: ' + err.message });
      } finally {
        setRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Database Backup & Recovery</h1>
          <p className="text-xs text-slate-400">
            24/7 cloud database snapshots, manual exports, and disaster recovery restore
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download JSON Snapshot</span>
          </button>

          <button
            onClick={handleCreateBackup}
            disabled={backingUp}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            <span>{backingUp ? 'Creating Snapshot...' : 'Create Instant Backup'}</span>
          </button>
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
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Cloud Architecture Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>24/7 Automated Cloud Redundancy</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          The FIREX Attendance server automatically generates daily snapshots and keeps rolling 30-day retention.
          You can download complete system state anytime or restore from any verified snapshot.
        </p>
      </div>

      {/* Restore Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <RotateCcw className="w-4 h-4 text-amber-500" />
          <span>Disaster Recovery / Restore from File</span>
        </h3>
        <p className="text-xs text-slate-400">
          Upload a valid JSON backup file to restore complete employee rosters, attendance histories, leaves, and site configuration.
        </p>

        <label className="inline-flex items-center space-x-2 px-5 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white rounded-2xl text-xs font-bold cursor-pointer transition">
          <Upload className="w-4 h-4 text-rose-500" />
          <span>{restoring ? 'Restoring Database...' : 'Select Backup File (.json)'}</span>
          <input type="file" accept=".json" onChange={handleRestoreFile} disabled={restoring} className="hidden" />
        </label>
      </div>

      {/* Backup Logs History */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <FileJson className="w-4 h-4 text-rose-500" />
            <span>Recent Backup Snapshots ({logs.length})</span>
          </h3>
          <button
            onClick={fetchBackupLogs}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 px-3">Snapshot Filename</th>
                <th className="pb-3 px-3">Created Date / Time</th>
                <th className="pb-3 px-3">Total Records</th>
                <th className="pb-3 px-3">Size</th>
                <th className="pb-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500 mb-2" />
                    Loading backup history...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    No backup logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition font-mono text-[11px]">
                    <td className="py-3 px-3 font-semibold text-white font-sans">{b.filename}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-rose-400 font-bold">{b.records_count} records</td>
                    <td className="py-3 px-3 text-slate-400">{Math.round((b.size_bytes || 0) / 1024)} KB</td>
                    <td className="py-3 px-3 text-right font-sans">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                        {b.status}
                      </span>
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
