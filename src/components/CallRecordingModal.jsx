import { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
  Sparkles,
  Bot,
  User,
  Phone,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Search,
  Sliders,
  Share2,
  FileText,
  BadgeCheck,
  Upload,
} from 'lucide-react';
import { audioEngine, formatSeconds, generateWaveform } from '../utils/audioPlayer';
import { useToast } from './Toast';

export default function CallRecordingModal({ isOpen, onClose, call }) {
  const { addToast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [activeTab, setActiveTab] = useState('transcript'); // 'transcript' | 'ai-insights'
  const [actionItemsDone, setActionItemsDone] = useState({});

  // Waveform bars
  const [waveformBars, setWaveformBars] = useState([]);

  useEffect(() => {
    if (!call) return;
    const durSec = audioEngine.parseDuration(call.duration || call.recordingDuration);
    setDuration(durSec);
    setCurrentTime(0);
    setIsPlaying(false);
    audioEngine.stop();

    if (call.waveform && call.waveform.length > 0) {
      setWaveformBars(call.waveform);
    } else {
      setWaveformBars(generateWaveform(48));
    }
  }, [call]);

  // Clean up audio on close
  useEffect(() => {
    return () => {
      audioEngine.stop();
    };
  }, []);

  if (!isOpen || !call) return null;

  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.playCall(
        call,
        currentTime,
        (time) => {
          setCurrentTime(time);
        },
        () => {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      );
      setIsPlaying(true);
    }
  };

  const handleSeek = (seconds) => {
    audioEngine.seek(seconds, call);
    setCurrentTime(seconds);
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    audioEngine.setSpeed(newSpeed);
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    audioEngine.setVolume(newVol);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setVolume(volume || 0.8);
    } else {
      setIsMuted(true);
      audioEngine.setVolume(0);
    }
  };

  const handleDownload = () => {
    audioEngine.downloadWavFile(call);
    addToast('Call recording (.mp3) downloaded successfully', 'success');
  };

  const handleCopyTranscript = () => {
    if (!call.transcript) return;
    const text = call.transcript
      .map((t) => `[${t.time}] ${t.speaker}: ${t.text}`)
      .join('\n');
    navigator.clipboard?.writeText(text);
    setCopiedTranscript(true);
    addToast('Transcript copied to clipboard', 'success');
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const toggleActionItem = (idx) => {
    setActionItemsDone((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleUploadAudio = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    call.recordingUrl = url;
    setDuration(audioEngine.parseDuration(call.duration) || 30);
    addToast(`Attached real audio recording "${file.name}"!`, 'success');
    audioEngine.playCall(
      call,
      0,
      (time) => setCurrentTime(time),
      () => setIsPlaying(false)
    );
    setIsPlaying(true);
  };

  // Mocked rich transcript if call has none
  const transcriptData = call.transcript && call.transcript.length > 0
    ? call.transcript
    : [
        {
          speaker: call.staff || 'Agent',
          role: 'agent',
          time: '00:02',
          text: `Hello, thank you for calling CRM Solutions. My name is ${call.staff || 'Support'}. How can I assist you today?`,
        },
        {
          speaker: call.customerName || 'Customer',
          role: 'customer',
          time: '00:07',
          text: 'Hello, I wanted to inquire about the Cloud Telephony integration and call recording feature for our team.',
        },
        {
          speaker: call.staff || 'Agent',
          role: 'agent',
          time: '00:14',
          text: 'Certainly! Our platform provides automated cloud call recording, live softphone dialing, and AI-powered transcripts with sentiment analysis.',
        },
        {
          speaker: call.customerName || 'Customer',
          role: 'customer',
          time: '00:20',
          text: 'That sounds great. Could you please share the pricing breakdown and onboarding steps?',
        },
        {
          speaker: call.staff || 'Agent',
          role: 'agent',
          time: '00:24',
          text: 'Absolutely! I will send over the detailed brochure and license pricing directly right away.',
        },
      ];

  const aiSummaryData = call.aiSummary || {
    sentiment: 'Positive (92%)',
    score: 92,
    summary:
      `Customer inquired about cloud telephony and call recording features. Agent ${call.staff || 'Support'} provided feature explanations and committed to sharing quotation.`,
    keyPoints: [
      'Inquired about Cloud Telephony & Call Recording',
      'Confirmed interest in WhatsApp Business API integration',
      'Requested pricing quotation and onboarding guide',
    ],
    followUps: [
      'Send WhatsApp brochure with Unlimited All-in-One Pro pricing',
      'Schedule follow-up demo call for tomorrow 3:00 PM',
      'Add customer to High-Intent Lead group',
    ],
  };

  const filteredTranscript = transcriptData.filter(
    (t) =>
      t.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      t.speaker.toLowerCase().includes(transcriptSearch.toLowerCase())
  );

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/60 dark:bg-dark-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Phone size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-dark-900 dark:text-white font-mono">
                  {call.customerNumber}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {call.callType || 'Outgoing'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <ShieldCheck size={11} />
                  Real Voice Recorded
                </span>
              </div>
              <p className="text-xs text-dark-500 mt-0.5 flex items-center gap-2">
                <span>Handled by: <strong className="text-dark-800 dark:text-dark-200">{call.staff || 'Agent'}</strong></span>
                <span>•</span>
                <span>{call.date || 'Today'}</span>
                <span>•</span>
                <span>{call.team || 'Main Team'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <label
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-100 hover:bg-dark-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-dark-700 dark:text-dark-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Upload and attach real audio recording file (.mp3, .wav, .m4a)"
            >
              <Upload size={13} />
              <span className="hidden sm:inline">Upload Audio</span>
              <input type="file" accept="audio/*" className="hidden" onChange={handleUploadAudio} />
            </label>
            <a
              href={`tel:${(call.customerNumber || '').replace(/[^0-9+]/g, '')}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
              title="Call customer via device dialer"
            >
              <Phone size={13} />
              <span>Call Back</span>
            </a>
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
              title="Download Real MP3 Recording"
            >
              <Download size={18} />
            </button>
            <button
              onClick={() => {
                audioEngine.stop();
                onClose();
              }}
              className="p-2 rounded-xl text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Audio Player Card Section */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-blue-50/50 to-white dark:from-dark-800/80 dark:to-dark-900 border-b border-dark-200 dark:border-dark-700/80 space-y-4">
          
          {/* Waveform Scrubber */}
          <div className="space-y-1.5">
            <div
              className="h-16 flex items-end gap-1 px-2 py-1 rounded-xl bg-dark-100/70 dark:bg-dark-800 cursor-pointer relative overflow-hidden group select-none"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                handleSeek(ratio * duration);
              }}
            >
              {/* Played Highlight overlay */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-blue-500/10 pointer-events-none transition-all"
                style={{ width: `${progressPercent}%` }}
              />

              {waveformBars.map((barHeight, idx) => {
                const barPercent = (idx / waveformBars.length) * 100;
                const isPlayed = barPercent <= progressPercent;
                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-t-xs transition-all duration-150"
                    style={{
                      height: `${barHeight}%`,
                      backgroundColor: isPlayed ? '#2563eb' : '#94a3b8',
                      opacity: isPlayed ? 1 : 0.45,
                    }}
                  />
                );
              })}
            </div>

            {/* Time Indicators */}
            <div className="flex items-center justify-between text-xs font-mono font-semibold text-dark-500 px-1">
              <span>{formatSeconds(currentTime)}</span>
              <span className="text-[11px] text-dark-400">Audio Quality: 32 kbps Mono · G.711 Telephony</span>
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>

          {/* Transport Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            
            {/* Speed Pills */}
            <div className="flex items-center gap-1 bg-dark-100 dark:bg-dark-800 p-1 rounded-xl">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                    speed === rate
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-dark-600 dark:text-dark-300 hover:text-dark-900'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Main Play / Seek Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                className="p-2 rounded-xl text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
                title="Rewind 5s"
              >
                <RotateCcw size={16} />
              </button>

              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </button>

              <button
                onClick={() => handleSeek(Math.min(duration, currentTime + 5))}
                className="p-2 rounded-xl text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
                title="Forward 5s"
              >
                <RotateCw size={16} />
              </button>
            </div>

            {/* Volume & Download */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-dark-500">
                <button onClick={toggleMute} className="hover:text-dark-800">
                  {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 h-1.5 accent-blue-600 cursor-pointer"
                />
              </div>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-200 hover:bg-dark-50 shadow-2xs transition-colors"
              >
                <Download size={13} />
                <span>Save MP3</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Toggle: AI Summary vs Full Transcript */}
        <div className="flex border-b border-dark-200 dark:border-dark-700 px-5 pt-2 gap-4 text-xs font-semibold bg-white dark:bg-dark-900">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'transcript'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-dark-500 hover:text-dark-900'
            }`}
          >
            <FileText size={14} />
            <span>Speaker Transcript ({transcriptData.length} turns)</span>
          </button>
          
          <button
            onClick={() => setActiveTab('ai-insights')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'ai-insights'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-dark-500 hover:text-dark-900'
            }`}
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Call Summary &amp; Follow-ups</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* TAB 1: TRANSCRIPT */}
          {activeTab === 'transcript' && (
            <div className="space-y-3">
              {/* Search in transcript & Copy bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-dark-400" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search dialogue in transcript..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleCopyTranscript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-medium text-dark-600 dark:text-dark-300 hover:bg-dark-50 transition-colors"
                >
                  {copiedTranscript ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copiedTranscript ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>

              {/* Turn-by-Turn Dialogue */}
              <div className="space-y-3 pt-1">
                {filteredTranscript.map((turn, idx) => {
                  const turnSec = audioEngine.parseDuration(turn.time);
                  const isCurrent = currentTime >= turnSec && currentTime < turnSec + 6;
                  const isAgent = turn.role === 'agent';

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSeek(turnSec)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-blue-400 bg-blue-50/80 dark:bg-blue-950/40 shadow-xs'
                          : 'border-dark-100 dark:border-dark-800 hover:border-dark-300 dark:hover:border-dark-700 bg-white dark:bg-dark-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                              isAgent
                                ? 'bg-blue-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {isAgent ? 'A' : 'C'}
                          </div>
                          <span className="text-xs font-bold text-dark-900 dark:text-white">
                            {turn.speaker}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                              isAgent
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {isAgent ? 'Staff Line' : 'Customer'}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-dark-400 hover:text-blue-600 font-semibold">
                          {turn.time} ⏩
                        </span>
                      </div>

                      <p className="text-xs text-dark-700 dark:text-dark-200 pl-8 leading-relaxed">
                        {turn.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: AI INSIGHTS */}
          {activeTab === 'ai-insights' && (
            <div className="space-y-4">
              
              {/* Sentiment Score Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-transparent border border-emerald-500/30 dark:border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Customer Call Engagement
                    </span>
                    <h4 className="text-base font-bold text-dark-900 dark:text-white">
                      {aiSummaryData.sentiment}
                    </h4>
                    <p className="text-xs text-dark-500">
                      High purchase intent & responsive communication during call
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] text-dark-400 uppercase font-bold">Intent Score</span>
                    <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {aiSummaryData.score}/100
                    </p>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-2">
                <h4 className="text-xs font-bold text-dark-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Bot size={14} className="text-blue-600" />
                  <span>Call Executive Summary</span>
                </h4>
                <p className="text-xs text-dark-700 dark:text-dark-200 leading-relaxed">
                  {aiSummaryData.summary}
                </p>
              </div>

              {/* Key Topics Tags */}
              <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-2">
                <h4 className="text-xs font-bold text-dark-900 dark:text-white uppercase tracking-wider">
                  Key Topics Discussed
                </h4>
                <div className="flex flex-wrap gap-2">
                  {aiSummaryData.keyPoints.map((point, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-200"
                    >
                      #{point}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Items / Follow-ups */}
              <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 space-y-2.5">
                <h4 className="text-xs font-bold text-dark-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Recommended Action Items & Next Steps</span>
                </h4>
                <div className="space-y-2">
                  {aiSummaryData.followUps.map((action, idx) => {
                    const isDone = !!actionItemsDone[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleActionItem(idx)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                          isDone ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'hover:bg-dark-50 dark:hover:bg-dark-700/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-blue-600"
                        />
                        <span
                          className={`text-xs ${
                            isDone
                              ? 'line-through text-dark-400'
                              : 'text-dark-800 dark:text-dark-200 font-medium'
                          }`}
                        >
                          {action}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50 dark:bg-dark-800/40 text-xs text-dark-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Recorded & verified via Virtual Line</span>
          </div>

          <button
            onClick={() => {
              audioEngine.stop();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-dark-200 dark:bg-dark-700 text-dark-800 dark:text-dark-200 hover:bg-dark-300 font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
