import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Calendar,
  Gift,
  Clock,
  Users,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Send,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Check,
  ExternalLink,
  Smile,
  Coffee,
  PhoneCall,
  Moon,
  Loader2,
  ChevronRight,
  BellRing,
  ArrowRight,
  Trash2,
  Megaphone,
  Heart,
  HelpCircle,
  Phone,
  Copy,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  getEvents,
  getUpcomingEvents,
  createEvent,
  updateEvent,
  triggerReminder,
  deleteEvent
} from '../api/events';
import { getCustomers } from '../api/customers';
import { getWhatsAppLogs, sendWhatsAppMessage } from '../api/whatsapp';
import { getEmailLogs, sendCustomerEmail } from '../api/emails';

// Visual design configuration for event categories
const eventTypeConfig = {
  birthday: {
    label: 'Birthday',
    icon: Gift,
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    accent: 'text-rose-600 dark:text-rose-400',
    lightBg: 'bg-rose-50/50 dark:bg-rose-950/20',
  },
  anniversary: {
    label: 'Anniversary',
    icon: Sparkles,
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900',
    accent: 'text-purple-600 dark:text-purple-400',
    lightBg: 'bg-purple-50/50 dark:bg-purple-950/20',
  },
  emi: {
    label: 'EMI Due',
    icon: Clock,
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    accent: 'text-amber-600 dark:text-amber-400',
    lightBg: 'bg-amber-50/50 dark:bg-amber-950/20',
  },
  renewal: {
    label: 'Renewal',
    icon: ShieldCheck,
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    accent: 'text-emerald-600 dark:text-emerald-400',
    lightBg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
  },
};

const workStatuses = [
  { id: 'available', label: 'Available', icon: Smile, color: 'text-green-500' },
  { id: 'busy', label: 'In Meeting', icon: PhoneCall, color: 'text-blue-500' },
  { id: 'break', label: 'On Break', icon: Coffee, color: 'text-amber-500' },
  { id: 'offline', label: 'Offline', icon: Moon, color: 'text-gray-400' },
];

