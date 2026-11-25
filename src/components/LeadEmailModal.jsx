import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Mail,
  Send,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  Building,
  AtSign,
  Copy,
  ExternalLink,
  Plus,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from './Toast';
import { useConfirm } from '../context/ConfirmContext';
import { getLeadEmails, sendLeadEmail, receiveLeadEmail, markEmailAsRead } from '../api/emails';

const EMAIL_TEMPLATES = [
  {
    id: 'follow-up',
    title: 'Follow-up Check-in',
    description: 'Polite inquiry follow-up regarding recent discussions',
    getSubject: (lead) => `Following up on your inquiry, ${lead.customerName || 'valued customer'}`,
    getBody: (lead) =>
      `Hi ${lead.customerName || 'there'},\n\n` +
      `Just checking in regarding our recent conversation about your interest in ${lead.interestedProduct || lead.customerId?.interestedProduct || 'Smart CRM'}.\n\n` +
      `Please let us know if you have any questions or if you would like us to arrange a brief product demo.\n\n` +
      `Best regards,\nSmartCRM Solutions Team`,
  },
  {
    id: 'welcome',
    title: 'Welcome & Introduction',
    description: 'Welcome notice and platform overview for new leads',
    getSubject: (lead) => `Welcome to SmartCRM Solutions, ${lead.customerName || ''}!`,
    getBody: (lead) =>
      `Dear ${lead.customerName || 'Customer'},\n\n` +
      `Thank you for reaching out to us. We are delighted to welcome you and excited to demonstrate how our platform streamlines customer engagement, cloud telephony, and pipeline growth.\n\n` +
      `Our team is assigned to support your evaluation every step of the way.\n\n` +
      `Best regards,\nSmartCRM Solutions Team`,
  },
  {
    id: 'offer',
    title: 'Exclusive Offer & Proposal',
    description: 'Special pricing proposal and feature discounts',
    getSubject: (lead) => `Exclusive Special Offer for ${lead.customerName || 'your business'} - SmartCRM`,
    getBody: (lead) =>
      `Dear ${lead.customerName || 'Customer'},\n\n` +
      `We have put together an exclusive package proposal tailored to your requirements.\n\n` +
      `This special pricing tier includes complimentary onboarding and dedicated account management. Reply directly to this email to activate this proposal.\n\n` +
      `Warm regards,\nSmartCRM Team`,
  },
  {
    id: 'quote',
    title: 'Quotation & Pricing Overview',
    description: 'Commercial quotation breakdown and product terms',
    getSubject: (lead) => `Commercial Quotation & Proposal for ${lead.customerName || 'Customer'}`,
    getBody: (lead) =>
      `Dear ${lead.customerName || 'Customer'},\n\n` +
      `Thank you for your interest in our solutions. As discussed, please find our commercial terms summarized below:\n\n` +
      `- Solution: ${lead.interestedProduct || lead.customerId?.interestedProduct || 'SmartCRM Enterprise'}\n` +
      `- User Licenses: Scalable multi-agent workspace\n` +
      `- Included: Automated email alerts, WhatsApp integration, and real-time CRM telephony\n\n` +
      `Please reply with your approval or any adjustments required.\n\n` +
      `Best regards,\nCommercial Accounts Team`,
  },
  {
    id: 'meeting',
    title: 'Meeting Consultation Request',
    description: 'Invitation to discuss next steps or schedule a demo',
    getSubject: (lead) => `Invitation: Solution Consultation with ${lead.customerName || 'Customer'}`,
    getBody: (lead) =>
      `Hi ${lead.customerName || 'there'},\n\n` +
      `We would love to schedule a quick 15-minute consultation to walk you through our features and answer any specific questions you have.\n\n` +
      `Could you let us know what time this week works best for your schedule?\n\n` +
      `Looking forward to connecting,\nSmartCRM Team`,
  },
  {
    id: 'status_update',
    title: 'Account Status Update',
    description: 'Informs lead of progress and latest status updates',
    getSubject: (lead) => `Status Update regarding your account inquiry`,
    getBody: (lead) =>
      `Dear ${lead.customerName || 'Customer'},\n\n` +
      `We wanted to let you know that your inquiry status in our system is currently "${lead.status || 'Active'}".\n\n` +
      `Our team is actively processing your details and will keep you informed of further milestones.\n\n` +
      `Sincerely,\nCustomer Relations Team`,
  },
  {
    id: 'custom',
    title: 'Custom Message',
    description: 'Compose a tailored email from scratch',
    getSubject: () => '',
    getBody: () => '',
  },
];

