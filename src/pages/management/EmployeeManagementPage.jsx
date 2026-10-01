import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  CheckCircle,
  XCircle,
  Eye,
  Key,
  MapPin,
  Calendar,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  Briefcase,
  Trash2,
  Lock,
} from 'lucide-react';

export function EmployeeManagementPage({ initialOpenAdd = false }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(initialOpenAdd);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState(null);
  const [viewingEmployeeId, setViewingEmployeeId] = useState(null);
  const [viewDetailsData, setViewDetailsData] = useState(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let url = '/api/employees?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (departmentFilter) url += `department=${departmentFilter}&`;
      if (supervisorFilter) url += `supervisor_id=${supervisorFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error('Error loading employees:', err);
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
    fetchEmployees();
  }, [search, departmentFilter, supervisorFilter, statusFilter]);

  const handleDeleteEmployee = async (emp) => {
    const confirmMsg = `Are you sure you want to permanently delete ${emp.full_name} (${emp.employee_id})?\n\nThis will remove their account and all attendance records.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete employee');

      alert(data.message || 'Employee deleted successfully.');
      fetchEmployees();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteAllEmployees = async () => {
    const confirmMsg = `⚠️ WARNING: Are you sure you want to delete ALL labour employees and clear attendance history to start completely fresh?\n\nManagement accounts (Engineer & Supervisor) and Sites will be preserved.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/employees/delete-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to wipe employees');

      alert(data.message);
      fetchEmployees();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (emp) => {
    const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    const confirmMsg = `Are you sure you want to mark ${emp.full_name} (${emp.employee_id}) as ${nextStatus}? ${
      nextStatus === 'Inactive' ? 'They will no longer be able to punch attendance.' : ''
    }`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchEmployees();
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleOpenDetails = async (empId) => {
    setViewingEmployeeId(empId);
    try {
      const res = await fetch(`/api/employees/${empId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        setViewDetailsData(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Labour Employees</h1>
          <p className="text-xs text-slate-400">Manage workforce profiles, work site assignments, and credentials</p>
        </div>

        <div className="flex items-center space-x-2">
          {employees.length > 0 && (
            <button
              onClick={handleDeleteAllEmployees}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-rose-900/40 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition"
              title="Delete all sample employees to start fresh"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete All</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Labour Employee</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Search Employee</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Name, ID, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
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
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Workforce Directory ({employees.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 px-3">Employee</th>
                <th className="pb-3 px-3">ID</th>
                <th className="pb-3 px-3">Mobile</th>
                <th className="pb-3 px-3">Assigned Site</th>
                <th className="pb-3 px-3">Supervisor</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500 mb-2" />
                    Loading employee directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-white">No employees registered</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click <span className="text-rose-400 font-semibold">"+ Add Labour Employee"</span> above to onboard your real team members with their custom passwords.
                    </p>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-white">
                      <div>{emp.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{emp.designation || 'Labour'}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-400">{emp.employee_id}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{emp.mobile || '—'}</td>
                    <td className="py-3 px-3 text-slate-300">{emp.site_name || 'Unassigned'}</td>
                    <td className="py-3 px-3 text-slate-400">{emp.supervisor_name || 'Unassigned'}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          emp.status === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenDetails(emp.id)}
                          title="View Details"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setResetPasswordEmployee(emp)}
                          title="Reset Password"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingEmployee(emp)}
                          title="Edit Employee"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          title={emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition ${
                            emp.status === 'Active'
                              ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-400'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400'
                          }`}
                        >
                          {emp.status === 'Active' ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp)}
                          title="Delete Employee"
                          className="p-1.5 bg-rose-950/50 hover:bg-rose-900 text-rose-400 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <AddEmployeeModal
          isOpen={showAddModal}
          supervisors={supervisors}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchEmployees();
          }}
        />
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          supervisors={supervisors}
          onClose={() => setEditingEmployee(null)}
          onSuccess={() => {
            setEditingEmployee(null);
            fetchEmployees();
          }}
        />
      )}

      {/* Reset Employee Password Modal */}
      {resetPasswordEmployee && (
        <ResetEmployeePasswordModal
          employee={resetPasswordEmployee}
          onClose={() => setResetPasswordEmployee(null)}
          onSuccess={() => {
            setResetPasswordEmployee(null);
            fetchEmployees();
          }}
        />
      )}

      {/* View Details Modal */}
      {viewingEmployeeId && viewDetailsData && (
        <EmployeeDetailsModal
          data={viewDetailsData}
          onClose={() => {
            setViewingEmployeeId(null);
            setViewDetailsData(null);
          }}
        />
      )}
    </div>
  );
}

function AddEmployeeModal({ isOpen, supervisors, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    username: '',
    password: '',
    mobile: '',
    email: '',
    department: 'Project',
    designation: 'Project Site Worker',
    supervisor_id: '',
    joining_date: new Date().toISOString().substring(0, 10),
    remarks: '',
  });
  const [suggestedId, setSuggestedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState(null);

  useEffect(() => {
    async function loadNextId() {
      try {
        const res = await fetch('/api/employees/next-id', {
          headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestedId(data.nextId);
          setFormData((f) => ({
            ...f,
            employee_id: f.employee_id || data.nextId,
            password: f.password || '',
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }
    if (isOpen) {
      loadNextId();
      if (supervisors && supervisors.length > 0) {
        setFormData((f) => ({ ...f, supervisor_id: supervisors[0].id }));
      }
    }
  }, [isOpen, supervisors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!formData.password.trim()) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify({
          ...formData,
          role: 'LABOUR', // Strict role lockdown
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create employee');

      setCreatedInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (createdInfo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Employee Onboarded!</h3>
          <p className="text-xs text-slate-400">
            Labour account created successfully. Give the following credentials to the employee:
          </p>

          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-left text-xs space-y-2 font-mono">
            <div>
              <span className="text-slate-500">Employee ID: </span>
              <span className="text-white font-bold">{createdInfo.userCredentials.employee_id}</span>
            </div>
            <div>
              <span className="text-slate-500">Username: </span>
              <span className="text-rose-400 font-bold">{createdInfo.userCredentials.username}</span>
            </div>
            <div>
              <span className="text-slate-500">Login Password: </span>
              <span className="text-emerald-400 font-bold">{createdInfo.userCredentials.temporaryPassword}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setCreatedInfo(null);
              onSuccess();
            }}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">Add Labour Employee</h3>
        <p className="text-xs text-slate-400 mb-5">
          Create a new labour profile with custom Employee ID and login password.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Employee ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. LAB-0001"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mohammed Ali"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Login Username
              </label>
              <input
                type="text"
                placeholder="Auto (or type e.g. mohammed)"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password for Employee <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. secret123"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 focus:outline-none focus:border-rose-500 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number</label>
              <input
                type="text"
                placeholder="+973 3500 0000"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email (Optional)</label>
              <input
                type="email"
                placeholder="worker@firex.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Department <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) => {
                  const dept = e.target.value;
                  setFormData({
                    ...formData,
                    department: dept,
                    designation: dept === 'Maintenance' ? 'Maintenance Technician' : 'Project Site Worker',
                  });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
              >
                <option value="Project">Project</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Supervisor</label>
              <select
                value={formData.supervisor_id}
                onChange={(e) => setFormData({ ...formData, supervisor_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Select Supervisor --</option>
                {supervisors && supervisors.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Daily Site Assignment</label>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-slate-400">
                <span>📍 Scheduled daily in evening by Engineer/Supervisor</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Joining Date</label>
              <input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks</label>
              <input
                type="text"
                placeholder="e.g. Technician helper"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Creating...' : 'Save Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component: Edit Employee Modal
function EditEmployeeModal({ employee, sites, supervisors, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: employee.full_name || '',
    mobile: employee.mobile || '',
    email: employee.email || '',
    department: employee.department || '',
    designation: employee.designation || '',
    supervisor_id: employee.supervisor_id || '',
    site_id: employee.site_id || '',
    joining_date: employee.joining_date || '',
    remarks: employee.remarks || '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to update employee details');
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">Edit Employee: {employee.full_name}</h3>
        <p className="text-xs text-slate-400 mb-5">Employee ID: {employee.employee_id}</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile</label>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Password update option */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Reset Employee Login Password (leave blank to keep current)
            </label>
            <input
              type="text"
              placeholder="Enter new password for employee..."
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Department <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.department || 'Project'}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
              >
                <option value="Project">Project</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Supervisor</label>
              <select
                value={formData.supervisor_id}
                onChange={(e) => setFormData({ ...formData, supervisor_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">Unassigned</option>
                {supervisors && supervisors.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Daily Site Assignment</label>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-slate-400">
                <span>📍 Scheduled daily in evening by Engineer/Supervisor</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks</label>
            <textarea
              rows={2}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Update Details'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component: Employee Details Modal
function EmployeeDetailsModal({ data, onClose }) {
  const { employee, summary, recent_attendance } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black text-white">{employee.full_name}</span>
              <span className="bg-rose-950 text-rose-300 border border-rose-800 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                {employee.employee_id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {employee.designation} • {employee.department}
            </p>
          </div>

          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
              employee.status === 'Active'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}
          >
            {employee.status}
          </span>
        </div>

        {/* Meta Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950 rounded-2xl p-3.5 border border-slate-800">
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-semibold block">Site:</span>
            <span className="text-white font-medium">{employee.site_name || 'Unassigned'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-semibold block">Supervisor:</span>
            <span className="text-white font-medium">{employee.supervisor_name || 'Unassigned'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-semibold block">Mobile:</span>
            <span className="text-white font-mono">{employee.mobile || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-semibold block">Joined:</span>
            <span className="text-white font-mono">{employee.joining_date || '—'}</span>
          </div>
        </div>

        {/* Current Month Summary */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Current Month Attendance ({summary?.current_month})
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Present</span>
              <span className="text-lg font-black text-emerald-400">{summary?.present_count || 0}</span>
            </div>
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Late</span>
              <span className="text-lg font-black text-amber-400">{summary?.late_count || 0}</span>
            </div>
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Records</span>
              <span className="text-lg font-black text-blue-400">{summary?.total_records || 0}</span>
            </div>
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Hours</span>
              <span className="text-lg font-black text-rose-400">{summary?.total_hours_formatted || '0h 00m'}</span>
            </div>
          </div>
        </div>

        {/* Recent Attendance Records */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Recent Attendance Log</h4>
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
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
                {!recent_attendance || recent_attendance.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-4 text-center text-slate-500">
                      No attendance history recorded yet.
                    </td>
                  </tr>
                ) : (
                  recent_attendance.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 px-2 font-mono text-white">{r.attendance_date}</td>
                      <td className="py-2 px-2 font-mono text-slate-300">{r.punch_in_display || '--:--'}</td>
                      <td className="py-2 px-2 font-mono text-slate-300">{r.punch_out_display || '--:--'}</td>
                      <td className="py-2 px-2 font-mono text-emerald-400 font-bold">
                        {r.total_hours_formatted || '0h 00m'}
                      </td>
                      <td className="py-2 px-2">
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
    </div>
  );
}

function ResetEmployeePasswordModal({ employee, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/admin-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify({
          employeeId: employee.employee_id,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      alert(data.message || 'Employee password reset successfully!');
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Reset Employee Password</h3>
            <p className="text-xs text-slate-400">
              {employee.full_name} ({employee.employee_id})
            </p>
          </div>
        </div>

        {error && (
          <div className="my-3 p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              New Password (min 6 characters) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Type new secure password..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-emerald-400 focus:outline-none focus:border-rose-500 font-mono font-bold"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5"
            >
              <Key className="w-4 h-4" />
              <span>{loading ? 'Resetting...' : 'Save New Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
