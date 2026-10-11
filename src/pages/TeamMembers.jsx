import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  X,
  ArrowLeft,
  CheckCircle2,
  Check,
  Calendar,
  Mail,
  Phone,
  Info,
  Clock,
  Sparkles,
  PhoneCall,
  Bot,
  Filter,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import TeamCallHistoryTable from '../components/TeamCallHistoryTable';
import ContactDetailView from '../components/ContactDetailView';
import { getUsers, createUser, deleteUser, updateUser, toggleUserStatus } from '../api/users';

const ROLES_LIST = [
  { name: 'Owner', desc: 'Full workspace administrator' },
  { name: 'Manager', desc: 'Manage teams and view reports' },
  { name: 'Member', desc: 'Standard staff member' },
  { name: 'Telecaller', desc: 'Calling agent with dialer access' },
  { name: 'AI Agent', desc: 'Automated AI calling assistant' },
];
export default function TeamMembers({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Selected Member for Detail View (null = list view)
  const [selectedMember, setSelectedMember] = useState(null);

  // Detail View Subtab: 'staff' | 'permissions' | 'call-history' | 'tasks' | 'insights'
  const [detailTab, setDetailTab] = useState('staff');

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedOrgs, setSelectedOrgs] = useState([]);

  // Popover state for Role filter in table header
  const [roleFilterOpen, setRoleFilterOpen] = useState(false);
  const roleFilterRef = useRef(null);

  // Modal: Add Member
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    team: 'Main Team',
    role: 'Member',
  });

  // Modal: Edit Member Profile (Name, Email, Phone, State)
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    state: 'Active',
  });

  // Modal: Edit Task & Add Task
  const [editingTask, setEditingTask] = useState(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    contactName: '',
    taskType: 'REMINDER',
    dueDate: '',
    leadStage: '-',
    remarks: '',
    status: 'PENDING',
  });

  // Modal: Contact Details preview
  const [viewContact, setViewContact] = useState(null);

  // Permissions state for Detail View
  const [permissionsTeam, setPermissionsTeam] = useState('Main Team');
  const [permissions, setPermissions] = useState({
    numberMasking: false,
    whatsappAccess: true,
    editWabaTemplate: true,
  });

  // Tasks state for member Detail View
  const [memberTasks, setMemberTasks] = useState([]);

  const [staffInsightsOpen, setStaffInsightsOpen] = useState(false);

  // Team members list loaded from backend
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Click outside listener for header role filter menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleFilterRef.current && !roleFilterRef.current.contains(e.target)) {
        setRoleFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      if (res?.users && res.users.length > 0) {
        const mapped = res.users.map((u) => {
          let displayRole = 'Member';
          const r = String(u.role || '').toLowerCase();
          if (r === 'admin' || r === 'owner') displayRole = 'Owner';
          else if (r === 'manager') displayRole = 'Manager';
          else if (r === 'telecaller') displayRole = 'Telecaller';
          else if (r === 'ai_agent' || r === 'ai agent') displayRole = 'AI Agent';
          else if (u.role) displayRole = u.role.charAt(0).toUpperCase() + u.role.slice(1);

          return {
            id: u._id || u.id,
            name: u.name || (u.email ? u.email.split('@')[0] : 'User'),
            phone: u.phone || '-',
            email: u.email || '-',
            role: displayRole,
            state: u.status === 'inactive' ? 'Inactive' : 'Active',
            status: '-',
            isAi: displayRole === 'AI Agent',
            teams: [{ name: 'Main Team', role: displayRole }],
          };
        });
        setMembers(mapped);
      } else {
        setMembers([]);
      }
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Update member role handler
  const handleUpdateRole = async (memberId, newRole) => {
    const targetMember = members.find((m) => m.id === memberId);
    const memberName = targetMember ? targetMember.name : 'Member';
    if (targetMember && targetMember.role === newRole) return;

    const ok = await confirm({
      title: 'Update Member Role',
      message: `Are you sure you want to change the role of "${memberName}" to "${newRole}"?`,
      confirmText: `Assign ${newRole}`,
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              role: newRole,
              isAi: newRole === 'AI Agent',
              teams: m.teams ? m.teams.map((t) => ({ ...t, role: newRole })) : [{ name: 'Main Team', role: newRole }],
            }
          : m
      )
    );

    if (selectedMember && selectedMember.id === memberId) {
      setSelectedMember((prev) => ({
        ...prev,
        role: newRole,
        isAi: newRole === 'AI Agent',
        teams: prev.teams ? prev.teams.map((t) => ({ ...t, role: newRole })) : [{ name: 'Main Team', role: newRole }],
      }));
    }

    addToast(`Role updated to "${newRole}" for ${memberName}`, 'success');

    // Attempt backend sync if it's a valid Mongo ID
    if (memberId && typeof memberId === 'string' && memberId.length === 24 && !memberId.startsWith('m_')) {
      try {
        const backendRole =
          newRole === 'Owner'
            ? 'admin'
            : newRole === 'Telecaller'
            ? 'telecaller'
            : newRole === 'Manager'
            ? 'manager'
            : newRole === 'AI Agent'
            ? 'ai_agent'
            : 'user';
        await updateUser(memberId, { role: backendRole });
      } catch (err) {
        console.error('Failed to sync role update to backend:', err);
      }
    }
  };

  // Toggle member state (Active <-> Inactive)
  const handleToggleState = async (memberId) => {
    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) return;
    const nextState = targetMember.state === 'Active' ? 'Inactive' : 'Active';

    const ok = await confirm({
      title: `${nextState === 'Active' ? 'Activate' : 'Deactivate'} Member`,
      message: `Are you sure you want to change status for "${targetMember.name}" to "${nextState}"?`,
      confirmText: `Set to ${nextState}`,
      cancelText: 'Cancel',
      type: nextState === 'Active' ? 'primary' : 'warning',
    });
    if (!ok) return;

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              state: nextState,
            }
          : m
      )
    );

    if (selectedMember && selectedMember.id === memberId) {
      setSelectedMember((prev) => ({
        ...prev,
        state: nextState,
      }));
    }

    addToast(
      `${targetMember.name} is now ${nextState}`,
      nextState === 'Active' ? 'success' : 'info'
    );

    // Attempt backend sync if it's a valid Mongo ID
    if (memberId && typeof memberId === 'string' && memberId.length === 24 && !memberId.startsWith('m_')) {
      try {
        await toggleUserStatus(memberId);
      } catch (err) {
        console.error('Failed to sync status toggle to backend:', err);
      }
    }
  };

  // Profile Edit modal handlers
  const openEditProfile = () => {
    if (!selectedMember) return;
    setEditProfileForm({
      name: selectedMember.name || '',
      email: selectedMember.email === '-' ? '' : (selectedMember.email || ''),
      phone: selectedMember.phone === '-' ? '' : (selectedMember.phone || ''),
      state: selectedMember.state || 'Active',
    });
    setIsEditProfileModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editProfileForm.name.trim()) {
      addToast('Name is required', 'error');
      return;
    }

    if (selectedMember && editProfileForm.state !== selectedMember.state) {
      const ok = await confirm({
        title: 'Update Member Status',
        message: `Are you sure you want to update status for "${selectedMember.name}" to "${editProfileForm.state}"?`,
        confirmText: `Set to ${editProfileForm.state}`,
        cancelText: 'Cancel',
        type: editProfileForm.state === 'Active' ? 'primary' : 'warning',
      });
      if (!ok) return;
    }

    const updated = {
      ...selectedMember,
      name: editProfileForm.name.trim(),
      email: editProfileForm.email.trim() || '-',
      phone: editProfileForm.phone.trim() || '-',
      state: editProfileForm.state,
    };
    setSelectedMember(updated);
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setIsEditProfileModalOpen(false);
    addToast('Profile updated successfully!', 'success');

    if (updated.id && typeof updated.id === 'string' && updated.id.length === 24 && !updated.id.startsWith('m_')) {
      try {
        await updateUser(updated.id, {
          name: updated.name,
          phone: updated.phone,
        });
      } catch (err) {
        console.error('Failed to sync profile to backend:', err);
      }
    }
  };

  // Task Action Handlers
  const handleToggleTaskStatus = async (taskId) => {
    const targetTask = memberTasks.find((t) => t.id === taskId);
    if (!targetTask) return;
    const nextStatus = targetTask.status === 'DONE' ? 'PENDING' : 'DONE';

    const ok = await confirm({
      title: 'Update Task Status',
      message: `Are you sure you want to mark task for "${targetTask.contactName}" as "${nextStatus}"?`,
      confirmText: `Mark ${nextStatus}`,
      cancelText: 'Cancel',
      type: nextStatus === 'DONE' ? 'primary' : 'warning',
    });
    if (!ok) return;

    setMemberTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          addToast(
            nextStatus === 'DONE' ? 'Task marked as Done!' : 'Task marked as Pending',
            'success'
          );
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const handleDeleteTask = async (taskId) => {
    const ok = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to permanently delete this task?',
      confirmText: 'Delete Task',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!ok) return;
    setMemberTasks((prev) => prev.filter((t) => t.id !== taskId));
    addToast('Task removed', 'info');
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      contactName: task.contactName,
      taskType: task.taskType,
      dueDate: task.dueDate,
      leadStage: task.leadStage || '-',
      remarks: task.remarks === '-' ? '' : task.remarks,
      status: task.status,
    });
  };

  const handleSaveEditTask = (e) => {
    e.preventDefault();
    if (!editingTask) return;
    setMemberTasks((prev) =>
      prev.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              contactName: taskForm.contactName.trim() || t.contactName,
              taskType: taskForm.taskType,
              dueDate: taskForm.dueDate || t.dueDate,
              remarks: taskForm.remarks.trim() || '-',
              status: taskForm.status,
            }
          : t
      )
    );
    setEditingTask(null);
    addToast('Task updated successfully!', 'success');
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskForm.contactName.trim()) {
      addToast('Please enter contact name', 'error');
      return;
    }
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const newTask = {
      id: `task_${Date.now()}`,
      dueDate: taskForm.dueDate || dateStr,
      taskType: taskForm.taskType,
      contactName: taskForm.contactName.trim(),
      leadStage: taskForm.leadStage || '-',
      status: taskForm.status,
      remarks: taskForm.remarks.trim() || '-',
      createdDate: dateStr,
    };
    setMemberTasks([newTask, ...memberTasks]);
    setIsAddTaskModalOpen(false);
    setTaskForm({
      contactName: '',
      taskType: 'REMINDER',
      dueDate: '',
      leadStage: '-',
      remarks: '',
      status: 'PENDING',
    });
    addToast('Task created successfully!', 'success');
  };

  // Remove org chip from header
  const handleRemoveOrg = (org) => {
    setSelectedOrgs(selectedOrgs.filter((o) => o !== org));
  };

  // Add Member Submit
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!addForm.firstName.trim() || !addForm.phone.trim()) {
      addToast('Please enter required details', 'error');
      return;
    }

    const fullName = `${addForm.firstName.trim()} ${addForm.lastName.trim()}`.trim();
    const newMember = {
      id: `m_${Date.now()}`,
      name: fullName,
      phone: addForm.phone.trim(),
      email: addForm.email.trim(),
      role: addForm.role,
      state: 'Active',
      status: '-',
      isAi: false,
      teams: [{ name: 'Main Team', role: addForm.role }],
    };

    setMembers([...members, newMember]);
    setIsAddModalOpen(false);
    setAddForm({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      team: 'Main Team',
      role: 'Member',
    });
    addToast(`${fullName} added to team successfully!`, 'success');
  };

  // Toggle Member Permissions with confirmation
  const handleTogglePermission = async (key, label) => {
    const current = Boolean(permissions[key]);
    const next = !current;
    const ok = await confirm({
      title: `${next ? 'Enable' : 'Disable'} ${label}`,
      message: `Are you sure you want to ${next ? 'enable' : 'disable'} "${label}" for ${selectedMember?.name || 'this member'}?`,
      confirmText: next ? 'Enable' : 'Disable',
      cancelText: 'Cancel',
      type: next ? 'primary' : 'warning',
    });
    if (!ok) return;
    setPermissions((p) => ({ ...p, [key]: next }));
    addToast(`${label} permission updated`, 'info');
  };

  // Delete Member with confirmation
  const handleDeleteMember = async (id, name) => {
    const ok = await confirm({
      title: 'Remove Team Member',
      message: `Are you sure you want to remove "${name}" from your team? This action cannot be undone.`,
      confirmText: 'Remove Member',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!ok) return;
    setMembers(members.filter((m) => m.id !== id));
    addToast(`${name} removed from team`, 'info');
  };

  // Filter members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone.includes(searchQuery);
      const matchRole = roleFilter ? m.role === roleFilter : true;
      return matchSearch && matchRole;
    });
  }, [members, searchQuery, roleFilter]);

  /* =========================================================================
     VIEW: CONTACT DETAILS (Screenshots 2 & 3)
     ========================================================================= */
  if (viewContact) {
    return (
      <ContactDetailView
        contact={{
          ...viewContact,
          phone: viewContact.phone || '',
          assignedTelecaller: viewContact.assignedTelecaller || user?.name || 'Agent',
        }}
        onBack={() => setViewContact(null)}
        onNavigate={onNavigate}
      />
    );
  }

  /* =========================================================================
     VIEW 2: MEMBER DETAILS VIEW (Screenshots 3, 4, 5)
     ========================================================================= */
  if (selectedMember) {
    return (
      <div className="space-y-5">
        {/* Top Back & Member Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedMember(null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-semibold text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors shadow-2xs"
          >
            <ArrowLeft size={15} />
            <span>Back to Team Members</span>
          </button>
        </div>

        {/* Sub-tabs matching Screenshots 3, 4, 5 */}
        <div className="flex items-center justify-center sm:justify-start gap-1 border-b border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 rounded-xl p-1.5 shadow-2xs">
          {[
            { id: 'staff', label: 'Staff' },
            { id: 'permissions', label: 'Permissions' },
            { id: 'call-history', label: 'Call History' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'insights', label: 'Insights' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDetailTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                detailTab === tab.id
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900 shadow-2xs'
                  : 'text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* =====================================================================
            TAB 1: STAFF (Screenshot 3)
            ===================================================================== */}
        {detailTab === 'staff' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-dark-900 dark:text-white uppercase tracking-tight">
              {selectedMember.name}
            </h2>

            {/* Profile Fields Card */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs overflow-hidden">
              <div className="divide-y divide-dark-100 dark:divide-dark-700/60 text-xs">
                {/* Name */}
                <div className="grid grid-cols-12 p-4 items-center">
                  <div className="col-span-4 font-semibold text-dark-600 dark:text-dark-400">
                    Name
                  </div>
                  <div className="col-span-8 flex items-center justify-between">
                    <span className="font-bold text-dark-900 dark:text-white">
                      {selectedMember.name}
                    </span>
                    <button
                      type="button"
                      onClick={openEditProfile}
                      className="text-blue-600 hover:text-blue-700 p-1 cursor-pointer transition-colors"
                      title="Edit Profile"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div className="grid grid-cols-12 p-4 items-center">
                  <div className="col-span-4 font-semibold text-dark-600 dark:text-dark-400">
                    Email
                  </div>
                  <div className="col-span-8 flex items-center justify-between">
                    <span className="text-dark-700 dark:text-dark-300">
                      {selectedMember.email && selectedMember.email !== '-' ? selectedMember.email : ''}
                    </span>
                    <button
                      type="button"
                      onClick={openEditProfile}
                      className="text-blue-600 hover:text-blue-700 p-1 cursor-pointer transition-colors"
                      title="Edit Email"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                {/* Phone */}
                <div className="grid grid-cols-12 p-4 items-center">
                  <div className="col-span-4 font-semibold text-dark-600 dark:text-dark-400">
                    Phone
                  </div>
                  <div className="col-span-8 flex items-center justify-between">
                    <span className="font-bold text-dark-900 dark:text-white">
                      {selectedMember.phone.startsWith('+')
                        ? selectedMember.phone
                        : selectedMember.phone === '-'
                        ? '-'
                        : `+91${selectedMember.phone}`}
                    </span>
                    <button
                      type="button"
                      onClick={openEditProfile}
                      className="text-blue-600 hover:text-blue-700 p-1 cursor-pointer transition-colors"
                      title="Edit Phone"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                {/* State / Status (Clickable Toggle) */}
                <div className="grid grid-cols-12 p-4 items-center">
                  <div className="col-span-4 font-semibold text-dark-600 dark:text-dark-400">
                    State
                  </div>
                  <div className="col-span-8 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleState(selectedMember.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer select-none active:scale-95 shadow-2xs hover:shadow-xs ${
                        selectedMember.state === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200'
                          : 'bg-emerald-50 text-emerald-700/80 dark:bg-dark-700 dark:text-dark-300 border-emerald-200/60 dark:border-dark-600 hover:bg-emerald-100/70'
                      }`}
                      title={`Click to switch to ${selectedMember.state === 'Active' ? 'Inactive' : 'Active'}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          selectedMember.state === 'Active' ? 'bg-emerald-600 animate-pulse' : 'bg-emerald-400'
                        }`}
                      />
                      <span>{selectedMember.state}</span>
                      <span className="text-[10px] text-dark-400 font-normal ml-1">(Click to switch)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Teams and Roles Table matching Screenshot 3 */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f0f7ff] dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 text-dark-700 dark:text-dark-300 font-bold">
                  <tr>
                    <th className="py-3 px-4">Team Name</th>
                    <th className="py-3 px-4">User Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60">
                  {selectedMember.teams.map((t, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-dark-50/50 dark:hover:bg-dark-700/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" onClick={() => addToast(`Team: ${t.name}`, 'info')}>
                        {t.name}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-dark-800 dark:text-dark-200">
                        <div className="relative inline-block w-40">
                          <select
                            value={t.role}
                            onChange={(e) => handleUpdateRole(selectedMember.id, e.target.value)}
                            className="w-full appearance-none pl-3.5 pr-8 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            <option value="Member">Member</option>
                            <option value="Owner">Owner</option>
                            <option value="Manager">Manager</option>
                            <option value="Telecaller">Telecaller</option>
                            <option value="AI Agent">AI Agent</option>
                          </select>
                          <ChevronDown
                            size={14}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: PERMISSIONS (Screenshot 4)
            ===================================================================== */}
        {detailTab === 'permissions' && (
          <div className="space-y-6">
            {/* Team Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-dark-400 uppercase tracking-wider">
                TEAM
              </label>
              <div className="relative max-w-sm">
                <select
                  value={permissionsTeam}
                  onChange={(e) => {
                    setPermissionsTeam(e.target.value);
                    addToast(`Selected team: ${e.target.value}`, 'info');
                  }}
                  className="w-full appearance-none pl-3.5 pr-8 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {Array.from(
                    new Set([
                      ...(selectedMember.teams?.map((t) => t.name) || []),
                      'Main Team',
                      'Sales Team',
                      'Support Team',
                    ])
                  ).map((teamName) => (
                    <option key={teamName} value={teamName}>
                      {teamName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Other Permissions List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider">
                  OTHER
                </span>
                <Info size={14} className="text-dark-400" />
              </div>

              <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 divide-y divide-dark-100 dark:divide-dark-700/60 shadow-2xs">
                {/* 1. Number Masking */}
                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-dark-900 dark:text-white">
                    Number Masking
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePermission('numberMasking', 'Number Masking')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      permissions.numberMasking ? 'bg-blue-600 justify-end' : 'bg-dark-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                {/* 2. Whatsapp Access */}
                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-dark-900 dark:text-white">
                    Whatsapp Access
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePermission('whatsappAccess', 'WhatsApp Access')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      permissions.whatsappAccess ? 'bg-blue-600 justify-end' : 'bg-dark-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                {/* 3. Edit/Create WABA Template */}
                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-dark-900 dark:text-white">
                    Edit/Create WABA Template
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePermission('editWabaTemplate', 'Edit/Create WABA Template')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      permissions.editWabaTemplate ? 'bg-blue-600 justify-end' : 'bg-dark-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: CALL HISTORY (Screenshot 5)
            ===================================================================== */}
        {detailTab === 'call-history' && (
          <TeamCallHistoryTable
            teamName={selectedMember?.teams?.[0]?.name || 'Main Team'}
            memberName={selectedMember?.name}
            onNavigate={onNavigate}
          />
        )}

        {/* =====================================================================
            TAB 4: TASKS (Screenshot 1: media_1791537158900.png)
            ===================================================================== */}
        {detailTab === 'tasks' && (
          <div className="space-y-4">
            {/* Top Bar: task count + Add Task + View All button */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-dark-700 dark:text-dark-300">
                {memberTasks.length} tasks
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => addToast('Viewing all member tasks', 'info')}
                  className="px-4 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-800 dark:text-dark-200 bg-white dark:bg-dark-800 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors shadow-2xs cursor-pointer"
                >
                  View All
                </button>
              </div>
            </div>

            {/* Tasks Table matching Screenshot */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#f0f7ff] dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 text-dark-700 dark:text-dark-300 font-bold">
                    <tr>
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => addToast('Sort/Filter by Due Date', 'info')}
                          className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <span>Due Date</span>
                          <Search size={12} className="text-dark-400" />
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => addToast('Filter by Task Type', 'info')}
                          className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <span>Task Type</span>
                          <Search size={12} className="text-dark-400" />
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => addToast('Filter by Contact Name', 'info')}
                          className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <span>Contact Name</span>
                          <Search size={12} className="text-dark-400" />
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => addToast('Filter by Lead Stage', 'info')}
                          className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <span>Lead Stage</span>
                          <Search size={12} className="text-dark-400" />
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => addToast('Filter by Task Status', 'info')}
                          className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <span>Task Status</span>
                          <Search size={12} className="text-dark-400" />
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => addToast('Filter by Task Remarks', 'info')}
                          className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <span>Task Remarks</span>
                          <Search size={12} className="text-dark-400" />
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => addToast('Filter by Created Date', 'info')}
                          className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <span>Created Date</span>
                          <Search size={12} className="text-dark-400" />
                        </button>
                      </th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60">
                    {memberTasks.map((task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-dark-50/50 dark:hover:bg-dark-700/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-dark-800 dark:text-dark-200">
                          {task.dueDate}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white uppercase tracking-wider text-[11px]">
                          {task.taskType}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => setViewContact({ name: task.contactName, leadStage: task.leadStage, taskType: task.taskType })}
                            className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {task.contactName}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-dark-400 font-medium">
                          {task.leadStage}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(task.id)}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase text-white cursor-pointer active:scale-95 transition-all shadow-2xs hover:opacity-90 ${
                              task.status === 'DONE'
                                ? 'bg-emerald-600'
                                : 'bg-[#ef4444]'
                            }`}
                            title="Click to toggle status"
                          >
                            {task.status}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-dark-600 dark:text-dark-400">
                          {task.remarks}
                        </td>
                        <td className="py-3.5 px-4 text-dark-600 dark:text-dark-400">
                          {task.createdDate}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleTaskStatus(task.id)}
                              className="text-dark-400 hover:text-emerald-600 transition-colors p-0.5 cursor-pointer"
                              title={task.status === 'DONE' ? 'Mark Pending' : 'Mark Done'}
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditTask(task)}
                              className="text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 transition-colors p-0.5 cursor-pointer"
                              title="Edit Task"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-dark-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 5: INSIGHTS (Screenshots 2 & 3: media_1791537186223.png & media_1791537190951.png)
            ===================================================================== */}
        {detailTab === 'insights' && (
          <div className="space-y-5">
            {/* Top Control Bar: Period + View Detailed Insights + Last Updated + Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs shadow-2xs">
                  <span className="font-semibold text-dark-500">Period:</span>
                  <span className="font-bold text-dark-900 dark:text-white">09 Oct 2026</span>
                  <span className="text-dark-400">➔</span>
                  <span className="font-bold text-dark-900 dark:text-white">09 Oct 2026</span>
                  <Calendar size={13} className="text-dark-400 ml-1" />
                </div>

                <button
                  onClick={() => onNavigate?.('insights')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Detailed Insights
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-dark-400">
                  Last Updated On: 09/10/26 02:36 PM
                </span>
                <button
                  onClick={() => addToast('Insights refreshed', 'success')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <RefreshCw size={12} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Section 1: Call Insights */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-dark-900 dark:text-white">Call Insights</h3>

              {/* 2x4 Metric Grid matching Screenshot 2 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 text-xs">
                {/* Row 1 */}
                <div className="p-2 space-y-1">
                  <p className="text-dark-500">Outgoing Calls</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">0</p>
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-dark-500">Incoming Calls</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">0</p>
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-dark-500">Connected Calls</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">0</p>
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-dark-500">Received Calls</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">0</p>
                </div>

                {/* Row 2 */}
                <div className="p-2 space-y-1 pt-3 md:pt-2">
                  <p className="text-dark-500">Missed Calls</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">0</p>
                </div>
                <div className="p-2 space-y-1 pt-3 md:pt-2">
                  <p className="text-dark-500">Total Talk Time</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">0</p>
                </div>
                <div className="p-2 space-y-1 pt-3 md:pt-2">
                  <p className="text-dark-500">Avg. Outgoing Call Duration</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">0</p>
                </div>
                <div className="p-2 space-y-1 pt-3 md:pt-2">
                  <p className="text-dark-500">Avg. Incoming Call Duration</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">0</p>
                </div>
              </div>
            </div>

            {/* Section 2: Customer Insights matching Screenshot 2 */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-dark-900 dark:text-white">Customer Insights</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-2 space-y-1">
                  <p className="text-dark-500">Unique Customers</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">0</p>
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-dark-500">Missed Customers</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">0</p>
                </div>
              </div>
            </div>

            {/* Section 3: Staff Level Insights Accordion matching Screenshot 3 */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-4 shadow-2xs">
              <button
                onClick={() => setStaffInsightsOpen(!staffInsightsOpen)}
                className="w-full flex items-center justify-between text-xs font-bold text-dark-900 dark:text-white"
              >
                <span>Staff Level Insights</span>
                <ChevronDown
                  size={15}
                  className={`text-dark-400 transition-transform ${
                    staffInsightsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {staffInsightsOpen && (
                <div className="pt-3 text-xs text-dark-500">
                  Detailed individual metrics active for {selectedMember.name}.
                </div>
              )}
            </div>

            {/* Section 4: Task Insights matching Screenshot 3 */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-dark-900 dark:text-white">Task Insights</h3>

              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="p-2 space-y-1">
                  <p className="text-dark-500">Total Tasks</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">{memberTasks.length}</p>
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-dark-500">Pending</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">
                    {memberTasks.filter((t) => t.status === 'PENDING').length}
                  </p>
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-dark-500">Done</p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">
                    {memberTasks.filter((t) => t.status === 'DONE').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* =========================================================================
     VIEW 1: TEAM MEMBERS LIST VIEW (Screenshot 1)
     ========================================================================= */
  return (
    <div className="space-y-4">
      {/* Top Header Row matching Screenshot 1 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            <h1 className="text-xl font-bold text-dark-900 dark:text-white">Team Members</h1>
            <span className="text-xs font-semibold text-dark-400">{members.length}</span>
          </div>
          <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
            Manage staff access, presence, and roles across your teams.
          </p>
        </div>

        {/* Filter Chips + Refresh + Add Member */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Select Orgs filter container */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs shadow-2xs">
            <span className="font-semibold text-dark-500 whitespace-nowrap">Select Orgs:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {selectedOrgs.map((org) => (
                <span
                  key={org}
                  className="px-2 py-0.5 rounded text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center gap-1"
                >
                  {org},
                </span>
              ))}
            </div>
            {selectedOrgs.length > 0 && (
              <button
                onClick={() => setSelectedOrgs([])}
                className="text-dark-400 hover:text-dark-600 ml-1"
                title="Clear org filter"
              >
                <X size={12} />
              </button>
            )}
            <ChevronDown size={13} className="text-dark-400 ml-0.5" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => addToast('Team list refreshed', 'success')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-800 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors shadow-2xs"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>

          {/* Add Member Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Team Members Table matching Screenshot 1 */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f0f7ff] dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 text-dark-700 dark:text-dark-300 font-bold whitespace-nowrap">
              <tr>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span>Name</span>
                    <Search size={13} className="text-dark-400" />
                  </div>
                </th>
                <th className="py-3 px-4 relative">
                  <div className="relative inline-block" ref={roleFilterRef}>
                    <button
                      type="button"
                      onClick={() => setRoleFilterOpen(!roleFilterOpen)}
                      className="flex items-center gap-1.5 font-bold hover:text-blue-600 transition-colors cursor-pointer group"
                      title="Filter by Role"
                    >
                      <span>Role</span>
                      <Search
                        size={13}
                        className={`${
                          roleFilter ? 'text-blue-600' : 'text-dark-400 group-hover:text-blue-600'
                        } transition-colors`}
                      />
                      {roleFilter && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      )}
                    </button>

                    {roleFilterOpen && (
                      <div className="absolute left-0 top-full mt-2 z-50 w-44 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-1.5 text-xs">
                        <div className="px-2 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-100 dark:border-dark-700/60 mb-1">
                          Filter by Role
                        </div>
                        <button
                          onClick={() => {
                            setRoleFilter('');
                            setRoleFilterOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            !roleFilter
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                              : 'text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 font-medium'
                          }`}
                        >
                          <span>All Roles</span>
                          {!roleFilter && <Check size={13} className="text-blue-600" />}
                        </button>
                        {ROLES_LIST.map((r) => (
                          <button
                            key={r.name}
                            onClick={() => {
                              setRoleFilter(r.name);
                              setRoleFilterOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                              roleFilter === r.name
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                                : 'text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 font-medium'
                            }`}
                          >
                            <span>{r.name}</span>
                            {roleFilter === r.name && <Check size={13} className="text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    <Search size={13} className="text-dark-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-dark-400">
                    <p className="font-semibold text-dark-600 dark:text-dark-300">No team members found</p>
                    <p className="text-xs text-dark-400 mt-1">Use the &quot;Add Member&quot; button above to invite members to your workspace.</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m, idx) => (
                <tr
                  key={m.id}
                  className="hover:bg-dark-50/50 dark:hover:bg-dark-700/40 transition-colors"
                >
                  {/* Name + Phone */}
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setDetailTab('staff');
                      }}
                      className="font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline block text-left"
                    >
                      {m.name}
                    </button>
                    <span className="text-[11px] text-dark-400 font-medium block mt-0.5">
                      {m.phone}
                    </span>
                  </td>

                  {/* Role (Click leads directly to Staff page) */}
                  <td className="py-3.5 px-4 font-medium text-dark-800 dark:text-dark-200">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember(m);
                        setDetailTab('staff');
                      }}
                      className="text-xs font-semibold text-dark-800 dark:text-dark-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors hover:underline"
                      title="Open staff page for this member"
                    >
                      {m.role}
                    </button>
                  </td>

                  {/* State Badge (Click leads directly to Staff page) */}
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember(m);
                        setDetailTab('staff');
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer select-none hover:shadow-xs hover:scale-105 active:scale-95 ${
                        m.state === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200'
                          : 'bg-emerald-50 text-emerald-700/80 dark:bg-dark-700 dark:text-dark-300 border-emerald-200/60 dark:border-dark-600 hover:bg-emerald-100/70'
                      }`}
                      title="Open staff page for this member"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          m.state === 'Active' ? 'bg-emerald-600 animate-pulse' : 'bg-emerald-400'
                        }`}
                      />
                      <span>{m.state}</span>
                    </button>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-dark-400 font-semibold">{m.status}</td>

                  {/* Actions (Pencil & Trash) */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMember(m);
                          setDetailTab('staff');
                        }}
                        className="p-1 text-dark-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        title="Edit Member (Open Staff Page)"
                      >
                        <Pencil size={15} />
                      </button>
                      {m.role !== 'Owner' && !m.isAi && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m.id, m.name)}
                          className="p-1 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Remove Member"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: ADD MEMBER (Screenshot 2)
          ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleAddSubmit}
            className="bg-white dark:bg-dark-800 rounded-2xl max-w-xl w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4"
          >
            {/* Modal Title matching Screenshot 2 */}
            <div className="flex items-center justify-between pb-2 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">Add Member</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Row 1: First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  * First Name
                </label>
                <input
                  type="text"
                  required
                  value={addForm.firstName}
                  onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                  placeholder="Enter First Name"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  * Last Name
                </label>
                <input
                  type="text"
                  required
                  value={addForm.lastName}
                  onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                  placeholder="Enter Last Name"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Row 2: Phone Number & Team */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  * Phone Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-xs font-semibold rounded-l-xl border border-r-0 border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-900 text-dark-600 dark:text-dark-300">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="Enter Phone Number"
                    className="w-full px-3 py-2 text-xs rounded-r-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  * Team
                </label>
                <div className="relative">
                  <select
                    value={addForm.team}
                    onChange={(e) => setAddForm({ ...addForm, team: e.target.value })}
                    className="w-full appearance-none px-3 py-2 text-xs font-medium rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Main Team">Main Team</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Role Radio Selection Cards matching Screenshot 2 */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300">
                * Role
              </label>

              {/* Option 1: Owner */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  addForm.role === 'Owner'
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                    : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="Owner"
                  checked={addForm.role === 'Owner'}
                  onChange={() => setAddForm({ ...addForm, role: 'Owner' })}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-bold text-dark-900 dark:text-white">Owner</p>
                  <p className="text-[11px] text-dark-500">
                    Full access. Manage numbers, team & settings
                  </p>
                </div>
              </label>

              {/* Option 2: Manager */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  addForm.role === 'Manager'
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                    : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="Manager"
                  checked={addForm.role === 'Manager'}
                  onChange={() => setAddForm({ ...addForm, role: 'Manager' })}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-bold text-dark-900 dark:text-white">Manager</p>
                  <p className="text-[11px] text-dark-500">
                    Manage team, change some settings, view all activity
                  </p>
                </div>
              </label>

              {/* Option 3: Member (Default Selected) */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  addForm.role === 'Member'
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-1 ring-blue-500'
                    : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="Member"
                  checked={addForm.role === 'Member'}
                  onChange={() => setAddForm({ ...addForm, role: 'Member' })}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-bold text-dark-900 dark:text-white">Member</p>
                  <p className="text-[11px] text-dark-500">
                    Make calls, send messages. No access to team or other settings
                  </p>
                </div>
              </label>
            </div>

            {/* Bottom Buttons matching Screenshot 2 */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-dark-600 dark:text-dark-300 uppercase tracking-wider hover:bg-dark-100 dark:hover:bg-dark-700 rounded-xl transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 uppercase tracking-wider transition-colors shadow-xs"
              >
                SUBMIT
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT MEMBER PROFILE
          ========================================================================= */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">Edit Staff Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editProfileForm.name}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editProfileForm.email}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editProfileForm.phone}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                  placeholder="+91..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Presence State
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditProfileForm({ ...editProfileForm, state: 'Active' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      editProfileForm.state === 'Active'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                        : 'bg-dark-50 text-dark-600 border-dark-200 hover:bg-dark-100'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditProfileForm({ ...editProfileForm, state: 'Inactive' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      editProfileForm.state === 'Inactive'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                        : 'bg-dark-50 text-dark-600 border-dark-200 hover:bg-dark-100'
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT TASK
          ========================================================================= */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEditTask}
            className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">Edit Task</h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-dark-400 hover:text-dark-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={taskForm.contactName}
                  onChange={(e) => setTaskForm({ ...taskForm, contactName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                    Task Type
                  </label>
                  <select
                    value={taskForm.taskType}
                    onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="REMINDER">REMINDER</option>
                    <option value="FIRST CALL">FIRST CALL</option>
                    <option value="FOLLOW UP">FOLLOW UP</option>
                    <option value="DEMO">DEMO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                    Task Status
                  </label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Due Date
                </label>
                <input
                  type="text"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  placeholder="e.g. 26 Mar 2026"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Task Remarks
                </label>
                <input
                  type="text"
                  value={taskForm.remarks}
                  onChange={(e) => setTaskForm({ ...taskForm, remarks: e.target.value })}
                  placeholder="Remarks or note"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 text-xs font-bold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                Save Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD TASK
          ========================================================================= */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleCreateTask}
            className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">Add New Task</h3>
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={taskForm.contactName}
                  onChange={(e) => setTaskForm({ ...taskForm, contactName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                    Task Type
                  </label>
                  <select
                    value={taskForm.taskType}
                    onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="REMINDER">REMINDER</option>
                    <option value="FIRST CALL">FIRST CALL</option>
                    <option value="FOLLOW UP">FOLLOW UP</option>
                    <option value="DEMO">DEMO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="text"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    placeholder="e.g. 26 Mar 2026"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Task Remarks
                </label>
                <input
                  type="text"
                  value={taskForm.remarks}
                  onChange={(e) => setTaskForm({ ...taskForm, remarks: e.target.value })}
                  placeholder="Optional remarks"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                Add Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONTACT DETAILS (SUPERFONE FULL VIEW)
          ========================================================================= */}
      {viewContact && (
        <div className="fixed inset-0 z-50 bg-[#f8fafc] dark:bg-dark-900 overflow-y-auto">
          <ContactDetailView
            contact={{
              ...viewContact,
              phone: viewContact.phone || '',
              assignedTelecaller: viewContact.assignedTelecaller || user?.name || 'Agent',
            }}
            onBack={() => setViewContact(null)}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  );
}
