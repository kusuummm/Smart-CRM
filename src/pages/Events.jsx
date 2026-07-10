import { useState, useCallback, useEffect } from 'react';
import { Plus, Calendar, X, Gift, Edit2, Loader2, BellRing, Mail, MessageCircle, LayoutDashboard } from 'lucide-react';
import { PageHeader } from '../components/Common';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { eventTypes } from '../data/mockData';
import { getEvents, createEvent, updateEvent, deleteEvent as deleteEventRequest, triggerReminder } from '../api/events';
import { getCustomers } from '../api/customers';

const emptyForm = {
  customerId: '',
  type: 'birthday',
  date: new Date().toISOString().split('T')[0],
  description: '',
  reminder: '1 day before',
};

export default function Events({ onNavigate }) {
  const [events, setEvents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [reminding, setReminding] = useState(null);
  const { addToast } = useToast();

  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventData, customerData] = await Promise.all([
        getEvents({ limit: 1000 }),
        getCustomers({ limit: 1000 }),
      ]);
      setEvents(eventData.events);
      setCustomers(customerData.customers);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = events.filter(e => !typeFilter || e.type === typeFilter);

  const openAdd = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setForm({
      customerId: event.customerId,
      type: event.type,
      date: event.date,
      description: event.description,
      reminder: event.reminder,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.customerId || !form.date) { addToast('Please select a customer and date', 'error'); return; }

    setSaving(true);
    try {
      if (editingEvent) {
        const data = await updateEvent(editingEvent._id, form);
        setEvents(events.map(e => (e._id === editingEvent._id ? data.event : e)));
        addToast('Event updated!', 'success');
      } else {
        const data = await createEvent(form);
        setEvents([...events, data.event]);
        addToast('Event added!', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to save event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEventRequest(deleteConfirm._id);
      setEvents(events.filter(e => e._id !== deleteConfirm._id));
      addToast('Event deleted!', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete event', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleSendReminder = async (event) => {
    setReminding(event._id);
    try {
      const data = await triggerReminder(event._id, ['dashboard', 'email', 'whatsapp']);
      setEvents(events.map(e => (e._id === event._id ? data.event : e)));

      const sent = [];
      if (data.results.email) sent.push('Email');
      if (data.results.whatsapp) sent.push('WhatsApp');
      if (data.results.dashboard) sent.push('Dashboard');
      const failed = [];
      if (data.results.email === false) failed.push('Email');
      if (data.results.whatsapp === false) failed.push('WhatsApp');

      if (sent.length) addToast(`Reminder sent via ${sent.join(', ')}`, 'success');
      if (failed.length) addToast(`${failed.join(', ')} reminder failed (check customer contact info / API credentials)`, 'error');
      if (!sent.length && !failed.length) addToast('Customer has no email or mobile on file to remind', 'error');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to send reminder', 'error');
    } finally {
      setReminding(null);
    }
  };

  const getIcon = (type) => {
    const icons = { birthday: Gift, anniversary: Calendar, emi: Calendar, renewal: Calendar };
    return icons[type] || Calendar;
  };

  const upcoming = events.filter(e => e.status === 'upcoming');
  const thisWeek = upcoming.filter(e => {
    const eventDate = new Date(e.date);
    const today = new Date();
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Calendar"
        subtitle="Track birthdays, anniversaries, and important dates"
        action={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
            <Plus size={18} /> Add Event
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8" />
            <div>
              <p className="text-2xl font-bold">{events.length}</p>
              <p className="text-sm opacity-90">Total Events</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8" />
            <div>
              <p className="text-2xl font-bold">{upcoming.length}</p>
              <p className="text-sm opacity-90">Upcoming</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8" />
            <div>
              <p className="text-2xl font-bold">{thisWeek.length}</p>
              <p className="text-sm opacity-90">This Week</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
        <div className="flex flex-wrap gap-4">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700">
            <option value="">All Types</option>
            {eventTypes.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-dark-400 dark:text-dark-500">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading events...
        </div>
      ) : (
      <div className="bg-white rounded-xl border border-dark-200 shadow-sm overflow-hidden dark:bg-dark-800 dark:border-dark-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dark-50 dark:bg-dark-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Event Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Reminder</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-dark-400 dark:text-dark-500">No events found</td></tr>
            ) : (
              filtered.map(event => {
                const Icon = getIcon(event.type);
                return (
                  <tr key={event._id} className="hover:bg-dark-50 dark:hover:bg-dark-700">
                    <td className="px-4 py-3 font-medium text-dark-900 dark:text-white">{event.customerName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 capitalize">
                        <Icon className="w-4 h-4 text-dark-500 dark:text-dark-400" />
                        {event.type}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{event.date}</td>
                    <td className="px-4 py-3 text-dark-600 max-w-xs truncate dark:text-dark-300">{event.description}</td>
                    <td className="px-4 py-3 text-dark-700 dark:text-gray-300">
                      <div>{event.reminder}</div>
                      {(event.remindedVia?.email || event.remindedVia?.whatsapp || event.remindedVia?.dashboard) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {event.remindedVia.email && <Mail size={12} className="text-red-500" title="Email reminder sent" />}
                          {event.remindedVia.whatsapp && <MessageCircle size={12} className="text-green-500" title="WhatsApp reminder sent" />}
                          {event.remindedVia.dashboard && <LayoutDashboard size={12} className="text-blue-500" title="Shown on dashboard" />}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleSendReminder(event)} disabled={reminding === event._id} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 disabled:opacity-50" title="Send Reminder Now">
                          {reminding === event._id ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
                        </button>
                        <button onClick={() => openEdit(event)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteConfirm(event)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete">
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent ? 'Edit Event' : 'Add Event'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Customer *</label>
            <select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              disabled={!!editingEvent}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700 disabled:opacity-60"
            >
              <option value="">Select customer</option>
              {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.mobile})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Event Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 capitalize dark:border-dark-700"
              >
                {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
              placeholder="Enter description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1 dark:text-gray-300">Reminder</label>
            <select
              value={form.reminder}
              onChange={(e) => setForm({ ...form, reminder: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700"
            >
              <option value="1 day before">1 day before</option>
              <option value="2 days before">2 days before</option>
              <option value="3 days before">3 days before</option>
              <option value="1 week before">1 week before</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : `${editingEvent ? 'Update' : 'Add'} Event`}</button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Event"
        message={`Delete event "${deleteConfirm?.description}" for ${deleteConfirm?.customerName}?`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
