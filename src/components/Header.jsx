import { useState, useEffect, useRef } from 'react';
import { Bell, Settings, User, Moon, Sun, LogOut, Users, ChevronDown, Languages, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useNotifications } from '../hooks/useNotifications';

const getNotifIcon = (type) => {
  switch (type) {
    case 'lead': return '🎯';
    case 'followup': return '📞';
    case 'conversion': return '🎉';
    case 'event': return '🎂';
    case 'whatsapp': return '⚠️';
    default: return '📌';
  }
};

// Formats an ISO timestamp as a short relative string ("5 mins ago").
const timeAgo = (isoString) => {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

export default function Header({ titleKey, user, onToggleSidebar, onNavigate, onLogout }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { notifications, unreadCount, loading: notifLoading, markRead, markAllRead } = useNotifications();
  const notifRef = useRef(null);
  const settingsRef = useRef(null);
  const profileRef = useRef(null);

  // Get all settings from AppContext - THIS IS THE SOURCE OF TRUTH
  const { darkMode, toggleDarkMode, language, toggleLanguage, t } = useApp();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotifClick = (notif) => {
    if (!notif.read) {
      markRead(notif.id);
    }
    setShowNotifications(false);
    if (notif.route && onNavigate) {
      onNavigate(notif.route);
    }
  };

  const handleNavigate = (route) => {
    setShowSettings(false);
    setShowProfile(false);
    if (onNavigate) onNavigate(route);
  };

  // Get the display title based on language
  const displayTitle = t(titleKey) || titleKey;

  return (
    <header className="h-16 bg-white dark:bg-dark-900 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between px-6 sticky top-0 z-30 transition-colors dark:bg-dark-800">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-500 dark:text-dark-400 transition-colors dark:hover:bg-dark-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-dark-900 dark:text-white">{displayTitle}</h1>
      </div>

      {/* Right Side - Icons */}
      <div className="flex items-center gap-1">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); setShowProfile(false); }}
            className={`relative p-2 rounded-lg transition-colors ${
              showNotifications
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                : 'hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-500 dark:text-dark-400'
            }`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[420px] bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-dark-200 dark:border-dark-700 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50 dark:bg-dark-900/30">
                <h3 className="text-sm font-semibold text-dark-900 dark:text-white">{t('notifications')}</h3>
                <span className="text-xs text-dark-500 dark:text-dark-400">{unreadCount} {t('unread')}</span>
              </div>
              <div className="max-h-[380px] overflow-y-auto">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-10 text-dark-400 dark:text-dark-500">
                    <Loader2 className="animate-spin mr-2" size={18} />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-dark-400 dark:text-dark-500">
                    You're all caught up - no recent activity.
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`px-4 py-3 hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer transition-colors border-l-4 ${
                        !notif.read
                          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex gap-3">
                        <span className="text-xl flex-shrink-0 mt-0.5">{getNotifIcon(notif.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-dark-900 dark:text-white truncate">
                              {notif.title}
                            </p>
                            {!notif.read && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></span>}
                          </div>
                          <p className="text-xs text-dark-600 dark:text-dark-400 mt-0.5 line-clamp-2 dark:text-dark-300">
                            {notif.message}
                          </p>
                          <p className="text-[11px] text-dark-400 mt-1 dark:text-dark-500">
                            {timeAgo(notif.time)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-dark-200 dark:border-dark-700 flex justify-between items-center bg-dark-50/50 dark:bg-dark-900/30">
                <button
                  onClick={markAllRead}
                  className="text-xs text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-300 font-medium dark:hover:text-white"
                >
                  {t('markAllRead')}
                </button>
                <button
                  onClick={() => { setShowNotifications(false); onNavigate?.('dashboard'); }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  {t('viewAll')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings Gear Icon */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); setShowProfile(false); }}
            className={`p-2 rounded-lg transition-colors ${
              showSettings
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                : 'hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-500 dark:text-dark-400'
            }`}
          >
            <Settings size={20} />
          </button>

          {showSettings && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-dark-200 dark:border-dark-700 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/30">
                <h3 className="text-sm font-semibold text-dark-900 dark:text-white">{t('quickSettings')}</h3>
              </div>
              <div className="p-2 space-y-1">
                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors dark:hover:bg-dark-600"
                >
                  {darkMode ? <Moon size={18} className="text-primary-500" /> : <Sun size={18} className="text-yellow-500" />}
                  <span className="text-dark-700 dark:text-dark-300 flex-1 text-left dark:text-gray-300">{darkMode ? t('darkMode') : t('lightMode')}</span>
                  <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${darkMode ? 'bg-primary-600' : 'bg-dark-200 dark:bg-dark-600'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </span>
                </button>

                {/* Language Toggle */}
                <button
                  onClick={toggleLanguage}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors dark:hover:bg-dark-600"
                >
                  <Languages size={18} className="text-green-500" />
                  <span className="text-dark-700 dark:text-dark-300 flex-1 text-left dark:text-gray-300">
                    {language === 'en' ? 'हिंदी (Hindi)' : 'English'}
                  </span>
                  <span className="text-xs bg-dark-100 dark:bg-dark-700 px-2 py-0.5 rounded text-dark-500 dark:text-dark-400">
                    {language === 'en' ? 'HI' : 'EN'}
                  </span>
                </button>

                <div className="my-2 border-t border-dark-200 dark:border-dark-700"></div>

                {/* My Account */}
                <button
                  onClick={() => handleNavigate('my-account')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors dark:hover:bg-dark-600"
                >
                  <User size={18} />
                  <span className="text-dark-700 dark:text-dark-300 dark:text-gray-300">{t('myAccount')}</span>
                </button>

                {/* All Settings */}
                <button
                  onClick={() => handleNavigate('settings')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors dark:hover:bg-dark-600"
                >
                  <Settings size={18} />
                  <span className="text-dark-700 dark:text-dark-300 dark:text-gray-300">{t('settings')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); setShowSettings(false); }}
            className="flex items-center gap-2 pl-3 border-l border-dark-200 dark:border-dark-700 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg px-3 py-1.5 transition-colors dark:hover:bg-dark-600"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-xs">{user?.avatar}</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-dark-900 dark:text-white">{user?.name}</p>
              <p className="text-xs text-dark-500 dark:text-dark-400 capitalize">{user?.role}</p>
            </div>
            <ChevronDown size={16} className="text-dark-400 dark:text-dark-500 hidden md:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-dark-200 dark:border-dark-700 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-900/30">
                <p className="text-sm font-semibold text-dark-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-dark-500 dark:text-dark-400">{user?.email}</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => handleNavigate('my-account')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors dark:hover:bg-dark-600"
                >
                  <User size={18} />
                  <span className="text-dark-700 dark:text-dark-300 dark:text-gray-300">{t('myAccount')}</span>
                </button>
                <button
                  onClick={() => handleNavigate('settings')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors dark:hover:bg-dark-600"
                >
                  <Settings size={18} />
                  <span className="text-dark-700 dark:text-dark-300 dark:text-gray-300">{t('settings')}</span>
                </button>
                <div className="my-1 border-t border-dark-200 dark:border-dark-700"></div>
                <button
                  onClick={() => { setShowProfile(false); onLogout?.(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors dark:hover:bg-dark-600"
                >
                  <Users size={18} />
                  <span className="text-dark-700 dark:text-dark-300 dark:text-gray-300">{t('switchAccount')}</span>
                </button>
                <button
                  onClick={() => { setShowProfile(false); onLogout?.(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={18} />
                  <span>{t('logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
