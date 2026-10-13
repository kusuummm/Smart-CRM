import { useState } from 'react';
import { X, PlayCircle, MessageSquare, PhoneCall, Mail, CheckCircle2, Send, Bot } from 'lucide-react';

export function TutorialModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const steps = [
    { title: '1. Managing Telephony & DIDs', desc: 'Assign incoming virtual numbers to leads and set ring timeout rules.' },
    { title: '2. Live Call Monitoring', desc: 'Track active conversations, whisper coaching, and warm transfer calls in real time.' },
    { title: '3. Automated Follow-Ups & WhatsApp', desc: 'Trigger smart WhatsApp follow-up messages automatically right after any call ends.' },
    { title: '4. AI Receptionist Setup', desc: 'Deploy 24/7 conversational AI agents to answer customer inquiries when your staff is off-duty.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50 dark:bg-dark-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <PlayCircle size={19} />
            </div>
            <div>
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                CRM Video Tutorial & Quick Guide
              </h3>
              <p className="text-xs text-dark-500">Master modern cloud CRM features in 5 minutes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-dark-400 hover:text-dark-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mock Video Player */}
          <div className="relative rounded-2xl bg-dark-950 aspect-video flex flex-col items-center justify-center text-white p-6 shadow-inner overflow-hidden border border-dark-800">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
              <PlayCircle size={32} />
            </div>
            <p className="mt-3 font-semibold text-sm">Getting Started with Smart CRM Telephony</p>
            <span className="text-xs text-dark-400 mt-1">Duration: 4 mins 30 secs · HD Walkthrough</span>
          </div>

          {/* Guide Steps */}
          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-dark-400">
              Key Features Overview
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {steps.map((st, i) => (
                <div key={i} className="p-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-800/40">
                  <p className="font-bold text-dark-900 dark:text-white">{st.title}</p>
                  <p className="text-dark-500 mt-0.5">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3.5 border-t border-dark-200 dark:border-dark-700 flex justify-end bg-dark-50/50">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContactSupportModal({ isOpen, onClose, mode = 'contact' }) {
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setMsg('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              {mode === 'chat' ? <MessageSquare size={17} /> : <PhoneCall size={17} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-dark-900 dark:text-white">
                {mode === 'chat' ? 'Chat with Live Agent' : 'Contact Support'}
              </h3>
              <p className="text-[11px] text-dark-500">24/7 dedicated support assistance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-dark-400 hover:text-dark-700">
            <X size={17} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {sent ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-dark-900 dark:text-white">Message Dispatched!</p>
              <p className="text-xs text-dark-500">A dedicated support agent will connect shortly.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 dark:bg-dark-800">
                  <PhoneCall size={16} className="text-blue-600 mb-1" />
                  <p className="font-bold text-dark-900 dark:text-white">Helpline</p>
                  <p className="text-[11px] text-dark-600">1800-CRM-HELP</p>
                </div>
                <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 dark:bg-dark-800">
                  <Mail size={16} className="text-blue-600 mb-1" />
                  <p className="font-bold text-dark-900 dark:text-white">Email Helpdesk</p>
                  <p className="text-[11px] text-dark-600">support@smartcrm.com</p>
                </div>
              </div>

              <form onSubmit={handleSend} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                    How can our agent assist you today?
                  </label>
                  <textarea
                    rows={3}
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="Describe your question or telephony requirement..."
                    className="w-full text-xs p-3 rounded-xl border border-dark-200 dark:border-dark-700 dark:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <Send size={13} />
                  <span>Connect with Agent</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
