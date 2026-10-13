import { useState, useMemo, useEffect } from 'react';
import {
  CheckSquare,
  Calendar,
  ChevronDown,
  X,
  Sparkles,
  Clock,
  Bell,
  PhoneCall,
  CheckCircle2,
  ChevronRight,
  Plus,
  Inbox,
  Filter,
  User,
  Building2,
  AlertCircle,
  Mail,
  Phone,
  MessageCircle,
  DollarSign,
  Tag,
  Link2,
  ListPlus,
  Trash2,
  Search,
  Check,
  Send,
  Loader2,
  Globe,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { getFollowUps, createFollowUp, updateFollowUp, deleteFollowUp } from '../api/followups';
import { getLeads, updateLead } from '../api/leads';
import { getCustomers } from '../api/customers';
import { getUpcomingEvents } from '../api/events';
import { getUsers } from '../api/users';
import { audioEngine } from '../utils/audioPlayer';

export default function ToDos({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Active Main Tab: 'fresh' | 'followups' | 'reminders'
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('smartcrm_filter_telecaller') ? 'followups' : 'fresh';
  });

  // Follow-up Subcategory Pill Filter
  const [subCategory, setSubCategory] = useState('ALL');

  // Filter States matching screenshot
  const [taskDueDate, setTaskDueDate] = useState('Sep 29, 2026 – Oct 06, 2026');
  const [teamName, setTeamName] = useState('Main Team');
  const [taskStatus, setTaskStatus] = useState('Pending');
  const [assignedTo, setAssignedTo] = useState(() => {
    const saved = sessionStorage.getItem('smartcrm_filter_telecaller');
    if (saved) {
      sessionStorage.removeItem('smartcrm_filter_telecaller');
      return saved;
    }
    return 'Select assigned to';
  });
  const [leadCreatedDate, setLeadCreatedDate] = useState('');

  // Dropdown toggles
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Teams & Staff lists
  const [telecallers, setTelecallers] = useState([]);
  const teamsList = ['Main Team'];
  const staffList = useMemo(() => [
    'Select assigned to',
    ...telecallers.map((t) => t.name),
  ], [telecallers]);

  // Data states
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal: Add Task
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [newTaskForm, setNewTaskForm] = useState({
    customerId: '',
    customerName: '',
    phone: '',
    email: '',
    company: '',
    category: 'FOLLOW-UP CALL',
    date: todayDateStr,
    time: '17:00',
    remarks: '',
    assignedTo: '',
    priority: 'medium',
    leadStatus: 'Follow Up',
    dealValue: '',
    reminderBefore: '15 mins before',
    meetingLink: '',
    tags: ['Follow-up'],
    checklist: [],
    sendClientWhatsApp: false,
    sendCallerNotice: true,
  });

  // Consolidated CRM Contacts list for quick auto-fill
  const allContactsList = useMemo(() => {
    const list = [];
    (leads || []).forEach((l) => {
      list.push({
        _id: l._id,
        name: l.name,
        phone: l.phone,
        email: l.email || '',
        company: l.company || '',
        status: l.status || 'lead',
        type: 'Lead',
      });
    });
    (customers || []).forEach((c) => {
      const p = c.phone || c.mobile;
      if (!list.some((item) => item.phone === p)) {
        list.push({
          _id: c._id,
          name: c.name,
          phone: p,
          email: c.email || '',
          company: c.company || '',
          status: c.status || 'customer',
          type: 'Client',
        });
      }
    });
    return list;
  }, [leads, customers]);

  // Fetch real CRM records
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getLeads({ limit: 100 }).catch(() => ({ leads: [] })),
      getFollowUps({ limit: 200 }).catch(() => ({ followUps: [] })),
      getUpcomingEvents(14).catch(() => ({ events: [] })),
      getUsers().catch(() => ({ users: [] })),
      getCustomers({ limit: 100 }).catch(() => ({ customers: [] })),
    ])
      .then(([leadsRes, followUpsRes, eventsRes, usersRes, customersRes]) => {
        setLeads(leadsRes.leads || []);
        setCustomers(customersRes.customers || []);
        const loadedUsers = (usersRes.users || []).filter(u => u.status === 'active' || u.role === 'telecaller');
        setTelecallers(loadedUsers);

        if (followUpsRes.followUps) {
          const apiMapped = followUpsRes.followUps.map((f) => ({
            _id: f._id,
            customerName: f.customerName || f.customerId?.name || 'Customer',
            phone: f.phone || f.customerId?.mobile || '',
            email: f.email || f.customerId?.email || '',
            company: f.company || f.customerId?.company || '',
            category: f.type || 'FOLLOW-UP CALL',
            type: f.type || 'REMINDER',
            date: f.date ? `${f.date} ${f.time || ''}` : 'Today',
            time: f.time || '',
            remarks: f.remarks || 'Follow-up task',
            status: f.status || 'pending',
            assignedTo: f.assignedToName || f.createdByName || 'Lead',
            assignedToId: f.assignedTo || f.createdBy,
            priority: f.priority || 'medium',
            leadStatus: f.leadStatus || '',
            dealValue: f.dealValue || 0,
            reminderBefore: f.reminderBefore || '',
            meetingLink: f.meetingLink || '',
            tags: f.tags || [],
            checklist: f.checklist || [],
          }));
          setFollowUps(apiMapped);
          try {
            localStorage.setItem('smartcrm_all_tasks', JSON.stringify(apiMapped));
          } catch {}
        } else {
          setFollowUps([]);
        }
        setReminders(eventsRes.events || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filtered lists
  const filteredFollowUps = useMemo(() => {
    return followUps.filter((f) => {
      const matchStatus =
        taskStatus === 'All' ||
        (taskStatus === 'Pending' && f.status === 'pending') ||
        (taskStatus === 'Completed' && f.status === 'completed');
      const matchSub =
        subCategory === 'ALL' ||
        (f.category && f.category.toUpperCase().includes(subCategory.replace('-', ' '))) ||
        (f.remarks && f.remarks.toUpperCase().includes(subCategory.replace('-', ' ')));
      return matchStatus && matchSub;
    });
  }, [followUps, taskStatus, subCategory]);

  const freshLeads = useMemo(() => {
    return leads.filter((l) => l.status === 'new');
  }, [leads]);

  const activeReminders = useMemo(() => {
    return reminders.filter((r) => r.status !== 'done');
  }, [reminders]);

  const clearAllFilters = () => {
    setTeamName('');
    setTaskStatus('All');
    setTaskDueDate('');
    setAssignedTo('Select assigned to');
    setLeadCreatedDate('');
    addToast('All filters cleared', 'info');
  };

  const handleToggleCompleteFollowUp = async (task) => {
    const nextCompleted = task.status !== 'completed';
    const ok = await confirm({
      title: nextCompleted ? 'Complete Task' : 'Reopen Task',
      message: `Are you sure you want to mark task for "${task.customerName}" as ${nextCompleted ? 'Completed' : 'Pending'}?`,
      confirmText: nextCompleted ? 'Mark Complete' : 'Mark Pending',
      cancelText: 'Cancel',
      type: nextCompleted ? 'primary' : 'warning',
    });
    if (!ok) return;

    if (task._id && task._id.length === 24) {
      updateFollowUp(task._id, { status: nextCompleted ? 'completed' : 'pending' }).catch(() => {});
    }

    setFollowUps((prev) => {
      const updated = prev.map((f) =>
        f._id === task._id ? { ...f, status: nextCompleted ? 'completed' : 'pending' } : f
      );
      try {
        localStorage.setItem('smartcrm_all_tasks', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    addToast(`Task marked as ${nextCompleted ? 'Completed' : 'Pending'}!`, 'success');
  };

  const handleDeleteFollowUp = async (task) => {
    const ok = await confirm({
      title: 'Delete Task',
      message: `Are you sure you want to permanently delete task for "${task.customerName}"?`,
      confirmText: 'Delete Task',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!ok) return;

    if (task._id && task._id.length === 24) {
      deleteFollowUp(task._id).catch(() => {});
    }

    setFollowUps((prev) => {
      const updated = prev.filter((f) => f._id !== task._id);
      try {
        localStorage.setItem('smartcrm_all_tasks', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    addToast('Task deleted successfully', 'info');
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskForm.customerName.trim() || !newTaskForm.remarks.trim()) {
      addToast('Customer name and task remarks are required', 'error');
      return;
    }

    setIsSubmittingTask(true);
    const assignedTc = telecallers.find((t) => t._id === newTaskForm.assignedTo);
    const assignedName = assignedTc?.name || user?.name || 'Lead';

    const formattedTime = newTaskForm.time ? (
      newTaskForm.time.includes('AM') || newTaskForm.time.includes('PM')
        ? newTaskForm.time
        : (() => {
            const [h, m] = newTaskForm.time.split(':');
            const hour = parseInt(h, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hr12 = hour % 12 || 12;
            return `${String(hr12).padStart(2, '0')}:${m || '00'} ${ampm}`;
          })()
    ) : '05:00 PM';

    const newId = `fu_${Date.now()}`;
    const createdTask = {
      _id: newId,
      customerId: newTaskForm.customerId || undefined,
      customerName: newTaskForm.customerName.trim(),
      phone: newTaskForm.phone.trim() || '',
      email: newTaskForm.email.trim() || '',
      company: newTaskForm.company.trim() || '',
      category: newTaskForm.category,
      type: newTaskForm.category,
      date: newTaskForm.date,
      time: formattedTime,
      remarks: newTaskForm.remarks.trim(),
      status: 'pending',
      assignedTo: assignedName,
      assignedToId: newTaskForm.assignedTo || user?._id,
      priority: newTaskForm.priority || 'medium',
      leadStatus: newTaskForm.leadStatus || 'Follow Up',
      dealValue: Number(newTaskForm.dealValue) || 0,
      reminderBefore: newTaskForm.reminderBefore || '15 mins before',
      meetingLink: newTaskForm.meetingLink || '',
      tags: newTaskForm.tags || [],
      checklist: newTaskForm.checklist || [],
      createdAt: new Date().toISOString(),
    };

    try {
      const serverRes = await createFollowUp({
        customerName: newTaskForm.customerName.trim(),
        customerId: newTaskForm.customerId || undefined,
        phone: newTaskForm.phone.trim() || '',
        email: newTaskForm.email.trim() || '',
        company: newTaskForm.company.trim() || '',
        date: newTaskForm.date,
        time: formattedTime,
        remarks: `[${newTaskForm.category}] ${newTaskForm.remarks.trim()}`,
        nextFollowUp: newTaskForm.date,
        type: newTaskForm.category,
        assignedTo: newTaskForm.assignedTo || user?._id || undefined,
        priority: newTaskForm.priority || 'medium',
        leadStatus: newTaskForm.leadStatus || 'Follow Up',
        dealValue: Number(newTaskForm.dealValue) || 0,
        reminderBefore: newTaskForm.reminderBefore || '15 mins before',
        meetingLink: newTaskForm.meetingLink || '',
        tags: newTaskForm.tags || [],
        checklist: newTaskForm.checklist || [],
      }).catch(() => null);
      if (serverRes?.followUp?._id) {
        createdTask._id = serverRes.followUp._id;
      }
    } catch {}

    setFollowUps((prev) => {
      const updated = [createdTask, ...prev];
      try {
        localStorage.setItem('smartcrm_all_tasks', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setIsAddTaskOpen(false);
    setIsSubmittingTask(false);
    setNewTaskForm({
      customerId: '',
      customerName: '',
      phone: '',
      email: '',
      company: '',
      category: 'FOLLOW-UP CALL',
      date: new Date().toISOString().split('T')[0],
      time: '17:00',
      remarks: '',
      assignedTo: '',
      priority: 'medium',
      leadStatus: 'Follow Up',
      dealValue: '',
      reminderBefore: '15 mins before',
      meetingLink: '',
      tags: ['Follow-up'],
      checklist: [],
      sendClientWhatsApp: false,
      sendCallerNotice: true,
    });
    setNewChecklistItem('');
    addToast(`Task assigned successfully to ${assignedName}`, 'success');
  };

  const handleConvertLead = async (lead) => {
    const ok = await confirm({
      title: 'Move Lead to Contacted',
      message: `Are you sure you want to update status of lead "${lead.name}" to Contacted?`,
      confirmText: 'Mark Contacted',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    if (lead._id && lead._id.length === 24) {
      updateLead(lead._id, { status: 'contacted' }).catch(() => {});
    }

    setLeads((prev) => prev.map((l) => (l._id === lead._id ? { ...l, status: 'contacted' } : l)));
    addToast(`Lead ${lead.name} moved to Contacted!`, 'success');
  };

  const handleCompleteReminder = async (rem) => {
    const ok = await confirm({
      title: 'Complete Reminder',
      message: `Are you sure you want to mark this reminder as done?`,
      confirmText: 'Mark Done',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    setReminders((prev) => prev.map((r) => (r._id === rem._id ? { ...r, status: 'done' } : r)));
    addToast('Reminder completed!', 'success');
  };

  const handleCallNumber = (phone, name) => {
    audioEngine.playRingTone();
    addToast(`Initiating call to ${name} (+91 ${phone})...`, 'success');
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean) {
      try {
        window.open(`tel:${clean}`, '_self');
      } catch {}
    }
    setTimeout(() => {
      audioEngine.stopRingTone();
    }, 3000);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Header Bar matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
            <CheckSquare size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">
              Tasks
            </h1>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5">
              Fresh leads, follow-ups, and reminders — handle them before they age.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddTaskOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Task</span>
        </button>
      </div>

      {/* 2. Filters Card Container matching screenshot */}
      <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4">
        <div className="text-xs font-bold text-dark-900 dark:text-white">
          <span>Filters</span>
        </div>

        {/* Row 1 of Filters: TASK DUE DATE, TEAM NAME, TASK STATUS, ASSIGNED TO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* TASK DUE DATE */}
          <div>
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              TASK DUE DATE
            </label>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 shadow-2xs">
              <div className="flex items-center gap-2 text-dark-700 dark:text-dark-200 font-medium truncate">
                <Calendar size={14} className="text-dark-400 flex-shrink-0" />
                <span className="truncate">{taskDueDate || 'Pick date range'}</span>
              </div>
              {taskDueDate && (
                <button
                  onClick={() => setTaskDueDate('')}
                  className="text-dark-400 hover:text-dark-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* TEAM NAME */}
          <div className="relative">
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              TEAM NAME
            </label>
            <div
              onClick={() => setShowTeamDropdown(!showTeamDropdown)}
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 cursor-pointer shadow-2xs"
            >
              <span className="text-blue-700 dark:text-blue-300 font-semibold truncate">
                {teamName || 'Select team'}
              </span>
              <div className="flex items-center gap-1 text-dark-400">
                {teamName && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTeamName('');
                    }}
                    className="hover:text-dark-700"
                  >
                    <X size={14} />
                  </button>
                )}
                <ChevronDown size={14} />
              </div>
            </div>

            {showTeamDropdown && (
              <div className="absolute left-0 mt-2 w-full rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 shadow-2xl z-30 space-y-1">
                {teamsList.map((tm) => (
                  <div
                    key={tm}
                    onClick={() => {
                      setTeamName(tm);
                      setShowTeamDropdown(false);
                    }}
                    className="p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer font-medium text-dark-800 dark:text-dark-200 text-xs"
                  >
                    {tm}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TASK STATUS */}
          <div className="relative">
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              TASK STATUS
            </label>
            <div
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 cursor-pointer shadow-2xs"
            >
              <span className="text-blue-700 dark:text-blue-300 font-semibold truncate">
                {taskStatus}
              </span>
              <div className="flex items-center gap-1 text-dark-400">
                <ChevronDown size={14} />
              </div>
            </div>

            {showStatusDropdown && (
              <div className="absolute left-0 mt-2 w-full rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 shadow-2xl z-30 space-y-1">
                {['Pending', 'Completed', 'Overdue', 'All'].map((st) => (
                  <div
                    key={st}
                    onClick={() => {
                      setTaskStatus(st);
                      setShowStatusDropdown(false);
                    }}
                    className="p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer font-medium text-dark-800 dark:text-dark-200 text-xs"
                  >
                    {st}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ASSIGNED TO */}
          <div className="relative">
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              ASSIGNED TO
            </label>
            <div
              onClick={() => setShowAssignDropdown(!showAssignDropdown)}
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 cursor-pointer shadow-2xs text-dark-700 dark:text-dark-200"
            >
              <span className="truncate">{assignedTo}</span>
              <ChevronDown size={14} className="text-dark-400" />
            </div>

            {showAssignDropdown && (
              <div className="absolute left-0 mt-2 w-full rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 shadow-2xl z-30 space-y-1">
                {staffList.map((st) => (
                  <div
                    key={st}
                    onClick={() => {
                      setAssignedTo(st);
                      setShowAssignDropdown(false);
                    }}
                    className="p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer font-medium text-dark-800 dark:text-dark-200 text-xs"
                  >
                    {st}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: LEAD CREATED DATE */}
        <div className="w-full sm:w-72 text-xs">
          <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
            LEAD CREATED DATE
          </label>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 shadow-2xs text-dark-500">
            <Calendar size={14} className="text-dark-400 flex-shrink-0" />
            <input
              type="text"
              value={leadCreatedDate}
              onChange={(e) => setLeadCreatedDate(e.target.value)}
              placeholder="Pick a date range"
              className="bg-transparent focus:outline-none w-full placeholder:text-dark-400"
            />
          </div>
        </div>

        {/* Active Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-dark-100 dark:border-dark-700/60 text-xs">
          {teamName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium text-[11px] border border-blue-200 dark:border-blue-900/60">
              <span>Team name: {teamName}</span>
              <button onClick={() => setTeamName('')} className="font-bold hover:text-rose-600">
                ×
              </button>
            </span>
          )}

          {taskStatus && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium text-[11px] border border-blue-200 dark:border-blue-900/60">
              <span>Task status: {taskStatus}</span>
              <button onClick={() => setTaskStatus('All')} className="font-bold hover:text-rose-600">
                ×
              </button>
            </span>
          )}

          {taskDueDate && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium text-[11px] border border-blue-200 dark:border-blue-900/60">
              <span>Task due date: 29th Sep 2026 – 6th Oct ...</span>
              <button onClick={() => setTaskDueDate('')} className="font-bold hover:text-rose-600">
                ×
              </button>
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="text-blue-600 hover:underline font-semibold text-[11px] ml-1"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* 3. USAGE BY TEAM Card */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider px-1">
          USAGE BY TEAM
        </span>
        <div
          onClick={() => onNavigate?.('teams')}
          className="p-4 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between max-w-sm group"
        >
          <div>
            <h4 className="font-bold text-dark-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors">
              Main Team
            </h4>
            <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
              22/10000 leads used
            </p>
          </div>
          <ChevronRight size={16} className="text-dark-400 group-hover:text-blue-600 transition-colors" />
        </div>
      </div>

      {/* 4. Three Main Tabs: Fresh Leads | Follow Ups | Reminders */}
      <div className="flex border-b border-dark-200 dark:border-dark-700 gap-8 text-sm font-semibold pt-1">
        <button
          onClick={() => setActiveTab('fresh')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
            activeTab === 'fresh'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
          }`}
        >
          <Sparkles size={16} />
          <span>Fresh Leads</span>
          <span className="text-xs font-normal text-dark-400">{freshLeads.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
            activeTab === 'followups'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
          }`}
        >
          <Clock size={16} />
          <span>Follow Ups</span>
          <span className="text-xs font-normal text-dark-400">{filteredFollowUps.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
            activeTab === 'reminders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
          }`}
        >
          <Bell size={16} />
          <span>Reminders</span>
          <span className="text-xs font-normal text-dark-400">{activeReminders.length}</span>
        </button>
      </div>

      {/* 5. Tab Content Area */}
      {/* TAB 1: Fresh Leads */}
      {activeTab === 'fresh' && (
        <div className="space-y-3 font-inter">
          {freshLeads.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 flex items-center justify-center text-dark-400">
                <Inbox size={26} />
              </div>
              <h3 className="font-bold text-dark-900 dark:text-white text-base">
                No fresh leads
              </h3>
              <p className="text-xs text-dark-500 max-w-sm">
                You&apos;re all caught up — new leads will show up here when they arrive.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {freshLeads.map((l) => (
                <div
                  key={l._id}
                  className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-2xs space-y-3 hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-dark-900 dark:text-white">
                        {l.name}
                      </h4>
                      <p className="text-xs text-dark-500 mt-0.5">
                        +91 {l.phone} • {l.city || 'Delhi'}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Fresh Lead
                    </span>
                  </div>

                  <div className="text-xs text-dark-600 dark:text-dark-300 flex items-center gap-3">
                    <span>Source: {l.source || 'Inbound'}</span>
                    <span>•</span>
                    <span>Owner: {l.assignedTelecaller || 'Main Team'}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-700/60">
                    <button
                      type="button"
                      onClick={() => handleCallNumber(l.phone, l.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors"
                    >
                      <PhoneCall size={13} />
                      <span>Call Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConvertLead(l)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-900 cursor-pointer transition-colors"
                    >
                      Mark Contacted
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Follow Ups */}
      {activeTab === 'followups' && (
        <div className="space-y-4 font-inter">
          {/* Sub-Category Filter Pills Row matching Screenshot 3 */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'FOLLOW-UP CALL', label: 'FOLLOW-UP CALL' },
              { id: 'CALLBACK REQUEST', label: 'CALLBACK REQUEST' },
              { id: 'SITE VISIT', label: 'SITE VISIT' },
              { id: 'BOOKING/ APPOINTMENT/ DEMO', label: 'BOOKING/ APPOINTMENT/ DEMO' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSubCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  subCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {filteredFollowUps.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 flex items-center justify-center text-dark-400">
                <Inbox size={26} />
              </div>
              <h3 className="font-bold text-dark-900 dark:text-white text-base">
                No follow-ups due
              </h3>
              <p className="text-xs text-dark-500 max-w-sm">
                Nothing is waiting for a follow-up. Adjust the period or sub-filters to see more.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFollowUps.map((task) => {
                const isCompleted = task.status === 'completed';

                return (
                  <div
                    key={task._id}
                    className={`relative rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-4 transition-all hover:shadow-xs ${
                      isCompleted ? 'opacity-70 bg-dark-50/50' : ''
                    }`}
                  >
                    {/* Blue vertical accent bar */}
                    <div
                      className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r ${
                        isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                    />

                    <div className="pl-2 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            | {task.category || task.type || 'FOLLOW-UP'}
                          </span>
                          <span className="text-dark-300">•</span>
                          <span className="text-xs font-semibold text-dark-700 dark:text-dark-200">
                            {task.customerName}
                          </span>
                          {task.phone && (
                            <span className="text-xs text-dark-400">
                              (+91 {task.phone})
                            </span>
                          )}
                          {task.priority && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                task.priority === 'urgent'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
                                  : task.priority === 'high'
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200'
                                  : task.priority === 'low'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'
                              }`}
                            >
                              {task.priority}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-dark-500">
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="text-dark-400" />
                            <span>{task.date || 'Today, 05:00 PM'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteFollowUp(task)}
                            className="hover:text-rose-600 p-1 cursor-pointer text-dark-400 transition-colors"
                            title="Delete Task"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {(task.company || task.email || task.dealValue > 0 || task.leadStatus || (task.tags && task.tags.length > 0) || task.meetingLink) && (
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-dark-600 dark:text-dark-400">
                          {task.company && (
                            <span className="flex items-center gap-1 font-semibold text-dark-700 dark:text-dark-300">
                              <Building2 size={12} className="text-dark-400" />
                              {task.company}
                            </span>
                          )}
                          {task.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={12} className="text-dark-400" />
                              {task.email}
                            </span>
                          )}
                          {task.leadStatus && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                              {task.leadStatus}
                            </span>
                          )}
                          {task.dealValue > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                              ₹ {task.dealValue.toLocaleString()}
                            </span>
                          )}
                          {(task.tags || []).map((tg, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300 text-[10px]">
                              #{tg}
                            </span>
                          ))}
                          {task.meetingLink && (
                            <a
                              href={task.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                            >
                              <Link2 size={11} /> Link
                            </a>
                          )}
                        </div>
                      )}

                      <div className="text-[13px] leading-[22px] text-dark-800 dark:text-dark-200 bg-dark-50 dark:bg-dark-900/60 p-2.5 rounded-lg border border-dark-100 dark:border-dark-700/60">
                        <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">REMARKS</p>
                        <p className="mt-0.5">{task.remarks || 'No remarks provided'}</p>
                      </div>

                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <span className="text-xs text-dark-400">
                          Assigned to: <strong className="text-dark-700 dark:text-dark-300">{task.assignedTo || user?.name || 'Agent'}</strong>
                        </span>

                        <div className="flex items-center gap-2">
                          {task.phone && (
                            <button
                              type="button"
                              onClick={() => handleCallNumber(task.phone, task.customerName)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors"
                            >
                              <PhoneCall size={12} />
                              <span>Call</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleCompleteFollowUp(task)}
                            className={`h-8 px-4 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                              isCompleted
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {isCompleted ? 'Completed' : 'Mark as Complete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Reminders */}
      {activeTab === 'reminders' && (
        <div className="space-y-3 font-inter">
          {activeReminders.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 flex items-center justify-center text-dark-400">
                <Bell size={26} />
              </div>
              <h3 className="font-bold text-dark-900 dark:text-white text-base">
                No reminders
              </h3>
              <p className="text-xs text-dark-500 max-w-sm">
                You have no active reminders right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeReminders.map((rem) => (
                <div
                  key={rem._id}
                  className="p-4 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-2xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-dark-900 dark:text-white">
                        {rem.title}
                      </h4>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Due: {rem.date} {rem.time || ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCompleteReminder(rem)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Mark Done
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add & Assign Task */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-dark-200 dark:border-dark-700 overflow-hidden font-inter">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-dark-100 dark:border-dark-700/60 flex items-center justify-between bg-dark-50/60 dark:bg-dark-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <CheckSquare size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark-900 dark:text-white leading-tight">
                    Add &amp; Assign Task
                  </h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400">
                    Schedule client follow-ups, meetings, reminders, or delegate tasks to team leads.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTaskOpen(false)}
                className="p-1.5 rounded-lg text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleCreateTask} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* 1. Quick Link Existing Lead / Client */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Search size={13} className="text-blue-600 dark:text-blue-400" />
                    <span>Quick Autofill from CRM Lead / Client</span>
                  </label>
                  {newTaskForm.customerId && (
                    <button
                      type="button"
                      onClick={() =>
                        setNewTaskForm((prev) => ({
                          ...prev,
                          customerId: '',
                          customerName: '',
                          phone: '',
                          email: '',
                          company: '',
                        }))
                      }
                      className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Clear &amp; Enter Manually
                    </button>
                  )}
                </div>
                <select
                  value={newTaskForm.customerId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (!selectedId) {
                      setNewTaskForm((prev) => ({ ...prev, customerId: '' }));
                      return;
                    }
                    const found = allContactsList.find((c) => c._id === selectedId);
                    if (found) {
                      setNewTaskForm((prev) => ({
                        ...prev,
                        customerId: found._id,
                        customerName: found.name,
                        phone: found.phone || '',
                        email: found.email || '',
                        company: found.company || '',
                        leadStatus: found.status ? (found.status.charAt(0).toUpperCase() + found.status.slice(1)) : 'Follow Up',
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-dark-900 border border-blue-200 dark:border-blue-800 text-dark-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
                >
                  <option value="">Search or select an existing contact to auto-fill...</option>
                  {allContactsList.map((c) => (
                    <option key={c._id} value={c._id}>
                      [{c.type}] {c.name} {c.phone ? `(${c.phone})` : ''} {c.company ? `• ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Assign Task To (Caller / Lead) */}
              <div>
                <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                  Assign Task To (Caller / Lead)
                </label>
                <select
                  value={newTaskForm.assignedTo}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                >
                  <option value="">Default (Me / Current Lead)</option>
                  {telecallers.map((tc) => (
                    <option key={tc._id} value={tc._id}>
                      {tc.name} {tc.email ? `(${tc.email})` : ''} — {tc.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Customer & Contact Details (2x2 Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Customer / Contact Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                    <input
                      type="text"
                      required
                      value={newTaskForm.customerName}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, customerName: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                    <input
                      type="text"
                      value={newTaskForm.phone}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                    <input
                      type="email"
                      value={newTaskForm.email}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, email: e.target.value })}
                      placeholder="e.g. rahul@example.com"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Company / Organization
                  </label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                    <input
                      type="text"
                      value={newTaskForm.company}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, company: e.target.value })}
                      placeholder="e.g. Apex Realty"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Task Classification, Priority, Pipeline & Deal Value (4 Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Task Category
                  </label>
                  <select
                    value={newTaskForm.category}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                  >
                    <option value="FOLLOW-UP CALL">Follow-up Call</option>
                    <option value="CALLBACK REQUEST">Callback Request</option>
                    <option value="BOOKING/ APPOINTMENT/ DEMO">Demo / Meeting</option>
                    <option value="WHATSAPP OUTREACH">WhatsApp Outreach</option>
                    <option value="EMAIL OUTREACH">Email Outreach</option>
                    <option value="QUOTATION / PROPOSAL">Quotation / Proposal</option>
                    <option value="PAYMENT COLLECTION">Payment Collection</option>
                    <option value="SITE VISIT">Site Visit</option>
                    <option value="REMINDER">Reminder / Task</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold cursor-pointer"
                  >
                    <option value="low">Low (Standard)</option>
                    <option value="medium">Medium (Normal)</option>
                    <option value="high">High (Important)</option>
                    <option value="urgent">Urgent (Immediate)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Lead Pipeline Stage
                  </label>
                  <select
                    value={newTaskForm.leadStatus}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, leadStatus: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                  >
                    <option value="Interested">Interested</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Demo Scheduled">Demo Scheduled</option>
                    <option value="Quotation Sent">Quotation Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Ready to Buy">Ready to Buy</option>
                    <option value="Won / Converted">Won / Converted</option>
                    <option value="Cold Lead">Cold Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Deal Value (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={newTaskForm.dealValue}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, dealValue: e.target.value })}
                      placeholder="e.g. 50000"
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Due Date, Due Time & Reminder Alert (3 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-dark-700 dark:text-dark-300">Due Date</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setNewTaskForm((p) => ({ ...p, date: todayDateStr }))}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer font-semibold"
                      >
                        Today
                      </button>
                      <span className="text-dark-300">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const tmrw = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                          setNewTaskForm((p) => ({ ...p, date: tmrw }));
                        }}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer font-semibold"
                      >
                        Tmrw
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={newTaskForm.date}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-dark-700 dark:text-dark-300">Due Time</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setNewTaskForm((p) => ({ ...p, time: '11:00' }))}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer font-semibold"
                      >
                        11 AM
                      </button>
                      <span className="text-dark-300">•</span>
                      <button
                        type="button"
                        onClick={() => setNewTaskForm((p) => ({ ...p, time: '17:00' }))}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer font-semibold"
                      >
                        5 PM
                      </button>
                    </div>
                  </div>
                  <input
                    type="time"
                    value={newTaskForm.time}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, time: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Reminder Notification
                  </label>
                  <select
                    value={newTaskForm.reminderBefore}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, reminderBefore: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="At time of event">At time of event</option>
                    <option value="15 mins before">15 minutes before</option>
                    <option value="30 mins before">30 minutes before</option>
                    <option value="1 hour before">1 hour before</option>
                    <option value="1 day before">1 day before</option>
                    <option value="No reminder">No reminder</option>
                  </select>
                </div>
              </div>

              {/* 6. Meeting / Document Link */}
              <div>
                <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                  Meeting Link / Document Reference URL (Optional)
                </label>
                <div className="relative">
                  <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input
                    type="url"
                    value={newTaskForm.meetingLink}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, meetingLink: e.target.value })}
                    placeholder="e.g. https://meet.google.com/abc-defg-hij or Google Drive proposal link"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 7. Quick Tags / Labels */}
              <div>
                <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1.5 flex items-center gap-1.5">
                  <Tag size={13} className="text-dark-400" />
                  <span>Task Tags &amp; Labels</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['Hot Lead', 'High Value', 'New Client', 'VIP', 'Payment Pending', 'Renewal', 'Enterprise'].map((tag) => {
                    const isSelected = (newTaskForm.tags || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const currentTags = newTaskForm.tags || [];
                          const updated = isSelected
                            ? currentTags.filter((t) => t !== tag)
                            : [...currentTags, tag];
                          setNewTaskForm({ ...newTaskForm, tags: updated });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-dark-50 dark:bg-dark-900/40 border-dark-200 dark:border-dark-700 text-dark-600 dark:text-dark-300 hover:border-dark-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 8. Action Checklist / Sub-Tasks */}
              <div className="p-3 rounded-xl bg-dark-50/70 dark:bg-dark-900/40 border border-dark-200 dark:border-dark-700 space-y-2">
                <label className="font-bold text-dark-700 dark:text-dark-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ListPlus size={13} className="text-dark-500" />
                    <span>Action Checklist / Sub-Tasks</span>
                  </span>
                  <span className="text-[10px] text-dark-400 font-normal">
                    {(newTaskForm.checklist || []).length} item(s)
                  </span>
                </label>

                {/* Existing checklist items */}
                {(newTaskForm.checklist || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-xs">
                    <span className="flex items-center gap-2 text-dark-800 dark:text-dark-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>{item.text}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (newTaskForm.checklist || []).filter((_, i) => i !== idx);
                        setNewTaskForm({ ...newTaskForm, checklist: updated });
                      }}
                      className="text-dark-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}

                {/* Add new checklist item input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newChecklistItem.trim()) {
                          setNewTaskForm((p) => ({
                            ...p,
                            checklist: [...(p.checklist || []), { text: newChecklistItem.trim(), completed: false }],
                          }));
                          setNewChecklistItem('');
                        }
                      }
                    }}
                    placeholder="e.g. Send updated pricing catalog, Confirm Zoom meeting..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newChecklistItem.trim()) {
                        setNewTaskForm((p) => ({
                          ...p,
                          checklist: [...(p.checklist || []), { text: newChecklistItem.trim(), completed: false }],
                        }));
                        setNewChecklistItem('');
                      }
                    }}
                    className="px-3 py-1.5 bg-dark-200 dark:bg-dark-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold text-dark-700 dark:text-dark-200 transition-colors cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {/* 9. Remarks / Notes (Instructions) */}
              <div>
                <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                  Task Remarks, Agenda &amp; Instructions <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newTaskForm.remarks}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, remarks: e.target.value })}
                  placeholder="Provide talking points, context, follow-up objective, or deliverables for the telecaller..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>

              {/* 10. Communication / Notification Options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-dark-100 dark:border-dark-700/60">
                <label className="flex items-center gap-2 cursor-pointer text-dark-700 dark:text-dark-300 select-none">
                  <input
                    type="checkbox"
                    checked={newTaskForm.sendCallerNotice}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, sendCallerNotice: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Notify assigned telecaller</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-dark-700 dark:text-dark-300 select-none">
                  <input
                    type="checkbox"
                    checked={newTaskForm.sendClientWhatsApp}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, sendClientWhatsApp: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Send WhatsApp alert to customer</span>
                </label>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-dark-100 dark:border-dark-700/60">
                <button
                  type="button"
                  onClick={() => setIsAddTaskOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 text-dark-700 dark:text-dark-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSubmittingTask && <Loader2 size={13} className="animate-spin" />}
                  <span>{isSubmittingTask ? 'Saving Task...' : 'Save & Assign Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
