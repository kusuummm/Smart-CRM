import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  ArrowRightLeft,
  Users,
  CheckSquare,
  Square,
  UserPlus,
  FileSpreadsheet,
  PhoneCall,
  Mail,
  ChevronDown,
  Check,
  Copy,
} from 'lucide-react';
import { PageHeader } from '../components/Common';
import { DataTable } from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ExcelLeadImportModal from '../components/ExcelLeadImportModal';
import Customer360Modal from '../components/Customer360Modal';
import { useToast } from '../components/Toast';
import { leadSources, indianStates, statusColors } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { isAdminOrOwner, isManagerOrAbove } from '../utils/permissions';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer as deleteCustomerRequest,
  bulkAssignCustomers,
  bulkDeleteCustomers
} from '../api/customers';
import { getUsers } from '../api/users';
import { createLead } from '../api/leads';

function FormField({ label, name, type = 'text', required = false, options, form, setForm }) {
  return (
    <div>
      <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {options ? (
        <select
          value={form[name] || ''}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select {label}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={form[name] || ''}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={type === 'email' ? 'customer@example.com' : type === 'tel' ? 'e.g. 9876543210' : ''}
        />
      )}
    </div>
  );
}

export default function Customers({ onNavigate }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filters, setFilters] = useState({ city: '', source: '', telecaller: '', status: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [telecallers, setTelecallers] = useState([]);
  const [statusDropdownCustomerId, setStatusDropdownCustomerId] = useState(null);
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { t: translate } = useApp();
  const { user } = useAuth();
  const isAdmin = isAdminOrOwner(user);
  const isSupervisor = isManagerOrAbove(user);

  // Customer 360 Detail Modal
  const [customer360Customer, setCustomer360Customer] = useState(null);
  const [isCustomer360Open, setIsCustomer360Open] = useState(false);

  // Admin Bulk Selection & Reassignment State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkTargetTelecallerId, setBulkTargetTelecallerId] = useState('');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Quick Inline Reassign Modal
  const [quickReassignCustomer, setQuickReassignCustomer] = useState(null);
  const [quickTargetAgentId, setQuickTargetAgentId] = useState('');
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  const [form, setForm] = useState({});

  useEffect(() => {
    const handleClickOutside = () => setStatusDropdownCustomerId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleQuickCustomerStatusChange = async (customer, newStatus) => {
    setStatusDropdownCustomerId(null);
    if (customer.status === newStatus) return;

    try {
      await updateCustomer(customer._id, { status: newStatus });
      setCustomers((prev) =>
        prev.map((c) => (c._id === customer._id ? { ...c, status: newStatus } : c))
      );
      addToast(`Status updated to "${newStatus}" for ${customer.name}`, 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const customerStatusCounts = useMemo(() => {
    const counts = { all: customers.length };
    Object.keys(statusColors).forEach((st) => {
      counts[st] = 0;
    });
    customers.forEach((c) => {
      if (counts[c.status] !== undefined) counts[c.status]++;
      else counts[c.status] = 1;
    });
    return counts;
  }, [customers]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers({ limit: 1000 });
      setCustomers(data.customers || []);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    getUsers({ role: 'telecaller' })
      .then((data) => setTelecallers(data.users || []))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return customers.filter((c) => {
      const searchMatch =
        !s ||
        (c.name || '').toLowerCase().includes(s) ||
        (c.mobile || '').includes(s) ||
        (c.email || '').toLowerCase().includes(s) ||
        (c.company || '').toLowerCase().includes(s) ||
        (c.city || '').toLowerCase().includes(s);

      if (!searchMatch) return false;

      if (filters.status && c.status !== filters.status) return false;
      if (filters.city && !(c.city || '').toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.source && c.leadSource !== filters.source) return false;

      if (filters.telecaller) {
        if (filters.telecaller === 'unassigned') {
          if (c.telecallerId || (c.assignedTelecaller && c.assignedTelecaller !== 'Unassigned')) return false;
        } else if (c.assignedTelecaller !== filters.telecaller) {
          return false;
        }
      }

      return true;
    });
  }, [customers, searchTerm, filters]);

  // Bulk Operations Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((c) => c._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApplyBulkAssignment = async () => {
    if (!bulkTargetTelecallerId) {
      addToast('Please select a target agent or Unassign', 'error');
      return;
    }

    const targetTc = telecallers.find((t) => t._id === bulkTargetTelecallerId);
    const targetLabel = bulkTargetTelecallerId === 'unassigned' ? 'Unassigned' : (targetTc?.name || 'selected lead');
    const ok = await confirm({
      title: 'Bulk Reassign Customers',
      message: `Are you sure you want to reassign ${selectedIds.length} customer(s) to "${targetLabel}"?`,
      confirmText: 'Reassign',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    try {
      const res = await bulkAssignCustomers({
        customerIds: selectedIds,
        telecallerId: bulkTargetTelecallerId,
      });
      addToast(res.message || 'Customers assigned successfully!', 'success');
      setSelectedIds([]);
      setBulkTargetTelecallerId('');
      loadCustomers();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to bulk assign customers', 'error');
    }
  };

  const handleExecuteBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const res = await bulkDeleteCustomers({ customerIds: selectedIds });
      addToast(res.message || 'Selected customers deleted successfully!', 'success');
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
      loadCustomers();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete selected customers', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleQuickInlineReassign = async () => {
    if (!quickReassignCustomer) return;
    const selectedTc = telecallers.find((tc) => tc._id === quickTargetAgentId);
    const targetLabel = selectedTc ? selectedTc.name : 'Unassigned';

    const ok = await confirm({
      title: 'Reassign Customer',
      message: `Are you sure you want to reassign "${quickReassignCustomer.name}" to "${targetLabel}"?`,
      confirmText: 'Reassign',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    try {
      const payload = {
        telecallerId: quickTargetAgentId || null,
        assignedTelecaller: targetLabel,
      };

      const res = await updateCustomer(quickReassignCustomer._id, payload);
      setCustomers((prev) =>
        prev.map((c) => (c._id === quickReassignCustomer._id ? res.customer : c))
      );
      addToast(`Reassigned to ${payload.assignedTelecaller}!`, 'success');
      setQuickReassignCustomer(null);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reassign customer', 'error');
    }
  };

  // Admin-only: Assign Customer to Lead Pipeline
  const handleAssignLead = async (customer) => {
    const ok = await confirm({
      title: 'Assign Customer to Lead Pipeline',
      message: `Are you sure you want to assign "${customer.name}" to the lead pipeline? Follow-up tracking will be initialized and notification emails dispatched.`,
      confirmText: 'Assign to Lead',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    try {
      await createLead({
        customerId: customer._id,
        telecallerId: customer.telecallerId || null,
        status: 'new',
        remark: 'Assigned to Lead Pipeline from Customers list by Admin',
      });
      addToast(`"${customer.name}" assigned to lead pipeline! Notification emails sent.`, 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to assign customer to lead', 'error');
    }
  };

  const baseColumns = [
    {
      key: 'name',
      label: translate('name'),
      sortable: true,
      render: (val, row) => (
        <button
          onClick={() => {
            setCustomer360Customer(row);
            setIsCustomer360Open(true);
          }}
          className="text-primary-600 hover:text-primary-700 hover:underline font-bold text-left cursor-pointer"
          title="Click to view complete customer profile, recordings, follow-ups & history"
        >
          {val}
        </button>
      ),
    },
    {
      key: 'mobile',
      label: translate('mobile'),
      render: (val, row) => (
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span>{val}</span>
          <button
            type="button"
            onClick={() => {
              setCustomer360Customer(row);
              setIsCustomer360Open(true);
            }}
            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
            title={`Call ${row.name || 'Customer'}`}
          >
            <PhoneCall size={13} />
          </button>
        </div>
      ),
    },
    {
      key: 'email',
      label: translate('email'),
      render: (val) =>
        val ? (
          <a
            href={`mailto:${val}`}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[170px]"
            title={`Send email to ${val}`}
          >
            <Mail size={12} className="flex-shrink-0" />
            <span className="truncate">{val}</span>
          </a>
        ) : (
          <span className="text-dark-400 text-xs">-</span>
        ),
    },
    { key: 'company', label: translate('company') },
    {
      key: 'city',
      label: translate('city'),
      render: (val) =>
        val ? (
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, city: prev.city === val ? '' : val }))}
            className="text-xs text-dark-700 dark:text-dark-300 hover:text-primary-600 hover:underline cursor-pointer"
            title={`Filter by city: ${val}`}
          >
            {val}
          </button>
        ) : (
          <span className="text-dark-400 text-xs">-</span>
        ),
    },
    {
      key: 'leadSource',
      label: translate('leadSource'),
      render: (val) =>
        val ? (
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, source: prev.source === val ? '' : val }))}
            className="text-xs font-medium px-2 py-0.5 rounded-md bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300 hover:bg-primary-50 hover:text-primary-600 transition-colors cursor-pointer"
            title={`Filter by source: ${val}`}
          >
            {val}
          </button>
        ) : (
          <span className="text-dark-400 text-xs">-</span>
        ),
    },
    {
      key: 'status',
      label: translate('status'),
      render: (val, row) => (
        <div className="relative inline-block text-left">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStatusDropdownCustomerId(statusDropdownCustomerId === row._id ? null : row._id);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border shadow-2xs hover:scale-105 transition-all cursor-pointer ${
              statusColors[val] || 'bg-gray-100 text-gray-700 border-gray-200'
            }`}
            title="Click to update status or filter"
          >
            <span>{val}</span>
            <ChevronDown size={11} className="opacity-70" />
          </button>

          {statusDropdownCustomerId === row._id && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 mt-1 w-48 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in-50 zoom-in-95"
            >
              <div className="px-2 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-100 dark:border-dark-700/60">
                Change Status
              </div>
              {Object.keys(statusColors).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleQuickCustomerStatusChange(row, st)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors ${
                    val === st
                      ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 font-bold'
                      : 'text-dark-700 dark:text-dark-200'
                  }`}
                >
                  <span className="capitalize">{st}</span>
                  {val === st && <Check size={12} className="text-primary-600" />}
                </button>
              ))}

              <div className="border-t border-dark-100 dark:border-dark-700/60 pt-1 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStatusDropdownCustomerId(null);
                    setFilters((prev) => ({ ...prev, status: prev.status === val ? '' : val }));
                  }}
                  className="w-full text-left px-2.5 py-1 text-[11px] text-primary-600 hover:underline font-semibold cursor-pointer"
                >
                  Filter only {val}
                </button>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'assignedTelecaller',
      label: translate('assignedTelecaller'),
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (val && val !== 'Unassigned') {
                setFilters((prev) => ({ ...prev, telecaller: prev.telecaller === val ? '' : val }));
              } else {
                setFilters((prev) => ({ ...prev, telecaller: prev.telecaller === 'unassigned' ? '' : 'unassigned' }));
              }
            }}
            className={`text-xs font-medium px-2 py-0.5 rounded-full hover:underline cursor-pointer ${
              val && val !== 'Unassigned'
                ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
            title={`Click to filter by ${val || 'Unassigned'}`}
          >
            {val || 'Unassigned'}
          </button>
          <button
            onClick={() => {
              setQuickReassignCustomer(row);
              setQuickTargetAgentId(row.telecallerId || '');
            }}
            className="p-1 rounded hover:bg-dark-100 dark:hover:bg-dark-700 text-dark-400 hover:text-primary-600 transition-colors cursor-pointer"
            title="Change Customer Lead"
          >
            <ArrowRightLeft size={13} />
          </button>
        </div>
      ),
    },
    {
      key: 'actions',
      label: translate('actions'),
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1.5">
          {isAdmin && (
            <button
              onClick={() => handleAssignLead(row)}
              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 transition-colors"
              title="Assign Customer to Lead Pipeline (Admin Only)"
            >
              <UserPlus size={16} />
            </button>
          )}
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-dark-700 text-blue-600 transition-colors"
            title={translate('edit')}
          >
            <Edit2 size={16} />
          </button>
          {isAdmin && (
            <button
              onClick={() => setDeleteConfirm(row)}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-dark-700 text-red-600 transition-colors"
              title={translate('delete')}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Add Multi-select Checkbox Column for Admins
  const columns = isAdmin
    ? [
        {
          key: 'select',
          label: (
            <input
              type="checkbox"
              checked={filtered.length > 0 && selectedIds.length === filtered.length}
              onChange={handleSelectAll}
              className="rounded border-dark-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
              title="Select all"
            />
          ),
          sortable: false,
          align: 'center',
          render: (_, row) => (
            <input
              type="checkbox"
              checked={selectedIds.includes(row._id)}
              onChange={() => handleToggleSelectRow(row._id)}
              className="rounded border-dark-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
          ),
        },
        ...baseColumns,
      ]
    : baseColumns;

  const openAdd = () => {
    setEditingCustomer(null);
    setForm({
      name: '',
      mobile: '',
      alternateNumber: '',
      email: '',
      company: '',
      city: '',
      state: '',
      leadSource: '',
      interestedProduct: '',
      status: 'active',
      assignedTelecaller: '',
      telecallerId: '',
      remarks: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    const { _id, id, ...rest } = customer;
    setForm({ ...rest });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('Customer name is required', 'error');
      return;
    }
    if (!form.mobile.trim()) {
      addToast('Mobile number is required', 'error');
      return;
    }

    if (editingCustomer && editingCustomer.status !== form.status) {
      const ok = await confirm({
        title: 'Update Customer Status',
        message: `Are you sure you want to change status to "${form.status}" for customer "${form.name}"?`,
        confirmText: `Set to ${form.status}`,
        cancelText: 'Cancel',
        type: 'primary',
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      if (editingCustomer) {
        const data = await updateCustomer(editingCustomer._id, form);
        setCustomers(customers.map((c) => (c._id === editingCustomer._id ? data.customer : c)));
        addToast('Customer updated successfully!', 'success');
      } else {
        const data = await createCustomer(form);
        setCustomers([data.customer, ...customers]);
        addToast('Customer added successfully!', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to save customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomerRequest(deleteConfirm._id);
      setCustomers(customers.filter((c) => c._id !== deleteConfirm._id));
      addToast('Customer deleted successfully!', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete customer', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? translate('customerManagement') : translate('myCustomers') || 'My Customers'}
        subtitle={isAdmin ? 'Full company customer roster with user assignment controls' : 'View and manage accounts assigned to your roster'}
        action={
          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                title="Bulk import customer accounts and assign leads by city or business filters"
              >
                <FileSpreadsheet size={18} />
                <span>Import Customers (Excel/CSV)</span>
              </button>
            )}
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus size={18} /> {translate('addCustomer')}
            </button>
          </div>
        }
      />

      {/* Admin Bulk Actions Toolbar */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-900 dark:text-primary-200">
            <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold">
              {selectedIds.length}
            </span>
            <span>Customer(s) Selected</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkTargetTelecallerId}
              onChange={(e) => setBulkTargetTelecallerId(e.target.value)}
              className="px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Assign selected to...</option>
              <option value="unassigned">Set to Unassigned</option>
              {telecallers.map((tc) => (
                <option key={tc._id} value={tc._id}>
                  {tc.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleApplyBulkAssignment}
              disabled={!bulkTargetTelecallerId}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors"
            >
              Apply Reassignment
            </button>

            <button
              onClick={() => setBulkDeleteConfirmOpen(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors"
            >
              Delete Selected
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 bg-dark-100 hover:bg-dark-200 dark:bg-dark-700 text-dark-700 dark:text-dark-300 text-xs sm:text-sm font-medium rounded-lg transition-colors"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Clickable Customer Status Summary Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, status: '' }))}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
            !filters.status
              ? 'bg-dark-900 text-white dark:bg-white dark:text-dark-900 font-bold'
              : 'bg-white dark:bg-dark-800 text-dark-600 dark:text-dark-300 border border-dark-200 dark:border-dark-700 hover:bg-dark-50'
          }`}
        >
          All Customers ({customers.length})
        </button>
        {Object.keys(statusColors).map((st) => {
          const isSelected = filters.status === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  status: isSelected ? '' : st,
                }))
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs border ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500/20 font-bold'
                  : 'border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-50'
              }`}
              title={`Click to filter by ${st} status`}
            >
              <span className="capitalize">{st}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300">
                {customerStatusCounts[st] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-dark-800 rounded-xl p-4 border border-dark-200 dark:border-dark-700 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 dark:text-dark-500" size={18} />
            <input
              type="text"
              placeholder={translate('searchCustomers')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Admin Agent Filter */}
          {isAdmin && (
            <select
              value={filters.telecaller}
              onChange={(e) => setFilters({ ...filters, telecaller: e.target.value })}
              className="px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Assigned Leads</option>
              <option value="unassigned">Unassigned Clients Only</option>
              {telecallers.map((tc) => (
                <option key={tc._id} value={tc.name}>
                  {tc.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            {Object.keys(statusColors).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Cities</option>
            {[...new Set(customers.map((c) => c.city).filter(Boolean))].map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            className="px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Sources</option>
            {leadSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-dark-400 dark:text-dark-500">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading customers...
        </div>
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          emptyMessage={translate('noData')}
        />
      )}

      {/* MODAL: Add / Edit Customer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? translate('editCustomer') : translate('addNewCustomer')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={translate('customerName')} name="name" required form={form} setForm={setForm} />
            <FormField label={translate('mobileNumber')} name="mobile" type="tel" required form={form} setForm={setForm} />
            <FormField label={translate('alternateNumber')} name="alternateNumber" type="tel" form={form} setForm={setForm} />
            <FormField label={translate('email')} name="email" type="email" form={form} setForm={setForm} />
            <FormField label={translate('companyName')} name="company" form={form} setForm={setForm} />
            <FormField label={translate('city')} name="city" form={form} setForm={setForm} />
            <FormField label={translate('state')} name="state" options={indianStates} form={form} setForm={setForm} />
            <FormField label={translate('leadSource')} name="leadSource" options={leadSources} form={form} setForm={setForm} />
            <FormField label={translate('interestedProduct')} name="interestedProduct" form={form} setForm={setForm} />

            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  {translate('assignedTelecaller')}
                </label>
                <select
                  value={form.telecallerId || ''}
                  onChange={(e) => {
                    const tcId = e.target.value;
                    const tcObj = telecallers.find((t) => t._id === tcId);
                    setForm({
                      ...form,
                      telecallerId: tcId,
                      assignedTelecaller: tcObj ? tcObj.name : 'Unassigned',
                    });
                  }}
                  className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Unassigned</option>
                  {telecallers.map((tc) => (
                    <option key={tc._id} value={tc._id}>
                      {tc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
              Remarks
            </label>
            <textarea
              rows={3}
              value={form.remarks || ''}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Notes regarding customer requirements..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-dark-200 dark:border-dark-700">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600 transition-colors"
            >
              {translate('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : translate('save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* QUICK INLINE REASSIGN MODAL */}
      <Modal
        isOpen={Boolean(quickReassignCustomer)}
        onClose={() => setQuickReassignCustomer(null)}
        title={`Reassign Lead — ${quickReassignCustomer?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-dark-600 dark:text-dark-300">
            Current Assigned Lead:{' '}
            <strong className="text-dark-900 dark:text-white">
              {quickReassignCustomer?.assignedTelecaller || 'Unassigned'}
            </strong>
          </p>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
              Select New Assigned Lead
            </label>
            <select
              value={quickTargetAgentId}
              onChange={(e) => setQuickTargetAgentId(e.target.value)}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Set to Unassigned</option>
              {telecallers.map((tc) => (
                <option key={tc._id} value={tc._id}>
                  {tc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-dark-200 dark:border-dark-700">
            <button
              type="button"
              onClick={() => setQuickReassignCustomer(null)}
              className="px-4 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleQuickInlineReassign}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              Confirm Reassignment
            </button>
          </div>
        </div>
      </Modal>

      {/* SINGLE DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={translate('deleteCustomer')}
        message={translate('areYouSureDelete')?.replace('{name}', deleteConfirm?.name || '')}
        confirmText={translate('delete')}
        type="danger"
      />

      {/* BULK DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleExecuteBulkDelete}
        title="Bulk Delete Customers"
        message={`Are you sure you want to delete ${selectedIds.length} selected customer records and all their associated leads, calls, and follow-ups? This cannot be undone.`}
        confirmText="Yes, Delete All Selected"
        type="danger"
      />

      {/* EXCEL / CSV BULK IMPORT & ROUND-ROBIN ASSIGN MODAL */}
      <ExcelLeadImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImportSuccess={() => {
          loadCustomers();
          addToast('Customers successfully imported & assigned!', 'success');
        }}
      />

      {/* Customer 360 Full History & Details Modal */}
      {customer360Customer && (
        <Customer360Modal
          isOpen={isCustomer360Open}
          onClose={() => {
            setIsCustomer360Open(false);
            setCustomer360Customer(null);
          }}
          customer={customer360Customer}
          onStartCall={() => onNavigate?.('call-history')}
          onUpdateContact={() => loadCustomers()}
        />
      )}
    </div>
  );
}