export default function UserPanel({ onNavigate }) {
  const { user } = useAuth();
  const { t } = useApp();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active view tab in User Hub
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'messages' | 'notices'

  // Core Data states
  const [events, setEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [whatsAppLogs, setWhatsAppLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);

  // Event category filter
  const [eventCategory, setEventCategory] = useState('upcoming'); // 'upcoming' | 'today' | 'birthday' | 'anniversary' | 'emi_renewal' | 'completed'

  // Action states
  const [remindingId, setRemindingId] = useState(null);
  const [completingEventId, setCompletingEventId] = useState(null);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Event Form
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [eventForm, setEventForm] = useState({
    customerId: '',
    type: 'birthday',
    date: todayStr,
    description: '',
    reminder: '1 day before',
  });

  // Quick Message Form
  const [messageForm, setMessageForm] = useState({
    customerId: '',
    channel: 'whatsapp', // 'whatsapp' | 'email'
    templateType: 'birthday',
    message: '',
    subject: '',
  });

  // User Availability Status (stored locally)
  const [workStatus, setWorkStatus] = useState(() => {
    return localStorage.getItem(`crm_user_status_${user?.id || user?._id}`) || 'available';
  });

  const handleStatusChange = (status) => {
    setWorkStatus(status);
    localStorage.setItem(`crm_user_status_${user?.id || user?._id}`, status);
    const item = workStatuses.find((s) => s.id === status);
    addToast(`Status set to ${item?.label || status}`, 'success');
  };

  // Main data loader
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [eventsRes, upcomingRes, custRes, waRes, emailRes] = await Promise.all([
        getEvents({ limit: 500 }).catch(() => ({ events: [] })),
        getUpcomingEvents(7).catch(() => ({ events: [] })),
        getCustomers({ limit: 500 }).catch(() => ({ customers: [] })),
        getWhatsAppLogs({ limit: 20 }).catch(() => ({ logs: [] })),
        getEmailLogs({ limit: 20 }).catch(() => ({ logs: [] })),
      ]);

      setEvents(eventsRes.events || []);
      setUpcomingEvents(upcomingRes.events || []);
      setCustomers(custRes.customers || []);
      setWhatsAppLogs(waRes.logs || []);
      setEmailLogs(emailRes.logs || []);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load user hub updates', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Formatted date string
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Urgency indicator
  const getEventUrgency = (dateStr, status) => {
    if (status === 'done') {
      return {
        label: 'Completed',
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-medium',
      };
    }
    if (!dateStr) return { label: 'Upcoming', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return {
        label: 'Due Today! 🎉',
        isToday: true,
        badgeClass: 'bg-rose-500 text-white font-bold animate-pulse shadow-sm',
      };
    } else if (diffDays === 1) {
      return {
        label: 'Tomorrow',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold',
      };
    } else if (diffDays > 1 && diffDays <= 7) {
      return {
        label: `In ${diffDays} days`,
        badgeClass: 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 font-medium',
      };
    } else if (diffDays > 7) {
      return {
        label: `In ${diffDays} days`,
        badgeClass: 'bg-dark-100 text-dark-700 dark:bg-dark-800 dark:text-dark-300',
      };
    } else {
      return {
        label: `${Math.abs(diffDays)}d overdue`,
        badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-medium',
      };
    }
  };

  // Filtered Events
  const todayEvents = useMemo(() => {
    return events.filter((e) => e.date === todayStr && e.status !== 'done');
  }, [events, todayStr]);

  const displayedEvents = useMemo(() => {
    if (eventCategory === 'today') {
      return events.filter((e) => e.date === todayStr);
    }
    if (eventCategory === 'upcoming') {
      return upcomingEvents.filter((e) => e.status !== 'done');
    }
    if (eventCategory === 'birthday') {
      return events.filter((e) => e.type === 'birthday' && e.status !== 'done');
    }
    if (eventCategory === 'anniversary') {
      return events.filter((e) => e.type === 'anniversary' && e.status !== 'done');
    }
    if (eventCategory === 'emi_renewal') {
      return events.filter((e) => (e.type === 'emi' || e.type === 'renewal') && e.status !== 'done');
    }
    if (eventCategory === 'completed') {
      return events.filter((e) => e.status === 'done');
    }
    return events.filter((e) => e.status !== 'done');
  }, [events, upcomingEvents, eventCategory, todayStr]);

  // Counts for summary metrics
  const celebrationsCount = useMemo(() => {
    return upcomingEvents.filter((e) => (e.type === 'birthday' || e.type === 'anniversary') && e.status !== 'done').length;
  }, [upcomingEvents]);

  const duesAndRenewalsCount = useMemo(() => {
    return upcomingEvents.filter((e) => (e.type === 'emi' || e.type === 'renewal') && e.status !== 'done').length;
  }, [upcomingEvents]);

  const totalCommunicationsCount = useMemo(() => {
    return (whatsAppLogs?.length || 0) + (emailLogs?.length || 0);
  }, [whatsAppLogs, emailLogs]);

  // Actions
  const handleTriggerAutomatedReminder = async (event) => {
    setRemindingId(event._id);
    try {
      const data = await triggerReminder(event._id, ['dashboard', 'email', 'whatsapp']);
      setEvents((prev) => prev.map((e) => (e._id === event._id ? data.event : e)));
      setUpcomingEvents((prev) => prev.map((e) => (e._id === event._id ? data.event : e)));

      const sent = [];
      if (data.results?.email) sent.push('Email');
      if (data.results?.whatsapp) sent.push('WhatsApp');
      if (data.results?.dashboard) sent.push('Dashboard');

      if (sent.length) {
        addToast(`Reminder dispatched to ${event.customerName} via ${sent.join(' & ')}!`, 'success');
      } else {
        addToast(`Automated reminder notification triggered for ${event.customerName}!`, 'info');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to dispatch reminder', 'error');
    } finally {
      setRemindingId(null);
    }
  };

  const handleMarkEventDone = async (event) => {
    setCompletingEventId(event._id);
    try {
      const data = await updateEvent(event._id, { status: 'done' });
      setEvents((prev) => prev.map((e) => (e._id === event._id ? data.event : e)));
      setUpcomingEvents((prev) => prev.filter((e) => e._id !== event._id));
      addToast(`Event for ${event.customerName} acknowledged and completed!`, 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update event', 'error');
    } finally {
      setCompletingEventId(null);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteConfirmEvent) return;
    try {
      await deleteEvent(deleteConfirmEvent._id);
      setEvents((prev) => prev.filter((e) => e._id !== deleteConfirmEvent._id));
      setUpcomingEvents((prev) => prev.filter((e) => e._id !== deleteConfirmEvent._id));
      addToast('Event deleted successfully', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete event', 'error');
    } finally {
      setDeleteConfirmEvent(null);
    }
  };

  const handleSaveEvent = async () => {
    if (!eventForm.customerId || !eventForm.date) {
      addToast('Please select customer and event date', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const data = await createEvent(eventForm);
      setEvents((prev) => [data.event, ...prev]);
      if (data.event.date >= todayStr) {
        setUpcomingEvents((prev) => [...prev, data.event].sort((a, b) => a.date.localeCompare(b.date)));
      }
      addToast('Event scheduled successfully!', 'success');
      setIsEventModalOpen(false);
      setEventForm({
        customerId: '',
        type: 'birthday',
        date: todayStr,
        description: '',
        reminder: '1 day before',
      });
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Quick Message Modal prefilled for an event
  const openQuickWishForEvent = (event, preferredChannel = 'whatsapp') => {
    const cust = customers.find((c) => String(c._id) === String(event.customerId)) || {
      _id: event.customerId,
      name: event.customerName,
    };

    let msg = '';
    let subj = '';
    if (event.type === 'birthday') {
      msg = `Dear ${cust.name || 'Friend'}, wishing you a very Happy Birthday! May your year ahead be blessed with happiness, health, and success. Warm regards! 🎉🎂`;
      subj = `Happy Birthday from SmartCRM! 🎂`;
    } else if (event.type === 'anniversary') {
      msg = `Dear ${cust.name || 'Friend'}, warm congratulations on your anniversary! Wishing you continued joy and prosperity. ✨🥂`;
      subj = `Heartiest Anniversary Congratulations! ✨`;
    } else if (event.type === 'emi') {
      msg = `Dear ${cust.name || 'Customer'}, this is a gentle reminder that your scheduled EMI / payment is due. Please feel free to reach out if you have any questions.`;
      subj = `Payment Due Notice`;
    } else {
      msg = `Dear ${cust.name || 'Customer'}, this is a friendly update regarding your upcoming service renewal. Thank you for being a valued client!`;
      subj = `Service Renewal Update`;
    }

    setMessageForm({
      customerId: cust._id || event.customerId,
      channel: preferredChannel,
      templateType: event.type,
      message: msg,
      subject: subj,
    });
    setIsMessageModalOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageForm.customerId) {
      addToast('Please select a recipient contact', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (messageForm.channel === 'whatsapp') {
        const res = await sendWhatsAppMessage({
          customerId: messageForm.customerId,
          type: messageForm.templateType === 'birthday' || messageForm.templateType === 'anniversary' ? 'greeting' : 'reminder',
        });
        if (res.log) setWhatsAppLogs((prev) => [res.log, ...prev]);
        addToast('WhatsApp greeting dispatched successfully!', 'success');
      } else {
        const res = await sendCustomerEmail({
          customerId: messageForm.customerId,
          subject: messageForm.subject || 'Event Greeting from SmartCRM',
          body: messageForm.message,
          type: 'general',
        });
        if (res.log) setEmailLogs((prev) => [res.log, ...prev]);
        addToast('Email greeting delivered successfully!', 'success');
      }
      setIsMessageModalOpen(false);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to dispatch message', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-sm text-dark-500 dark:text-dark-400 font-medium">Loading User Hub & Updates...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Welcoming User Header Banner */}
      <div className="bg-gradient-to-r from-white via-primary-50/20 to-white dark:from-dark-800 dark:via-dark-800 dark:to-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
              {user?.avatar || user?.name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">
                  Welcome back, {user?.name || 'User'}! 👋
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                  User Hub
                </span>
              </div>
              <p className="text-sm text-dark-500 dark:text-dark-400 mt-0.5">
                Here are your latest event updates, greetings, client milestones, and messages.
              </p>
            </div>
          </div>

          {/* Right Status Toggle & Refresh */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="inline-flex p-1 bg-dark-50 dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-700">
              {workStatuses.map((st) => {
                const Icon = st.icon;
                const isSelected = workStatus === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => handleStatusChange(st.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-dark-800 text-dark-900 dark:text-white shadow-xs font-semibold'
                        : 'text-dark-500 dark:text-dark-400 hover:text-dark-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={14} className={st.color} />
                    <span className="hidden sm:inline">{st.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 text-dark-600 dark:text-dark-300 transition-colors"
              title="Refresh updates"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin text-primary-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Today's Milestone Urgent Alert Banner */}
      {todayEvents.length > 0 && (
        <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-primary-500/10 border-l-4 border-rose-500 bg-white dark:bg-dark-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 flex-shrink-0 animate-bounce">
                <BellRing size={20} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                  <span>{todayEvents.length} Milestone Event(s) Happening Today!</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white">Action Today</span>
                </h2>
                <p className="text-xs sm:text-sm text-dark-600 dark:text-dark-300 mt-0.5">
                  Send greetings or due notifications to your contacts before the day ends.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('events');
                setEventCategory('today');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm self-start sm:self-auto"
            >
              View Today&apos;s Events ({todayEvents.length})
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 3. User-Focused 4-Metric Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Celebrations */}
        <div
          onClick={() => {
            setActiveTab('events');
            setEventCategory('birthday');
          }}
          className="cursor-pointer bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 hover:border-rose-400 dark:hover:border-rose-600 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Gift size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
              Next 7 Days
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white">
              {celebrationsCount}
            </p>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5 font-medium">
              Birthdays & Anniversaries
            </p>
          </div>
        </div>

        {/* Metric 2: Dues & Renewals */}
        <div
          onClick={() => {
            setActiveTab('events');
            setEventCategory('emi_renewal');
          }}
          className="cursor-pointer bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 hover:border-amber-400 dark:hover:border-amber-600 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
              Upcoming
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white">
              {duesAndRenewalsCount}
            </p>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5 font-medium">
              EMI Dues & Renewals
            </p>
          </div>
        </div>

        {/* Metric 3: Recent Messages */}
        <div
          onClick={() => setActiveTab('messages')}
          className="cursor-pointer bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 hover:border-primary-400 dark:hover:border-primary-600 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageCircle size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded-full">
              Activity
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white">
              {totalCommunicationsCount}
            </p>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5 font-medium">
              Messages & Updates
            </p>
          </div>
        </div>

        {/* Metric 4: My Contacts */}
        <div
          onClick={() => onNavigate?.('tc-customers')}
          className="cursor-pointer bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              Directory
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white">
              {customers.length}
            </p>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5 font-medium">
              Assigned Contacts
            </p>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation Header */}
      <div className="flex items-center gap-2 border-b border-dark-200 dark:border-dark-700 pb-2">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'events'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800'
          }`}
        >
          <Calendar size={17} />
          Event Updates & Reminders
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'events' ? 'bg-primary-700 text-white' : 'bg-dark-200 dark:bg-dark-700 text-dark-700 dark:text-dark-300'}`}>
            {displayedEvents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'messages'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800'
          }`}
        >
          <MessageCircle size={17} />
          Messages & Updates
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'messages' ? 'bg-primary-700 text-white' : 'bg-dark-200 dark:bg-dark-700 text-dark-700 dark:text-dark-300'}`}>
            {totalCommunicationsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('notices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'notices'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800'
          }`}
        >
          <Megaphone size={17} />
          Notice Board
        </button>
      </div>

      {/* 5. TAB 1: Event Updates & Milestones */}
      {activeTab === 'events' && (
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden space-y-4">
          {/* Top Control Bar */}
          <div className="p-5 border-b border-dark-200 dark:border-dark-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <Gift className="text-primary-600" size={20} />
                Client Milestones & Occasions
              </h2>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Keep track of birthdays, anniversaries, EMI payment dates, and policy renewals.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEventForm({
                    customerId: customers[0]?._id || '',
                    type: 'birthday',
                    date: todayStr,
                    description: '',
                    reminder: '1 day before',
                  });
                  setIsEventModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm"
              >
                <Plus size={16} />
                Add Event
              </button>

              <button
                onClick={() => onNavigate?.('tc-events')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 text-dark-700 dark:text-dark-200 text-xs sm:text-sm font-medium transition-colors"
              >
                Open Calendar
                <ExternalLink size={14} />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="px-5 flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
            {[
              { id: 'upcoming', label: 'Upcoming (7 Days)' },
              { id: 'today', label: "Due Today" },
              { id: 'birthday', label: '🎂 Birthdays' },
              { id: 'anniversary', label: '✨ Anniversaries' },
              { id: 'emi_renewal', label: '💳 Dues & Renewals' },
              { id: 'all', label: 'All Active' },
              { id: 'completed', label: 'Completed' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setEventCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  eventCategory === cat.id
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Event Cards Grid */}
          <div className="p-5 pt-0">
            {displayedEvents.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/30">
                <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-3">
                  <Calendar size={24} />
                </div>
                <h3 className="text-base font-semibold text-dark-900 dark:text-white">
                  No events found in this category
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400 max-w-sm mx-auto mt-1">
                  Schedule an event reminder for birthdays, anniversaries, or payment due dates to see them here.
                </p>
                <button
                  onClick={() => setIsEventModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors"
                >
                  <Plus size={15} />
                  Add First Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedEvents.map((event) => {
                  const typeCfg = eventTypeConfig[event.type] || eventTypeConfig.birthday;
                  const Icon = typeCfg.icon;
                  const urgency = getEventUrgency(event.date, event.status);
                  const isReminding = remindingId === event._id;
                  const isCompleting = completingEventId === event._id;

                  return (
                    <div
                      key={event._id}
                      className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                        urgency.isToday
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-400/20'
                          : 'bg-white dark:bg-dark-800/90 border-dark-200 dark:border-dark-700 hover:border-dark-300 dark:hover:border-dark-600'
                      }`}
                    >
                      <div>
                        {/* Type & Urgency */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${typeCfg.badge}`}>
                            <Icon size={14} />
                            {typeCfg.label}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] ${urgency.badgeClass}`}>
                            {urgency.label}
                          </span>
                        </div>

                        {/* Customer Name */}
                        <h4 className="text-base font-bold text-dark-900 dark:text-white truncate">
                          {event.customerName}
                        </h4>

                        {/* Date and timing */}
                        <div className="flex items-center gap-2 text-xs text-dark-500 dark:text-dark-400 mt-1">
                          <Calendar size={13} className="text-dark-400 flex-shrink-0" />
                          <span className="font-medium text-dark-700 dark:text-dark-300">{formatDate(event.date)}</span>
                          {event.reminder && (
                            <>
                              <span>•</span>
                              <span className="truncate">{event.reminder}</span>
                            </>
                          )}
                        </div>

                        {/* Description */}
                        {event.description && (
                          <p className="text-xs text-dark-600 dark:text-dark-300 mt-2.5 bg-dark-50 dark:bg-dark-900/50 p-2.5 rounded-xl border border-dark-100 dark:border-dark-700/50">
                            {event.description}
                          </p>
                        )}
                      </div>

                      {/* Fast Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-dark-100 dark:border-dark-700/60 space-y-2">
                        {event.status !== 'done' ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              {/* 1-Click Wish on WhatsApp */}
                              <button
                                onClick={() => openQuickWishForEvent(event, 'whatsapp')}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-950/40 dark:hover:bg-green-900/40 dark:text-green-300 text-xs font-medium transition-colors"
                                title="Wish via WhatsApp"
                              >
                                <MessageCircle size={13} />
                                Wish on WA
                              </button>

                              {/* 1-Click Email Greeting */}
                              <button
                                onClick={() => openQuickWishForEvent(event, 'email')}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 dark:text-blue-300 text-xs font-medium transition-colors"
                                title="Send Email Greeting"
                              >
                                <Mail size={13} />
                                Email Wish
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Trigger Automated Reminder */}
                              <button
                                onClick={() => handleTriggerAutomatedReminder(event)}
                                disabled={isReminding}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-medium transition-colors"
                              >
                                {isReminding ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
                                Send Reminder
                              </button>

                              {/* Mark Complete */}
                              <button
                                onClick={() => handleMarkEventDone(event)}
                                disabled={isCompleting}
                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 transition-colors"
                                title="Mark Completed"
                              >
                                {isCompleting ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => setDeleteConfirmEvent(event)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-dark-400 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold py-1">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 size={14} /> Completed
                            </span>
                            <button
                              onClick={() => setDeleteConfirmEvent(event)}
                              className="text-dark-400 hover:text-red-600 p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB 2: Messages & Communications Feed */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Message Composer (Left 1/3) */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <Send size={18} className="text-primary-600" />
                Quick Message / Greeting
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Send a quick WhatsApp or email wish directly to any of your contacts.
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Recipient Contact *
                </label>
                <select
                  value={messageForm.customerId}
                  onChange={(e) => setMessageForm({ ...messageForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="">Select contact...</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.mobile || c.email || 'No phone'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Send Via
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMessageForm({ ...messageForm, channel: 'whatsapp' })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      messageForm.channel === 'whatsapp'
                        ? 'bg-green-500 text-white border-green-600 shadow-xs'
                        : 'bg-white dark:bg-dark-700 text-dark-600 dark:text-dark-300 border-dark-200 dark:border-dark-600'
                    }`}
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageForm({ ...messageForm, channel: 'email' })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      messageForm.channel === 'email'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white dark:bg-dark-700 text-dark-600 dark:text-dark-300 border-dark-200 dark:border-dark-600'
                    }`}
                  >
                    <Mail size={14} /> Email
                  </button>
                </div>
              </div>

              {messageForm.channel === 'email' && (
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={messageForm.subject}
                    onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                    placeholder="Enter email subject..."
                    className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Template Presets
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMessageForm((prev) => ({
                        ...prev,
                        templateType: 'birthday',
                        subject: 'Happy Birthday! 🎉',
                        message: 'Wishing you a very Happy Birthday! May this year bring you abundant joy, health, and great milestones!',
                      }));
                    }}
                    className="text-left text-[11px] p-2 rounded-lg bg-dark-50 dark:bg-dark-700 hover:bg-primary-50 dark:hover:bg-primary-950/40 border border-dark-100 dark:border-dark-600 font-medium"
                  >
                    🎂 Birthday Wish
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessageForm((prev) => ({
                        ...prev,
                        templateType: 'anniversary',
                        subject: 'Happy Anniversary! ✨',
                        message: 'Warmest congratulations on your anniversary! Wishing you continued happiness and prosperity.',
                      }));
                    }}
                    className="text-left text-[11px] p-2 rounded-lg bg-dark-50 dark:bg-dark-700 hover:bg-primary-50 dark:hover:bg-primary-950/40 border border-dark-100 dark:border-dark-600 font-medium"
                  >
                    🎉 Anniversary
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessageForm((prev) => ({
                        ...prev,
                        templateType: 'emi',
                        subject: 'Payment / EMI Reminder',
                        message: 'Hello, this is a friendly reminder regarding your upcoming scheduled EMI/payment. Please let us know if you need any assistance.',
                      }));
                    }}
                    className="text-left text-[11px] p-2 rounded-lg bg-dark-50 dark:bg-dark-700 hover:bg-primary-50 dark:hover:bg-primary-950/40 border border-dark-100 dark:border-dark-600 font-medium"
                  >
                    💳 Due Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessageForm((prev) => ({
                        ...prev,
                        templateType: 'greeting',
                        subject: 'Greetings from SmartCRM',
                        message: 'Hope you are doing well! Just reaching out to see if you have any questions or require any assistance today.',
                      }));
                    }}
                    className="text-left text-[11px] p-2 rounded-lg bg-dark-50 dark:bg-dark-700 hover:bg-primary-50 dark:hover:bg-primary-950/40 border border-dark-100 dark:border-dark-600 font-medium"
                  >
                    👋 General Greeting
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={4}
                  value={messageForm.message}
                  onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                  placeholder="Type message here or pick a preset above..."
                  className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={submitting || !messageForm.customerId}
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send {messageForm.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
              </button>
            </div>
          </div>

          {/* Communication Logs Stream (Right 2/3) */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-200 dark:border-dark-700">
              <div>
                <h3 className="text-base font-bold text-dark-900 dark:text-white">
                  Recent Messages & Dispatches
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400">
                  Real-time history of outgoing WhatsApp messages and Email greetings
                </p>
              </div>
              <span className="text-xs text-dark-500 font-semibold bg-dark-100 dark:bg-dark-700 px-2.5 py-1 rounded-lg">
                {totalCommunicationsCount} Total
              </span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {totalCommunicationsCount === 0 ? (
                <div className="text-center py-12 text-dark-400 text-xs">
                  <MessageCircle size={24} className="mx-auto mb-2 opacity-40" />
                  No messages logged yet. Use the composer on the left to send your first message!
                </div>
              ) : (
                [
                  ...whatsAppLogs.map((l) => ({ ...l, channel: 'whatsapp' })),
                  ...emailLogs.map((l) => ({ ...l, channel: 'email' })),
                ]
                  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                  .map((log, idx) => (
                    <div
                      key={log._id || idx}
                      className="p-3.5 rounded-xl bg-dark-50 dark:bg-dark-700/60 border border-dark-100 dark:border-dark-700 flex items-start gap-3 hover:bg-dark-100/60 dark:hover:bg-dark-700 transition-colors"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          log.channel === 'whatsapp'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {log.channel === 'whatsapp' ? <MessageCircle size={18} /> : <Mail size={18} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-dark-900 dark:text-white truncate">
                            {log.customerName || 'Contact'}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                              log.status === 'sent' || log.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {log.status || 'Sent'}
                          </span>
                        </div>

                        <p className="text-xs text-dark-600 dark:text-dark-300 mt-1 truncate">
                          {log.subject || log.message || log.type || 'Communication message'}
                        </p>

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-dark-400">
                          <span>Via {log.channel === 'whatsapp' ? 'WhatsApp' : 'Email Relay'}</span>
                          <span>•</span>
                          <span>{new Date(log.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: Notice Board & Announcements */}
      {activeTab === 'notices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 flex items-center justify-center">
                <Megaphone size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-dark-900 dark:text-white">
                  Notice Board & Announcements
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400">Important company updates and announcements</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">📢 Monthly Celebration Drive</span>
                  <span className="text-[10px] text-dark-400">Active</span>
                </div>
                <p className="text-xs text-dark-600 dark:text-dark-300 mt-1">
                  Remember to send personalized birthday wishes and anniversary greetings to your contacts. Client retention increases by 35% with timely celebration messages!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">💳 Payment Follow-up Protocol</span>
                  <span className="text-[10px] text-dark-400">Notice</span>
                </div>
                <p className="text-xs text-dark-600 dark:text-dark-300 mt-1">
                  Automated reminders are dispatched 1 day before due date. Use the WhatsApp button to follow up directly if needed.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <HelpCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-dark-900 dark:text-white">
                  CRM Support & Contact
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400">Need help or account reassignment?</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-700/50 border border-dark-100 dark:border-dark-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-dark-500">System Administrator:</span>
                <span className="font-semibold text-dark-900 dark:text-white">CRM Admin Desk</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-500">Support Email:</span>
                <span className="font-semibold text-primary-600">info@paymanent.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-500">Your User Role:</span>
                <span className="font-semibold text-dark-900 dark:text-white capitalize">{user?.role || 'User'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Event Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title="Schedule Event or Milestone Reminder"
      >
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Select Contact *
            </label>
            <select
              value={eventForm.customerId}
              onChange={(e) => setEventForm({ ...eventForm, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Select contact...</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.mobile || c.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                Event Category
              </label>
              <select
                value={eventForm.type}
                onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="birthday">🎂 Birthday</option>
                <option value="anniversary">✨ Anniversary</option>
                <option value="emi">💳 EMI Due</option>
                <option value="renewal">🛡️ Policy/Service Renewal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                Event Date *
              </label>
              <input
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Reminder Schedule
            </label>
            <select
              value={eventForm.reminder}
              onChange={(e) => setEventForm({ ...eventForm, reminder: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="same day">Same day</option>
              <option value="1 day before">1 day before</option>
              <option value="3 days before">3 days before</option>
              <option value="1 week before">1 week before</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={3}
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              placeholder="e.g. 30th Birthday, Insurance policy renewal, EMI #4 amount: ₹4,500..."
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-700">
            <button
              type="button"
              onClick={() => setIsEventModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEvent}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Schedule Event
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Send Quick Message Modal */}
      <Modal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        title={`Send ${messageForm.channel === 'whatsapp' ? 'WhatsApp Message' : 'Email Greeting'}`}
      >
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Channel
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMessageForm({ ...messageForm, channel: 'whatsapp' })}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  messageForm.channel === 'whatsapp'
                    ? 'bg-green-500 text-white border-green-600 shadow-xs'
                    : 'bg-white dark:bg-dark-700 text-dark-600 dark:text-dark-300 border-dark-200 dark:border-dark-600'
                }`}
              >
                <MessageCircle size={14} /> WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setMessageForm({ ...messageForm, channel: 'email' })}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  messageForm.channel === 'email'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white dark:bg-dark-700 text-dark-600 dark:text-dark-300 border-dark-200 dark:border-dark-600'
                }`}
              >
                <Mail size={14} /> Email
              </button>
            </div>
          </div>

          {messageForm.channel === 'email' && (
            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={messageForm.subject}
                onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Message Content
            </label>
            <textarea
              rows={4}
              value={messageForm.message}
              onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs dark:bg-dark-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-700">
            <button
              type="button"
              onClick={() => setIsMessageModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Send Message
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Delete Event Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirmEvent}
        title="Delete Event"
        message={`Are you sure you want to delete this event for ${deleteConfirmEvent?.customerName}? This reminder will no longer trigger.`}
        confirmText="Delete"
        onConfirm={handleDeleteEvent}
        onCancel={() => setDeleteConfirmEvent(null)}
      />
    </div>
  );
}
