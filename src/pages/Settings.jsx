import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { isAdminOrOwner, isManager, isMember, getRoleInfo } from '../utils/permissions';
import {
  Moon,
  Sun,
  Bell,
  Globe,
  Download,
  Upload,
  Save,
  Mic,
  Volume2,
  VolumeX,
  ShieldCheck,
  Shield,
  Waves,
  Mail,
  MessageCircle,
  Monitor,
  PhoneCall,
  Gift,
  Phone,
  Sliders,
  Check,
  CheckCircle2,
  AlertTriangle,
  Users,
  Building2,
  Sparkles,
  Clock,
  Target,
  Flame,
  Zap,
  Copy,
  FileText,
  Lock,
  Smartphone,
  Play,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

export default function Settings({ onNavigate }) {
  const { addToast } = useToast();
  const { user } = useAuth();
  const {
    darkMode,
    toggleDarkMode,
    themeColor,
    setThemeColor,
    timezone,
    setTimezone,
  } = useApp();

  const isAdmin = isAdminOrOwner(user);
  const isMgr = isManager(user);
  const roleInfo = getRoleInfo(user?.role);

  // Active Category Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Unsaved changes tracking
  const [hasChanges, setHasChanges] = useState(false);

  // --- 1. CALL RECORDING & TELEPHONY STATE ---
  const [callRecording, setCallRecording] = useState(() => {
    try {
      const saved = localStorage.getItem('smartcrm_call_recording_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    const simpleEnabled = localStorage.getItem('smartcrm_call_recording_enabled');
    return {
      enabled: simpleEnabled !== null ? simpleEnabled !== 'false' : true,
      consentBeep: true,
      noiseSuppression: true,
      waveformVisuals: true,
    };
  });

  // --- 2. NOTIFICATIONS STATE ---
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('notification_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      email: true,
      whatsapp: true,
      browser: true,
      followup: true,
      birthday: false,
      chimeAlert: true,
    };
  });

  // --- 3. MEMBER WORKSPACE SETTINGS (Role-specific for Members / Frontline Agents) ---
  const [memberSettings, setMemberSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('smartcrm_member_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      dialerMode: 'webrtc', // 'webrtc' | 'phonelink' | 'mobile_companion'
      postCallWrapupTimer: 30, // seconds: 0, 15, 30, 60
      autoAdvanceFollowup: true,
      dailyCallGoal: 50,
      reminderChime: true,
      quickRemarks: [
        'Interested in product demo, scheduled follow-up call.',
        'Sent details via WhatsApp, awaiting customer feedback.',
        'Customer currently busy, requested call back later.',
        'Price quotation sent, follow-up pending with decision maker.',
      ],
    };
  });

  // --- 4. ADMIN GOVERNANCE SETTINGS (Role-specific for Admins & Owners) ---
  const [adminSettings, setAdminSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('smartcrm_admin_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      mandatoryRecording: true,
      maskPhoneNumbers: false,
      autoRecycleDormantLeads: true,
      recycleDormantHours: 48,
      restrictDataExport: true,
      duplicateMobileGuard: true,
      sessionTimeoutMinutes: 60,
      companyName: 'Smart CRM Organization',
      companyEmail: 'support@smartcrm.com',
      companyPhone: '+91 98765 43210',
      companyGst: '07AAAAA0000A1Z5',
    };
  });

  // --- 5. AUDIO & MICROPHONE HARDWARE TEST STATE ---
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animFrameRef = useRef(null);

  // Stop mic testing
  const stopMicTest = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsTestingMic(false);
    setMicVolumeLevel(0);
  }, []);

  // Cleanup mic on unmount
  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, [stopMicTest]);

  // Start microphone hardware test
  const startMicTest = async () => {
    if (isTestingMic) {
      stopMicTest();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      setIsTestingMic(true);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicVolumeLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
      addToast('Microphone live feed connected! Speak to test voice input levels.', 'info');
    } catch (err) {
      console.warn('Microphone permission or hardware error:', err);
      addToast('Could not access microphone. Please grant browser microphone permissions.', 'error');
      setIsTestingMic(false);
    }
  };

  // Play test audio chime
  const playTestChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      addToast('Notification chime played successfully!', 'success');
    } catch {
      addToast('AudioContext not supported in this browser.', 'error');
    }
  };

  // Handle Call Recording Toggles
  const handleToggleCallRecording = (key) => {
    if (key === 'enabled' && adminSettings.mandatoryRecording && !isAdmin) {
      addToast('Call recording is mandatory per Organization Security Policy.', 'warning');
      return;
    }
    setCallRecording((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      setHasChanges(true);
      return updated;
    });
  };

  // Save All Settings
  const handleSaveSettings = () => {
    localStorage.setItem('notification_settings', JSON.stringify(notifications));
    localStorage.setItem('smartcrm_call_recording_settings', JSON.stringify(callRecording));
    localStorage.setItem('smartcrm_call_recording_enabled', JSON.stringify(callRecording.enabled));
    localStorage.setItem('smartcrm_member_settings', JSON.stringify(memberSettings));
    if (isAdmin) {
      localStorage.setItem('smartcrm_admin_settings', JSON.stringify(adminSettings));
    }
    setHasChanges(false);
    addToast('All preferences and workspace settings saved successfully!', 'success');
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    const defaultRecording = {
      enabled: true,
      consentBeep: true,
      noiseSuppression: true,
      waveformVisuals: true,
    };
    const defaultNotifications = {
      email: true,
      whatsapp: true,
      browser: true,
      followup: true,
      birthday: false,
      chimeAlert: true,
    };
    const defaultMember = {
      dialerMode: 'webrtc',
      postCallWrapupTimer: 30,
      autoAdvanceFollowup: true,
      dailyCallGoal: 50,
      reminderChime: true,
      quickRemarks: [
        'Interested in product demo, scheduled follow-up call.',
        'Sent details via WhatsApp, awaiting customer feedback.',
        'Customer currently busy, requested call back later.',
        'Price quotation sent, follow-up pending with decision maker.',
      ],
    };

    setCallRecording(defaultRecording);
    setNotifications(defaultNotifications);
    setMemberSettings(defaultMember);
    setThemeColor('blue');
    setTimezone('Asia/Kolkata');

    localStorage.setItem('smartcrm_call_recording_settings', JSON.stringify(defaultRecording));
    localStorage.setItem('smartcrm_call_recording_enabled', 'true');
    localStorage.setItem('notification_settings', JSON.stringify(defaultNotifications));
    localStorage.setItem('smartcrm_member_settings', JSON.stringify(defaultMember));

    setHasChanges(false);
    addToast('Preferences restored to standard CRM defaults.', 'info');
  };

  // Theme Colors Palette
  const themeColors = [
    { key: 'blue', label: 'Paymanent Navy', class: 'bg-[#1f346c]', hex: '#1f346c' },
    { key: 'indigo', label: 'Royal Indigo', class: 'bg-indigo-600', hex: '#4f46e5' },
    { key: 'cyan', label: 'Ocean Cyan', class: 'bg-cyan-500', hex: '#06b6d4' },
    { key: 'green', label: 'Sage Emerald', class: 'bg-emerald-600', hex: '#059669' },
    { key: 'violet', label: 'Electric Violet', class: 'bg-violet-600', hex: '#7c3aed' },
    { key: 'orange', label: 'Sunset Amber', class: 'bg-amber-500', hex: '#f59e0b' },
    { key: 'red', label: 'Crimson Rose', class: 'bg-rose-600', hex: '#e11d48' },
    { key: 'slate', label: 'Slate Monochrome', class: 'bg-slate-700', hex: '#334155' },
  ];

  // Navigation Tabs Configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Sliders },
    ...(isAdmin ? [{ id: 'admin_governance', label: 'Admin Governance', icon: Shield, badge: 'ADMIN ONLY' }] : []),
    { id: 'member_workspace', label: 'Member Workspace', icon: Target, badge: !isAdmin ? 'MEMBER' : undefined },
    { id: 'telephony', label: 'Telephony & Audio', icon: Mic },
    { id: 'appearance', label: 'Appearance & Themes', icon: Sparkles },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'backup', label: 'Data & Backup', icon: Download },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header with Role Badge and Save Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div
            style={{
              backgroundColor: 'var(--color-primary-600)',
              boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.25)',
            }}
            className="w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-md shrink-0"
          >
            <Sliders size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">
                Settings &amp; Preferences
              </h1>
              <span
                style={{
                  borderColor: 'var(--color-primary-400)',
                  color: 'var(--color-primary-700, #047857)',
                  backgroundColor: 'rgba(var(--color-primary-500-rgb, 16 185 129), 0.14)',
                }}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-2xs dark:text-white"
              >
                {roleInfo.badge} PANEL
              </span>
              {hasChanges && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5">
              {isAdmin
                ? 'Centralized control center: Organization governance, lead privacy, audio telemetry & workspace defaults'
                : 'Personal agent workstation: Telephony dialing mode, daily agenda goals, quick remarks & audio diagnostics'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 text-xs font-semibold text-dark-600 dark:text-dark-300 bg-dark-50 hover:bg-dark-100 dark:bg-dark-700 dark:hover:bg-dark-600 rounded-xl border border-dark-200 dark:border-dark-600 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Restore default CRM settings"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSaveSettings}
            style={{
              backgroundColor: 'var(--color-primary-600)',
              boxShadow: hasChanges
                ? '0 4px 16px 0 rgba(var(--color-primary-500-rgb, 43, 73, 138), 0.55)'
                : undefined,
            }}
            className={`px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
              hasChanges ? 'animate-bounce' : 'hover:opacity-90'
            }`}
          >
            <Save size={15} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Navigation Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-dark-200 dark:border-dark-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--color-primary-600)',
                      boxShadow: '0 2px 10px -1px rgba(var(--color-primary-500-rgb, 43, 73, 138), 0.45)',
                    }
                  : undefined
              }
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'text-white shadow-xs'
                  : 'bg-white dark:bg-dark-800 text-dark-600 dark:text-dark-300 border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700/60'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Settings Panels) */}
        <div className="lg:col-span-2 space-y-6">

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Role Context Welcome Banner */}
              {/* Role Context Welcome Banner */}
              <div
                style={{
                  backgroundColor: '#0c1322',
                  backgroundImage:
                    'linear-gradient(135deg, #0c1322 0%, #162444 50%, #0c1322 100%)',
                  borderColor: '#1e293b',
                }}
                className="p-6 rounded-2xl text-white shadow-xl relative overflow-hidden border"
              >
                {/* Dynamic theme accent radial glow */}
                <div
                  style={{
                    background:
                      'radial-gradient(circle at 100% 0%, var(--color-primary-500) 0%, transparent 70%)',
                    opacity: 0.25,
                  }}
                  className="absolute -right-10 -top-10 w-80 h-80 pointer-events-none rounded-full blur-2xl"
                />

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <span
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'var(--color-primary-400)',
                        color: 'var(--color-primary-300)',
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider mb-2.5 shadow-xs"
                    >
                      <Sparkles size={12} style={{ color: 'var(--color-primary-400)' }} />
                      {isAdmin ? 'ADMINISTRATOR ENVIRONMENT' : 'TEAM MEMBER WORKSPACE'}
                    </span>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      Welcome, {user?.name || 'CRM User'}!
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-200 mt-1.5 max-w-xl leading-relaxed font-normal">
                      {isAdmin
                        ? 'You have complete administrative privilege. Configure organization-wide security rules, customer data masking, dormant lead distribution, and call recording compliance below.'
                        : 'Your personal member desk is optimized for high-volume customer calling, fast follow-up pacing, and WebRTC audio telemetry.'}
                    </p>
                  </div>
                </div>

                {/* Quick status pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/15 text-xs relative z-10">
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
                    <span className="text-[10px] text-slate-300 block uppercase font-bold tracking-wider">
                      Dialer Mode
                    </span>
                    <span className="font-bold text-white text-sm capitalize">
                      {memberSettings.dialerMode.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
                    <span className="text-[10px] text-slate-300 block uppercase font-bold tracking-wider">
                      Call Recording
                    </span>
                    <span
                      style={{ color: 'var(--color-primary-300)' }}
                      className="font-bold text-sm flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {callRecording.enabled ? 'Enabled (Active)' : 'Disabled'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
                    <span className="text-[10px] text-slate-300 block uppercase font-bold tracking-wider">
                      Daily Goal
                    </span>
                    <span style={{ color: 'var(--color-primary-300)' }} className="font-bold text-sm">
                      {memberSettings.dailyCallGoal} Calls/Day
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
                    <span className="text-[10px] text-slate-300 block uppercase font-bold tracking-wider">
                      Data Masking
                    </span>
                    <span
                      className={`font-bold text-sm ${
                        adminSettings.maskPhoneNumbers ? 'text-emerald-300' : 'text-slate-200'
                      }`}
                    >
                      {adminSettings.maskPhoneNumbers ? 'Enforced' : 'Visible'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Jump Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isAdmin && (
                  <div
                    onClick={() => setActiveTab('admin_governance')}
                    className="p-4 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 hover:border-blue-500 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Shield size={20} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">
                        Admin Only
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-dark-900 dark:text-white group-hover:text-primary-600 transition-colors">
                      Organization &amp; Security Policy
                    </h3>
                    <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                      Configure lead phone masking, dormant lead re-queueing, and mandatory recording compliance.
                    </p>
                  </div>
                )}

                <div
                  onClick={() => setActiveTab('member_workspace')}
                  className="p-4 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 hover:border-emerald-500 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Target size={20} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                      Workspace
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-dark-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    Member Workflow &amp; Calling Flow
                  </h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                    Select in-app dialer mode, post-call wrap-up grace buffer, daily target goals, and quick remarks presets.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('telephony')}
                  className="p-4 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 hover:border-sky-500 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Mic size={20} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 uppercase">
                      Audio Test
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-dark-900 dark:text-white group-hover:text-sky-600 transition-colors">
                    Audio Diagnostics &amp; Voice Recording
                  </h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                    Test your microphone input in real-time, configure consent beep tones, and hardware noise filtering.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('appearance')}
                  className="p-4 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 hover:border-violet-500 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Sparkles size={20} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 uppercase">
                      Theme
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-dark-900 dark:text-white group-hover:text-violet-600 transition-colors">
                    Appearance &amp; 8 Theme Accents
                  </h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                    Toggle dark / light modes and customize system color accents across cards, buttons, and navigation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ADMIN GOVERNANCE (ADMIN ONLY) */}
          {activeTab === 'admin_governance' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700 bg-blue-50/60 dark:bg-blue-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                        <span>Organization Telephony &amp; Data Security</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                          CENTRAL POLICY
                        </span>
                      </h2>
                      <p className="text-xs text-dark-500 dark:text-dark-400">
                        Enforce compliance, mask customer records, and automate dormant lead redistribution.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Rule 1: Mandatory Call Recording */}
                  <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/40 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Lock size={18} className="text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-dark-900 dark:text-white">
                          Enforce Mandatory Call Recording Platform-Wide
                        </p>
                        <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                          When enabled, frontline Team Members cannot disable call audio recording in their personal desks.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSettings(prev => ({ ...prev, mandatoryRecording: !prev.mandatoryRecording }));
                        if (!adminSettings.mandatoryRecording) {
                          setCallRecording(prev => ({ ...prev, enabled: true }));
                        }
                        setHasChanges(true);
                      }}
                      style={adminSettings.mandatoryRecording ? { backgroundColor: 'var(--color-primary-600)' } : undefined}
                      className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer ${
                        adminSettings.mandatoryRecording ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5.5 h-5.5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
                        adminSettings.mandatoryRecording ? 'left-6' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Rule 2: Phone Number Masking */}
                  <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/40 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <PhoneCall size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-dark-900 dark:text-white">
                          Customer Phone Number Privacy Masking
                        </p>
                        <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                          Mask middle digits (<code className="px-1 py-0.5 bg-dark-100 dark:bg-dark-700 rounded text-emerald-600">+91 98765*****</code>) on Member tables to prevent lead data leakage.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSettings(prev => ({ ...prev, maskPhoneNumbers: !prev.maskPhoneNumbers }));
                        setHasChanges(true);
                      }}
                      style={adminSettings.maskPhoneNumbers ? { backgroundColor: 'var(--color-primary-600)' } : undefined}
                      className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer ${
                        adminSettings.maskPhoneNumbers ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5.5 h-5.5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
                        adminSettings.maskPhoneNumbers ? 'left-6' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Rule 3: Dormant Lead Auto-Recycle */}
                  <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/40 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm text-dark-900 dark:text-white">
                            Auto-Recycle Dormant Leads to Unassigned Pool
                          </p>
                          <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                            Automatically return assigned leads untouched without remarks to the unassigned queue.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminSettings(prev => ({ ...prev, autoRecycleDormantLeads: !prev.autoRecycleDormantLeads }));
                          setHasChanges(true);
                        }}
                        style={adminSettings.autoRecycleDormantLeads ? { backgroundColor: 'var(--color-primary-600)' } : undefined}
                        className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer ${
                          adminSettings.autoRecycleDormantLeads ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-5.5 h-5.5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
                          adminSettings.autoRecycleDormantLeads ? 'left-6' : 'left-0.5'
                        }`} />
                      </button>
                    </div>

                    {adminSettings.autoRecycleDormantLeads && (
                      <div className="flex items-center gap-3 pt-2 border-t border-dark-100 dark:border-dark-700/60">
                        <span className="text-xs font-medium text-dark-700 dark:text-dark-300">Inactivity Trigger:</span>
                        <select
                          value={adminSettings.recycleDormantHours}
                          onChange={(e) => {
                            setAdminSettings(prev => ({ ...prev, recycleDormantHours: Number(e.target.value) }));
                            setHasChanges(true);
                          }}
                          className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none"
                        >
                          <option value={24}>24 Hours without activity</option>
                          <option value={48}>48 Hours without activity</option>
                          <option value={72}>72 Hours without activity</option>
                          <option value={168}>7 Days without activity</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Rule 4: Restrict Data Export to Admins */}
                  <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/40 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Download size={18} className="text-violet-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-dark-900 dark:text-white">
                          Restrict Excel/CSV Customer Export to Admins Only
                        </p>
                        <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                          Disables bulk client data download button on Team Member desks to safeguard company leads.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSettings(prev => ({ ...prev, restrictDataExport: !prev.restrictDataExport }));
                        setHasChanges(true);
                      }}
                      style={adminSettings.restrictDataExport ? { backgroundColor: 'var(--color-primary-600)' } : undefined}
                      className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer ${
                        adminSettings.restrictDataExport ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5.5 h-5.5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
                        adminSettings.restrictDataExport ? 'left-6' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Rule 5: Strict Duplicate Mobile Number Guard */}
                  <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/40 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={18} className="text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-dark-900 dark:text-white">
                          Strict 10-Digit Mobile Deduplication Guard
                        </p>
                        <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                          Automatically reject duplicate mobile numbers during Excel imports and manual contact entry.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSettings(prev => ({ ...prev, duplicateMobileGuard: !prev.duplicateMobileGuard }));
                        setHasChanges(true);
                      }}
                      style={adminSettings.duplicateMobileGuard ? { backgroundColor: 'var(--color-primary-600)' } : undefined}
                      className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer ${
                        adminSettings.duplicateMobileGuard ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5.5 h-5.5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
                        adminSettings.duplicateMobileGuard ? 'left-6' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Company Organization Branding */}
              <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-dark-100 dark:border-dark-700">
                  <Building2 size={20} className="text-blue-600" />
                  <div>
                    <h3 className="font-bold text-sm text-dark-900 dark:text-white">
                      Organization Profile &amp; Contact Details
                    </h3>
                    <p className="text-xs text-dark-500 dark:text-dark-400">
                      Appears on customer email headers, SMS dispatches, and WhatsApp outbound signatures.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-dark-700 dark:text-dark-300 mb-1">Company Legal Name</label>
                    <input
                      type="text"
                      value={adminSettings.companyName}
                      onChange={(e) => {
                        setAdminSettings(prev => ({ ...prev, companyName: e.target.value }));
                        setHasChanges(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-dark-700 dark:text-dark-300 mb-1">Support Hotline Phone</label>
                    <input
                      type="text"
                      value={adminSettings.companyPhone}
                      onChange={(e) => {
                        setAdminSettings(prev => ({ ...prev, companyPhone: e.target.value }));
                        setHasChanges(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-dark-700 dark:text-dark-300 mb-1">Official Support Email</label>
                    <input
                      type="email"
                      value={adminSettings.companyEmail}
                      onChange={(e) => {
                        setAdminSettings(prev => ({ ...prev, companyEmail: e.target.value }));
                        setHasChanges(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-dark-700 dark:text-dark-300 mb-1">GST / Tax Identification</label>
                    <input
                      type="text"
                      value={adminSettings.companyGst}
                      onChange={(e) => {
                        setAdminSettings(prev => ({ ...prev, companyGst: e.target.value }));
                        setHasChanges(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MEMBER WORKSPACE (Role-specific for Members & Calling flow) */}
          {activeTab === 'member_workspace' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Target size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                        <span>Member Dialing &amp; Calling Workflow</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                          AGENT DESK
                        </span>
                      </h2>
                      <p className="text-xs text-dark-500 dark:text-dark-400">
                        Customize how customer calls connect, pacing between calls, and 1-click quick notes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Option 1: Dialer Mode Selection */}
                  <div>
                    <label className="block text-sm font-bold text-dark-900 dark:text-white mb-2 flex items-center gap-2">
                      <Phone size={16} className="text-emerald-600" />
                      <span>Primary Telephony Connection Mode</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          id: 'webrtc',
                          title: 'In-App VoIP Dialer',
                          desc: 'Direct audio call inside CRM with live waveform spectrum and recording.',
                          icon: Monitor,
                        },
                        {
                          id: 'phonelink',
                          title: 'Phone Link / Tel Protocol',
                          desc: 'Triggers Windows Phone Link or default computer telephony application.',
                          icon: Smartphone,
                        },
                        {
                          id: 'mobile_companion',
                          title: 'Mobile Companion QR',
                          desc: 'Handoff phone number to your connected smartphone for direct SIM calling.',
                          icon: Sparkles,
                        },
                      ].map((mode) => {
                        const Icon = mode.icon;
                        const isSelected = memberSettings.dialerMode === mode.id;
                        return (
                          <div
                            key={mode.id}
                            onClick={() => {
                              setMemberSettings(prev => ({ ...prev, dialerMode: mode.id }));
                              setHasChanges(true);
                            }}
                            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                                : 'bg-dark-50/60 dark:bg-dark-900/40 border-dark-200 dark:border-dark-700 hover:border-dark-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Icon size={18} className={isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-dark-500'} />
                              {isSelected && <Check size={14} className="text-emerald-600" />}
                            </div>
                            <h4 className="text-xs font-bold text-dark-900 dark:text-white">
                              {mode.title}
                            </h4>
                            <p className="text-[11px] text-dark-500 dark:text-dark-400 mt-1 leading-snug">
                              {mode.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Option 2: Post-Call Wrap-up Grace Timer */}
                  <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/40 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-start gap-2.5">
                        <Clock size={18} className="text-blue-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-sm text-dark-900 dark:text-white">
                            Post-Call Wrap-up Grace Buffer
                          </p>
                          <p className="text-xs text-dark-500 dark:text-dark-400">
                            Gives you time to enter remarks and update stage before the next contact loads.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[0, 15, 30, 60].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setMemberSettings(prev => ({ ...prev, postCallWrapupTimer: sec }));
                              setHasChanges(true);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              memberSettings.postCallWrapupTimer === sec
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white dark:bg-dark-800 text-dark-600 dark:text-dark-300 border border-dark-200 dark:border-dark-700'
                            }`}
                          >
                            {sec === 0 ? 'None' : `${sec}s`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Option 3: Auto-Advance Follow-ups */}
                  <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/40 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Zap size={18} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-dark-900 dark:text-white">
                          Auto-Advance to Next Follow-up in Queue
                        </p>
                        <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                          Immediately open next scheduled agenda client profile after submitting follow-up notes.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMemberSettings(prev => ({ ...prev, autoAdvanceFollowup: !prev.autoAdvanceFollowup }));
                        setHasChanges(true);
                      }}
                      style={memberSettings.autoAdvanceFollowup ? { backgroundColor: 'var(--color-primary-600)' } : undefined}
                      className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer ${
                        memberSettings.autoAdvanceFollowup ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5.5 h-5.5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
                        memberSettings.autoAdvanceFollowup ? 'left-6' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Option 4: Daily Call Goal */}
                  <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/40 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                      <Flame size={18} className="text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-dark-900 dark:text-white">
                          Daily Outbound Call Goal Target
                        </p>
                        <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                          Tracks your daily progress bar on Member Home Dashboard with celebratory ping upon reaching 100%.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {[25, 50, 75, 100].map((goal) => (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => {
                            setMemberSettings(prev => ({ ...prev, dailyCallGoal: goal }));
                            setHasChanges(true);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            memberSettings.dailyCallGoal === goal
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 border border-dark-200 dark:border-dark-700'
                          }`}
                        >
                          {goal} Calls
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 5: Customizable Quick Remarks Presets */}
                  <div className="space-y-3 pt-2 border-t border-dark-100 dark:border-dark-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <h3 className="font-bold text-sm text-dark-900 dark:text-white">
                          Quick Remarks 1-Click Presets
                        </h3>
                      </div>
                      <span className="text-[11px] text-dark-400">
                        Auto-fills call logs &amp; remarks
                      </span>
                    </div>

                    <div className="space-y-2">
                      {memberSettings.quickRemarks.map((snippet, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={snippet}
                            onChange={(e) => {
                              const updated = [...memberSettings.quickRemarks];
                              updated[idx] = e.target.value;
                              setMemberSettings(prev => ({ ...prev, quickRemarks: updated }));
                              setHasChanges(true);
                            }}
                            className="flex-1 px-3 py-1.5 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-xs text-dark-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TELEPHONY & AUDIO PREFERENCES */}
          {(activeTab === 'telephony' || activeTab === 'overview') && (
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700 bg-slate-50/70 dark:bg-dark-900/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Mic size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                      <span>Call Recording &amp; Audio Telemetry</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        callRecording.enabled
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300'
                      }`}>
                        {callRecording.enabled ? 'ACTIVE' : 'OFF'}
                      </span>
                    </h3>
                    <p className="text-xs text-dark-500 dark:text-dark-400">
                      Configure microphone voice capture and audio telemetry during customer calls
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Primary Toggle Bar: Automatic Call Recording */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Volume2 size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-dark-900 dark:text-white flex items-center gap-2">
                        <span>Automatic Call Audio Recording</span>
                        {adminSettings.mandatoryRecording && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                            Org Policy Locked
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5 leading-relaxed">
                        Captures authentic stereo audio stream when in-app calls are answered.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCallRecording('enabled')}
                    disabled={adminSettings.mandatoryRecording && !isAdmin}
                    style={callRecording.enabled ? { backgroundColor: 'var(--color-primary-600)' } : undefined}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed ${
                      callRecording.enabled ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                        callRecording.enabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Sub-Toggles */}
                <div className="space-y-3">
                  {/* Audible Consent Beep */}
                  <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700/60">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={18} className="text-dark-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-xs text-dark-900 dark:text-white">
                          Call Recording Consent Beep
                        </p>
                        <p className="text-[11px] text-dark-400">
                          Play an audible chime informing participants that the conversation is being recorded.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCallRecording('consentBeep')}
                      style={callRecording.consentBeep ? { backgroundColor: 'var(--color-primary-600)' } : undefined}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 cursor-pointer ${
                        callRecording.consentBeep ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-300 ${
                        callRecording.consentBeep ? 'left-5.5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Noise Suppression & AGC */}
                  <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700/60">
                    <div className="flex items-start gap-3">
                      <Mic size={18} className="text-dark-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-xs text-dark-900 dark:text-white">
                          Acoustic Echo Cancellation &amp; Hardware Noise Suppression
                        </p>
                        <p className="text-[11px] text-dark-400">
                          Filters office background audio and levels voice gain via WebRTC processing.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCallRecording('noiseSuppression')}
                      style={callRecording.noiseSuppression ? { backgroundColor: 'var(--color-primary-600)' } : undefined}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 cursor-pointer ${
                        callRecording.noiseSuppression ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-300 ${
                        callRecording.noiseSuppression ? 'left-5.5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Waveform Visualizer */}
                  <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700/60">
                    <div className="flex items-start gap-3">
                      <Waves size={18} className="text-dark-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-xs text-dark-900 dark:text-white">
                          Live Voice Spectrum &amp; Waveform Visualizer
                        </p>
                        <p className="text-[11px] text-dark-400">
                          Displays dynamic audio frequencies on the dialer screen during active calls.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCallRecording('waveformVisuals')}
                      style={callRecording.waveformVisuals ? { backgroundColor: 'var(--color-primary-600)' } : undefined}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 cursor-pointer ${
                        callRecording.waveformVisuals ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-300 ${
                        callRecording.waveformVisuals ? 'left-5.5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Live Microphone Hardware Level Tester */}
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                        <Mic size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-dark-900 dark:text-white">
                          Hardware Microphone Level Diagnostic
                        </p>
                        <p className="text-[11px] text-dark-500 dark:text-dark-400">
                          Verify headset input sensitivity before dialer sessions.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={startMicTest}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isTestingMic
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      {isTestingMic ? <VolumeX size={14} /> : <Play size={14} />}
                      <span>{isTestingMic ? 'Stop Test' : 'Test Mic Level'}</span>
                    </button>
                  </div>

                  {/* Reactive Volume Gauge */}
                  <div>
                    <div className="flex justify-between text-[11px] text-dark-500 mb-1">
                      <span>Mic Input Level: <strong className="text-dark-900 dark:text-white">{micVolumeLevel}%</strong></span>
                      <span className={micVolumeLevel > 60 ? 'text-emerald-600 font-bold' : 'text-dark-400'}>
                        {isTestingMic ? (micVolumeLevel > 15 ? 'Receiving Voice Signal' : 'Quiet / Muted') : 'Ready to Test'}
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-dark-200 dark:bg-dark-700 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-75 rounded-full ${
                          micVolumeLevel > 70
                            ? 'bg-amber-500'
                            : micVolumeLevel > 20
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${isTestingMic ? micVolumeLevel : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: APPEARANCE & THEMES */}
          {(activeTab === 'appearance' || activeTab === 'overview') && (
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-primary-600" />
                    <span>Appearance &amp; 8 Theme Accents</span>
                  </h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                    Customize dark/light mode and application branding accents.
                  </p>
                </div>
              </div>

              {/* Dark Mode */}
              <div className="px-6 py-4 border-b border-dark-100 dark:border-dark-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-dark-700' : 'bg-yellow-100'}`}>
                      {darkMode ? <Moon size={22} className="text-primary-400" /> : <Sun size={22} className="text-yellow-500" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-dark-900 dark:text-white">Dark Theme Interface</p>
                      <p className="text-xs text-dark-500 dark:text-dark-400">
                        {darkMode ? 'Dark mode active (eye protection enabled)' : 'Light mode active'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    style={darkMode ? { backgroundColor: 'var(--color-primary-600)' } : undefined}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 cursor-pointer ${
                      darkMode ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                        darkMode ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Theme Color Palette */}
              <div className="p-6">
                <p className="font-semibold text-xs text-dark-700 dark:text-dark-300 mb-3">
                  Choose Color Accent (System-wide active buttons, badges &amp; tabs)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {themeColors.map((color) => {
                    const isCurrent = themeColor === color.key;
                    return (
                      <div
                        key={color.key}
                        onClick={() => {
                          setThemeColor(color.key);
                          setHasChanges(true);
                        }}
                        style={
                          isCurrent
                            ? {
                                borderColor: 'var(--color-primary-500)',
                                boxShadow: '0 0 14px -2px rgba(var(--color-primary-500-rgb, 43, 73, 138), 0.5)',
                              }
                            : undefined
                        }
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          isCurrent
                            ? 'border-dark-900 dark:border-white shadow-xs bg-dark-50 dark:bg-dark-900/50 ring-2 ring-primary-500/30'
                            : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full shrink-0 shadow-2xs ${color.class}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-dark-900 dark:text-white truncate">
                            {color.label}
                          </p>
                          <p className="text-[10px] text-dark-400 capitalize">{color.key}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {(activeTab === 'notifications' || activeTab === 'overview') && (
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                    <Bell size={18} style={{ color: 'var(--color-primary-500)' }} />
                    <span>Notification Channels &amp; Reminders</span>
                  </h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                    Select communication dispatches for follow-ups and events.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={playTestChime}
                  style={{
                    color: 'var(--color-primary-500)',
                    borderColor: 'rgba(var(--color-primary-500-rgb, 43, 73, 138), 0.35)',
                    backgroundColor: 'rgba(var(--color-primary-500-rgb, 43, 73, 138), 0.12)',
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer hover:opacity-85"
                >
                  <Volume2 size={13} />
                  <span>Test Chime</span>
                </button>
              </div>

              <div className="p-4 space-y-2">
                {[
                  { key: 'email', label: 'Email Follow-up Dispatches', desc: 'Sends email updates to client & lead owner upon status change', Icon: Mail },
                  { key: 'whatsapp', label: 'WhatsApp Instant Notifications', desc: 'Syncs customer notifications with WhatsApp Web API', Icon: MessageCircle },
                  { key: 'browser', label: 'Browser Desktop Push Alerts', desc: 'Displays system notifications on your computer screen', Icon: Monitor },
                  { key: 'followup', label: 'Follow-up Due Alerts', desc: 'Notifies 15 minutes before customer meeting time', Icon: PhoneCall },
                  { key: 'birthday', label: 'Client Birthday Greetings', desc: 'Alerts of customer milestones and birthday reminders', Icon: Gift },
                  { key: 'chimeAlert', label: 'Audible Sound on Task Completion', desc: 'Plays a pleasant tone when concluding customer follow-ups', Icon: Volume2 },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-dark-50 dark:hover:bg-dark-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key]}
                          onChange={(e) => {
                            setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }));
                            setHasChanges(true);
                          }}
                          style={{ accentColor: 'var(--color-primary-500)' }}
                          className="w-4.5 h-4.5 text-primary-600 rounded border-dark-300 focus:ring-primary-500 cursor-pointer"
                        />
                        <item.Icon size={18} className="text-dark-500 shrink-0" />
                        <div>
                          <p className="font-semibold text-xs text-dark-900 dark:text-white">{item.label}</p>
                          <p className="text-[11px] text-dark-500 dark:text-dark-400">{item.desc}</p>
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: BACKUP & DATA */}
          {(activeTab === 'backup' || activeTab === 'overview') && (
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-dark-100 dark:border-dark-700">
                <Globe size={18} className="text-primary-600" />
                <div>
                  <h3 className="font-bold text-sm text-dark-900 dark:text-white">
                    System Timezone &amp; Data Configuration
                  </h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400">
                    Control display timezone and export/import CRM configuration files.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
                  Display Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value);
                    setHasChanges(true);
                  }}
                  className="w-full px-3.5 py-2.5 border border-dark-200 dark:border-dark-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Asia/Kolkata">IST (Asia/Kolkata) +05:30 (India Standard Time)</option>
                  <option value="UTC">UTC +00:00 (Coordinated Universal Time)</option>
                  <option value="America/New_York">EST (America/New_York) -05:00</option>
                  <option value="America/Los_Angeles">PST (America/Los_Angeles) -08:00</option>
                  <option value="Europe/London">GMT (Europe/London) +00:00</option>
                  <option value="Asia/Dubai">GST (Asia/Dubai) +04:00</option>
                  <option value="Asia/Singapore">SGT (Asia/Singapore) +08:00</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const data = {
                      themeColor,
                      darkMode,
                      timezone,
                      callRecording,
                      notifications,
                      memberSettings,
                      ...(isAdmin ? { adminSettings } : {}),
                      exportedAt: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `smartcrm-settings-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    addToast('Settings snapshot exported successfully!', 'success');
                  }}
                  className="p-3 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 hover:border-blue-500 flex items-center justify-between text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <Download size={18} className="text-blue-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-xs font-bold text-dark-900 dark:text-white">Export Settings JSON</p>
                      <p className="text-[10px] text-dark-400">Download complete configuration backup</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-dark-400">.json</span>
                </button>

                <label className="p-3 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 hover:border-emerald-500 flex items-center justify-between text-left transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <Upload size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-xs font-bold text-dark-900 dark:text-white">Import / Restore Settings</p>
                      <p className="text-[10px] text-dark-400">Load configuration from JSON file</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const parsed = JSON.parse(event.target.result);
                          if (parsed.callRecording) setCallRecording(parsed.callRecording);
                          if (parsed.notifications) setNotifications(parsed.notifications);
                          if (parsed.memberSettings) setMemberSettings(parsed.memberSettings);
                          if (parsed.adminSettings && isAdmin) setAdminSettings(parsed.adminSettings);
                          if (parsed.themeColor) setThemeColor(parsed.themeColor);
                          if (parsed.timezone) setTimezone(parsed.timezone);
                          addToast('Settings successfully imported and restored!', 'success');
                        } catch {
                          addToast('Invalid settings JSON format.', 'error');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                  <span className="text-[10px] font-mono text-dark-400">Upload</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Status Cards & Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Role Card */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {user?.avatar || (user?.name ? user.name[0].toUpperCase() : 'U')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-dark-900 dark:text-white truncate">
                  {user?.name || 'CRM User'}
                </p>
                <p className="text-xs text-dark-400 truncate">
                  {user?.email || 'user@smartcrm.com'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-dark-100 dark:border-dark-700/60 flex items-center justify-between text-xs">
              <span className="text-dark-500 dark:text-dark-400">Role Authority:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleInfo.badgeClass}`}>
                {roleInfo.badge}
              </span>
            </div>

            <p className="text-[11px] text-dark-500 dark:text-dark-400 bg-dark-50 dark:bg-dark-900/60 p-2.5 rounded-xl border border-dark-100 dark:border-dark-700 leading-relaxed">
              {roleInfo.description}
            </p>
          </div>

          {/* Current Configuration Summary */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm p-5 space-y-3 text-xs">
            <h3 className="font-bold text-sm text-dark-900 dark:text-white pb-2 border-b border-dark-100 dark:border-dark-700">
              Active Configuration
            </h3>

            <div className="flex items-center justify-between py-1 border-b border-dark-100 dark:border-dark-700/60">
              <span className="text-dark-500 dark:text-dark-400">Dialer Mode:</span>
              <span className="font-semibold text-dark-900 dark:text-white capitalize">
                {memberSettings.dialerMode.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-dark-100 dark:border-dark-700/60">
              <span className="text-dark-500 dark:text-dark-400">Call Recording:</span>
              <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {callRecording.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-dark-100 dark:border-dark-700/60">
              <span className="text-dark-500 dark:text-dark-400">Daily Target:</span>
              <span className="font-semibold text-dark-900 dark:text-white">
                {memberSettings.dailyCallGoal} calls/day
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-dark-100 dark:border-dark-700/60">
              <span className="text-dark-500 dark:text-dark-400">Appearance Theme:</span>
              <span className="flex items-center gap-1.5 font-medium text-dark-900 dark:text-white capitalize">
                <span className={`w-3 h-3 rounded-full ${
                  themeColor === 'blue' ? 'bg-[#1f346c]' :
                  themeColor === 'indigo' ? 'bg-indigo-600' :
                  themeColor === 'cyan' ? 'bg-cyan-500' :
                  themeColor === 'green' ? 'bg-emerald-600' :
                  themeColor === 'violet' ? 'bg-violet-600' :
                  themeColor === 'orange' ? 'bg-amber-500' :
                  themeColor === 'red' ? 'bg-rose-600' :
                  'bg-slate-700'
                }`} />
                {themeColor} ({darkMode ? 'Dark' : 'Light'})
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-dark-100 dark:border-dark-700/60">
              <span className="text-dark-500 dark:text-dark-400">Timezone:</span>
              <span className="font-medium text-dark-900 dark:text-white">{timezone.split('/')[1]?.replace('_', ' ') || timezone}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-dark-500 dark:text-dark-400">Active Notifications:</span>
              <span className="font-semibold text-primary-600 dark:text-primary-400">
                {Object.values(notifications).filter(Boolean).length}/{Object.keys(notifications).length} channels
              </span>
            </div>
          </div>

          {/* Quick Support & Help Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-dark-800 dark:to-dark-800/60 border border-blue-100 dark:border-dark-700 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
              <Info size={15} />
              <span>Telephony &amp; CRM Support</span>
            </div>
            <p className="text-[11px] text-dark-600 dark:text-dark-400 leading-relaxed">
              Need assistance with SIP trunk setup, audio devices, or round-robin queue configuration?
            </p>
            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-blue-700 dark:text-blue-400">support@paymanent.com</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('support@paymanent.com');
                  addToast('Support email copied to clipboard!', 'info');
                }}
                className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Copy size={12} />
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
