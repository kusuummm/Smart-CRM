import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Edit2,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  Calendar,
  Clock,
  Check,
  Mail,
  Bell,
  Sparkles,
  Phone,
  PhoneCall,
  Video,
  UserPlus,
  FileSpreadsheet,
  ArrowRightLeft,
  Star,
  Layers,
  CheckCircle2,
  XCircle,
  Lock,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/Common';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ExcelLeadImportModal from '../components/ExcelLeadImportModal';
import Customer360Modal from '../components/Customer360Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../context/ConfirmContext';
import { isAdminOrOwner, isManagerOrAbove } from '../utils/permissions';
import { leadStatuses, leadStatusLabels, statusColors } from '../data/mockData';
import { getLeads, createLead, updateLeadStatus, deleteLead as deleteLeadRequest } from '../api/leads';
import { getUsers } from '../api/users';
import { getCustomers } from '../api/customers';
import { createMeeting } from '../api/meetings';

// Descriptive follow-up status options with clean SVG icons (no emojis)
const statusOptionsConfig = [
  { id: 'new', label: 'New Follow-up', Icon: Sparkles },
  { id: 'contacted', label: 'Follow-up: Contacted', Icon: PhoneCall },
  { id: 'interested', label: 'Follow-up: Interested', Icon: Star },
  { id: 'meeting', label: 'Follow-up: Meeting Scheduled', Icon: Calendar },
  { id: 'follow-up', label: 'Follow-up: In Progress', Icon: Clock },
  { id: 'converted', label: 'Follow-up: Converted / Won', Icon: CheckCircle2 },
  { id: 'not-interested', label: 'Follow-up: Not Interested', Icon: XCircle },
  { id: 'closed', label: 'Follow-up: Closed', Icon: Lock },
];

