import { useState, useCallback, useEffect } from 'react';
import { Plus, X, Edit2, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/Common';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { statusColors } from '../data/mockData';
import { getFollowUps, createFollowUp, updateFollowUp, deleteFollowUp as deleteFollowUpRequest } from '../api/followups';
import { getCustomers } from '../api/customers';

const emptyForm = {
  customerId: '',
  date: new Date().toISOString().split('T')[0],
  time: '10:00',
  remarks: '',
  nextFollowUp: '',
  status: 'pending',
};

export default function FollowUps({ onNavigate }) {
  const [followUps, setFollowUps] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const { addToast } = useToast();

  const [form, setForm] = useState(emptyForm);

  // Load follow-ups + the customer list (for the picker) from the backend.
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [followUpData, customerData] = await Promise.all([
        getFollowUps({ limit: 1000 }),
        getCustomers({ limit: 1000 }),
      ]);
      setFollowUps(followUpData.followUps);
      setCustomers(customerData.customers);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load follow-ups', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = followUps.filter(fu => {
    if (statusFilter && fu.status !== statusFilter) return false;
    if (dateFilter && fu.date !== dateFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => {
    setEditingFollowUp(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (fu) => {
    setEditingFollowUp(fu);
    setForm({
      customerId: fu.customerId,
      date: fu.date,
      time: fu.time,
      remarks: fu.remarks,
      nextFollowUp: fu.nextFollowUp || '',
      status: fu.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.customerId) { addToast('Please select a customer', 'error'); return; }
    if (!form.date) { addToast('Date is required', 'error'); return; }

    setSaving(true);
    try {
      if (editingFollowUp) {
        const data = await updateFollowUp(editingFollowUp._id, form);
        setFollowUps(followUps.map(f => (f._id === editingFollowUp._id ? data.followUp : f)));
        addToast('Follow-up updated!', 'success');
      } else {
        const data = await createFollowUp(form);
        setFollowUps([data.followUp, ...followUps]);
        addToast('Follow-up added!', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to save follow-up', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFollowUpRequest(deleteConfirm._id);
      setFollowUps(followUps.filter(f => f._id !== deleteConfirm._id));
      addToast('Follow-up deleted!', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete follow-up', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-up Management"
        subtitle="Schedule and track all follow-ups"
        action={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
            <Plus size={18} /> Add Follow-up
          </button>
        }
      />

      <div className="bg-white rounded-xl p-4 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
        <div className="flex flex-wrap gap-4">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-dark-400 dark:text-dark-500">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading follow-ups...
        </div>
      ) : (
      <div className="bg-white rounded-xl border border-dark-200 shadow-sm overflow-hidden dark:bg-dark-800 dark:border-dark-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dark-50 dark:bg-dark-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Remarks</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Next Follow-up</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-dark-400 dark:text-dark-500">No follow-ups found</td></tr>
            ) : (
              paginated.map(fu => (
                <tr key={fu._id} className="hover:bg-dark-50 dark:hover:bg-dark-700">
                  <td className="px-4 py-3 font-medium text-dark-900 dark:text-white">{fu.customerName}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{fu.date}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{fu.time}</td>
                  <td className="px-4 py-3 text-dark-600 max-w-xs truncate dark:text-dark-300">{fu.remarks}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{fu.nextFollowUp}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[fu.status]}`}>{fu.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(fu)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Edit"><Edit2 size={16} /></button>
                      <button onClick={() => setDeleteConfirm(fu)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete"><X size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-dark-500 dark:text-dark-400">Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-dark-200 hover:bg-dark-50 disabled:opacity-50 dark:border-dark-700 dark:hover:bg-dark-700">Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 text-sm rounded-lg ${p === page ? 'bg-primary-600 text-white' : 'border border-dark-200 hover:bg-dark-50'}`}>{p}</button>
            ))}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-dark-200 hover:bg-dark-50 disabled:opacity-50 dark:border-dark-700 dark:hover:bg-dark-700">Next</button>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingFollowUp ? 'Edit Follow-up' : 'Add Follow-up'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Customer *</label>
            <select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              disabled={!!editingFollowUp}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700 disabled:opacity-60"
            >
              <option value="">Select customer</option>
              {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.mobile})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Follow-up Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Time *</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Remarks *</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              placeholder="Enter remarks..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Next Follow-up Date</label>
            <input
              type="date"
              value={form.nextFollowUp}
              onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : `${editingFollowUp ? 'Update' : 'Add'} Follow-up`}</button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Follow-up"
        message={`Are you sure you want to delete this follow-up for "${deleteConfirm?.customerName}"?`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
