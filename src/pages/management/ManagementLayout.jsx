import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DashboardHome } from './DashboardHome';
import { DailyAttendancePage } from './DailyAttendancePage';
import { MonthlyAttendancePage } from './MonthlyAttendancePage';
import { SiteSchedulePage } from './SiteSchedulePage';
import { EmployeeManagementPage } from './EmployeeManagementPage';
import { LeaveManagementPage } from './LeaveManagementPage';
import { CorrectionReviewPage } from './CorrectionReviewPage';
import { SiteManagementPage } from './SiteManagementPage';
import { ReportsPage } from './ReportsPage';
import { BackupManagementPage } from './BackupManagementPage';
import { SettingsPage } from './SettingsPage';
import { AuditLogPage } from './AuditLogPage';
import { UserManagementPage } from './UserManagementPage';
import {
  LayoutDashboard,
  Clock,
  FileSpreadsheet,
  Users,
  Calendar,
  FileEdit,
  Building,
  FileText,
  Database,
  Settings,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  Menu,
  X,
  MapPin,
} from 'lucide-react';

export function ManagementLayout() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openAddEmployee, setOpenAddEmployee] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schedule', label: 'Daily Site Scheduling', icon: MapPin },
    { id: 'daily', label: 'Daily Attendance', icon: Clock },
    { id: 'monthly', label: 'Monthly Attendance', icon: FileSpreadsheet },
    { id: 'employees', label: 'Labour Employees', icon: Users },
    { id: 'leaves', label: 'Leave Requests', icon: Calendar },
    { id: 'staff', label: 'Engineers & Supervisors', icon: UserCheck },
    { id: 'corrections', label: 'Correction Requests', icon: FileEdit },
    { id: 'sites', label: 'Work Sites', icon: Building },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
    { id: 'backup', label: 'Backups & Cloud', icon: Database },
    { id: 'settings', label: 'Attendance Rules', icon: Settings },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
  ];

  const handleNavigate = (tabId, params = {}) => {
    setActiveTab(tabId);
    if (params.openAdd) {
      setOpenAddEmployee(true);
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-4 space-y-2 flex-shrink-0">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Workforce Management
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-rose-200" />}
              </button>
            );
          })}
        </nav>

        {/* User Info footer */}
        <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 px-3">
          <p className="font-semibold text-white truncate">{user?.name}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user?.role} • Bahrain</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 py-2 px-3 flex justify-around items-center">
        <button
          onClick={() => handleNavigate('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold ${
            activeTab === 'dashboard' ? 'text-rose-500' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => handleNavigate('daily')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold ${
            activeTab === 'daily' ? 'text-rose-500' : 'text-slate-400'
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span>Daily</span>
        </button>

        <button
          onClick={() => handleNavigate('employees')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold ${
            activeTab === 'employees' ? 'text-rose-500' : 'text-slate-400'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Labour</span>
        </button>

        <button
          onClick={() => handleNavigate('leaves')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold ${
            activeTab === 'leaves' ? 'text-rose-500' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span>Leaves</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold text-slate-400"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-bold text-white">All Management Modules</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`p-3 rounded-2xl text-left flex items-center space-x-2 text-xs font-bold transition ${
                      isActive ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-950 text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 lg:pb-8">
        {activeTab === 'dashboard' && <DashboardHome onNavigate={handleNavigate} />}
        {activeTab === 'schedule' && <SiteSchedulePage />}
        {activeTab === 'daily' && <DailyAttendancePage />}
        {activeTab === 'monthly' && <MonthlyAttendancePage />}
        {activeTab === 'employees' && <EmployeeManagementPage initialOpenAdd={openAddEmployee} />}
        {activeTab === 'leaves' && <LeaveManagementPage />}
        {activeTab === 'staff' && <UserManagementPage />}
        {activeTab === 'corrections' && <CorrectionReviewPage />}
        {activeTab === 'sites' && <SiteManagementPage />}
        {activeTab === 'reports' && <ReportsPage />}
        {activeTab === 'backup' && <BackupManagementPage />}
        {activeTab === 'settings' && <SettingsPage />}
        {activeTab === 'audit' && <AuditLogPage />}
      </main>
    </div>
  );
}
