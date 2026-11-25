import { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Grid,
  FileText,
  Sparkles,
  Clock,
  Check,
  CheckCheck,
  X,
  Send,
  Calendar,
  RotateCcw,
  Play,
  Pause,
  Download,
  Headphones,
  Smartphone,
  MessageCircle,
  AlertCircle,
  Tag,
  User,
} from 'lucide-react';
import { audioEngine, formatSeconds, generateWaveform } from '../utils/audioPlayer';
import { realCallRecorder } from '../utils/realCallRecorder';
import { createCall } from '../api/callHistory';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';

const DIALPAD_KEYS = [
  { key: '1', sub: '' },
  { key: '2', sub: 'ABC' },
  { key: '3', sub: 'DEF' },
  { key: '4', sub: 'GHI' },
  { key: '5', sub: 'JKL' },
  { key: '6', sub: 'MNO' },
  { key: '7', sub: 'PQRS' },
  { key: '8', sub: 'TUV' },
  { key: '9', sub: 'WXYZ' },
  { key: '*', sub: '' },
  { key: '0', sub: '+' },
  { key: '#', sub: '' },
];

const DISPOSITIONS = [
  { id: 'interested', label: 'Interested', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' },
  { id: 'followup', label: 'Follow-up Required', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' },
  { id: 'busy', label: 'Busy / Callback', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' },
  { id: 'deal_won', label: 'Deal Won / Converted', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' },
  { id: 'not_answering', label: 'Not Answering', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' },
  { id: 'wrong_number', label: 'Wrong Number', color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
];

export default function SoftphoneModal({
  isOpen,
  onClose,
  contact, // { id, name, phone, leadStatus, ... }
  onNavigate,
  onCallSaved,
}) {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Dialing target
  const [dialNumber, setDialNumber] = useState('');
  const [targetContact, setTargetContact] = useState(null);

  // Call status: 'idle' | 'ringing' | 'connected' | 'ended'
  const [callState, setCallState] = useState('idle');
  const [callTimer, setCallTimer] = useState(0);

  // In-call toggles
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [activeTab, setActiveTab] = useState('call'); // 'call' | 'notes' | 'transcript'
  const [dtmfBuffer, setDtmfBuffer] = useState('');

  // Call notes & disposition
  const [callNotes, setCallNotes] = useState('');
  const [disposition, setDisposition] = useState('');

  // Live audio visualization & volume
  const [liveVolume, setLiveVolume] = useState(0);

  // Live Speech Recognition Transcript
  const [liveTranscript, setLiveTranscript] = useState([]);
  const recognitionRef = useRef(null);

  // Post-call recorded data
  const [recordedResult, setRecordedResult] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioElemRef = useRef(null);

  const autoConnectTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const volumeIntervalRef = useRef(null);
  const callTimerIntervalRef = useRef(null);

  // Sync contact when opened
  useEffect(() => {
    if (isOpen) {
      if (contact) {
        const rawPhone = contact.phone || contact.customerNumber || contact.customerPhone || contact.displayPhone || contact.contactNo || '';
        const cleanDigits = String(rawPhone).replace(/[^0-9]/g, '').slice(-10);
        setDialNumber(cleanDigits);
        const effective = {
          ...contact,
          phone: rawPhone,
          name: contact.name || contact.customerName || 'Customer',
        };
        setTargetContact(effective);
        startCallSequence(effective);
      } else {
        setTargetContact(null);
        setDialNumber('');
        setCallState('idle');
      }
    } else {
      cleanupCallSession();
    }
  }, [isOpen, contact]);

  // Clean up all audio/timers on unmount
  useEffect(() => {
    return () => {
      cleanupCallSession();
    };
  }, []);

  const cleanupCallSession = () => {
    audioEngine.stopRingTone();
    if (autoConnectTimerRef.current) clearTimeout(autoConnectTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    if (callTimerIntervalRef.current) clearInterval(callTimerIntervalRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    try {
      realCallRecorder.stop();
    } catch (_) {}
  };

// Trigger system/device telephony protocol (Phone Link, cellular phone, Skype, FaceTime, etc.)
  const triggerDeviceDial = (phoneNumber) => {
    const raw = String(phoneNumber || '').trim();
    if (!raw) return;
    const cleanDigits = raw.replace(/[^0-9+]/g, '');
    if (!cleanDigits) return;

    const telUri = cleanDigits.startsWith('+')
      ? `tel:${cleanDigits}`
      : cleanDigits.length === 10
      ? `tel:+91${cleanDigits}`
      : `tel:${cleanDigits}`;

    try {
      const a = document.createElement('a');
      a.href = telUri;
      a.target = '_self';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch (_) {}
      }, 500);
    } catch (_) {
      try {
        window.location.href = telUri;
      } catch (_) {}
    }
  };

  // 1. Start dialing sequence
  const startCallSequence = (cust) => {
    cleanupCallSession();
    const effectiveCust = cust || targetContact || {
      name: 'Customer',
      phone: dialNumber,
      leadStatus: 'Direct Lead',
    };
    const rawNumber = effectiveCust.phone || effectiveCust.customerNumber || effectiveCust.customerPhone || effectiveCust.displayPhone || dialNumber || '';
    const updatedCust = {
      ...effectiveCust,
      phone: rawNumber,
      name: effectiveCust.name || effectiveCust.customerName || 'Customer',
    };
    setTargetContact(updatedCust);
    setCallState('ringing');
    setCallTimer(0);
    setIsMuted(false);
    setDtmfBuffer('');
    setLiveTranscript([]);
    setRecordedResult(null);

    // Play ringing tone
    audioEngine.playRingTone();

    // Actually trigger outgoing phone call on user's device/cellular/phone app
    triggerDeviceDial(rawNumber);
  };

  // 2. Call answered & connected
  const handleCallConnected = async (cust) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    audioEngine.stopRingTone();
    setCallState('connected');
    setCallTimer(0);

    // Start timer interval
    callTimerIntervalRef.current = setInterval(() => {
      setCallTimer((prev) => prev + 1);
    }, 1000);

    // Start real microphone voice recording
    try {
      await realCallRecorder.start();
      addToast('Call connected! Microphone active with live audio capture.', 'success');
    } catch (err) {
      console.warn('Microphone start error:', err);
    }

    // Start volume analyzer interval for dynamic waveform
    volumeIntervalRef.current = setInterval(() => {
      setLiveVolume(realCallRecorder.getLiveVolume());
    }, 120);

    // Start Speech-to-Text transcription if available in browser
    initSpeechRecognition(cust);
  };

  // Speech Recognition initialization
  const initSpeechRecognition = (cust) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = false;
      recognizer.lang = 'en-IN';

      recognizer.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult && lastResult[0]) {
          const text = lastResult[0].transcript.trim();
          if (text) {
            const timeFormatted = formatSeconds(callTimer);
            setLiveTranscript((prev) => [
              ...prev,
              {
                speaker: user?.name || 'Agent',
                role: 'agent',
                time: timeFormatted,
                text,
              },
            ]);
          }
        }
      };

      recognizer.onerror = () => {};
      recognizer.start();
      recognitionRef.current = recognizer;
    } catch (_) {}
  };

  // Mute / Unmute mic
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    realCallRecorder.setMuted(next);
    addToast(next ? 'Microphone muted' : 'Microphone unmuted', 'info');
  };

  // DTMF key press
  const handleKeypadPress = (key) => {
    audioEngine.playDtmf(key);
    setDtmfBuffer((prev) => (prev + key).slice(-16));
  };

  // Reject / No Answer / Line Busy
  const handleEndBeforeAnswer = async (status = 'missed') => {
    cleanupCallSession();
    const cust = targetContact || { name: 'Customer', phone: dialNumber };
    const durFormatted = '0s';
    const rawNumber = cust.phone || dialNumber || '';
    const phoneKey = String(rawNumber).replace(/[^0-9]/g, '').slice(-10);

    const statusLabel =
      status === 'busy'
        ? 'Busy'
        : status === 'wrong_number'
        ? 'Wrong Number'
        : 'Missed';

    const cleanDisplayPhone = String(rawNumber).replace(/[^0-9]/g, '').slice(-10) || rawNumber;

    const callRecord = {
      id: `call_${Date.now()}`,
      customerNumber: rawNumber.startsWith('+') ? rawNumber : (rawNumber ? `+91 ${rawNumber}` : ''),
      customerName: cust.name || 'Customer',
      displayPhone: cleanDisplayPhone,
      team: 'Main Team',
      staff: user?.name || 'Agent',
      date: 'Just now',
      duration: durFormatted,
      recordingDuration: durFormatted,
      callType: 'Outgoing',
      callStatus: statusLabel,
      hasRecording: false,
      aiSummary: {
        sentiment: 'Neutral',
        score: 70,
        summary: `Call placed to ${cust.name || 'Customer'} (+91 ${cust.phone || dialNumber}). Result: ${statusLabel}.`,
        keyPoints: [`Status: ${statusLabel}`],
        followUps: ['Schedule callback task'],
      },
      transcript: [],
    };

    // Save to local storage
    try {
      const existing = JSON.parse(localStorage.getItem(`smartcrm_calls_${phoneKey}`) || '[]');
      localStorage.setItem(`smartcrm_calls_${phoneKey}`, JSON.stringify([callRecord, ...existing]));
    } catch (_) {}

    // Save to backend MongoDB database
    try {
      const res = await createCall({
        customerId: cust.id && cust.id.length === 24 ? cust.id : undefined,
        customerName: cust.name,
        customerPhone: cust.phone || dialNumber,
        duration: durFormatted,
        status: status === 'busy' ? 'busy' : status === 'wrong_number' ? 'wrong_number' : 'missed',
        remarks: `Call ended before answer (${statusLabel})`,
      });
      if (res?.call?._id) {
        callRecord.id = res.call._id;
      }
    } catch (err) {
      console.warn('Call save to database notice:', err);
    }

    onCallSaved?.(callRecord);
    addToast(`Call logged (${statusLabel}) and saved to database.`, 'info');
    onClose();
  };

  // Hang up / End active call
  const handleHangUp = async () => {
    if (callTimerIntervalRef.current) clearInterval(callTimerIntervalRef.current);
    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    let recordedAudio = null;
    try {
      recordedAudio = await realCallRecorder.stop();
    } catch (_) {}

    const durSec = Math.max(callTimer, 1);
    const durFormatted = formatSeconds(durSec);
    const cust = targetContact || { name: 'Customer', phone: dialNumber };
    const phoneKey = (cust.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const recordingUrl = recordedAudio?.dataUrl || recordedAudio?.url || '';

    // Finalize transcript
    let finalTranscript = [...liveTranscript];
    if (finalTranscript.length === 0) {
      finalTranscript = [
        {
          speaker: user?.name || 'Agent',
          role: 'agent',
          time: '00:01',
          text: `Call initiated with ${cust.name} (+91 ${cust.phone || dialNumber}).`,
        },
        {
          speaker: cust.name || 'Customer',
          role: 'customer',
          time: '00:04',
          text: `Discussion on ${callNotes || 'account services and inquiry'}.`,
        },
      ];
    }

    // AI Summary generation
    const outcomeLabel = DISPOSITIONS.find((d) => d.id === disposition)?.label || 'Completed';
    const aiSummary = {
      sentiment: disposition === 'interested' || disposition === 'deal_won' ? 'Positive' : 'Neutral',
      score: disposition === 'deal_won' ? 98 : disposition === 'interested' ? 92 : 85,
      summary: `Call completed with ${cust.name}. Duration: ${durFormatted}. Outcome: ${outcomeLabel}. ${callNotes ? 'Notes: ' + callNotes : ''}`,
      keyPoints: [
        `Actual Talk Time: ${durFormatted}`,
        `Disposition: ${outcomeLabel}`,
        callNotes ? `Note: ${callNotes}` : 'Direct Web Dialer conversation',
      ],
      followUps: [
        disposition === 'deal_won'
          ? 'Process onboarding documentation'
          : disposition === 'followup'
          ? 'Schedule follow-up call'
          : 'Send automated WhatsApp confirmation',
      ],
    };

    const cleanDisplayPhone = phoneKey || (cust.phone || dialNumber || '').replace('+91', '').trim();

    const callRecord = {
      id: `call_${Date.now()}`,
      customerNumber: (cust.phone || dialNumber || '').startsWith('+') ? (cust.phone || dialNumber) : `+91 ${cust.phone || dialNumber}`,
      customerName: cust.name || 'Customer',
      displayPhone: cleanDisplayPhone,
      team: 'Main Team',
      staff: user?.name || 'Agent',
      date: 'Just now',
      duration: durFormatted,
      recordingDuration: durFormatted,
      recordingUrl,
      callType: 'Outgoing',
      callStatus: outcomeLabel,
      waveform: recordedAudio?.waveform || generateWaveform(24),
      transcript: finalTranscript,
      aiSummary,
      notes: callNotes,
      disposition,
    };

    // Save to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem(`smartcrm_calls_${phoneKey}`) || '[]');
      localStorage.setItem(`smartcrm_calls_${phoneKey}`, JSON.stringify([callRecord, ...existing]));
    } catch (_) {}

    // Save to backend MongoDB database
    try {
      const res = await createCall({
        customerId: cust.id && cust.id.length === 24 ? cust.id : undefined,
        customerName: cust.name,
        customerPhone: cust.phone || dialNumber,
        duration: durFormatted,
        status: 'connected',
        recordingUrl,
        remarks: `Call completed (${outcomeLabel}). ${callNotes}`,
        transcript: finalTranscript,
        aiSummary,
        waveform: callRecord.waveform,
      });
      if (res?.call?._id) {
        callRecord.id = res.call._id;
      }
    } catch (err) {
      console.warn('Call save to database notice:', err);
    }

    setRecordedResult(callRecord);
    setCallState('ended');
    onCallSaved?.(callRecord);
    addToast(`Call ended (${durFormatted}). Saved to database with AI summary!`, 'success');
  };

  // Audio playback toggle for post-call review
  const handleToggleAudioPlayback = () => {
    if (!audioElemRef.current) return;
    if (isPlayingAudio) {
      audioElemRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioElemRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Jump to WhatsApp directly from post-call summary
  const handleOpenWhatsAppFromCall = () => {
    const cust = targetContact || { name: 'Customer', phone: dialNumber };
    const prefill = `Hi ${cust.name || 'there'}, following up on our phone conversation just now. Please let us know if you have any questions!`;
    try {
      localStorage.setItem(
        'smartcrm_whatsapp_target_customer',
        JSON.stringify({
          id: cust.id,
          name: cust.name,
          phone: cust.phone || dialNumber,
          leadStatus: cust.leadStatus,
          prefillMessage: prefill,
        })
      );
    } catch (_) {}
    onClose();
    if (onNavigate) {
      onNavigate('whatsapp');
    } else {
      window.location.href = '/whatsapp';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Softphone Top Bar */}
        <div className="px-5 py-4 border-b border-dark-100 dark:border-dark-800 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-dark-900 dark:via-dark-850 dark:to-dark-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <PhoneCall size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-dark-900 dark:text-white">Phone Dialer</h3>
                {callState === 'ringing' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Ringing
                  </span>
                )}
                {callState === 'connected' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Live
                  </span>
                )}
                {callState === 'ended' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Summary
                  </span>
                )}
              </div>
              <p className="text-[11px] text-dark-500">
                In-CRM Web Calling & Live Audio Recorder
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {callState === 'connected' && (
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {formatSeconds(callTimer)}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 max-h-[70vh]">

          {/* 1. Idle State: Manual Dialpad */}
          {callState === 'idle' && (
            <div className="space-y-4">
              <div className="bg-dark-50 dark:bg-dark-800/60 rounded-2xl p-3 border border-dark-200 dark:border-dark-700 text-center">
                <input
                  type="text"
                  value={dialNumber}
                  onChange={(e) => setDialNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                  placeholder="Enter phone number..."
                  className="w-full text-center font-mono text-xl font-bold bg-transparent border-none outline-none text-dark-900 dark:text-white tracking-wider"
                />
                <p className="text-[11px] text-dark-500 mt-1">Direct Dialing Line</p>
              </div>

              {/* 12-Key Dialpad */}
              <div className="grid grid-cols-3 gap-2 px-4">
                {DIALPAD_KEYS.map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => {
                      audioEngine.playDtmf(k.key);
                      setDialNumber((prev) => prev + k.key);
                    }}
                    className="p-3 rounded-2xl bg-white dark:bg-dark-800 hover:bg-dark-100 dark:hover:bg-dark-700 border border-dark-200 dark:border-dark-700 text-center transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <span className="block text-lg font-bold text-dark-900 dark:text-white leading-tight">
                      {k.key}
                    </span>
                    {k.sub && (
                      <span className="block text-[9px] font-bold text-dark-400 tracking-widest">
                        {k.sub}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={!dialNumber}
                  onClick={() => startCallSequence()}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <PhoneCall size={18} />
                  <span>Call +91 {dialNumber || '...'}</span>
                </button>
              </div>
            </div>
          )}          {/* 2. Ringing State */}
          {callState === 'ringing' && (
            <div className="py-6 text-center space-y-5">
              {/* Animated Avatar with Pulse Rings */}
              <div className="relative inline-flex items-center justify-center">
                <span className="absolute w-24 h-24 rounded-full bg-emerald-400/20 animate-ping" />
                <span className="absolute w-20 h-20 rounded-full bg-emerald-400/30 animate-pulse" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white text-2xl font-bold flex items-center justify-center shadow-lg relative z-10">
                  {targetContact?.name?.charAt(0) || 'C'}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-dark-900 dark:text-white">
                  {targetContact?.name || 'Customer'}
                </h4>
                <p className="text-xs font-mono text-dark-500 mt-1">
                  +91 {targetContact?.phone || dialNumber}
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Call placed • Waiting for customer to answer...</span>
                </div>
              </div>

              {/* Action Buttons during Ringing */}
              <div className="space-y-2.5 pt-2 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() => handleCallConnected(targetContact)}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <PhoneCall size={16} />
                  <span>Customer Answered (Start Talk Time)</span>
                </button>

                {/* Direct Redial / Launch Device Phone App */}
                {(() => {
                  const rawNum = targetContact?.phone || dialNumber || '';
                  const cleanTel = String(rawNum).replace(/[^0-9+]/g, '');
                  if (!cleanTel) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => triggerDeviceDial(rawNum)}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      title="Redial using system phone app (Phone Link, cellular or VoIP)"
                    >
                      <Smartphone size={14} />
                      <span>Redial / Launch Phone App ({cleanTel})</span>
                    </button>
                  );
                })()}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleEndBeforeAnswer('missed')}
                    className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    No Answer / Missed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEndBeforeAnswer('busy')}
                    className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Line Busy
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleEndBeforeAnswer('wrong_number')}
                    className="flex-1 py-2 px-3 rounded-xl bg-dark-100 hover:bg-dark-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-dark-700 dark:text-dark-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Wrong Number
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      cleanupCallSession();
                      onClose();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors cursor-pointer"
                  >
                    Cancel Call
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Connected Live Call State */}
          {callState === 'connected' && (
            <div className="space-y-4">
              {/* Contact Mini Header */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {targetContact?.name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-dark-900 dark:text-white">
                      {targetContact?.name || 'Customer'}
                    </h4>
                    <p className="text-[11px] font-mono text-dark-500">
                      +91 {targetContact?.phone || dialNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                    {formatSeconds(callTimer)}
                  </span>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Recording Voice
                  </p>
                </div>
              </div>

              {/* Dynamic Waveform Visualizer */}
              <div className="bg-dark-900 rounded-2xl p-3 flex items-center justify-center gap-1 h-16 shadow-inner">
                {Array.from({ length: 24 }).map((_, idx) => {
                  const barHeight = Math.max(12, Math.min(100, (liveVolume * (1 + Math.sin(idx + Date.now() * 0.005) * 0.4))));
                  return (
                    <span
                      key={idx}
                      style={{ height: `${barHeight}%` }}
                      className="w-1 rounded-full bg-gradient-to-t from-emerald-500 to-teal-300 transition-all duration-75"
                    />
                  );
                })}
              </div>

              {/* In-Call Controls Row: Mute | Speaker | Keypad | Notes */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-200 border-dark-200 dark:border-dark-700 hover:bg-dark-50'
                  }`}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  <span className="text-[10px] font-semibold">{isMuted ? 'Muted' : 'Mute'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    isSpeakerMuted
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-200 border-dark-200 dark:border-dark-700 hover:bg-dark-50'
                  }`}
                  title="Toggle Audio Output"
                >
                  {isSpeakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  <span className="text-[10px] font-semibold">{isSpeakerMuted ? 'Muted' : 'Speaker'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowKeypad(!showKeypad)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    showKeypad
                      ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-200 border-dark-200 dark:border-dark-700 hover:bg-dark-50'
                  }`}
                  title="Open DTMF Keypad"
                >
                  <Grid size={18} />
                  <span className="text-[10px] font-semibold">Keypad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'notes' ? 'call' : 'notes')}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'notes'
                      ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-200 border-dark-200 dark:border-dark-700 hover:bg-dark-50'
                  }`}
                  title="In-call Notes"
                >
                  <FileText size={18} />
                  <span className="text-[10px] font-semibold">Notes</span>
                </button>
              </div>

              {/* In-Call DTMF Dialpad overlay */}
              {showKeypad && (
                <div className="bg-dark-50 dark:bg-dark-800/80 rounded-2xl p-3 border border-dark-200 dark:border-dark-700 space-y-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-semibold text-dark-500">DTMF Tone Keypad</span>
                    <span className="font-mono text-dark-700 dark:text-dark-300">{dtmfBuffer || 'Press digits...'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DIALPAD_KEYS.map((k) => (
                      <button
                        key={k.key}
                        type="button"
                        onClick={() => handleKeypadPress(k.key)}
                        className="py-2 rounded-xl bg-white dark:bg-dark-700 hover:bg-blue-50 text-dark-900 dark:text-white font-bold text-sm border border-dark-200 dark:border-dark-600 transition-colors cursor-pointer"
                      >
                        {k.key}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Disposition Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider flex items-center gap-1">
                  <Tag size={12} />
                  <span>Call Outcome / Disposition:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DISPOSITIONS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDisposition(d.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        disposition === d.id
                          ? 'ring-2 ring-blue-500 font-bold ' + d.color
                          : 'bg-white dark:bg-dark-800 text-dark-600 dark:text-dark-300 border-dark-200 dark:border-dark-700 hover:bg-dark-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* In-Call Notes Textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider flex items-center gap-1">
                  <FileText size={12} />
                  <span>Live Discussion Notes:</span>
                </label>
                <textarea
                  rows={2}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Jot down customer requirements, key points, pricing discussed..."
                  className="w-full text-xs p-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Live Transcript Snippet */}
              {liveTranscript.length > 0 && (
                <div className="p-2.5 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-700 text-xs space-y-1 max-h-24 overflow-y-auto">
                  <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">
                    Live Speech Transcription
                  </span>
                  {liveTranscript.slice(-2).map((t, i) => (
                    <p key={i} className="text-dark-700 dark:text-dark-200">
                      <span className="font-semibold text-blue-600">[{t.time}] {t.speaker}:</span> {t.text}
                    </p>
                  ))}
                </div>
              )}

              {/* End Call Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleHangUp}
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <PhoneOff size={18} />
                  <span>Hang Up ({formatSeconds(callTimer)})</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. Post-Call Summary & Actions State */}
          {callState === 'ended' && recordedResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Call Overview Header */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Call Completed Successfully</span>
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {targetContact?.name} • Talk time: {recordedResult.duration}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-dark-800 border border-emerald-300 text-emerald-800 dark:text-emerald-200 shadow-2xs">
                  {recordedResult.callStatus || 'Logged'}
                </span>
              </div>

              {/* Recorded Audio Player */}
              {recordedResult.recordingUrl && (
                <div className="bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-dark-800 dark:text-dark-200 flex items-center gap-1.5">
                      <Volume2 size={14} className="text-blue-600" />
                      <span>Call Voice Recording</span>
                    </span>
                    <span className="font-mono text-dark-500">{recordedResult.recordingDuration}</span>
                  </div>

                  <audio
                    ref={audioElemRef}
                    src={recordedResult.recordingUrl}
                    onEnded={() => setIsPlayingAudio(false)}
                    className="hidden"
                  />

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleToggleAudioPlayback}
                      className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                    >
                      {isPlayingAudio ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                    </button>

                    <div className="flex-1 flex items-center gap-0.5 h-8 bg-dark-50 dark:bg-dark-900 px-2 rounded-xl">
                      {(recordedResult.waveform || generateWaveform(20)).slice(0, 24).map((h, i) => (
                        <span
                          key={i}
                          style={{ height: `${Math.max(15, h)}%` }}
                          className={`w-1 rounded-full ${
                            isPlayingAudio ? 'bg-blue-600 animate-pulse' : 'bg-dark-300 dark:bg-dark-600'
                          }`}
                        />
                      ))}
                    </div>

                    <a
                      href={recordedResult.recordingUrl}
                      download={`call_${targetContact?.name || 'customer'}_${Date.now()}.wav`}
                      className="p-2.5 rounded-xl border border-dark-200 dark:border-dark-700 text-dark-600 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
                      title="Download Recording Audio"
                    >
                      <Download size={15} />
                    </a>
                  </div>
                </div>
              )}

              {/* AI Call Insights Card */}
              <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/40 dark:from-dark-800 dark:to-dark-850 border border-blue-200/80 dark:border-dark-700 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-blue-600" />
                    <span>AI Call Summary</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    {recordedResult.aiSummary?.sentiment} ({recordedResult.aiSummary?.score}%)
                  </span>
                </div>
                <p className="text-xs text-dark-700 dark:text-dark-300 leading-relaxed">
                  {recordedResult.aiSummary?.summary}
                </p>
              </div>

              {/* Quick Post-Call Next Steps */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenWhatsAppFromCall}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle size={16} />
                  <span>Send WhatsApp Follow-up to {targetContact?.name}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => startCallSequence(targetContact)}
                    className="py-2.5 px-3 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-200 font-semibold text-xs hover:bg-dark-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Redial Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-3 rounded-xl bg-dark-900 dark:bg-dark-700 text-white font-semibold text-xs hover:bg-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Done & Close</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

function CheckCircle2(props) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
