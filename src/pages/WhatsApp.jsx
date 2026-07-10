import { useState, useCallback, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/Common';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { statusColors } from '../data/mockData';
import { getWhatsAppLogs, sendWhatsAppMessage } from '../api/whatsapp';
import { getCustomers } from '../api/customers';

export default function WhatsApp({ onNavigate }) {
  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ customerId: '', message: '', type: 'template' });
  const { addToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logData, customerData] = await Promise.all([
        getWhatsAppLogs({ limit: 1000 }),
        getCustomers({ limit: 1000 }),
      ]);
      setLogs(logData.logs);
      setCustomers(customerData.customers);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load WhatsApp logs', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSend = async () => {
    if (!form.customerId || !form.message.trim()) { addToast('Please select a customer and enter a message', 'error'); return; }

    setSending(true);
    try {
      const data = await sendWhatsAppMessage(form);
      setLogs([data.log, ...logs]);
      addToast('WhatsApp message sent!', 'success');
      setIsModalOpen(false);
      setForm({ customerId: '', message: '', type: 'template' });
    } catch (error) {
      // Even if the actual send fails (e.g. WhatsApp API credentials aren't
      // configured yet), the backend still logs the attempt - reflect that
      // instead of pretending nothing happened.
      const log = error.response?.data?.log;
      if (log) {
        setLogs([log, ...logs]);
        setIsModalOpen(false);
        setForm({ customerId: '', message: '', type: 'template' });
      }
      addToast(error.response?.data?.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Messages"
        subtitle="Send and track WhatsApp communications"
        action={
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            <Send size={18} /> Send Message
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-dark-400 dark:text-dark-500">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading messages...
        </div>
      ) : (
      <div className="bg-white rounded-xl border border-dark-200 shadow-sm overflow-hidden dark:bg-dark-800 dark:border-dark-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-50 dark:bg-dark-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Message</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-dark-400 dark:text-dark-500">No messages sent yet</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id} className="hover:bg-dark-50 dark:hover:bg-dark-700">
                    <td className="px-4 py-3 font-medium text-dark-900 dark:text-white">{log.customerName}</td>
                    <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{log.phone}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-dark-100 text-dark-700 rounded-full capitalize dark:text-gray-300 dark:bg-dark-700">{log.type}</span></td>
                    <td className="px-4 py-3 text-dark-600 max-w-md truncate dark:text-dark-300">{log.message}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[log.status]}`}>{log.status}</span></td>
                    <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{new Date(log.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Send WhatsApp Message" size="md">
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
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Message Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
            >
              <option value="template">Template</option>
              <option value="follow-up">Follow-up</option>
              <option value="offer">Offer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Message *</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              placeholder="Enter your message..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600">Cancel</button>
          <button onClick={handleSend} disabled={sending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
            <Send size={16} /> {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
