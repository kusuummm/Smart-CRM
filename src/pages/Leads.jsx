import { useState, useCallback, useEffect } from 'react';
import { Edit2, Trash2, History, ChevronDown, ChevronUp, Search, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/Common';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { leadStatuses, statusColors } from '../data/mockData';
import { getLeads, updateLeadStatus, deleteLead as deleteLeadRequest } from '../api/leads';
import { getUsers } from '../api/users';

export default function Leads({ onNavigate, selectedCustomer, selectedLeadStatus }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
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
  const [statusFilter, setStatusFilter] = useState(selectedLeadStatus || '');
  const [telecallerFilter, setTelecallerFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState(selectedCustomer || '');
  const { addToast } = useToast();

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeads({ limit: 1000 });
      setLeads(data.leads || []);
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

  useEffect(() => {
    if (!isAdmin) return;
    getUsers({ role: 'telecaller' })
      .then((data) => setTelecallers(data.users || []))
      .catch(() => {});
  }, [isAdmin]);

  // Filter by status, agent, or search term
  const filtered = leads.filter((l) => {
    const statusMatch = !statusFilter || l.status === statusFilter;
    const searchMatch = !searchTerm || l.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const telecallerMatch =
      !telecallerFilter ||
      (telecallerFilter === 'unassigned' ? !l.telecallerId : String(l.telecallerId) === String(telecallerFilter));

    return statusMatch && searchMatch && telecallerMatch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

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

  const handleSaveStatus = async () => {
    if (!form.remark?.trim()) {
      addToast('Remark is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = { status: form.status, remark: form.remark };
      if (isAdmin && form.telecallerId) {
        payload.telecallerId = form.telecallerId;
      }
      const data = await updateLeadStatus(editingLead._id, payload);
      setLeads(leads.map((l) => (l._id === editingLead._id ? data.lead : l)));
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
      setLeads(leads.filter((l) => l._id !== deleteConfirm._id));
      addToast('Lead deleted successfully!', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete lead', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Company Lead Pipeline' : 'My Lead Pipeline'}
        subtitle={isAdmin ? 'Track and oversee all leads across your sales organization' : 'Manage and progress your customer leads through the pipeline'}
      />

      <div className="bg-white rounded-xl p-4 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
              Pipeline Stage:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === '' ? 'bg-primary-600 text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                }`}
              >
                All Stages
              </button>
              {leadStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusFilter(s)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${
                    statusFilter === s ? 'bg-primary-600 text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                  }`}
                >
                  {s.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Admin Agent Filter */}
            {isAdmin && (
              <select
                value={telecallerFilter}
                onChange={(e) => {
                  setTelecallerFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg text-xs sm:text-sm text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Users</option>
                <option value="unassigned">⚠️ Unassigned Leads</option>
                {telecallers.map((tc) => (
                  <option key={tc._id} value={tc._id}>
                    {tc.name}
                  </option>
                ))}
              </select>
            )}

            <div className="relative flex-1 md:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 dark:text-dark-500" size={16} />
              <input
                type="text"
                placeholder="Search customer..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 border border-dark-200 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              />
            </div>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
                  Assigned User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
                  Created
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-dark-500 uppercase tracking-wider dark:text-dark-400">
                  History
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

                  return (
                    <tr key={lead._id} className="hover:bg-dark-50 dark:hover:bg-dark-700/60 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : lead._id)}
                          className="text-dark-400 hover:text-dark-600 dark:text-dark-500 dark:hover:text-dark-300"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-dark-900 dark:text-white">
                        {lead.customerName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[lead.status]}`}>
                          {lead.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-dark-600 dark:text-dark-300">
                        {tc ? tc.name : lead.telecallerId ? 'Assigned' : <span className="text-amber-600 font-semibold">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-dark-500 dark:text-dark-400">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setHistoryModal(lead)}
                          className="p-1 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 text-primary-600"
                          title="View History"
                        >
                          <History size={16} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openStatusModal(lead)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-dark-700 text-blue-600"
                            title="Update Status"
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

      {/* UPDATE LEAD STATUS & REASSIGN MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Update Lead Pipeline Status">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dark-700 mb-1.5 dark:text-gray-300">New Stage</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 capitalize"
            >
              {leadStatuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-dark-700 mb-1.5 dark:text-gray-300">
                Assigned User (Admin Control)
              </label>
              <select
                value={form.telecallerId || ''}
                onChange={(e) => setForm({ ...form, telecallerId: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Keep Current / Unassigned</option>
                {telecallers.map((tc) => (
                  <option key={tc._id} value={tc._id}>
                    {tc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-dark-700 mb-1.5 dark:text-gray-300">Remark / Notes *</label>
            <textarea
              value={form.remark || ''}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Reason for stage change or lead conversation update..."
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
              {saving ? 'Saving...' : 'Update Lead'}
            </button>
          </div>
        </div>
      </Modal>

      {/* HISTORY MODAL */}
      <Modal
        isOpen={Boolean(historyModal)}
        onClose={() => setHistoryModal(null)}
        title={`Lead History — ${historyModal?.customerName}`}
        size="lg"
      >
        {historyModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-dark-200 dark:border-dark-700">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[historyModal.status]}`}>
                {historyModal.status.replace('-', ' ')}
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
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded capitalize ${statusColors[h.status]}`}>
                        {h.status.replace('-', ' ')}
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
    </div>
  );
}
