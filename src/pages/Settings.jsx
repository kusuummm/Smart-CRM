import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Moon, Sun, Bell, Globe, Download, Save, Trash2 } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function Settings() {
  const { addToast } = useToast();
  const {
    darkMode,
    toggleDarkMode,
    language,
    setLanguage,
    themeColor,
    setThemeColor,
    timezone,
    setTimezone,
    t,
  } = useApp();

  const [notifications, setNotifications] = useState({
    email: true,
    whatsapp: true,
    browser: true,
    followup: true,
    birthday: false,
  });

  const handleSaveSettings = () => {
    localStorage.setItem('notification_settings', JSON.stringify(notifications));
    addToast(t('settingsSaved') || 'Settings saved successfully!', 'success');
  };

  const handleResetDefaults = () => {
    toggleDarkMode && toggleDarkMode();
    setLanguage('en');
    setThemeColor('blue');
    setTimezone('Asia/Kolkata');
    setNotifications({ email: true, whatsapp: true, browser: true, followup: true, birthday: false });
    addToast(t('resetToDefaults') || 'Settings reset to defaults', 'info');
  };

  const themeColors = [
    { key: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { key: 'red', label: 'Red', class: 'bg-red-500' },
    { key: 'green', label: 'Green', class: 'bg-green-500' },
    { key: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { key: 'orange', label: 'Orange', class: 'bg-orange-500' },
  ];

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">{t('settings')}</h1>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">{t('configurePreferences') || 'Configure your preferences'}</p>
        </div>
        <button
          onClick={handleResetDefaults}
          className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        >
          {t('resetDefaults') || 'Reset to Defaults'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appearance */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">{t('appearance')}</h3>
              <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">{t('customizeAppearance') || 'Customize app colors and theme'}</p>
            </div>

            {/* Dark Mode */}
            <div className="px-6 py-4 border-b border-dark-100 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-dark-700' : 'bg-yellow-100'}`}>
                    {darkMode ? <Moon size={24} className="text-primary-400" /> : <Sun size={24} className="text-yellow-500" />}
                  </div>
                  <div>
                    <p className="font-medium text-dark-900 dark:text-white">{t('darkMode')}</p>
                    <p className="text-sm text-dark-500 dark:text-dark-400">
                      {darkMode ? (t('darkModeActive') || 'Dark theme is active') : (t('lightModeActive') || 'Light theme is active')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
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
            <div className="px-6 py-4 border-b border-dark-100 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-${themeColor}-500 flex items-center justify-center`}>
                    <div className="w-6 h-6 bg-white rounded-lg dark:bg-dark-800" />
                  </div>
                  <div>
                    <p className="font-medium text-dark-900 dark:text-white">{t('themeColor')}</p>
                    <p className="text-sm text-dark-500 dark:text-dark-400">{t('chooseColor') || 'Choose your preferred accent color'}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-4 ml-16">
                {themeColors.map((color) => (
                  <button
                    key={color.key}
                    onClick={() => setThemeColor(color.key)}
                    className={`w-10 h-10 rounded-full transition-all hover:scale-110 ${color.class} ${
                      themeColor === color.key
                        ? 'ring-2 ring-offset-2 ring-dark-900 dark:ring-white scale-110'
                        : ''
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Globe size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-dark-900 dark:text-white">{t('language')}</p>
                  <p className="text-sm text-dark-500 dark:text-dark-400">{t('chooseLanguage') || 'Choose your preferred language'}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4 ml-16">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                      language === lang.code
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-dark-200 dark:border-dark-600 hover:border-dark-300 dark:hover:border-dark-500'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="font-medium">{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Bell size={20} /> {t('notifications')}
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { key: 'email', label: '📧 Email Notifications', desc: 'Email for new activities' },
                { key: 'whatsapp', label: '💬 WhatsApp Messages', desc: 'Updates via WhatsApp' },
                { key: 'browser', label: '🌐 Browser Push', desc: 'Browser notifications' },
                { key: 'followup', label: '📞 Follow-up Reminders', desc: 'Reminders for important follow-ups' },
                { key: 'birthday', label: '🎂 Birthday Alerts', desc: 'Customer birthday notifications' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700/50 transition-colors dark:hover:bg-dark-700">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="w-5 h-5 text-primary-600 rounded border-dark-300 focus:ring-primary-500 cursor-pointer"
                      />
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

          {/* System */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Globe size={20} /> {t('system') || 'System'}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2 dark:text-gray-300">{t('timezone')}</label>
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
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">{t('currentSettings') || 'Current Settings'}</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700">
                <span className="text-sm text-dark-500 dark:text-dark-400">{t('theme') || 'Theme'}</span>
                <span className="flex items-center gap-2 text-sm font-medium text-dark-900 dark:text-white">
                  {darkMode ? <Moon size={14} /> : <Sun size={14} />}
                  {darkMode ? t('darkMode') : t('lightMode')}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700">
                <span className="text-sm text-dark-500 dark:text-dark-400">{t('themeColor')}</span>
                <span className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full ${
                    themeColor === 'blue' ? 'bg-blue-500' :
                    themeColor === 'red' ? 'bg-red-500' :
                    themeColor === 'green' ? 'bg-green-500' :
                    themeColor === 'purple' ? 'bg-purple-500' :
                    'bg-orange-500'
                  }`} />
                  <span className="text-sm font-medium text-dark-900 dark:text-white capitalize">{themeColor}</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700">
                <span className="text-sm text-dark-500 dark:text-dark-400">{t('language')}</span>
                <span className="text-sm font-medium text-dark-900 dark:text-white">
                  {language === 'en' ? '🇬🇧 English' : '🇮🇳 हिंदी'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700">
                <span className="text-sm text-dark-500 dark:text-dark-400">{t('timezone')}</span>
                <span className="text-sm font-medium text-dark-900 dark:text-white">{timezone.split('/')[1]?.replace('_', ' ') || timezone}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-dark-500 dark:text-dark-400">{t('notifications')}</span>
                <span className="text-sm font-medium text-dark-900 dark:text-white">
                  {Object.values(notifications).filter(Boolean).length}/{Object.keys(notifications).length} {t('enabled') || 'enabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Export */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white">{t('data')}</h3>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  const data = { darkMode, language, themeColor, timezone, notifications };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `crm-settings-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  addToast(t('settingsExported') || 'Settings exported!', 'success');
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Download size={18} className="text-dark-500 dark:text-dark-400" />
                  <span className="text-sm font-medium text-dark-700 dark:text-dark-300 dark:text-gray-300">{t('exportSettings')}</span>
                </div>
                <span className="text-xs text-dark-400 dark:text-dark-500">JSON</span>
              </button>
            </div>
          </div>

          {/* Help Card */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">{t('needHelp') || 'Need Help?'}</h3>
            <p className="text-sm text-primary-100 mb-4">{t('helpDesc') || 'Get support with your CRM settings'}</p>
            <button className="w-full px-4 py-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg text-sm font-medium backdrop-blur-sm mb-2">
              {t('viewDocs') || 'View Documentation'}
            </button>
            <button className="w-full px-4 py-2 bg-white text-primary-600 hover:bg-primary-50 transition-colors rounded-lg text-sm font-medium dark:bg-dark-800">
              {t('contactSupport')}
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-dark-200 dark:border-dark-700">
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
        >
          <Save size={16} />
          {t('save')}
        </button>
      </div>
    </div>
  );
}
