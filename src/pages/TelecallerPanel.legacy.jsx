import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  CalendarCheck,
  Phone,
  MessageCircle,
  Mail,
  Clock,
  Loader2,
  CheckCircle2,
  Plus,
  Send,
  Calendar,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  Activity,
  Smile,
  Coffee,
  PhoneCall,
  Check,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { getCustomers } from '../api/customers';
import { getLeads } from '../api/leads';
import { getFollowUps, getTodayFollowUps, createFollowUp, updateFollowUp } from '../api/followups';
import { getWhatsAppLogs, sendWhatsAppTemplate } from '../api/whatsapp';
import { getEmailLogs, sendCustomerEmail } from '../api/emails';
import { getCalls, createCall } from '../api/callHistory';

export default function TelecallerPanel({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'followups' | 'customers' | 'communications'
  const [loading, setLoading] = useState(true);

  // Data states
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [allFollowUps, setAllFollowUps] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [waLogs, setWaLogs] = useState([]);
  const [callsList, setCallsList] = useState([]);

  // Work Status state (persisted in localStorage)
  const [workStatus, setWorkStatus] = useState(() => {
    return localStorage.getItem(`crm_work_status_${user?.id}`) || 'available';
  });

  // Modals state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms state
  const [emailForm, setEmailForm] = useState({ customerId: '', type: 'follow-up', subject: '', body: '' });
  const [waForm, setWaForm] = useState({ customerId: '', type: 'follow-up' });
  const [callForm, setCallForm] = useState({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().substring(0, 5),
    duration: '5 mins',
    status: 'connected',
    remarks: '',
  });
  const [followUpForm, setFollowUpForm] = useState({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    time: '11:00',
    remarks: '',
    nextFollowUp: '',
  });
  const [completeRemark, setCompleteRemark] = useState('');

  // Follow-up tab filter
  const [followUpFilter, setFollowUpFilter] = useState('today'); // 'all' | 'today' | 'pending' | 'completed'

  // Customer search in roster tab
  const [customerSearch, setCustomerSearch] = useState('');

  const handleStatusChange = (status) => {
    setWorkStatus(status);
    localStorage.setItem(`crm_work_status_${user?.id}`, status);
    addToast(`Status updated to ${status}`, 'success');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        customerData,
        leadData,
        todayFUData,
        allFUData,
        waData,
        emailData,
        callData,
      ] = await Promise.all([
        getCustomers({ limit: 1000 }),
        getLeads({ limit: 1000 }),
        getTodayFollowUps(),
        getFollowUps({ limit: 100 }),
        getWhatsAppLogs({ limit: 20 }),
        getEmailLogs({ limit: 20 }),
        getCalls({ limit: 20 }),
      ]);

      setCustomers(customerData.customers || []);
      setLeads(leadData.leads || []);
      setTodayFollowUps(todayFUData.followUps || []);
      setAllFollowUps(allFUData.followUps || []);
      setWaLogs(waData.logs || []);
      setEmailLogs(emailData.logs || []);
      setCallsList(callData.calls || []);

      // Merge activities
      const activities = [
        ...(waData.logs || []).map((l) => ({
          id: l._id,
          type: 'whatsapp',
          customer: l.customerName,
          time: l.createdAt,
          status: l.status,
          details: l.message,
        })),
        ...(emailData.logs || []).map((l) => ({
          id: l._id,
          type: 'email',
          customer: l.customerName,
          time: l.createdAt,
          status: l.status,
          details: l.subject,
        })),
        ...(callData.calls || []).map((c) => ({
          id: c._id,
          type: 'call',
          customer: c.customerName,
          time: c.createdAt,
          status: c.status,
          details: `${c.duration} - ${c.remarks || 'No remarks'}`,
        })),
      ]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 8);

      setRecentActivities(activities);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load panel data', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistics
  const totalPending = useMemo(
    () => allFollowUps.filter((f) => f.status === 'pending').length,
    [allFollowUps]
  );
  const convertedLeads = useMemo(
    () => leads.filter((l) => l.status === 'converted').length,
    [leads]
  );
  const conversionRate = useMemo(
    () => (leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0),
    [leads, convertedLeads]
  );

  // Quick action modal openers
  const openEmailModal = (customerId = '') => {
    setEmailForm({ customerId, type: 'follow-up', subject: '', body: '' });
    setIsEmailModalOpen(true);
  };

  const openWaModal = (customerId = '') => {
    setWaForm({ customerId, type: 'follow-up' });
    setIsWaModalOpen(true);
  };

  const openCallModal = (customerId = '') => {
    setCallForm({
      customerId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().substring(0, 5),
      duration: '5 mins',
      status: 'connected',
      remarks: '',
    });
    setIsCallModalOpen(true);
  };

  const openFollowUpModal = (customerId = '') => {
    setFollowUpForm({
      customerId,
      date: new Date().toISOString().split('T')[0],
      time: '11:00',
      remarks: '',
      nextFollowUp: '',
    });
    setIsFollowUpModalOpen(true);
  };

  // Handlers for sending / saving
  const handleSendEmail = async () => {
    if (!emailForm.customerId) {
      addToast('Please select a customer', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await sendCustomerEmail(emailForm);
      if (res.success) {
        addToast('Professional email sent via one.com!', 'success');
        setIsEmailModalOpen(false);
        loadData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send email', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!waForm.customerId) {
      addToast('Please select a customer', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await sendWhatsAppTemplate({
        customerId: waForm.customerId,
        templateName: 'hello_world',
        languageCode: 'en_US',
        params: [],
        type: waForm.type,
      });
      if (res.success) {
        addToast('WhatsApp message sent!', 'success');
        setIsWaModalOpen(false);
        loadData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send WhatsApp', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogCall = async () => {
    if (!callForm.customerId) {
      addToast('Please select a customer', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createCall(callForm);
      addToast('Call record logged successfully!', 'success');
      setIsCallModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to log call', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFollowUp = async () => {
    if (!followUpForm.customerId) {
      addToast('Please select a customer', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createFollowUp(followUpForm);
      addToast('Follow-up scheduled successfully!', 'success');
      setIsFollowUpModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create follow-up', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteFollowUp = async () => {
    if (!selectedFollowUp) return;
    setSubmitting(true);
    try {
      await updateFollowUp(selectedFollowUp._id, {
        status: 'completed',
        remarks: completeRemark
          ? `${selectedFollowUp.remarks ? selectedFollowUp.remarks + ' | ' : ''}Completed: ${completeRemark}`
          : selectedFollowUp.remarks,
      });
      addToast('Follow-up marked as completed!', 'success');
      setIsCompleteModalOpen(false);
      setSelectedFollowUp(null);
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update follow-up', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered follow-ups for Tab 2
  const filteredFollowUps = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (followUpFilter === 'today') return allFollowUps.filter((f) => f.date === todayStr);
    if (followUpFilter === 'pending') return allFollowUps.filter((f) => f.status === 'pending');
    if (followUpFilter === 'completed') return allFollowUps.filter((f) => f.status === 'completed');
    return allFollowUps;
  }, [allFollowUps, followUpFilter]);

  // Filtered customer roster for Tab 3
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.mobile?.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'call':
        return <Phone className="text-blue-500" size={16} />;
      case 'whatsapp':
        return <MessageCircle className="text-green-500" size={16} />;
      case 'email':
        return <Mail className="text-purple-500" size={16} />;
      default:
        return <Clock className="text-gray-500" size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-dark-400 dark:text-dark-500">
        <Loader2 className="animate-spin mb-3 text-primary-600" size={28} />
        <p className="text-sm font-medium">Loading User Panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Status Selector */}
      <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-lg text-white border border-white/20">
                {user?.name?.slice(0, 2).toUpperCase() || 'UP'}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Welcome, {user?.name || 'Member'}!
                </h1>
                <p className="text-xs text-primary-200 mt-0.5">
                  Role: <span className="capitalize font-semibold text-white">{user?.role}</span> · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Dropdown */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
              <span className="text-xs text-primary-200 font-medium">Work Status:</span>
              <select
                value={workStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="available" className="text-gray-900">🟢 Available & Online</option>
                <option value="in_call" className="text-gray-900">📞 In a Client Call</option>
                <option value="meeting" className="text-gray-900">👥 In Meeting</option>
                <option value="break" className="text-gray-900">☕ On Break</option>
              </select>
            </div>

            {/* Quick Email Trigger */}
            <button
              onClick={() => openEmailModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-primary-900 hover:bg-primary-50 rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              <Mail size={15} /> Send Email
            </button>
            {/* Quick Call Trigger */}
            <button
              onClick={() => openCallModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold transition-all backdrop-blur-sm"
            >
              <Phone size={15} /> Log Call
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div
          onClick={() => setActiveTab('customers')}
          className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm cursor-pointer hover:border-primary-400 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-dark-500 dark:text-dark-400">My Customers</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-dark-900 dark:text-white">{customers.length}</p>
        </div>

        <div
          onClick={() => onNavigate?.('tc-leads')}
          className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm cursor-pointer hover:border-primary-400 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-dark-500 dark:text-dark-400">Pipeline Leads</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-dark-900 dark:text-white">{leads.length}</p>
        </div>

        <div
          onClick={() => setActiveTab('followups')}
          className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm cursor-pointer hover:border-primary-400 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-dark-500 dark:text-dark-400">Today's Agenda</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
              <CalendarCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-dark-900 dark:text-white">{todayFollowUps.length}</p>
        </div>

        <div
          onClick={() => setActiveTab('followups')}
          className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm cursor-pointer hover:border-primary-400 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-dark-500 dark:text-dark-400">Pending Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-dark-900 dark:text-white">{totalPending}</p>
        </div>

        <div
          onClick={() => setActiveTab('communications')}
          className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm cursor-pointer hover:border-primary-400 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-dark-500 dark:text-dark-400">Calls Logged</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <Phone size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-dark-900 dark:text-white">{callsList.length}</p>
        </div>

        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-dark-500 dark:text-dark-400">Conversion Rate</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-dark-900 dark:text-white">{conversionRate}%</p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-dark-200 dark:border-dark-700 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-dark-500 hover:text-dark-800 dark:text-dark-400'
          }`}
        >
          <Activity size={17} /> Overview & Agenda
        </button>
        <button
          onClick={() => setActiveTab('followups')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'followups'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-dark-500 hover:text-dark-800 dark:text-dark-400'
          }`}
        >
          <CalendarCheck size={17} /> Follow-up Manager ({allFollowUps.length})
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'customers'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-dark-500 hover:text-dark-800 dark:text-dark-400'
          }`}
        >
          <Users size={17} /> My Customer Roster ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab('communications')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'communications'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-dark-500 hover:text-dark-800 dark:text-dark-400'
          }`}
        >
          <Mail size={17} /> Communications Hub
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: OVERVIEW & AGENDA */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Today's Follow-up Agenda */}
            <div className="lg:col-span-2 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base text-dark-900 dark:text-white flex items-center gap-2">
                    <CalendarCheck className="text-primary-600" size={18} /> Today's Scheduled Follow-ups
                  </h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400">
                    Action items scheduled for today ({todayFollowUps.length})
                  </p>
                </div>
                <button
                  onClick={() => openFollowUpModal()}
                  className="flex items-center gap-1.5 text-xs bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 px-3 py-1.5 rounded-lg font-medium hover:bg-primary-100"
                >
                  <Plus size={14} /> Add New
                </button>
              </div>

              {todayFollowUps.length === 0 ? (
                <div className="text-center py-10 bg-dark-50 dark:bg-dark-750 rounded-xl border border-dashed border-dark-200 dark:border-dark-700">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-dark-700 dark:text-dark-200">
                    All caught up for today!
                  </p>
                  <p className="text-xs text-dark-400 mt-1">No pending follow-ups scheduled for today.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayFollowUps.map((fu) => (
                    <div
                      key={fu._id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-dark-200 dark:border-dark-700 hover:border-primary-300 dark:hover:border-primary-500 transition-all bg-white dark:bg-dark-800"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            fu.status === 'completed'
                              ? 'bg-emerald-500'
                              : 'bg-amber-500 animate-pulse'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-dark-900 dark:text-white">
                            {fu.customerName}
                          </p>
                          <p className="text-xs text-dark-500 dark:text-dark-400">
                            Time: <span className="font-medium text-dark-700 dark:text-dark-200">{fu.time}</span> · {fu.remarks || 'General Follow-up'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {fu.status === 'pending' ? (
                          <button
                            onClick={() => {
                              setSelectedFollowUp(fu);
                              setCompleteRemark('');
                              setIsCompleteModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                          >
                            <Check size={14} /> Mark Done
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg dark:bg-emerald-900/30 dark:text-emerald-400">
                            Completed
                          </span>
                        )}

                        <button
                          onClick={() => openCallModal(fu.customerId)}
                          title="Call Customer"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                        >
                          <Phone size={15} />
                        </button>
                        <button
                          onClick={() => openEmailModal(fu.customerId)}
                          title="Send Email via one.com"
                          className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg"
                        >
                          <Mail size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right 1 Col: Quick Actions & Daily Goal */}
            <div className="space-y-6">
              {/* Daily Goals Widget */}
              <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 p-5 shadow-sm">
                <h3 className="font-bold text-sm text-dark-900 dark:text-white mb-3 flex items-center justify-between">
                  <span>Daily Action Tracker</span>
                  <span className="text-xs font-medium text-primary-600">Today</span>
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-dark-600 dark:text-dark-400 mb-1">
                      <span>Follow-ups Completed</span>
                      <span className="font-bold text-dark-900 dark:text-white">
                        {allFollowUps.filter((f) => f.status === 'completed').length} / 5
                      </span>
                    </div>
                    <div className="w-full bg-dark-100 dark:bg-dark-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary-600 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (allFollowUps.filter((f) => f.status === 'completed').length / 5) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-dark-600 dark:text-dark-400 mb-1">
                      <span>Calls Logged</span>
                      <span className="font-bold text-dark-900 dark:text-white">{callsList.length} / 10</span>
                    </div>
                    <div className="w-full bg-dark-100 dark:bg-dark-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min((callsList.length / 10) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-dark-600 dark:text-dark-400 mb-1">
                      <span>Emails Sent</span>
                      <span className="font-bold text-dark-900 dark:text-white">{emailLogs.length} / 5</span>
                    </div>
                    <div className="w-full bg-dark-100 dark:bg-dark-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min((emailLogs.length / 5) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons Card */}
              <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 p-5 shadow-sm">
                <h3 className="font-bold text-sm text-dark-900 dark:text-white mb-3">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => openEmailModal()}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-dark-200 dark:border-dark-700 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all text-center"
                  >
                    <Mail className="text-purple-600 mb-1.5" size={20} />
                    <span className="text-xs font-semibold text-dark-800 dark:text-dark-200">Send Email</span>
                    <span className="text-[10px] text-dark-400">one.com SMTP</span>
                  </button>

                  <button
                    onClick={() => openCallModal()}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-dark-200 dark:border-dark-700 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-center"
                  >
                    <Phone className="text-blue-600 mb-1.5" size={20} />
                    <span className="text-xs font-semibold text-dark-800 dark:text-dark-200">Log Call</span>
                    <span className="text-[10px] text-dark-400">Duration & Note</span>
                  </button>

                  <button
                    onClick={() => openWaModal()}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-dark-200 dark:border-dark-700 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all text-center"
                  >
                    <MessageCircle className="text-emerald-600 mb-1.5" size={20} />
                    <span className="text-xs font-semibold text-dark-800 dark:text-dark-200">WhatsApp</span>
                    <span className="text-[10px] text-dark-400">Meta Template</span>
                  </button>

                  <button
                    onClick={() => openFollowUpModal()}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-dark-200 dark:border-dark-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all text-center"
                  >
                    <CalendarCheck className="text-indigo-600 mb-1.5" size={20} />
                    <span className="text-xs font-semibold text-dark-800 dark:text-dark-200">Schedule Task</span>
                    <span className="text-[10px] text-dark-400">Date & Time</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Stream */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-dark-900 dark:text-white flex items-center gap-2">
                <Clock className="text-primary-600" size={18} /> Live Activity Stream
              </h3>
              <span className="text-xs text-dark-400">Recent customer interactions</span>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-center py-6 text-xs text-dark-400">No activity logged yet.</p>
            ) : (
              <div className="divide-y divide-dark-100 dark:divide-dark-700">
                {recentActivities.map((act) => (
                  <div key={act.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-dark-50 dark:bg-dark-700 flex items-center justify-center">
                        {getActivityIcon(act.type)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-dark-900 dark:text-white">
                          {act.customer}
                        </p>
                        <p className="text-xs text-dark-500 dark:text-dark-400 capitalize">
                          {act.type} · {act.details}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300">
                        {act.status}
                      </span>
                      <p className="text-[11px] text-dark-400 mt-0.5">
                        {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FOLLOW-UP MANAGER */}
      {activeTab === 'followups' && (
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-dark-200 dark:border-dark-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFollowUpFilter('today')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  followUpFilter === 'today'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-dark-50 dark:bg-dark-700 text-dark-600 dark:text-dark-300 hover:bg-dark-100'
                }`}
              >
                Today ({todayFollowUps.length})
              </button>
              <button
                onClick={() => setFollowUpFilter('pending')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  followUpFilter === 'pending'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-dark-50 dark:bg-dark-700 text-dark-600 dark:text-dark-300 hover:bg-dark-100'
                }`}
              >
                All Pending ({totalPending})
              </button>
              <button
                onClick={() => setFollowUpFilter('completed')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  followUpFilter === 'completed'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-dark-50 dark:bg-dark-700 text-dark-600 dark:text-dark-300 hover:bg-dark-100'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setFollowUpFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  followUpFilter === 'all'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-dark-50 dark:bg-dark-700 text-dark-600 dark:text-dark-300 hover:bg-dark-100'
                }`}
              >
                All ({allFollowUps.length})
              </button>
            </div>

            <button
              onClick={() => openFollowUpModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-all self-start sm:self-auto"
            >
              <Plus size={14} /> Schedule Follow-up
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-dark-50 dark:bg-dark-750 text-xs uppercase font-semibold text-dark-500 dark:text-dark-400">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Scheduled Date & Time</th>
                  <th className="px-4 py-3">Remarks / Purpose</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
                {filteredFollowUps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-dark-400 text-sm">
                      No follow-ups found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredFollowUps.map((fu) => (
                    <tr key={fu._id} className="hover:bg-dark-50 dark:hover:bg-dark-750/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-dark-900 dark:text-white">
                        {fu.customerName}
                      </td>
                      <td className="px-4 py-3 text-dark-600 dark:text-dark-300">
                        {fu.date} at <span className="font-medium text-dark-900 dark:text-white">{fu.time}</span>
                      </td>
                      <td className="px-4 py-3 text-dark-600 dark:text-dark-300 max-w-xs truncate">
                        {fu.remarks || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                            fu.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {fu.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {fu.status === 'pending' && (
                          <button
                            onClick={() => {
                              setSelectedFollowUp(fu);
                              setCompleteRemark('');
                              setIsCompleteModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
                          >
                            Done
                          </button>
                        )}
                        <button
                          onClick={() => openCallModal(fu.customerId)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Call Customer"
                        >
                          <Phone size={15} />
                        </button>
                        <button
                          onClick={() => openEmailModal(fu.customerId)}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                          title="Email Customer (one.com)"
                        >
                          <Mail size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER ROSTER */}
      {activeTab === 'customers' && (
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-dark-200 dark:border-dark-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 text-dark-400" size={16} />
              <input
                type="text"
                placeholder="Search by name, mobile, email, city..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-dark-200 dark:border-dark-700 rounded-lg text-xs bg-dark-50 dark:bg-dark-750 focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white"
              />
            </div>
            <p className="text-xs text-dark-500">
              Showing {filteredCustomers.length} assigned customers
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-dark-50 dark:bg-dark-750 text-xs uppercase font-semibold text-dark-500 dark:text-dark-400">
                <tr>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Company / City</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Quick Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-dark-400 text-sm">
                      No matching customers found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c._id} className="hover:bg-dark-50 dark:hover:bg-dark-750/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-dark-900 dark:text-white">
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-dark-600 dark:text-dark-300">{c.mobile || '—'}</td>
                      <td className="px-4 py-3 text-dark-600 dark:text-dark-300">{c.email || '—'}</td>
                      <td className="px-4 py-3 text-dark-500 dark:text-dark-400">
                        {c.company ? `${c.company} · ` : ''}{c.city || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                            c.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-dark-100 text-dark-700 dark:bg-dark-700 dark:text-dark-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEmailModal(c._id)}
                            title="Send Email via one.com"
                            className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-all"
                          >
                            <Mail size={16} />
                          </button>
                          <button
                            onClick={() => openCallModal(c._id)}
                            title="Log Call"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                          >
                            <Phone size={16} />
                          </button>
                          <button
                            onClick={() => openWaModal(c._id)}
                            title="Send WhatsApp"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                          >
                            <MessageCircle size={16} />
                          </button>
                          <button
                            onClick={() => openFollowUpModal(c._id)}
                            title="Schedule Follow-up"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                          >
                            <CalendarCheck size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COMMUNICATIONS HUB */}
      {activeTab === 'communications' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Outgoing Emails */}
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-dark-900 dark:text-white flex items-center gap-2">
                  <Mail className="text-purple-600" size={17} /> Email Dispatch Logs (one.com)
                </h3>
                <button
                  onClick={() => openEmailModal()}
                  className="text-xs text-primary-600 hover:underline font-semibold"
                >
                  + New Email
                </button>
              </div>

              {emailLogs.length === 0 ? (
                <p className="text-xs text-dark-400 py-6 text-center">No emails dispatched yet.</p>
              ) : (
                <div className="space-y-3">
                  {emailLogs.slice(0, 5).map((log) => (
                    <div key={log._id} className="p-3 bg-dark-50 dark:bg-dark-750 rounded-lg text-xs">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-dark-900 dark:text-white">
                          {log.customerName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full capitalize font-medium text-[10px] bg-purple-100 text-purple-700">
                          {log.status}
                        </span>
                      </div>
                      <p className="text-dark-600 dark:text-dark-300 mt-1 truncate">
                        Subject: {log.subject}
                      </p>
                      <p className="text-[10px] text-dark-400 mt-1">
                        To: {log.email} · {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Calls */}
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-dark-900 dark:text-white flex items-center gap-2">
                  <Phone className="text-blue-600" size={17} /> Call History Logs
                </h3>
                <button
                  onClick={() => openCallModal()}
                  className="text-xs text-primary-600 hover:underline font-semibold"
                >
                  + Log Call
                </button>
              </div>

              {callsList.length === 0 ? (
                <p className="text-xs text-dark-400 py-6 text-center">No calls logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {callsList.slice(0, 5).map((call) => (
                    <div key={call._id} className="p-3 bg-dark-50 dark:bg-dark-750 rounded-lg text-xs">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-dark-900 dark:text-white">
                          {call.customerName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full capitalize font-medium text-[10px] bg-blue-100 text-blue-700">
                          {call.status} ({call.duration})
                        </span>
                      </div>
                      <p className="text-dark-600 dark:text-dark-300 mt-1 truncate">
                        Remarks: {call.remarks || 'None'}
                      </p>
                      <p className="text-[10px] text-dark-400 mt-1">
                        {call.date} at {call.time}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SEND EMAIL (one.com) */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Send Email via one.com Professional Mail"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Recipient Customer *
            </label>
            <select
              value={emailForm.customerId}
              onChange={(e) => setEmailForm({ ...emailForm, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.email || 'No email on file'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Template Type
            </label>
            <select
              value={emailForm.type}
              onChange={(e) => setEmailForm({ ...emailForm, type: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="welcome">Welcome Onboard</option>
              <option value="follow-up">Follow-up Message</option>
              <option value="offer">Exclusive Offer / Update</option>
              <option value="custom">Custom Message</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Subject Line (Leave blank for default template)
            </label>
            <input
              type="text"
              placeholder="e.g. Following up on our CRM conversation"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Message Body (Leave blank for default template)
            </label>
            <textarea
              rows={4}
              placeholder="Enter message details..."
              value={emailForm.body}
              onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs text-purple-800 dark:text-purple-300 flex items-center gap-2">
            <Mail size={16} />
            <span>Emails are dispatched securely from <strong>info@paymanent.com</strong></span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEmailModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300 hover:bg-dark-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmail}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send via one.com
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: LOG CALL */}
      <Modal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        title="Log Customer Call"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Customer *
            </label>
            <select
              value={callForm.customerId}
              onChange={(e) => setCallForm({ ...callForm, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.mobile})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                Duration
              </label>
              <input
                type="text"
                placeholder="e.g. 5 mins"
                value={callForm.duration}
                onChange={(e) => setCallForm({ ...callForm, duration: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                Outcome Status
              </label>
              <select
                value={callForm.status}
                onChange={(e) => setCallForm({ ...callForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
              >
                <option value="connected">Connected</option>
                <option value="busy">Busy</option>
                <option value="missed">Missed / Unanswered</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Call Notes & Feedback
            </label>
            <textarea
              rows={3}
              placeholder="What was discussed..."
              value={callForm.remarks}
              onChange={(e) => setCallForm({ ...callForm, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsCallModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300"
            >
              Cancel
            </button>
            <button
              onClick={handleLogCall}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />} Save Call Log
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: SCHEDULE FOLLOW-UP */}
      <Modal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        title="Schedule New Follow-up"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Customer *
            </label>
            <select
              value={followUpForm.customerId}
              onChange={(e) => setFollowUpForm({ ...followUpForm, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.mobile})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={followUpForm.date}
                onChange={(e) => setFollowUpForm({ ...followUpForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                Time *
              </label>
              <input
                type="time"
                value={followUpForm.time}
                onChange={(e) => setFollowUpForm({ ...followUpForm, time: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Follow-up Purpose / Note
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Call regarding pricing proposal"
              value={followUpForm.remarks}
              onChange={(e) => setFollowUpForm({ ...followUpForm, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsFollowUpModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFollowUp}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />} Schedule
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: COMPLETE FOLLOW-UP WITH REMARK */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Mark Follow-up as Completed"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-dark-600 dark:text-dark-300">
            You are completing the follow-up for <strong>{selectedFollowUp?.customerName}</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Outcome / Completion Note
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Customer agreed to demo call on Friday"
              value={completeRemark}
              onChange={(e) => setCompleteRemark(e.target.value)}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsCompleteModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteFollowUp}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm Completed
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: SEND WHATSAPP */}
      <Modal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
        title="Send WhatsApp Template"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
              Customer *
            </label>
            <select
              value={waForm.customerId}
              onChange={(e) => setWaForm({ ...waForm, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.mobile || 'No mobile'})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
            Sending Meta-approved <strong>hello_world</strong> template to customer's registered WhatsApp number.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsWaModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSendWhatsApp}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send WhatsApp
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
