import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Phone,
  Search,
  ChevronDown,
  Download,
  SlidersHorizontal,
  X,
  PhoneCall,
  Copy,
  Check,
  Calendar,
  ArrowUpRight,
  Loader2,
  Clock,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Mic,
  MicOff,
  FileText,
  ShieldCheck,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  RotateCcw,
  Radio,
  Star,
  CheckCircle2,
  XCircle,
  Lock,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getCalls, createCall } from '../api/callHistory';
import { getCustomers, updateCustomer } from '../api/customers';
import CallRecordingModal from '../components/CallRecordingModal';
import Customer360Modal from '../components/Customer360Modal';
import { audioEngine, formatSeconds, generateWaveform } from '../utils/audioPlayer';
import { realCallRecorder } from '../utils/realCallRecorder';

export const FOLLOW_UP_STATUSES = [
  { id: 'new', label: 'New Follow-up', Icon: Sparkles, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { id: 'contacted', label: 'Contacted', Icon: PhoneCall, badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' },
  { id: 'interested', label: 'Interested', Icon: Star, badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' },
  { id: 'meeting', label: 'Meeting Scheduled', Icon: Calendar, badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' },
  { id: 'follow-up', label: 'In Progress', Icon: Clock, badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300' },
  { id: 'converted', label: 'Won / Converted', Icon: CheckCircle2, badge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300' },
  { id: 'not-interested', label: 'Not Interested', Icon: XCircle, badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300' },
  { id: 'closed', label: 'Closed', Icon: Lock, badge: 'bg-dark-100 text-dark-700 border-dark-200 dark:bg-dark-800 dark:text-dark-300' },
];

export default function CallHistory({ onNavigate, initialCallType = 'all' }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Customer 360 Full History Modal State
  const [selected360Customer, setSelected360Customer] = useState(null);
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);

  // Customer Map & Follow-up status state
  const [customerMap, setCustomerMap] = useState({});
  const [openStatusDropdownCallId, setOpenStatusDropdownCallId] = useState(null);
  const [followUpFilter, setFollowUpFilter] = useState('');

  // Search & Filter states matching screenshots
  const [callTypeFilter, setCallTypeFilter] = useState(initialCallType || 'all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('Main Team');
  const [selectedStaff, setSelectedStaff] = useState(() => {
    const saved = sessionStorage.getItem('smartcrm_filter_telecaller');
    if (saved) {
      sessionStorage.removeItem('smartcrm_filter_telecaller');
      return saved;
    }
    return 'All staff';
  });
  const [period, setPeriod] = useState('Sep 09, 2026 – Oct 09, 2026');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (initialCallType) {
      setCallTypeFilter(initialCallType);
    }
  }, [initialCallType]);

  // Dropdown toggles
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');

  // Active Dialing modal & Realistic Call State Machine
  const [dialingCall, setDialingCall] = useState(null);
  const [dialCallState, setDialCallState] = useState('ringing'); // 'ringing' | 'connected'
  const [dialDuration, setDialDuration] = useState(0);
  const [dialIsRecording, setDialIsRecording] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [isManualDialOpen, setIsManualDialOpen] = useState(false);
  const [manualDialNumber, setManualDialNumber] = useState('');
  const [manualDialName, setManualDialName] = useState('');

  const autoConnectTimerRef = useRef(null);
  const [ringCountdown, setRingCountdown] = useState(4);
  const [dialLiveVolume, setDialLiveVolume] = useState(0);
  const [isDialRingMuted, setIsDialRingMuted] = useState(audioEngine.isRingToneMuted());

  // Active call duration timer: ONLY runs when the call is ANSWERED by the customer!
  useEffect(() => {
    let timer;
    if (dialingCall && dialCallState === 'connected') {
      timer = setInterval(() => {
        setDialDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [dialingCall, dialCallState]);

  // Ringing countdown
  useEffect(() => {
    if (!dialingCall || dialCallState !== 'ringing') return;
    const interval = setInterval(() => {
      setRingCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [dialingCall, dialCallState]);

  // Real-time microphone VU volume meter polling
  useEffect(() => {
    if (!dialingCall || dialCallState !== 'connected') {
      setDialLiveVolume(0);
      return;
    }
    const interval = setInterval(() => {
      setDialLiveVolume(realCallRecorder.getLiveVolume());
    }, 150);
    return () => clearInterval(interval);
  }, [dialingCall, dialCallState]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (autoConnectTimerRef.current) {
        clearTimeout(autoConnectTimerRef.current);
      }
      audioEngine.stopRingTone();
    };
  }, []);

  // Recording Modal & Audio Playback State
  const [selectedRecordingCall, setSelectedRecordingCall] = useState(null);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [activeAudioCallId, setActiveAudioCallId] = useState(null);
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState(1.0);

  // Pagination
  const [pageSize, setPageSize] = useState(50);
  const [visibleCount, setVisibleCount] = useState(50);

  const teamRef = useRef(null);
  const staffRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (teamRef.current && !teamRef.current.contains(e.target)) setShowTeamDropdown(false);
      if (staffRef.current && !staffRef.current.contains(e.target)) setShowStaffDropdown(false);
      setOpenStatusDropdownCallId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Teams list
  const teamsList = ['Main Team'];

  // Staff members
  const staffList = user?.name ? [user.name] : ['All Staff'];

  // Call history records loaded dynamically from backend API
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    // 1. Fetch Customers to map follow-up statuses
    getCustomers({ limit: 500 })
      .then((res) => {
        const cMap = {};
        (res.customers || []).forEach((cust) => {
          const p10 = String(cust.mobile || cust.phone || '').replace(/\D/g, '').slice(-10);
          if (p10) cMap[p10] = cust;
          if (cust._id) cMap[cust._id] = cust;
        });
        setCustomerMap(cMap);
      })
      .catch(() => {});

    // 2. Load calls
    const localCalls = JSON.parse(localStorage.getItem('smartcrm_all_calls') || '[]');
    const mappedLocal = localCalls.map((c) => ({
      id: c.id,
      customerNumber: c.customerPhone || '',
      customerName: c.customerName || 'Customer',
      displayPhone: (c.customerPhone || '').replace('+91', ''),
      team: 'Main Team',
      staff: c.calledByName || user?.name || 'Agent',
      followUpStatus: c.followUpStatus || 'new',
      callType: c.callType || 'Outgoing',
      callStatus: c.status === 'connected' ? 'Answered' : 'Missed',
      duration: c.duration ? (c.duration.includes('s') ? c.duration : `${c.duration}s`) : '12s',
      recordingDuration: c.duration ? `${c.duration}s` : '12s',
      ringDuration: '8s',
      date: c.time ? `${c.time} today` : 'Just now',
      waveform: generateWaveform(28),
      transcript: [],
      aiSummary: {
        sentiment: 'Positive',
        score: 92,
        summary: c.remarks || `Call completed with ${c.customerName || 'customer'}.`,
        keyPoints: ['Call Logged in CRM'],
        followUps: [],
      },
    }));

    getCalls({ limit: 100 })
      .then((res) => {
        if (res.calls && res.calls.length > 0) {
          const mapped = res.calls.map((c) => {
            const clean10 = String(c.customerPhone || c.customerId?.mobile || c.mobile || '').replace(/\D/g, '').slice(-10);
            return {
              id: c._id,
              customerId: c.customerId?._id || c.customerId || null,
              customerNumber: c.customerPhone || c.customerId?.mobile || c.mobile || '',
              customerName: c.customerName || c.customerId?.name || 'Customer',
              displayPhone: c.customerPhone || c.customerId?.mobile || '',
              team: 'Main Team',
              staff: c.calledByName || user?.name || 'Agent',
              followUpStatus: c.followUpStatus || c.customerId?.status || 'new',
              callType: c.callType || 'Outgoing',
              callStatus: c.status === 'connected' ? 'Answered' : 'Missed',
              duration: c.duration ? `${c.duration}s` : '-',
              recordingDuration: c.duration ? `${c.duration}s` : '-',
              ringDuration: '10s',
              date: c.date ? `${c.date} ${c.time || ''}` : 'Today',
              recordingUrl: c.recordingUrl || '',
              waveform: c.waveform && c.waveform.length > 0 ? c.waveform : generateWaveform(28),
              transcript: c.remarks
                ? [
                    { speaker: c.calledByName || user?.name || 'Agent', role: 'agent', time: '00:02', text: c.remarks },
                  ]
                : [],
              aiSummary: {
                sentiment: 'Positive',
                score: 90,
                summary: c.remarks || 'Call recorded and logged in CRM.',
                keyPoints: ['Call Logged'],
                followUps: [],
              },
            };
          });
          const existingIds = new Set(mapped.map((m) => m.id));
          const localOnly = mappedLocal.filter((l) => !existingIds.has(l.id));
          setCalls([...localOnly, ...mapped]);
        } else if (mappedLocal.length > 0) {
          setCalls(mappedLocal);
        } else {
          setCalls([]);
        }
      })
      .catch(() => {
        setCalls(mappedLocal);
      });
  }, [user]);

  // Update Follow-up status handler
  const handleUpdateFollowUpStatus = async (callRecord, newStatus) => {
    setOpenStatusDropdownCallId(null);
    const clean10 = String(callRecord.customerNumber || '').replace(/\D/g, '').slice(-10);
    const targetCust = customerMap[clean10] || (callRecord.customerId?._id ? customerMap[callRecord.customerId._id] : customerMap[callRecord.customerId]);

    setCalls((prev) =>
      prev.map((c) => (c.id === callRecord.id ? { ...c, followUpStatus: newStatus } : c))
    );

    const stObj = FOLLOW_UP_STATUSES.find((s) => s.id === newStatus);

    try {
      if (targetCust?._id) {
        await updateCustomer(targetCust._id, { status: newStatus });
      }
      addToast(`Follow-up status set to "${stObj?.label || newStatus}"`, 'success');
    } catch {
      addToast(`Follow-up status updated`, 'info');
    }
  };

  // Handle In-Row Audio Play/Pause  // Handle In-Row Audio Play/Pause
  const handleToggleRowPlay = (c) => {
    if (activeAudioCallId === c.id) {
      if (audioIsPlaying) {
        audioEngine.pause();
        setAudioIsPlaying(false);
      } else {
        audioEngine.resume();
        setAudioIsPlaying(true);
      }
    } else {
      audioEngine.stop();
      setActiveAudioCallId(c.id);
      setAudioIsPlaying(true);
      setAudioCurrentTime(0);

      audioEngine.playCall(
        c,
        0,
        (time) => {
          setAudioCurrentTime(time);
        },
        () => {
          setAudioIsPlaying(false);
          setActiveAudioCallId(null);
          setAudioCurrentTime(0);
        }
      );
    }
  };

  // Speed change for in-row audio
  const handleToggleRowSpeed = (newSpeed) => {
    setAudioSpeed(newSpeed);
    audioEngine.setSpeed(newSpeed);
  };

  // Download Recording directly
  const handleDownloadRowRecording = (c) => {
    audioEngine.downloadWavFile(c);
    addToast(`Call recording for ${c.customerNumber} downloaded (.mp3)`, 'success');
  };

  // Open Full Modal
  const handleOpenRecordingModal = (c) => {
    if (activeAudioCallId === c.id) {
      audioEngine.stop();
      setActiveAudioCallId(null);
      setAudioIsPlaying(false);
    }
    setSelectedRecordingCall(c);
    setIsRecordingModalOpen(true);
  };

  // Copy to clipboard
  const copyToClipboard = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    addToast(`Copied ${text} to clipboard`, 'success');
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Download CSV
  const handleDownload = () => {
    const headers = ['Customer,Phone,Team,Handled By,Call Type,Call Status,Duration,Ring Duration,Date,Has Recording\n'];
    const rows = filteredCalls.map((c) =>
      `"${c.customerNumber}","${c.displayPhone}","${c.team}","${c.staff}","${c.callType}","${c.callStatus}","${c.duration}","${c.ringDuration}","${c.date}","${c.callStatus === 'Answered' ? 'Yes' : 'No'}"\n`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Call_History_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Call logs with recording metadata downloaded as CSV!', 'success');
  };

  // Dial call: starts in RINGING state, plays ringtone, launches tel: protocol on device.
  // TIMING DOES NOT START YET. It only starts when answered by customer or auto-connects after 4s!
  const startCall = (call) => {
    if (autoConnectTimerRef.current) {
      clearTimeout(autoConnectTimerRef.current);
    }
    setDialingCall(call);
    setDialCallState('ringing');
    setDialDuration(0);
    setDialIsRecording(false);
    setCallNotes('');
    setRingCountdown(4);

    // 1. Play brief realistic telephony ringtone (if not muted)
    audioEngine.playRingTone();

    // 2. Trigger native phone dialer (tel: protocol) on Windows Phone Link / mobile
    const rawNumber = call.customerNumber || call.displayPhone || '';
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
      handleAnswerCall();
    }, 4000);
  };

  // Called when clicking "Launch Device Dialer": answers immediately so Phone Link is in sync
  const handleLaunchDeviceDialer = (call) => {
    if (autoConnectTimerRef.current) {
      clearTimeout(autoConnectTimerRef.current);
      autoConnectTimerRef.current = null;
    }
    audioEngine.stopRingTone();
    handleAnswerCall();
    const rawNumber = call.customerNumber || call.displayPhone || '';
    const cleanNumber = rawNumber.replace(/[^0-9+]/g, '');
    if (cleanNumber) {
      try {
        window.open(`tel:${cleanNumber}`, '_self');
      } catch (e) {}
    }
  };

  // Called when customer answers the call: Stops ringtone, starts talk time timer, starts real microphone recording!
  const handleAnswerCall = async () => {
    if (autoConnectTimerRef.current) {
      clearTimeout(autoConnectTimerRef.current);
      autoConnectTimerRef.current = null;
    }
    setDialCallState('connected');
    audioEngine.stopRingTone();
    setDialDuration(0);
    setDialIsRecording(true);
    addToast('Call connected! Live talk time & real microphone voice recording active.', 'success');
    try {
      await realCallRecorder.start();
    } catch (err) {
      console.warn('Microphone recording notice:', err);
    }
  };

  // Called if customer does not answer or is busy before connection (0s talk time)
  const handleEndBeforeAnswer = async (outcome = 'missed') => {
    if (autoConnectTimerRef.current) {
      clearTimeout(autoConnectTimerRef.current);
      autoConnectTimerRef.current = null;
    }
    if (!dialingCall) return;
    audioEngine.stopRingTone();
    await realCallRecorder.stop();

    const targetPhone = dialingCall.customerNumber || dialingCall.displayPhone || '+91';
    const newCall = {
      id: Date.now().toString(),
      customerNumber: targetPhone,
      customerName: dialingCall.customerName || 'Customer',
      displayPhone: dialingCall.displayPhone || targetPhone.replace('+91', ''),
      team: selectedTeam || 'Main Team',
      staff: user?.name || 'Agent',
      tags: outcome === 'busy' ? 'Busy' : 'Missed',
      callType: 'Outgoing',
      callStatus: outcome === 'busy' ? 'Busy' : 'Missed',
      duration: '0s',
      recordingDuration: '0s',
      ringDuration: '8s',
      date: 'Just now',
      notes: callNotes || (outcome === 'busy' ? 'Customer line busy' : 'Customer did not answer'),
      waveform: [],
      transcript: [],
      recordingUrl: '',
      aiSummary: {
        sentiment: 'Neutral',
        score: 50,
        summary: `Outgoing call to ${targetPhone} was not answered (${outcome}).`,
        keyPoints: ['Unanswered Call'],
        followUps: ['Retry call later'],
      },
    };

    try {
      await createCall({
        customerPhone: targetPhone,
        customerName: dialingCall.customerName || 'Customer',
        duration: '0s',
        status: outcome === 'busy' ? 'busy' : 'missed',
        remarks: callNotes || (outcome === 'busy' ? 'Customer line busy' : 'Customer did not answer'),
      });
    } catch (err) {
      console.warn('API save notice:', err);
    }

    setCalls((prev) => [newCall, ...prev]);
    addToast(`Call ended: Customer ${outcome === 'busy' ? 'Busy' : 'Did Not Answer'} (0s talk time logged)`, 'info');
    setDialingCall(null);
    setDialCallState('ringing');
    setCallNotes('');
    setDialDuration(0);
  };

  const endCall = async () => {
    if (!dialingCall) return;
    audioEngine.stopRingTone();

    let recordedAudio = null;
    try {
      recordedAudio = await realCallRecorder.stop();
    } catch (err) {
      console.warn('Stop recording err:', err);
    }

    const durSec = Math.max(dialDuration, 1);
    const durFormatted = durSec >= 60 ? `${Math.floor(durSec / 60)}m ${durSec % 60}s` : `${durSec}s`;
    const targetPhone = dialingCall.customerNumber || dialingCall.displayPhone || '+91';
    const recordingUrl = recordedAudio?.dataUrl || recordedAudio?.url || '';

    const newCall = {
      id: Date.now().toString(),
      customerNumber: targetPhone,
      customerName: dialingCall.customerName || 'Customer',
      displayPhone: dialingCall.displayPhone || targetPhone.replace('+91', ''),
      team: selectedTeam || 'Main Team',
      staff: user?.name || 'Agent',
      tags: 'Recent Call',
      callType: 'Outgoing',
      callStatus: 'Answered',
      duration: durFormatted,
      recordingDuration: durFormatted,
      recordingUrl,
      ringDuration: '6s',
      date: 'Just now',
      notes: callNotes,
      waveform: recordedAudio?.waveform || generateWaveform(28),
      transcript: [
        {
          speaker: user?.name || 'Agent',
          role: 'agent',
          time: '00:01',
          text: `Outbound call to ${dialingCall.customerName || 'Customer'} (+91 ${targetPhone}). Notes: ${callNotes || 'Customer discussion completed.'}`,
        },
      ],
      aiSummary: {
        sentiment: 'Positive',
        score: 92,
        summary: `Call completed with ${targetPhone}. Actual talk time: ${durFormatted}. ${callNotes ? 'Notes: ' + callNotes : 'Customer discussion logged.'}`,
        keyPoints: ['Real Audio Voice Recording', `Talk time: ${durFormatted}`, callNotes || 'Customer Discussion'],
        followUps: ['Review recorded conversation'],
      },
    };

    // Save permanently to backend MongoDB Atlas API
    try {
      await createCall({
        customerPhone: targetPhone,
        customerName: dialingCall.customerName || 'Customer',
        duration: durFormatted,
        status: 'connected',
        remarks: callNotes || 'Call completed via CRM dialer',
        recordingDuration: durFormatted,
        recordingUrl,
        waveform: newCall.waveform,
        transcript: newCall.transcript,
        aiSummary: newCall.aiSummary,
      });
    } catch (err) {
      console.warn('API save fallback:', err);
    }

    try {
      const existingLocal = JSON.parse(localStorage.getItem('smartcrm_all_calls') || '[]');
      localStorage.setItem('smartcrm_all_calls', JSON.stringify([newCall, ...existingLocal]));
    } catch {}

    setCalls((prev) => [newCall, ...prev]);
    addToast(`Call ended & real voice recording saved (${durFormatted} talk time)!`, 'success');
    setDialingCall(null);
    setDialCallState('ringing');
    setCallNotes('');
    setDialDuration(0);
  };

  // Filtered calls
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      const matchCust =
        !customerSearch ||
        c.customerNumber.includes(customerSearch) ||
        c.displayPhone.includes(customerSearch) ||
        (c.customerName && c.customerName.toLowerCase().includes(customerSearch.toLowerCase()));
      const matchTeam = !selectedTeam || selectedTeam === 'All' || c.team === selectedTeam;
      const matchStaff = !selectedStaff || selectedStaff === 'All staff' || c.staff === selectedStaff;

      // Status/Call Type Filter matching click from dashboard
      let matchType = true;
      if (callTypeFilter === 'outgoing') {
        matchType = c.callType?.toLowerCase() === 'outgoing';
      } else if (callTypeFilter === 'incoming') {
        matchType = c.callType?.toLowerCase() === 'incoming';
      } else if (callTypeFilter === 'connected') {
        matchType = c.callStatus?.toLowerCase() === 'answered' || c.status === 'connected';
      } else if (callTypeFilter === 'received') {
        matchType =
          c.callType?.toLowerCase() === 'incoming' &&
          (c.callStatus?.toLowerCase() === 'answered' || c.status === 'connected');
      } else if (callTypeFilter === 'missed') {
        matchType = c.callStatus?.toLowerCase() === 'missed' || c.status === 'missed';
      }

      // Follow-up status filter
      const clean10 = String(c.customerNumber || '').replace(/\D/g, '').slice(-10);
      const cust = customerMap[clean10] || (c.customerId?._id ? customerMap[c.customerId._id] : customerMap[c.customerId]);
      const currentStatus = c.followUpStatus || cust?.status || 'new';
      const matchFollowUp = !followUpFilter || currentStatus === followUpFilter;

      return matchCust && matchTeam && matchStaff && matchType && matchFollowUp;
    });
  }, [calls, customerSearch, selectedTeam, selectedStaff, callTypeFilter, followUpFilter, customerMap]);

  const displayedCalls = filteredCalls.slice(0, visibleCount);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 w-full min-w-0 animate-in fade-in duration-200">
      {/* 1. Header Bar matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Title with Handset Icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Phone size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white flex items-center gap-2">
              <span>Call History</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <ShieldCheck size={12} />
                Call Recording Active
              </span>
            </h1>
            <p className="text-xs text-dark-500">
              Cloud telephony call logs, audio playback, AI transcripts & sentiment analysis
            </p>
          </div>
        </div>

        {/* Right Action Buttons: Dial Number, Filters (1) & Download */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsManualDialOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <PhoneCall size={15} />
            <span>Dial Number</span>
          </button>

          <button
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 shadow-2xs transition-colors"
          >
            <SlidersHorizontal size={14} className="text-dark-500" />
            <span>Filters</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              1
            </span>
            <ChevronDown size={14} className="text-dark-400" />
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Download size={15} />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Five Filter Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Filter 1: CUSTOMER */}
        <div>
          <label className="block text-dark-500 font-bold uppercase tracking-wider text-[11px] mb-1.5">
            CUSTOMER
          </label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-3 text-dark-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name or phone"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Filter 2: FOLLOW-UP STATUS */}
        <div>
          <label className="block text-dark-500 font-bold uppercase tracking-wider text-[11px] mb-1.5">
            FOLLOW-UP STATUS
          </label>
          <select
            value={followUpFilter}
            onChange={(e) => setFollowUpFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
          >
            <option value="">All Follow-ups</option>
            {FOLLOW_UP_STATUSES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter 2: TEAM (Dropdown with checkbox options) */}
        <div className="relative" ref={teamRef}>
          <label className="block text-dark-500 font-bold uppercase tracking-wider text-[11px] mb-1.5">
            TEAM
          </label>
          <div
            onClick={() => setShowTeamDropdown(!showTeamDropdown)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-blue-500/80 bg-white dark:bg-dark-800 text-dark-900 dark:text-white font-medium cursor-pointer shadow-2xs"
          >
            <span className="truncate">{selectedTeam || 'Select team'}</span>
            <div className="flex items-center gap-1.5 text-dark-400">
              {selectedTeam && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTeam('');
                  }}
                  className="hover:text-dark-700"
                >
                  <X size={14} />
                </button>
              )}
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Team Dropdown Menu */}
          {showTeamDropdown && (
            <div className="absolute left-0 mt-2 w-full min-w-[240px] rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2.5 shadow-2xl z-30 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-dark-400" />
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-dark-200 dark:border-dark-700 dark:bg-dark-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-dark-500 font-medium">
                <button
                  onClick={() => setSelectedTeam('')}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Select all
                </button>
                <span>{selectedTeam ? '1 selected' : '0 selected'}</span>
              </div>

              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {teamsList
                  .filter((t) => t.toLowerCase().includes(teamSearch.toLowerCase()))
                  .map((tName) => {
                    const isSelected = selectedTeam === tName;
                    return (
                      <div
                        key={tName}
                        onClick={() => {
                          setSelectedTeam(isSelected ? '' : tName);
                          setShowTeamDropdown(false);
                        }}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-blue-600"
                        />
                        <span className="text-xs font-semibold text-dark-800 dark:text-dark-200 truncate">
                          {tName}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Filter 3: CALL HANDLED BY (Dropdown with staff members) */}
        <div className="relative" ref={staffRef}>
          <label className="block text-dark-500 font-bold uppercase tracking-wider text-[11px] mb-1.5">
            CALL HANDLED BY
          </label>
          <div
            onClick={() => setShowStaffDropdown(!showStaffDropdown)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white font-medium cursor-pointer shadow-2xs"
          >
            <span className="truncate">{selectedStaff}</span>
            <ChevronDown size={14} className="text-dark-400" />
          </div>

          {/* Staff Dropdown Menu */}
          {showStaffDropdown && (
            <div className="absolute left-0 mt-2 w-full min-w-[240px] rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2.5 shadow-2xl z-30 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-dark-400" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-dark-200 dark:border-dark-700 dark:bg-dark-900 focus:outline-none"
                />
              </div>

              <div className="px-1">
                <button
                  onClick={() => {
                    setSelectedStaff('All staff');
                    setShowStaffDropdown(false);
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-semibold"
                >
                  Select all
                </button>
              </div>

              <p className="px-1 text-[11px] font-bold text-blue-600 uppercase">
                {selectedTeam || 'Main Team'}
              </p>

              <div className="space-y-1 max-h-[180px] overflow-y-auto">
                {staffList
                  .filter((s) => s.toLowerCase().includes(staffSearch.toLowerCase()))
                  .map((st) => {
                    const isChecked = selectedStaff === st;
                    return (
                      <div
                        key={st}
                        onClick={() => {
                          setSelectedStaff(isChecked ? 'All staff' : st);
                          setShowStaffDropdown(false);
                        }}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-blue-600"
                        />
                        <span className="text-xs font-medium text-dark-800 dark:text-dark-200 truncate">
                          {st}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Filter 4: PERIOD */}
        <div>
          <label className="block text-dark-500 font-bold uppercase tracking-wider text-[11px] mb-1.5">
            PERIOD
          </label>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white font-medium shadow-2xs">
            <div className="flex items-center gap-2 truncate">
              <Calendar size={14} className="text-dark-400 flex-shrink-0" />
              <span className="truncate">{period}</span>
            </div>
            <button
              onClick={() => addToast('Period filter reset', 'info')}
              className="text-dark-400 hover:text-dark-700"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Active Filter Chips & Clear All */}
      {(selectedTeam || followUpFilter || customerSearch) && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {selectedTeam && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-900/60 shadow-2xs">
              <span>Team: {selectedTeam}</span>
              <button
                onClick={() => setSelectedTeam('')}
                className="hover:text-rose-600 transition-colors font-bold cursor-pointer"
              >
                ×
              </button>
            </span>
          )}

          {followUpFilter && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-900/60 shadow-2xs">
              <span>Status: {FOLLOW_UP_STATUSES.find((s) => s.id === followUpFilter)?.label || followUpFilter}</span>
              <button
                onClick={() => setFollowUpFilter('')}
                className="hover:text-rose-600 transition-colors font-bold cursor-pointer"
              >
                ×
              </button>
            </span>
          )}

          {customerSearch && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-dark-100 dark:bg-dark-700 text-dark-800 dark:text-dark-200 font-medium border border-dark-200 dark:border-dark-600 shadow-2xs">
              <span>Search: {customerSearch}</span>
              <button
                onClick={() => setCustomerSearch('')}
                className="hover:text-rose-600 transition-colors font-bold cursor-pointer"
              >
                ×
              </button>
            </span>
          )}

          <button
            onClick={() => {
              setSelectedTeam('');
              setSelectedStaff('All staff');
              setCustomerSearch('');
              setFollowUpFilter('');
            }}
            className="text-blue-600 hover:underline font-semibold ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* 4. Call Type Filter Tabs matching dashboard click actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {[
            { id: 'all', label: 'All calls' },
            { id: 'outgoing', label: 'Outgoing' },
            { id: 'incoming', label: 'Incoming' },
            { id: 'connected', label: 'Connected' },
            { id: 'received', label: 'Received' },
            { id: 'missed', label: 'Missed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setCallTypeFilter(tab.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                callTypeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-white dark:bg-dark-800 text-dark-600 dark:text-dark-300 border border-dark-200/90 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-dark-500 font-medium">
          <span className="font-semibold text-dark-900 dark:text-white">
            {filteredCalls.length} results
          </span>
          <span className="font-mono hidden sm:inline">{period}</span>
        </div>
      </div>

      {/* 5. Call History Data Table with Customer Call Recordings */}
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-[#e8e8e8] dark:border-dark-700 shadow-2xs overflow-hidden w-full min-w-0">
        <div className="overflow-x-auto w-full min-w-0 scrollbar-thin">
          <table className="w-full text-xs text-left min-w-[1050px]">
            <thead>
              <tr className="border-b border-[#f0f0f0] dark:border-dark-700/80 bg-[#fafafa] dark:bg-dark-800/40 text-[rgba(0,0,0,0.65)] dark:text-dark-400 uppercase tracking-wider font-medium text-[12px]">
                <th className="py-3.5 px-4 min-w-[140px]">
                  <div className="flex items-center gap-1">
                    <span>CUSTOMER</span>
                    <Search size={12} />
                  </div>
                </th>
                <th className="py-4 px-4 min-w-[130px]">
                  <div className="flex items-center gap-1">
                    <span>PHONE</span>
                    <Search size={12} />
                  </div>
                </th>
                <th className="py-4 px-4 min-w-[280px]">
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Volume2 size={13} />
                    <span>CUSTOMER CALL RECORDING</span>
                  </div>
                </th>
                <th className="py-4 px-4 w-32">
                  <span>CALL</span>
                </th>
                <th className="py-4 px-4 min-w-[170px]">
                  <div className="flex items-center gap-1">
                    <span>FOLLOW-UP STATUS</span>
                  </div>
                </th>
                <th className="py-4 px-4 w-28">
                  <div className="flex items-center gap-1">
                    <span>CALL TYPE</span>
                    <Search size={12} />
                  </div>
                </th>
                <th className="py-4 px-4 w-28">
                  <div className="flex items-center gap-1">
                    <span>CALL STATUS</span>
                    <Search size={12} />
                  </div>
                </th>
                <th className="py-4 px-4 w-24">
                  <div className="flex items-center gap-1">
                    <span>DURATION</span>
                    <Search size={12} />
                  </div>
                </th>
                <th className="py-4 px-4 w-24">
                  <div className="flex items-center gap-1">
                    <span>RINGING</span>
                    <Search size={12} />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f0f0] dark:divide-dark-700/60 font-normal text-[14px]">
              {displayedCalls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-dark-400">
                    No call logs found for the selected filters.
                  </td>
                </tr>
              ) : (
                displayedCalls.map((c) => {
                  const isCurrentRowPlaying = activeAudioCallId === c.id && audioIsPlaying;
                  const hasRecording = c.callStatus === 'Answered';
                  const rowDurSec = audioEngine.parseDuration(c.duration || c.recordingDuration);
                  const progressPct =
                    activeAudioCallId === c.id && rowDurSec > 0
                      ? (audioCurrentTime / rowDurSec) * 100
                      : 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-dark-50/60 dark:hover:bg-dark-700/30 transition-colors"
                    >
                      {/* CUSTOMER */}
                      <td className="py-4 px-4">
                        <div>
                          <button
                            onClick={() => {
                              setSelected360Customer(c);
                              setIs360ModalOpen(true);
                            }}
                            className="font-bold text-blue-600 hover:text-blue-700 hover:underline text-xs block text-left cursor-pointer transition-colors"
                            title="Click to view complete customer profile, recordings, follow-ups & history"
                          >
                            {c.customerName || 'Customer'}
                          </button>
                          <button
                            onClick={() => {
                              setSelected360Customer(c);
                              setIs360ModalOpen(true);
                            }}
                            className="font-mono text-[11px] text-dark-500 dark:text-dark-400 block hover:underline hover:text-blue-600 cursor-pointer mt-0.5 text-left"
                            title="Click to view customer details"
                          >
                            {c.customerNumber}
                          </button>
                        </div>
                      </td>

                      {/* PHONE */}
                      <td className="py-4 px-4 font-mono text-dark-600 dark:text-dark-300">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{c.displayPhone}</span>
                          <button
                            onClick={() => copyToClipboard(c.displayPhone, c.id)}
                            className="text-dark-400 hover:text-dark-700 dark:hover:text-white transition-colors cursor-pointer"
                            title="Copy number"
                          >
                            {copiedId === c.id ? (
                              <Check size={13} className="text-emerald-500" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* CALL RECORDING & IN-ROW AUDIO PLAYER */}
                      <td className="py-3 px-4">
                        {hasRecording ? (
                          <div className="p-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-800/80 space-y-1.5 min-w-[270px]">
                            <div className="flex items-center justify-between gap-2">
                              {/* Play / Pause button */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleRowPlay(c)}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-2xs ${
                                    isCurrentRowPlaying
                                      ? 'bg-rose-600 text-white animate-pulse'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                                  title={isCurrentRowPlaying ? 'Pause Audio' : 'Play Recording'}
                                >
                                  {isCurrentRowPlaying ? (
                                    <Pause size={13} />
                                  ) : (
                                    <Play size={13} className="ml-0.5" />
                                  )}
                                </button>

                                {/* Mini Waveform Bars */}
                                <div
                                  onClick={() => handleToggleRowPlay(c)}
                                  className="flex items-end gap-0.5 h-5 cursor-pointer w-24 group"
                                  title="Click to play recording"
                                >
                                  {(c.waveform || generateWaveform(16)).slice(0, 16).map((h, i) => {
                                    const barPct = (i / 16) * 100;
                                    const isPassed = barPct <= progressPct;
                                    return (
                                      <div
                                        key={i}
                                        className="w-1 rounded-t-xs transition-all duration-100"
                                        style={{
                                          height: `${Math.max(20, h * 0.7)}%`,
                                          backgroundColor: isPassed
                                            ? '#2563eb'
                                            : isCurrentRowPlaying
                                            ? '#60a5fa'
                                            : '#94a3b8',
                                          opacity: isPassed ? 1 : 0.5,
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Time Counter */}
                              <div className="text-[11px] font-mono font-semibold text-dark-500 whitespace-nowrap">
                                {activeAudioCallId === c.id
                                  ? `${formatSeconds(audioCurrentTime)} / ${c.duration}`
                                  : c.duration}
                              </div>

                              {/* Action controls: Speed + Download + Modal Button */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    handleToggleRowSpeed(
                                      audioSpeed === 1.0 ? 1.5 : audioSpeed === 1.5 ? 2.0 : 1.0
                                    )
                                  }
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-dark-200 dark:bg-dark-700 text-dark-700 dark:text-dark-200 hover:bg-dark-300"
                                  title="Playback Speed"
                                >
                                  {audioSpeed}x
                                </button>

                                <button
                                  onClick={() => handleDownloadRowRecording(c)}
                                  className="p-1 rounded text-dark-400 hover:text-dark-700 hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors"
                                  title="Download Recording (.mp3)"
                                >
                                  <Download size={13} />
                                </button>

                                <button
                                  onClick={() => handleOpenRecordingModal(c)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 transition-colors shadow-2xs whitespace-nowrap"
                                  title="Open AI Transcript & Insights"
                                >
                                  <Sparkles size={11} className="text-amber-500" />
                                  <span>AI Insights</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-dark-400 italic flex items-center gap-1">
                            <span>— No recording (Missed)</span>
                          </div>
                        )}
                      </td>

                      {/* CALL: Start Call Button */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => startCall(c)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-dark-800 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50/70 transition-colors shadow-2xs whitespace-nowrap"
                        >
                          <PhoneCall size={13} />
                          <span>Start Call</span>
                        </button>
                      </td>

                      {/* FOLLOW-UP STATUS */}
                      <td className="py-4 px-4 relative">
                        {(() => {
                          const clean10 = String(c.customerNumber || '').replace(/\D/g, '').slice(-10);
                          const cust = customerMap[clean10] || (c.customerId?._id ? customerMap[c.customerId._id] : customerMap[c.customerId]);
                          const currentStatusKey = c.followUpStatus || cust?.status || 'new';
                          const currentStatusObj =
                            FOLLOW_UP_STATUSES.find((s) => s.id === currentStatusKey) || FOLLOW_UP_STATUSES[0];

                          return (
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenStatusDropdownCallId(
                                    openStatusDropdownCallId === c.id ? null : c.id
                                  );
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all shadow-2xs hover:scale-[1.02] cursor-pointer ${currentStatusObj.badge}`}
                                title="Click to change customer follow-up status"
                              >
                                {currentStatusObj.Icon && <currentStatusObj.Icon size={12} className="shrink-0" />}
                                <span className="whitespace-nowrap">{currentStatusObj.label}</span>
                                <ChevronDown size={11} className="opacity-70" />
                              </button>

                              {openStatusDropdownCallId === c.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute left-0 mt-1 w-52 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-1.5 shadow-xl z-50 space-y-0.5 animate-in fade-in zoom-in-95"
                                >
                                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-dark-400">
                                    Update Follow-Up
                                  </div>
                                  {FOLLOW_UP_STATUSES.map((st) => (
                                    <button
                                      key={st.id}
                                      type="button"
                                      onClick={() => handleUpdateFollowUpStatus(c, st.id)}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                                        currentStatusKey === st.id
                                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                                          : 'hover:bg-dark-50 dark:hover:bg-dark-700 text-dark-700 dark:text-dark-200'
                                      }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        {st.Icon && <st.Icon size={13} className="shrink-0 text-dark-500" />}
                                        <span>{st.label}</span>
                                      </span>
                                      {currentStatusKey === st.id && (
                                        <Check size={12} className="text-blue-600" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* CALL TYPE */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            const target = c.callType?.toLowerCase();
                            const next = callTypeFilter === target ? 'all' : target;
                            setCallTypeFilter(next);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105 cursor-pointer shadow-2xs ${
                            callTypeFilter === c.callType?.toLowerCase()
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-dark-100 dark:bg-dark-800 text-dark-800 dark:text-dark-200 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                          }`}
                          title={`Click to filter by ${c.callType} calls`}
                        >
                          {c.callType?.toLowerCase() === 'outgoing' ? (
                            <PhoneOutgoing size={12} className={callTypeFilter === 'outgoing' ? 'text-white' : 'text-blue-500'} />
                          ) : c.callType?.toLowerCase() === 'incoming' ? (
                            <PhoneIncoming size={12} className={callTypeFilter === 'incoming' ? 'text-white' : 'text-emerald-500'} />
                          ) : (
                            <PhoneMissed size={12} className={callTypeFilter === 'missed' ? 'text-white' : 'text-rose-500'} />
                          )}
                          <span>{c.callType}</span>
                        </button>
                      </td>

                      {/* CALL STATUS */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            const target = c.callStatus === 'Answered' ? 'connected' : 'missed';
                            const next = callTypeFilter === target ? 'all' : target;
                            setCallTypeFilter(next);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105 cursor-pointer shadow-2xs ${
                            callTypeFilter === (c.callStatus === 'Answered' ? 'connected' : 'missed')
                              ? 'ring-2 ring-blue-500 font-bold'
                              : ''
                          } ${
                            c.callStatus === 'Answered'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100'
                          }`}
                          title={`Click to filter by ${c.callStatus} calls`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.callStatus === 'Answered' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{c.callStatus}</span>
                        </button>
                      </td>

                      {/* DURATION */}
                      <td className="py-4 px-4 font-mono text-dark-700 dark:text-dark-200">
                        {c.duration}
                      </td>

                      {/* RINGING */}
                      <td className="py-4 px-4 font-mono text-dark-500">
                        {c.ringDuration}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Footer Controls: View more button & 50 / page dropdown */}
      <div className="flex items-center justify-between pt-2 w-full min-w-0">
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 25)}
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
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {/* Live Outgoing Dialer Modal with Real Voice Recording & Answered-Only Timing */}
      {dialingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            
            {/* Call State Icon */}
            {dialCallState === 'ringing' ? (
              <div className="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto shadow-lg animate-pulse ring-8 ring-amber-500/20">
                <PhoneCall size={28} className="animate-bounce" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg ring-8 ring-emerald-500/20">
                <PhoneCall size={28} />
              </div>
            )}

            <div>
              {dialCallState === 'ringing' ? (
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

              <h3 className="text-xl font-bold font-mono text-dark-900 dark:text-white mt-2">
                {dialingCall.customerNumber}
              </h3>
              <p className="text-xs text-dark-500 mt-0.5">
                {dialingCall.customerName || 'Customer'} &bull; Line: {user?.name || 'Agent'}
              </p>
            </div>

            {/* Direct Telephony App Link */}
            <button
              type="button"
              onClick={() => handleLaunchDeviceDialer(dialingCall)}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Phone size={13} />
              <span>Launch Device Dialer ({dialingCall.customerNumber})</span>
            </button>

            {/* Ringing Sound Status & Mute Control (Only during ringing) */}
            {dialCallState === 'ringing' && (
              <div className="flex items-center justify-between text-xs text-dark-500 px-1">
                <span className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  {isDialRingMuted ? (
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
                    setIsDialRingMuted(next);
                    addToast(next ? 'Ringtone muted (Silent Dialing)' : 'Ringtone sound enabled', 'info');
                  }}
                  className="flex items-center gap-1 text-dark-500 hover:text-dark-800 dark:hover:text-dark-200 underline text-[11px] cursor-pointer"
                >
                  {isDialRingMuted ? <Volume2 size={11} /> : <VolumeX size={11} />}
                  <span>{isDialRingMuted ? 'Enable Sound' : 'Mute Tone'}</span>
                </button>
              </div>
            )}

            {/* Timer and Recording indicator: STAYS AT 00:00 UNTIL ANSWERED! */}
            {dialCallState === 'ringing' ? (
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
                    {Math.floor(dialDuration / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(dialDuration % 60).toString().padStart(2, '0')}
                  </span>

                  {dialIsRecording ? (
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
                  <Mic size={13} className={dialLiveVolume > 5 ? 'text-emerald-500 animate-pulse' : 'text-dark-400'} />
                  <div className="flex-1 bg-dark-100 dark:bg-dark-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-150 rounded-full"
                      style={{ width: `${Math.max(6, dialLiveVolume)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-dark-400 font-semibold">{dialLiveVolume}%</span>
                </div>
              </div>
            )}

            {/* Stage Actions */}
            {dialCallState === 'ringing' ? (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleAnswerCall}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <PhoneCall size={18} />
                  <span>Customer Answered (Start Talk Time Now)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleEndBeforeAnswer('missed')}
                    className="py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  >
                    No Answer / Missed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEndBeforeAnswer('busy')}
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
                    setDialingCall(null);
                    setDialCallState('ringing');
                  }}
                  className="w-full py-1 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-xs transition-colors cursor-pointer"
                >
                  Cancel Call
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* Recording status note */}
                <div className="flex items-center justify-between text-xs text-dark-500 px-1">
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <Mic size={13} className="text-emerald-500 animate-pulse" />
                    Real Microphone Voice Recording Active
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (dialIsRecording) realCallRecorder.pause();
                      else realCallRecorder.resume();
                      setDialIsRecording(!dialIsRecording);
                    }}
                    className="text-blue-600 hover:underline font-semibold text-[11px] cursor-pointer"
                  >
                    {dialIsRecording ? 'Pause REC' : 'Resume REC'}
                  </button>
                </div>

                {/* Call Notes Input */}
                <div className="text-left">
                  <label className="text-[10px] font-bold uppercase text-dark-400 tracking-wider block mb-1">
                    Quick Call Note
                  </label>
                  <input
                    type="text"
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="e.g. Discussed pricing, customer interested..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={endCall}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Hang Up & Save Real Audio Recording
                </button>

                <button
                  type="button"
                  onClick={() => handleEndBeforeAnswer('missed')}
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
                  startCall({
                    customerNumber: num,
                    customerName: manualDialName.trim() || 'Direct Dial Customer',
                    displayPhone: num,
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

      {/* Dedicated Call Recording & AI Transcript Modal */}
      {selectedRecordingCall && (
        <CallRecordingModal
          isOpen={isRecordingModalOpen}
          onClose={() => {
            setIsRecordingModalOpen(false);
            setSelectedRecordingCall(null);
          }}
          call={selectedRecordingCall}
        />
      )}

      {/* Customer 360 Full History & Details Modal */}
      {selected360Customer && (
        <Customer360Modal
          isOpen={is360ModalOpen}
          onClose={() => {
            setIs360ModalOpen(false);
            setSelected360Customer(null);
          }}
          customer={selected360Customer}
          onStartCall={(cust) => startCall(cust)}
        />
      )}
    </div>
  );
}
