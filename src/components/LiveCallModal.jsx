import { useState, useEffect } from 'react';
import {
  X,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  User,
  Clock,
  ArrowRightLeft,
  Volume2,
  CheckCircle,
  Radio,
  Users,
  Shield,
  Activity,
} from 'lucide-react';

export default function LiveCallModal({ isOpen, onClose, user }) {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'queue' | 'agents'
  const [muted, setMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [callDuration, setCallDuration] = useState(134); // seconds

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const formatSecs = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const agents = [
    { name: user?.name || 'Agent Line', phone: user?.phone || '-', status: 'In Call', duration: formatSecs(callDuration), client: 'Active Client' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50 dark:bg-dark-800/50">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-dark-900 dark:text-white flex items-center gap-2">
                Live Call Monitoring Dashboard
              </h2>
              <p className="text-xs text-dark-500 dark:text-dark-400">
                Real-time active call streams, lead line statuses & queue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-dark-400 hover:text-dark-700 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
          >
            <X size={19} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-dark-200 dark:border-dark-700 px-5 pt-2 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('live')}
            className={`pb-2.5 border-b-2 transition-all ${
              activeTab === 'live'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-dark-500 hover:text-dark-900'
            }`}
          >
            Active Call (1)
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`pb-2.5 border-b-2 transition-all ${
              activeTab === 'agents'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-dark-500 hover:text-dark-900'
            }`}
          >
            Team Lines (3)
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`pb-2.5 border-b-2 transition-all ${
              activeTab === 'queue'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-dark-500 hover:text-dark-900'
            }`}
          >
            Waiting Queue (0)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'live' && (
            <div className="space-y-4">
              {/* Ongoing Call Card */}
              <div className="p-5 rounded-2xl bg-blue-50/40 dark:bg-dark-800 border border-blue-200 dark:border-dark-700 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-blue-100 dark:border-dark-700">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                      <Phone size={22} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-dark-900 dark:text-white text-base">
                          Connected Client
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Connected
                        </span>
                      </div>
                      <p className="text-xs text-dark-500 dark:text-dark-400">
                        Live Voice Call Session
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-dark-500 font-medium">Duration</span>
                    <p className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatSecs(callDuration)}
                    </p>
                  </div>
                </div>

                {/* Call Metadata & Staff */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 text-xs">
                  <div>
                    <span className="text-dark-400">Handling Staff</span>
                    <p className="font-semibold text-dark-800 dark:text-dark-100">
                      {user?.name || 'Agent'}
                    </p>
                  </div>
                  <div>
                    <span className="text-dark-400">Staff Number</span>
                    <p className="font-semibold text-dark-800 dark:text-dark-100">
                      {user?.phone || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-dark-400">Virtual Line DID</span>
                    <p className="font-semibold text-dark-800 dark:text-dark-100">
                      +91 80 4719 3200
                    </p>
                  </div>
                </div>

                {/* Live Recording Status Bar */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-dark-900/5 dark:bg-dark-950/40 border border-dark-200/80 dark:border-dark-700/60 text-xs">
                  <div className="flex items-center gap-2.5">
                    {isRecording ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
                        REC ACTIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        ⏸ REC PAUSED
                      </span>
                    )}
                    <span className="text-dark-600 dark:text-dark-300 font-medium hidden sm:inline">
                      Cloud stereo recording active · 32 kbps encrypted
                    </span>
                  </div>

                  {/* Equalizer animation */}
                  {isRecording && (
                    <div className="flex items-end gap-0.5 h-4">
                      {[40, 80, 55, 95, 70, 35, 85].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 bg-rose-500 rounded-full animate-pulse"
                          style={{
                            height: `${h}%`,
                            animationDelay: `${i * 120}ms`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setIsRecording(!isRecording)}
                    className="px-2.5 py-1 rounded-lg border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-[11px] font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 transition-colors shadow-2xs"
                  >
                    {isRecording ? 'Pause Recording' : 'Resume Recording'}
                  </button>
                </div>

                {/* Live Transcript Preview */}
                <div className="p-3 rounded-xl bg-blue-50/40 dark:bg-dark-900/40 border border-blue-100 dark:border-dark-700 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    <span>Live AI Speech-to-Text Stream</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">● Realtime Sync</span>
                  </div>
                  <p className="text-xs text-dark-700 dark:text-dark-300 italic">
                    "{user?.name || 'Agent'}: Yes, I am confirming your CRM plan with call recording & integrations now..."
                  </p>
                </div>

                {/* Live Controls */}
                <div className="flex items-center justify-center gap-3 pt-3 border-t border-blue-100 dark:border-dark-700">
                  <button
                    onClick={() => setMuted(!muted)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      muted
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white dark:bg-dark-700 border border-dark-200 dark:border-dark-600 text-dark-700 dark:text-dark-200 hover:bg-dark-50'
                    }`}
                  >
                    {muted ? <MicOff size={15} /> : <Mic size={15} />}
                    <span>{muted ? 'Unmute' : 'Mute'}</span>
                  </button>

                  <button
                    onClick={() => alert('Call transferred to Support queue')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-dark-700 border border-dark-200 dark:border-dark-600 text-dark-700 dark:text-dark-200 hover:bg-dark-50 transition-colors"
                  >
                    <ArrowRightLeft size={15} />
                    <span>Transfer</span>
                  </button>

                  <button
                    onClick={() => {
                      alert('Call finished and recorded to Call History');
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs"
                  >
                    <PhoneOff size={15} />
                    <span>End Call</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-2.5">
              {agents.map((ag, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {ag.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-dark-900 dark:text-white text-xs sm:text-sm">
                        {ag.name}
                      </p>
                      <p className="text-[11px] text-dark-500">{ag.phone}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ag.status === 'In Call'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : ag.status === 'Available'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {ag.status}
                    </span>
                    <p className="text-[11px] text-dark-400 mt-0.5 font-mono">
                      {ag.duration}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="text-center py-12 text-dark-400">
              <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-dark-800 dark:text-dark-200">
                Queue is clear
              </p>
              <p className="text-xs text-dark-500 mt-1">
                No leads currently waiting in the IVR hold queue.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-dark-200 dark:border-dark-700 flex justify-end bg-dark-50/50 dark:bg-dark-800/40">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-200/60 dark:hover:bg-dark-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
