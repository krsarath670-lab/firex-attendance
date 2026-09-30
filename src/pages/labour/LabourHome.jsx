import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCurrentCoordinates } from '../../utils/gps';
import { queuePunchAction, syncOfflineQueue, getOfflineQueue, subscribeToSyncStatus } from '../../utils/offlineQueue';
import { StatusBadge } from '../../components/StatusBadge';
import { LabourHistory } from './LabourHistory';
import { LabourCorrectionModal } from './LabourCorrectionModal';
import { LabourLeaveModal } from './LabourLeaveModal';
import { SelfieCaptureModal } from '../../components/SelfieCaptureModal';
import {
  Flame,
  Clock,
  MapPin,
  Calendar,
  History,
  FileEdit,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  WifiOff,
  Wifi,
  Sparkles,
  Camera,
  RefreshCw,
  LogOut,
  User,
} from 'lucide-react';

export function LabourHome() {
  const { user, employeeProfile, isOnline, logout } = useAuth();
  const [currentView, setCurrentView] = useState('punch'); // 'punch' or 'history'
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selfieModalState, setSelfieModalState] = useState({ open: false, action: 'Check-In' });

  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [gpsStatus, setGpsStatus] = useState({ state: 'idle', msg: '' });
  const [elapsedWorkingTime, setElapsedWorkingTime] = useState('');
  const [bahrainTime, setBahrainTime] = useState('');
  const [syncStatus, setSyncStatus] = useState({ state: 'SYNCED', remaining: 0 });
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '', time: '' });

  // Monitor offline queue & sync status
  useEffect(() => {
    const queue = getOfflineQueue();
    setSyncStatus({ state: queue.length ? 'PENDING' : 'SYNCED', remaining: queue.length });

    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Live clock in Bahrain time (UTC+3)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const bTime = new Date(utc + 3600000 * 3);
      setBahrainTime(
        bTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );

      // If currently working (punched in but not out), calculate live elapsed time
      if (todayData?.punchState === 'PUNCHED_IN' && todayData?.record?.punch_in) {
        const inTime = new Date(todayData.record.punch_in).getTime();
        const diff = Math.max(0, now.getTime() - inTime);
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setElapsedWorkingTime(
          `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [todayData]);

  const fetchTodayStatus = async () => {
    try {
      const res = await fetch('/api/attendance/today-status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTodayData(data);
      }
    } catch (err) {
      console.warn('Could not fetch today status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  // Handle Manual Sync Button
  const handleManualSync = async () => {
    const token = localStorage.getItem('firex_token');
    if (!token) return;
    setSyncStatus((prev) => ({ ...prev, state: 'SYNCING' }));
    const res = await syncOfflineQueue(token);
    await fetchTodayStatus();
    if (res.failed > 0) {
      alert(`Sync finished: ${res.synced} records uploaded, ${res.failed} remaining.`);
    } else {
      setFeedbackMsg({ type: 'success', text: `All ${res.synced} offline records synchronized with cloud!` });
    }
  };

  // Start Punch In with optional selfie
  const startPunchInFlow = () => {
    if (todayData?.settings?.photo_verification_enabled) {
      setSelfieModalState({ open: true, action: 'Check-In' });
    } else {
      executePunchIn(null);
    }
  };

  const executePunchIn = async (selfieBase64) => {
    setPunching(true);
    setGpsStatus({ state: 'checking', msg: 'Acquiring GPS location...' });
    setFeedbackMsg({ type: '', text: '' });

    const coords = await getCurrentCoordinates();
    if (coords.available) {
      setGpsStatus({ state: 'ok', msg: `GPS Accuracy: ±${coords.accuracy}m` });
    } else {
      setGpsStatus({ state: 'warn', msg: coords.error || 'GPS unavailable' });
    }

    const payload = {
      latitude: coords.available ? coords.latitude : null,
      longitude: coords.available ? coords.longitude : null,
      accuracy: coords.available ? coords.accuracy : null,
      selfie_image: selfieBase64,
      device_info: `${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} / ${navigator.platform}`,
    };

    if (!isOnline) {
      const queuedItem = queuePunchAction('PUNCH_IN', payload);
      setFeedbackMsg({
        type: 'offline',
        text: `CHECK-IN RECORDED OFFLINE (${queuedItem.id}). Will auto-sync when online.`,
        time: bahrainTime,
      });
      setPunching(false);
      return;
    }

    try {
      const res = await fetch('/api/attendance/punch-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Punch in failed.');
      }

      setFeedbackMsg({
        type: 'success',
        text: 'CHECK-IN SUCCESSFUL',
        time: data.punch_in_time,
      });
      await fetchTodayStatus();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error recording punch in.' });
    } finally {
      setPunching(false);
    }
  };

  // Start Punch Out with optional selfie
  const startPunchOutFlow = () => {
    if (todayData?.settings?.photo_verification_enabled) {
      setSelfieModalState({ open: true, action: 'Check-Out' });
    } else {
      executePunchOut(null);
    }
  };

  const executePunchOut = async (selfieBase64) => {
    const confirmOut = window.confirm('Are you sure you want to Check Out for today?');
    if (!confirmOut) return;

    setPunching(true);
    setGpsStatus({ state: 'checking', msg: 'Acquiring GPS location...' });
    setFeedbackMsg({ type: '', text: '' });

    const coords = await getCurrentCoordinates();
    const payload = {
      latitude: coords.available ? coords.latitude : null,
      longitude: coords.available ? coords.longitude : null,
      accuracy: coords.available ? coords.accuracy : null,
      selfie_image: selfieBase64,
      device_info: `${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} / ${navigator.platform}`,
    };

    if (!isOnline) {
      const queuedItem = queuePunchAction('PUNCH_OUT', payload);
      setFeedbackMsg({
        type: 'offline',
        text: `CHECK-OUT RECORDED OFFLINE (${queuedItem.id}). Will auto-sync when online.`,
        time: bahrainTime,
      });
      setPunching(false);
      return;
    }

    try {
      const res = await fetch('/api/attendance/punch-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Punch out failed.');
      }

      setFeedbackMsg({
        type: 'success',
        text: `CHECK-OUT SUCCESSFUL (${data.total_hours} worked)`,
        time: data.punch_out_time,
      });
      await fetchTodayStatus();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error recording punch out.' });
    } finally {
      setPunching(false);
    }
  };

  const isPunchedIn = todayData?.punchState === 'PUNCHED_IN';
  const isPunchedOut = todayData?.punchState === 'PUNCHED_OUT';
  const notPunchedIn = !todayData || todayData?.punchState === 'NOT_PUNCHED_IN';
  const hasApprovedLeave = !!todayData?.leave;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-600/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-black tracking-wider text-white flex items-center space-x-1">
              <span>FIREX</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-md font-mono">
                LABOUR
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Attendance System</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Online/Offline Badge */}
          <div
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              isOnline
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/20 border-amber-500/30 text-amber-400 animate-pulse'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/80 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Sync Status Banner if pending offline items */}
      {syncStatus.remaining > 0 && (
        <div className="bg-amber-950/70 border-b border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>
              {syncStatus.remaining} attendance record(s) queued offline.
            </span>
          </div>
          {isOnline && (
            <button
              onClick={handleManualSync}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold"
            >
              Sync Now
            </button>
          )}
        </div>
      )}

      {/* Navigation Switch Tabs */}
      <div className="max-w-md mx-auto w-full px-4 pt-3">
        <div className="grid grid-cols-3 p-1 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold text-slate-400">
          <button
            onClick={() => setCurrentView('punch')}
            className={`py-2 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              currentView === 'punch' ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow' : 'hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Punch</span>
          </button>
          <button
            onClick={() => setCurrentView('history')}
            className={`py-2 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              currentView === 'history' ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow' : 'hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="py-2 rounded-xl transition flex items-center justify-center space-x-1.5 hover:text-white"
          >
            <Calendar className="w-3.5 h-3.5 text-rose-400" />
            <span>Leaves</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-4">
        {currentView === 'history' ? (
          <LabourHistory onRequestCorrection={() => setShowCorrectionModal(true)} />
        ) : (
          <>
            {/* Employee Profile Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center text-rose-400 font-black text-base shadow">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'FX'}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">{user?.name}</h2>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                      <span className="text-rose-400 font-bold">{user?.employee_id || 'LAB-XXXX'}</span>
                      <span>•</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                          employeeProfile?.department === 'Maintenance'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {employeeProfile?.department || 'Project'}
                      </span>
                    </div>
                  </div>
                </div>

                <StatusBadge status={todayData?.record?.status || (hasApprovedLeave ? 'Leave' : 'Absent')} />
              </div>

              {/* Today's Scheduled Site Banner */}
              <div className="p-3 bg-gradient-to-r from-slate-950 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="text-[10px] uppercase tracking-wider font-bold text-rose-400 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-rose-500 flex-shrink-0" />
                  <span>Today's Scheduled Work Site:</span>
                </div>
                <div className="text-sm font-black text-white truncate">
                  {todayData?.scheduled_site_name || employeeProfile?.site_name || 'Assigned Daily Site'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
                <div className="flex items-center space-x-1.5 text-slate-300 truncate">
                  <span className="text-slate-500 font-mono text-[10px]">Supervisor:</span>
                  <span className="truncate">{employeeProfile?.supervisor_name || 'Assigned'}</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-400 justify-end">
                  <Calendar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>{todayData?.today || new Date().toISOString().substring(0, 10)}</span>
                </div>
              </div>
            </div>

            {/* Approved Leave Alert if any */}
            {hasApprovedLeave && (
              <div className="p-4 bg-purple-500/15 border border-purple-500/30 rounded-3xl text-purple-300 text-xs flex items-center space-x-3">
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <div>
                  <span className="font-bold block">On Approved Leave Today</span>
                  <span className="text-[11px] text-purple-300/80">
                    {todayData.leave.leave_type} ({todayData.leave.start_date} to {todayData.leave.end_date})
                  </span>
                </div>
              </div>
            )}

            {/* Live Clock & Shift Target */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl text-center space-y-2">
              <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold flex items-center justify-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Bahrain Standard Time (UTC+3)</span>
              </div>

              <div className="text-4xl font-black text-white tracking-tight font-mono py-1 drop-shadow-md">
                {bahrainTime || '--:--:-- --'}
              </div>

              <div className="text-[11px] text-slate-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:space-x-3">
                {todayData?.schedule?.is_public_holiday ? (
                  <span className="text-amber-400 font-bold">
                    Public Holiday: {todayData.schedule.holiday_name} (100% OT)
                  </span>
                ) : todayData?.schedule?.is_friday ? (
                  <span className="text-emerald-400 font-bold">
                    Friday: Official Weekly Off (100% OT)
                  </span>
                ) : todayData?.schedule?.is_saturday ? (
                  <span>
                    Shift: <strong className="text-white">07:30 AM - 01:00 PM</strong> (Half Day)
                  </span>
                ) : (
                  <span>
                    Shift: <strong className="text-white">07:30 AM - 04:30 PM</strong> (9h)
                  </span>
                )}
                <span className="hidden sm:inline">•</span>
                <span className="text-slate-400">
                  Grace: <strong className="text-emerald-400">{todayData?.settings?.grace_period_minutes || 15} min</strong>
                </span>
              </div>
            </div>

            {/* Success / Error Message Banner */}
            {feedbackMsg.text && (
              <div
                className={`p-4 rounded-3xl text-xs flex items-center space-x-3 shadow-lg ${
                  feedbackMsg.type === 'success'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                    : feedbackMsg.type === 'offline'
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <div>
                  <div className="font-bold">{feedbackMsg.text}</div>
                  {feedbackMsg.time && <div className="text-[11px] opacity-80">Recorded Time: {feedbackMsg.time}</div>}
                </div>
              </div>
            )}

            {/* Live Working Elapsed Timer Card (If Punched In) */}
            {isPunchedIn && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-3xl p-4 text-center space-y-1 animate-pulse">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Currently On Duty • Working Time
                </span>
                <div className="text-2xl font-black text-white font-mono">{elapsedWorkingTime || '00:00:00'}</div>
                <div className="text-[10px] text-emerald-300/80">
                  Punched in at <strong className="text-white">{todayData?.record?.punch_in_display}</strong>
                </div>
              </div>
            )}

            {/* Check-Out Completed Summary (If Punched Out) */}
            {isPunchedOut && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center space-y-3">
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Shift Completed Today</h3>
                <div className="grid grid-cols-2 gap-2 text-xs py-2 bg-slate-950 rounded-2xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Punch In</span>
                    <span className="font-bold text-white">{todayData?.record?.punch_in_display}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Punch Out</span>
                    <span className="font-bold text-white">{todayData?.record?.punch_out_display}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-slate-950/60 rounded-2xl border border-slate-800/50">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Regular</span>
                    <span className="font-bold text-slate-200">{todayData?.record?.regular_hours_formatted || '0h 00m'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-400 block uppercase font-bold">Overtime (OT)</span>
                    <span className="font-bold text-amber-400">{todayData?.record?.ot_hours_formatted || '0h 00m'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 block uppercase font-bold">Total Hours</span>
                    <span className="font-bold text-emerald-400">{todayData?.record?.total_hours_formatted || '0h 00m'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Primary Action Button (CHECK IN / CHECK OUT) */}
            <div className="pt-2">
              {notPunchedIn && (
                <button
                  onClick={startPunchInFlow}
                  disabled={punching}
                  className="w-full py-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 active:scale-[0.98] text-white rounded-3xl text-lg font-black tracking-wider uppercase shadow-xl shadow-emerald-600/30 flex flex-col items-center justify-center space-y-1 transition disabled:opacity-50"
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-6 h-6" />
                    <span>{punching ? 'Recording Check-In...' : 'CHECK IN'}</span>
                  </div>
                  <span className="text-[11px] font-normal tracking-normal text-emerald-100 opacity-90">
                    Tap to start your daily work shift
                  </span>
                </button>
              )}

              {isPunchedIn && (
                <button
                  onClick={startPunchOutFlow}
                  disabled={punching}
                  className="w-full py-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] text-white rounded-3xl text-lg font-black tracking-wider uppercase shadow-xl shadow-rose-600/30 flex flex-col items-center justify-center space-y-1 transition disabled:opacity-50"
                >
                  <div className="flex items-center space-x-2">
                    <LogOut className="w-6 h-6" />
                    <span>{punching ? 'Recording Check-Out...' : 'CHECK OUT'}</span>
                  </div>
                  <span className="text-[11px] font-normal tracking-normal text-rose-100 opacity-90">
                    Tap to end shift and record total hours
                  </span>
                </button>
              )}

              {isPunchedOut && (
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-3xl text-center text-xs text-slate-400">
                  You have already punched in and out for today. See you tomorrow!
                </div>
              )}
            </div>

            {/* GPS Diagnostic Note */}
            {gpsStatus.msg && (
              <div className="text-[10px] text-center text-slate-500 flex items-center justify-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{gpsStatus.msg}</span>
              </div>
            )}

            {/* Quick Actions Footer */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
              >
                <FileEdit className="w-3.5 h-3.5 text-amber-400" />
                <span>Request Correction</span>
              </button>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
              >
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Apply Leave</span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* Selfie Modal */}
      <SelfieCaptureModal
        isOpen={selfieModalState.open}
        actionLabel={selfieModalState.action}
        onClose={() => setSelfieModalState({ open: false, action: 'Check-In' })}
        onCapture={(photo) => {
          if (selfieModalState.action === 'Check-In') {
            executePunchIn(photo);
          } else {
            executePunchOut(photo);
          }
        }}
      />

      {/* Correction Modal */}
      {showCorrectionModal && (
        <LabourCorrectionModal
          isOpen={showCorrectionModal}
          onClose={() => setShowCorrectionModal(false)}
          onSuccess={() => {
            setShowCorrectionModal(false);
            fetchTodayStatus();
          }}
        />
      )}

      {/* Leave Modal */}
      {showLeaveModal && (
        <LabourLeaveModal
          isOpen={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
        />
      )}
    </div>
  );
}
