import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Moon, Sun, Bell, Globe, Download, Save, Mic, Volume2, ShieldCheck, Waves, Mail, MessageCircle, Monitor, PhoneCall, Gift } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function Settings() {
  const { addToast } = useToast();
  const {
    darkMode,
    toggleDarkMode,
    themeColor,
    setThemeColor,
    timezone,
    setTimezone,
    t,
  } = useApp();

  // Call Recording Settings State
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

  const [notifications, setNotifications] = useState({
    email: true,
    whatsapp: true,
    browser: true,
    followup: true,
    birthday: false,
  });

  // Handle Call Recording Toggles
  const handleToggleCallRecording = (key) => {
    setCallRecording((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('smartcrm_call_recording_settings', JSON.stringify(updated));
      if (key === 'enabled') {
        localStorage.setItem('smartcrm_call_recording_enabled', JSON.stringify(updated.enabled));
      }
      return updated;
    });
  };

  const handleSaveSettings = () => {
    localStorage.setItem('notification_settings', JSON.stringify(notifications));
    localStorage.setItem('smartcrm_call_recording_settings', JSON.stringify(callRecording));
    localStorage.setItem('smartcrm_call_recording_enabled', JSON.stringify(callRecording.enabled));
    addToast('Settings & Call Recording preferences saved successfully!', 'success');
  };

  const handleResetDefaults = () => {
    toggleDarkMode && toggleDarkMode();
    setThemeColor('blue');
    setTimezone('Asia/Kolkata');
    const defaultRecording = {
      enabled: true,
      consentBeep: true,
      noiseSuppression: true,
      waveformVisuals: true,
    };
    setCallRecording(defaultRecording);
    localStorage.setItem('smartcrm_call_recording_settings', JSON.stringify(defaultRecording));
    localStorage.setItem('smartcrm_call_recording_enabled', 'true');
    setNotifications({ email: true, whatsapp: true, browser: true, followup: true, birthday: false });
    addToast('Settings reset to defaults', 'info');
  };

  const themeColors = [
    { key: 'blue', label: 'Alpine Blue', class: 'bg-blue-600' },
    { key: 'slate', label: 'Slate Monochrome', class: 'bg-slate-700' },
    { key: 'green', label: 'Sage Emerald', class: 'bg-emerald-600' },
    { key: 'red', label: 'Crimson', class: 'bg-rose-600' },
    { key: 'orange', label: 'Amber', class: 'bg-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Settings</h1>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">Configure your telephony, call recording, and workspace preferences</p>
        </div>
        <button
          onClick={handleResetDefaults}
          className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. CALL RECORDING & TELEPHONY SETTINGS (Toggle Bars) */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Mic size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                      <span>Call Recording & Audio Preferences</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        callRecording.enabled
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300'
                      }`}>
                        {callRecording.enabled ? 'ACTIVE' : 'OFF'}
                      </span>
                    </h3>
                    <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                      Configure microphone voice capture and audio telemetry during customer calls
                    </p>
                  </div>
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
                    <p className="font-semibold text-sm text-dark-900 dark:text-white">
                      Automatic Call Recording
                    </p>
                    <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5 leading-relaxed">
                      Automatically record incoming and outgoing conversations as authentic audio streams when a call is answered.
                    </p>
                  </div>
                </div>

                {/* Toggle Bar Switch */}
                <button
                  type="button"
                  onClick={() => handleToggleCallRecording('enabled')}
                  className={`relative w-14 h-8 rounded-full transition-colors duration-300 shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    callRecording.enabled ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                  }`}
                  aria-label="Toggle Call Recording"
                >
                  <span
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                      callRecording.enabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Sub-Toggle Bar 1: Audible Consent & Beep Tone */}
              <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700/60">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="text-dark-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs text-dark-900 dark:text-white">
                      Call Recording Consent Beep
                    </p>
                    <p className="text-[11px] text-dark-400">
                      Play an audible notification chime to inform participants that the call is being recorded
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCallRecording('consentBeep')}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 cursor-pointer ${
                    callRecording.consentBeep ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-300 ${
                      callRecording.consentBeep ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Sub-Toggle Bar 2: Noise Suppression & AGC */}
              <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700/60">
                <div className="flex items-start gap-3">
                  <Mic size={18} className="text-dark-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs text-dark-900 dark:text-white">
                      Hardware Noise Suppression &amp; Echo Cancellation
                    </p>
                    <p className="text-[11px] text-dark-400">
                      Apply acoustic echo cancellation, background noise filtering, and automatic voice gain control
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCallRecording('noiseSuppression')}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 cursor-pointer ${
                    callRecording.noiseSuppression ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-300 ${
                      callRecording.noiseSuppression ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Sub-Toggle Bar 3: Live Waveform Visualizer */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-start gap-3">
                  <Waves size={18} className="text-dark-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs text-dark-900 dark:text-white">
                      Live Voice Frequency &amp; Waveform Visualizer
                    </p>
                    <p className="text-[11px] text-dark-400">
                      Analyze Web Audio spectrum data and display dynamic voice waves during calls and playback
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCallRecording('waveformVisuals')}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 cursor-pointer ${
                    callRecording.waveformVisuals ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-300 ${
                      callRecording.waveformVisuals ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Appearance */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Appearance</h3>
              <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">Customize app theme and colors</p>
            </div>

            {/* Dark Mode */}
            <div className="px-6 py-4 border-b border-dark-100 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-dark-700' : 'bg-yellow-100'}`}>
                    {darkMode ? <Moon size={24} className="text-primary-400" /> : <Sun size={24} className="text-yellow-500" />}
                  </div>
                  <div>
                    <p className="font-medium text-dark-900 dark:text-white">Dark Mode</p>
                    <p className="text-sm text-dark-500 dark:text-dark-400">
                      {darkMode ? 'Dark theme is active' : 'Light theme is active'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
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

            {/* Theme Color */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-${themeColor}-500 flex items-center justify-center`}>
                    <div className="w-6 h-6 bg-white rounded-lg dark:bg-dark-800" />
                  </div>
                  <div>
                    <p className="font-medium text-dark-900 dark:text-white">Theme Accent</p>
                    <p className="text-sm text-dark-500 dark:text-dark-400">Choose your preferred accent color</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-4 ml-16">
                {themeColors.map((color) => (
                  <button
                    key={color.key}
                    onClick={() => setThemeColor(color.key)}
                    className={`w-10 h-10 rounded-full transition-all hover:scale-110 cursor-pointer ${color.class} ${
                      themeColor === color.key
                        ? 'ring-2 ring-offset-2 ring-dark-900 dark:ring-white scale-110'
                        : ''
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 3. Notifications */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Bell size={20} /> Notifications
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { key: 'email', label: 'Email Notifications', desc: 'Email for new activities', Icon: Mail },
                { key: 'whatsapp', label: 'WhatsApp Messages', desc: 'Updates via WhatsApp', Icon: MessageCircle },
                { key: 'browser', label: 'Browser Push', desc: 'Browser notifications', Icon: Monitor },
                { key: 'followup', label: 'Follow-up Reminders', desc: 'Reminders for important follow-ups', Icon: PhoneCall },
                { key: 'birthday', label: 'Birthday Alerts', desc: 'Customer birthday notifications', Icon: Gift },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="w-5 h-5 text-primary-600 rounded border-dark-300 focus:ring-primary-500 cursor-pointer"
                      />
                      <item.Icon size={18} className="text-dark-500 shrink-0" />
                      <div>
                        <p className="font-medium text-dark-900 dark:text-white">{item.label}</p>
                        <p className="text-xs text-dark-500 dark:text-dark-400">{item.desc}</p>
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. System Timezone */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Globe size={20} /> System Timezone
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 border border-dark-200 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Asia/Kolkata">IST (Asia/Kolkata) +05:30</option>
                  <option value="UTC">UTC +00:00</option>
                  <option value="America/New_York">EST (America/New_York) -05:00</option>
                  <option value="Europe/London">GMT (Europe/London) +00:00</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Current Configuration</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700">
                <span className="text-sm text-dark-500 dark:text-dark-400">Call Recording</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-dark-900 dark:text-white">
                  <span className={`w-2 h-2 rounded-full ${callRecording.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  {callRecording.enabled ? 'Enabled (Auto)' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700">
                <span className="text-sm text-dark-500 dark:text-dark-400">Theme</span>
                <span className="flex items-center gap-2 text-sm font-medium text-dark-900 dark:text-white">
                  {darkMode ? <Moon size={14} /> : <Sun size={14} />}
                  {darkMode ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700">
                <span className="text-sm text-dark-500 dark:text-dark-400">Accent Color</span>
                <span className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full ${
                    themeColor === 'blue' ? 'bg-blue-600' :
                    themeColor === 'slate' ? 'bg-slate-700' :
                    themeColor === 'green' ? 'bg-emerald-600' :
                    themeColor === 'red' ? 'bg-rose-600' :
                    'bg-amber-600'
                  }`} />
                  <span className="text-sm font-medium text-dark-900 dark:text-white capitalize">{themeColor}</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700">
                <span className="text-sm text-dark-500 dark:text-dark-400">Timezone</span>
                <span className="text-sm font-medium text-dark-900 dark:text-white">{timezone.split('/')[1]?.replace('_', ' ') || timezone}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-dark-500 dark:text-dark-400">Notifications</span>
                <span className="text-sm font-medium text-dark-900 dark:text-white">
                  {Object.values(notifications).filter(Boolean).length}/{Object.keys(notifications).length} enabled
                </span>
              </div>
            </div>
          </div>

          {/* Export Settings */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Data &amp; Backup</h3>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  const data = { darkMode, themeColor, timezone, notifications, callRecording };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `crm-settings-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  addToast('Settings exported!', 'success');
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Download size={18} className="text-dark-500 dark:text-dark-400" />
                  <span className="text-sm font-medium text-dark-700 dark:text-dark-300">Export Settings</span>
                </div>
                <span className="text-xs text-dark-400 dark:text-dark-500">JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-dark-200 dark:border-dark-700">
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Save size={16} />
          Save Settings
        </button>
      </div>
    </div>
  );
}
