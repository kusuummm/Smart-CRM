import { useState, useCallback, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/Common';
import { DataTable } from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { leadSources, indianStates, statusColors } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer as deleteCustomerRequest } from '../api/customers';
import { getUsers } from '../api/users';

// Defined OUTSIDE the Customers component on purpose. If this were defined
// inside Customers (as it originally was), React would treat it as a brand
// new component type on every render - since `form`/`setForm` change on
// every keystroke, that meant this component (and its <input>) unmounted
// and remounted after every single character, losing focus each time. That
// was the "only one letter registers" bug.
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
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
  const pageSize = 5;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filters, setFilters] = useState({ city: '', source: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [telecallers, setTelecallers] = useState([]);
  const { addToast } = useToast();
  const { t: translate } = useApp();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Load customers from the backend. Requesting a high limit here because
  // the existing DataTable component does its own client-side search/sort/
  // pagination - this keeps that behavior working unchanged. For very large
  // customer lists, DataTable would need to be upgraded to server-side
  // pagination (passing page/search/filters to the API instead).
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers({ limit: 1000 });
      setCustomers(data.customers);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty: addToast is a new function reference on every
          // render (useToast doesn't memoize it), so including it here caused
          // this callback to be recreated every render, which retriggered the
          // effect below in an infinite loop - that was the flickering.

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Only admins reassign customers to telecallers, so only fetch the
  // telecaller list when needed (a telecaller creating their own customer
  // gets auto-assigned to themselves server-side - see createCustomer).
  useEffect(() => {
    if (!isAdmin) return;
    getUsers({ role: 'telecaller' })
      .then((data) => setTelecallers(data.users))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = customers.filter(c => {
    const searchMatch = !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    if (filters.city && !(c.city || '').toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.source && c.leadSource !== filters.source) return false;
    return true;
  });

  const columns = [
    { key: 'name', label: translate('name'), sortable: true, render: (val, row) => (
      <button
        onClick={() => onNavigate?.('leads', val)}
        className="text-primary-600 hover:text-primary-700 hover:underline font-medium text-left"
      >
        {val}
      </button>
    ) },
    { key: 'mobile', label: translate('mobile') },
    { key: 'email', label: translate('email') },
    { key: 'company', label: translate('company') },
    { key: 'city', label: translate('city') },
    { key: 'leadSource', label: translate('leadSource') },
    { key: 'status', label: translate('status'), render: (val) => <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[val]}`}>{val}</span> },
    { key: 'assignedTelecaller', label: translate('assignedTelecaller') },
    { key: 'actions', label: translate('actions'), align: 'center', render: (_, row) => (
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-dark-700 text-blue-600" title={translate('edit')}>
          <Edit2 size={16} />
        </button>
        <button onClick={() => setDeleteConfirm(row)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-dark-700 text-red-600" title={translate('delete')}>
          <Trash2 size={16} />
        </button>
      </div>
    ) },
  ];

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
    if (!form.name.trim()) { addToast('Customer name is required', 'error'); return; }
    if (!form.mobile.trim()) { addToast('Mobile number is required', 'error'); return; }

    setSaving(true);
    try {
      if (editingCustomer) {
        const data = await updateCustomer(editingCustomer._id, form);
        setCustomers(customers.map(c => c._id === editingCustomer._id ? data.customer : c));
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
      setCustomers(customers.filter(c => c._id !== deleteConfirm._id));
      addToast('Customer deleted successfully!', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete customer', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const [form, setForm] = useState({});

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title={translate('customerManagement')}
        subtitle={translate('manageAllCustomers')}
        action={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
            <Plus size={18} /> {translate('addCustomer')}
          </button>
        }
      />

      <div className="bg-white dark:bg-dark-800 rounded-xl p-4 border border-dark-200 dark:border-dark-700 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 dark:text-gray-500 dark:text-dark-500" size={18} />
            <input
              type="text"
              placeholder={translate('searchCustomers')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Cities</option>
            {[...new Set(customers.map(c => c.city).filter(Boolean))].map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            className="px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Sources</option>
            {leadSources.map(s => <option key={s} value={s}>{s}</option>)}
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? translate('editCustomer') : translate('addNewCustomer')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={translate('customerName')} name="name" required  form={form} setForm={setForm} />
            <FormField label={translate('mobileNumber')} name="mobile" type="tel" required  form={form} setForm={setForm} />
            <FormField label={translate('alternateNumber')} name="alternateNumber" type="tel"  form={form} setForm={setForm} />
            <FormField label={translate('email')} name="email" type="email"  form={form} setForm={setForm} />
            <FormField label={translate('companyName')} name="company"  form={form} setForm={setForm} />
            <FormField label={translate('city')} name="city"  form={form} setForm={setForm} />
            <FormField label={translate('state')} name="state" options={indianStates}  form={form} setForm={setForm} />
            <FormField label={translate('leadSource')} name="leadSource" options={leadSources}  form={form} setForm={setForm} />
            <FormField label={translate('interestedProduct')} name="interestedProduct"  form={form} setForm={setForm} />
            <FormField label={translate('status')} name="status" options={['active', 'inactive']}  form={form} setForm={setForm} />
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">{translate('assignedTelecaller')}</label>
                <select
                  value={form.telecallerId || ''}
                  onChange={(e) => setForm({ ...form, telecallerId: e.target.value })}
                  className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Unassigned</option>
                  {telecallers.map(tc => <option key={tc._id} value={tc._id}>{tc.name} ({tc.email})</option>)}
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">{translate('remarks')}</label>
              <textarea
                value={form.remarks || ''}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter any additional notes..."
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 bg-dark-100 dark:bg-dark-700 rounded-lg hover:bg-dark-200 dark:hover:bg-dark-600">{translate('cancel')}</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Saving...' : `${editingCustomer ? translate('update') : translate('add')} Customer`}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={translate('deleteCustomer')}
        message={translate('areYouSureDelete', { name: deleteConfirm?.name })}
        confirmText={translate('delete')}
        type="danger"
      />
    </div>
  );
}