import { useState, useCallback, useEffect } from 'react';
import { Edit2, Trash2, History, ChevronDown, ChevronUp, Search, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/Common';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { leadStatuses, statusColors } from '../data/mockData';
import { getLeads, updateLeadStatus, deleteLead as deleteLeadRequest } from '../api/leads';

export default function Leads({ onNavigate, selectedCustomer, selectedLeadStatus }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [statusFilter, setStatusFilter] = useState(selectedLeadStatus || '');
  const [searchTerm, setSearchTerm] = useState(selectedCustomer || '');
  const { addToast } = useToast();

  // Load leads from the backend. Requesting a high limit here because the
  // page does its own client-side search/filter/pagination.
  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeads({ limit: 1000 });
      setLeads(data.leads);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load leads', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Filter by status, search term, or selected customer
  const filtered = leads.filter(l => {
    const statusMatch = !statusFilter || l.status === statusFilter;
    const searchMatch = !searchTerm || l.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const openStatusModal = (lead) => {
    setEditingLead(lead);
    setForm({ status: lead.status, remark: '' });
    setIsModalOpen(true);
  };

  const [form, setForm] = useState({ status: 'new', remark: '' });

  const handleSaveStatus = async () => {
    if (!form.remark?.trim()) { addToast('Remark is required', 'error'); return; }

    setSaving(true);
    try {
      const data = await updateLeadStatus(editingLead._id, { status: form.status, remark: form.remark });
      setLeads(leads.map(l => (l._id === editingLead._id ? data.lead : l)));
      addToast('Lead status updated!', 'success');
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update lead status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLeadRequest(deleteConfirm._id);
      setLeads(leads.filter(l => l._id !== deleteConfirm._id));
      addToast('Lead deleted successfully!', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete lead', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Lead Management" subtitle="Track and manage all leads with complete history" />

      <div className="bg-white rounded-xl p-4 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-sm font-medium text-dark-700 dark:text-gray-300">Filter by Status:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${statusFilter === '' ? 'bg-primary-600 text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200'}`}
            >
              All
            </button>
            {leadStatuses.map(s => (
              <button
                key={s}
                onClick={() => handleStatusFilter(s)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200'}`}
              >
                {s.replace('-', ' ')}
              </button>
            ))}
          </div>
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 dark:text-dark-500" size={16} />
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48 dark:border-dark-700"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-dark-400 dark:text-dark-500">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading leads...
        </div>
      ) : (
      <div className="bg-white rounded-xl border border-dark-200 shadow-sm overflow-hidden dark:bg-dark-800 dark:border-dark-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dark-50 dark:bg-dark-700">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">Created</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">History</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-dark-400 dark:text-dark-500">No leads found</td>
              </tr>
            ) : (
              paginated.map(lead => (
                <>
                  <tr key={lead._id} className="hover:bg-dark-50 transition-colors dark:hover:bg-dark-700">
                    <td className="px-4 py-3">
                      <button onClick={() => setExpandedRow(expandedRow === lead._id ? null : lead._id)} className="p-1 rounded hover:bg-dark-100 text-dark-500 dark:text-dark-400 dark:hover:bg-dark-600">
                        {expandedRow === lead._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-dark-900 dark:text-white">{lead.customerName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[lead.status]}`}>{lead.status.replace('-', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 text-xs bg-dark-100 text-dark-700 rounded-full dark:text-gray-300 dark:bg-dark-700">{lead.history.length} entries</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openStatusModal(lead)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Update Status">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setHistoryModal(lead)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="View History">
                          <History size={16} />
                        </button>
                        <button onClick={() => setDeleteConfirm(lead)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === lead._id && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 bg-dark-50 dark:bg-dark-700">
                        <h4 className="text-sm font-semibold text-dark-800 mb-3 dark:text-white">Lead History Timeline</h4>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {lead.history.map((h, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="flex flex-col items-center min-w-[80px]">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[h.status]}`}>{h.status.replace('-', ' ')}</span>
                                <span className="text-xs text-dark-400 mt-1 dark:text-dark-500">{new Date(h.date).toLocaleDateString()}</span>
                              </div>
                              {i < lead.history.length - 1 && <div className="w-8 h-0.5 bg-dark-300 mb-5"></div>}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 space-y-1">
                          {lead.history.map((h, i) => (
                            <p key={i} className="text-xs text-dark-500 ml-2 dark:text-dark-400">• {new Date(h.date).toLocaleDateString()}: {h.remark}</p>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Update Lead Status">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">New Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
            >
              {leadStatuses.map(s => <option key={s} value={s}>{s.replace('-', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Remark</label>
            <textarea
              value={form.remark || ''}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              placeholder="Enter status change reason..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600">Cancel</button>
          <button onClick={handleSaveStatus} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : 'Update Status'}</button>
        </div>
      </Modal>

      <Modal isOpen={!!historyModal} onClose={() => setHistoryModal(null)} title={`Lead History - ${historyModal?.customerName}`} size="lg">
        {historyModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-dark-200 dark:border-dark-700">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[historyModal.status]}`}>{historyModal.status.replace('-', ' ')}</span>
              <span className="text-sm text-dark-500 dark:text-dark-400">Created: {new Date(historyModal.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="space-y-3">
              {historyModal.history.map((h, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-primary-500' : 'bg-dark-300'}`}></div>
                    {i < historyModal.history.length - 1 && <div className="w-0.5 h-10 bg-dark-200 mt-1"></div>}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[h.status]}`}>{h.status.replace('-', ' ')}</span>
                      <span className="text-xs text-dark-400 dark:text-dark-500">{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-dark-600 dark:text-dark-300">{h.remark}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message={`Are you sure you want to delete the lead for "${deleteConfirm?.customerName}"?`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
