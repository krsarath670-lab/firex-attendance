import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../../components/StatusBadge';
import {
  ShieldCheck,
  UserPlus,
  Key,
  Edit2,
  Trash2,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  User,
  Mail,
  Phone,
} from 'lucide-react';

export function UserManagementPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [resetPasswordUser, setResetPasswordUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/engineers-supervisors', {
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      if (res.ok) {
        setUsersList(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === user.id) {
      alert('You cannot delete your own active account.');
      return;
    }

    const confirmMsg = `Are you sure you want to delete ${targetUser.name} (${targetUser.role})?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/auth/user/${targetUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('firex_token')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      alert(data.message);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Engineers & Supervisors</h1>
          <p className="text-xs text-slate-400">
            Manage management staff accounts, credentials, and access roles
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Engineer / Supervisor</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Management Accounts ({usersList.length})</h3>
          <button
            onClick={fetchUsers}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 px-3">Name</th>
                <th className="pb-3 px-3">Role</th>
                <th className="pb-3 px-3">Username</th>
                <th className="pb-3 px-3">Email</th>
                <th className="pb-3 px-3">Phone</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500 mb-2" />
                    Loading management accounts...
                  </td>
                </tr>
              ) : (
                usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-white">
                      <div>{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.employee_id}</div>
                    </td>
                    <td className="py-3 px-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-400">{u.username}</td>
                    <td className="py-3 px-3 text-slate-300">{u.email || '—'}</td>
                    <td className="py-3 px-3 text-slate-300">{u.phone || '—'}</td>
                    <td className="py-3 px-3">
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[11px] font-bold">
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setResetPasswordUser(u)}
                          title="Reset Password"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingUser(u)}
                          title="Edit User"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Delete User"
                            className="p-1.5 bg-rose-950/50 hover:bg-rose-900 text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddUserModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchUsers();
          }}
        />
      )}

      {/* Edit Modal */}
      {editingUser && (
        <EditUserModal
          targetUser={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <AdminResetPasswordModal
          targetUser={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => {
            setResetPasswordUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    role: 'ENGINEER',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.password.trim()) {
      setError('Name and Password are required.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/create-engineer-supervisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      alert(data.message);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">Add Engineer or Supervisor</h3>
        <p className="text-xs text-slate-400 mb-5">Create a management account with dedicated credentials</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Account Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'ENGINEER' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  formData.role === 'ENGINEER'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                🛠️ ENGINEER (Full Access)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'SUPERVISOR' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  formData.role === 'SUPERVISOR'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                📋 SUPERVISOR
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Login Username</label>
              <input
                type="text"
                placeholder="e.g. john or john.smith"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                placeholder="john@firex.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile</label>
              <input
                type="text"
                placeholder="+973 3800 0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Login Password <span className="text-rose-400">*</span> (min 6 chars)
            </label>
            <input
              type="text"
              required
              placeholder="Enter password for user..."
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              <Save className="w-4 h-4" />
              <span>{loading ? 'Creating...' : 'Save Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ targetUser, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: targetUser.name || '',
    email: targetUser.email || '',
    username: targetUser.username || '',
    phone: targetUser.phone || '',
    role: targetUser.role || 'SUPERVISOR',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/auth/update-user/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firex_token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      alert(data.message);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">Edit User: {targetUser.name}</h3>
        <p className="text-xs text-slate-400 mb-5">Update profile information and password</p>

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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Login Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Reset Password (leave empty to keep current password)
            </label>
            <input
              type="text"
              placeholder="Type new password..."
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-emerald-400 focus:outline-none focus:border-rose-500 font-mono"
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
              <span>{loading ? 'Saving...' : 'Update Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminResetPasswordModal({ targetUser, onClose, onSuccess }) {
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
          userId: targetUser.id,
          employeeId: targetUser.employee_id,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      alert(data.message || 'Password reset successfully!');
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
            <h3 className="text-lg font-bold text-white">Reset Password</h3>
            <p className="text-xs text-slate-400">User: {targetUser.name} ({targetUser.username})</p>
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
