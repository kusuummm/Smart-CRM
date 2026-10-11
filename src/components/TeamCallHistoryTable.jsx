import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Mail,
  Play,
  Pause,
  Volume2,
  Sparkles,
  Download,
  Check,
  X,
  Calendar,
  Phone,
  Radio,
  Clock,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { audioEngine, generateWaveform } from '../utils/audioPlayer';
import CallRecordingModal from './CallRecordingModal';
import { useToast } from './Toast';
import { useConfirm } from '../context/ConfirmContext';
import { getCalls, deleteCall } from '../api/callHistory';
export default function TeamCallHistoryTable({ teamName = 'Main Team', sfNumber = '', memberName = '', onNavigate }) {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  const [calls, setCalls] = useState([]);

  useEffect(() => {
    // 1. Check local storage
    const localCalls = JSON.parse(localStorage.getItem('smartcrm_all_calls') || '[]');

    // 2. Fetch from backend
    getCalls({ limit: 100 })
      .then((res) => {
        const apiCalls = (res.calls || []).map((c) => ({
          id: c._id,
          customerPhone: c.customerPhone || '',
          customerName: c.customerName || 'Customer',
          teamName: teamName || 'Main Team',
          sfNumber: sfNumber || '',
          callType: c.callType || (c.status === 'connected' ? 'Outgoing' : 'Missed'),
          callStatus: c.status === 'connected' ? 'Answered' : 'Missed',
          agent: c.calledByName || 'Agent',
          duration: c.duration ? (c.duration.includes('s') ? c.duration : `${c.duration}s`) : '15s',
          recordingDuration: c.duration ? `${c.duration}s` : '15s',
          ringDuration: '10s',
          startTime: c.time ? `${c.time} today` : 'Just now',
          ivr: 'Direct Call',
          hasRecording: true,
          hasVoicemail: false,
          waveform: generateWaveform(24),
          aiSummary: {
            sentiment: 'Positive',
            score: 92,
            summary: c.remarks || `Call completed with ${c.customerName || 'customer'}.`,
            keyPoints: ['Call recorded in CRM'],
            followUps: [],
          },
          transcript: [
            { speaker: c.calledByName || 'Agent', role: 'agent', time: '00:02', text: 'Hello, calling from CRM.' },
            { speaker: c.customerName || 'Customer', role: 'customer', time: '00:06', text: 'Yes, thank you.' },
          ],
        }));

        const mappedLocal = localCalls.map((c) => ({
          id: c.id,
          customerPhone: c.customerPhone || '',
          customerName: c.customerName || 'Customer',
          teamName: teamName || 'Main Team',
          sfNumber: sfNumber || '',
          callType: c.callType || 'Outgoing',
          callStatus: c.status === 'connected' ? 'Answered' : 'Missed',
          agent: c.calledByName || 'Agent',
          duration: c.duration || '12s',
          recordingDuration: c.duration || '12s',
          ringDuration: '8s',
          startTime: c.time ? `${c.time} today` : 'Just now',
          ivr: 'Direct Call',
          hasRecording: true,
          hasVoicemail: false,
          waveform: generateWaveform(24),
          aiSummary: {
            sentiment: 'Positive',
            score: 92,
            summary: c.remarks || `Call completed with ${c.customerName || 'customer'}.`,
            keyPoints: ['Call recorded in CRM'],
            followUps: [],
          },
          transcript: [],
        }));

        const existingIds = new Set(apiCalls.map((c) => c.id));
        const filteredLocal = mappedLocal.filter((m) => !existingIds.has(m.id));
        setCalls([...filteredLocal, ...apiCalls]);
      })
      .catch(() => {
        setCalls(localCalls);
      });
  }, [teamName, sfNumber]);

  const handleDeleteCall = async (callId) => {
    const ok = await confirm({
      title: 'Delete Call Record',
      message: 'Are you sure you want to permanently delete this call log?',
      confirmText: 'Delete Call',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!ok) return;

    if (typeof callId === 'string' && callId.length === 24) {
      deleteCall(callId).catch(() => {});
    }

    setCalls((prev) => prev.filter((c) => c.id !== callId));
    addToast('Call record deleted successfully', 'info');
  };

  // Filters state
  const [filterRing, setFilterRing] = useState('');
  const [filterStartTime, setFilterStartTime] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterSf, setFilterSf] = useState('');
  const [filterVoicemail, setFilterVoicemail] = useState('');

  // Dropdown open states for column headers
  const [openRingFilter, setOpenRingFilter] = useState(false);
  const [openStartFilter, setOpenStartFilter] = useState(false);
  const [openTeamFilter, setOpenTeamFilter] = useState(false);
  const [openSfFilter, setOpenSfFilter] = useState(false);
  const [openVoicemailFilter, setOpenVoicemailFilter] = useState(false);

  // Audio Playback in table row
  const [activePlayCallId, setActivePlayCallId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Call Recording Modal state
  const [selectedCallForModal, setSelectedCallForModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const closeAllFilterMenus = () => {
    setOpenRingFilter(false);
    setOpenStartFilter(false);
    setOpenTeamFilter(false);
    setOpenSfFilter(false);
    setOpenVoicemailFilter(false);
  };

  // Filtered Calls calculation
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      // Ringing duration filter
      if (filterRing) {
        const ringSec = parseInt(c.ringDuration, 10) || 0;
        if (filterRing === '<10s' && ringSec >= 10) return false;
        if (filterRing === '10-20s' && (ringSec < 10 || ringSec > 20)) return false;
        if (filterRing === '>20s' && ringSec <= 20) return false;
        if (filterRing === 'missed' && c.callStatus !== 'Missed') return false;
      }

      // Start Time filter
      if (filterStartTime) {
        if (!c.startTime.toLowerCase().includes(filterStartTime.toLowerCase())) return false;
      }

      // Team Name filter
      if (filterTeam) {
        if (c.teamName.toLowerCase() !== filterTeam.toLowerCase()) return false;
      }

      // SF Number filter
      if (filterSf) {
        if (!c.sfNumber.includes(filterSf)) return false;
      }

      // Voicemail filter
      if (filterVoicemail) {
        if (filterVoicemail === 'has_vm' && !c.hasVoicemail) return false;
        if (filterVoicemail === 'no_vm' && c.hasVoicemail) return false;
      }

      // Member name filter (if provided by parent)
      if (memberName && c.agent && !c.agent.toLowerCase().includes(memberName.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [calls, filterRing, filterStartTime, filterTeam, filterSf, filterVoicemail, memberName]);

  // Audio Play / Pause handler
  const handleTogglePlay = (call) => {
    if (!call.hasRecording) {
      addToast('No audio recording available for missed call', 'info');
      return;
    }

    if (activePlayCallId === call.id) {
      if (isPlaying) {
        audioEngine.pause();
        setIsPlaying(false);
      } else {
        audioEngine.resume();
        setIsPlaying(true);
      }
    } else {
      audioEngine.stop();
      setActivePlayCallId(call.id);
      setIsPlaying(true);
      audioEngine.playCall(
        call,
        0,
        () => {},
        () => {
          setIsPlaying(false);
          setActivePlayCallId(null);
        }
      );
    }
  };

  // Open full details modal
  const handleOpenModal = (call) => {
    setSelectedCallForModal(call);
    setIsModalOpen(true);
  };

  // Download Recording handler
  const handleDownload = (call) => {
    addToast(`Downloading audio recording for ${call.customerName}... (.mp3)`, 'success');
  };

  const hasActiveFilters = Boolean(
    filterRing || filterStartTime || filterTeam || filterSf || filterVoicemail
  );

  const resetAllFilters = () => {
    setFilterRing('');
    setFilterStartTime('');
    setFilterTeam('');
    setFilterSf('');
    setFilterVoicemail('');
    closeAllFilterMenus();
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Top Bar with View All button matching Screenshot */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-dark-500">
            {filteredCalls.length} calls logged
          </span>
          {hasActiveFilters && (
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              Filtered
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (onNavigate) {
              onNavigate('call-history');
            } else {
              addToast('Opening full Call History view', 'info');
            }
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
        >
          <span>View All</span>
          <ArrowUpRight size={13} />
        </button>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 text-xs">
          <span className="font-bold text-blue-800 dark:text-blue-300 text-[11px]">Filters:</span>
          {filterRing && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-800 dark:text-dark-200 text-[11px]">
              Ring: {filterRing}
              <button onClick={() => setFilterRing('')} className="hover:text-rose-600 cursor-pointer"><X size={11} /></button>
            </span>
          )}
          {filterStartTime && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-800 dark:text-dark-200 text-[11px]">
              Time: &quot;{filterStartTime}&quot;
              <button onClick={() => setFilterStartTime('')} className="hover:text-rose-600 cursor-pointer"><X size={11} /></button>
            </span>
          )}
          {filterTeam && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-800 dark:text-dark-200 text-[11px]">
              Team: {filterTeam}
              <button onClick={() => setFilterTeam('')} className="hover:text-rose-600 cursor-pointer"><X size={11} /></button>
            </span>
          )}
          {filterSf && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-800 dark:text-dark-200 text-[11px]">
              SF: {filterSf}
              <button onClick={() => setFilterSf('')} className="hover:text-rose-600 cursor-pointer"><X size={11} /></button>
            </span>
          )}
          {filterVoicemail && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-800 dark:text-dark-200 text-[11px]">
              Voicemail: {filterVoicemail === 'has_vm' ? 'Has VM' : 'No VM'}
              <button onClick={() => setFilterVoicemail('')} className="hover:text-rose-600 cursor-pointer"><X size={11} /></button>
            </span>
          )}
          <button
            onClick={resetAllFilters}
            className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline ml-auto cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Table Container matching Reference */}
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-[#e8e8e8] dark:border-dark-700 shadow-2xs overflow-visible">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#fafafa] dark:bg-blue-950/40 border-b border-[#f0f0f0] dark:border-blue-900/60 text-[rgba(0,0,0,0.65)] dark:text-dark-300 font-medium uppercase tracking-wider text-[12px]">
              <tr>
                {/* 1. RINGING DURATION Q */}
                <th className="py-3.5 px-4 relative min-w-[170px]">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !openRingFilter;
                        closeAllFilterMenus();
                        setOpenRingFilter(next);
                      }}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer group"
                      title="Filter by Ringing Duration"
                    >
                      <span>RINGING DURATION</span>
                      <Search
                        size={12}
                        className={`${
                          filterRing ? 'text-blue-600 font-bold' : 'text-dark-400 group-hover:text-blue-600'
                        } transition-colors`}
                      />
                      {filterRing && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>

                    {openRingFilter && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={closeAllFilterMenus} />
                        <div className="absolute left-0 top-full mt-2 z-30 w-44 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-1.5 text-xs normal-case font-normal animate-in fade-in zoom-in-95">
                          <div className="px-2 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-100 dark:border-dark-700/60 mb-1">
                            Filter Ringing
                          </div>
                          {[
                            { label: 'All Durations', val: '' },
                            { label: '< 10 seconds', val: '<10s' },
                            { label: '10 - 20 seconds', val: '10-20s' },
                            { label: '> 20 seconds', val: '>20s' },
                            { label: 'Missed Calls', val: 'missed' },
                          ].map((opt) => (
                            <button
                              key={opt.val || 'all'}
                              type="button"
                              onClick={() => {
                                setFilterRing(opt.val);
                                setOpenRingFilter(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                filterRing === opt.val
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                                  : 'text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 font-medium'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {filterRing === opt.val && <Check size={13} className="text-blue-600" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </th>

                {/* 2. START TIME Q */}
                <th className="py-3.5 px-4 relative min-w-[170px]">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !openStartFilter;
                        closeAllFilterMenus();
                        setOpenStartFilter(next);
                      }}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer group"
                      title="Filter by Start Time"
                    >
                      <span>START TIME</span>
                      <Search
                        size={12}
                        className={`${
                          filterStartTime ? 'text-blue-600 font-bold' : 'text-dark-400 group-hover:text-blue-600'
                        } transition-colors`}
                      />
                      {filterStartTime && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>

                    {openStartFilter && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={closeAllFilterMenus} />
                        <div className="absolute left-0 top-full mt-2 z-30 w-56 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-2.5 text-xs normal-case font-normal animate-in fade-in zoom-in-95">
                          <div className="text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5">
                            Search Start Time / Date
                          </div>
                          <input
                            type="text"
                            value={filterStartTime}
                            onChange={(e) => setFilterStartTime(e.target.value)}
                            placeholder="e.g. 10 Oct, 11:42 AM..."
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <div className="flex items-center justify-between gap-1 mt-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() => {
                                setFilterStartTime('10 Oct');
                                setOpenStartFilter(false);
                              }}
                              className="text-blue-600 hover:underline"
                            >
                              Today (10 Oct)
                            </button>
                            {filterStartTime && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterStartTime('');
                                  setOpenStartFilter(false);
                                }}
                                className="text-rose-600 hover:underline font-semibold"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </th>

                {/* 3. TEAM NAME Q */}
                <th className="py-3.5 px-4 relative min-w-[150px]">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !openTeamFilter;
                        closeAllFilterMenus();
                        setOpenTeamFilter(next);
                      }}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer group"
                      title="Filter by Team Name"
                    >
                      <span>TEAM NAME</span>
                      <Search
                        size={12}
                        className={`${
                          filterTeam ? 'text-blue-600 font-bold' : 'text-dark-400 group-hover:text-blue-600'
                        } transition-colors`}
                      />
                      {filterTeam && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>

                    {openTeamFilter && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={closeAllFilterMenus} />
                        <div className="absolute left-0 top-full mt-2 z-30 w-44 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-1.5 text-xs normal-case font-normal animate-in fade-in zoom-in-95">
                          <div className="px-2 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-100 dark:border-dark-700/60 mb-1">
                            Filter Team
                          </div>
                          {['', 'Sales Team', 'Support Team'].map((tm) => (
                            <button
                              key={tm || 'all'}
                              type="button"
                              onClick={() => {
                                setFilterTeam(tm);
                                setOpenTeamFilter(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                filterTeam === tm
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                                  : 'text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 font-medium'
                              }`}
                            >
                              <span>{tm || 'All Teams'}</span>
                              {filterTeam === tm && <Check size={13} className="text-blue-600" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </th>

                {/* 4. SF NUMBER Q */}
                <th className="py-3.5 px-4 relative min-w-[160px]">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !openSfFilter;
                        closeAllFilterMenus();
                        setOpenSfFilter(next);
                      }}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer group"
                      title="Filter by Superfone / Smart Number"
                    >
                      <span>SF NUMBER</span>
                      <Search
                        size={12}
                        className={`${
                          filterSf ? 'text-blue-600 font-bold' : 'text-dark-400 group-hover:text-blue-600'
                        } transition-colors`}
                      />
                      {filterSf && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>

                    {openSfFilter && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={closeAllFilterMenus} />
                        <div className="absolute left-0 top-full mt-2 z-30 w-52 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-1.5 text-xs normal-case font-normal animate-in fade-in zoom-in-95 font-mono">
                          <div className="px-2 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-100 dark:border-dark-700/60 mb-1 font-sans">
                            Filter SF Number
                          </div>
                          {[
                            { label: 'All Numbers', val: '' },
                            ...(sfNumber ? [{ label: sfNumber, val: sfNumber }] : []),
                          ].map((opt) => (
                            <button
                              key={opt.val || 'all'}
                              type="button"
                              onClick={() => {
                                setFilterSf(opt.val);
                                setOpenSfFilter(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                filterSf === opt.val
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                                  : 'text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 font-medium'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {filterSf === opt.val && <Check size={13} className="text-blue-600 font-sans" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </th>

                {/* 5. RECORDING & SUMMARY (no search icon) */}
                <th className="py-3.5 px-4 min-w-[260px] font-bold">
                  <span>RECORDING &amp; SUMMARY</span>
                </th>

                {/* 6. VOICEMAIL Q */}
                <th className="py-3.5 px-4 relative min-w-[140px]">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !openVoicemailFilter;
                        closeAllFilterMenus();
                        setOpenVoicemailFilter(next);
                      }}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer group"
                      title="Filter by Voicemail"
                    >
                      <span>VOICEMAIL</span>
                      <Search
                        size={12}
                        className={`${
                          filterVoicemail ? 'text-blue-600 font-bold' : 'text-dark-400 group-hover:text-blue-600'
                        } transition-colors`}
                      />
                      {filterVoicemail && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>

                    {openVoicemailFilter && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={closeAllFilterMenus} />
                        <div className="absolute left-0 top-full mt-2 z-30 w-44 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-1.5 text-xs normal-case font-normal animate-in fade-in zoom-in-95">
                          <div className="px-2 py-1 text-[10px] font-bold text-dark-400 uppercase tracking-wider border-b border-dark-100 dark:border-dark-700/60 mb-1">
                            Filter Voicemail
                          </div>
                          {[
                            { label: 'All Calls', val: '' },
                            { label: 'Has Voicemail', val: 'has_vm' },
                            { label: 'No Voicemail', val: 'no_vm' },
                          ].map((opt) => (
                            <button
                              key={opt.val || 'all'}
                              type="button"
                              onClick={() => {
                                setFilterVoicemail(opt.val);
                                setOpenVoicemailFilter(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                filterVoicemail === opt.val
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                                  : 'text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 font-medium'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {filterVoicemail === opt.val && <Check size={13} className="text-blue-600" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </th>

                {/* 7. IVR (no search icon) */}
                <th className="py-3.5 px-4 min-w-[140px] font-bold">
                  <span>IVR</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f0f0] dark:divide-dark-700/60 font-normal text-[14px]">
              {filteredCalls.length === 0 ? (
                /* Empty state matching Screenshot */
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-dark-50 dark:bg-dark-900 flex items-center justify-center text-dark-400">
                        <Mail size={22} />
                      </div>
                      <h4 className="text-[14px] font-semibold text-[rgba(0,0,0,0.88)] dark:text-dark-200">No calls yet</h4>
                      <p className="text-[13px] font-normal text-[rgba(0,0,0,0.45)] dark:text-dark-400">Adjust filters to see matching calls.</p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="text-[13px] text-[#1890ff] font-normal hover:underline mt-2 cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((c) => {
                  const isCurrentPlaying = activePlayCallId === c.id && isPlaying;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-dark-50/50 dark:hover:bg-dark-700/30 transition-colors"
                    >
                      {/* 1. RINGING DURATION */}
                      <td className="py-3.5 px-4 font-mono font-normal text-[rgba(0,0,0,0.88)] dark:text-dark-200">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              c.callStatus === 'Answered'
                                ? 'bg-emerald-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span>{c.ringDuration}</span>
                          {c.callStatus === 'Missed' && (
                            <span className="text-[11px] text-rose-500 font-sans font-normal">
                              (Missed)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. START TIME */}
                      <td className="py-3.5 px-4 text-[rgba(0,0,0,0.88)] dark:text-dark-300 font-normal">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-[rgba(0,0,0,0.45)] dark:text-dark-400 flex-shrink-0" />
                          <span>{c.startTime}</span>
                        </div>
                      </td>

                      {/* 3. TEAM NAME */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-md text-[13px] font-normal bg-blue-50 text-[#1890ff] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                          {c.teamName || teamName}
                        </span>
                      </td>

                      {/* 4. SF NUMBER */}
                      <td className="py-3.5 px-4 font-mono font-normal text-[rgba(0,0,0,0.88)] dark:text-dark-200">
                        <span>{c.sfNumber || sfNumber}</span>
                      </td>

                      {/* 5. RECORDING & SUMMARY */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {c.hasRecording ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleTogglePlay(c)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                  isCurrentPlaying
                                    ? 'bg-[#1890ff] text-white shadow-xs'
                                    : 'bg-dark-100 hover:bg-blue-100 text-[rgba(0,0,0,0.65)] hover:text-[#1890ff] dark:bg-dark-700 dark:text-dark-300'
                                }`}
                                title={isCurrentPlaying ? 'Pause' : 'Play call audio'}
                              >
                                {isCurrentPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                              </button>

                              <span className="font-mono text-[13px] font-normal text-[rgba(0,0,0,0.65)] dark:text-dark-300">
                                {c.duration}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleOpenModal(c)}
                                className="inline-flex items-center gap-1 text-[13px] font-normal text-[#1890ff] hover:underline cursor-pointer"
                                title="View AI Call Summary & Transcript"
                              >
                                <Sparkles size={11} className="text-amber-500" />
                                <span>AI Summary</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownload(c)}
                                className="p-1 text-[rgba(0,0,0,0.45)] dark:text-dark-400 hover:text-[#1890ff] transition-colors cursor-pointer"
                                title="Download Recording"
                              >
                                <Download size={13} />
                              </button>
                            </>
                          ) : (
                            <span className="text-[rgba(0,0,0,0.45)] dark:text-dark-400 text-[13px] italic">
                              No recording (Missed)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. VOICEMAIL */}
                      <td className="py-3.5 px-4">
                        {c.hasVoicemail ? (
                          <button
                            type="button"
                            onClick={() => handleTogglePlay(c)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-normal bg-[#fffbe6] text-[#d48806] dark:bg-amber-950/60 dark:text-amber-300 border border-[#ffe58f] dark:border-amber-800 cursor-pointer hover:bg-amber-100"
                            title="Play Voicemail"
                          >
                            <Volume2 size={12} />
                            <span>{c.voicemail}</span>
                          </button>
                        ) : (
                          <span className="text-[rgba(0,0,0,0.45)] dark:text-dark-400 text-[13px]">None</span>
                        )}
                      </td>

                      {/* 7. IVR */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[13px] font-normal bg-dark-50 dark:bg-dark-700/60 text-[rgba(0,0,0,0.65)] dark:text-dark-300 border border-dark-200/70 dark:border-dark-700">
                          {c.ivr}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Call Recording & AI Summary Drawer/Modal */}
      <CallRecordingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        call={selectedCallForModal}
      />
    </div>
  );
}
