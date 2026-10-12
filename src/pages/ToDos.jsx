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
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { getFollowUps, createFollowUp, updateFollowUp, deleteFollowUp } from '../api/followups';
import { getLeads, updateLead } from '../api/leads';
import { getUpcomingEvents } from '../api/events';
import { audioEngine } from '../utils/audioPlayer';

export default function ToDos({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Active Main Tab: 'fresh' | 'followups' | 'reminders'
  const [activeTab, setActiveTab] = useState('fresh');

  // Follow-up Subcategory Pill Filter
  const [subCategory, setSubCategory] = useState('ALL');

  // Filter States matching screenshot
  const [taskDueDate, setTaskDueDate] = useState('Sep 29, 2026 – Oct 06, 2026');
  const [teamName, setTeamName] = useState('Main Team');
  const [taskStatus, setTaskStatus] = useState('Pending');
  const [assignedTo, setAssignedTo] = useState('Select assigned to');
  const [leadCreatedDate, setLeadCreatedDate] = useState('');

  // Dropdown toggles
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Teams & Staff lists
  const teamsList = ['Main Team'];
  const staffList = [
    'Select assigned to',
    ...(user?.name ? [user.name] : []),
  ];

  // Data states
  const [leads, setLeads] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal: Add Task
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    customerName: '',
    phone: '',
    category: 'FOLLOW-UP CALL',
    date: 'Today, 05:00 PM',
    remarks: '',
  });

  // Fetch real CRM records
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getLeads({ limit: 100 }).catch(() => ({ leads: [] })),
      getFollowUps({ limit: 100 }).catch(() => ({ followUps: [] })),
      getUpcomingEvents(14).catch(() => ({ events: [] })),
    ])
      .then(([leadsRes, followUpsRes, eventsRes]) => {
        setLeads(leadsRes.leads || []);
        if (followUpsRes.followUps) {
          const apiMapped = followUpsRes.followUps.map((f) => ({
            _id: f._id,
            customerName: f.customerName || f.customerId?.name || 'Customer',
            phone: f.phone || f.customerId?.mobile || '',
            category: f.type || 'FOLLOW-UP CALL',
            type: f.type || 'REMINDER',
            date: f.date ? `${f.date} ${f.time || ''}` : 'Today',
            time: f.time || '',
            remarks: f.remarks || 'Follow-up task',
            status: f.status || 'pending',
            assignedTo: f.createdByName || 'Agent',
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

    const newId = `fu_${Date.now()}`;
    const createdTask = {
      _id: newId,
      customerName: newTaskForm.customerName.trim(),
      phone: newTaskForm.phone.trim() || '',
      category: newTaskForm.category,
      type: newTaskForm.category,
      date: newTaskForm.date,
      time: '05:00 PM',
      remarks: newTaskForm.remarks.trim(),
      status: 'pending',
      assignedTo: user?.name || 'Agent',
      createdAt: new Date().toISOString(),
    };

    try {
      const serverRes = await createFollowUp({
        customerName: newTaskForm.customerName.trim(),
        customerId: newTaskForm.customerId || undefined,
        phone: newTaskForm.phone.trim() || '',
        date: new Date().toISOString().split('T')[0],
        time: '05:00 PM',
        remarks: `[${newTaskForm.category}] ${newTaskForm.remarks.trim()}`,
        nextFollowUp: newTaskForm.date,
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
    setNewTaskForm({
      customerName: '',
      phone: '',
      category: 'FOLLOW-UP CALL',
      date: 'Today, 05:00 PM',
      remarks: '',
    });
    addToast('Follow-up task created successfully!', 'success');
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
                        <div className="flex items-center gap-2">
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
                            {isCompleted ? 'Completed ✓' : 'Mark as Complete'}
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

      {/* Modal: Add Task */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleCreateTask}
            className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4 font-inter"
          >
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">Add Follow-Up Task</h3>
              <button
                type="button"
                onClick={() => setIsAddTaskOpen(false)}
                className="text-dark-400 hover:text-dark-700 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={newTaskForm.customerName}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, customerName: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={newTaskForm.phone}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                  Task Category
                </label>
                <select
                  value={newTaskForm.category}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="FOLLOW-UP CALL">FOLLOW-UP CALL</option>
                  <option value="CALLBACK REQUEST">CALLBACK REQUEST</option>
                  <option value="SITE VISIT">SITE VISIT</option>
                  <option value="BOOKING/ APPOINTMENT/ DEMO">BOOKING/ APPOINTMENT/ DEMO</option>
                  <option value="REMINDER">REMINDER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                  Due Date &amp; Time
                </label>
                <input
                  type="text"
                  value={newTaskForm.date}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, date: e.target.value })}
                  placeholder="Today, 05:00 PM"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                Remarks / Notes *
              </label>
              <textarea
                required
                rows={3}
                value={newTaskForm.remarks}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, remarks: e.target.value })}
                placeholder="e.g. Follow up on payment collection"
                className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddTaskOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-dark-200 hover:bg-dark-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
              >
                Save Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
