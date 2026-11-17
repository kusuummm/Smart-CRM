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
  AlertTriangle,
  Lock,
  X,
  Eye,
  CheckCircle2,
  Copy,
  Smartphone,
  Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import {
  getWhatsAppLogs,
  sendWhatsAppMessage,
  getWhatsAppConfig,
  getWhatsAppTemplates,
  createWhatsAppTemplate,
} from '../api/whatsapp';
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
  const [sendingMode, setSendingMode] = useState('real_whatsapp'); // 'real_whatsapp' | 'cloud_api'
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [backendCustomers, setBackendCustomers] = useState([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [liveTemplates, setLiveTemplates] = useState([]);
  const [selectedTemplateForPreview, setSelectedTemplateForPreview] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    category: 'MARKETING',
    bodyText: '',
    hasImage: true,
  });
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Load backend logs, customers, configuration, and templates
  useEffect(() => {
    async function init() {
      try {
        const [custRes, logsRes, cfgRes, tplRes] = await Promise.allSettled([
          getCustomers({ limit: 100 }),
          getWhatsAppLogs({ limit: 100 }),
          getWhatsAppConfig(),
          getWhatsAppTemplates(),
        ]);
        if (cfgRes.status === 'fulfilled' && cfgRes.value) {
          setIsConfigured(Boolean(cfgRes.value.isConfigured));
        }
        if (tplRes.status === 'fulfilled' && tplRes.value?.templates) {
          setLiveTemplates(tplRes.value.templates);
        }
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

              const msgs = custLogs.map((l) => ({
                id: l._id,
                sender: 'agent',
                text: l.message,
                time: new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: l.status === 'read' ? 'read' : (l.status === 'delivered' || l.deliveryMode === 'wa_web' || l.deliveryMode === 'real_whatsapp') ? 'delivered' : l.status === 'failed' ? 'failed' : 'sent',
                deliveryMode: l.deliveryMode || 'cloud_api',
                errorMsg: l.error || '',
                is24hClosed: Boolean(String(l.error || '').includes('131047')),
              }));

              const lastLog = custLogs[custLogs.length - 1];

              return {
                id: c._id || `c_${idx}`,
                customerName: c.name,
                phone: c.mobile || c.phone || '',
                leadStatus: c.status || 'Active Lead',
                lastMessage: lastLog ? lastLog.message : 'No conversation yet',
                timestamp: lastLog
                  ? new Date(lastLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '',
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

  // Background poll to sync live message delivery statuses (sent -> delivered -> read)
  useEffect(() => {
    const STATUS_RANK = { failed: 0, queued: 1, logged: 2, sent: 3, delivered: 4, read: 5 };
    const interval = setInterval(async () => {
      try {
        const logsRes = await getWhatsAppLogs({ limit: 50 });
        if (logsRes?.logs && logsRes.logs.length > 0) {
          const freshLogs = logsRes.logs;
          setConversations((prev) =>
            prev.map((conv) => {
              const cleanMobile = (conv.phone || '').replace(/\D/g, '').slice(-10);
              const updatedMessages = conv.messages.map((m) => {
                const matchedLog = freshLogs.find(
                  (l) =>
                    (m.id && String(l._id) === String(m.id)) ||
                    (l.message === m.text && cleanMobile && String(l.phone || '').includes(cleanMobile))
                );
                if (matchedLog && matchedLog.status) {
                  const targetStatus =
                    matchedLog.deliveryMode === 'wa_web' || matchedLog.deliveryMode === 'real_whatsapp'
                      ? 'delivered'
                      : matchedLog.status;
                  const currentRank = STATUS_RANK[m.status] || 2;
                  const newRank = STATUS_RANK[targetStatus] || 2;

                  // Progression rule: status only moves forward (sent -> delivered -> read).
                  // NEVER downgrade a double-tick (delivered) message back to single-tick (sent)!
                  if (newRank > currentRank) {
                    return {
                      ...m,
                      id: matchedLog._id || m.id,
                      status: targetStatus,
                      deliveryMode: matchedLog.deliveryMode || m.deliveryMode,
                      errorMsg: matchedLog.error || m.errorMsg,
                    };
                  }
                }
                return m;
              });
              return { ...conv, messages: updatedMessages };
            })
          );
        }
      } catch (_) {}
    }, 10000);

    return () => clearInterval(interval);
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

  // Official Approved PeYug Meta Templates & Quick Presets (100% Exact Meta Text)
  const quickTemplates = [
    {
      label: 'Welcome to PeYug (Official)',
      templateName: 'welcome_to_peyug',
      category: 'MARKETING',
      hasImage: true,
      text: `Welcome to PeYug – The New Era of Payment!\n\nहमारी Sales Team से जुड़ने के लिए धन्यवाद।\nअब आप Peyug के साथ सुरक्षित और आसान डिजिटल पेमेंट का अनुभव ले सकते हैं।\n\n📲 Peyug App डाउनलोड करें:\nAndroid 👉 https://play.google.com/store/apps/details?id=com.safesoftware.passbook.jinl \niOS 👉 https://apps.apple.com/in/app/peyug/id6753785405 \n\nलिखे ; https://peyug.in/contact \nE-mail: contact@peyug.in \n\nकिसी भी सहायता के लिए हम हमेशा आपके साथ हैं।\n— Team PeYug`,
      buttons: [{ text: 'https://www.peyug.in', url: 'https://www.peyug.in/' }],
    },
    {
      label: 'मिस्ड कॉल / फॉलो-अप (Hindi)',
      templateName: 'peyug_missed_call_h_v1',
      category: 'MARKETING',
      hasImage: true,
      text: `नमस्ते 🙏\nआपका कॉल प्राप्त हुआ।\nPeYug से जुड़ने के लिए धन्यवाद।\nहमारी टीम जल्द ही आपसे संपर्क करेगी।\n\n📌 हमारी सेवाएं:\n✔ डेली डिपॉज़िट\n✔ इमरजेंसी लोन, डिपॉज़िट लोन\n✔ सुरक्षित डिजिटल भुगतान\n\nअधिक जानकारी के लिए WhatsApp पर "Hi" लिखें।\n\n🎥 PeYug वीडियो: https://www.youtube.com/shorts/SyFXZpIh6jY\n🌐 वेबसाइट: https://peyug.in/`,
    },
    {
      label: 'PeYug परिवार Welcome',
      templateName: 'peyug_family_welcome_h_v1',
      category: 'MARKETING',
      hasImage: true,
      text: `🎉 PeYug परिवार में आपका स्वागत है।\n\nअब आप:\n✅ डेली बचत कर सकते हैं\n✅ इमरजेंसी लोन सहायता पा सकते हैं\n✅ घर बैठे डिजिटल कलेक्शन कर सकते हैं\n\nहमारा लक्ष्य: “हर व्यक्ति को आर्थिक रूप से मज़बूत बनाना।” 💙\n\n🎥 PeYug वीडियो: https://www.youtube.com/shorts/SyFXZpIh6jY\n🌐 वेबसाइट: https://peyug.in/`,
    },
    {
      label: 'डेली डिपॉज़िट सेवा',
      templateName: 'peyug_daily_deposit_h_v1',
      category: 'MARKETING',
      hasImage: true,
      text: `💰 डेली डिपॉज़िट सेवा\n\nआप कितना डिपॉज़िट शुरू करना चाहते हैं?\n\n🔘 ₹100 प्रतिदिन\n🔘 ₹200 प्रतिदिन\n🔘 ₹500 प्रतिदिन\n🔘 अपनी मर्ज़ी की राशि\n\nआज ही अपनी बचत शुरू करें और अपने सपनों को पूरा करें। 🙏\n\n🎥 PeYug वीडियो: https://www.youtube.com/shorts/SyFXZpIh6jY\n🌐 वेबसाइट: https://peyug.in/`,
    },
    {
      label: 'इमरजेंसी लोन सहायता',
      templateName: 'peyug_emergency_loan_h_v1',
      category: 'MARKETING',
      hasImage: true,
      text: `⚡ इमरजेंसी लोन सहायता\n\nकृपया अपनी आवश्यकता चुनें:\n\n🔘 पर्सनल लोन\n🔘 बिजनेस लोन\n🔘 मेडिकल इमरजेंसी\n🔘 शिक्षा की जरूरत\n\nहमारी टीम आपको जल्द से जल्द सहायता प्रदान करेगी। 💙\n\n🎥 PeYug वीडियो: https://www.youtube.com/shorts/SyFXZpIh6jY\n🌐 वेबसाइट: https://peyug.in/`,
    },
    {
      label: 'EMI / भुगतान रिमाइंडर',
      templateName: 'peyug_emi_reminder_h_v1',
      category: 'MARKETING',
      hasImage: true,
      text: `🙏 नमस्ते,\nआपकी ईएमआई / भुगतान की डीउ डेट पास है।\n\nकृपया समय पर भुगतान करके अपना रिकॉर्ड अच्छा बनाए रखें।\n\nकिसी सहायता के लिए Reply करें।\n\n🎥 PeYug वीडियो: https://www.youtube.com/shorts/SyFXZpIh6jY\n🌐 वेबसाइट: https://peyug.in/`,
    },
    {
      label: 'Account Activate (START)',
      templateName: 'peyug_account_activate_h_v1',
      category: 'MARKETING',
      hasImage: true,
      text: `🚀 आपका अकाउंट अभी तक सक्रिय नहीं हुआ है।\n\nआज ही शुरुआत करें और पाएं:\n✅ आसान जमा सुविधा\n✅ इमरजेंसी सहायता\n✅ डिजिटल भुगतान सुविधा\n\nReply करें: "START"\n\n🎥 PeYug वीडियो: https://www.youtube.com/shorts/SyFXZpIh6jY\n🌐 वेबसाइट: https://peyug.in/`,
    },
    {
      label: 'सुरक्षा & विश्वास',
      templateName: 'peyug_security_trust_h_v1',
      category: 'MARKETING',
      hasImage: true,
      text: `🔐 आपका पैसा, आपकी सुरक्षा।\n\nPeYug में:\n✔ सुरक्षित ट्रांजेक्शन\n✔ डिजिटल रिकॉर्ड\n✔ आसान भुगतान\n✔ तेज़ सपोर्ट\n\nविश्वास ही हमारी सबसे बड़ी ताकत है। 🙏\n\n🎥 PeYug वीडियो: https://www.youtube.com/shorts/SyFXZpIh6jY\n🌐 वेबसाइट: https://peyug.in/`,
    },
    {
      label: 'PeYug Refer & Earn',
      templateName: 'peyug_about',
      category: 'MARKETING',
      hasImage: false,
      text: `⭐ REFER करें • EARN करें\nPeYug - The New Era of Payment  ( UPI app )के साथ Extra Income कमाएँ!\n⿡ हर रेफ़रल पर ₹100 Cashback\n\nबस PeYug अकाउंट बनाएँ → लिंक शेयर करें →\nहर सफल रेफ़रल पर तुरंत ₹100 कमाएँ!\n\n⿢ 1% Monthly Cashback (Average Balance)\n\nजिस यूज़र को आप refer करें,\nवह जितना Average Balance रखेगा,\nउसका 1% हर महीने आपको Cashback मिलेगा!\n\n⿣ FD / RD / Daily Deposit पर 2% तक Cashback\nReferred user जितना deposit करेगा,\nआपको 2% तक  cashback !  \n\n"आज ही डाउनलोड करें"  \nAndroid  : https://play.google.com/store/apps/detailsid=com.safesoftware.passbook.jinl&hl=en_IN \nIOS ; https://apps.apple.com/in/app/peyug/id6753785405`,
    },
    {
      label: 'PeYug UPI Launch',
      templateName: 'peyug_anouncement_upi_',
      category: 'MARKETING',
      hasImage: false,
      text: `We are proud to introduce\n\nPeYug The New Era of Payment\n\nBuilt with innovation, trust and technology, PeYug is designed to deliver a secure, seamless and smarter digital payment experience for everyone.\n\nFrom instant UPI transactions to advanced security layers, PeYug represents our commitment to empowering India's digital future. A step forward in convenience. A leap forward in financial technology.\n\nOur vision is simple: To make digital payments more accessible, more rellable, and more powerful.\n\nJoin us as we begin this exciting journey.\n\nPeYug - The New Era of Payment\n\nDownload : PeYug ( UPI App)  \nIOS: https://apps.apple.com/in/app/peyug/id6753785405  ,\nAndroid : https://play.google.com/store/apps/details?id=com.safesoftware.passbook.jinl&hl=en_IN`,
    },
    {
      label: 'बचत करना हुआ आसान',
      templateName: 'peyug_saving_h_v1',
      category: 'MARKETING',
      hasImage: true,
      text: `💰 अब पैसे बचत करना हुआ और आसान!\nPeYug App के साथ पाएँ:\n\n✅ डेली डिपॉज़िट सुविधा\n✅ इमरजेंसी लोन सहायता\n✅ सुरक्षित डिजिटल ट्रांजेक्शन\n✅ आसान और भरोसेमंद सेवा\n\nआज ही जुड़ें और अपने भविष्य को सुरक्षित बनाएं। 🚀\n\n📲 अधिक जानकारी के लिए अभी Reply करें — "START"\n\n🎥 PeYug वीडियो: https://www.youtube.com/shorts/SyFXZpIh6jY\n🌐 वेबसाइट: https://peyug.in/`,
    },
    {
      label: 'Lead Capture (Hindi)',
      templateName: 'peyug_lead_capture_h_v1',
      category: 'MARKETING',
      hasImage: true,
      text: `नमस्ते 🙏\nPeYug में आपका स्वागत है।\nकृपया नीचे दी गई जानकारी भेजें:\n\n1️⃣ आपका नाम\n2️⃣ शहर का नाम\n3️⃣ आपका व्यवसाय / काम\n4️⃣ आपको किस सेवा की आवश्यकता है?\n\n✔ डेली डिपॉज़िट ✔ लोन ✔ QR पेमेंट ✔ बिजनेस कलेक्शन\n\nहमारी टीम तुरंत आपकी सहायता करेगी।\n\n🎥 PeYug वीडियो: https://www.youtube.com/shorts/SyFXZpIh6jY\n🌐 वेबसाइट: https://peyug.in/`,
    },
    {
      label: 'PeYug Menu Flow',
      templateName: 'peyug_flow_welcome_h_v1',
      category: 'MARKETING',
      hasImage: true,
      text: `🙏 नमस्ते, PeYug में आपका स्वागत है।\nहम आपके पैसों को सुरक्षित और आसान तरीके से मैनेज करने में मदद करते हैं।\n\nकृपया नीचे एक विकल्प चुनें 👇\n\n1️⃣ डेली डिपॉज़िट\n2️⃣ इमरजेंसी लोन\n3️⃣ QR पेमेंट सेवा\n4️⃣ रेफरल\n5️⃣ ग्राहक सहायता\n\n🎥 PeYug वीडियो: https://www.youtube.com/shorts/SyFXZpIh6jY\n🌐 वेबसाइट: https://peyug.in/`,
    },
    {
      label: 'Missed Call Follow-up (v2)',
      templateName: 'peyug_missed_call_v2',
      category: 'MARKETING',
      hasImage: true,
      text: `नमस्ते 🙏\nआपका कॉल प्राप्त हुआ।\n\nPeYug से जुड़ने के लिए धन्यवाद।\nहमारी टीम जल्द ही आपसे संपर्क करेगी।\n\n📌 सेवाएं:\n✔ Daily Deposit\n✔ Emergency Loan, Deposit Loan\n✔ सुरक्षित डिजिटल भुगतान\n\nअधिक जानकारी के लिए WhatsApp पर "Hi" लिखें।\n\n🎥 PeYug Video: https://youtu.be/peyug_intro`,
    },
  ];

  const allTemplates = liveTemplates.length > 0 ? liveTemplates : quickTemplates;

  // Send message handler with Meta Cloud API + Direct WhatsApp Web 1-click bridge
  const handleSendMessage = async (textToSend, mode = 'smart', templateName = null) => {
    if (!activeChat) return;
    const text = textToSend || messageInput;
    if (!text.trim()) return;

    const trimmed = text.trim();
    const isRealMode = mode === 'direct_web' || mode === 'real_whatsapp' || (mode === 'smart' && sendingMode === 'real_whatsapp') || (!mode && sendingMode === 'real_whatsapp');

    const newMsg = {
      id: `m_${Date.now()}`,
      sender: 'agent',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: isRealMode ? 'delivered' : 'sent',
      deliveryMode: isRealMode ? 'wa_web' : 'cloud_api',
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

    if (isRealMode) {
      const directUrl = getDirectWhatsAppUrl(activeChat.phone, trimmed);
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      addToast(`Message opened in Real WhatsApp & recorded as delivered to ${activeChat.customerName} ✓✓`, 'success');
      try {
        await sendWhatsAppMessage({
          customerId: activeChat.id?.startsWith('c_') ? undefined : activeChat.id,
          phone: activeChat.phone,
          name: activeChat.customerName,
          message: trimmed,
          templateName: templateName || undefined,
          type: templateName ? 'template' : 'custom',
          mode: 'wa_web',
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
        templateName: templateName || undefined,
        type: templateName ? 'template' : 'custom',
      });

      if (res?.success && (res?.isCloudApi || res?.deliveredVia === 'cloud_api')) {
        addToast(`Message dispatched to WhatsApp network ✓ (Waiting for delivery to recipient phone)`, 'success');
        const deliveredBody = res?.message || trimmed;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeChat.id) {
              return {
                ...c,
                lastMessage: deliveredBody,
                messages: c.messages.map((m) =>
                  m.id === newMsg.id
                    ? { ...m, text: deliveredBody, status: 'sent', deliveryMode: 'cloud_api' }
                    : m
                ),
              };
            }
            return c;
          })
        );
      } else {
        const is24h = Boolean(res?.is24hWindowClosed || String(res?.error || '').includes('131047'));
        const failNotice = is24h
          ? 'Customer 24h window closed (Meta #131047). Click "Send via Real WhatsApp" to deliver to customer instantly without template restrictions.'
          : (res?.error || res?.warning || `Could not deliver message to ${activeChat.customerName}`);

        addToast(failNotice, is24h ? 'warning' : 'error');

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeChat.id) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === newMsg.id
                    ? {
                        ...m,
                        status: 'failed',
                        is24hClosed: is24h,
                        errorMsg: failNotice,
                        waLink: res?.waLink || getDirectWhatsAppUrl(activeChat.phone, trimmed),
                      }
                    : m
                ),
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to dispatch WhatsApp message', 'error');
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeChat.id) {
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === newMsg.id ? { ...m, status: 'failed' } : m
              ),
            };
          }
          return c;
        })
      );
    } finally {
      setSending(false);
    }
  };

  // Filtered conversations list
  const isMixedContent =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    String(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').includes('localhost');

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
                WhatsApp Business & Web Hub
              </h2>
              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 transition-colors shadow-2xs cursor-pointer"
                title="Click to view Real WhatsApp Web status and setup"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Real WhatsApp Ready</span>
              </button>
            </div>
            <p className="text-[11px] text-dark-500 font-mono mt-0.5">
              Registered Line: +91 70657 47747 (PeYug Business) • Real WhatsApp Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 transition-all shadow-2xs cursor-pointer"
            title="Connect your phone's real WhatsApp or view guide"
          >
            <Smartphone size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>Link Phone</span>
          </button>

          <a
            href="https://web.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all"
            title="Open WhatsApp Web in a separate tab"
          >
            <WhatsAppIcon className="w-3.5 h-3.5 fill-white" fill="#ffffff" />
            <span>Open WhatsApp Web</span>
            <ExternalLink size={11} className="opacity-80" />
          </a>

          <button
            onClick={() => onNavigate?.('broadcast')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-all"
          >
            <Sparkles size={13} />
            <span>Broadcast</span>
          </button>
        </div>
      </div>

      {/* Mixed Content Alert Banner if accessed via HTTPS with localhost backend */}
      {isMixedContent && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>
              <strong>Render HTTPS Notice:</strong> Browser security blocks direct HTTP calls from HTTPS Render. To send via Meta Cloud API directly, open <strong><a href="http://localhost:3000/whatsapp" className="underline font-bold text-emerald-700 dark:text-emerald-400">http://localhost:3000/whatsapp</a></strong> or click <strong>Open Web</strong>.
            </span>
          </div>
          <button
            onClick={() => window.open('http://localhost:3000/whatsapp', '_blank')}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0"
          >
            Open Local CRM
          </button>
        </div>
      )}

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
                <a
                  href={getDirectWhatsAppUrl(activeChat.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs"
                  title="Open real 1-to-1 chat with customer in WhatsApp Web"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" fill="#059669" />
                  <span className="hidden sm:inline">Real WhatsApp</span>
                  <ExternalLink size={10} className="opacity-70" />
                </a>

                <button
                  onClick={() => {
                    addToast(`Initiating call to ${activeChat.phone}...`, 'info');
                    onNavigate?.('call-history');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
                >
                  <Phone size={13} className="text-blue-600" />
                  <span className="hidden sm:inline">Call</span>
                </button>

                <button
                  onClick={() => onNavigate?.('contacts')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
                >
                  <FileText size={13} className="text-dark-400" />
                  <span className="hidden sm:inline">Profile</span>
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
              {/* Channel Mode Switcher: Real WhatsApp vs Meta Cloud API */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-1.5 rounded-xl border text-[11px] font-medium shadow-2xs bg-white/95 dark:bg-dark-800/95 border-dark-200 dark:border-dark-700 my-1">
                <div className="flex items-center gap-1 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSendingMode('real_whatsapp')}
                    className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      sendingMode === 'real_whatsapp'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    <WhatsAppIcon className={`w-3.5 h-3.5 ${sendingMode === 'real_whatsapp' ? 'fill-white' : 'fill-emerald-600'}`} fill={sendingMode === 'real_whatsapp' ? '#ffffff' : '#059669'} />
                    <span>Real WhatsApp (Direct)</span>
                    <span className="text-[9px] bg-emerald-500/30 text-white px-1 rounded font-mono">✓✓ Real</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendingMode('cloud_api')}
                    className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      sendingMode === 'cloud_api'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    <Lock size={12} />
                    <span>Meta Cloud API</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-dark-500 dark:text-dark-400">
                  <span className="inline-flex items-center gap-1" title="Single grey check: Sent to WhatsApp network">
                    <Check size={11} className="text-dark-400" /> Sent (✓)
                  </span>
                  <span className="inline-flex items-center gap-1" title="Double grey check: Delivered to recipient phone">
                    <CheckCheck size={11} className="text-dark-400" /> Delivered (✓✓)
                  </span>
                  <span className="inline-flex items-center gap-1" title="Blue double check: Read by customer">
                    <CheckCheck size={11} className="text-blue-500" /> Read (✓✓)
                  </span>
                </div>
              </div>

              {activeChat.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-2xs">
                    <MessageSquare size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-dark-800 dark:text-white">
                    Start conversation with {activeChat.customerName}
                  </h4>
                  <p className="text-xs text-dark-500 dark:text-dark-400 max-w-sm mt-1">
                    Select an approved PeYug template below or type a message. If the customer hasn't messaged in the last 24 hours, send an approved template or use WhatsApp Web.
                  </p>
                </div>
              )}

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
                      {msg.status === 'failed' && msg.is24hClosed && (
                        <div className="mt-1.5 p-1.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] text-amber-800 dark:text-amber-300">
                          <span>24h window closed by Meta. Deliver instantly via Real WhatsApp:</span>
                          <button
                            type="button"
                            onClick={() => handleSendMessage(msg.text, 'direct_web')}
                            className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer shadow-2xs"
                          >
                            <WhatsAppIcon className="w-3 h-3 fill-white" fill="#ffffff" />
                            <span>Send via Real WhatsApp (✓✓)</span>
                          </button>
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-dark-400">
                        {isAgent && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              msg.deliveryMode === 'wa_web' || msg.deliveryMode === 'real_whatsapp'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300/60'
                            }`}
                          >
                            {msg.deliveryMode === 'wa_web' || msg.deliveryMode === 'real_whatsapp' ? 'Real WhatsApp' : 'Cloud API'}
                          </span>
                        )}
                        <span>{msg.time}</span>
                        {isAgent && (
                          <span className="inline-flex items-center gap-1">
                            {msg.status === 'read' ? (
                              <span title="Read by customer">
                                <CheckCheck size={13} className="text-blue-500" />
                              </span>
                            ) : msg.status === 'delivered' ? (
                              <span title="Delivered to customer's phone">
                                <CheckCheck size={13} className="text-dark-400" />
                              </span>
                            ) : msg.status === 'failed' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-0.5" title={msg.errorMsg || 'Failed'}>
                                  <AlertCircle size={11} /> Failed
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(msg.text, 'direct_web')}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[9px] cursor-pointer shadow-2xs"
                                  title="Click to send directly via WhatsApp Web"
                                >
                                  <ExternalLink size={10} /> Send Real WhatsApp
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-0.5" title="Sent to WhatsApp network (waiting for phone delivery)">
                                  <Check size={13} className="text-dark-400" />
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(msg.text, 'direct_web')}
                                  className="text-dark-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer p-0.5"
                                  title="Open in WhatsApp Web to verify or chat directly"
                                >
                                  <ExternalLink size={10} />
                                </button>
                              </div>
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
            <div className="px-3.5 py-2 border-t border-dark-100 dark:border-dark-700/60 bg-slate-50 dark:bg-dark-900/40 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[11px] font-semibold text-dark-500 whitespace-nowrap flex items-center gap-1">
                  <Sparkles size={12} className="text-emerald-500" /> Templates:
                </span>
                {allTemplates.slice(0, 6).map((t, idx) => {
                  const tplLabel = t.label || t.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedTemplateForPreview(t)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-300 hover:border-emerald-400 hover:text-emerald-600 whitespace-nowrap transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Preview full message & send to customer"
                    >
                      <span>{tplLabel}</span>
                      <Eye size={10} className="text-dark-400" />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 whitespace-nowrap transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Browse all approved Meta templates"
                >
                  <FileText size={12} /> All ({allTemplates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-dark-100 text-dark-700 border border-dark-300 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-300 hover:bg-dark-200 whitespace-nowrap transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Create & register a custom template with Meta"
                >
                  <Plus size={12} /> New
                </button>
              </div>
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
                placeholder={
                  sendingMode === 'real_whatsapp'
                    ? `Type real WhatsApp message to ${activeChat.customerName} (delivers directly)...`
                    : `Type WhatsApp message to ${activeChat.customerName}...`
                }
                className="flex-1 px-4 py-2 text-xs sm:text-sm rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {sendingMode === 'real_whatsapp' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(messageInput, 'real_whatsapp')}
                    disabled={!messageInput.trim() || sending}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
                    title="Deliver real WhatsApp message instantly to customer with permanent double check (✓✓)"
                  >
                    <WhatsAppIcon className="w-4 h-4 fill-white" fill="#ffffff" />
                    <span>Send Real WhatsApp (✓✓)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(messageInput, 'cloud_api')}
                    disabled={!messageInput.trim() || sending}
                    className="hidden lg:flex items-center gap-1 px-2.5 py-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold cursor-pointer shrink-0"
                    title="Send via Meta Cloud API instead"
                  >
                    <Send size={13} />
                    <span>Cloud API</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(messageInput, 'real_whatsapp')}
                    disabled={!messageInput.trim()}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-semibold text-xs transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
                    title="Send directly via Real WhatsApp Web (✓✓)"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" fill="#059669" />
                    <span>Real WhatsApp (✓✓)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage(messageInput, 'cloud_api')}
                    disabled={!messageInput.trim() || sending}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    {sending ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                    <span>Send Cloud API</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Real Live Template Preview Modal (What Customer Receives On WhatsApp) */}
      {selectedTemplateForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-dark-100 dark:border-dark-700 flex items-center justify-between bg-dark-50 dark:bg-dark-900">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <WhatsAppIcon className="w-4 h-4 fill-white" fill="#ffffff" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-dark-900 dark:text-white flex items-center gap-1.5">
                    WhatsApp Message Preview
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                      Approved Meta Template
                    </span>
                  </h3>
                  <p className="text-[11px] text-dark-500">
                    Template: <code className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">{selectedTemplateForPreview.templateName || selectedTemplateForPreview.name}</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTemplateForPreview(null)}
                className="p-1 rounded-lg text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 hover:bg-dark-200/50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Simulated WhatsApp Phone Chat Bubble */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-[#efeae2] dark:bg-dark-950 flex flex-col items-center">
              <div className="w-full max-w-md bg-white dark:bg-dark-800 rounded-xl shadow-md border border-dark-200 dark:border-dark-700 overflow-hidden text-dark-900 dark:text-slate-100">
                {/* Header Image if template includes image */}
                {selectedTemplateForPreview.hasImage !== false && (
                  <div className="relative w-full h-36 bg-slate-200 dark:bg-dark-700 overflow-hidden">
                    <img
                      src="https://peyug.in/assets/images/banner/PeYug.png"
                      alt="PeYug Header"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium flex items-center gap-1">
                      <ImageIcon size={11} /> Meta Header Image
                    </div>
                  </div>
                )}

                {/* Body Text */}
                <div className="p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedTemplateForPreview.bodyText || selectedTemplateForPreview.text}
                </div>

                {/* Buttons (e.g. Website link) */}
                {((selectedTemplateForPreview.buttons && selectedTemplateForPreview.buttons.length > 0) || (selectedTemplateForPreview.templateName === 'welcome_to_peyug' || selectedTemplateForPreview.name === 'welcome_to_peyug')) && (
                  <div className="border-t border-dark-100 dark:border-dark-700/80 px-3 py-2 bg-slate-50 dark:bg-dark-900/50 flex flex-col gap-1.5">
                    <a
                      href="https://www.peyug.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 px-3 rounded-lg text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-2xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center gap-1"
                    >
                      <ExternalLink size={12} /> Visit https://www.peyug.in
                    </a>
                  </div>
                )}

                <div className="px-3 py-1 bg-dark-50/50 dark:bg-dark-900/30 flex justify-end">
                  <span className="text-[10px] text-dark-400">Delivered directly via Meta WhatsApp Cloud API ✓✓</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3.5 sm:p-4 border-t border-dark-100 dark:border-dark-700 bg-white dark:bg-dark-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = selectedTemplateForPreview.bodyText || selectedTemplateForPreview.text;
                    setMessageInput(text);
                    addToast('Template copied into message input!', 'info');
                    setSelectedTemplateForPreview(null);
                  }}
                  className="px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 flex items-center gap-1.5 cursor-pointer"
                  title="Copy this template into the text box below"
                >
                  <Copy size={13} /> Copy to Input
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = selectedTemplateForPreview.bodyText || selectedTemplateForPreview.text;
                    const name = selectedTemplateForPreview.templateName || selectedTemplateForPreview.name;
                    handleSendMessage(text, 'real_whatsapp', name);
                    setSelectedTemplateForPreview(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Deliver directly via Real WhatsApp (guarantees delivery & permanent double tick ✓✓)"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 fill-white" fill="#ffffff" />
                  <span>Send Real WhatsApp (✓✓)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTemplateForPreview(null)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = selectedTemplateForPreview.bodyText || selectedTemplateForPreview.text;
                    const name = selectedTemplateForPreview.templateName || selectedTemplateForPreview.name;
                    handleSendMessage(text, 'cloud_api', name);
                    setSelectedTemplateForPreview(null);
                  }}
                  disabled={sending}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Send via Meta WhatsApp Cloud API"
                >
                  <Send size={14} /> Send via Cloud API
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Browse All Approved Meta Templates */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-dark-100 dark:border-dark-700 flex items-center justify-between bg-dark-50 dark:bg-dark-900">
              <div>
                <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-500" />
                  Meta WhatsApp Approved Templates ({allTemplates.length})
                </h3>
                <p className="text-xs text-dark-500">
                  Select an approved template to preview exactly what the recipient sees and send with 1 click.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="p-1 rounded-lg text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 hover:bg-dark-200/50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Filter */}
            <div className="p-3.5 border-b border-dark-100 dark:border-dark-700/60 bg-white dark:bg-dark-800">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-2.5 text-dark-400" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Search templates by title, keyword, loan, deposit, reminder..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Templates Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-dark-50/50 dark:bg-dark-950/50">
              {allTemplates
                .filter((t) => {
                  const s = templateSearch.toLowerCase();
                  const name = (t.templateName || t.name || '').toLowerCase();
                  const label = (t.label || '').toLowerCase();
                  const body = (t.bodyText || t.text || '').toLowerCase();
                  return !s || name.includes(s) || label.includes(s) || body.includes(s);
                })
                .map((t, idx) => {
                  const tplText = t.bodyText || t.text || '';
                  const tplName = t.templateName || t.name;
                  const tplLabel = t.label || t.name;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 hover:border-emerald-400 shadow-2xs flex flex-col justify-between gap-3 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h4 className="text-xs font-bold text-dark-900 dark:text-white truncate">
                            {tplLabel}
                          </h4>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                            {t.status || 'APPROVED'}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-dark-400 mb-2">{tplName}</p>
                        <p className="text-xs text-dark-600 dark:text-dark-300 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans">
                          {tplText}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-700/60">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplateForPreview(t);
                            setShowTemplateModal(false);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={12} /> Preview & Send
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Create & Register New Meta WhatsApp Template */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-dark-100 dark:border-dark-700 flex items-center justify-between bg-dark-50 dark:bg-dark-900">
              <div>
                <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                  <Plus size={16} className="text-emerald-500" />
                  Create New WhatsApp Template
                </h3>
                <p className="text-xs text-dark-500">
                  Submit a customized message template directly to Meta WhatsApp Business API for approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 hover:bg-dark-200/50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newTemplateForm.name.trim() || !newTemplateForm.bodyText.trim()) {
                  addToast('Please provide both template name and body text', 'error');
                  return;
                }
                setCreatingTemplate(true);
                try {
                  const res = await createWhatsAppTemplate(newTemplateForm);
                  addToast(res.message || 'Template submitted to Meta successfully!', 'success');
                  setShowCreateModal(false);
                  setNewTemplateForm({ name: '', category: 'MARKETING', bodyText: '', hasImage: true });
                  const updated = await getWhatsAppTemplates();
                  if (updated?.templates) setLiveTemplates(updated.templates);
                } catch (err) {
                  addToast(err.response?.data?.message || err.message || 'Failed to submit template', 'error');
                } finally {
                  setCreatingTemplate(false);
                }
              }}
              className="p-5 overflow-y-auto flex-1 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                  Template Name (unique identifier)
                </label>
                <input
                  type="text"
                  value={newTemplateForm.name}
                  onChange={(e) =>
                    setNewTemplateForm({
                      ...newTemplateForm,
                      name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                    })
                  }
                  placeholder="e.g. peyug_special_offer_v1"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-dark-400 mt-1">Lowercase letters, numbers, and underscores only</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                  Category
                </label>
                <select
                  value={newTemplateForm.category}
                  onChange={(e) => setNewTemplateForm({ ...newTemplateForm, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="MARKETING">Marketing (Offers, Announcements, Greetings)</option>
                  <option value="UTILITY">Utility (Account Updates, Receipts, Alerts)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                  Message Body (What customer will receive)
                </label>
                <textarea
                  rows={5}
                  value={newTemplateForm.bodyText}
                  onChange={(e) => setNewTemplateForm({ ...newTemplateForm, bodyText: e.target.value })}
                  placeholder="Enter the full exact text including Hindi, emojis, links..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasImageToggle"
                  checked={newTemplateForm.hasImage}
                  onChange={(e) => setNewTemplateForm({ ...newTemplateForm, hasImage: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="hasImageToggle" className="text-xs text-dark-700 dark:text-dark-300 cursor-pointer">
                  Include Top Header Image Banner (Recommended for PeYug templates)
                </label>
              </div>

              <div className="pt-3 border-t border-dark-100 dark:border-dark-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTemplate}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {creatingTemplate ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  Submit to Meta for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Real WhatsApp Setup, Pairing & Status Guide */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 max-w-lg w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-dark-100 dark:border-dark-700 flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <WhatsAppIcon className="w-5 h-5 fill-white" fill="#ffffff" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                    Real WhatsApp Hub
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      Active & Connected
                    </span>
                  </h3>
                  <p className="text-xs text-dark-500 font-mono mt-0.5">
                    Registered Line: +91 70657 47747 (PeYug Business)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="p-1 rounded-lg text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 hover:bg-dark-200/50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs text-dark-700 dark:text-dark-300">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                <p className="font-semibold text-emerald-900 dark:text-emerald-200 mb-1 flex items-center gap-1.5">
                  <CheckCheck size={16} className="text-emerald-600" />
                  Direct Real-Time Message Delivery
                </p>
                <p className="text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed text-[11px]">
                  <strong>Real WhatsApp Mode</strong> sends your messages directly from your WhatsApp number without Meta 24-hour window restrictions, rigid template formatting, or silent drops. Messages deliver to customer phones with permanent double checkmarks (✓✓).
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-dark-900 dark:text-white text-xs">How to use Real WhatsApp in Smart CRM:</p>
                <ol className="list-decimal list-inside space-y-2 text-[11px] leading-relaxed text-dark-600 dark:text-dark-400">
                  <li>
                    Ensure <strong>WhatsApp Web</strong> (<a href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold underline">web.whatsapp.com</a>) or WhatsApp Desktop is logged in on this browser.
                  </li>
                  <li>
                    Keep <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">Real WhatsApp</span> active using the toggle switch above the chat stream.
                  </li>
                  <li>
                    When you type any message or pick a template, click <strong>&quot;Send Real WhatsApp (✓✓)&quot;</strong>.
                  </li>
                  <li>
                    The message opens in WhatsApp ready to send instantly, and your CRM record is immediately locked with double check (✓✓) status.
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-dark-50 dark:bg-dark-900/50 rounded-xl border border-dark-200 dark:border-dark-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-dark-900 dark:text-white text-xs">Default Sending Engine</p>
                  <p className="text-[10px] text-dark-500">Choose which engine to prioritize when composing</p>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-dark-800 p-0.5 rounded-lg border border-dark-200 dark:border-dark-700">
                  <button
                    type="button"
                    onClick={() => {
                      setSendingMode('real_whatsapp');
                      addToast('Default set to Real WhatsApp (Direct ✓✓)', 'success');
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      sendingMode === 'real_whatsapp'
                        ? 'bg-emerald-600 text-white'
                        : 'text-dark-600 dark:text-dark-400 hover:text-dark-900'
                    }`}
                  >
                    Real WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSendingMode('cloud_api');
                      addToast('Default set to Meta Cloud API', 'info');
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      sendingMode === 'cloud_api'
                        ? 'bg-blue-600 text-white'
                        : 'text-dark-600 dark:text-dark-400 hover:text-dark-900'
                    }`}
                  >
                    Cloud API
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-dark-100 dark:border-dark-700 bg-dark-50 dark:bg-dark-900/50 flex items-center justify-between gap-2">
              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" fill="#ffffff" />
                <span>Open WhatsApp Web</span>
                <ExternalLink size={12} />
              </a>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-700 dark:text-dark-300 hover:bg-dark-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