export default function Leads({ onNavigate, selectedCustomer, selectedLeadStatus }) {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const isAdmin = isAdminOrOwner(user);
  const isSupervisor = isManagerOrAbove(user);
  const [leads, setLeads] = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  // Customer 360 History Modal
  const [customer360Lead, setCustomer360Lead] = useState(null);
  const [isCustomer360Open, setIsCustomer360Open] = useState(false);
  const [statusFilter, setStatusFilter] = useState(selectedLeadStatus || '');
  const [telecallerFilter, setTelecallerFilter] = useState(() => {
    const saved = sessionStorage.getItem('smartcrm_filter_telecaller');
    if (saved) {
      sessionStorage.removeItem('smartcrm_filter_telecaller');
      return saved;
    }
    return '';
  });
  const [searchTerm, setSearchTerm] = useState(selectedCustomer || '');
  const [statusDropdownLeadId, setStatusDropdownLeadId] = useState(null);
  const { addToast } = useToast();

  // Admin-only: Assign Customer to Lead modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [assignForm, setAssignForm] = useState({
    customerId: '',
    telecallerId: '',
    status: 'new',
    remark: '',
  });
  const [isAssigning, setIsAssigning] = useState(false);

  // Meeting scheduling modal state
  const [meetingModalLead, setMeetingModalLead] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    title: 'Product Demo & Solution Consultation',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    duration: '30 mins',
    customerEmail: '',
    meetingLink: 'https://meet.google.com/new',
    location: 'Google Meet',
    agenda: 'Detailed walkthrough of CRM features and pricing options.',
  });
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeads({ limit: 1000 });
      setLeads(data.leads || []);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load follow-up leads', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Quick reassign lead state
  const [reassignTargetLead, setReassignTargetLead] = useState(null);
  const [reassignSelectedTcId, setReassignSelectedTcId] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    getUsers({ role: 'telecaller' })
      .then((data) => setTelecallers(data.users || []))
      .catch(() => {});
  }, []);

  // Load available customers when Admin opens the assign modal
  const openAssignCustomerModal = async () => {
    setIsAssignModalOpen(true);
    setLoadingCustomers(true);
    try {
      const res = await getCustomers({ limit: 500 });
      setCustomersList(res.customers || []);
    } catch (err) {
      addToast('Failed to load customer list for assignment', 'error');
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Close status dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => setStatusDropdownLeadId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter by status, agent, or search term
  const filtered = leads.filter((l) => {
    const statusMatch = !statusFilter || l.status === statusFilter;
    const searchMatch = !searchTerm || (l.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const telecallerMatch =
      !telecallerFilter ||
      (telecallerFilter === 'unassigned' ? !l.telecallerId : String(l.telecallerId) === String(telecallerFilter));

    return statusMatch && searchMatch && telecallerMatch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Stage counts for clickable pipeline cards
  const pipelineStats = useMemo(() => {
    const counts = { all: leads.length };
    leadStatuses.forEach((st) => {
      counts[st] = 0;
    });
    leads.forEach((l) => {
      if (counts[l.status] !== undefined) counts[l.status]++;
      else counts.new = (counts.new || 0) + 1;
    });
    return counts;
  }, [leads]);

  const pipelineCards = useMemo(
    () => [
      { id: '', label: 'All Leads', Icon: Layers, count: pipelineStats.all, color: 'text-dark-700 dark:text-dark-200', bg: 'bg-dark-100 dark:bg-dark-800' },
      { id: 'new', label: 'New Follow-up', Icon: Sparkles, count: pipelineStats.new || 0, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
      { id: 'contacted', label: 'Contacted', Icon: PhoneCall, count: pipelineStats.contacted || 0, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
      { id: 'interested', label: 'Interested', Icon: Star, count: pipelineStats.interested || 0, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
      { id: 'meeting', label: 'Meeting', Icon: Calendar, count: pipelineStats.meeting || 0, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
      { id: 'follow-up', label: 'In Progress', Icon: Clock, count: pipelineStats['follow-up'] || 0, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
      { id: 'converted', label: 'Won / Converted', Icon: CheckCircle2, count: pipelineStats.converted || 0, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40' },
      { id: 'not-interested', label: 'Not Interested', Icon: XCircle, count: pipelineStats['not-interested'] || 0, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
    ],
    [pipelineStats]
  );

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const openStatusModal = (lead) => {
    setEditingLead(lead);
    setForm({ status: lead.status, remark: '', telecallerId: lead.telecallerId || '' });
    setIsModalOpen(true);
  };

  const [form, setForm] = useState({ status: 'new', remark: '', telecallerId: '' });

  // Save updated follow-up status (triggers automated notification emails to both customer and lead)
  const handleSaveStatus = async () => {
    if (!form.remark?.trim()) {
      addToast('Follow-up remark / note is required', 'error');
      return;
    }

    const targetLabel = leadStatusLabels[form.status] || form.status;
    const ok = await confirm({
      title: 'Update Follow-up Status',
      message: `Are you sure you want to update follow-up status to "${targetLabel}" for "${editingLead?.customerName}"? Notification emails will be dispatched to both lead and customer.`,
      confirmText: 'Update & Send Emails',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const payload = { status: form.status, remark: form.remark };
      if (form.telecallerId) {
        payload.telecallerId = form.telecallerId;
      }
      const data = await updateLeadStatus(editingLead._id, payload);
      setLeads((prev) => prev.map((l) => (l._id === editingLead._id ? data.lead : l)));
      addToast(`Follow-up status updated to "${targetLabel}" & notification emails sent!`, 'success');
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update follow-up status', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Quick 1-click status update (triggers automated notification emails to both customer and lead)
  const handleQuickStatusChange = async (lead, newStatus) => {
    if (newStatus === 'meeting') {
      openScheduleMeeting(lead);
      return;
    }
    const targetLabel = leadStatusLabels[newStatus] || newStatus;
    try {
      const data = await updateLeadStatus(lead._id, {
        status: newStatus,
        remark: `Follow-up stage updated to ${targetLabel}`,
      });
      setLeads((prev) => prev.map((l) => (l._id === lead._id ? data.lead : l)));
      addToast(`Follow-up status changed to "${targetLabel}" & notification emails sent!`, 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update follow-up status', 'error');
    }
  };

  // Admin submit handler: Assign Customer to Lead
  const handleAssignCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.customerId) {
      addToast('Please select a customer to assign', 'error');
      return;
    }

    setIsAssigning(true);
    try {
      const res = await createLead(assignForm);
      addToast('Customer assigned to lead pipeline & notification emails dispatched!', 'success');
      setIsAssignModalOpen(false);
      setAssignForm({ customerId: '', telecallerId: '', status: 'new', remark: '' });
      loadLeads();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to assign customer to lead', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  // Reassign Lead handler
  const handleConfirmReassignLead = async () => {
    if (!reassignTargetLead) return;
    const selectedTc = telecallers.find((tc) => String(tc._id) === String(reassignSelectedTcId));
    const targetLabel = selectedTc ? selectedTc.name : 'Unassigned';

    setIsReassigning(true);
    try {
      const payload = {
        telecallerId: reassignSelectedTcId || null,
        remark: `Assigned lead changed to ${targetLabel} by ${user?.name || 'User'}`,
      };

      const res = await updateLeadStatus(reassignTargetLead._id, payload);
      setLeads((prev) =>
        prev.map((l) => (l._id === reassignTargetLead._id ? res.lead : l))
      );
      addToast(`Customer lead changed to ${targetLabel}!`, 'success');
      setReassignTargetLead(null);
      loadLeads();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to change customer lead', 'error');
    } finally {
      setIsReassigning(false);
    }
  };

  // Open Schedule Meeting modal
  const openScheduleMeeting = (lead) => {
    setMeetingModalLead(lead);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const hourStr = String(now.getHours()).padStart(2, '0') + ':00';

    setMeetingForm({
      title: `Consultation & Demo with ${lead.customerName || 'Customer'}`,
      date: today,
      time: hourStr,
      duration: '30 mins',
      customerEmail: lead.customerId?.email || lead.email || '',
      meetingLink: 'https://meet.google.com/new',
      location: 'Google Meet',
      agenda: `Discuss ${lead.customerId?.interestedProduct || 'Smart CRM'} requirements and next steps.`,
    });
  };

  // Submit Meeting and trigger invitations & 1-hour prior reminder scheduler
  const handleScheduleMeetingSubmit = async (e) => {
    e?.preventDefault();
    if (!meetingForm.customerEmail || !meetingForm.customerEmail.includes('@')) {
      addToast('A valid customer email is required to send meeting invitations and 1-hour reminders', 'error');
      return;
    }
    if (!meetingForm.date || !meetingForm.time) {
      addToast('Meeting date and time are required', 'error');
      return;
    }

    setSchedulingMeeting(true);
    try {
      const payload = {
        leadId: meetingModalLead._id,
        customerId: meetingModalLead.customerId?._id || meetingModalLead.customerId,
        title: meetingForm.title,
        date: meetingForm.date,
        time: meetingForm.time,
        duration: meetingForm.duration,
        customerEmail: meetingForm.customerEmail,
        meetingLink: meetingForm.meetingLink,
        location: meetingForm.location,
        agenda: meetingForm.agenda,
      };

      await createMeeting(payload);
      addToast(
        `Meeting scheduled! Confirmation sent to ${meetingForm.customerEmail} and 1-hour reminder armed.`,
        'success'
      );
      setMeetingModalLead(null);
      // Update local lead status
      setLeads((prev) =>
        prev.map((l) =>
          l._id === meetingModalLead._id
            ? { ...l, status: 'meeting' }
            : l
        )
      );
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to schedule meeting', 'error');
    } finally {
      setSchedulingMeeting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLeadRequest(deleteConfirm._id);
      setLeads((prev) => prev.filter((l) => l._id !== deleteConfirm._id));
      addToast('Lead deleted successfully!', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete lead', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Display complete customer data on dedicated new page instead of popup
  if (customer360Lead) {
    return (
      <Customer360Modal
        isOpen={true}
        isPage={true}
        onClose={() => {
          setCustomer360Lead(null);
          setIsCustomer360Open(false);
        }}
        customer={customer360Lead}
        onStartCall={() => onNavigate?.('call-history')}
        onUpdateContact={() => loadLeads()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={isAdmin ? 'Company Follow-up & Lead Pipeline' : 'My Follow-up & Lead Pipeline'}
          subtitle={
            isAdmin
              ? 'Oversee all customer follow-up statuses, lead assignments, and automated email notifications'
              : 'Manage customer follow-up statuses through the pipeline with automated email notifications'
          }
        />

        {/* ADMIN EXCLUSIVE: Bulk Excel Import & Assign Customer to Lead Buttons */}
        {isAdmin && (
          <div className="flex-shrink-0 flex items-center gap-2.5">
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Bulk import customer accounts and assign leads by city or business filters"
            >
              <FileSpreadsheet size={16} />
              <span>Import Customers (Excel/CSV)</span>
            </button>
            <button
              onClick={openAssignCustomerModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Assign Customer to Lead</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. Clickable Pipeline Stage Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {pipelineCards.map((card) => {
          const isSelected = statusFilter === card.id;
          const CardIcon = card.Icon;
          return (
            <button
              key={card.id || 'all'}
              type="button"
              onClick={() => {
                const nextStatus = isSelected && card.id !== '' ? '' : card.id;
                handleStatusFilter(nextStatus);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs hover:scale-[1.02] flex flex-col justify-between ${
                isSelected
                  ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 ring-2 ring-primary-500/30'
                  : 'border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 hover:border-primary-300 dark:hover:border-dark-600'
              }`}
              title={`Click to filter leads by ${card.label}`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.bg} ${card.color}`}>
                  <CardIcon size={14} />
                </div>
                <span className={`text-base font-extrabold tabular-nums ${card.color}`}>
                  {card.count}
                </span>
              </div>
              <div className="mt-2.5">
                <p className="text-[11px] font-bold text-dark-800 dark:text-dark-200 truncate">
                  {card.label}
                </p>
                <p className="text-[10px] text-dark-400 font-medium tabular-nums mt-0.5">
                  {leads.length > 0 ? `${Math.round((card.count / leads.length) * 100)}%` : '0%'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl p-3 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          {statusFilter ? (
            <div className="inline-flex items-center gap-2">
              <span className="text-xs font-medium text-dark-500 dark:text-dark-400">Filtered by:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
                <span>{leadStatusLabels[statusFilter] || statusFilter}</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('')}
                  className="hover:text-primary-800 dark:hover:text-primary-200 cursor-pointer ml-1 p-0.5 rounded text-xs"
                  title="Clear filter"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          ) : (
            <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">
              All Pipeline Leads ({leads.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {isAdmin && telecallers.length > 0 && (
            <select
              value={telecallerFilter}
              onChange={(e) => setTelecallerFilter(e.target.value)}
              className="px-3 py-1.5 border border-dark-200 rounded-lg text-xs bg-white text-dark-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-800 dark:border-dark-700 dark:text-white"
            >
              <option value="">All Assigned Leads</option>
              <option value="unassigned">Unassigned Leads</option>
              {telecallers.map((tc) => (
                <option key={tc._id} value={tc._id}>
                  {tc.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-dark-400" size={14} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-dark-200 rounded-lg text-xs bg-white text-dark-800 focus:outline-none focus:ring-2 focus:ring-primary-500 w-52 dark:bg-dark-800 dark:border-dark-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-dark-400 dark:text-dark-500">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading follow-ups...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700 min-h-[360px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-50 dark:bg-dark-700">
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
                  Follow-up Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
                  Assigned Lead
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
                  Created
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
                  Follow-up History
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-dark-400 dark:text-dark-500">
                    No leads found matching current filters.
                  </td>
                </tr>
              ) : (
                paginated.map((lead) => {
                  const isExpanded = expandedRow === lead._id;
                  const tc = telecallers.find((t) => String(t._id) === String(lead.telecallerId));
                  const currentStatusLabel = leadStatusLabels[lead.status] || lead.status.replace('-', ' ');

                  return (
                    <tr key={lead._id} className="group hover:bg-dark-50 dark:hover:bg-dark-700/60 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : lead._id)}
                          className="text-dark-400 hover:text-dark-600 dark:text-dark-500 dark:hover:text-dark-300"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-dark-900 dark:text-white">
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomer360Lead(lead);
                              setIsCustomer360Open(true);
                            }}
                            className="font-bold text-left text-primary-600 hover:text-primary-700 hover:underline cursor-pointer block"
                            title="Click to view complete customer profile, recordings & follow-up"
                          >
                            {lead.customerName || lead.customerId?.name || 'Customer'}
                          </button>
                          {(lead.customerId?.mobile || lead.customerId?.phone) && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomer360Lead(lead);
                                setIsCustomer360Open(true);
                              }}
                              className="text-xs text-dark-500 dark:text-dark-400 font-mono mt-0.5 hover:underline cursor-pointer block text-left"
                              title="Click to view details"
                            >
                              {lead.customerId?.mobile || lead.customerId?.phone}
                              {lead.customerId?.company ? ` • ${lead.customerId.company}` : ''}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Interactive Follow-up Status Badge with Dropdown */}
                      <td className="px-4 py-3 relative">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusDropdownLeadId(statusDropdownLeadId === lead._id ? null : lead._id);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border shadow-2xs hover:opacity-90 transition-all ${
                              statusColors[lead.status] || 'bg-gray-100 text-gray-700'
                            }`}
                            title="Click to view follow-up status options & notify both lead & customer"
                          >
                            <span>{currentStatusLabel}</span>
                            <ChevronDown size={12} className="opacity-70" />
                          </button>

                          {statusDropdownLeadId === lead._id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStatusDropdownLeadId(null);
                                }}
                              />
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-0 mt-1.5 w-60 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in-50 zoom-in-95"
                              >
                                <div className="px-2.5 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-100 dark:border-dark-700/60">
                                  Follow-up Status Options
                                </div>
                                {statusOptionsConfig.map((opt) => (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      setStatusDropdownLeadId(null);
                                      handleQuickStatusChange(lead, opt.id);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors ${
                                      lead.status === opt.id
                                        ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 font-bold'
                                        : 'text-dark-700 dark:text-dark-200'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      {opt.Icon && (
                                        <opt.Icon
                                          size={13}
                                          className={`shrink-0 ${
                                            lead.status === opt.id ? 'text-primary-600' : 'text-dark-400'
                                          }`}
                                        />
                                      )}
                                      <span>{opt.label}</span>
                                    </span>
                                    {lead.status === opt.id && <Check size={13} className="text-primary-600" />}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          {tc ? (
                            <button
                              type="button"
                              onClick={() => {
                                const nextFilter = telecallerFilter === String(tc._id) ? '' : String(tc._id);
                                setTelecallerFilter(nextFilter);
                              }}
                              className="text-primary-600 hover:text-primary-700 hover:underline font-semibold cursor-pointer text-left"
                              title={`Click to filter leads assigned to ${tc.name}`}
                            >
                              {tc.name}
                            </button>
                          ) : lead.telecallerId ? (
                            <span className="text-dark-600 dark:text-dark-300">Assigned</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const nextFilter = telecallerFilter === 'unassigned' ? '' : 'unassigned';
                                setTelecallerFilter(nextFilter);
                              }}
                              className="text-amber-600 hover:text-amber-700 hover:underline font-bold cursor-pointer"
                              title="Click to filter unassigned leads"
                            >
                              Unassigned
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setReassignTargetLead(lead);
                              setReassignSelectedTcId(lead.telecallerId ? String(lead.telecallerId) : '');
                            }}
                            className="p-1 rounded hover:bg-dark-100 dark:hover:bg-dark-700 text-dark-400 hover:text-primary-600 transition-colors cursor-pointer"
                            title="Change Customer Lead"
                          >
                            <ArrowRightLeft size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-dark-500 dark:text-dark-400">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setHistoryModal(lead)}
                          className="p-1 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 text-primary-600"
                          title="View Follow-up History"
                        >
                          <History size={16} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1-Click Call Customer */}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomer360Lead(lead);
                              setIsCustomer360Open(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                            title="Call Customer / View Profile"
                          >
                            <PhoneCall size={16} />
                          </button>

                          {/* Schedule Meeting with Customer (Triggers 1-hour email reminder) */}
                          <button
                            onClick={() => openScheduleMeeting(lead)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 transition-colors"
                            title="Schedule Meeting with Customer (Sends invites & 1-hour prior email reminder)"
                          >
                            <Calendar size={16} />
                          </button>

                          <button
                            onClick={() => openStatusModal(lead)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-dark-700 text-blue-600"
                            title="Update Follow-up Status"
                          >
                            <Edit2 size={16} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteConfirm(lead)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-dark-700 text-red-600"
                              title="Delete Lead"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Expanded Drawer for Row */}
          {expandedRow && (() => {
            const expLead = leads.find((l) => l._id === expandedRow);
            if (!expLead) return null;
            return (
              <div className="p-4 bg-dark-50/80 dark:bg-dark-900/60 border-t border-dark-200 dark:border-dark-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-dark-700 dark:text-dark-300 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-primary-600" />
                      <span>Advance Follow-up Status:</span>
                    </h5>
                    <p className="text-[11px] text-dark-500 mt-0.5">
                      Click any follow-up status option below to instantly update and dispatch email alerts to both customer &amp; lead:
                    </p>
                  </div>
                  <button
                    onClick={() => openScheduleMeeting(expLead)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    <Calendar size={14} />
                    <span>Schedule Customer Meeting (1-Hr Reminder Armed)</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {statusOptionsConfig.map((opt) => {
                    const isActive = expLead.status === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleQuickStatusChange(expLead, opt.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-2xs ${
                          isActive
                            ? 'bg-primary-600 text-white border-primary-600 ring-2 ring-primary-300 dark:ring-primary-900'
                            : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 border-dark-200 dark:border-dark-700 hover:border-primary-400'
                        }`}
                      >
                        {opt.Icon && (
                          <opt.Icon
                            size={13}
                            className={`shrink-0 ${isActive ? 'text-white' : 'text-dark-500'}`}
                          />
                        )}
                        <span>{opt.label}</span>
                        {isActive && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800">
              <span className="text-xs text-dark-500 dark:text-dark-400">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} leads
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 text-xs rounded border border-dark-200 dark:border-dark-700 disabled:opacity-40"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 text-xs rounded ${
                      p === page ? 'bg-primary-600 text-white' : 'border border-dark-200 dark:border-dark-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 text-xs rounded border border-dark-200 dark:border-dark-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN EXCLUSIVE: ASSIGN CUSTOMER TO LEAD MODAL */}
      {isAdmin && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title="Assign Customer to Lead Pipeline"
          size="md"
        >
          <form onSubmit={handleAssignCustomerSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200">
              <p className="font-bold text-sm">Admin Control: Customer Lead Assignment</p>
              <p className="mt-0.5 text-blue-800 dark:text-blue-300 leading-relaxed">
                Only administrators are authorized to assign customer accounts to the lead pipeline. An automated email notification will be sent to both the customer and the assigned lead.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                Select Customer *
              </label>
              {loadingCustomers ? (
                <div className="py-2 text-xs text-dark-400 flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> Loading customer directory...
                </div>
              ) : (
                <select
                  required
                  value={assignForm.customerId}
                  onChange={(e) => setAssignForm({ ...assignForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                >
                  <option value="">-- Choose Customer --</option>
                  {customersList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.mobile ? `(${c.mobile})` : ''} {c.company ? `— ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                Assign Lead Owner
              </label>
              <select
                value={assignForm.telecallerId}
                onChange={(e) => setAssignForm({ ...assignForm, telecallerId: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Unassigned (Admin Pool)</option>
                {telecallers.map((tc) => (
                  <option key={tc._id} value={tc._id}>
                    {tc.name} {tc.email ? `(${tc.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                Initial Follow-up Status
              </label>
              <select
                value={assignForm.status}
                onChange={(e) => setAssignForm({ ...assignForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {leadStatuses.map((s) => (
                  <option key={s} value={s}>
                    {leadStatusLabels[s] || s.replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                Follow-up Remark / Instructions
              </label>
              <textarea
                rows={3}
                value={assignForm.remark}
                onChange={(e) => setAssignForm({ ...assignForm, remark: e.target.value })}
                placeholder="Initial follow-up instructions, customer background, or preferences..."
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-dark-200 dark:border-dark-700">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAssigning}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isAssigning ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                <span>{isAssigning ? 'Assigning...' : 'Assign Customer to Lead'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* SCHEDULE MEETING MODAL WITH 1-HOUR EMAIL REMINDER */}
      <Modal
        isOpen={Boolean(meetingModalLead)}
        onClose={() => setMeetingModalLead(null)}
        title={`Schedule Meeting with ${meetingModalLead?.customerName || 'Customer'}`}
        size="lg"
      >
        <form onSubmit={handleScheduleMeetingSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-start gap-3 text-xs text-indigo-900 dark:text-indigo-200 shadow-2xs">
            <Bell size={18} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Automated 1-Hour Prior Email Reminder Guarantee</p>
              <p className="mt-0.5 text-indigo-800 dark:text-indigo-300 leading-relaxed">
                An invitation confirmation email will be dispatched to both client and lead immediately. Smart CRM&apos;s background scheduler will automatically send an email reminder to both parties <strong>1 hour before the meeting starts</strong> with the agenda and joining link.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                Meeting Title *
              </label>
              <input
                type="text"
                required
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                placeholder="e.g. Product Demo & Consultation"
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                Client Email Address (for 1-Hr Reminder) *
              </label>
              <input
                type="email"
                required
                value={meetingForm.customerEmail}
                onChange={(e) => setMeetingForm({ ...meetingForm, customerEmail: e.target.value })}
                placeholder="customer@domain.com"
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                Meeting Date *
              </label>
              <input
                type="date"
                required
                value={meetingForm.date}
                onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                Meeting Time *
              </label>
              <input
                type="time"
                required
                value={meetingForm.time}
                onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                Duration
              </label>
              <select
                value={meetingForm.duration}
                onChange={(e) => setMeetingForm({ ...meetingForm, duration: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="15 mins">15 minutes</option>
                <option value="30 mins">30 minutes</option>
                <option value="45 mins">45 minutes</option>
                <option value="1 hour">1 hour</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                Meeting Link (Google Meet / Zoom)
              </label>
              <input
                type="url"
                value={meetingForm.meetingLink}
                onChange={(e) => setMeetingForm({ ...meetingForm, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/xyz-abcd-efg"
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
              Agenda &amp; Discussion Points
            </label>
            <textarea
              rows={3}
              value={meetingForm.agenda}
              onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
              placeholder="Notes, agenda, or topics to review during the meeting..."
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-dark-200 dark:border-dark-700">
            <button
              type="button"
              onClick={() => setMeetingModalLead(null)}
              className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={schedulingMeeting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {schedulingMeeting ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
              <span>{schedulingMeeting ? 'Scheduling...' : 'Schedule & Send Invites'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* UPDATE FOLLOW-UP STATUS MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Update Follow-up Status">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dark-700 mb-1.5 dark:text-gray-300">New Follow-up Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {leadStatuses.map((s) => (
                <option key={s} value={s}>
                  {leadStatusLabels[s] || s.replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 mb-1.5 dark:text-gray-300">
              Assigned Lead
            </label>
            <select
              value={form.telecallerId || ''}
              onChange={(e) => setForm({ ...form, telecallerId: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="">Keep Current / Unassigned</option>
              {telecallers.map((tc) => (
                <option key={tc._id} value={tc._id}>
                  {tc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 mb-1.5 dark:text-gray-300">Follow-up Remarks / Notes *</label>
            <textarea
              value={form.remark || ''}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Reason for follow-up status change or conversation update..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-dark-200 dark:border-dark-700">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveStatus}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving & Sending Emails...' : 'Update Follow-up Status'}
            </button>
          </div>
        </div>
      </Modal>

      {/* QUICK REASSIGN LEAD MODAL */}
      <Modal
        isOpen={Boolean(reassignTargetLead)}
        onClose={() => setReassignTargetLead(null)}
        title={`Change Lead for ${reassignTargetLead?.customerName || 'Customer'}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-dark-600 dark:text-dark-300">
            Reassign this customer to an active lead/agent. Follow-up history and email notifications will be updated automatically.
          </p>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
              Select New Assigned Lead
            </label>
            <select
              value={reassignSelectedTcId}
              onChange={(e) => setReassignSelectedTcId(e.target.value)}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="">Set to Unassigned (Admin Pool)</option>
              {telecallers.map((tc) => (
                <option key={tc._id} value={tc._id}>
                  {tc.name} {tc.email ? `(${tc.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-dark-200 dark:border-dark-700">
            <button
              type="button"
              onClick={() => setReassignTargetLead(null)}
              className="px-4 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReassignLead}
              disabled={isReassigning}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isReassigning ? <Loader2 size={15} className="animate-spin" /> : <ArrowRightLeft size={15} />}
              <span>{isReassigning ? 'Reassigning...' : 'Confirm Change'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* FOLLOW-UP HISTORY MODAL */}
      <Modal
        isOpen={Boolean(historyModal)}
        onClose={() => setHistoryModal(null)}
        title={`Follow-up History — ${historyModal?.customerName}`}
        size="lg"
      >
        {historyModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-dark-200 dark:border-dark-700">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColors[historyModal.status]}`}>
                {leadStatusLabels[historyModal.status] || historyModal.status.replace('-', ' ')}
              </span>
              <span className="text-xs text-dark-500 dark:text-dark-400">
                Created: {new Date(historyModal.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {historyModal.history?.map((h, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 p-3 rounded-lg bg-dark-50 dark:bg-dark-900/50 border border-dark-100 dark:border-dark-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${statusColors[h.status]}`}>
                        {leadStatusLabels[h.status] || h.status.replace('-', ' ')}
                      </span>
                      <span className="text-[11px] text-dark-400 dark:text-dark-500">
                        {new Date(h.date).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-dark-700 dark:text-dark-300">{h.remark}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message={`Are you sure you want to delete the pipeline lead for "${deleteConfirm?.customerName}"?`}
        confirmText="Delete"
        type="danger"
      />

      {/* EXCEL / CSV BULK CUSTOMER IMPORTER & ASSIGNER MODAL */}
      <ExcelLeadImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImportSuccess={() => {
          loadLeads();
          addToast('Customers successfully imported & assigned!', 'success');
        }}
      />
    </div>
  );
}
