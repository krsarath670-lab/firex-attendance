import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Save,
  CheckCircle2,
  Clock,
  MapPin,
  Globe,
  AlertCircle,
  Sparkles,
  CalendarDays,
  Zap,
} from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    company_name: 'FIREX',
    country: 'Bahrain',
    timezone: 'Asia/Bahrain',
    work_start_time: '07:30',
    work_end_time: '16:30',
    saturday_start_time: '07:30',
    saturday_end_time: '13:00',
    friday_holiday: true,
    overtime_enabled: true,
    grace_period_minutes: 15,
    gps_enabled: true,
    gps_enforcement_enabled: false,
    default_radius: 100,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');

      setMsg({ type: 'success', text: 'Company attendance & shift rules updated successfully!' });
      setSettings(data.settings);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Company Shift Rules & Settings</h1>
          <p className="text-xs text-slate-400">
            Configure shift timings, weekly off (Friday), Saturday half-day, and automatic Overtime (OT) rules
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
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Company Profile */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Globe className="w-4 h-4 text-rose-500" />
            <span>Company Information & Timezone</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Company Name</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Country</label>
              <input
                type="text"
                value={settings.country}
                onChange={(e) => setSettings({ ...settings, country: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Operating Timezone</label>
              <input
                type="text"
                disabled
                value={settings.timezone}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-rose-400 font-mono font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Locked to Asia/Bahrain (UTC+3)</p>
            </div>
          </div>
        </div>

        {/* Section 2: Shift Timings & Bahrain Workweek Rules */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Shift Timings & Bahrain Workweek Schedule</span>
          </h3>

          {/* Sunday to Thursday regular timings */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span className="text-amber-400">Regular Workdays (Sunday to Thursday)</span>
              <span className="text-[10px] text-slate-400">Full Shift (9 hours)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Work Start Time</label>
                <input
                  type="time"
                  value={settings.work_start_time || '07:30'}
                  onChange={(e) => setSettings({ ...settings, work_start_time: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Default: 07:30 AM</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Work End Time</label>
                <input
                  type="time"
                  value={settings.work_end_time || '16:30'}
                  onChange={(e) => setSettings({ ...settings, work_end_time: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Default: 04:30 PM (16:30)</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Late Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.grace_period_minutes}
                  onChange={(e) => setSettings({ ...settings, grace_period_minutes: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">07:30–07:45 On Time; 07:46+ Late</p>
              </div>
            </div>
          </div>

          {/* Saturday Half Day Timings */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span className="text-sky-400">Saturday Shift (Half-Day)</span>
              <span className="text-[10px] text-slate-400">5.5 Hours Shift</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Saturday Start Time</label>
                <input
                  type="time"
                  value={settings.saturday_start_time || '07:30'}
                  onChange={(e) => setSettings({ ...settings, saturday_start_time: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Default: 07:30 AM</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Saturday End Time</label>
                <input
                  type="time"
                  value={settings.saturday_end_time || '13:00'}
                  onChange={(e) => setSettings({ ...settings, saturday_end_time: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Default: 01:00 PM (13:00)</p>
              </div>
            </div>
          </div>

          {/* Friday Weekly Off and Overtime Policy */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
              <div>
                <span className="font-semibold text-white block text-xs flex items-center space-x-1.5">
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                  <span>Friday Official Weekly Holiday</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Employees who do not punch on Friday are marked as "Friday (Weekly Off)" instead of Absent.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.friday_holiday !== false}
                onChange={(e) => setSettings({ ...settings, friday_holiday: e.target.checked })}
                className="w-5 h-5 text-rose-600 rounded bg-slate-900 border-slate-700"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
              <div>
                <span className="font-semibold text-white block text-xs flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Automatic Overtime (OT) Engine</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Work done before 07:30 AM or after official shift end (16:30 Sun–Thu / 13:00 Sat), and 100% of Friday/Public Holiday work, is calculated as Overtime.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.overtime_enabled !== false}
                onChange={(e) => setSettings({ ...settings, overtime_enabled: e.target.checked })}
                className="w-5 h-5 text-rose-600 rounded bg-slate-900 border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Section 3: GPS Geofencing */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>GPS Location & Geofence Rules</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <div>
                <span className="font-semibold text-white block">GPS Attendance Tracking</span>
                <span className="text-[10px] text-slate-400">
                  Captures latitude and longitude coordinates when employee punches in/out
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.gps_enabled}
                onChange={(e) => setSettings({ ...settings, gps_enabled: e.target.checked })}
                className="w-5 h-5 text-rose-600 rounded bg-slate-900 border-slate-700"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <div>
                <span className="font-semibold text-white block">GPS Geofence Enforcement</span>
                <span className="text-[10px] text-slate-400">
                  Strictly reject punches if the labour worker is outside their assigned site radius
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.gps_enforcement_enabled}
                onChange={(e) => setSettings({ ...settings, gps_enforcement_enabled: e.target.checked })}
                className="w-5 h-5 text-rose-600 rounded bg-slate-900 border-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Default Site Allowed Radius (Meters)
              </label>
              <input
                type="number"
                value={settings.default_radius}
                onChange={(e) => setSettings({ ...settings, default_radius: parseInt(e.target.value, 10) })}
                className="w-full max-w-xs bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Settings...' : 'Save Company Shift Rules'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
