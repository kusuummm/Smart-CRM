import { useState, useCallback, useEffect } from 'react';
import { Edit2, Trash2, UserPlus, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/Common';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { getUsers, createUser, updateUser, resetUserPassword, toggleUserStatus, deleteUser as deleteUserRequest } from '../api/users';

const emptyForm = { name: '', email: '', password: '', role: 'telecaller', phone: '' };

const initials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export default function AdminPanel({ onNavigate }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { addToast } = useToast();

  const [form, setForm] = useState(emptyForm);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data.users);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openAdd = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, phone: user.phone || '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { addToast('Name and email are required', 'error'); return; }
    if (!editingUser && !form.password.trim()) { addToast('Password is required', 'error'); return; }

    setSaving(true);
    try {
      if (editingUser) {
        const data = await updateUser(editingUser._id, { name: form.name, role: form.role, phone: form.phone });
        setUsers(users.map(u => (u._id === editingUser._id ? data.user : u)));
        addToast('User updated successfully!', 'success');
      } else {
        const data = await createUser(form);
        setUsers([data.user, ...users]);
        addToast('User created successfully!', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to save user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUserRequest(deleteConfirm._id);
      setUsers(users.filter(u => u._id !== deleteConfirm._id));
      addToast('User deleted successfully!', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const data = await toggleUserStatus(user._id);
      setUsers(users.map(u => (u._id === user._id ? data.user : u)));
      addToast(`User ${data.user.status === 'active' ? 'enabled' : 'disabled'}!`, 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update user status', 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) { addToast('New password must be at least 4 characters', 'error'); return; }
    try {
      await resetUserPassword(resetPasswordUser._id, newPassword);
      addToast('Password reset successfully!', 'success');
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to reset password', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Panel"
        subtitle="Manage users, roles, and system settings"
        action={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
            <UserPlus size={18} /> Add User
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <UserPlus className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-900 dark:text-white">{users.length}</p>
              <p className="text-sm text-dark-500 dark:text-dark-400">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <UserPlus className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-900 dark:text-white">{users.filter(u => u.role === 'admin').length}</p>
              <p className="text-sm text-dark-500 dark:text-dark-400">Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <UserPlus className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-900 dark:text-white">{users.filter(u => u.role === 'telecaller').length}</p>
              <p className="text-sm text-dark-500 dark:text-dark-400">Telecallers</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-dark-400 dark:text-dark-500">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading users...
        </div>
      ) : (
      <div className="bg-white rounded-xl border border-dark-200 shadow-sm overflow-hidden dark:bg-dark-800 dark:border-dark-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dark-50 dark:bg-dark-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
            {users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-dark-400 dark:text-dark-500">No users found</td></tr>
            ) : (
              users.map(user => (
                <tr key={user._id} className="hover:bg-dark-50 dark:hover:bg-dark-700">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-semibold text-sm">{initials(user.name)}</span>
                      </div>
                      <span className="font-medium text-dark-900 dark:text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setResetPasswordUser(user)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600" title="Reset Password">
                        <KeyRound size={16} />
                      </button>
                      <button onClick={() => handleToggleStatus(user)} className={`p-1.5 rounded-lg ${user.status === 'active' ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-green-50 text-green-600'}`} title={user.status === 'active' ? 'Disable' : 'Enable'}>
                        {user.status === 'active' ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => setDeleteConfirm(user)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'Edit User' : 'Add New User'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Email *</label>
            <input
              type="email"
              value={form.email}
              disabled={!!editingUser}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700 disabled:opacity-60"
              placeholder="john@crm.com"
            />
          </div>
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10 dark:border-dark-700"
                  placeholder="Min 4 characters"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 dark:text-dark-500">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              >
                <option value="telecaller">Telecaller</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : `${editingUser ? 'Update' : 'Create'} User`}</button>
        </div>
      </Modal>

      <Modal isOpen={!!resetPasswordUser} onClose={() => { setResetPasswordUser(null); setNewPassword(''); }} title={`Reset Password - ${resetPasswordUser?.name}`} size="sm">
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">New Password *</label>
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
            placeholder="Min 4 characters"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => { setResetPasswordUser(null); setNewPassword(''); }} className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600">Cancel</button>
          <button onClick={handleResetPassword} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">Reset Password</button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
