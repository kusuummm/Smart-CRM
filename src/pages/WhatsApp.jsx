import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
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
  QrCode,
  LogOut,
  Wifi,
  WifiOff,
  Settings,
  Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import SoftphoneModal from '../components/SoftphoneModal';
import {
  getWhatsAppLogs,
  sendWhatsAppMessage,
  getWhatsAppConfig,
  updateWhatsAppConfig,
  testWhatsAppConnection,
  autoDiscoverWhatsAppContact,
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  getWhatsAppDeviceStatus,
  connectWhatsAppDevice,
  disconnectWhatsAppDevice,
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

  const [selectedOrg, setSelectedOrg] = useState(organizations[0]);
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSoftphoneOpen, setIsSoftphoneOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [chatFilter, setChatFilter] = useState('all'); // 'all' | 'unread'
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [backendCustomers, setBackendCustomers] = useState([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [metaConfig, setMetaConfig] = useState(null);
  const [showMetaConfigModal, setShowMetaConfigModal] = useState(false);
  const [waTokenInput, setWaTokenInput] = useState('');
  const [waPhoneIdInput, setWaPhoneIdInput] = useState('');
  const [waWabaIdInput, setWaWabaIdInput] = useState('');
  const [waSaving, setWaSaving] = useState(false);
  const [waTesting, setWaTesting] = useState(false);
  const [waDiscovering, setWaDiscovering] = useState(false);
  const [waTestResult, setWaTestResult] = useState(null);

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
  const [deviceStatus, setDeviceStatus] = useState({ connected: false, phone: '', name: '', qrCode: null });
  const [loadingQr, setLoadingQr] = useState(false);

  // Load Built-in WhatsApp Device status
  const loadDeviceStatus = async () => {
    try {
      const res = await getWhatsAppDeviceStatus();
      if (res?.success) {
        setDeviceStatus({
          connected: Boolean(res.connected),
          phone: res.phone || '',
          name: res.name || '',
          qrCode: res.qrCode || null,
        });
      }
    } catch (_) {}
  };

  const loadMetaConfig = async () => {
    try {
      const cfg = await getWhatsAppConfig();
      if (cfg?.success) {
        setMetaConfig(cfg);
        setIsConfigured(Boolean(cfg.isConfigured));
        setWaPhoneIdInput(cfg.phoneNumberId || '');
        setWaWabaIdInput(cfg.wabaId || '');
      }
    } catch (_) {}
  };

  const handleAutoDetectContact = async () => {
    const token = waTokenInput.trim();
    if (!token && !metaConfig?.hasToken) {
      addToast('Please enter a WhatsApp Access Token first', 'error');
      return;
    }
    setWaDiscovering(true);
    setWaTestResult(null);
    try {
      const res = await autoDiscoverWhatsAppContact({
        token: token || undefined,
        phoneId: waPhoneIdInput.trim() || undefined,
        wabaId: waWabaIdInput.trim() || undefined,
      });
      if (res.success) {
        if (res.phoneNumberId) setWaPhoneIdInput(res.phoneNumberId);
        if (res.wabaId) setWaWabaIdInput(res.wabaId);
        setWaTestResult({
          success: true,
          message: res.message || 'WhatsApp contact details auto-detected successfully!',
          details: res,
        });
        addToast(`Detected contact: ${res.displayPhoneNumber || res.phoneNumberId} (${res.verifiedName || 'Business'})`, 'success');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Auto-detection failed. Verify token permissions.';
      setWaTestResult({ success: false, message: msg });
      addToast(msg, 'error');
    } finally {
      setWaDiscovering(false);
    }
  };

  const handleSaveMetaConfig = async (e) => {
    e.preventDefault();
    if (!waTokenInput.trim() && !metaConfig?.hasToken) {
      addToast('Please enter your Meta WhatsApp Access Token', 'error');
      return;
    }
    setWaSaving(true);
    try {
      const payload = {
        phoneNumberId: waPhoneIdInput.trim() || undefined,
        wabaId: waWabaIdInput.trim() || undefined,
        autoDetect: true,
      };
      if (waTokenInput.trim()) payload.accessToken = waTokenInput.trim();
      const res = await updateWhatsAppConfig(payload);
      addToast(res.message || 'WhatsApp API credentials saved successfully!', 'success');
      setWaTokenInput('');
      await loadMetaConfig();
      setShowMetaConfigModal(false);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save WhatsApp config', 'error');
    } finally {
      setWaSaving(false);
    }
  };

  const handleTestMetaConnection = async () => {
    setWaTesting(true);
    setWaTestResult(null);
    try {
      const res = await testWhatsAppConnection({
        token: waTokenInput.trim() || undefined,
        phoneId: waPhoneIdInput.trim() || undefined,
      });
      setWaTestResult({ success: true, message: res.message });
      addToast(res.message || 'Meta WhatsApp connection test passed!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Connection test failed';
      setWaTestResult({ success: false, message: msg });
      addToast(msg, 'error');
    } finally {
      setWaTesting(false);
    }
  };

  const startDeviceConnect = async () => {
    setLoadingQr(true);
    try {
      const res = await connectWhatsAppDevice();
      if (res?.success) {
        setDeviceStatus({
          connected: Boolean(res.connected),
          phone: res.phone || '',
          name: res.name || '',
          qrCode: res.qrCode || null,
        });
      }
    } catch (_) {
      addToast('Failed to start WhatsApp pairing', 'error');
    } finally {
      setLoadingQr(false);
    }
  };

  const handleDeviceDisconnect = async () => {
    try {
      await disconnectWhatsAppDevice();
      setDeviceStatus({ connected: false, phone: '', name: '', qrCode: null });
      addToast('WhatsApp account disconnected', 'info');
    } catch (_) {
      addToast('Failed to disconnect WhatsApp', 'error');
    }
  };

  useEffect(() => {
    loadDeviceStatus();
    loadMetaConfig();
  }, []);

  useEffect(() => {
    if (!showConnectModal) return;
    loadDeviceStatus();
    const interval = setInterval(loadDeviceStatus, 3000);
    return () => clearInterval(interval);
  }, [showConnectModal]);

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
          setMetaConfig(cfgRes.value);
          setIsConfigured(Boolean(cfgRes.value.isConfigured));
          setWaPhoneIdInput(cfgRes.value.phoneNumberId || '');
          setWaWabaIdInput(cfgRes.value.wabaId || '');
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
              const cleanMobile = (c.mobile || c.phone || '').replace(/\D/g, '').slice(-10);
              const custLogs = logs
                .filter((l) => {
                  const matchId = l.customerId && String(l.customerId) === String(c._id);
                  const lPhoneDigits = (l.phone || l.mobile || '').replace(/\D/g, '').slice(-10);
                  const matchPhone = cleanMobile && lPhoneDigits && cleanMobile === lPhoneDigits;
                  return matchId || matchPhone;
                })
                .reverse();

              const msgs = custLogs.map((l) => ({
                id: l._id,
                sender: 'agent',
                text: l.message,
                time: new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status:
                  l.status === 'read'
                    ? 'read'
                    : l.status === 'delivered' || l.deliveryMode === 'wa_web' || l.deliveryMode === 'real_whatsapp'
                    ? 'delivered'
                    : l.status === 'failed'
                    ? 'failed'
                    : 'sent',
                deliveryMode: l.deliveryMode || 'real_whatsapp',
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
            let targetCust = null;
            try {
              const raw = localStorage.getItem('smartcrm_whatsapp_target_customer');
              if (raw) {
                targetCust = JSON.parse(raw);
                localStorage.removeItem('smartcrm_whatsapp_target_customer');
              }
            } catch (_) {}

            if (targetCust) {
              const targetPhone10 = (targetCust.phone || '').replace(/\D/g, '').slice(-10);
              const foundIdx = mapped.findIndex((m) => {
                const mPhone10 = (m.phone || '').replace(/\D/g, '').slice(-10);
                return (
                  (targetCust.id && String(m.id) === String(targetCust.id)) ||
                  (targetPhone10 && mPhone10 && targetPhone10 === mPhone10)
                );
              });

              if (foundIdx !== -1) {
                const [targetItem] = mapped.splice(foundIdx, 1);
                mapped.unshift(targetItem);
                setConversations(mapped);
                setActiveChatId(targetItem.id);
              } else {
                const newConv = {
                  id: targetCust.id || `target_${Date.now()}`,
                  customerName: targetCust.name || 'Customer',
                  phone: targetCust.phone || '',
                  leadStatus: targetCust.leadStatus || 'Active Lead',
                  lastMessage: 'Direct WhatsApp chat opened',
                  timestamp: 'Just now',
                  unread: 0,
                  avatarColor: 'bg-emerald-600',
                  messages: [],
                };
                mapped.unshift(newConv);
                setConversations(mapped);
                setActiveChatId(newConv.id);
              }
              if (targetCust.prefillMessage) {
                setMessageText(targetCust.prefillMessage);
              }
            } else {
              setConversations(mapped);
              setActiveChatId(mapped[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to preload customer list:', err);
      }
    }
    init();
  }, []);
  // smartcrm_whatsapp_target_customer_listener: listen for target customer handoffs from other CRM modules
  useEffect(() => {
    const handleTargetCheck = () => {
      try {
        const raw = localStorage.getItem('smartcrm_whatsapp_target_customer');
        if (!raw) return;
        const targetCust = JSON.parse(raw);
        localStorage.removeItem('smartcrm_whatsapp_target_customer');

        const targetPhone10 = (targetCust.phone || '').replace(/\D/g, '').slice(-10);

        setConversations((prev) => {
          const foundIdx = prev.findIndex((m) => {
            const mPhone10 = (m.phone || '').replace(/\D/g, '').slice(-10);
            return (
              (targetCust.id && String(m.id) === String(targetCust.id)) ||
              (targetPhone10 && mPhone10 && targetPhone10 === mPhone10)
            );
          });

          if (foundIdx !== -1) {
            const targetItem = prev[foundIdx];
            const reordered = [targetItem, ...prev.filter((_, i) => i !== foundIdx)];
            setActiveChatId(targetItem.id);
            return reordered;
          } else {
            const newConv = {
              id: targetCust.id || `target_${Date.now()}`,
              customerName: targetCust.name || 'Customer',
              phone: targetCust.phone || '',
              leadStatus: targetCust.leadStatus || 'Active Lead',
              lastMessage: 'Direct WhatsApp chat opened',
              timestamp: 'Just now',
              unread: 0,
              avatarColor: 'bg-emerald-600',
              messages: [],
            };
            setActiveChatId(newConv.id);
            return [newConv, ...prev];
          }
        });

        if (targetCust.prefillMessage) {
          setMessageText(targetCust.prefillMessage);
        }
      } catch (_) {}
    };

    handleTargetCheck();
    window.addEventListener('focus', handleTargetCheck);
    return () => window.removeEventListener('focus', handleTargetCheck);
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
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeChat =
    conversations.find((c) => c.id === activeChatId) ||
    (conversations.length > 0 ? conversations[0] : null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages?.length, activeChatId]);

  // Official Approved PeYug Meta Templates & Quick Presets
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
      templateName: 'peyug_missed_call_hindi',
      category: 'UTILITY',
      hasImage: true,
      text: `नमस्ते 🙏\n\nआपका कॉल प्राप्त हुआ। हम अभी आपसे संपर्क नहीं कर सके, इसके लिए हमें खेद है।\n\nहमारी PeYug टीम शीघ्र ही आपसे जुड़ेगी।\n\nतत्काल सहायता के लिए आप हमें WhatsApp पर संदेश भेज सकते हैं।\n\nधन्यवाद,\nटीम PeYug\nhttps://peyug.in`,
    },
    {
      label: 'PeYug परिवार Welcome',
      templateName: 'peyug_pariwar_welcome',
      category: 'MARKETING',
      hasImage: true,
      text: `🎉 PeYug परिवार में आपका स्वागत है!\n\nअब आप:\n✅ डेली बचत कर सकते हैं\n✅ इमरजेंसी लोन सहायता पा सकते हैं\n✅ घर बैठे डिजिटल कलेक्शन कर सकते हैं\n\nहमारा लक्ष्य: "हर व्यक्ति को आर्थिक रूप से मज़बूत बनाना।" 💙\n🌐 वेबसाइट: https://peyug.in/`,
    },
    {
      label: 'EMI Reminder',
      templateName: 'peyug_emi_reminder',
      category: 'UTILITY',
      hasImage: false,
      text: `प्रिय ग्राहक,\n\nयह आपके PeYug खाते की आगामी EMI / किस्त के संबंध में एक सौम्य अनुस्मारक है।\nकृपया समय पर भुगतान कर निर्बाध सेवा का लाभ लें।\n\nसहायता के लिए संपर्क करें: contact@peyug.in`,
    },
    {
      label: 'इमरजेंसी लोन ऑफर',
      templateName: 'peyug_emergency_loan_offer',
      category: 'MARKETING',
      hasImage: true,
      text: `📢 तत्काल वित्तीय सहायता की आवश्यकता?\n\nPeYug लाया है आसान और न्यूनतम दस्तावेज़ों पर Emergency Loan सुविधा।\n\n✔ त्वरित स्वीकृति\n✔ आसान दैनिक/मासिक भुगतान\n✔ पारदर्शी प्रक्रिया\n\nअधिक जानकारी के लिए PeYug App पर जाएं: https://peyug.in`,
    },
    {
      label: 'डेली डिपॉज़िट प्लान',
      templateName: 'peyug_daily_deposit',
      category: 'MARKETING',
      hasImage: true,
      text: `रोज़ाना बचत, सुरक्षित भविष्य! 💰\n\nPeYug Daily Deposit योजना से जुड़कर अपनी छोटी-छोटी बचतों को बड़ा बनाएं।\n\n🔹 सुरक्षित निवेश\n🔹 दैनिक कलेक्शन ट्रैकिंग\n🔹 मोबाइल ऐप पर तुरंत रसीद\n\nशुरू करने के लिए संपर्क करें: https://peyug.in`,
    },
    {
      label: 'Account Activated',
      templateName: 'peyug_account_activated',
      category: 'UTILITY',
      hasImage: false,
      text: `बधाई हो! 🎉\nआपका PeYug खाता सफलतापूर्वक सक्रिय हो गया है। अब आप सभी वित्तीय सुविधाओं का लाभ उठाने के लिए तैयार हैं।\n\nऐप खोलें और शुरुआत करें। Team PeYug`,
    },
    {
      label: 'Direct Hindi Greeting',
      templateName: 'peyug_greeting_hindi',
      category: 'MARKETING',
      hasImage: true,
      text: `नमस्ते 🙏\nआपका कॉल प्राप्त हुआ।\n\nPeYug से जुड़ने के लिए धन्यवाद।\nहमारी टीम जल्द ही आपसे संपर्क करेगी।\n\n📌 सेवाएं:\n✔ Daily Deposit\n✔ Emergency Loan, Deposit Loan\n✔ सुरक्षित डिजिटल भुगतान\n\nअधिक जानकारी के लिए WhatsApp पर "Hi" लिखें।\n\n🎥 PeYug Video: https://youtu.be/peyug_intro`,
    },
  ];

  const allTemplates = liveTemplates.length > 0 ? liveTemplates : quickTemplates;

  // Send message directly through backend (Never opens external window or app)
  const handleSendMessage = async (textToSend, mode = 'direct', templateName = null) => {
    if (!activeChat) return;
    const text = textToSend || messageInput;
    if (!text.trim()) return;

    const trimmed = text.trim();

    const newMsg = {
      id: `m_${Date.now()}`,
      sender: 'agent',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered', // Immediate real delivery display
      deliveryMode: deviceStatus.connected ? 'real_whatsapp' : 'cloud_api',
    };

    // Optimistic UI update in chat stream
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

    try {
      const res = await sendWhatsAppMessage({
        customerId: activeChat.id?.startsWith('c_') ? undefined : activeChat.id,
        phone: activeChat.phone,
        name: activeChat.customerName,
        message: trimmed,
        templateName: templateName || undefined,
        type: templateName ? 'template' : 'custom',
      });

      if (res?.success) {
        addToast(`Message delivered directly to ${activeChat.customerName} via WhatsApp ✓✓`, 'success');
        const deliveredBody = res?.message || trimmed;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeChat.id) {
              return {
                ...c,
                lastMessage: deliveredBody,
                messages: c.messages.map((m) =>
                  m.id === newMsg.id
                    ? {
                        ...m,
                        text: deliveredBody,
                        status: res.status === 'sent' ? 'sent' : 'delivered',
                        deliveryMode: res.deliveredVia || 'real_whatsapp',
                      }
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
          ? 'Customer 24h window closed on Meta Cloud API. Link your WhatsApp in the header for unrestricted direct delivery, or choose an approved template below.'
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
              {deviceStatus.connected ? (
                <button
                  type="button"
                  onClick={() => setShowConnectModal(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 transition-colors shadow-2xs cursor-pointer"
                  title="Direct WhatsApp client connected and sending directly without external apps"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>WhatsApp Linked (+{deviceStatus.phone || 'Active'})</span>
                </button>
              ) : isConfigured ? (
                <button
                  type="button"
                  onClick={() => {
                    loadMetaConfig();
                    setShowMetaConfigModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700 transition-colors shadow-2xs cursor-pointer"
                  title="Meta Cloud API configured. Click to view or change credentials."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span>Meta Cloud API Active</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowConnectModal(true);
                    startDeviceConnect();
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 transition-colors shadow-2xs cursor-pointer"
                  title="Click to link WhatsApp account for direct sending without any app"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Link WhatsApp (Direct Send)</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-dark-500 font-mono mt-0.5">
              {deviceStatus.connected
                ? `Active Line: +${deviceStatus.phone} (${deviceStatus.name || 'Linked WhatsApp'}) • Direct Socket Dispatch Active`
                : metaConfig?.displayPhoneNumber
                ? `Active Meta API Line: ${metaConfig.displayPhoneNumber} (${metaConfig.verifiedName || 'Meta Cloud API'})`
                : metaConfig?.phoneNumberId
                ? `Meta Cloud API Active (Phone ID: ${metaConfig.phoneNumberId})`
                : 'Direct CRM Dispatch Active • No WhatsApp account configured'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadMetaConfig();
              setShowMetaConfigModal(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-dark-700 dark:text-dark-200 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 transition-all shadow-2xs cursor-pointer"
            title="Configure or switch your Meta WhatsApp Business API account credentials"
          >
            <Settings size={13} className="text-dark-500" />
            <span>Meta API Account</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowConnectModal(true);
              if (!deviceStatus.connected) startDeviceConnect();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
              deviceStatus.connected
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="Scan QR to link your WhatsApp directly inside CRM"
          >
            <Smartphone size={13} />
            <span>{deviceStatus.connected ? 'WhatsApp Linked ✓' : 'Link WhatsApp (Scan QR)'}</span>
          </button>

          <button
            onClick={() => onNavigate?.('broadcast')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-all cursor-pointer"
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
                  type="button"
                  onClick={() => {
                    setShowConnectModal(true);
                    if (!deviceStatus.connected) startDeviceConnect();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
                  title="Manage built-in WhatsApp connection"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" fill="#059669" />
                  <span className="hidden sm:inline">{deviceStatus.connected ? 'WhatsApp Connected ✓' : 'Link WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSoftphoneOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors cursor-pointer"
                  title="Call this user"
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
              {/* WhatsApp Delivery Channel Status Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 px-3 rounded-xl border text-[11px] font-medium shadow-2xs bg-white/95 dark:bg-dark-800/95 border-dark-200 dark:border-dark-700 my-1">
                <div className="flex items-center gap-2">
                  {deviceStatus.connected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Direct WhatsApp Connected (+{deviceStatus.phone})
                    </span>
                  ) : isConfigured ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-xs">
                      <Lock size={12} className="text-blue-600" />
                      Meta Cloud API Active {metaConfig?.displayPhoneNumber ? `(${metaConfig.displayPhoneNumber})` : ''}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowConnectModal(true);
                        startDeviceConnect();
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                    >
                      <QrCode size={13} className="text-amber-600" />
                      <span>Link Your WhatsApp for Direct Sending (Scan QR)</span>
                    </button>
                  )}
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
                    Select an approved PeYug template below or type a message. All messages are dispatched directly to the customer's WhatsApp.
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
                          <span>24h window closed on Cloud API. Link your WhatsApp or retry:</span>
                          <button
                            type="button"
                            onClick={() => handleSendMessage(msg.text)}
                            className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer shadow-2xs"
                          >
                            <RefreshCw size={10} />
                            <span>Retry Sending</span>
                          </button>
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-dark-400">
                        {isAgent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60">
                            Real WhatsApp
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
                                  onClick={() => handleSendMessage(msg.text)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[9px] cursor-pointer shadow-2xs"
                                  title="Retry sending message directly"
                                >
                                  <RefreshCw size={10} /> Retry
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-0.5" title="Sent to WhatsApp network">
                                <Check size={13} className="text-dark-400" />
                              </span>
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
                onClick={() => addToast('Media attachment feature ready', 'info')}
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
                placeholder={`Type WhatsApp message to ${activeChat.customerName}...`}
                className="flex-1 px-4 py-2 text-xs sm:text-sm rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!messageInput.trim() || sending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
                title="Send WhatsApp message directly to customer"
              >
                {sending ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                <span>Send WhatsApp (✓✓)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Real Live Template Preview Modal */}
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
                      APPROVED
                    </span>
                  </h3>
                  <p className="text-[11px] text-dark-500 font-mono">
                    Template: {selectedTemplateForPreview.templateName || selectedTemplateForPreview.name}
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

            {/* Simulated WhatsApp Phone Bubble */}
            <div
              className="p-5 overflow-y-auto flex-1 bg-[#efeae2] dark:bg-dark-950 flex flex-col items-center justify-center"
              style={{
                backgroundImage: 'radial-gradient(rgba(0,0,0,0.06) 1px, transparent 0)',
                backgroundSize: '16px 16px',
              }}
            >
              <div className="max-w-sm w-full bg-white dark:bg-dark-800 rounded-2xl shadow-md border border-dark-200/60 dark:border-dark-700 overflow-hidden text-dark-900 dark:text-white">
                {/* Header Image if applicable */}
                {selectedTemplateForPreview.hasImage !== false && (
                  <div className="w-full h-36 bg-slate-200 dark:bg-dark-700 overflow-hidden relative">
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
                    <span className="w-full py-1.5 px-3 rounded-lg text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-2xs flex items-center justify-center gap-1">
                      Website: https://www.peyug.in
                    </span>
                  </div>
                )}

                <div className="px-3 py-1 bg-dark-50/50 dark:bg-dark-900/30 flex justify-end">
                  <span className="text-[10px] text-dark-400">Direct WhatsApp Delivery ✓✓</span>
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
                    handleSendMessage(text, 'direct', name);
                    setSelectedTemplateForPreview(null);
                  }}
                  disabled={sending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Send message directly to client"
                >
                  {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Send WhatsApp (✓✓)</span>
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
                  WhatsApp Approved Templates ({allTemplates.length})
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

      {/* MODAL 3: Create & Register New WhatsApp Template */}
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

      {/* MODAL 4: Built-in Real WhatsApp QR Code Link & Pairing Hub */}
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
                    Link WhatsApp to Smart CRM
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        deviceStatus.connected
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      }`}
                    >
                      {deviceStatus.connected ? 'Connected' : 'Scan to Connect'}
                    </span>
                  </h3>
                  <p className="text-xs text-dark-500 font-mono mt-0.5">
                    {deviceStatus.connected
                      ? `Active Line: +${deviceStatus.phone || 'Connected'} (${deviceStatus.name || 'WhatsApp'})`
                      : 'Direct messaging without opening external apps'}
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

            {/* Body */}
            <div className="p-5 space-y-4 text-xs text-dark-700 dark:text-dark-300">
              {deviceStatus.connected ? (
                /* Connected State */
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                      <CheckCircle2 size={28} />
                    </div>
                    <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                      WhatsApp Connected Directly
                    </h4>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 font-mono">
                      Phone: +{deviceStatus.phone}
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 max-w-sm mx-auto leading-relaxed">
                      Your WhatsApp is linked directly inside Smart CRM. All messages sent from the CRM deliver straight to your clients without opening WhatsApp Web or any external apps.
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleDeviceDisconnect}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Disconnect WhatsApp Account</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Pairing State (QR Code) */
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-dark-900/60 rounded-xl border border-dark-200 dark:border-dark-700">
                    <p className="font-bold text-dark-900 dark:text-white text-xs mb-1.5">
                      How to link your WhatsApp:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-dark-600 dark:text-dark-300 leading-relaxed">
                      <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
                      <li>
                        Tap <strong>Settings</strong> (iOS) or <strong>⋮ Menu</strong> (Android) &gt; <strong>Linked Devices</strong>
                      </li>
                      <li>
                        Tap <strong>Link a Device</strong> and point your camera at this QR code
                      </li>
                    </ol>
                  </div>

                  {deviceStatus.qrCode ? (
                    <div className="flex flex-col items-center justify-center py-2 space-y-3">
                      <div className="p-3 bg-white rounded-2xl shadow-md border border-dark-200 inline-block">
                        <img
                          src={deviceStatus.qrCode}
                          alt="WhatsApp Link QR Code"
                          className="w-56 h-56 object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-dark-500 font-medium">
                        <RefreshCw size={12} className="animate-spin text-emerald-600" />
                        <span>Waiting for scan... (Auto-refreshes)</span>
                      </div>
                      <button
                        type="button"
                        onClick={startDeviceConnect}
                        disabled={loadingQr}
                        className="px-3 py-1.5 rounded-lg border border-dark-200 dark:border-dark-700 text-xs text-dark-600 dark:text-dark-300 hover:bg-dark-100 transition-colors cursor-pointer"
                      >
                        Refresh QR Code
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                        {loadingQr ? <RefreshCw size={24} className="animate-spin" /> : <QrCode size={24} />}
                      </div>
                      <p className="text-xs text-dark-600 dark:text-dark-300 max-w-xs">
                        {loadingQr
                          ? 'Generating WhatsApp pairing QR code...'
                          : 'Click below to generate a QR code and connect your WhatsApp account'}
                      </p>
                      <button
                        type="button"
                        onClick={startDeviceConnect}
                        disabled={loadingQr}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {loadingQr ? <RefreshCw size={14} className="animate-spin" /> : <QrCode size={14} />}
                        <span>{loadingQr ? 'Generating QR...' : 'Generate QR Code'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-dark-100 dark:border-dark-700 bg-dark-50 dark:bg-dark-900/50 flex items-center justify-between gap-2">
              <span className="text-[11px] text-dark-400">
                Direct in-CRM dispatch • No external apps
              </span>
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

      {/* MODAL 5: Meta WhatsApp Cloud API Credentials & Account Switcher */}
      {showMetaConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-dark-100 dark:border-dark-700 flex items-center justify-between bg-dark-50 dark:bg-dark-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                    Meta WhatsApp API Credentials
                  </h3>
                  <p className="text-xs text-dark-500">
                    Connect your own Meta WhatsApp Business Account (WABA)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMetaConfigModal(false)}
                className="p-1 rounded-lg text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 hover:bg-dark-200/50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMetaConfig} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {metaConfig?.isConfigured && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Active Account Configured
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                      {metaConfig.displayPhoneNumber ? `Line: ${metaConfig.displayPhoneNumber} ` : ''}
                      {metaConfig.verifiedName ? `(${metaConfig.verifiedName})` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-dark-400">
                    Phone ID: {metaConfig.phoneNumberId}
                  </span>
                </div>
              )}

              <div>
                <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                  Permanent System User Access Token
                </label>
                <input
                  type="password"
                  value={waTokenInput}
                  onChange={(e) => setWaTokenInput(e.target.value)}
                  placeholder={metaConfig?.hasToken ? `Current token: ${metaConfig.maskedToken}` : 'Paste EAAB... permanent access token'}
                  className="w-full px-3 py-2 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-dark-400 mt-1">
                  To switch WhatsApp contact, simply paste your new access token. The system automatically detects and links the new contact number.
                </p>
              </div>

              <div>
                <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={waPhoneIdInput}
                  onChange={(e) => setWaPhoneIdInput(e.target.value)}
                  placeholder="Auto-detected from token (or enter Phone ID)"
                  className="w-full px-3 py-2 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-dark-400 mt-1">Leave empty to auto-detect from token, or specify manually</p>
              </div>

              <div>
                <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1">
                  WhatsApp Business Account (WABA) ID
                </label>
                <input
                  type="text"
                  value={waWabaIdInput}
                  onChange={(e) => setWaWabaIdInput(e.target.value)}
                  placeholder="Auto-detected from token (or enter WABA ID)"
                  className="w-full px-3 py-2 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-dark-400 mt-1">Leave empty to auto-detect from token, or specify manually</p>
              </div>

              {waTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    waTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                  }`}
                >
                  <p className="font-semibold flex items-center gap-1.5">
                    {waTestResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {waTestResult.success ? 'Handshake Passed' : 'Handshake Failed'}
                  </p>
                  <p className="text-[11px] mt-0.5">{waTestResult.message}</p>
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-dark-100 dark:border-dark-700">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoDetectContact}
                    disabled={waDiscovering || (!waTokenInput.trim() && !metaConfig?.hasToken)}
                    className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {waDiscovering ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                    <span>Auto-Detect Contact</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestMetaConnection}
                    disabled={waTesting || (!waPhoneIdInput && !metaConfig?.phoneNumberId && !waTokenInput.trim())}
                    className="px-3.5 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {waTesting ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
                    <span>Test Handshake</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMetaConfigModal(false)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-400 hover:bg-dark-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={waSaving}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {waSaving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    <span>Save &amp; Activate</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
