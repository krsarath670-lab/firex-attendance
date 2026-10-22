import React, { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  UserCheck,
  Building2,
  ArrowRight,
} from 'lucide-react';

export function LabourSchedule({ onBack }) {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMySchedule = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/schedule/my-schedule', {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setScheduleData(data);
      }
    } catch (err) {
      console.error('Error loading schedule:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMySchedule();
  }, []);

  const tomorrow = scheduleData?.tomorrow;
  const days = scheduleData?.days || [];

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>MY WORK SCHEDULE</span>
          </h2>
          <p className="text-xs text-slate-400">Daily site assignments & upcoming shifts</p>
        </div>

        <button
          onClick={() => fetchMySchedule(true)}
          disabled={refreshing || loading}
          className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition flex items-center space-x-1.5 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
          Loading your schedule...
        </div>
      ) : (
        <>
          {/* Main Card: Tomorrow's Schedule */}
          <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>TOMORROW'S ASSIGNED SITE</span>
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {tomorrow?.day_name}, {tomorrow?.formatted_date}
              </span>
            </div>

            {tomorrow?.is_scheduled ? (
              <div className="bg-slate-950/90 rounded-2xl p-4 border border-indigo-500/30 space-y-2.5">
                <div className="flex items-start space-x-2.5">
                  <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl mt-0.5">
                    <MapPin className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Report to Site:</span>
                    <h3 className="text-base font-black text-white leading-tight break-words">
                      {tomorrow.site_name}
                    </h3>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-xs flex items-center justify-between text-slate-400">
                  <div className="flex items-center space-x-1.5 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">
                      By: <strong className="text-white">{tomorrow.scheduled_by || 'Supervisor'}</strong>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex-shrink-0">
                    Confirmed
                  </span>
                </div>
              </div>
            ) : tomorrow?.leave ? (
              <div className="bg-purple-950/40 rounded-2xl p-4 border border-purple-500/30 text-xs text-purple-200 flex items-center space-x-3">
                <Calendar className="w-6 h-6 text-purple-400 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-purple-100">Approved Leave Tomorrow</h4>
                  <p className="text-[11px] text-purple-300/80">{tomorrow.leave.leave_type}</p>
                </div>
              </div>
            ) : tomorrow?.rules?.is_friday ? (
              <div className="bg-emerald-950/40 rounded-2xl p-4 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-black text-sm text-emerald-300">Tomorrow is Friday (Weekly Holiday)</h4>
                  <p className="text-[11px] text-emerald-400/80">Official Weekly Off • 100% OT if approved</p>
                </div>
                <span className="text-[10px] uppercase font-black px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  Holiday
                </span>
              </div>
            ) : tomorrow?.rules?.is_public_holiday ? (
              <div className="bg-amber-950/40 rounded-2xl p-4 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-black text-sm text-amber-300">Public Holiday Tomorrow</h4>
                  <p className="text-[11px] text-amber-400/80">{tomorrow.rules.holiday_name}</p>
                </div>
                <span className="text-[10px] uppercase font-black px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                  Holiday
                </span>
              </div>
            ) : (
              <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-400 font-bold">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Site Assignment Pending</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Your Supervisor or Engineer will schedule your site this evening. Tap "Refresh" above to get the latest update.
                </p>
              </div>
            )}

            {/* Tomorrow Shift Hours */}
            <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800">
              <span className="text-slate-400 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Working Hours:</span>
              </span>
              <span className="font-mono font-bold text-white">
                {tomorrow?.rules?.is_friday
                  ? 'Weekly Off'
                  : tomorrow?.rules?.is_saturday
                  ? '07:30 AM - 01:00 PM (Half Day)'
                  : '07:30 AM - 04:30 PM (9h)'}
              </span>
            </div>
          </div>

          {/* Upcoming 7-Days Schedule List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>7-Day Schedule Overview</span>
            </h3>

            <div className="space-y-2">
              {days.map((d) => (
                <div
                  key={d.date}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between text-xs ${
                    d.is_today
                      ? 'bg-rose-950/30 border-rose-500/40 text-white'
                      : d.is_tomorrow
                      ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white font-mono">
                        {d.day_name}, {d.formatted_date}
                      </span>
                      {d.is_today && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Today
                        </span>
                      )}
                      {d.is_tomorrow && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Tomorrow
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] flex items-center space-x-1 text-slate-400">
                      {d.is_scheduled ? (
                        <>
                          <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
                          <span className="text-white font-semibold truncate max-w-[200px]">{d.site_name}</span>
                        </>
                      ) : d.leave ? (
                        <span className="text-purple-300">🌴 On Leave ({d.leave.leave_type})</span>
                      ) : d.rules?.is_friday ? (
                        <span className="text-emerald-400">Official Friday Off</span>
                      ) : d.rules?.is_public_holiday ? (
                        <span className="text-amber-400">🎉 {d.rules.holiday_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">Schedule not yet assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-2">
                    <span className="font-mono text-[10px] text-slate-400 block">
                      {d.rules?.is_friday ? 'Holiday' : d.rules?.is_saturday ? '07:30 - 13:00' : '07:30 - 16:30'}
                    </span>
                    {d.is_scheduled && (
                      <span className="text-[10px] text-emerald-400 font-bold">Assigned</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
