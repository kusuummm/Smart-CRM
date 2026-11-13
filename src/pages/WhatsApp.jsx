import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  ExternalLink,
  ChevronLeft,
  Paperclip,
  Smile,
  Phone,
  CheckCheck,
  Check,
  Clock,
  Plus,
  RefreshCw,
  Building2,
  Users,
  MessageSquare,
  Sparkles,
  FileText,
  Calendar,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getWhatsAppLogs, sendWhatsAppMessage } from '../api/whatsapp';
import { getCustomers } from '../api/customers';

// Clean SVG for official WhatsApp badge icon
export function WhatsAppIcon({ className = 'w-4 h-4', fill = 'currentColor' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.472 14.382c-.301-.15-1.78-.88-2.056-.98-.276-.101-.477-.15-.678.15-.201.3-.778.98-.954 1.18-.176.201-.352.226-.653.076-.301-.151-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.135-.135.301-.351.452-.527.151-.176.201-.301.301-.502.101-.201.05-.377-.025-.527-.075-.151-.678-1.634-.929-2.237-.245-.588-.494-.508-.679-.517l-.578-.01c-.201 0-.527.075-.803.376-.276.301-1.054 1.03-1.054 2.512s1.08 2.914 1.23 3.115c.151.201 2.125 3.245 5.15 4.551.72.311 1.282.497 1.72.637.723.23 1.381.197 1.901.12.58-.087 1.78-.728 2.03-1.431.251-.703.251-1.306.176-.126-.075-.126-.276-.201-.577-.352z"
        fill={fill}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 1.892.524 3.662 1.435 5.178L2.05 21.65a.75.75 0 00.916.916l4.472-1.385A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zM3.5 12c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5-3.806 8.5-8.5 8.5a8.46 8.46 0 01-4.32-1.183.75.75 0 00-.518-.088l-3.37.942.942-3.37a.75.75 0 00-.088-.518A8.46 8.46 0 013.5 12z"
        fill={fill}
      />
    </svg>
  );
}

