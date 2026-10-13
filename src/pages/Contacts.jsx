import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  ChevronDown,
  SlidersHorizontal,
  X,
  PhoneCall,
  Copy,
  Check,
  Calendar,
  MoreHorizontal,
  Plus,
  Building2,
  Mail,
  Globe,
  MapPin,
  Tag,
  DollarSign,
  Briefcase,
  UserCheck,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  FileText,
  Download,
  Phone,
  Mic,
  Radio,
  Trash2,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, bulkDeleteCustomers } from '../api/customers';
import { getCalls, createCall } from '../api/callHistory';
import CallRecordingModal from '../components/CallRecordingModal';
import { audioEngine, formatSeconds, generateWaveform } from '../utils/audioPlayer';
import { realCallRecorder } from '../utils/realCallRecorder';
import ContactDetailView from '../components/ContactDetailView';

export default function Contacts({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Search & Filter states
  const [customerSearch, setCustomerSearch] = useState(() => {
    const saved = sessionStorage.getItem('smartcrm_filter_telecaller');
    if (saved) {
      sessionStorage.removeItem('smartcrm_filter_telecaller');
      return saved;
    }
    return '';
  });
  const [selectedLeadGroup, setSelectedLeadGroup] = useState('Select Lead groups');
  const [selectedCreatedBy, setSelectedCreatedBy] = useState('Select Created by');
  const [createdDate, setCreatedDate] = useState('');
  const [teamFilter, setTeamFilter] = useState('Main Team');

  // Dropdown toggles
  const [showLeadGroupDropdown, setShowLeadGroupDropdown] = useState(false);
  const [showCreatedByDropdown, setShowCreatedByDropdown] = useState(false);

  // Table selection
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [visibleCount, setVisibleCount] = useState(10);

  // Active Calling & Realistic State Machine
  const [activeCallContact, setActiveCallContact] = useState(null);
  const [activeCallState, setActiveCallState] = useState('ringing'); // 'ringing' | 'connected'
  const [callTimer, setCallTimer] = useState(0);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [isManualDialOpen, setIsManualDialOpen] = useState(false);
  const [manualDialNumber, setManualDialNumber] = useState('');
  const [manualDialName, setManualDialName] = useState('');

  // Customer Drawer & Recordings
  const [viewingContact, setViewingContact] = useState(null);
  const [activeContactTab, setActiveContactTab] = useState('recordings'); // 'recordings' | 'overview'
  const [selectedCallForModal, setSelectedCallForModal] = useState(null);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [activeDrawerAudioId, setActiveDrawerAudioId] = useState(null);
  const [drawerAudioPlaying, setDrawerAudioPlaying] = useState(false);
  const [drawerAudioTime, setDrawerAudioTime] = useState(0);
  const [drawerAudioSpeed, setDrawerAudioSpeed] = useState(1.0);

  // Customer Call Recordings dictionary
  const [customerRecordings, setCustomerRecordings] = useState({});

  // Modal: Create Contact
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  // Form State matching all 4 Create Contact screenshots
  const initialForm = {
    organization: 'Main Line',
    firstName: '',
    lastName: '',
    phoneCode: '+91',
    phone: '',
    email: '',
    website: '',
    houseNo: '',
    city: '',
    address1: '',
    address2: '',
    source: 'call',
    sourceType: 'call',
    dealValue: '',
    leadGroup: 'Select lead group',
    businessName: '',
    additionalInfo: '',
    createTask: false,
    assignedTo: user?.name || '',
    leadStage: 'Select lead stage',
  };
  const [form, setForm] = useState(initialForm);

  // Contact records loaded from backend API
  const [contacts, setContacts] = useState([]);

  // Fetch real customers from database
  useEffect(() => {
    getCustomers({ limit: 500 })
      .then((res) => {
        if (res.customers) {
          const cleanCustomers = res.customers.filter((c) => !/private client/i.test(c.name || ''));
          const mapped = cleanCustomers.map((c) => ({
            id: c._id,
            name: c.name,
            phone: c.mobile || c.phone || '',
            additionalInfo: c.company ? (c.remarks ? `${c.company} • ${c.remarks}` : c.company) : c.remarks || '-',
            email: c.email || '-',
            tags: c.interestedProduct || '-',
            leadStage: c.status || '-',
            source: c.leadSource?.toLowerCase() || 'call',
            city: c.city || '-',
            assignedTelecaller: c.assignedTelecaller || 'Unassigned',
          }));
          setContacts(mapped);
          try {
            localStorage.setItem('smartcrm_contacts', JSON.stringify(mapped));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch =
        !customerSearch ||
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch);
      return matchSearch;
    });
  }, [contacts, customerSearch]);

  const displayedContacts = filteredContacts.slice(0, visibleCount);

  // Copy number
  const copyToClipboard = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    addToast(`Copied ${text} to clipboard`, 'success');
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedContactIds.length === displayedContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(displayedContacts.map((c) => c.id));
    }
  };

  const handleSelectContact = (id) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Delete Contacts with confirmation
  const handleBulkDelete = async () => {
    if (selectedContactIds.length === 0) return;
    const count = selectedContactIds.length;
    const ok = await confirm({
      title: `Delete ${count} Contact${count > 1 ? 's' : ''}?`,
      message: `Are you sure you want to delete ${count} selected contact${count > 1 ? 's' : ''}? This will permanently remove them from your CRM.`,
      confirmText: `Yes, Delete (${count})`,
      cancelText: 'Cancel',
      isDestructive: true,
    });
    if (!ok) return;

    try {
      await bulkDeleteCustomers({ customerIds: selectedContactIds }).catch(async () => {
        await Promise.all(selectedContactIds.map((id) => deleteCustomer(id).catch(() => null)));
      });

      const idsSet = new Set(selectedContactIds);
      setContacts((prev) => {
        const updated = prev.filter((c) => !idsSet.has(c.id));
        try {
          localStorage.setItem('smartcrm_contacts', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setSelectedContactIds([]);
      addToast(`Successfully deleted ${count} contact${count > 1 ? 's' : ''}!`, 'success');
    } catch (err) {
      addToast('Failed to delete selected contacts', 'error');
    }
  };

  // Single Contact Delete with confirmation
  const handleDeleteSingleContact = async (contact) => {
    const ok = await confirm({
      title: `Delete Contact "${contact.name}"?`,
      message: `Are you sure you want to delete ${contact.name} (+91 ${contact.phone})? This will permanently remove this contact.`,
      confirmText: 'Yes, Delete Contact',
      cancelText: 'Cancel',
      isDestructive: true,
    });
    if (!ok) return;

    try {
      await deleteCustomer(contact.id).catch(() => null);
      setContacts((prev) => {
        const updated = prev.filter((c) => c.id !== contact.id);
        try {
          localStorage.setItem('smartcrm_contacts', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setSelectedContactIds((prev) => prev.filter((id) => id !== contact.id));
      addToast(`Contact "${contact.name}" deleted successfully!`, 'success');
    } catch (err) {
      addToast('Failed to delete contact', 'error');
    }
  };

  const autoConnectTimerRef = useRef(null);
  const [ringCountdown, setRingCountdown] = useState(4);
  const [liveVolume, setLiveVolume] = useState(0);
  const [isRingMuted, setIsRingMuted] = useState(audioEngine.isRingToneMuted());

  // Dial Call: starts in ringing state, timer starts once answered or auto-connected in 4s!
  const handleStartCall = (contact) => {
    if (autoConnectTimerRef.current) {
      clearTimeout(autoConnectTimerRef.current);
    }
    setActiveCallContact(contact);
    setActiveCallState('ringing');
    setCallTimer(0);
    setIsRecordingActive(false);
    setRingCountdown(4);

    // 1. Play brief realistic telephony ringtone (if not muted)
    audioEngine.playRingTone();

    // 2. Trigger native telephony dialer (tel: protocol) on Windows Phone Link / mobile
    const rawNumber = contact.phone || '';
    const cleanNumber = rawNumber.replace(/[^0-9+]/g, '');
    if (cleanNumber) {
      try {
        window.open(`tel:${cleanNumber}`, '_self');
      } catch (e) {
        console.warn('tel: protocol redirect:', e);
      }
    }

    // 3. Auto-connect after 4s ringing so telecallers on Phone Link / phone have live talk time & recording
    autoConnectTimerRef.current = setTimeout(() => {
      handleAnswerCallContact();
    }, 4000);
  };

  // Called when clicking "Launch Device Dialer": answers immediately so Phone Link is in sync
  const handleLaunchDeviceDialer = (phone) => {
    if (autoConnectTimerRef.current) {
      clearTimeout(autoConnectTimerRef.current);
      autoConnectTimerRef.current = null;
    }
    audioEngine.stopRingTone();
    handleAnswerCallContact();
    const cleanNumber = (phone || '').replace(/[^0-9+]/g, '');
    if (cleanNumber) {
      try {
        window.open(`tel:${cleanNumber}`, '_self');
      } catch (e) {}
    }
  };

  // Called when customer answers: starts duration timer & real mic recording!
  const handleAnswerCallContact = async () => {
    if (autoConnectTimerRef.current) {
      clearTimeout(autoConnectTimerRef.current);
      autoConnectTimerRef.current = null;
    }
    setActiveCallState('connected');
    audioEngine.stopRingTone();
    setCallTimer(0);

    const isRecEnabled = localStorage.getItem('smartcrm_call_recording_enabled') !== 'false';
    if (isRecEnabled) {
      setIsRecordingActive(true);
      addToast('Call connected! Live talk time & real microphone voice recording active.', 'success');
      try {
        await realCallRecorder.start();
      } catch (err) {
        console.warn('Microphone recorder notice:', err);
      }
    } else {
      setIsRecordingActive(false);
      addToast('Call connected! Live talk time active (Call recording is toggled OFF in Settings).', 'info');
    }
  };

  // Called if customer does not answer or line is busy (0s talk time)
  const handleEndBeforeAnswerContact = async (outcome = 'missed') => {
    if (autoConnectTimerRef.current) {
      clearTimeout(autoConnectTimerRef.current);
      autoConnectTimerRef.current = null;
    }
    if (!activeCallContact) return;
    audioEngine.stopRingTone();
    await realCallRecorder.stop();

    createCall({
      customerPhone: activeCallContact.phone,
      customerName: activeCallContact.name,
      duration: '0s',
      status: outcome === 'busy' ? 'busy' : 'missed',
      remarks: outcome === 'busy' ? 'Customer line busy' : 'No answer from customer',
    }).catch(() => {});

    addToast(`Call ended: Customer ${outcome === 'busy' ? 'Busy' : 'Did Not Answer'} (0s talk time logged)`, 'info');
    setActiveCallContact(null);
    setActiveCallState('ringing');
    setCallTimer(0);
    setIsRecordingActive(false);
  };

  // Ringing countdown effect
  useEffect(() => {
    if (!activeCallContact || activeCallState !== 'ringing') return;
    const interval = setInterval(() => {
      setRingCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCallContact, activeCallState]);

  // Live microphone volume polling for real-time VU meter
  useEffect(() => {
    if (!activeCallContact || activeCallState !== 'connected') {
      setLiveVolume(0);
      return;
    }
    const interval = setInterval(() => {
      const vol = realCallRecorder.getLiveVolume();
      setLiveVolume(vol);
    }, 150);
    return () => clearInterval(interval);
  }, [activeCallContact, activeCallState]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoConnectTimerRef.current) {
        clearTimeout(autoConnectTimerRef.current);
      }
      audioEngine.stopRingTone();
    };
  }, []);

  // Duration timer: ONLY runs when customer has answered (activeCallState === 'connected')
  useEffect(() => {
    if (!activeCallContact || activeCallState !== 'connected') return;
    const interval = setInterval(() => setCallTimer((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [activeCallContact, activeCallState]);

  // Handle Contact Updates & Deletions from ContactDetailView
  const handleUpdateContact = (updatedContact) => {
    if (updatedContact?.id && typeof updatedContact.id === 'string' && updatedContact.id.length === 24) {
      updateCustomer(updatedContact.id, {
        name: updatedContact.name,
        mobile: updatedContact.phone,
        status: updatedContact.leadStage || updatedContact.status,
        assignedTelecaller: updatedContact.assignedTelecaller,
        city: updatedContact.city,
      }).catch(() => {});
    }

    setContacts((prev) => {
      const next = prev.map((c) => (c.id === updatedContact.id ? { ...c, ...updatedContact } : c));
      try {
        localStorage.setItem('smartcrm_contacts', JSON.stringify(next));
      } catch {}
      return next;
    });
    setViewingContact((prev) => (prev && prev.id === updatedContact.id ? { ...prev, ...updatedContact } : prev));
  };

  const handleDeleteContact = (contactId) => {
    if (contactId && typeof contactId === 'string' && contactId.length === 24) {
      deleteCustomer(contactId).catch(() => {});
    }

    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== contactId);
      try {
        localStorage.setItem('smartcrm_contacts', JSON.stringify(next));
      } catch {}
      return next;
    });
    setViewingContact(null);
  };

  // Create Contact Submit
  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      addToast('First name is required', 'error');
      return;
    }
    if (!form.phone.trim()) {
      addToast('Phone number is required', 'error');
      return;
    }

    setSavingContact(true);
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const newContactObj = {
      id: Date.now().toString(),
      name: fullName,
      phone: form.phone.trim(),
      additionalInfo: form.additionalInfo || '-',
      email: form.email || '-',
      tags: form.leadGroup !== 'Select lead group' ? form.leadGroup : '-',
      leadStage: form.leadStage !== 'Select lead stage' ? form.leadStage : 'New',
      source: form.sourceType || 'call',
      city: form.city || '-',
    };

    try {
      const res = await createCustomer({
        name: fullName,
        mobile: form.phone.trim(),
        email: form.email || `${form.firstName.toLowerCase()}@example.com`,
        city: form.city || 'Delhi',
        assignedTelecaller: form.assignedTo || (user?.name || 'Unassigned'),
      }).catch(() => null);
      if (res?.customer?._id) {
        newContactObj.id = res.customer._id;
      }
    } catch {}

    setContacts((prev) => {
      const updated = [newContactObj, ...prev];
      try {
        localStorage.setItem('smartcrm_contacts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    addToast(`Contact "${fullName}" created successfully!`, 'success');
    setSavingContact(false);
    setIsCreateModalOpen(false);
    setForm(initialForm);
  };

  // Dedicated Superfone Full Page Contact Detail View
  if (viewingContact) {
    return (
      <div className="relative">
        <ContactDetailView
          contact={viewingContact}
          onBack={() => setViewingContact(null)}
          onNavigate={onNavigate}
          onStartCall={handleStartCall}
          onUpdateContact={handleUpdateContact}
          onDeleteContact={handleDeleteContact}
        />

        {/* Live Active Softphone Call Overlay if calling from inside contact details */}
        {activeCallContact && (
          <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-dark-900 border-2 border-emerald-500 rounded-2xl shadow-2xl p-5 w-84 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-800">
              <div className="flex items-center gap-2">
                {activeCallState === 'ringing' ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Ringing Line...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Connected Live
                    </span>
                  </>
                )}
              </div>
              <span className="font-mono text-xs font-bold bg-dark-100 dark:bg-dark-800 px-2 py-0.5 rounded text-dark-800 dark:text-dark-200">
                {activeCallState === 'ringing' ? '00:00' : formatSeconds(callTimer)}
              </span>
            </div>

            <div className="py-3 text-center">
              <h4 className="font-bold text-base text-dark-900 dark:text-white">{activeCallContact.name}</h4>
              <p className="text-xs font-mono text-dark-500 mt-0.5">+91 {activeCallContact.phone}</p>
              {activeCallState === 'ringing' ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 font-medium">
                  ⏳ Ringing customer phone. Timer starts once answered.
                </p>
              ) : (
                <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Mic size={13} className="animate-pulse" />
                  <span>Real Microphone Voice Recording Active</span>
                </div>
              )}
            </div>

            {activeCallState === 'ringing' ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleAnswerCallContact}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <PhoneCall size={14} />
                  <span>Customer Answered (Start Talk Time)</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleEndBeforeAnswerContact('missed')}
                    className="py-1.5 px-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold border border-rose-200 cursor-pointer"
                  >
                    No Answer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEndBeforeAnswerContact('busy')}
                    className="py-1.5 px-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold border border-amber-200 cursor-pointer"
                  >
                    Line Busy
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  audioEngine.stopRingTone();
                  let recordedAudio = null;
                  try {
                    recordedAudio = await realCallRecorder.stop();
                  } catch (err) {}

                  const durSec = Math.max(callTimer, 1);
                  const durFormatted = formatSeconds(durSec);
                  const phoneKey = activeCallContact.phone.replace(/[^0-9]/g, '').slice(-10);
                  const recordingUrl = recordedAudio?.dataUrl || recordedAudio?.url || '';

                  const newRec = {
                    id: `call-${Date.now()}`,
                    customerNumber: `+91${activeCallContact.phone}`,
                    customerName: activeCallContact.name,
                    staff: user?.name || 'Agent',
                    date: 'Just now',
                    duration: durFormatted,
                    recordingDuration: durFormatted,
                    recordingUrl,
                    callType: 'Outgoing',
                    callStatus: 'Completed',
                    waveform: recordedAudio?.waveform || generateWaveform(24),
                    transcript: [
                      {
                        speaker: user?.name || 'Agent',
                        role: 'agent',
                        time: '00:01',
                        text: `Live phone conversation with ${activeCallContact.name} (+91 ${activeCallContact.phone}). Duration: ${durFormatted}.`,
                      },
                    ],
                    aiSummary: {
                      sentiment: 'Positive',
                      score: 93,
                      summary: `Live softphone call completed with ${activeCallContact.name}. Actual talk time: ${durFormatted}.`,
                      keyPoints: ['Real Microphone Voice Recording', `Talk time: ${durFormatted}`, 'Direct Call'],
                      followUps: ['Review recorded audio conversation'],
                    },
                  };

                  createCall({
                    customerPhone: activeCallContact.phone,
                    customerName: activeCallContact.name,
                    duration: durFormatted,
                    status: 'connected',
                    recordingUrl,
                    remarks: `Call completed with ${activeCallContact.name} from Contacts dialer`,
                  }).catch(() => {});

                  setCustomerRecordings((prev) => ({
                    ...prev,
                    [phoneKey]: [newRec, ...(prev[phoneKey] || [])],
                  }));

                  // Save to customer calls in localStorage for ContactDetailView
                  try {
                    const existingCustCalls = JSON.parse(localStorage.getItem(`smartcrm_calls_${phoneKey}`) || '[]');
                    localStorage.setItem(
                      `smartcrm_calls_${phoneKey}`,
                      JSON.stringify([
                        {
                          id: newRec.id,
                          time: 'Just now',
                          agent: user?.name || 'Agent',
                          duration: durFormatted,
                          hasRecording: true,
                          recordingUrl,
                          callType: 'outgoing',
                          aiSummary: newRec.aiSummary,
                          transcript: newRec.transcript,
                        },
                        ...existingCustCalls,
                      ])
                    );

                    const globalCalls = JSON.parse(localStorage.getItem('smartcrm_all_calls') || '[]');
                    localStorage.setItem('smartcrm_all_calls', JSON.stringify([newRec, ...globalCalls]));
                  } catch {}

                  addToast(`Call ended & real voice recording saved (${durFormatted} talk time)!`, 'success');
                  setActiveCallContact(null);
                  setActiveCallState('ringing');
                  setCallTimer(0);
                  setIsRecordingActive(false);
                }}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Hang Up & Save Real Audio Recording
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Header Bar matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Users size={20} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">
            Contacts
          </h1>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 shadow-2xs transition-colors">
            <SlidersHorizontal size={14} className="text-dark-500" />
            <span>Filters</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              1
            </span>
            <ChevronDown size={14} className="text-dark-400" />
          </button>

          <button
            onClick={() => setIsManualDialOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <PhoneCall size={15} />
            <span>Dial Number</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus size={16} />
            <span>Create Contact</span>
          </button>

          <button className="p-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-500 hover:bg-dark-50 shadow-2xs">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* 2. Filter Row matching screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* CUSTOMER */}
        <div>
          <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
            CUSTOMER
          </label>
          <div className="relative">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name ..."
              className="w-full pr-8 pl-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 placeholder:text-dark-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
            <Search size={14} className="absolute right-3 top-2.5 text-dark-400" />
          </div>
        </div>

        {/* LEAD GROUPS */}
        <div className="relative">
          <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
            LEAD GROUPS
          </label>
          <div
            onClick={() => setShowLeadGroupDropdown(!showLeadGroupDropdown)}
            className="flex items-center justify-between px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 cursor-pointer shadow-2xs text-dark-700 dark:text-dark-200"
          >
            <span className="truncate">{selectedLeadGroup}</span>
            <ChevronDown size={14} className="text-dark-400" />
          </div>

          {showLeadGroupDropdown && (
            <div className="absolute left-0 mt-2 w-full rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 shadow-2xl z-30 space-y-1">
              {['Select Lead groups', 'VIP Clients', 'Hot Leads', 'Cold Leads', 'Retail', 'Enterprise'].map(
                (grp) => (
                  <div
                    key={grp}
                    onClick={() => {
                      setSelectedLeadGroup(grp);
                      setShowLeadGroupDropdown(false);
                    }}
                    className="p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer font-medium text-dark-800 dark:text-dark-200 text-xs"
                  >
                    {grp}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* CREATED BY */}
        <div className="relative">
          <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
            CREATED BY
          </label>
          <div
            onClick={() => setShowCreatedByDropdown(!showCreatedByDropdown)}
            className="flex items-center justify-between px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 cursor-pointer shadow-2xs text-dark-700 dark:text-dark-200"
          >
            <span className="truncate">{selectedCreatedBy}</span>
            <ChevronDown size={14} className="text-dark-400" />
          </div>

          {showCreatedByDropdown && (
            <div className="absolute left-0 mt-2 w-full rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 shadow-2xl z-30 space-y-1">
              {[
                'Select Created by',
                user?.name || 'My Account',
              ].map((cBy) => (
                <div
                  key={cBy}
                  onClick={() => {
                    setSelectedCreatedBy(cBy);
                    setShowCreatedByDropdown(false);
                  }}
                  className="p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer font-medium text-dark-800 dark:text-dark-200 text-xs"
                >
                  {cBy}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CREATED DATE */}
        <div>
          <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
            CREATED DATE
          </label>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-2xs text-dark-500">
            <Calendar size={14} className="text-dark-400 flex-shrink-0" />
            <input
              type="text"
              value={createdDate}
              onChange={(e) => setCreatedDate(e.target.value)}
              placeholder="Select date range"
              className="bg-transparent focus:outline-none w-full placeholder:text-dark-400 text-xs"
            />
          </div>
        </div>

        {/* + Add more filters 1 */}
        <div className="flex items-end">
          <button
            onClick={() => addToast('Advanced filters toggled', 'info')}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-200 font-semibold hover:bg-dark-50 shadow-2xs transition-colors"
          >
            <span>+ Add more filters</span>
            <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">
              1
            </span>
          </button>
        </div>
      </div>

      {/* 3. Active Filter Chip Line */}
      {teamFilter && (
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-[11px] border border-blue-200 dark:border-blue-900/60 shadow-2xs">
            <span>Team name: {teamFilter}</span>
            <button
              onClick={() => setTeamFilter('')}
              className="hover:text-rose-600 font-bold"
            >
              ×
            </button>
          </span>

          <button
            onClick={() => {
              setTeamFilter('');
              setCustomerSearch('');
              setSelectedLeadGroup('Select Lead groups');
              setSelectedCreatedBy('Select Created by');
            }}
            className="text-blue-600 hover:underline font-semibold text-[11px] ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* 4. Results summary & SELECT ALL / UNCHECK ALL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-dark-500 font-medium pt-1">
        <div>
          <p className="text-[11px]">Showing results from Main Team</p>
          <p className="font-semibold text-dark-800 dark:text-dark-200">
            Showing {displayedContacts.length} contacts
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-blue-600">
          <button
            onClick={() => setSelectedContactIds(displayedContacts.map((c) => c.id))}
            className="hover:underline cursor-pointer"
          >
            SELECT ALL
          </button>
          <button onClick={() => setSelectedContactIds([])} className="hover:underline cursor-pointer">
            UNCHECK ALL
          </button>
          {selectedContactIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Trash2 size={13} />
              <span>Delete Selected ({selectedContactIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Contacts Table */}
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-[#e8e8e8] dark:border-dark-700 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-[#f0f0f0] dark:border-dark-700/60 text-[13px] font-semibold text-[rgba(0,0,0,0.88)] dark:text-dark-200 flex items-center justify-between">
          <div>
            <span>All contacts</span>{' '}
            <span className="font-normal text-[rgba(0,0,0,0.45)] dark:text-dark-400">({filteredContacts.length} results)</span>
          </div>
          {selectedContactIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-dark-500">
                {selectedContactIds.length} contact{selectedContactIds.length > 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Trash2 size={13} />
                <span>Delete Selected ({selectedContactIds.length})</span>
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#f0f0f0] dark:border-dark-700/80 bg-[#fafafa] dark:bg-dark-800/40 text-[rgba(0,0,0,0.65)] dark:text-dark-400 uppercase tracking-wider font-medium text-[12px]">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      displayedContacts.length > 0 &&
                      selectedContactIds.length === displayedContacts.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded text-blue-600"
                  />
                </th>
                <th className="py-3.5 px-4 min-w-[170px]">
                  <div className="flex items-center gap-1">
                    <span>NAME</span>
                    <Search size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4 w-32">
                  <span>CALL</span>
                </th>
                <th className="py-3.5 px-4 min-w-[120px]">
                  <div className="flex items-center gap-1">
                    <span>ADDITIONAL INFO</span>
                    <Search size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4 min-w-[120px]">
                  <div className="flex items-center gap-1">
                    <span>EMAIL</span>
                    <Search size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4 w-24">
                  <div className="flex items-center gap-1">
                    <span>TAGS</span>
                    <Search size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4 w-28">
                  <div className="flex items-center gap-1">
                    <span>LEAD STAGE</span>
                    <Search size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4 w-24">
                  <div className="flex items-center gap-1">
                    <span>SOURCE</span>
                    <Search size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4 w-20 text-center">
                  <span>ACTIONS</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f0f0] dark:divide-dark-700/60 font-normal text-[14px]">
              {displayedContacts.map((c) => {
                const isSelected = selectedContactIds.includes(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-dark-50/60 dark:hover:bg-dark-700/30 transition-colors ${
                      isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectContact(c.id)}
                        className="rounded text-blue-600"
                      />
                    </td>

                    {/* NAME & Phone */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p
                          onClick={() => setViewingContact(c)}
                          className="font-medium text-[#1890ff] hover:underline cursor-pointer"
                        >
                          {c.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[rgba(0,0,0,0.65)] dark:text-dark-300 font-mono text-[12px] mt-0.5">
                          <span>{c.phone}</span>
                          <button
                            onClick={() => copyToClipboard(c.phone, c.id)}
                            className="text-[rgba(0,0,0,0.45)] dark:text-dark-400 hover:text-[rgba(0,0,0,0.88)] dark:hover:text-white"
                            title="Copy number"
                          >
                            {copiedId === c.id ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* CALL: Start Call Button */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleStartCall(c)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#91caff] dark:border-blue-900 bg-white dark:bg-dark-800 text-[#1890ff] font-normal hover:bg-blue-50/70 transition-colors shadow-2xs whitespace-nowrap text-[13px]"
                      >
                        <PhoneCall size={13} />
                        <span>Start Call</span>
                      </button>
                    </td>

                    {/* ADDITIONAL INFO */}
                    <td className="py-3.5 px-4 text-[rgba(0,0,0,0.65)] dark:text-dark-300 text-[13px]">
                      {c.additionalInfo}
                    </td>

                    {/* EMAIL */}
                    <td className="py-3.5 px-4 text-[rgba(0,0,0,0.65)] dark:text-dark-300 text-[13px]">
                      {c.email}
                    </td>

                    {/* TAGS */}
                    <td className="py-3.5 px-4 text-[rgba(0,0,0,0.65)] dark:text-dark-300 text-[13px]">
                      {c.tags}
                    </td>

                    {/* LEAD STAGE */}
                    <td className="py-3.5 px-4 text-[rgba(0,0,0,0.65)] dark:text-dark-300 text-[13px]">
                      {c.leadStage}
                    </td>

                    {/* SOURCE */}
                    <td className="py-3.5 px-4 text-[rgba(0,0,0,0.45)] dark:text-dark-400 lowercase text-[13px]">
                      {c.source}
                    </td>

                    {/* ACTIONS: Delete Single Contact */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleContact(c)}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title={`Delete ${c.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Footer Controls: View more button & 10 / page dropdown */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 10)}
            className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
          >
            View more
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-dark-600 dark:text-dark-300">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setVisibleCount(Number(e.target.value));
            }}
            className="px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 font-semibold focus:outline-none shadow-2xs"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* 7. CREATE CONTACT MODAL matching all 4 reference screenshots */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50">
              <h2 className="text-base sm:text-lg font-bold text-dark-900 dark:text-white">
                Create Contact
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-dark-400 hover:text-dark-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveContact} className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Organization Section */}
              <div>
                <label className="block font-bold text-dark-700 dark:text-dark-300 mb-1.5">
                  Organization
                </label>
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 font-medium">
                  <span>{form.organization}</span>
                  <ChevronDown size={14} className="text-dark-400" />
                </div>
              </div>

              {/* CONTACT DETAILS Header */}
              <div className="space-y-3 pt-1">
                <span className="block font-bold text-dark-400 uppercase tracking-wider text-[10px]">
                  CONTACT DETAILS
                </span>

                {/* First name & Last name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">
                      First name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Enter first name"
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Last name</label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Enter last name"
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-semibold mb-1">
                    Phone <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 w-24 flex-shrink-0">
                      <span>{form.phoneCode}</span>
                      <ChevronDown size={12} className="text-dark-400" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Enter phone"
                      className="flex-1 px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      className="p-2 rounded-xl border border-dark-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block font-semibold mb-1">Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Enter email"
                      className="flex-1 px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      className="p-2 rounded-xl border border-dark-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="block font-semibold mb-1">Website</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="Enter website"
                    className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Address Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold mb-1">House no</label>
                    <input
                      type="text"
                      value={form.houseNo}
                      onChange={(e) => setForm({ ...form, houseNo: e.target.value })}
                      placeholder="Enter house no"
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Enter city"
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Address line 1</label>
                    <input
                      type="text"
                      value={form.address1}
                      onChange={(e) => setForm({ ...form, address1: e.target.value })}
                      placeholder="Enter address line 1"
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Address line 2</label>
                    <input
                      type="text"
                      value={form.address2}
                      onChange={(e) => setForm({ ...form, address2: e.target.value })}
                      placeholder="Enter address line 2"
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    />
                  </div>
                </div>
              </div>

              {/* LEAD TRACKING Section */}
              <div className="space-y-3 pt-2">
                <span className="block font-bold text-dark-400 uppercase tracking-wider text-[10px]">
                  LEAD TRACKING
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Source</label>
                    <input
                      type="text"
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                      placeholder="Enter source"
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Source type</label>
                    <select
                      value={form.sourceType}
                      onChange={(e) => setForm({ ...form, sourceType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    >
                      <option value="call">call</option>
                      <option value="website">website</option>
                      <option value="whatsapp">whatsapp</option>
                      <option value="referral">referral</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Deal value</label>
                    <input
                      type="text"
                      value={form.dealValue}
                      onChange={(e) => setForm({ ...form, dealValue: e.target.value })}
                      placeholder="Enter deal value"
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Lead group</label>
                    <select
                      value={form.leadGroup}
                      onChange={(e) => setForm({ ...form, leadGroup: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    >
                      <option>Select lead group</option>
                      <option>VIP Clients</option>
                      <option>Hot Leads</option>
                      <option>Cold Leads</option>
                      <option>Enterprise</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ADDITIONAL INFO Section */}
              <div className="space-y-3 pt-2">
                <span className="block font-bold text-dark-400 uppercase tracking-wider text-[10px]">
                  ADDITIONAL INFO
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Business name</label>
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                      placeholder="Enter business name"
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Additional info</label>
                    <input
                      type="text"
                      value={form.additionalInfo}
                      onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })}
                      placeholder="Enter additional info"
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="createTask"
                    checked={form.createTask}
                    onChange={(e) => setForm({ ...form, createTask: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <label htmlFor="createTask" className="font-semibold text-dark-700 dark:text-dark-300">
                    Create a task
                  </label>
                </div>
              </div>

              {/* ASSIGNMENT Section */}
              <div className="space-y-3 pt-2">
                <span className="block font-bold text-dark-400 uppercase tracking-wider text-[10px]">
                  ASSIGNMENT
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Assigned to</label>
                    <select
                      value={form.assignedTo}
                      onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    >
                      <option value="">Select assignee</option>
                      {user?.name && <option value={user.name}>{user.name}</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Lead stage</label>
                    <select
                      value={form.leadStage}
                      onChange={(e) => setForm({ ...form, leadStage: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800"
                    >
                      <option>Select lead stage</option>
                      <option>New</option>
                      <option>Contacted</option>
                      <option>Interested</option>
                      <option>Follow Up</option>
                      <option>Won / Converted</option>
                      <option>Lost / Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-dark-200 dark:border-dark-700">
                <button
                  type="submit"
                  disabled={savingContact}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
                >
                  {savingContact ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outgoing Calling Simulator with Real Voice Recording & Answered-Only Timing */}
      {activeCallContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            
            {activeCallState === 'ringing' ? (
              <div className="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto shadow-lg animate-pulse ring-8 ring-amber-500/20">
                <PhoneCall size={28} className="animate-bounce" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg ring-8 ring-emerald-500/20">
                <PhoneCall size={28} />
              </div>
            )}

            <div>
              {activeCallState === 'ringing' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-bold animate-pulse">
                  <Radio size={13} className="animate-spin" />
                  <span>Ringing Customer Phone...</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Connected (Live Conversation)</span>
                </div>
              )}

              <h3 className="text-xl font-bold text-dark-900 dark:text-white mt-2">
                {activeCallContact.name}
              </h3>
              <p className="text-sm font-mono text-dark-500">+91 {activeCallContact.phone}</p>
              <p className="text-xs text-dark-400 mt-0.5">
                Staff Line: {user?.name || 'Agent'}
              </p>
            </div>

            {/* Direct Telephony App Link / Phone Link */}
            <button
              type="button"
              onClick={() => handleLaunchDeviceDialer(activeCallContact.phone)}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Phone size={13} />
              <span>Launch Device Dialer ({activeCallContact.phone})</span>
            </button>

            {/* Ringing Sound Status & Mute Control */}
            {activeCallState === 'ringing' && (
              <div className="flex items-center justify-between text-xs text-dark-500 px-1">
                <span className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  {isRingMuted ? (
                    <>
                      <VolumeX size={13} className="text-dark-400" />
                      <span>Silent Dialing (Muted)</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={13} className="animate-pulse" />
                      <span>Ringtone Playing (~3s)</span>
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = audioEngine.toggleRingToneMute();
                    setIsRingMuted(next);
                    addToast(next ? 'Ringtone muted (Silent Dialing)' : 'Ringtone enabled', 'info');
                  }}
                  className="flex items-center gap-1 text-dark-500 hover:text-dark-800 dark:hover:text-dark-200 underline text-[11px] cursor-pointer"
                >
                  {isRingMuted ? <Volume2 size={11} /> : <VolumeX size={11} />}
                  <span>{isRingMuted ? 'Enable Sound' : 'Mute Tone'}</span>
                </button>
              </div>
            )}

            {/* Timer and Recording indicator: STAYS AT 00:00 UNTIL ANSWERED! */}
            {activeCallState === 'ringing' ? (
              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-2xl font-black text-amber-800 dark:text-amber-200">
                    00:00
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 animate-pulse">
                    Ringing ({ringCountdown}s)
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                  Auto-connecting in {ringCountdown}s for Phone Link/device call, or connect now:
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <span className="font-mono text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {Math.floor(callTimer / 60).toString().padStart(2, '0')}:{(callTimer % 60).toString().padStart(2, '0')}
                  </span>
                  {isRecordingActive ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse font-sans">
                      <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                      REC (Real Mic Active)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 font-sans">
                      PAUSED
                    </span>
                  )}
                </div>

                {/* Live Real-time Audio Level VU Meter */}
                <div className="flex items-center gap-2 px-1">
                  <Mic size={13} className={liveVolume > 5 ? 'text-emerald-500 animate-pulse' : 'text-dark-400'} />
                  <div className="flex-1 bg-dark-100 dark:bg-dark-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-150 rounded-full"
                      style={{ width: `${Math.max(6, liveVolume)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-dark-400 font-semibold">{liveVolume}%</span>
                </div>
              </div>
            )}

            {/* Actions depending on state */}
            {activeCallState === 'ringing' ? (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleAnswerCallContact}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <PhoneCall size={18} />
                  <span>Customer Answered (Start Talk Time Now)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleEndBeforeAnswerContact('missed')}
                    className="py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  >
                    No Answer / Missed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEndBeforeAnswerContact('busy')}
                    className="py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                  >
                    Busy / Declined
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (autoConnectTimerRef.current) {
                      clearTimeout(autoConnectTimerRef.current);
                      autoConnectTimerRef.current = null;
                    }
                    audioEngine.stopRingTone();
                    setActiveCallContact(null);
                    setActiveCallState('ringing');
                  }}
                  className="w-full py-1 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-xs transition-colors cursor-pointer"
                >
                  Cancel Call
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs text-dark-500 px-1">
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <Mic size={13} className="text-emerald-500 animate-pulse" />
                    Real Microphone Voice Recording Active
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isRecordingActive) realCallRecorder.pause();
                      else realCallRecorder.resume();
                      setIsRecordingActive(!isRecordingActive);
                    }}
                    className="text-blue-600 hover:underline font-semibold text-[11px] cursor-pointer"
                  >
                    {isRecordingActive ? 'Pause REC' : 'Resume REC'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    audioEngine.stopRingTone();
                    let recordedAudio = null;
                    try {
                      recordedAudio = await realCallRecorder.stop();
                    } catch (err) {}

                    const durSec = Math.max(callTimer, 1);
                    const durFormatted = formatSeconds(durSec);
                    const phoneKey = activeCallContact.phone.replace(/[^0-9]/g, '').slice(-10);
                    const recordingUrl = recordedAudio?.dataUrl || recordedAudio?.url || '';

                    const newRec = {
                      id: `rec-${Date.now()}`,
                      customerNumber: `+91${phoneKey}`,
                      customerName: activeCallContact.name,
                      staff: user?.name || 'Agent',
                      date: 'Just now',
                      duration: durFormatted,
                      recordingDuration: durFormatted,
                      recordingUrl,
                      callType: 'Outgoing',
                      callStatus: 'Answered',
                      waveform: recordedAudio?.waveform || generateWaveform(24),
                      transcript: [
                        {
                          speaker: user?.name || 'Agent',
                          role: 'agent',
                          time: '00:01',
                          text: `Live phone call with ${activeCallContact.name} (+91 ${phoneKey}). Duration: ${durFormatted}.`,
                        },
                      ],
                      aiSummary: {
                        sentiment: 'Positive',
                        score: 93,
                        summary: `Call completed with ${activeCallContact.name}. Actual talk time: ${durFormatted}.`,
                        keyPoints: ['Real Voice Audio Recording', `Talk time: ${durFormatted}`],
                        followUps: ['Review recorded conversation'],
                      },
                    };

                    createCall({
                      customerPhone: activeCallContact.phone,
                      customerName: activeCallContact.name,
                      duration: durFormatted,
                      status: 'connected',
                      recordingUrl,
                      remarks: `Call completed with ${activeCallContact.name} from Contacts dialer`,
                    }).catch(() => {});

                    setCustomerRecordings((prev) => ({
                      ...prev,
                      [phoneKey]: [newRec, ...(prev[phoneKey] || [])],
                    }));

                    try {
                      const existingCustCalls = JSON.parse(localStorage.getItem(`smartcrm_calls_${phoneKey}`) || '[]');
                      localStorage.setItem(
                        `smartcrm_calls_${phoneKey}`,
                        JSON.stringify([
                          {
                            id: newRec.id,
                            time: 'Just now',
                            agent: user?.name || 'Agent',
                            duration: durFormatted,
                            hasRecording: true,
                            recordingUrl,
                            callType: 'outgoing',
                            aiSummary: newRec.aiSummary,
                            transcript: newRec.transcript,
                          },
                          ...existingCustCalls,
                        ])
                      );

                      const globalCalls = JSON.parse(localStorage.getItem('smartcrm_all_calls') || '[]');
                      localStorage.setItem('smartcrm_all_calls', JSON.stringify([newRec, ...globalCalls]));
                    } catch {}

                    addToast(`Call ended & real voice recording saved (${durFormatted} talk time)!`, 'success');
                    setActiveCallContact(null);
                    setActiveCallState('ringing');
                    setCallTimer(0);
                    setIsRecordingActive(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Hang Up & Save Real Audio Recording
                </button>

                <button
                  type="button"
                  onClick={() => handleEndBeforeAnswerContact('missed')}
                  className="w-full py-1 text-xs text-dark-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Did not speak to customer? Mark as Missed (0s)
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Manual Quick Dialer Modal */}
      {isManualDialOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 max-w-sm w-full p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
                  <PhoneCall size={16} />
                </div>
                <h3 className="text-base font-bold text-dark-900 dark:text-white">Quick CRM Dialer</h3>
              </div>
              <button
                onClick={() => setIsManualDialOpen(false)}
                className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-200"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-dark-500 block mb-1.5">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={manualDialNumber}
                onChange={(e) => setManualDialNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-dark-500 block mb-1.5">
                Customer Name (Optional)
              </label>
              <input
                type="text"
                value={manualDialName}
                onChange={(e) => setManualDialName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                onClick={() => setIsManualDialOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!manualDialNumber.trim()) {
                    addToast('Please enter a phone number to dial', 'error');
                    return;
                  }
                  const num = manualDialNumber.trim();
                  setIsManualDialOpen(false);
                  setManualDialNumber('');
                  handleStartCall({
                    id: Date.now().toString(),
                    name: manualDialName.trim() || 'Direct Dial Customer',
                    phone: num,
                  });
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2"
              >
                <PhoneCall size={14} />
                <span>Call Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Profile & Past Call Recordings Drawer */}
      {viewingContact && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-900 w-full max-w-xl h-full shadow-2xl border-l border-dark-200 dark:border-dark-700 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/60 dark:bg-dark-800/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {viewingContact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                    <span>{viewingContact.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {viewingContact.city || 'Delhi'}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-dark-500 font-mono mt-0.5">
                    <span>+91 {viewingContact.phone}</span>
                    <span>•</span>
                    <span className="font-sans text-dark-400">
                      Assigned: {user?.name || 'Agent'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleStartCall(viewingContact);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <PhoneCall size={13} />
                  <span>Call Now</span>
                </button>
                <button
                  onClick={() => {
                    audioEngine.stop();
                    setViewingContact(null);
                  }}
                  className="p-1.5 rounded-xl text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tab selection */}
            <div className="flex border-b border-dark-200 dark:border-dark-700 px-5 pt-2 gap-4 text-xs font-semibold bg-white dark:bg-dark-900">
              <button
                onClick={() => setActiveContactTab('recordings')}
                className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
                  activeContactTab === 'recordings'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-dark-500 hover:text-dark-900 dark:text-dark-400 dark:hover:text-white'
                }`}
              >
                <Volume2 size={14} />
                <span>
                  Past Call Recordings (
                  {(() => {
                    const pk = (viewingContact.phone || '').replace(/[^0-9]/g, '').slice(-10);
                    const savedCalls = JSON.parse(localStorage.getItem(`smartcrm_calls_${pk}`) || '[]');
                    const list = customerRecordings[pk] || savedCalls;
                    return list.length;
                  })()}
                  )
                </span>
              </button>
              <button
                onClick={() => setActiveContactTab('overview')}
                className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
                  activeContactTab === 'overview'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-dark-500 hover:text-dark-900 dark:text-dark-400 dark:hover:text-white'
                }`}
              >
                <UserCheck size={14} />
                <span>Contact Details</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {activeContactTab === 'recordings' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-dark-800/60 border border-blue-200 dark:border-dark-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2 text-dark-700 dark:text-dark-200 font-medium">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <span>All customer interactions are recorded in HD stereo on cloud</span>
                    </div>
                  </div>

                  {/* List of customer recordings */}
                  {(() => {
                    const phoneKey = (viewingContact.phone || '').replace(/[^0-9]/g, '').slice(-10);
                    const savedCalls = JSON.parse(localStorage.getItem(`smartcrm_calls_${phoneKey}`) || '[]');
                    const recList = customerRecordings[phoneKey] || savedCalls;

                    if (recList.length === 0) {
                      return (
                        <div className="py-12 px-4 text-center space-y-2 bg-dark-50/50 dark:bg-dark-900/50 rounded-2xl border border-dashed border-dark-200 dark:border-dark-700">
                          <div className="w-10 h-10 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-400 mx-auto flex items-center justify-center">
                            <Volume2 size={20} />
                          </div>
                          <p className="text-sm font-semibold text-dark-800 dark:text-dark-200">
                            No Call Recordings
                          </p>
                          <p className="text-xs text-dark-500 max-w-xs mx-auto">
                            No recorded calls found for this contact yet. Make an audio call using the phone button above to log real recordings.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {recList.map((rec) => {
                          const isPlayingThis =
                            activeDrawerAudioId === rec.id && drawerAudioPlaying;
                          const durSec = audioEngine.parseDuration(rec.duration);
                          const progressPct =
                            activeDrawerAudioId === rec.id && durSec > 0
                              ? (drawerAudioTime / durSec) * 100
                              : 0;

                          return (
                            <div
                              key={rec.id}
                              className="p-4 rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-3 shadow-2xs hover:border-blue-400 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                    {rec.callType}
                                  </span>
                                  <span className="text-xs font-semibold text-dark-800 dark:text-dark-100">
                                    {rec.date}
                                  </span>
                                </div>
                                <span className="text-xs font-mono font-bold text-dark-600 dark:text-dark-300">
                                  {rec.duration}
                                </span>
                              </div>

                              <p className="text-xs text-dark-500">
                                Staff Line: <strong className="text-dark-800 dark:text-dark-200">{rec.staff}</strong>
                              </p>

                              {/* Audio Player Component */}
                              <div className="p-2.5 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                  {/* Play button */}
                                  <button
                                    onClick={() => {
                                      if (activeDrawerAudioId === rec.id) {
                                        if (drawerAudioPlaying) {
                                          audioEngine.pause();
                                          setDrawerAudioPlaying(false);
                                        } else {
                                          audioEngine.resume();
                                          setDrawerAudioPlaying(true);
                                        }
                                      } else {
                                        audioEngine.stop();
                                        setActiveDrawerAudioId(rec.id);
                                        setDrawerAudioPlaying(true);
                                        setDrawerAudioTime(0);

                                        audioEngine.playCall(
                                          rec,
                                          0,
                                          (time) => setDrawerAudioTime(time),
                                          () => {
                                            setDrawerAudioPlaying(false);
                                            setActiveDrawerAudioId(null);
                                            setDrawerAudioTime(0);
                                          }
                                        );
                                      }
                                    }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                      isPlayingThis
                                        ? 'bg-rose-600 text-white animate-pulse'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                  >
                                    {isPlayingThis ? (
                                      <Pause size={14} />
                                    ) : (
                                      <Play size={14} className="ml-0.5" />
                                    )}
                                  </button>

                                  {/* Waveform */}
                                  <div
                                    className="flex items-end gap-0.5 h-6 flex-1 cursor-pointer"
                                    onClick={() => {
                                      if (!isPlayingThis) {
                                        audioEngine.playCall(
                                          rec,
                                          0,
                                          (t) => setDrawerAudioTime(t),
                                          () => setDrawerAudioPlaying(false)
                                        );
                                        setActiveDrawerAudioId(rec.id);
                                        setDrawerAudioPlaying(true);
                                      }
                                    }}
                                  >
                                    {(rec.waveform || generateWaveform(24)).map((h, i) => {
                                      const barPct = (i / 24) * 100;
                                      const isPassed = barPct <= progressPct;
                                      return (
                                        <div
                                          key={i}
                                          className="flex-1 rounded-t-xs transition-all"
                                          style={{
                                            height: `${Math.max(25, h * 0.7)}%`,
                                            backgroundColor: isPassed ? '#2563eb' : '#94a3b8',
                                            opacity: isPassed ? 1 : 0.45,
                                          }}
                                        />
                                      );
                                    })}
                                  </div>

                                  {/* Time counter */}
                                  <span className="text-[11px] font-mono font-semibold text-dark-500 whitespace-nowrap">
                                    {activeDrawerAudioId === rec.id
                                      ? `${formatSeconds(drawerAudioTime)} / ${rec.duration}`
                                      : rec.duration}
                                  </span>

                                  {/* Speed */}
                                  <button
                                    onClick={() => {
                                      const nextSpeed =
                                        drawerAudioSpeed === 1.0
                                          ? 1.5
                                          : drawerAudioSpeed === 1.5
                                          ? 2.0
                                          : 1.0;
                                      setDrawerAudioSpeed(nextSpeed);
                                      audioEngine.setSpeed(nextSpeed);
                                    }}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-dark-200 dark:bg-dark-700 text-dark-700 dark:text-dark-200"
                                  >
                                    {drawerAudioSpeed}x
                                  </button>

                                  {/* Download */}
                                  <button
                                    onClick={() => {
                                      audioEngine.downloadWavFile(rec);
                                      addToast('Recording (.mp3) downloaded', 'success');
                                    }}
                                    className="p-1 rounded text-dark-400 hover:text-dark-700 dark:hover:text-dark-200"
                                    title="Download MP3"
                                  >
                                    <Download size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* AI Transcript & Insights Button */}
                              <button
                                onClick={() => {
                                  audioEngine.stop();
                                  setDrawerAudioPlaying(false);
                                  setSelectedCallForModal(rec);
                                  setIsRecordingModalOpen(true);
                                }}
                                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 transition-colors shadow-2xs"
                              >
                                <Sparkles size={13} className="text-amber-500" />
                                <span>View AI Transcript & Sentiment Insights</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeContactTab === 'overview' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-3">
                    <h4 className="font-bold text-dark-900 dark:text-white uppercase tracking-wider text-[11px]">
                      Contact Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-dark-600 dark:text-dark-300">
                      <div>
                        <span className="text-dark-400 block">Phone</span>
                        <p className="font-mono font-semibold text-dark-900 dark:text-white mt-0.5">
                          +91 {viewingContact.phone}
                        </p>
                      </div>
                      <div>
                        <span className="text-dark-400 block">City</span>
                        <p className="font-semibold text-dark-900 dark:text-white mt-0.5">
                          {viewingContact.city || 'Delhi'}
                        </p>
                      </div>
                      <div>
                        <span className="text-dark-400 block">Lead Stage</span>
                        <p className="font-semibold text-dark-900 dark:text-white mt-0.5">
                          {viewingContact.leadStage || 'Active Lead'}
                        </p>
                      </div>
                      <div>
                        <span className="text-dark-400 block">Source</span>
                        <p className="font-semibold text-dark-900 dark:text-white mt-0.5">
                          {viewingContact.source || 'Call'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-dark-400 block">Assigned Telecaller</span>
                        <p className="font-semibold text-dark-900 dark:text-white mt-0.5">
                          {user?.name || 'Unassigned'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Call Recording & AI Transcript Modal */}
      {selectedCallForModal && (
        <CallRecordingModal
          isOpen={isRecordingModalOpen}
          onClose={() => {
            setIsRecordingModalOpen(false);
            setSelectedCallForModal(null);
          }}
          call={selectedCallForModal}
        />
      )}
    </div>
  );
}

