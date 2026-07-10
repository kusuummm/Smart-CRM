import { useState, useCallback, useEffect } from 'react';
import { User, Edit2, Shield, Mail, LogOut, ChevronRight, Calendar, Monitor, Smartphone, Trash2, Plus, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/Common';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { updateMeRequest, getSessionsRequest, revokeSessionRequest } from '../api/auth';

export default function MyAccount({ onNavigate }) {
  const { user, logout, updateUser, accounts, switchAccount, removeAccount, startAddAccount } = useAuth();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'telecaller',
  });

  // Active Sessions modal
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(null);

  // Switch Account modal
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await getSessionsRequest();
      setSessions(data.sessions);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load sessions', 'error');
    } finally {
      setSessionsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSessions = () => {
    setShowSessions(true);
    loadSessions();
  };

  const handleRevoke = async () => {
    try {
      await revokeSessionRequest(revokeConfirm.id);
      setSessions(sessions.filter((s) => s.id !== revokeConfirm.id));
      addToast('Session signed out', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to revoke session', 'error');
    } finally {
      setRevokeConfirm(null);
    }
  };

  const handleSwitch = async (accountId) => {
    setSwitchingId(accountId);
    const result = await switchAccount(accountId);
    if (result.success) {
      addToast('Switched account', 'success');
      setShowSwitcher(false);
    } else {
      addToast(result.message, 'error');
    }
    setSwitchingId(null);
  };

  const handleRemoveAccount = async (accountId, e) => {
    e.stopPropagation();
    await removeAccount(accountId);
    addToast('Account removed from this device', 'success');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return; }

    setSaving(true);
    try {
      const data = await updateMeRequest({ name: form.name });
      updateUser(data.user);
      addToast('Profile updated successfully!', 'success');
      setIsEditing(false);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const formatRelative = (isoString) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  if (isEditing) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Edit Profile</h1>
            <p className="text-sm text-dark-500 dark:text-dark-400">Update your account information</p>
          </div>
          <button onClick={() => setIsEditing(false)} className="p-2 rounded-lg hover:bg-dark-100 text-dark-500 dark:text-dark-400 dark:hover:bg-dark-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-dark-200 shadow-sm p-6 dark:bg-dark-800 dark:border-dark-700">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-white text-3xl font-bold">{user?.avatar}</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">{user?.name}</h2>
            <p className="text-sm text-dark-500 capitalize dark:text-dark-400">{user?.role}</p>
            <div className="flex items-center gap-2 mt-3 px-3 py-1.5 bg-green-50 rounded-full text-xs text-green-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Active Account</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Email Address</label>
              <input
                type="email"
                value={form.email}
                disabled
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm bg-dark-50 text-dark-500 cursor-not-allowed dark:border-dark-700 dark:bg-dark-700 dark:text-dark-400"
              />
              <p className="text-xs text-dark-400 mt-1 dark:text-dark-500">Email can't be changed since it's your login ID. Contact an admin if this needs to change.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Role</label>
              <div className="flex items-center gap-2 p-3 bg-dark-50 rounded-lg dark:bg-dark-700">
                <Shield className="text-primary-600" size={18} />
                <span className="text-sm font-medium text-dark-900 capitalize dark:text-white">{user?.role}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Account Status</label>
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700">Active</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Account" subtitle="Manage your account settings and profile" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-6 text-white">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                <span className="text-white text-3xl font-bold">{user?.avatar}</span>
              </div>
              <h2 className="text-2xl font-bold mb-1">{user?.name}</h2>
              <p className="text-primary-200 capitalize">{user?.role}</p>
              <div className="flex items-center gap-2 mt-3 px-3 py-1.5 bg-white/20 rounded-full text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Active Account</span>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg backdrop-blur-sm"
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="bg-white rounded-lg p-4 border border-dark-200 dark:bg-dark-800 dark:border-dark-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Calendar className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">Member Since</p>
                  <p className="font-medium text-dark-900 dark:text-white">Jan 2024</p>
                </div>
              </div>
            </div>

            <button onClick={openSessions} className="w-full text-left bg-white rounded-lg p-4 border border-dark-200 dark:bg-dark-800 dark:border-dark-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <ChevronRight className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">Active Sessions</p>
                  <p className="font-medium text-dark-900 dark:text-white">Click to view devices</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Details Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-dark-200 shadow-sm p-6 dark:bg-dark-800 dark:border-dark-700">
            <h3 className="text-lg font-semibold text-dark-900 mb-4 dark:text-white">Personal Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="text-blue-600" size={18} />
                </div>
                <div>
                  <p className="text-sm text-dark-500 dark:text-dark-400">Full Name</p>
                  <p className="font-medium text-dark-900 dark:text-white">{user?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <Mail className="text-red-600" size={18} />
                </div>
                <div>
                  <p className="text-sm text-dark-500 dark:text-dark-400">Email Address</p>
                  <p className="font-medium text-dark-900 dark:text-white">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield className="text-green-600" size={18} />
                </div>
                <div>
                  <p className="text-sm text-dark-500 dark:text-dark-400">Role</p>
                  <p className="font-medium text-dark-900 capitalize dark:text-white">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-dark-200 shadow-sm p-6 dark:bg-dark-800 dark:border-dark-700">
            <h3 className="text-lg font-semibold text-dark-900 mb-4 dark:text-white">Account Settings</h3>
            <div className="space-y-3">
              <button onClick={() => setShowSwitcher(true)} className="w-full flex items-center justify-between p-3 hover:bg-dark-50 rounded-lg transition-colors group dark:hover:bg-dark-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ChevronRight className="text-purple-600" size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-dark-900 dark:text-white">Switch Account</p>
                    <p className="text-xs text-dark-500 dark:text-dark-400">Log in as a different user</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-dark-400 group-hover:text-dark-600 dark:text-dark-500" />
              </button>

              <button onClick={handleLogout} className="w-full flex items-center justify-between p-3 hover:bg-red-50 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <LogOut className="text-red-600" size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-red-600">Logout</p>
                    <p className="text-xs text-red-500">Sign out of your account</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-red-400 group-hover:text-red-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions Modal */}
      <Modal isOpen={showSessions} onClose={() => setShowSessions(false)} title="Active Sessions" size="md">
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-10 text-dark-400 dark:text-dark-500">
            <Loader2 className="animate-spin mr-2" size={20} />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-dark-400 dark:text-dark-500 text-center py-6">No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-dark-50 dark:bg-dark-700">
                {/Android|iOS/i.test(s.device) ? <Smartphone className="text-dark-500 dark:text-dark-400 flex-shrink-0" size={20} /> : <Monitor className="text-dark-500 dark:text-dark-400 flex-shrink-0" size={20} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-dark-900 dark:text-white">{s.device}</p>
                    {s.current && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded-full">This device</span>}
                  </div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">
                    Signed in {formatRelative(s.loginAt)} · Active {formatRelative(s.lastSeenAt)} · {s.ip}
                  </p>
                </div>
                {!s.current && (
                  <button onClick={() => setRevokeConfirm(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 flex-shrink-0" title="Sign out this session">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!revokeConfirm}
        onClose={() => setRevokeConfirm(null)}
        onConfirm={handleRevoke}
        title="Sign Out Session"
        message={`Sign out the session on "${revokeConfirm?.device}"? That device will need to log in again.`}
        confirmText="Sign Out"
        type="danger"
      />

      {/* Switch Account Modal */}
      <Modal isOpen={showSwitcher} onClose={() => setShowSwitcher(false)} title="Switch Account" size="md">
        <div className="space-y-2">
          {accounts.map((acc) => {
            const isCurrent = acc.id === user?.id;
            return (
              <div
                key={acc.id}
                onClick={() => !isCurrent && handleSwitch(acc.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isCurrent
                    ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-700'
                    : 'border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer'
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{acc.avatar}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-900 dark:text-white truncate">{acc.name}</p>
                  <p className="text-xs text-dark-500 dark:text-dark-400 truncate">{acc.email}</p>
                </div>
                {isCurrent ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 flex-shrink-0">
                    <Check size={14} /> Current
                  </span>
                ) : switchingId === acc.id ? (
                  <Loader2 className="animate-spin text-dark-400" size={16} />
                ) : (
                  <button onClick={(e) => handleRemoveAccount(acc.id, e)} className="p-1.5 rounded-lg hover:bg-red-50 text-dark-400 hover:text-red-600 flex-shrink-0" title="Remove from this device">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => { setShowSwitcher(false); startAddAccount(); }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-dark-300 dark:border-dark-600 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors text-dark-600 dark:text-dark-300"
          >
            <div className="w-10 h-10 rounded-full border border-dashed border-dark-300 dark:border-dark-600 flex items-center justify-center flex-shrink-0">
              <Plus size={18} />
            </div>
            <span className="text-sm font-medium">Add another account</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
