import { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpDown,
  Plus,
  CheckCircle2,
  Phone,
  Users,
  CreditCard,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  ArrowUpRight,
  ArrowLeft,
  Calendar,
  RefreshCw,
  SlidersHorizontal,
  Download,
  Edit,
  Trash2,
  Search,
  Key,
  Check,
  Copy,
  ShieldCheck,
  Bot,
  FileText,
  Clock,
  Radio,
  Share2,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { getUsers, updateUser, deleteUser } from '../api/users';
import TeamCallHistoryTable from '../components/TeamCallHistoryTable';

export default function Teams({ onNavigate, onOpenBuyNumber }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Organizations list
  const [teams, setTeams] = useState(() => {
    try {
      const saved = localStorage.getItem('smartcrm_teams');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Create Team Modal State
  const defaultNewTeam = {
    name: '',
    department: 'Sales & Outbound Telecalling',
    number: '',
    backupNumber: '',
    teamLead: '',
    selectedMemberIds: [],
    leadsQuota: 5000,
    dailyCallTarget: 50,
    shift: 'General Day Shift (09:30 AM – 06:30 PM)',
    workingDays: 'Monday to Saturday (6 days)',
    callRecording: true,
    status: 'Active',
    description: '',
  };
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [newTeamForm, setNewTeamForm] = useState(defaultNewTeam);

  // Selected Team for Detail View (matching 5 screenshots)
  const [selectedTeamForDetails, setSelectedTeamForDetails] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('summary'); // 'summary' | 'insights' | 'settings' | 'call-history' | 'staff' | 'plan-history' | 'facebook'

  // Selected organizations filter tags in list view
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  // Sorting in list view
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(true);

  // Active Modals
  const [renewingTeam, setRenewingTeam] = useState(null);
  const [addonTeam, setAddonTeam] = useState(null);
  const [selectedAddon, setSelectedAddon] = useState('seat');

  // Detail View State: Insights
  const [insightsPeriod, setInsightsPeriod] = useState('09 Oct 2026 – 09 Oct 2026');
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [staffInsightsOpen, setStaffInsightsOpen] = useState(false);

  // Detail View State: Settings
  const [callRecordingEnabled, setCallRecordingEnabled] = useState(true);
  const [backupNumber, setBackupNumber] = useState('');
  const [isEditBackupModalOpen, setIsEditBackupModalOpen] = useState(false);
  const [tempBackupNumber, setTempBackupNumber] = useState('');
  const [apiKeys, setApiKeys] = useState([]);
  const [isAddApiKeyModalOpen, setIsAddApiKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  // Detail View State: Staff
  const [staffSearchName, setStaffSearchName] = useState('');
  const [staffSearchPhone, setStaffSearchPhone] = useState('');
  const [staffStateFilter, setStaffStateFilter] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('');
  const [staffSearchNameOpen, setStaffSearchNameOpen] = useState(false);
  const [staffSearchPhoneOpen, setStaffSearchPhoneOpen] = useState(false);
  const [staffStateFilterOpen, setStaffStateFilterOpen] = useState(false);
  const [staffRoleFilterOpen, setStaffRoleFilterOpen] = useState(false);
  const [openStateDropdownId, setOpenStateDropdownId] = useState(null);
  const [openRoleDropdownId, setOpenRoleDropdownId] = useState(null);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', phone: '', role: 'Member' });
  const [staffList, setStaffList] = useState([]);

  // Sync staff from backend MongoDB Atlas users API
  useEffect(() => {
    getUsers({ limit: 100 })
      .then((res) => {
        if (res.users) {
          const apiMapped = res.users.map((u) => ({
            id: u._id,
            name: u.name,
            phone: u.phone || '-',
            state: u.status === 'inactive' ? 'Inactive' : 'Active',
            role:
              u.role === 'admin' || u.role === 'owner'
                ? 'Owner'
                : u.role === 'manager'
                ? 'Manager'
                : u.role === 'telecaller'
                ? 'Lead'
                : 'Member',
          }));
          setStaffList(apiMapped);
        }
      })
      .catch(() => {});
  }, []);

  // Detail View State: Plan History
  const [planHistoryList] = useState([]);

  // Detail View State: Edit Team Modal
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');

  const removeOrgFilter = (num, e) => {
    e.stopPropagation();
    setSelectedOrgs((prev) => prev.filter((n) => n !== num));
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredTeams = useMemo(() => {
    let result = teams;
    if (selectedOrgs.length > 0) {
      result = result.filter((t) => selectedOrgs.includes(t.number));
    }
    return [...result].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [teams, selectedOrgs, sortField, sortAsc]);

  const handleCreateTeam = (e) => {
    e.preventDefault();
    if (!newTeamForm.name.trim()) {
      addToast('Please enter a team name', 'error');
      return;
    }

    const assignedStaff = staffList.filter((s) => newTeamForm.selectedMemberIds.includes(s.id));
    const randomTeamId = `TM-${Math.floor(1000 + Math.random() * 9000)}`;
    const nextId = teams.length > 0 ? Math.max(...teams.map((t) => Number(t.id) || 0)) + 1 : 1;

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const expStr = `${expiryDate.getDate().toString().padStart(2, '0')}/${(expiryDate.getMonth() + 1).toString().padStart(2, '0')}/${expiryDate.getFullYear()}`;

    const created = {
      id: nextId,
      teamId: randomTeamId,
      name: newTeamForm.name.trim(),
      department: newTeamForm.department,
      number: newTeamForm.number.trim() || 'Virtual Line Pending',
      backupNumber: newTeamForm.backupNumber.trim() || '-',
      teamLead: newTeamForm.teamLead || (assignedStaff[0]?.name || 'Unassigned'),
      status: newTeamForm.status || 'Active',
      staffActive: assignedStaff.length,
      staffTotal: Math.max(assignedStaff.length, 5),
      staffMembers: assignedStaff,
      leadsUsed: 0,
      leadsTotal: Number(newTeamForm.leadsQuota) || 5000,
      dailyCallTarget: Number(newTeamForm.dailyCallTarget) || 50,
      shift: newTeamForm.shift,
      workingDays: newTeamForm.workingDays,
      callRecording: Boolean(newTeamForm.callRecording),
      description: newTeamForm.description.trim(),
      expiryDate: expStr,
      plan: 'Unlimited All-in-One Pro',
    };

    const updated = [...teams, created];
    setTeams(updated);
    try {
      localStorage.setItem('smartcrm_teams', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    setIsCreateTeamModalOpen(false);
    setNewTeamForm(defaultNewTeam);
    addToast(`Team "${created.name}" created successfully with ${assignedStaff.length} member(s)!`, 'success');
  };

  const handleRenewSuccess = () => {
    const target = renewingTeam || selectedTeamForDetails;
    if (!target) return;
    addToast(`Plan for ${target.name} renewed successfully for 12 months!`, 'success');
    setRenewingTeam(null);
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMember.name.trim() || !newMember.phone.trim()) {
      addToast('Please enter both name and phone number', 'error');
      return;
    }
    const created = {
      id: Date.now(),
      name: newMember.name.trim(),
      phone: newMember.phone.trim(),
      state: 'Active',
      role: newMember.role,
    };
    setStaffList([...staffList, created]);
    setIsAddMemberModalOpen(false);
    setNewMember({ name: '', phone: '', role: 'Member' });
    addToast(`Member "${created.name}" added to team!`, 'success');
  };

  const handleDeleteMember = async (id, name) => {
    const ok = await confirm({
      title: 'Remove Team Member',
      message: `Are you sure you want to remove "${name}" from this team?`,
      confirmText: 'Remove Member',
      type: 'danger',
    });
    if (!ok) return;

    if (id && typeof id === 'string' && id.length === 24) {
      deleteUser(id).catch(() => {});
    }

    setStaffList((prev) => prev.filter((s) => s.id !== id));
    addToast(`${name} removed from team.`, 'info');
  };

  const handleCreateApiKey = (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      addToast('Please enter API key title', 'error');
      return;
    }
    const createdKey = {
      id: apiKeys.length + 1,
      name: newKeyName.trim(),
      key: `sk_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      createdAt: 'Just now',
    };
    setApiKeys([...apiKeys, createdKey]);
    setIsAddApiKeyModalOpen(false);
    setNewKeyName('');
    addToast(`API Key "${createdKey.name}" generated successfully!`, 'success');
  };

  const handleUpdateStaffState = async (staffId, newState) => {
    const staff = staffList.find((s) => s.id === staffId);
    const ok = await confirm({
      title: 'Update Member Status',
      message: `Are you sure you want to update status for ${staff?.name || 'this member'} to "${newState}"?`,
      confirmText: `Set to ${newState}`,
      type: newState === 'Active' ? 'primary' : 'warning',
    });
    if (!ok) {
      setOpenStateDropdownId(null);
      return;
    }

    if (staffId && typeof staffId === 'string' && staffId.length === 24) {
      updateUser(staffId, { active: newState === 'Active' }).catch(() => {});
    }

    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, state: newState } : s))
    );
    setOpenStateDropdownId(null);
    addToast(`Status updated to "${newState}"`, 'success');
  };

  const handleUpdateStaffRole = async (staffId, newRole) => {
    const staff = staffList.find((s) => s.id === staffId);
    const ok = await confirm({
      title: 'Change Member Role',
      message: `Are you sure you want to change the role of ${staff?.name || 'this member'} to "${newRole}"?`,
      confirmText: `Assign ${newRole}`,
      type: 'primary',
    });
    if (!ok) {
      setOpenRoleDropdownId(null);
      return;
    }

    if (staffId && typeof staffId === 'string' && staffId.length === 24) {
      const backendRole =
        newRole === 'Owner'
          ? 'owner'
          : newRole === 'Admin'
          ? 'admin'
          : newRole === 'Manager'
          ? 'manager'
          : newRole === 'AI Agent'
          ? 'ai_agent'
          : 'member';
      updateUser(staffId, { role: backendRole }).catch(() => {});
    }

    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, role: newRole } : s))
    );
    setOpenRoleDropdownId(null);
    addToast(`Role updated to "${newRole}"`, 'success');
  };

  const handleOpenEditMember = (staff) => {
    setEditingMember({ ...staff });
    setIsEditMemberModalOpen(true);
  };

  const handleSaveEditMember = async (e) => {
    e.preventDefault();
    if (!editingMember.name.trim() || !editingMember.phone.trim()) {
      addToast('Please enter both name and phone number', 'error');
      return;
    }
    const ok = await confirm({
      title: 'Save Member Changes',
      message: `Are you sure you want to update member "${editingMember.name}" with role "${editingMember.role}" and status "${editingMember.state}"?`,
      confirmText: 'Save Changes',
      type: 'primary',
    });
    if (!ok) return;
    setStaffList((prev) =>
      prev.map((s) => (s.id === editingMember.id ? editingMember : s))
    );
    setIsEditMemberModalOpen(false);
    addToast(`Member "${editingMember.name}" updated successfully!`, 'success');
  };

  const filteredStaff = staffList.filter((s) => {
    const matchName = s.name.toLowerCase().includes(staffSearchName.toLowerCase());
    const matchPhone = s.phone.toLowerCase().includes(staffSearchPhone.toLowerCase());
    const matchState = !staffStateFilter || s.state.toLowerCase() === staffStateFilter.toLowerCase();
    const matchRole = !staffRoleFilter || s.role.toLowerCase() === staffRoleFilter.toLowerCase();
    return matchName && matchPhone && matchState && matchRole;
  });

  // =========================================================================
  // VIEW 1: DEDICATED TEAM / ORG PORTAL DETAILS VIEW (MATCHING ALL 5 SCREENSHOTS)
  // =========================================================================
  if (selectedTeamForDetails) {
    const currentTeam = selectedTeamForDetails;

    return (
      <div className="space-y-5 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedTeamForDetails(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Teams Directory</span>
          </button>
        </div>

        {/* Top Header Card matching Screenshot 1 */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-100 dark:border-dark-700/80 pb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">
              Org Name: <span className="text-blue-600 dark:text-blue-400">{currentTeam.name}</span>
            </h1>

            <button
              onClick={() => onNavigate?.('plans-billing')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Plans & Billing</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Sub-navigation Tabs matching screenshots */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-dark-100 dark:border-dark-700/60 text-xs sm:text-sm font-semibold">
            {[
              { id: 'summary', label: 'Summary' },
              { id: 'insights', label: 'Insights' },
              { id: 'settings', label: 'Settings' },
              { id: 'call-history', label: 'Call History' },
              { id: 'staff', label: 'Staff' },
              { id: 'plan-history', label: 'Plan History' },
              { id: 'facebook', label: 'Facebook' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDetailTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  activeDetailTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/30'
                    : 'text-dark-600 dark:text-dark-300 hover:text-dark-900 hover:bg-dark-50 dark:hover:bg-dark-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* -------------------------------------------------------------
              TAB 1: SUMMARY (MATCHING SCREENSHOT 1)
              ------------------------------------------------------------- */}
          {activeDetailTab === 'summary' && (
            <div className="space-y-6 pt-2">
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => {
                    setEditTeamName(currentTeam.name);
                    setIsEditTeamModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-bold text-dark-800 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 shadow-2xs transition-colors cursor-pointer"
                >
                  EDIT
                </button>
                <button
                  onClick={() => setRenewingTeam(currentTeam)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
                >
                  Renew Plan
                </button>
              </div>

              {/* 2-Column Key Values matching Screenshot 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 text-sm pt-2">
                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Team Name:{' '}
                    <span className="font-normal text-dark-700 dark:text-dark-300">{currentTeam.name}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Team ID:{' '}
                    <span className="font-normal text-dark-700 dark:text-dark-300">{currentTeam.teamId}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Virtual Number:{' '}
                    <span className="font-normal font-mono text-dark-700 dark:text-dark-300">
                      {currentTeam.number}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Department:{' '}
                    <span className="font-normal text-dark-700 dark:text-dark-300">
                      {currentTeam.department || 'Sales & Telecalling'}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Team Leader:{' '}
                    <span className="font-normal text-dark-700 dark:text-dark-300">
                      {currentTeam.teamLead || 'Unassigned'}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Backup Number:{' '}
                    <span className="font-normal font-mono text-dark-700 dark:text-dark-300">
                      {currentTeam.backupNumber || '-'}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Operating Shift:{' '}
                    <span className="font-normal text-dark-700 dark:text-dark-300">
                      {currentTeam.shift || '09:30 AM – 06:30 PM'}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Working Days:{' '}
                    <span className="font-normal text-dark-700 dark:text-dark-300">
                      {currentTeam.workingDays || 'Monday to Saturday'}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Call Recording:{' '}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {currentTeam.callRecording !== false ? 'Enabled (100% Audio Transcripts)' : 'Disabled'}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Daily Call Target:{' '}
                    <span className="font-normal text-dark-700 dark:text-dark-300">
                      {currentTeam.dailyCallTarget ? `${currentTeam.dailyCallTarget} calls / agent` : '50 calls / agent'}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Leads Allocation:{' '}
                    <span className="font-normal text-dark-700 dark:text-dark-300">
                      {currentTeam.leadsUsed || 0} / {currentTeam.leadsTotal || 5000} leads
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-dark-900 dark:text-white font-bold">
                    Expiry Date:{' '}
                    <span className="font-normal text-dark-700 dark:text-dark-300">
                      {currentTeam.expiryDate || '14/10/2027'}
                    </span>
                  </p>
                </div>

                {currentTeam.description && (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-dark-900 dark:text-white font-bold">
                      Team Objective / Description:{' '}
                      <span className="font-normal text-dark-700 dark:text-dark-300">
                        {currentTeam.description}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              TAB 2: INSIGHTS (MATCHING SCREENSHOT 2)
              ------------------------------------------------------------- */}
          {activeDetailTab === 'insights' && (
            <div className="space-y-6 pt-2">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-dark-700 dark:text-dark-300">Period:</span>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-800 dark:text-dark-200 shadow-2xs">
                    <span>{insightsPeriod}</span>
                    <Calendar size={13} className="text-dark-400" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onNavigate?.('call-reports')}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    View Detailed Insights
                  </button>
                  <span className="text-dark-400">Last Updated On: 09/10/26 07:00 PM</span>
                  <button
                    onClick={() => {
                      setIsRefreshingInsights(true);
                      setTimeout(() => {
                        setIsRefreshingInsights(false);
                        addToast('Insights data refreshed!', 'success');
                      }, 600);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs cursor-pointer"
                  >
                    <RefreshCw size={12} className={isRefreshingInsights ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Call Insights Card (8 metrics in 4x2 grid) */}
              <div className="rounded-2xl border border-dark-200 dark:border-dark-700 p-5 space-y-4 bg-white dark:bg-dark-800 shadow-2xs">
                <h3 className="text-sm font-bold text-dark-900 dark:text-white">Call Insights</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 text-xs">
                  <div>
                    <p className="text-dark-500 font-medium">Outgoing Calls</p>
                    <p className="text-xl font-bold font-mono text-dark-900 dark:text-white mt-1">56</p>
                  </div>
                  <div>
                    <p className="text-dark-500 font-medium">Incoming Calls</p>
                    <p className="text-xl font-bold font-mono text-dark-900 dark:text-white mt-1">7</p>
                  </div>
                  <div>
                    <p className="text-dark-500 font-medium">Connected Calls</p>
                    <p className="text-xl font-bold font-mono text-dark-900 dark:text-white mt-1">17</p>
                  </div>
                  <div>
                    <p className="text-dark-500 font-medium">Received Calls</p>
                    <p className="text-xl font-bold font-mono text-dark-900 dark:text-white mt-1">2</p>
                  </div>

                  <div>
                    <p className="text-dark-500 font-medium">Missed Calls</p>
                    <p className="text-xl font-bold font-mono text-dark-900 dark:text-white mt-1">5</p>
                  </div>
                  <div>
                    <p className="text-dark-500 font-medium">Total Talk Time</p>
                    <p className="text-xl font-bold font-mono text-dark-900 dark:text-white mt-1">24m 22s</p>
                  </div>
                  <div>
                    <p className="text-dark-500 font-medium">Avg. Outgoing Call Duration</p>
                    <p className="text-xl font-bold font-mono text-dark-900 dark:text-white mt-1">1m 14s</p>
                  </div>
                  <div>
                    <p className="text-dark-500 font-medium">Avg. Incoming Call Duration</p>
                    <p className="text-xl font-bold font-mono text-dark-900 dark:text-white mt-1">1m 37s</p>
                  </div>
                </div>
              </div>

              {/* Customer Insights Card (2 metrics) */}
              <div className="rounded-2xl border border-dark-200 dark:border-dark-700 p-5 space-y-4 bg-white dark:bg-dark-800 shadow-2xs">
                <h3 className="text-sm font-bold text-dark-900 dark:text-white">Customer Insights</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-dark-500 font-medium">Unique Customers</p>
                    <p className="text-xl font-bold font-mono text-dark-900 dark:text-white mt-1">45</p>
                  </div>
                  <div>
                    <p className="text-dark-500 font-medium">Missed Customers</p>
                    <p className="text-xl font-bold font-mono text-dark-900 dark:text-white mt-1">0</p>
                  </div>
                </div>
              </div>

              {/* Staff Level Insights Accordion */}
              <div className="rounded-2xl border border-dark-200 dark:border-dark-700 overflow-hidden bg-white dark:bg-dark-800 shadow-2xs">
                <button
                  onClick={() => setStaffInsightsOpen(!staffInsightsOpen)}
                  className="w-full p-4 flex items-center justify-between text-left text-sm font-bold text-dark-900 dark:text-white hover:bg-dark-50 dark:hover:bg-dark-700/50 transition-colors"
                >
                  <span>Staff Level Insights</span>
                  {staffInsightsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {staffInsightsOpen && (
                  <div className="p-4 border-t border-dark-100 dark:border-dark-700/80 text-xs space-y-2">
                    <p className="text-dark-500">Breakdown of calls handled by staff in this team:</p>
                    <div className="divide-y divide-dark-100 dark:divide-dark-700/60 font-medium">
                      {staffList.map((st) => (
                        <div key={st.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-dark-900 dark:text-white">{st.name}</span>
                            <span className="text-[11px] text-dark-400 ml-2 font-mono">({st.phone})</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {st.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              TAB 3: SETTINGS (MATCHING SCREENSHOT 3)
              ------------------------------------------------------------- */}
          {activeDetailTab === 'settings' && (
            <div className="space-y-6 pt-2 text-xs">
              {/* Call Recording Toggle */}
              <div className="flex items-center gap-8 py-2">
                <span className="font-bold text-dark-900 dark:text-white text-sm">Call Recording:</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !callRecordingEnabled;
                    setCallRecordingEnabled(next);
                    addToast(`Call recording ${next ? 'enabled' : 'disabled'} for team`, 'info');
                  }}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    callRecordingEnabled ? 'bg-blue-600' : 'bg-dark-300 dark:bg-dark-600'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      callRecordingEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Backup Number */}
              <div className="flex items-center gap-6 py-2">
                <span className="font-bold text-dark-900 dark:text-white text-sm">Backup Number:</span>
                <span className="font-mono text-sm font-semibold text-dark-800 dark:text-dark-200">
                  {backupNumber}
                </span>
                <button
                  onClick={() => {
                    setTempBackupNumber(backupNumber);
                    setIsEditBackupModalOpen(true);
                  }}
                  className="px-3 py-1 rounded-lg border border-dark-200 dark:border-dark-700 text-xs font-semibold hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer shadow-2xs"
                >
                  Edit
                </button>
                <a
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    addToast('Calls forward to your backup SIM whenever internet is unreachable', 'info');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                >
                  See how it works
                </a>
              </div>

              {/* API Key Section */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-dark-900 dark:text-white">API Keys</h4>
                  <button
                    onClick={() => setIsAddApiKeyModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Add API Key</span>
                  </button>
                </div>

                <div className="border border-dark-200 dark:border-dark-700 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-dark-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-dark-50/70 dark:bg-dark-900/60 border-b border-dark-200 dark:border-dark-700 text-dark-500 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4 w-16">S.No.</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">API Key</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60 font-medium">
                      {apiKeys.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-dark-400">
                            <div className="space-y-2">
                              <Key size={24} className="mx-auto text-dark-300 dark:text-dark-600" />
                              <p className="text-xs font-semibold text-dark-500">No data</p>
                              <p className="text-[11px] text-dark-400">Generate an API key to connect your webhooks and external telephony</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        apiKeys.map((key, idx) => (
                          <tr key={key.id} className="hover:bg-dark-50/50">
                            <td className="py-3 px-4 font-mono">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-dark-900 dark:text-white">{key.name}</td>
                            <td className="py-3 px-4 font-mono text-dark-600 dark:text-dark-300">
                              {key.key.slice(0, 12)}••••••••••••
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  navigator.clipboard?.writeText(key.key);
                                  addToast('API key copied to clipboard', 'success');
                                }}
                                className="text-blue-600 hover:underline font-semibold"
                              >
                                Copy
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              TAB 4: CALL HISTORY (MATCHING SCREENSHOT)
              ------------------------------------------------------------- */}
          {activeDetailTab === 'call-history' && (
            <div className="pt-2">
              <TeamCallHistoryTable
                teamName={currentTeam.name}
                sfNumber={currentTeam.number}
                onNavigate={onNavigate}
              />
            </div>
          )}

          {/* -------------------------------------------------------------
              TAB 5: STAFF (MATCHING SCREENSHOT 4)
              ------------------------------------------------------------- */}
          {activeDetailTab === 'staff' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add Member</span>
                </button>

                <div className="w-6 h-6 rounded-full border border-dark-300 text-dark-500 flex items-center justify-center text-xs font-bold" title="Team members with line extensions">
                  i
                </div>
              </div>

              {/* Active Filter Chips Bar (if any filter is applied) */}
              {(staffSearchName || staffSearchPhone || staffStateFilter || staffRoleFilter) && (
                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 text-xs">
                  <span className="font-bold text-blue-800 dark:text-blue-300">Active Filters:</span>
                  {staffSearchName && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-dark-800 text-dark-800 dark:text-dark-200 border border-dark-200 dark:border-dark-700 font-medium">
                      Name: &quot;{staffSearchName}&quot;
                      <button onClick={() => setStaffSearchName('')} className="hover:text-rose-600 cursor-pointer"><X size={12} /></button>
                    </span>
                  )}
                  {staffSearchPhone && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-dark-800 text-dark-800 dark:text-dark-200 border border-dark-200 dark:border-dark-700 font-medium">
                      Phone: &quot;{staffSearchPhone}&quot;
                      <button onClick={() => setStaffSearchPhone('')} className="hover:text-rose-600 cursor-pointer"><X size={12} /></button>
                    </span>
                  )}
                  {staffStateFilter && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-dark-800 text-dark-800 dark:text-dark-200 border border-dark-200 dark:border-dark-700 font-medium">
                      State: {staffStateFilter}
                      <button onClick={() => setStaffStateFilter('')} className="hover:text-rose-600 cursor-pointer"><X size={12} /></button>
                    </span>
                  )}
                  {staffRoleFilter && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-dark-800 text-dark-800 dark:text-dark-200 border border-dark-200 dark:border-dark-700 font-medium">
                      Role: {staffRoleFilter}
                      <button onClick={() => setStaffRoleFilter('')} className="hover:text-rose-600 cursor-pointer"><X size={12} /></button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setStaffSearchName('');
                      setStaffSearchPhone('');
                      setStaffStateFilter('');
                      setStaffRoleFilter('');
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline ml-auto cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* Staff Table matching Screenshot 4 */}
              <div className="border border-dark-200 dark:border-dark-700 rounded-2xl overflow-visible shadow-2xs bg-white dark:bg-dark-800">
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f0f7ff] dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 text-dark-700 dark:text-dark-300 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3.5 px-4 min-w-[200px] relative">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => {
                                setStaffSearchPhoneOpen(false);
                                setStaffStateFilterOpen(false);
                                setStaffRoleFilterOpen(false);
                                setStaffSearchNameOpen(!staffSearchNameOpen);
                              }}
                              className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] hover:text-blue-600 transition-colors cursor-pointer group"
                              title="Search by Name"
                            >
                              <span>Name</span>
                              <Search
                                size={12}
                                className={`${
                                  staffSearchName ? 'text-blue-600 font-bold' : 'text-dark-400 group-hover:text-blue-600'
                                } transition-colors`}
                              />
                              {staffSearchName && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                            </button>

                            {staffSearchNameOpen && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setStaffSearchNameOpen(false)} />
                                <div className="absolute left-0 top-full mt-2 z-30 w-56 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-2.5 text-xs normal-case font-normal animate-in fade-in zoom-in-95">
                                  <div className="text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5">
                                    Search by Name
                                  </div>
                                  <input
                                    type="text"
                                    value={staffSearchName}
                                    onChange={(e) => setStaffSearchName(e.target.value)}
                                    placeholder="Type name..."
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  {staffSearchName && (
                                    <button
                                      onClick={() => {
                                        setStaffSearchName('');
                                        setStaffSearchNameOpen(false);
                                      }}
                                      className="mt-1.5 text-[11px] text-rose-600 hover:underline font-semibold block text-right w-full cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </th>

                        <th className="py-3.5 px-4 min-w-[180px] relative">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => {
                                setStaffSearchNameOpen(false);
                                setStaffStateFilterOpen(false);
                                setStaffRoleFilterOpen(false);
                                setStaffSearchPhoneOpen(!staffSearchPhoneOpen);
                              }}
                              className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] hover:text-blue-600 transition-colors cursor-pointer group"
                              title="Search by Phone"
                            >
                              <span>Phone</span>
                              <Search
                                size={12}
                                className={`${
                                  staffSearchPhone ? 'text-blue-600 font-bold' : 'text-dark-400 group-hover:text-blue-600'
                                } transition-colors`}
                              />
                              {staffSearchPhone && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                            </button>

                            {staffSearchPhoneOpen && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setStaffSearchPhoneOpen(false)} />
                                <div className="absolute left-0 top-full mt-2 z-30 w-56 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-2.5 text-xs normal-case font-normal animate-in fade-in zoom-in-95">
                                  <div className="text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5">
                                    Search by Phone
                                  </div>
                                  <input
                                    type="text"
                                    value={staffSearchPhone}
                                    onChange={(e) => setStaffSearchPhone(e.target.value)}
                                    placeholder="Type phone..."
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  {staffSearchPhone && (
                                    <button
                                      onClick={() => {
                                        setStaffSearchPhone('');
                                        setStaffSearchPhoneOpen(false);
                                      }}
                                      className="mt-1.5 text-[11px] text-rose-600 hover:underline font-semibold block text-right w-full cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </th>

                        {/* STATE Header with Filter */}
                        <th className="py-3.5 px-4 relative">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => {
                                setStaffSearchNameOpen(false);
                                setStaffSearchPhoneOpen(false);
                                setStaffRoleFilterOpen(false);
                                setStaffStateFilterOpen(!staffStateFilterOpen);
                              }}
                              className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] hover:text-blue-600 transition-colors cursor-pointer group"
                              title="Filter by State"
                            >
                              <span>State</span>
                              <Search
                                size={12}
                                className={`${
                                  staffStateFilter ? 'text-blue-600 font-bold' : 'text-dark-400 group-hover:text-blue-600'
                                } transition-colors`}
                              />
                              {staffStateFilter && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                            </button>

                            {staffStateFilterOpen && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setStaffStateFilterOpen(false)} />
                                <div className="absolute left-0 top-full mt-2 z-30 w-40 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-1.5 text-xs normal-case font-normal animate-in fade-in zoom-in-95">
                                  <div className="px-2 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-100 dark:border-dark-700/60 mb-1">
                                    Filter State
                                  </div>
                                  {['', 'Active', 'Inactive'].map((st) => (
                                    <button
                                      key={st || 'all'}
                                      type="button"
                                      onClick={() => {
                                        setStaffStateFilter(st);
                                        setStaffStateFilterOpen(false);
                                      }}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                        staffStateFilter === st
                                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                                          : 'text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 font-medium'
                                      }`}
                                    >
                                      <span>{st || 'All States'}</span>
                                      {staffStateFilter === st && <Check size={13} className="text-blue-600 dark:text-blue-400" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </th>

                        {/* ROLE Header with Filter */}
                        <th className="py-3.5 px-4 relative">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => {
                                setStaffSearchNameOpen(false);
                                setStaffSearchPhoneOpen(false);
                                setStaffStateFilterOpen(false);
                                setStaffRoleFilterOpen(!staffRoleFilterOpen);
                              }}
                              className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] hover:text-blue-600 transition-colors cursor-pointer group"
                              title="Filter by Role"
                            >
                              <span>Role</span>
                              <Search
                                size={12}
                                className={`${
                                  staffRoleFilter ? 'text-blue-600 font-bold' : 'text-dark-400 group-hover:text-blue-600'
                                } transition-colors`}
                              />
                              {staffRoleFilter && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                            </button>

                            {staffRoleFilterOpen && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setStaffRoleFilterOpen(false)} />
                                <div className="absolute left-0 top-full mt-2 z-30 w-44 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-1.5 text-xs normal-case font-normal animate-in fade-in zoom-in-95">
                                  <div className="px-2 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-100 dark:border-dark-700/60 mb-1">
                                    Filter Role
                                  </div>
                                  {['', 'Owner', 'Manager', 'Member', 'Lead', 'AI Agent'].map((r) => (
                                    <button
                                      key={r || 'all'}
                                      type="button"
                                      onClick={() => {
                                        setStaffRoleFilter(r);
                                        setStaffRoleFilterOpen(false);
                                      }}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                        staffRoleFilter === r
                                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                                          : 'text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 font-medium'
                                      }`}
                                    >
                                      <span>{r || 'All Roles'}</span>
                                      {staffRoleFilter === r && <Check size={13} className="text-blue-600 dark:text-blue-400" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </th>

                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60 font-medium">
                      {filteredStaff.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-dark-400">
                            <p className="font-semibold text-dark-600 dark:text-dark-300">No members match your filter criteria.</p>
                            <button
                              onClick={() => {
                                setStaffSearchName('');
                                setStaffSearchPhone('');
                                setStaffStateFilter('');
                                setStaffRoleFilter('');
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline mt-1.5 cursor-pointer inline-block"
                            >
                              Reset Filters
                            </button>
                          </td>
                        </tr>
                      ) : (
                        filteredStaff.map((staff) => (
                          <tr key={staff.id} className="hover:bg-dark-50/50 dark:hover:bg-dark-700/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white">
                              {staff.name}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-dark-700 dark:text-dark-200">
                              {staff.phone}
                            </td>

                            {/* Clickable STATE cell */}
                            <td className="py-3.5 px-4 relative">
                              <div className="relative inline-block">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenRoleDropdownId(null);
                                    setOpenStateDropdownId(openStateDropdownId === staff.id ? null : staff.id);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none hover:shadow-2xs hover:scale-105 active:scale-95 ${
                                    staff.state === 'Active'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                      : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300 border-dark-200 dark:border-dark-600 hover:bg-dark-200'
                                  }`}
                                  title="Click to change state"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${staff.state === 'Active' ? 'bg-emerald-500' : 'bg-dark-400'}`} />
                                  <span>{staff.state}</span>
                                  <ChevronDown size={11} className="opacity-60" />
                                </button>

                                {openStateDropdownId === staff.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20"
                                      onClick={() => setOpenStateDropdownId(null)}
                                    />
                                    <div className="absolute left-0 top-full mt-1.5 z-30 w-36 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-1 text-xs animate-in fade-in zoom-in-95">
                                      <div className="px-2 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-100 dark:border-dark-700/60 mb-1">
                                        Change State
                                      </div>
                                      {['Active', 'Inactive'].map((st) => (
                                        <button
                                          key={st}
                                          type="button"
                                          onClick={() => handleUpdateStaffState(staff.id, st)}
                                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                            staff.state === st
                                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold'
                                              : 'text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 font-medium'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${st === 'Active' ? 'bg-emerald-500' : 'bg-dark-400'}`} />
                                            <span>{st}</span>
                                          </div>
                                          {staff.state === st && <Check size={13} className="text-emerald-600 dark:text-emerald-400" />}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Clickable ROLE cell */}
                            <td className="py-3.5 px-4 relative">
                              <div className="relative inline-block">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenStateDropdownId(null);
                                    setOpenRoleDropdownId(openRoleDropdownId === staff.id ? null : staff.id);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none hover:shadow-2xs hover:scale-105 active:scale-95 ${
                                    staff.role === 'Owner'
                                      ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                                      : staff.role === 'Manager'
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                                      : staff.role === 'AI Agent'
                                      ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100'
                                      : staff.role === 'Lead' || staff.role === 'Telecaller'
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                                      : 'bg-dark-50 text-dark-800 dark:bg-dark-900/60 dark:text-dark-100 border-dark-200 dark:border-dark-700 hover:bg-dark-100'
                                  }`}
                                  title="Click to change role"
                                >
                                  <span>{staff.role}</span>
                                  <ChevronDown size={11} className="opacity-60" />
                                </button>

                                {openRoleDropdownId === staff.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20"
                                      onClick={() => setOpenRoleDropdownId(null)}
                                    />
                                    <div className="absolute left-0 top-full mt-1.5 z-30 w-44 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-1 text-xs animate-in fade-in zoom-in-95">
                                      <div className="px-2 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-100 dark:border-dark-700/60 mb-1">
                                        Change Role
                                      </div>
                                      {['Owner', 'Admin', 'Manager', 'Member', 'AI Agent'].map((r) => (
                                        <button
                                          key={r}
                                          type="button"
                                          onClick={() => handleUpdateStaffRole(staff.id, r)}
                                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                            staff.role === r
                                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                                              : 'text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 font-medium'
                                          }`}
                                        >
                                          <span>{r}</span>
                                          {staff.role === r && <Check size={13} className="text-blue-600 dark:text-blue-400" />}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 text-dark-600 dark:text-dark-300">
                                <button
                                  onClick={() => handleOpenEditMember(staff)}
                                  className="p-1 hover:text-blue-600 transition-colors cursor-pointer"
                                  title="Edit Member"
                                >
                                  <Edit size={14} />
                                </button>
                                {staff.role !== 'Owner' && (
                                  <button
                                    onClick={() => handleDeleteMember(staff.id, staff.name)}
                                    className="p-1 hover:text-rose-600 transition-colors cursor-pointer"
                                    title="Remove Member"
                                  >
                                    <X size={15} />
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
            </div>
          )}

          {/* -------------------------------------------------------------
              TAB 6: PLAN HISTORY (MATCHING SCREENSHOT 5)
              ------------------------------------------------------------- */}
          {activeDetailTab === 'plan-history' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setRenewingTeam(currentTeam)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Renew Plan
                </button>
              </div>

              {/* Plan History Table matching Screenshot 5 */}
              <div className="border border-dark-200 dark:border-dark-700 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-dark-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f0f7ff] dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 text-dark-700 dark:text-dark-300 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3.5 px-4 w-12">
                          <div className="flex items-center gap-1">
                            <span>#</span>
                            <Search size={12} className="text-dark-400" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 min-w-[200px]">
                          <div className="flex items-center gap-1">
                            <span>Title</span>
                            <Search size={12} className="text-dark-400" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            <span>Status</span>
                            <Search size={12} className="text-dark-400" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4">Started On</th>
                        <th className="py-3.5 px-4">Valid Till</th>
                        <th className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span>Invoice</span>
                            <Search size={12} className="text-dark-400" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60 font-medium">
                      {planHistoryList.map((plan) => (
                        <tr key={plan.id} className="hover:bg-dark-50/50 dark:hover:bg-dark-700/30 transition-colors">
                          <td className="py-3.5 px-4 text-dark-500 font-mono">{plan.id}</td>
                          <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white">{plan.title}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                plan.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                  : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300'
                              }`}
                            >
                              {plan.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-dark-600 dark:text-dark-300">{plan.startedOn}</td>
                          <td className="py-3.5 px-4 text-dark-600 dark:text-dark-300">{plan.validTill}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => addToast(`Downloading invoice for ${plan.title}...`, 'success')}
                              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                            >
                              Link
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              TAB 7: FACEBOOK INTEGRATION
              ------------------------------------------------------------- */}
          {activeDetailTab === 'facebook' && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="rounded-2xl border border-dark-200 dark:border-dark-700 p-6 bg-white dark:bg-dark-800 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-dark-900 dark:text-white">
                      Meta Facebook Lead Ads & WhatsApp Sync
                    </h4>
                    <p className="text-dark-500 mt-0.5">
                      Capture leads from Facebook Ads and automatically assign to {currentTeam.name}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active & Connected
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-dark-700 dark:text-dark-300">Connected Page:</span>
                    <span className="font-bold text-blue-600">Smart CRM Official</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-dark-700 dark:text-dark-300">Lead Sync Webhook:</span>
                    <span className="font-mono text-dark-500">https://api.smartcrm.com/api/leads/webhook</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => addToast('Meta Lead Ads synced successfully!', 'success')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                  >
                    Sync Leads Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Add Member */}
        {isAddMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <form
              onSubmit={handleAddMember}
              className="bg-white dark:bg-dark-800 rounded-2xl max-w-sm w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
                <h3 className="text-base font-bold text-dark-900 dark:text-white">Add Team Member</h3>
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="text-dark-400 hover:text-dark-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                  Role
                </label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Member">Member (Frontline Agent)</option>
                  <option value="Manager">Manager (Supervisor)</option>
                  <option value="Admin">Admin (Operations)</option>
                  <option value="Owner">Owner (Organization Authority)</option>
                  <option value="AI Agent">AI Agent (Voice Bot)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-3.5 py-2 text-xs rounded-xl hover:bg-dark-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Edit Member */}
        {isEditMemberModalOpen && editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <form
              onSubmit={handleSaveEditMember}
              className="bg-white dark:bg-dark-800 rounded-2xl max-w-sm w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
                <h3 className="text-base font-bold text-dark-900 dark:text-white">Edit Team Member</h3>
                <button
                  type="button"
                  onClick={() => setIsEditMemberModalOpen(false)}
                  className="text-dark-400 hover:text-dark-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={editingMember.phone}
                  onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                  State
                </label>
                <select
                  value={editingMember.state}
                  onChange={(e) => setEditingMember({ ...editingMember, state: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                  Role
                </label>
                <select
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Owner">Owner</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Member">Member</option>
                  <option value="AI Agent">AI Agent (Voice Bot)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditMemberModalOpen(false)}
                  className="px-3.5 py-2 text-xs rounded-xl hover:bg-dark-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Add API Key */}
        {isAddApiKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <form
              onSubmit={handleCreateApiKey}
              className="bg-white dark:bg-dark-800 rounded-2xl max-w-sm w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
                <h3 className="text-base font-bold text-dark-900 dark:text-white">Generate API Key</h3>
                <button
                  type="button"
                  onClick={() => setIsAddApiKeyModalOpen(false)}
                  className="text-dark-400 hover:text-dark-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                  Key Label / Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Webhook Integration"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddApiKeyModalOpen(false)}
                  className="px-3.5 py-2 text-xs rounded-xl hover:bg-dark-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Edit Backup Number */}
        {isEditBackupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-sm w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">Edit Backup Number</h3>
              <input
                type="tel"
                value={tempBackupNumber}
                onChange={(e) => setTempBackupNumber(e.target.value)}
                placeholder="+91 95403 51818"
                className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsEditBackupModalOpen(false)}
                  className="px-3.5 py-2 text-xs rounded-xl hover:bg-dark-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setBackupNumber(tempBackupNumber.trim());
                    setIsEditBackupModalOpen(false);
                    addToast('Backup number updated successfully!', 'success');
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Save Number
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit Team Name */}
        {isEditTeamModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-sm w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">Edit Team Name</h3>
              <input
                type="text"
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                placeholder="Team Name"
                className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsEditTeamModalOpen(false)}
                  className="px-3.5 py-2 text-xs rounded-xl hover:bg-dark-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editTeamName.trim()) {
                      currentTeam.name = editTeamName.trim();
                      const updated = [...teams];
                      setTeams(updated);
                      try {
                        localStorage.setItem('smartcrm_teams', JSON.stringify(updated));
                        window.dispatchEvent(new Event('storage'));
                      } catch {}
                      setIsEditTeamModalOpen(false);
                      addToast('Team name updated!', 'success');
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: TEAMS TABLE LIST DIRECTORY (ACTIVE BADGE IS FULLY CLICKABLE)
  // =========================================================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Header Bar matching screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Title with Icon & Badge */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">
                Teams
              </h1>
              <span className="text-dark-400 dark:text-dark-500 text-sm font-normal">
                {teams.length}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5">
              Manage your organizations, members, and subscriptions.
            </p>
          </div>
        </div>

        {/* Right Filter & Action Buttons */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Select Orgs Filter Pill */}
          <div className="relative">
            <div
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-semibold text-dark-700 dark:text-dark-200 cursor-pointer shadow-2xs hover:border-dark-300"
            >
              <span className="font-bold text-dark-900 dark:text-white">Select Orgs:</span>

              {/* Tag Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedOrgs.length === 0 ? (
                  <span className="text-dark-400 font-normal">All organizations</span>
                ) : (
                  selectedOrgs.map((orgNum) => (
                    <span
                      key={orgNum}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-mono"
                    >
                      {orgNum},
                      <button
                        onClick={(e) => removeOrgFilter(orgNum, e)}
                        className="hover:text-rose-600 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              <div className="flex items-center gap-1 pl-1 text-dark-400">
                {selectedOrgs.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrgs([]);
                    }}
                    className="hover:text-dark-700 text-xs"
                    title="Clear"
                  >
                    ×
                  </button>
                )}
                <ChevronDown size={14} />
              </div>
            </div>

            {/* Dropdown options */}
            {showOrgDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 shadow-xl z-30 space-y-1">
                <p className="px-2 py-1 text-[11px] font-bold uppercase text-dark-400 tracking-wider">
                  Filter by Cloud Phone:
                </p>
                {teams.map((t) => {
                  const isChecked = selectedOrgs.includes(t.number);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedOrgs((prev) => prev.filter((n) => n !== t.number));
                        } else {
                          setSelectedOrgs((prev) => [...prev, t.number]);
                        }
                      }}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer text-xs"
                    >
                      <div>
                        <p className="font-semibold text-dark-900 dark:text-white truncate max-w-[170px]">
                          {t.name}
                        </p>
                        <p className="font-mono text-[11px] text-dark-500">{t.number}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-blue-600"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Team Button */}
          <button
            onClick={() => setIsCreateTeamModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-dark-700 dark:text-dark-200 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={15} className="text-blue-600" />
            <span>Create Team</span>
          </button>

          {/* Buy a new Number Solid Blue Button */}
          <button
            onClick={onOpenBuyNumber}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            Buy a new Number
          </button>
        </div>
      </div>

      {/* 2. Teams Table matching screenshot layout */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-dark-200 dark:border-dark-700/80 bg-white dark:bg-dark-800/40 text-dark-400 uppercase tracking-wider font-bold">
                {/* Column # */}
                <th
                  onClick={() => handleSort('id')}
                  className="py-4 px-5 cursor-pointer hover:text-dark-700 w-12"
                >
                  <div className="flex items-center gap-1">
                    <span>#</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                {/* Column TEAM */}
                <th
                  onClick={() => handleSort('name')}
                  className="py-4 px-5 cursor-pointer hover:text-dark-700 min-w-[240px]"
                >
                  <div className="flex items-center gap-1">
                    <span>TEAM</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                {/* Column STATUS */}
                <th
                  onClick={() => handleSort('status')}
                  className="py-4 px-5 cursor-pointer hover:text-dark-700 w-28"
                >
                  <div className="flex items-center gap-1">
                    <span>STATUS</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                {/* Column NUMBER */}
                <th
                  onClick={() => handleSort('number')}
                  className="py-4 px-5 cursor-pointer hover:text-dark-700 min-w-[140px]"
                >
                  <div className="flex items-center gap-1">
                    <span>NUMBER</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                {/* Column STAFF */}
                <th
                  onClick={() => handleSort('staffActive')}
                  className="py-4 px-5 cursor-pointer hover:text-dark-700 w-24"
                >
                  <div className="flex items-center gap-1">
                    <span>STAFF</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                {/* Column LEADS */}
                <th
                  onClick={() => handleSort('leadsUsed')}
                  className="py-4 px-5 cursor-pointer hover:text-dark-700 min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>LEADS</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                {/* Column ACTIONS */}
                <th className="py-4 px-5 text-center w-56 font-bold">
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60 font-medium">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-dark-400">
                    <p className="text-sm font-semibold text-dark-600 dark:text-dark-300">No teams found</p>
                    <p className="text-xs text-dark-400 mt-1">Teams will appear here once configured.</p>
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team) => (
                <tr
                  key={team.id}
                  className="hover:bg-dark-50/60 dark:hover:bg-dark-700/40 transition-colors"
                >
                  {/* # */}
                  <td className="py-4 px-5 font-semibold text-dark-500">
                    {team.id}
                  </td>

                  {/* TEAM (Clickable to open Team Detail Portal) */}
                  <td className="py-4 px-5 font-bold text-dark-900 dark:text-white">
                    <button
                      onClick={() => {
                        setSelectedTeamForDetails(team);
                        setActiveDetailTab('summary');
                      }}
                      className="text-left font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1.5 group"
                    >
                      <span>{team.name}</span>
                      <ArrowUpRight size={13} className="text-blue-500 opacity-70 group-hover:opacity-100" />
                    </button>
                  </td>

                  {/* STATUS (CLICKABLE: DIRECT TO PAGE LIKE USER'S SCREENSHOTS) */}
                  <td className="py-4 px-5">
                    <button
                      onClick={() => {
                        setSelectedTeamForDetails(team);
                        setActiveDetailTab('summary');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors cursor-pointer group"
                      title="Click to open Team Organization Details (Insights, Settings, Staff, Plan History)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{team.status}</span>
                      <ArrowUpRight size={11} className="text-emerald-600 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </td>

                  {/* NUMBER */}
                  <td className="py-4 px-5 font-mono text-dark-700 dark:text-dark-200 font-semibold text-xs">
                    {team.number}
                  </td>

                  {/* STAFF */}
                  <td className="py-4 px-5 font-bold text-dark-900 dark:text-white">
                    <button
                      onClick={() => {
                        setSelectedTeamForDetails(team);
                        setActiveDetailTab('staff');
                      }}
                      className="hover:text-blue-600 hover:underline cursor-pointer"
                    >
                      <span className="text-dark-900 dark:text-white">
                        {team.staffActive}
                      </span>
                      <span className="text-dark-400 font-normal">
                        {' '}/ {team.staffTotal}
                      </span>
                    </button>
                  </td>

                  {/* LEADS */}
                  <td className="py-4 px-5 font-semibold text-dark-700 dark:text-dark-300">
                    <span className="font-bold text-dark-900 dark:text-white">
                      {team.leadsUsed}
                    </span>
                    <span className="text-dark-400 font-normal">
                      /{team.leadsTotal}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="py-4 px-5">
                    <div className="flex items-center justify-center gap-2">
                      {/* View Portal Button */}
                      <button
                        onClick={() => {
                          setSelectedTeamForDetails(team);
                          setActiveDetailTab('summary');
                        }}
                        className="px-3 py-1.5 rounded-xl font-semibold border border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors shadow-2xs whitespace-nowrap cursor-pointer text-xs"
                      >
                        Manage
                      </button>

                      {/* Renew Plan Solid Blue Button */}
                      <button
                        onClick={() => setRenewingTeam(team)}
                        className="px-3.5 py-1.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                      >
                        Renew Plan
                      </button>

                      {/* Delete Team Button */}
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Delete Team',
                            message: `Are you sure you want to delete team "${team.name}"?`,
                            confirmText: 'Delete',
                            type: 'danger',
                          });
                          if (!ok) return;
                          const updated = teams.filter((t) => t.id !== team.id);
                          setTeams(updated);
                          try {
                            localStorage.setItem('smartcrm_teams', JSON.stringify(updated));
                            window.dispatchEvent(new Event('storage'));
                          } catch {}
                          addToast(`Team "${team.name}" removed`, 'info');
                        }}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete Team"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renew Modal */}
      {renewingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-sm w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-dark-900 dark:text-white">Renew Team Plan</h3>
            <p className="text-xs text-dark-500">
              Extend subscription for <strong>{renewingTeam.name}</strong> for 1 year.
            </p>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-xs">
              <p className="font-bold text-blue-700 dark:text-blue-300">Unlimited All-in-One Pro</p>
              <p className="text-dark-500 mt-0.5">₹4,999 / year (Includes 10,000 leads & virtual line)</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRenewingTeam(null)}
                className="px-3.5 py-2 text-xs rounded-xl hover:bg-dark-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRenewSuccess}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                Confirm Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {isCreateTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-900 rounded-2xl max-w-2xl w-full max-h-[92vh] border border-dark-200 dark:border-dark-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50 dark:bg-dark-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark-900 dark:text-white">
                    Create New Team
                  </h3>
                  <p className="text-xs text-dark-500">
                    Configure team parameters, cloud telephony routing, member allocations, and operational targets.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTeamModalOpen(false)}
                className="p-1.5 rounded-lg text-dark-400 hover:text-dark-700 hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateTeam} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* 1. Basic Information */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-dark-400 mb-3 flex items-center gap-1.5">
                    <Building2 size={13} className="text-blue-600" />
                    <span>1. Team Identity & Leadership</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                        Team Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newTeamForm.name}
                        onChange={(e) =>
                          setNewTeamForm({ ...newTeamForm, name: e.target.value })
                        }
                        placeholder="e.g. Inbound Sales - North Zone"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                        Department / Function
                      </label>
                      <select
                        value={newTeamForm.department}
                        onChange={(e) =>
                          setNewTeamForm({ ...newTeamForm, department: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Sales & Outbound Telecalling">Sales & Outbound Telecalling</option>
                        <option value="Lead Qualification & Pipeline">Lead Qualification & Pipeline</option>
                        <option value="Customer Support & Inbound Care">Customer Support & Inbound Care</option>
                        <option value="Client Retention & Renewals">Client Retention & Renewals</option>
                        <option value="VIP & Enterprise Client Service">VIP & Enterprise Client Service</option>
                        <option value="General Operations & Escalations">General Operations & Escalations</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                        Team Leader / Manager
                      </label>
                      <select
                        value={newTeamForm.teamLead}
                        onChange={(e) =>
                          setNewTeamForm({ ...newTeamForm, teamLead: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select Team Leader (Optional) --</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                        Initial Team Status
                      </label>
                      <select
                        value={newTeamForm.status}
                        onChange={(e) =>
                          setNewTeamForm({ ...newTeamForm, status: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Active">Active (Ready for calls & leads)</option>
                        <option value="Draft / Onboarding">Draft / Onboarding (Setting up)</option>
                        <option value="Paused">Paused / Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Cloud Telephony & Number Routing */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-dark-400 mb-3 flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-600" />
                    <span>2. Cloud Telephony & Call Configuration</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                        Assigned Virtual Phone Number / Extension
                      </label>
                      <input
                        type="text"
                        value={newTeamForm.number}
                        onChange={(e) =>
                          setNewTeamForm({ ...newTeamForm, number: e.target.value })
                        }
                        placeholder="e.g. +91 11 4982 5501 or Ext 101"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                        Backup / Fallback Forwarding Phone
                      </label>
                      <input
                        type="text"
                        value={newTeamForm.backupNumber}
                        onChange={(e) =>
                          setNewTeamForm({ ...newTeamForm, backupNumber: e.target.value })
                        }
                        placeholder="e.g. +91 98765 43210 (Agents offline)"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck size={18} className="text-blue-600" />
                      <div>
                        <p className="text-xs font-bold text-dark-900 dark:text-white">
                          Enable Auto Call Recording
                        </p>
                        <p className="text-[11px] text-dark-500">
                          Automatically capture 100% two-way audio recordings and AI summary for this team.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTeamForm.callRecording}
                        onChange={(e) =>
                          setNewTeamForm({ ...newTeamForm, callRecording: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-dark-200 peer-focus:outline-none rounded-full peer dark:bg-dark-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-dark-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                </div>

                {/* 3. Assign Staff Members */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-dark-400 flex items-center gap-1.5">
                      <Users size={13} className="text-primary-600" />
                      <span>
                        3. Allocate Staff Members ({newTeamForm.selectedMemberIds.length} of {staffList.length} selected)
                      </span>
                    </h4>
                    {staffList.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setNewTeamForm({
                              ...newTeamForm,
                              selectedMemberIds: staffList.map((s) => s.id),
                            })
                          }
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          Select All
                        </button>
                        <span className="text-dark-300">•</span>
                        <button
                          type="button"
                          onClick={() =>
                            setNewTeamForm({ ...newTeamForm, selectedMemberIds: [] })
                          }
                          className="text-dark-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {staffList.length === 0 ? (
                    <p className="text-xs text-dark-400 p-3 bg-dark-50 dark:bg-dark-800 rounded-xl text-center">
                      No staff members currently in system. You can invite staff in Team Members anytime.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-dark-200 dark:border-dark-700 rounded-xl bg-dark-50/40 dark:bg-dark-800/30">
                      {staffList.map((member) => {
                        const isSelected = newTeamForm.selectedMemberIds.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            onClick={() => {
                              const next = isSelected
                                ? newTeamForm.selectedMemberIds.filter((id) => id !== member.id)
                                : [...newTeamForm.selectedMemberIds, member.id];
                              setNewTeamForm({ ...newTeamForm, selectedMemberIds: next });
                            }}
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50/80 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700'
                                : 'bg-white dark:bg-dark-800 border-dark-200 dark:border-dark-700 hover:border-dark-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                {member.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-dark-900 dark:text-white truncate">
                                  {member.name}
                                </p>
                                <p className="text-[10px] text-dark-400 truncate">
                                  {member.role} • {member.phone}
                                </p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-blue-600 ml-2"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Quota & Operational Targets */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-dark-400 mb-3 flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-600" />
                    <span>4. Capacity, Quota & Work Schedule</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                        Monthly Leads Allocation
                      </label>
                      <select
                        value={newTeamForm.leadsQuota}
                        onChange={(e) =>
                          setNewTeamForm({ ...newTeamForm, leadsQuota: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={1000}>1,000 Leads / month</option>
                        <option value={2500}>2,500 Leads / month</option>
                        <option value={5000}>5,000 Leads / month (Recommended)</option>
                        <option value={10000}>10,000 Leads / month</option>
                        <option value={25000}>25,000 Leads / month</option>
                        <option value={50000}>Unlimited (50,000 Leads)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                        Daily Call Target per Agent
                      </label>
                      <select
                        value={newTeamForm.dailyCallTarget}
                        onChange={(e) =>
                          setNewTeamForm({ ...newTeamForm, dailyCallTarget: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={30}>30 calls / day</option>
                        <option value={50}>50 calls / day (Standard)</option>
                        <option value={75}>75 calls / day (High Velocity)</option>
                        <option value={100}>100 calls / day (Dialer Sprint)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                        Working Shift Schedule
                      </label>
                      <select
                        value={newTeamForm.shift}
                        onChange={(e) =>
                          setNewTeamForm({ ...newTeamForm, shift: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="General Day Shift (09:30 AM – 06:30 PM)">General Day Shift (09:30 AM – 06:30 PM)</option>
                        <option value="Morning Shift (08:00 AM – 05:00 PM)">Morning Shift (08:00 AM – 05:00 PM)</option>
                        <option value="Late Evening Shift (01:00 PM – 10:00 PM)">Late Evening Shift (01:00 PM – 10:00 PM)</option>
                        <option value="24/7 Rotational Support">24/7 Rotational Support</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                        Operating Days
                      </label>
                      <select
                        value={newTeamForm.workingDays}
                        onChange={(e) =>
                          setNewTeamForm({ ...newTeamForm, workingDays: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Monday to Saturday (6 days)">Monday to Saturday (6 days)</option>
                        <option value="Monday to Friday (5 days)">Monday to Friday (5 days)</option>
                        <option value="All 7 Days (Everyday)">All 7 Days (Everyday)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 5. Team Objective & Notes */}
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                    Team Objective / Internal Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={newTeamForm.description}
                    onChange={(e) =>
                      setNewTeamForm({ ...newTeamForm, description: e.target.value })
                    }
                    placeholder="e.g. Primary squad responsible for outbound cold leads, follow-ups, and demo bookings."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 bg-dark-50/70 dark:bg-dark-800/60 border-t border-dark-200 dark:border-dark-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-dark-500 text-center sm:text-left">
                  * Team Name is required. Settings and member allocations can be updated anytime in Team Settings.
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreateTeamModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-dark-100 dark:hover:bg-dark-700 text-dark-600 dark:text-dark-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Create Team</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
