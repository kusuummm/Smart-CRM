import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Settings,
  User,
  Moon,
  Sun,
  LogOut,
  Users,
  ChevronDown,
  Languages,
  Loader2,
  Wallet,
  Radio,
  Menu,
  Shield,
  Phone,
  Eye,
} from 'lucide-react';
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

const timeAgo = (isoString) => {
  if (!isoString) return 'Just now';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

export default function Header({
  user,
  isAdmin,
  currentPage,
  onToggleSidebar,
  onNavigate,
  onLogout,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const { notifications, unreadCount, loading: notifLoading, markRead, markAllRead } = useNotifications();
  const notifRef = useRef(null);
  const settingsRef = useRef(null);
  const profileRef = useRef(null);

  const { darkMode, toggleDarkMode, language, toggleLanguage, t } = useApp();

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
    if (!notif.read) markRead(notif.id);
    setShowNotifications(false);
    if (notif.route && onNavigate) onNavigate(notif.route);
  };

  const handleNavigate = (route) => {
    setShowSettings(false);
    setShowProfile(false);
    if (onNavigate) onNavigate(route);
  };

  // Format user display values from authenticated session
  const displayName = user?.name
    ? user.name.toUpperCase()
    : user?.email
    ? user.email.split('@')[0].toUpperCase()
    : 'USER';
  const displayPhone = user?.phone || '';
  const displayBalance = user?.balance !== undefined ? `₹${user.balance}` : null;

  return (
    <header className="h-16 bg-white/95 dark:bg-dark-900/95 backdrop-blur-md border-b border-dark-200/80 dark:border-dark-700/80 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 transition-all shadow-2xs">
      {/* Left Section: Sidebar Toggle & Panel Badge */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="p-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-600 dark:text-dark-300 transition-colors cursor-pointer"
          title="Toggle Sidebar"
        >
          <Menu size={18} />
        </button>

        {/* Panel Role Badge & Mode Switcher */}
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <span
              onClick={() => onNavigate?.('admin-panel')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 shadow-2xs cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
              title="Go to Admin Desk Overview"
            >
              <Shield size={13} className="text-rose-600 dark:text-rose-400" />
              ADMIN DESK
            </span>

            {/* Quick Panel Switcher for Admin */}
            {currentPage?.startsWith('admin-') || currentPage === 'admin-panel' ? (
              <button
                onClick={() => {
                  sessionStorage.setItem('smartcrm_preview_caller', 'true');
                  onNavigate?.('home');
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-dark-600 dark:text-dark-300 hover:text-dark-900 dark:hover:text-white bg-dark-100 hover:bg-dark-200 dark:bg-dark-800 dark:hover:bg-dark-700 border border-dark-200 dark:border-dark-700 transition-colors cursor-pointer"
                title="Preview Caller Panel View"
              >
                <Eye size={13} />
                <span>Preview Caller Panel</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  sessionStorage.removeItem('smartcrm_preview_caller');
                  onNavigate?.('admin-panel');
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 transition-all shadow-xs cursor-pointer animate-pulse"
                title="Return to Admin Desk"
              >
                <Shield size={13} />
                <span>Return to Admin Desk</span>
              </button>
            )}
          </div>
        ) : (
          <span
            onClick={() => onNavigate?.('home')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 shadow-2xs cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            title="Go to Caller Panel Home"
          >
            <Phone size={13} className="text-blue-600 dark:text-blue-400" />
            CALLER PANEL
          </span>
        )}
      </div>

      {/* Right Section: Balance, User Profile, Quick Actions, Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Available Balance Pill */}
        <button
          onClick={() => onNavigate?.('wallet')}
          title="Open Wallet & Recharges"
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-[13px] text-dark-700 dark:text-dark-300 transition-colors cursor-pointer"
        >
          <Wallet size={15} className="text-dark-800 dark:text-dark-100" />
          <span className="font-normal text-[13px] text-[rgba(0,0,0,0.65)] dark:text-dark-400">AVL BAL :</span>
          <span className="font-semibold text-[13px] text-blue-600 dark:text-blue-400">{displayBalance || '₹0.0'}</span>
        </button>

        {/* User Info (Name + Phone) */}
        <div
          onClick={() => handleNavigate('settings')}
          className="cursor-pointer text-right select-none group flex items-center gap-2"
        >
          <div className="hidden xs:block text-right">
            <p className="text-[14px] font-semibold text-dark-900 dark:text-white uppercase tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
              {displayName}
            </p>
            {displayPhone ? (
              <p className="text-[12px] text-dark-400 font-normal leading-tight mt-0.5">
                {displayPhone}
              </p>
            ) : user?.email ? (
              <p className="text-[12px] text-dark-400 font-normal leading-tight mt-0.5">
                {user.email}
              </p>
            ) : null}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-dark-700 dark:text-dark-200 border border-dark-300 dark:border-dark-700 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800 hover:text-dark-900 dark:hover:text-white transition-colors"
        >
          Logout
        </button>

        {/* Notifications & Quick Settings Menu (Subtle Dropdown / Drawer) */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowSettings(false);
              setShowProfile(false);
            }}
            className={`p-1.5 rounded-lg text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors ${
              showNotifications ? 'bg-blue-50 text-blue-600' : ''
            }`}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[340px] sm:w-[380px] bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-dark-200 dark:border-dark-700 z-50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50 dark:bg-dark-900/30">
                <h3 className="text-sm font-semibold text-dark-900 dark:text-white">
                  Notifications
                </h3>
                <span className="text-xs text-dark-500">{unreadCount} unread</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-8 text-dark-400">
                    <Loader2 className="animate-spin mr-2" size={16} />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-dark-400">
                    You're all caught up - no new alerts.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`px-4 py-2.5 hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer border-b border-dark-100 dark:border-dark-700/50 flex gap-2.5 ${
                        !notif.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <span className="text-base">{getNotifIcon(notif.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-dark-900 dark:text-white truncate">
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-dark-500 truncate">{notif.message}</p>
                        <p className="text-[10px] text-dark-400 mt-0.5">{timeAgo(notif.time)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-3 py-2 border-t border-dark-200 dark:border-dark-700 flex justify-between items-center text-xs">
                <button onClick={markAllRead} className="text-dark-500 hover:text-dark-800 dark:hover:text-dark-200 cursor-pointer">
                  Mark all as read
                </button>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    onNavigate?.('call-history');
                  }}
                  className="text-blue-600 font-medium hover:underline"
                >
                  View Activity
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Settings Icon */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowNotifications(false);
              setShowProfile(false);
            }}
            className="p-1.5 rounded-lg text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>

          {showSettings && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-dark-200 dark:border-dark-700 z-50 p-2 space-y-1">
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
              >
                <div className="flex items-center gap-2 text-dark-700 dark:text-dark-200">
                  {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                  <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                <span className="text-[10px] text-dark-400">{darkMode ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={toggleLanguage}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
              >
                <div className="flex items-center gap-2 text-dark-700 dark:text-dark-200">
                  <Languages size={16} />
                  <span>Language</span>
                </div>
                <span className="text-[10px] text-dark-400 uppercase">{language}</span>
              </button>
              <div className="border-t border-dark-200 dark:border-dark-700 my-1"></div>
              <button
                onClick={() => handleNavigate('settings')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-dark-700 dark:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-700"
              >
                <Settings size={16} />
                <span>All Settings</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
