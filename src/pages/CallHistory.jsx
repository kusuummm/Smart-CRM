import { useState, useCallback, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/Common';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { statusColors } from '../data/mockData';
import { getCalls, createCall, deleteCall as deleteCallRequest } from '../api/callHistory';
import { getCustomers } from '../api/customers';

const emptyForm = {
  customerId: '',
  date: new Date().toISOString().split('T')[0],
  time: '10:00',
  duration: '5 mins',
  status: 'connected',
  remarks: '',
};

export default function CallHistory({ onNavigate }) {
  const [calls, setCalls] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToast();

  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [callData, customerData] = await Promise.all([
        getCalls({ limit: 1000 }),
        getCustomers({ limit: 1000 }),
      ]);
      setCalls(callData.calls);
      setCustomers(customerData.customers);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load call history', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = calls.filter(c => !statusFilter || c.status === statusFilter);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => {
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.customerId) { addToast('Please select a customer', 'error'); return; }

    setSaving(true);
    try {
      const data = await createCall(form);
      setCalls([data.call, ...calls]);
      addToast('Call record added!', 'success');
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to add call record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCallRequest(deleteConfirm._id);
      setCalls(calls.filter(c => c._id !== deleteConfirm._id));
      addToast('Call record deleted!', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete call record', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Call History"
        subtitle="View and manage all call records"
        action={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
            <Plus size={18} /> Add Call
          </button>
        }
      />

      <div className="bg-white rounded-xl p-4 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
        <div className="flex flex-wrap gap-4">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700">
            <option value="">All Status</option>
            <option value="connected">Connected</option>
            <option value="missed">Missed</option>
            <option value="busy">Busy</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-dark-400 dark:text-dark-500">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading call history...
        </div>
      ) : (
      <div className="bg-white rounded-xl border border-dark-200 shadow-sm overflow-hidden dark:bg-dark-800 dark:border-dark-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dark-50 dark:bg-dark-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Remarks</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-dark-400 dark:text-dark-500">No call records found</td></tr>
            ) : (
              paginated.map(call => (
                <tr key={call._id} className="hover:bg-dark-50 dark:hover:bg-dark-700">
                  <td className="px-4 py-3 font-medium text-dark-900 dark:text-white">{call.customerName}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{call.date}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{call.time}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{call.duration}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[call.status]}`}>{call.status}</span></td>
                  <td className="px-4 py-3 text-dark-600 max-w-xs truncate dark:text-dark-300">{call.remarks}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDeleteConfirm(call)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete">
                      <X size={16} />
                    </button>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Call Record" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Customer *</label>
            <select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
            >
              <option value="">Select customer</option>
              {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.mobile})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Date *</label>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Duration</label>
              <input
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
                placeholder="e.g. 10 mins"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Status *</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              >
                <option value="connected">Connected</option>
                <option value="missed">Missed</option>
                <option value="busy">Busy</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              placeholder="Enter call remarks..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : 'Add Call'}</button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Call Record"
        message={`Delete call record for "${deleteConfirm?.customerName}"?`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