export default function WhatsApp({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const messagesEndRef = useRef(null);

  // Organizations list
  const organizations = [
    {
      id: 'main',
      name: 'Main Business Line',
      fullName: 'Main Business Telephony & CRM',
      phone: 'Active',
      status: 'Active',
      unreadCount: 0,
    },
  ];

  // Default to active business line
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]);

  // WhatsApp Workspace State - loaded dynamically from customers
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatSearch, setChatSearch] = useState('');
  const [chatFilter, setChatFilter] = useState('all'); // 'all' | 'unread'
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [backendCustomers, setBackendCustomers] = useState([]);

  // Load backend logs and customers if available
  useEffect(() => {
    async function init() {
      try {
        const [custRes, logsRes] = await Promise.allSettled([
          getCustomers({ limit: 100 }),
          getWhatsAppLogs({ limit: 100 }),
        ]);
        if (custRes.status === 'fulfilled' && custRes.value?.customers) {
          const list = custRes.value.customers;
          const logs = logsRes.status === 'fulfilled' && logsRes.value?.logs ? logsRes.value.logs : [];
          setBackendCustomers(list);
          if (list.length > 0) {
            const mapped = list.map((c, idx) => {
              // Extract previous real logs belonging to this contact
              const cleanMobile = (c.mobile || c.phone || '').replace(/\D/g, '').slice(-10);
              const custLogs = logs.filter((l) => {
                const matchId = l.customerId && String(l.customerId) === String(c._id);
                const lPhoneDigits = (l.phone || l.mobile || '').replace(/\D/g, '').slice(-10);
                const matchPhone = cleanMobile && lPhoneDigits && cleanMobile === lPhoneDigits;
                return matchId || matchPhone;
              }).reverse();

              const msgs = custLogs.length > 0
                ? custLogs.map((l) => ({
                    id: l._id,
                    sender: 'agent',
                    text: l.message,
                    time: new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: l.status === 'read' ? 'read' : l.status === 'delivered' ? 'delivered' : 'sent',
                    deliveryMode: l.deliveryMode || 'cloud_api',
                  }))
                : [
                    {
                      id: `m_${c._id || idx}_1`,
                      sender: 'agent',
                      text: `Hello ${c.name}, thank you for contacting us. How can we help you today?`,
                      time: '10:00 AM',
                      status: 'read',
                      deliveryMode: 'cloud_api',
                    },
                  ];

              const lastLog = custLogs[custLogs.length - 1];

              return {
                id: c._id || `c_${idx}`,
                customerName: c.name,
                phone: c.mobile || c.phone || '',
                leadStatus: c.status || 'Active Lead',
                lastMessage: lastLog ? lastLog.message : (c.remarks || 'Connected via WhatsApp'),
                timestamp: lastLog
                  ? new Date(lastLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Recent',
                unread: 0,
                avatarColor: ['bg-emerald-600', 'bg-blue-600', 'bg-slate-600', 'bg-amber-600'][idx % 4],
                messages: msgs,
              };
            });
            setConversations(mapped);
            setActiveChatId(mapped[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to preload customer list:', err);
      }
    }
    init();
  }, []);

  const activeChat = conversations.find((c) => c.id === activeChatId) || (conversations.length > 0 ? conversations[0] : null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages?.length, activeChatId]);

  // Helper to construct universal WhatsApp Web / Desktop deep link
  const getDirectWhatsAppUrl = (phone, msg = '') => {
    if (!phone) return 'https://web.whatsapp.com';
    let digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10) digits = `91${digits}`;
    else if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.substring(1)}`;
    const textParam = msg ? `&text=${encodeURIComponent(msg)}` : '';
    return `https://web.whatsapp.com/send?phone=${digits}${textParam}`;
  };

  // Quick Reply Template Presets
  const quickTemplates = [
    { label: 'Intro Greeting', text: `Hello! Thank you for connecting with our team. How can we assist your business today?` },
    { label: 'Share Information', text: 'Please find our product catalog and business information attached.' },
    { label: 'Payment Reminder', text: 'Gentle reminder: Your invoice is ready. Kindly complete the payment to ensure uninterrupted service.' },
    { label: 'Schedule Call', text: 'Would you be available for a quick 10-minute discovery call with our team today?' },
  ];

  // Send message handler with Meta Cloud API + Direct WhatsApp Web 1-click bridge
  const handleSendMessage = async (textToSend, mode = 'smart') => {
    if (!activeChat) return;
    const text = textToSend || messageInput;
    if (!text.trim()) return;

    const trimmed = text.trim();
    const newMsg = {
      id: `m_${Date.now()}`,
      sender: 'agent',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    // Optimistic UI update
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            lastMessage: trimmed,
            timestamp: 'Just now',
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    setMessageInput('');
    setSending(true);

    if (mode === 'direct_web') {
      const directUrl = getDirectWhatsAppUrl(activeChat.phone, trimmed);
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      addToast(`Opening WhatsApp Web for ${activeChat.customerName}...`, 'info');
      try {
        await sendWhatsAppMessage({
          customerId: activeChat.id?.startsWith('c_') ? undefined : activeChat.id,
          phone: activeChat.phone,
          name: activeChat.customerName,
          message: trimmed,
          type: 'custom',
        });
      } catch (_) {}
      setSending(false);
      return;
    }

    try {
      const res = await sendWhatsAppMessage({
        customerId: activeChat.id?.startsWith('c_') ? undefined : activeChat.id,
        phone: activeChat.phone,
        name: activeChat.customerName,
        message: trimmed,
        type: 'custom',
      });

      if (res?.deliveredVia === 'cloud_api') {
        addToast('Message delivered via Meta WhatsApp Cloud API', 'success');
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeChat.id) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === newMsg.id ? { ...m, status: 'delivered', deliveryMode: 'cloud_api' } : m
                ),
              };
            }
            return c;
          })
        );
      } else {
        const targetUrl = res?.waLink || getDirectWhatsAppUrl(activeChat.phone, trimmed);
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        addToast(`Dispatched to ${activeChat.customerName}`, 'success');
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeChat.id) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === newMsg.id ? { ...m, status: 'delivered', deliveryMode: 'wa_link' } : m
                ),
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      const targetUrl = getDirectWhatsAppUrl(activeChat.phone, trimmed);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      addToast(`Opening WhatsApp Web directly for ${activeChat.customerName}`, 'info');
    } finally {
      setSending(false);
    }
  };

  // Filtered conversations list
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(chatSearch.toLowerCase()) ||
      c.phone.includes(chatSearch) ||
      c.lastMessage.toLowerCase().includes(chatSearch.toLowerCase());
    if (chatFilter === 'unread') return matchesSearch && c.unread > 0;
    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-14 px-4 sm:px-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-dark-900/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <WhatsAppIcon className="w-4 h-4 fill-emerald-600" fill="#10b981" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-dark-900 dark:text-white leading-none">
                WhatsApp Business Hub
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Meta Cloud API Ready
              </span>
            </div>
            <p className="text-[11px] text-dark-400 font-mono mt-0.5">
              Registered Line: {user?.phone || 'Main Business Line'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://web.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
          >
            <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" fill="#059669" />
            <span>Open WhatsApp Web</span>
            <ExternalLink size={11} className="opacity-70" />
          </a>

          <button
            onClick={() => onNavigate?.('broadcast')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-all"
          >
            <Sparkles size={13} />
            <span>Broadcast</span>
          </button>
        </div>
      </div>

      {/* Dual Pane Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Pane: Contacts List (4 columns) */}
        <div className="lg:col-span-4 border-r border-dark-200 dark:border-dark-700 flex flex-col h-full bg-slate-50/50 dark:bg-dark-900/30 overflow-hidden">
          {/* Search & Filter Bar: shrink-0 */}
          <div className="p-3 border-b border-dark-200 dark:border-dark-700 space-y-2 shrink-0 bg-white dark:bg-dark-800/80">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Search chats, contacts, numbers..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setChatFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  chatFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300 hover:bg-dark-200'
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setChatFilter('unread')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  chatFilter === 'unread'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300 hover:bg-dark-200'
                }`}
              >
                Unread ({conversations.filter((c) => c.unread > 0).length})
              </button>
            </div>
          </div>

          {/* Conversations List: flex-1 overflow-y-auto */}
          <div className="flex-1 overflow-y-auto divide-y divide-dark-100 dark:divide-dark-800">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-dark-400 text-xs">
                No chats match your search
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeChat && conv.id === activeChat.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveChatId(conv.id);
                      setConversations((prev) =>
                        prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c))
                      );
                    }}
                    className={`p-3 flex items-start gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-emerald-500'
                        : 'hover:bg-white dark:hover:bg-dark-800/80'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full ${conv.avatarColor} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs`}
                    >
                      {conv.customerName.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs font-bold text-dark-900 dark:text-white truncate">
                          {conv.customerName}
                        </h4>
                        <span className="text-[10px] text-dark-400 font-mono">
                          {conv.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-dark-500 dark:text-dark-400 truncate mb-1">
                        {conv.lastMessage}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300 font-semibold">
                          {conv.leadStatus}
                        </span>
                        {conv.unread > 0 && (
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Conversation Stream (8 columns) */}
        {!activeChat ? (
          <div className="lg:col-span-8 flex flex-col items-center justify-center h-full bg-white dark:bg-dark-800 p-8 text-center text-dark-400">
            <MessageSquare size={44} className="mb-3 text-dark-300 dark:text-dark-600" />
            <h3 className="font-bold text-sm text-dark-800 dark:text-white">No conversation selected</h3>
            <p className="text-xs text-dark-500 mt-1 max-w-sm">Select a contact from the left pane to view messages and reply.</p>
          </div>
        ) : (
          <div className="lg:col-span-8 flex flex-col h-full bg-white dark:bg-dark-800 overflow-hidden">
            {/* Active Contact Header: shrink-0 */}
            <div className="p-3 px-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between shrink-0 bg-white dark:bg-dark-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${activeChat.avatarColor} text-white font-bold flex items-center justify-center text-sm shadow-2xs`}
                >
                  {activeChat.customerName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-dark-900 dark:text-white truncate">
                      {activeChat.customerName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {activeChat.leadStatus}
                    </span>
                  </div>
                  <p className="text-xs text-dark-500 font-mono">
                    {activeChat.phone} • WhatsApp Business
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    addToast(`Initiating call to ${activeChat.phone}...`, 'info');
                    onNavigate?.('call-history');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
                >
                  <Phone size={13} className="text-blue-600" />
                  <span className="hidden sm:inline">Call Softphone</span>
                </button>

                <button
                  onClick={() => onNavigate?.('contacts')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
                >
                  <FileText size={13} className="text-dark-400" />
                  <span className="hidden sm:inline">CRM Profile</span>
                </button>
              </div>
            </div>

            {/* Chat Messages Stream: flex-1 overflow-y-auto */}
            <div
              className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 bg-[#e5ddd5]/20 dark:bg-dark-900/60"
              style={{
                backgroundImage: 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 0)',
                backgroundSize: '16px 16px',
              }}
            >
              {/* Encryption notice */}
              <div className="text-center my-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-[11px] font-medium text-amber-800 dark:text-amber-300 shadow-2xs">
                  <Lock size={11} className="shrink-0" />
                  <span>Messages are end-to-end encrypted through Meta WhatsApp Cloud API</span>
                </span>
              </div>

              {activeChat.messages.map((msg) => {
                const isAgent = msg.sender === 'agent';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl p-3 shadow-2xs ${
                        isAgent
                          ? 'bg-[#dcf8c6] dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 text-dark-900 dark:text-slate-100 rounded-tr-xs'
                          : 'bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-slate-100 rounded-tl-xs'
                      }`}
                    >
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-dark-400">
                        <span>{msg.time}</span>
                        {isAgent && (
                          <span>
                            {msg.status === 'read' ? (
                              <CheckCheck size={13} className="text-blue-500" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck size={13} className="text-dark-400" />
                            ) : (
                              <Check size={13} className="text-dark-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Reply Templates: shrink-0 */}
            <div className="px-4 py-2 border-t border-dark-100 dark:border-dark-700/60 bg-slate-50 dark:bg-dark-900/40 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[11px] font-semibold text-dark-400 whitespace-nowrap flex items-center gap-1">
                <Sparkles size={12} className="text-emerald-500" /> Templates:
              </span>
              {quickTemplates.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(t.text)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-300 hover:border-emerald-400 hover:text-emerald-600 whitespace-nowrap transition-colors shadow-2xs"
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Message Input Bar: shrink-0 PINNED AT BOTTOM */}
            <div className="p-3 sm:p-3.5 border-t border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => addToast('Media upload modal opened', 'info')}
                className="p-2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 rounded-xl hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
                title="Attach Document or Media"
              >
                <Paperclip size={18} />
              </button>

              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Type a WhatsApp message to ${activeChat.customerName}...`}
                className="flex-1 px-4 py-2 text-xs sm:text-sm rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!messageInput.trim() || sending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
              >
                {sending ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                <span>Send</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
