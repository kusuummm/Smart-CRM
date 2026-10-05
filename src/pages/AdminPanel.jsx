import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Users,
  User,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ArrowRightLeft,
  Database,
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Loader2,
  Download,
  Phone,
  Check,
  ChevronRight,
  Activity,
  ArrowRight,
  Info,
  CalendarCheck,
  Calendar,
  Send,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { PageHeader } from '../components/Common';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import {
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
  toggleUserStatus,
  deleteUser as deleteUserRequest,
  reassignUserWorkload,
  getSystemOverview,
  getAuditLogs
} from '../api/users';
import { getCustomers, updateCustomer, bulkAssignCustomers } from '../api/customers';
import { testEmailDelivery } from '../api/emails';

const emptyForm = { name: '', email: '', password: '', role: 'telecaller', phone: '' };

const initials = (name = '') =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export default function AdminPanel({ onNavigate }) {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'workload' | 'audit' | 'system'

  // Data states
  const [users, setUsers] = useState([]);
  const [systemOverview, setSystemOverview] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [unassignedList, setUnassignedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'telecaller'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [auditActorFilter, setAuditActorFilter] = useState('all');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Workload Transfer Modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromUserId: '', toUserId: '' });

  // Agent Portfolio Inspector Modal state
  const [inspectorAgent, setInspectorAgent] = useState(null);
  const [inspectorCustomers, setInspectorCustomers] = useState([]);
  const [loadingInspector, setLoadingInspector] = useState(false);

  // SMTP Testing State
  const initialRecipient =
    currentUser?.email && !currentUser.email.endsWith('@crm.com') && !currentUser.email.endsWith('@example.com')
      ? currentUser.email
      : '';
  const [testEmailRecipient, setTestEmailRecipient] = useState(initialRecipient);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // Unassigned Batch Assigner State
  const [unassignedBatchAgentId, setUnassignedBatchAgentId] = useState('');
  const [isAssigningUnassigned, setIsAssigningUnassigned] = useState(false);

  const [form, setForm] = useState(emptyForm);

  // Load core admin data
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [usersData, overviewData, auditData, unassignedData] = await Promise.all([
        getUsers(),
        getSystemOverview().catch(() => ({ overview: null })),
        getAuditLogs().catch(() => ({ activities: [] })),
        getCustomers({ unassigned: 'true', limit: 100 }).catch(() => ({ customers: [] })),
      ]);

      setUsers(usersData.users || []);
      if (overviewData.overview) setSystemOverview(overviewData.overview);
      setAuditLogs(auditData.activities || []);
      setUnassignedList(unassignedData.customers || []);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load admin data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Telecallers list for reassignment options
  const telecallers = useMemo(() => {
    return users.filter((u) => u.role === 'telecaller' && u.status === 'active');
  }, [users]);

  // Filtered users for table
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchQuery ||
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    if (auditActorFilter === 'all') return auditLogs;
    return auditLogs.filter((a) => a.actor === auditActorFilter);
  }, [auditLogs, auditActorFilter]);

  // Aggregate stats
  const totalAssignedCustomers = useMemo(() => {
    return users.reduce((sum, u) => sum + (u.assignedCustomers || 0), 0);
  }, [users]);

  // Handlers for Portfolio Inspector
  const openInspector = async (agent) => {
    setInspectorAgent(agent);
    setLoadingInspector(true);
    try {
      const data = await getCustomers({ telecallerId: agent._id, limit: 200 });
      setInspectorCustomers(data.customers || []);
    } catch (err) {
      addToast('Failed to load agent customers', 'error');
    } finally {
      setLoadingInspector(false);
    }
  };

  const handleInspectorCustomerReassign = async (customerId, targetTelecallerId) => {
    const targetTc = telecallers.find((t) => t._id === targetTelecallerId);
    try {
      await updateCustomer(customerId, {
        telecallerId: targetTelecallerId || null,
        assignedTelecaller: targetTc ? targetTc.name : 'Unassigned',
      });
      setInspectorCustomers((prev) => prev.filter((c) => c._id !== customerId));
      addToast(`Customer reassigned to ${targetTc ? targetTc.name : 'Unassigned'}!`, 'success');
      // Refresh user counts
      loadData(true);
    } catch (err) {
      addToast('Failed to reassign customer', 'error');
    }
  };

  // Handlers for Unassigned Queue
  const handleAssignAllUnassigned = async () => {
    if (!unassignedBatchAgentId) {
      addToast('Please select a target telecaller', 'error');
      return;
    }
    setIsAssigningUnassigned(true);
    try {
      const res = await bulkAssignCustomers({
        customerIds: unassignedList.map((c) => c._id),
        telecallerId: unassignedBatchAgentId,
      });
      addToast(res.message || 'All unassigned customers distributed!', 'success');
      setUnassignedBatchAgentId('');
      loadData(true);
    } catch (err) {
      addToast('Failed to assign unassigned customers', 'error');
    } finally {
      setIsAssigningUnassigned(false);
    }
  };

  // User CRUD Handlers
  const openAdd = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      phone: u.phone || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      addToast('Name and email are required', 'error');
      return;
    }
    if (!editingUser && !form.password.trim()) {
      addToast('Password is required', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const data = await updateUser(editingUser._id, {
          name: form.name,
          role: form.role,
          phone: form.phone,
        });
        setUsers((prev) =>
          prev.map((u) => (u._id === editingUser._id ? { ...u, ...data.user } : u))
        );
        addToast('User updated successfully!', 'success');
      } else {
        const data = await createUser(form);
        setUsers((prev) => [data.user, ...prev]);
        addToast('New user account created successfully!', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to save user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteUserRequest(deleteConfirm._id);
      setUsers((prev) => prev.filter((u) => u._id !== deleteConfirm._id));
      addToast('User deleted successfully. Any linked accounts moved to Unassigned.', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const isSelf = String(currentUser?.id || currentUser?._id) === String(targetUser._id);
    if (isSelf && targetUser.status === 'active') {
      addToast('You cannot disable your own admin account', 'error');
      return;
    }

    try {
      const data = await toggleUserStatus(targetUser._id);
      setUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, ...data.user } : u))
      );
      addToast(
        `User ${data.user.status === 'active' ? 'activated' : 'disabled'} successfully!`,
        'success'
      );
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update user status', 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      addToast('New password must be at least 4 characters', 'error');
      return;
    }
    try {
      await resetUserPassword(resetPasswordUser._id, newPassword);
      addToast(`Password for ${resetPasswordUser.name} reset successfully!`, 'success');
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to reset password', 'error');
    }
  };

  // Workload Transfer Handlers
  const openTransferModal = (fromId = '') => {
    const availableTargets = telecallers.filter((tc) => tc._id !== fromId);
    setTransferForm({
      fromUserId: fromId,
      toUserId: availableTargets[0]?._id || '',
    });
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async () => {
    if (!transferForm.fromUserId || !transferForm.toUserId) {
      addToast('Please select both source and target telecallers', 'error');
      return;
    }

    if (transferForm.fromUserId === transferForm.toUserId) {
      addToast('Source and target telecallers must be different', 'error');
      return;
    }

    setTransferring(true);
    try {
      const res = await reassignUserWorkload(transferForm);
      addToast(res.message || 'Workload reassigned successfully!', 'success');
      setIsTransferModalOpen(false);
      loadData(true);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to transfer workload', 'error');
    } finally {
      setTransferring(false);
    }
  };

  // Live SMTP Test Dispatcher
  const handleTestEmail = async () => {
    const trimmedRecipient = testEmailRecipient.trim();
    if (!trimmedRecipient || !trimmedRecipient.includes('@')) {
      addToast('Please enter a valid recipient email address (e.g. your Gmail or Outlook)', 'error');
      return;
    }

    if (trimmedRecipient.endsWith('@crm.com') || trimmedRecipient.endsWith('@example.com')) {
      addToast('Cannot send test to a placeholder domain (@crm.com or @example.com). Please enter your real email.', 'error');
      return;
    }

    setIsTestingEmail(true);
    try {
      const res = await testEmailDelivery({ recipientEmail: trimmedRecipient });
      addToast(res.message || 'Test email dispatched successfully! Please check your Inbox and Spam/Junk folder.', 'success', 6000);
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'SMTP Deliverability Test failed. Check .env settings.', 'error');
    } finally {
      setIsTestingEmail(false);
    }
  };

  // CSV Export for Users
  const handleExportRoster = () => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Phone', 'Assigned Customers', 'Assigned Leads'];
    const rows = users.map((u) => [
      `"${u.name}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      `"${u.status}"`,
      `"${u.phone || ''}"`,
      u.assignedCustomers || 0,
      u.assignedLeads || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smart-crm-users-roster-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('User roster exported to CSV!', 'success');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive Header with Master Controls */}
      <PageHeader
        title="Admin Control Center"
        subtitle="Manage user accounts, assign workloads, and monitor system diagnostics."
        action={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-800 text-dark-600 dark:text-dark-300 transition-colors shadow-xs"
              title="Refresh"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin text-primary-600' : ''} />
            </button>
            <button
              onClick={handleExportRoster}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 hover:bg-dark-50 dark:hover:bg-dark-700 text-dark-700 dark:text-dark-200 rounded-xl text-sm font-medium transition-colors shadow-xs"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export Roster</span>
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <UserPlus size={17} />
              <span>Add User</span>
            </button>
          </div>
        }
      />

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <Users size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full">
              Accounts
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white">
              {users.length}
            </p>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5 font-medium">
              Total Users Registered
            </p>
          </div>
        </div>

        {/* Administrators */}
        <div className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
              <Shield size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-full">
              Full Access
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white">
              {users.filter((u) => u.role === 'admin').length}
            </p>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5 font-medium">
              Active Administrators
            </p>
          </div>
        </div>

        {/* Standard Users */}
        <div className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
              <Users size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
              Users
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white">
              {users.filter((u) => u.role === 'telecaller').length}
            </p>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5 font-medium">
              Standard Users
            </p>
          </div>
        </div>

        {/* Managed Clients */}
        <div className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
              <Activity size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full">
              Workload
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white">
              {totalAssignedCustomers}
            </p>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5 font-medium">
              Assigned Client Accounts
            </p>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-dark-200 dark:border-dark-700 gap-4 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-dark-500 dark:text-dark-400 hover:text-dark-900 dark:hover:text-white'
          }`}
        >
          <Users size={17} />
          <span>User & Access Management</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('workload')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'workload'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-dark-500 dark:text-dark-400 hover:text-dark-900 dark:hover:text-white'
          }`}
        >
          <ArrowRightLeft size={17} />
          <span>Workload & Reassignment Hub</span>
          {unassignedList.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
              {unassignedList.length} unassigned
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-dark-500 dark:text-dark-400 hover:text-dark-900 dark:hover:text-white'
          }`}
        >
          <Clock size={17} />
          <span>Live Audit Activity Trail</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'system'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-dark-500 dark:text-dark-400 hover:text-dark-900 dark:hover:text-white'
          }`}
        >
          <Database size={17} />
          <span>System Health & Diagnostics</span>
        </button>
      </div>

      {/* 4. Tab 1: User & Access Management */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
          {/* Search & Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex flex-col md:flex-row items-center justify-between gap-3 bg-dark-50/40 dark:bg-dark-900/30">
            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 dark:text-dark-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, phone..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl text-sm text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto scrollbar-none">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl text-xs sm:text-sm text-dark-700 dark:text-dark-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrators</option>
                <option value="telecaller">Standard Users</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl text-xs sm:text-sm text-dark-700 dark:text-dark-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-dark-400 dark:text-dark-500 gap-2">
              <Loader2 className="animate-spin text-primary-600" size={20} />
              <span>Loading users...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-50/70 dark:bg-dark-900/50 border-b border-dark-200 dark:border-dark-700">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                      Role & Access
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                      Assigned Workload
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-dark-400 dark:text-dark-500">
                        No user accounts match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = String(currentUser?.id || currentUser?._id) === String(u._id);

                      return (
                        <tr key={u._id} className="hover:bg-dark-50/60 dark:hover:bg-dark-700/50 transition-colors">
                          {/* Name & Email */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-500 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                                {initials(u.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-dark-900 dark:text-white truncate">
                                    {u.name}
                                  </span>
                                  {isSelf && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-dark-500 dark:text-dark-400 truncate mt-0.5">
                                  {u.email} {u.phone ? `• ${u.phone}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                              }`}
                            >
                              {u.role === 'admin' ? <Shield size={13} /> : <User size={13} />}
                              {u.role === 'admin' ? 'Administrator' : 'User'}
                            </span>
                          </td>

                          {/* Workload */}
                          <td className="px-5 py-4">
                            {u.role === 'telecaller' || u.role === 'user' ? (
                              <div className="flex items-center gap-3 text-xs">
                                <button
                                  onClick={() => openInspector(u)}
                                  className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                                  title="Inspect client portfolio"
                                >
                                  <Users size={14} className="text-primary-500" />
                                  {u.assignedCustomers || 0} clients
                                </button>
                                <span className="inline-flex items-center gap-1 font-medium text-dark-500 dark:text-dark-400">
                                  <Activity size={14} className="text-emerald-500" />
                                  {u.assignedLeads || 0} leads
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-dark-400 dark:text-dark-500 italic">
                                Global Oversight
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full ${
                                u.status === 'active'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                              {u.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              {/* Edit User */}
                              <button
                                onClick={() => openEdit(u)}
                                className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 text-blue-600 dark:text-blue-400 transition-colors"
                                title="Edit Profile & Role"
                              >
                                <Edit2 size={16} />
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={() => setResetPasswordUser(u)}
                                className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 text-indigo-600 dark:text-indigo-400 transition-colors"
                                title="Reset User Password"
                              >
                                <KeyRound size={16} />
                              </button>

                              {/* Reassign Workload (users only) */}
                              {(u.role === 'telecaller' || u.role === 'user') && (
                                <button
                                  onClick={() => openTransferModal(u._id)}
                                  className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 text-amber-600 dark:text-amber-400 transition-colors"
                                  title="Transfer Assigned Workload to another user"
                                >
                                  <ArrowRightLeft size={16} />
                                </button>
                              )}

                              {/* Toggle Active / Inactive (Protected for self) */}
                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={isSelf}
                                className={`p-2 rounded-lg transition-colors ${
                                  isSelf
                                    ? 'opacity-30 cursor-not-allowed text-dark-400'
                                    : u.status === 'active'
                                    ? 'hover:bg-yellow-50 dark:hover:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400'
                                    : 'hover:bg-green-50 dark:hover:bg-green-950/40 text-green-600 dark:text-green-400'
                                }`}
                                title={
                                  isSelf
                                    ? 'Cannot disable your own active admin account'
                                    : u.status === 'active'
                                    ? 'Disable User Account'
                                    : 'Enable User Account'
                                }
                              >
                                {u.status === 'active' ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>

                              {/* Delete (Protected for self) */}
                              <button
                                onClick={() => setDeleteConfirm(u)}
                                disabled={isSelf}
                                className={`p-2 rounded-lg transition-colors ${
                                  isSelf
                                    ? 'opacity-30 cursor-not-allowed text-dark-400'
                                    : 'hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400'
                                }`}
                                title={isSelf ? 'Cannot delete your own admin account' : 'Delete User'}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Workload & Reassignment Hub */}
      {activeTab === 'workload' && (
        <div className="space-y-6">
          {/* Unassigned Customer Alert Queue */}
          {unassignedList.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-0.5">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-amber-900 dark:text-amber-200">
                      {unassignedList.length} Customer Account(s) Are Currently Unassigned!
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                      These customers are not being actively nurtured by any agent. Distribute them now in one click.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <select
                    value={unassignedBatchAgentId}
                    onChange={(e) => setUnassignedBatchAgentId(e.target.value)}
                    className="px-3 py-2 text-xs sm:text-sm bg-white dark:bg-dark-800 border border-amber-300 dark:border-amber-700 rounded-xl text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select Target User...</option>
                    {telecallers.map((tc) => (
                      <option key={tc._id} value={tc._id}>
                        {tc.name} ({tc.assignedCustomers || 0} clients)
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleAssignAllUnassigned}
                    disabled={isAssigningUnassigned || !unassignedBatchAgentId}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isAssigningUnassigned && <Loader2 size={14} className="animate-spin" />}
                    Assign All to User
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Workload Banner & Quick Action */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-dark-900 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft className="text-primary-600" size={20} />
                  User Workload Balancer & Reassignment Tool
                </h3>
                <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-1 max-w-2xl">
                  Rebalance customer portfolios or instantly transfer all assigned accounts and active leads when a user is on leave, reassigned, or inactive.
                </p>
              </div>
              <button
                onClick={() => openTransferModal('')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm self-start md:self-auto"
              >
                <ArrowRightLeft size={16} />
                Bulk Transfer Clients
              </button>
            </div>
          </div>

          {/* Telecaller Workload Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users
              .filter((u) => u.role === 'telecaller')
              .map((tc) => (
                <div
                  key={tc._id}
                  className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-xs flex flex-col justify-between hover:border-dark-300 dark:hover:border-dark-600 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center">
                          {initials(tc.name)}
                        </div>
                        <div>
                          <h4 className="font-bold text-dark-900 dark:text-white">{tc.name}</h4>
                          <p className="text-xs text-dark-500 dark:text-dark-400">{tc.email}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tc.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                        }`}
                      >
                        {tc.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-dark-100 dark:border-dark-700/60">
                      <div className="bg-dark-50 dark:bg-dark-900/40 p-3 rounded-xl border border-dark-100 dark:border-dark-700/50">
                        <span className="text-xs text-dark-500 dark:text-dark-400">Assigned Clients</span>
                        <p className="text-xl font-bold text-dark-900 dark:text-white mt-0.5">
                          {tc.assignedCustomers || 0}
                        </p>
                      </div>
                      <div className="bg-dark-50 dark:bg-dark-900/40 p-3 rounded-xl border border-dark-100 dark:border-dark-700/50">
                        <span className="text-xs text-dark-500 dark:text-dark-400">Active Leads</span>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {tc.assignedLeads || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-dark-100 dark:border-dark-700/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openInspector(tc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 text-dark-700 dark:text-dark-300 text-xs font-semibold transition-colors"
                      title="Inspect user clients list"
                    >
                      <Users size={13} />
                      Inspect Portfolio
                    </button>

                    <button
                      onClick={() => openTransferModal(tc._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-semibold transition-colors"
                    >
                      <ArrowRightLeft size={13} />
                      Transfer All
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 6. Tab 3: System Audit Activity Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
          {/* Header & Filter */}
          <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-50/40 dark:bg-dark-900/30">
            <div>
              <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <Clock className="text-primary-600" size={18} />
                Live User Activity & Communications Audit Log
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Real-time chronological activity records across all users and channels.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditActorFilter}
                onChange={(e) => setAuditActorFilter(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg text-xs sm:text-sm text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Users</option>
                {users.map((u) => (
                  <option key={u._id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => loadData(true)}
                className="p-1.5 rounded-lg border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 text-dark-600 dark:text-dark-300"
                title="Refresh audit logs"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Audit List */}
          <div className="divide-y divide-dark-200 dark:divide-dark-700 max-h-[600px] overflow-y-auto">
            {filteredAuditLogs.length === 0 ? (
              <div className="p-12 text-center text-dark-400 dark:text-dark-500 text-sm">
                No recent activity logged in the system.
              </div>
            ) : (
              filteredAuditLogs.map((log) => {
                const isCall = log.type === 'call';
                const isWa = log.type === 'whatsapp';
                const isEmail = log.type === 'email';

                return (
                  <div key={log.id} className="p-4 hover:bg-dark-50/60 dark:hover:bg-dark-700/40 transition-colors flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                          isCall
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : isWa
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        }`}
                      >
                        {isCall ? <Phone size={16} /> : isWa ? <MessageCircle size={16} /> : <Mail size={16} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-dark-900 dark:text-white text-sm">
                            {log.actor}
                          </span>
                          <span className="text-xs text-dark-400 dark:text-dark-500">•</span>
                          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                            {log.customer}
                          </span>
                        </div>
                        <p className="text-xs text-dark-600 dark:text-dark-300 mt-1">
                          {log.details}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] text-dark-400 dark:text-dark-500 whitespace-nowrap">
                      {log.time ? new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 7. Tab 4: System Health & Diagnostics */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* SMTP Deliverability Live Test Tool */}
          <div className="bg-gradient-to-r from-blue-500/10 via-primary-500/10 to-indigo-500/10 bg-white dark:bg-dark-800 rounded-2xl border border-primary-200 dark:border-primary-800 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                  <Mail className="text-primary-600" size={19} />
                  Live SMTP Deliverability Verification Tool
                </h4>
                <p className="text-xs sm:text-sm text-dark-600 dark:text-dark-300 mt-0.5 max-w-xl">
                  Test your authenticated relay connection to <strong>send.one.com</strong> from <strong>info@paymanent.com</strong>.
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  💡 Tip: Enter your real email address (e.g. Gmail). If not found in Primary inbox, check your <strong>Spam / Junk</strong> folder.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="Enter recipient email (e.g. Gmail)..."
                  className="px-3.5 py-2 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl text-xs sm:text-sm text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-72"
                />
                <button
                  onClick={handleTestEmail}
                  disabled={isTestingEmail}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-xs whitespace-nowrap"
                >
                  {isTestingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {isTestingEmail ? 'Sending Test...' : 'Send Test'}
                </button>
              </div>
            </div>
          </div>

          {/* Integration Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SMTP Mailer */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Mail size={20} />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300">
                  <CheckCircle2 size={12} />
                  Active
                </span>
              </div>
              <h4 className="font-bold text-base text-dark-900 dark:text-white mt-3">
                Professional SMTP Mailer
              </h4>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                Connected to one.com mail relay via Port 587.
              </p>
              <div className="mt-3 pt-3 border-t border-dark-100 dark:border-dark-700/60 text-xs text-dark-600 dark:text-dark-300 space-y-1">
                <p>Host: <code className="font-mono text-dark-900 dark:text-white">send.one.com</code></p>
                <p>Sender: <code className="font-mono text-dark-900 dark:text-white">info@paymanent.com</code></p>
              </div>
            </div>

            {/* WhatsApp Integration */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center justify-center">
                  <MessageCircle size={20} />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300">
                  <CheckCircle2 size={12} />
                  Configured
                </span>
              </div>
              <h4 className="font-bold text-base text-dark-900 dark:text-white mt-3">
                Meta WhatsApp Cloud API
              </h4>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                Template dispatch & notifications ready.
              </p>
              <div className="mt-3 pt-3 border-t border-dark-100 dark:border-dark-700/60 text-xs text-dark-600 dark:text-dark-300 space-y-1">
                <p>API Version: <code className="font-mono text-dark-900 dark:text-white">Graph v18.0</code></p>
                <p>Automated Reminders: <span className="font-medium text-green-600 dark:text-green-400">Enabled</span></p>
              </div>
            </div>

            {/* MongoDB Database */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Database size={20} />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300">
                  <CheckCircle2 size={12} />
                  Connected
                </span>
              </div>
              <h4 className="font-bold text-base text-dark-900 dark:text-white mt-3">
                MongoDB Persistence
              </h4>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                Active connection to local database cluster.
              </p>
              <div className="mt-3 pt-3 border-t border-dark-100 dark:border-dark-700/60 text-xs text-dark-600 dark:text-dark-300 space-y-1">
                <p>Cluster: <code className="font-mono text-dark-900 dark:text-white">smart-crm</code></p>
                <p>Connection State: <span className="font-medium text-green-600 dark:text-green-400">Healthy (Ready)</span></p>
              </div>
            </div>
          </div>

          {/* CRM Collections Inventory */}
          {systemOverview?.metrics && (
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 sm:p-6 shadow-sm">
              <h4 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2 mb-4">
                <Activity size={18} className="text-primary-600" />
                Live CRM Database Records Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900/50 border border-dark-100 dark:border-dark-700/60">
                  <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">Customer Accounts</span>
                  <p className="text-2xl font-bold text-dark-900 dark:text-white mt-1">
                    {systemOverview.metrics.totalCustomers}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900/50 border border-dark-100 dark:border-dark-700/60">
                  <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">Sales Leads</span>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {systemOverview.metrics.totalLeads}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900/50 border border-dark-100 dark:border-dark-700/60">
                  <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">Follow-up Schedules</span>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {systemOverview.metrics.totalFollowUps}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900/50 border border-dark-100 dark:border-dark-700/60">
                  <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">Event Reminders</span>
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                    {systemOverview.metrics.totalEvents}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900/50 border border-dark-100 dark:border-dark-700/60">
                  <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">Call Logs Recorded</span>
                  <p className="text-2xl font-bold text-dark-900 dark:text-white mt-1">
                    {systemOverview.metrics.totalCalls}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900/50 border border-dark-100 dark:border-dark-700/60">
                  <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">WhatsApp Logs</span>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {systemOverview.metrics.totalWhatsApp}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900/50 border border-dark-100 dark:border-dark-700/60">
                  <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">Emails Dispatched</span>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {systemOverview.metrics.totalEmails}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900/50 border border-dark-100 dark:border-dark-700/60">
                  <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">User Accounts</span>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {systemOverview.metrics.totalUsers}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: User Portfolio Inspector */}
      <Modal
        isOpen={Boolean(inspectorAgent)}
        onClose={() => setInspectorAgent(null)}
        title={`Assigned Portfolio — ${inspectorAgent?.name} (${inspectorCustomers.length} Clients)`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-dark-500 dark:text-dark-400">
            Inspect all customer accounts actively assigned to this user. You can reassign individual clients directly to other users.
          </p>

          {loadingInspector ? (
            <div className="flex items-center justify-center py-10 gap-2 text-dark-500">
              <Loader2 className="animate-spin text-primary-600" size={18} />
              <span>Loading assigned customers...</span>
            </div>
          ) : inspectorCustomers.length === 0 ? (
            <div className="p-8 text-center text-dark-400 text-sm bg-dark-50 dark:bg-dark-900/50 rounded-xl">
              No clients currently assigned to this user.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-dark-200 dark:divide-dark-700 border border-dark-200 dark:border-dark-700 rounded-xl">
              {inspectorCustomers.map((c) => (
                <div key={c._id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-dark-800">
                  <div>
                    <h5 className="font-bold text-sm text-dark-900 dark:text-white">{c.name}</h5>
                    <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                      {c.company ? `${c.company} • ` : ''} {c.mobile} • {c.city || 'No City'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <select
                      onChange={(e) => handleInspectorCustomerReassign(c._id, e.target.value)}
                      defaultValue=""
                      className="px-2.5 py-1 text-xs bg-dark-50 dark:bg-dark-700 border border-dark-200 dark:border-dark-600 rounded-lg text-dark-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="" disabled>Reassign to...</option>
                      <option value="unassigned">⚠️ Set to Unassigned</option>
                      {telecallers
                        .filter((t) => t._id !== inspectorAgent?._id)
                        .map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-dark-200 dark:border-dark-700">
            <button
              onClick={() => setInspectorAgent(null)}
              className="px-4 py-2 text-sm font-medium bg-dark-100 hover:bg-dark-200 dark:bg-dark-700 dark:hover:bg-dark-600 text-dark-700 dark:text-dark-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Add / Edit User */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User Account' : 'Create New User Account'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. John Smith"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              disabled={Boolean(editingUser)}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="john@crm.com"
            />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
                Initial Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                  placeholder="Minimum 4 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="telecaller">Standard User</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
                Phone Number
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-dark-200 dark:border-dark-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {editingUser ? 'Update Account' : 'Create User Account'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Reset Password */}
      <Modal
        isOpen={Boolean(resetPasswordUser)}
        onClose={() => {
          setResetPasswordUser(null);
          setNewPassword('');
        }}
        title={`Reset Password — ${resetPasswordUser?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-dark-500 dark:text-dark-400">
            Enter a new password for <strong className="text-dark-900 dark:text-white">{resetPasswordUser?.email}</strong>. This will log out all existing sessions on other devices.
          </p>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
              New Password <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Minimum 4 characters"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-dark-200 dark:border-dark-700">
            <button
              type="button"
              onClick={() => {
                setResetPasswordUser(null);
                setNewPassword('');
              }}
              className="px-4 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              Reset Password
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Transfer Workload */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Workload & Assigned Customers"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5">
            <Info size={17} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              This action will transfer all assigned customer accounts and associated leads from the source user to the target user in bulk.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
              Source User (Transfer From) <span className="text-red-500">*</span>
            </label>
            <select
              value={transferForm.fromUserId}
              onChange={(e) => setTransferForm({ ...transferForm, fromUserId: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select source user</option>
              {users
                .filter((u) => u.role === 'telecaller' || u.role === 'user')
                .map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.assignedCustomers || 0} clients, {u.assignedLeads || 0} leads)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
              Target User (Transfer To) <span className="text-red-500">*</span>
            </label>
            <select
              value={transferForm.toUserId}
              onChange={(e) => setTransferForm({ ...transferForm, toUserId: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select target active user</option>
              {telecallers
                .filter((u) => u._id !== transferForm.fromUserId)
                .map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.assignedCustomers || 0} currently)
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-dark-200 dark:border-dark-700">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteTransfer}
              disabled={transferring || !transferForm.fromUserId || !transferForm.toUserId}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {transferring && <Loader2 size={16} className="animate-spin" />}
              Transfer Workload Now
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE DIALOG (with Workload Warning) */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={`Delete User — ${deleteConfirm?.name}`}
        message={
          deleteConfirm?.assignedCustomers > 0
            ? `Warning: "${deleteConfirm?.name}" currently has ${deleteConfirm?.assignedCustomers} assigned customer account(s) and ${deleteConfirm?.assignedLeads} active lead(s). Deleting will move them to 'Unassigned'. You can also cancel and use 'Transfer Workload' first.`
            : `Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`
        }
        confirmText="Confirm Delete"
        type="danger"
      />
    </div>
  );
}