export default function LeadEmailModal({
  isOpen,
  lead,
  defaultTab = 'history',
  onClose,
  onEmailSent,
}) {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Active sub-tab: 'history' | 'compose' | 'receive'
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [directionFilter, setDirectionFilter] = useState('all'); // 'all' | 'incoming' | 'outgoing'
  const [searchQuery, setSearchQuery] = useState('');

  // Email logs state
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Compose form state
  const [selectedTemplateId, setSelectedTemplateId] = useState('follow-up');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  // Inbound simulation / manual log state
  const [inboundFrom, setInboundFrom] = useState('');
  const [inboundSubject, setInboundSubject] = useState('');
  const [inboundBody, setInboundBody] = useState('');
  const [receiving, setReceiving] = useState(false);

  // Normalize customer/lead email
  const leadEmail = useMemo(() => {
    if (!lead) return '';
    return (
      lead.customerId?.email ||
      lead.email ||
      lead.customerEmail ||
      ''
    );
  }, [lead]);

  // Load emails whenever modal opens or active lead changes
  const fetchEmails = useCallback(async () => {
    if (!lead?._id) return;
    setLoading(true);
    try {
      const data = await getLeadEmails(lead._id);
      setLogs(data.logs || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load email history', 'error');
    } finally {
      setLoading(false);
    }
  }, [lead, addToast]);

  useEffect(() => {
    if (isOpen && lead) {
      setActiveTab(defaultTab || 'history');
      setRecipientEmail(leadEmail);
      setInboundFrom(leadEmail);
      fetchEmails();

      // Apply initial template if compose tab
      const tmpl = EMAIL_TEMPLATES.find((t) => t.id === 'follow-up') || EMAIL_TEMPLATES[0];
      setSubject(tmpl.getSubject(lead));
      setBody(tmpl.getBody(lead));
    }
  }, [isOpen, lead, leadEmail, defaultTab, fetchEmails]);

  // Handle template selection change
  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    const tmpl = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;

    if (tmpl.id === 'custom') {
      setSubject('');
      setBody('');
    } else {
      setSubject(tmpl.getSubject(lead));
      setBody(tmpl.getBody(lead));
    }
  };

  // Dispatch outgoing email to lead
  const handleSendEmail = async (e) => {
    e?.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      addToast('A valid recipient email address is required', 'error');
      return;
    }
    if (!subject.trim()) {
      addToast('Email subject is required', 'error');
      return;
    }
    if (!body.trim()) {
      addToast('Email body content is required', 'error');
      return;
    }

    const ok = await confirm({
      title: 'Dispatch Email to Lead?',
      message: `Send this email directly to "${lead.customerName || 'Lead'}" at ${recipientEmail}? It will be delivered via the CRM relay.`,
      confirmText: 'Send Email',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    setSending(true);
    try {
      const payload = {
        leadId: lead._id,
        customerId: lead.customerId?._id || lead.customerId,
        type: selectedTemplateId || 'follow-up',
        subject: subject.trim(),
        body: body.trim(),
      };

      const res = await sendLeadEmail(payload);
      addToast('Email dispatched successfully to lead! (Delivery logged on CRM)', 'success');
      setLogs((prev) => [res.log, ...prev]);
      setActiveTab('history');
      onEmailSent?.();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to dispatch email to lead', 'error');
    } finally {
      setSending(false);
    }
  };

  // Log / simulate incoming email from lead on CRM system
  const handleReceiveEmail = async (e) => {
    e?.preventDefault();
    const fromAddr = inboundFrom.trim() || leadEmail;
    if (!fromAddr || !fromAddr.includes('@')) {
      addToast('A valid sender email address is required', 'error');
      return;
    }
    if (!inboundSubject.trim()) {
      addToast('Subject line is required for received email', 'error');
      return;
    }

    setReceiving(true);
    try {
      const payload = {
        leadId: lead._id,
        customerId: lead.customerId?._id || lead.customerId,
        from: fromAddr,
        subject: inboundSubject.trim(),
        body: inboundBody.trim() || 'No additional content provided.',
        receivedAt: new Date(),
      };

      const res = await receiveLeadEmail(payload);
      addToast(`Incoming email from lead registered successfully on CRM system!`, 'success');
      setLogs((prev) => [res.log, ...prev]);
      setInboundSubject('');
      setInboundBody('');
      setActiveTab('history');
      onEmailSent?.();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to log received email', 'error');
    } finally {
      setReceiving(false);
    }
  };

  // Mark received email as read
  const handleMarkRead = async (logId) => {
    try {
      await markEmailAsRead(logId);
      setLogs((prev) =>
        prev.map((l) => (l._id === logId ? { ...l, isRead: true } : l))
      );
    } catch {}
  };

  // Filter logs by direction and search query
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return logs.filter((log) => {
      const matchDir =
        directionFilter === 'all' ||
        (directionFilter === 'incoming' && log.direction === 'incoming') ||
        (directionFilter === 'outgoing' && log.direction !== 'incoming');

      const matchQuery =
        !q ||
        (log.subject || '').toLowerCase().includes(q) ||
        (log.body || '').toLowerCase().includes(q) ||
        (log.from || '').toLowerCase().includes(q) ||
        (log.to || '').toLowerCase().includes(q) ||
        (log.email || '').toLowerCase().includes(q);

      return matchDir && matchQuery;
    });
  }, [logs, directionFilter, searchQuery]);

  const receivedCount = useMemo(
    () => logs.filter((l) => l.direction === 'incoming').length,
    [logs]
  );
  const sentCount = useMemo(
    () => logs.filter((l) => l.direction !== 'incoming').length,
    [logs]
  );
  const unreadCount = useMemo(
    () => logs.filter((l) => l.direction === 'incoming' && !l.isRead).length,
    [logs]
  );

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-dark-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 bg-linear-to-r from-dark-50/80 via-white to-dark-50/80 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-primary-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Mail size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-dark-900 dark:text-white truncate">
                  {lead.customerName || 'Lead Communication Hub'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                  Lead: {lead.status || 'Active'}
                </span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 animate-pulse">
                    {unreadCount} New Received
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-dark-500 dark:text-dark-400 mt-1 flex-wrap">
                {leadEmail ? (
                  <span className="flex items-center gap-1 font-mono text-dark-700 dark:text-dark-200">
                    <AtSign size={12} className="text-primary-500" />
                    <span>{leadEmail}</span>
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    No email on file
                  </span>
                )}
                {lead.customerId?.company && (
                  <span className="flex items-center gap-1">
                    <Building size={12} />
                    <span>{lead.customerId.company}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-dark-400 hover:text-dark-600 hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="px-4 sm:px-5 border-b border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/40 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'history'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
              }`}
            >
              <Inbox size={14} />
              <span>Lead Email History</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-dark-200/80 dark:bg-dark-700 text-dark-700 dark:text-dark-300">
                {logs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'compose'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
              }`}
            >
              <Send size={14} />
              <span>Send Email to Lead</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('receive')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'receive'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
              }`}
              title="Log or simulate incoming email received from the lead on CRM system"
            >
              <ArrowDownLeft size={14} />
              <span>Receive / Ingest Inbound Email</span>
            </button>
          </div>

          {activeTab === 'history' && (
            <button
              type="button"
              onClick={fetchEmails}
              disabled={loading}
              className="p-1.5 rounded-lg text-dark-500 hover:text-primary-600 hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
              title="Refresh Emails"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* ================= TAB 1: LEAD EMAIL HISTORY ================= */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Filter and stats row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setDirectionFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      directionFilter === 'all'
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300 hover:bg-dark-200'
                    }`}
                  >
                    All ({logs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectionFilter('incoming')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                      directionFilter === 'incoming'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    <ArrowDownLeft size={12} />
                    <span>Received ({receivedCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectionFilter('outgoing')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                      directionFilter === 'outgoing'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100'
                    }`}
                  >
                    <ArrowUpRight size={12} />
                    <span>Sent ({sentCount})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subject or content..."
                    className="px-3 py-1.5 text-xs bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-lg text-dark-800 dark:text-dark-200 focus:outline-hidden focus:ring-1 focus:ring-primary-500 w-full sm:w-56"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveTab('compose')}
                    className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Send size={12} />
                    <span>Compose</span>
                  </button>
                </div>
              </div>

              {/* Emails List */}
              {loading ? (
                <div className="py-16 text-center text-dark-400">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2 text-primary-500" />
                  <p className="text-xs">Loading email communication logs...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-14 text-center rounded-2xl border border-dashed border-dark-200 dark:border-dark-700 p-8 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                    <Mail size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-dark-800 dark:text-dark-200">
                    No emails logged for this lead yet
                  </h4>
                  <p className="text-xs text-dark-500 max-w-md mx-auto">
                    Dispatch an email to this lead so they receive it in their inbox, or ingest an inbound email received from the lead on the CRM system.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('compose')}
                      className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send size={14} />
                      <span>Send First Email to Lead</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('receive')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ArrowDownLeft size={14} />
                      <span>Log Received Email</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLogs.map((log) => {
                    const isIncoming = log.direction === 'incoming';
                    const isExpanded = expandedLogId === log._id;
                    const dateFormatted = log.createdAt
                      ? new Date(log.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recently';

                    return (
                      <div
                        key={log._id}
                        className={`rounded-xl border transition-all ${
                          isIncoming
                            ? log.isRead
                              ? 'border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                              : 'border-emerald-400 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/30 ring-1 ring-emerald-400/30'
                            : 'border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800/80 hover:border-dark-300'
                        }`}
                      >
                        {/* Email Row Header */}
                        <div
                          onClick={() => {
                            setExpandedLogId(isExpanded ? null : log._id);
                            if (isIncoming && !log.isRead) {
                              handleMarkRead(log._id);
                            }
                          }}
                          className="p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isIncoming
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                              title={isIncoming ? 'Received Email from Lead' : 'Sent Email to Lead'}
                            >
                              {isIncoming ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    isIncoming
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                                  }`}
                                >
                                  {isIncoming ? 'Received from Lead' : 'Dispatched to Lead'}
                                </span>

                                <span className="text-[11px] font-mono text-dark-500 dark:text-dark-400">
                                  {isIncoming ? `From: ${log.from || log.email}` : `To: ${log.to || log.email}`}
                                </span>

                                {log.status === 'sent' && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-semibold">
                                    <Check size={11} /> Delivered
                                  </span>
                                )}
                                {log.status === 'failed' && (
                                  <span className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-0.5 font-semibold">
                                    <AlertCircle size={11} /> Failed
                                  </span>
                                )}
                              </div>

                              <h5 className="text-xs font-bold text-dark-900 dark:text-white mt-1 truncate">
                                {log.subject || 'No Subject'}
                              </h5>

                              {!isExpanded && (
                                <p className="text-[11px] text-dark-500 dark:text-dark-400 truncate mt-0.5">
                                  {log.bodySnippet || (log.body || '').slice(0, 120)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-right">
                            <span className="text-[10px] text-dark-400 whitespace-nowrap">
                              {dateFormatted}
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={14} className="text-dark-400" />
                            ) : (
                              <ChevronDown size={14} className="text-dark-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Email Body & Controls */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-dark-100 dark:border-dark-700/60 space-y-3">
                            <div className="p-3.5 rounded-lg bg-dark-50 dark:bg-dark-900/60 border border-dark-200/60 dark:border-dark-700/40 text-xs text-dark-800 dark:text-dark-200 whitespace-pre-wrap font-sans leading-relaxed">
                              {log.body || 'No text content in this email.'}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-dark-400 pt-1">
                              <div>
                                {log.sentByName && !isIncoming && (
                                  <span>Dispatched by: <strong className="text-dark-600 dark:text-dark-300">{log.sentByName}</strong></span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('compose');
                                  setSubject(
                                    log.subject?.startsWith('Re:')
                                      ? log.subject
                                      : `Re: ${log.subject || 'Inquiry'}`
                                  );
                                  setBody(
                                    `\n\n--- On ${dateFormatted}, ${isIncoming ? log.from : 'You'} wrote: ---\n` +
                                      (log.body || '')
                                  );
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-300 hover:bg-primary-100 font-semibold cursor-pointer text-xs"
                              >
                                <Send size={11} />
                                <span>Reply to Lead</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: COMPOSE & SEND EMAIL TO LEAD ================= */}
          {activeTab === 'compose' && (
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
                <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p>
                  Emails sent here are delivered directly to the lead via the configured CRM relay and logged permanently in the lead&apos;s communication timeline.
                </p>
              </div>

              {/* Template quick pills */}
              <div>
                <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1.5">
                  Select Email Template (Optional):
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {EMAIL_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleSelectTemplate(tmpl.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                            : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 border-dark-200 dark:border-dark-700 hover:border-primary-400'
                        }`}
                      >
                        {tmpl.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipient Email */}
              <div>
                <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                  Recipient Lead Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. client@example.com"
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-dark-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono"
                />
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject line..."
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-dark-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-semibold"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                  Message Content *
                </label>
                <textarea
                  rows={8}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email to the lead..."
                  className="w-full p-3 text-xs bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-dark-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary-500 leading-relaxed font-sans"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-dark-100 dark:border-dark-700/60">
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Dispatching Email...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Send Email to Lead</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================= TAB 3: RECEIVE / INGEST INBOUND EMAIL ================= */}
          {activeTab === 'receive' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 rounded-xl text-xs text-emerald-900 dark:text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <ArrowDownLeft size={16} className="text-emerald-600" />
                  <span>Receive Email on CRM System</span>
                </div>
                <p className="leading-relaxed">
                  Incoming replies from leads can be logged manually below or ingested automatically via webhook from your email provider (SendGrid, Mailgun, Postmark, or SMTP forwarder).
                </p>
                <div className="p-2.5 bg-white/80 dark:bg-dark-900/80 rounded-lg border border-emerald-200 dark:border-emerald-900/60 font-mono text-[11px] flex items-center justify-between">
                  <span className="truncate">Webhook Endpoint: <strong>POST /api/emails/inbound</strong></span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold ml-2">JSON / Form</span>
                </div>
              </div>

              <form onSubmit={handleReceiveEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Sender Email (From Lead) *
                  </label>
                  <input
                    type="email"
                    required
                    value={inboundFrom}
                    onChange={(e) => setInboundFrom(e.target.value)}
                    placeholder="e.g. client@example.com"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-dark-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Received Subject Line *
                  </label>
                  <input
                    type="text"
                    required
                    value={inboundSubject}
                    onChange={(e) => setInboundSubject(e.target.value)}
                    placeholder="e.g. Re: Commercial Quotation - Interested in proceeding"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-dark-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Email Content / Reply Body
                  </label>
                  <textarea
                    rows={6}
                    value={inboundBody}
                    onChange={(e) => setInboundBody(e.target.value)}
                    placeholder="Paste or write the email received from the lead..."
                    className="w-full p-3 text-xs bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-dark-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-dark-100 dark:border-dark-700/60">
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={receiving}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {receiving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Logging Received Email...</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft size={14} />
                        <span>Record Received Email on CRM</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
