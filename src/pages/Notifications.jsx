import { useState, useMemo } from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  Check,
  Trash2,
  Filter,
  Search,
  ArrowRight,
  Sparkles,
  Target,
  PhoneCall,
  Calendar,
  AlertTriangle,
  Mail,
  RefreshCw,
  Clock,
  ShieldCheck,
  Wallet,
  Zap,
  Info,
  ChevronRight,
  X,
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../components/Toast';

// Helper for relative timestamps
const formatTimeAgo = (isoString) => {
  if (!isoString) return 'Just now';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function Notifications({ onNavigate }) {
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markUnread,
    markAllRead,
    dismissNotification,
    clearAll,
    refresh,
  } = useNotifications();

  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      addToast('Notifications refreshed', 'info');
    } catch {
      addToast('Failed to refresh notifications', 'error');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    clearAll();
    addToast('All notifications cleared', 'success');
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) {
      addToast('All notifications are already marked as read', 'info');
      return;
    }
    markAllRead();
    addToast('Marked all notifications as read', 'success');
  };

  const handleActionClick = (notif) => {
    if (!notif.read) {
      markRead(notif.id);
    }
    if (notif.route && onNavigate) {
      onNavigate(notif.route);
    }
  };

  // Compute Stats
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.read).length;
    const followups = notifications.filter((n) => n.type === 'followup' || n.type === 'event').length;
    const urgent = notifications.filter(
      (n) => n.priority === 'urgent' || n.type === 'whatsapp' || n.type === 'wallet'
    ).length;
    return { total, unread, followups, urgent };
  }, [notifications]);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Tab filter
      if (activeTab === 'unread' && notif.read) return false;
      if (activeTab === 'followups' && notif.type !== 'followup' && notif.type !== 'event') return false;
      if (activeTab === 'leads' && notif.type !== 'lead' && notif.type !== 'conversion') return false;
      if (activeTab === 'alerts' && notif.type !== 'whatsapp' && notif.type !== 'wallet') return false;

      // Priority filter
      if (filterPriority !== 'all' && notif.priority !== filterPriority) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = notif.title?.toLowerCase().includes(q);
        const msgMatch = notif.message?.toLowerCase().includes(q);
        const contactMatch = notif.contactName?.toLowerCase().includes(q);
        return titleMatch || msgMatch || contactMatch;
      }

      return true;
    });
  }, [notifications, activeTab, filterPriority, searchQuery]);

  const getIcon = (type) => {
    switch (type) {
      case 'lead':
        return (
          <span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Target size={20} />
          </span>
        );
      case 'conversion':
        return (
          <span className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </span>
        );
      case 'followup':
        return (
          <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <PhoneCall size={20} />
          </span>
        );
      case 'event':
        return (
          <span className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </span>
        );
      case 'whatsapp':
        return (
          <span className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </span>
        );
      case 'wallet':
        return (
          <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </span>
        );
      default:
        return (
          <span className="w-10 h-10 rounded-xl bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300 flex items-center justify-center shrink-0">
            <Bell size={20} />
          </span>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            High
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-dark-800 p-5 sm:p-6 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Bell size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">
                Notifications Center
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5">
              Real-time activity feed, scheduled follow-up reminders, lead alerts, and system notices.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-dark-50 dark:bg-dark-700/60 hover:bg-dark-100 dark:hover:bg-dark-700 text-dark-700 dark:text-dark-200 border border-dark-200 dark:border-dark-600 transition-colors cursor-pointer"
            title="Refresh Notification Feed"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <CheckCheck size={14} />
            <span>Mark all read</span>
          </button>

          <button
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-dark-50 dark:bg-dark-700/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-dark-600 dark:text-dark-300 hover:text-rose-600 border border-dark-200 dark:border-dark-600 disabled:opacity-50 transition-colors cursor-pointer"
            title="Clear all alerts"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Clear all</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-dark-800 p-4 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-dark-500 uppercase tracking-wider">Total Alerts</p>
            <p className="text-2xl font-black text-dark-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Bell size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 p-4 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Unread</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.unread}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 p-4 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Follow-ups</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.followups}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <PhoneCall size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 p-4 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Urgent</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.urgent}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All', count: notifications.length },
              { id: 'unread', label: 'Unread', count: stats.unread },
              { id: 'followups', label: 'Follow-ups & Tasks', count: stats.followups },
              {
                id: 'leads',
                label: 'Leads & Pipeline',
                count: notifications.filter((n) => n.type === 'lead' || n.type === 'conversion').length,
              },
              {
                id: 'alerts',
                label: 'Alerts & Billing',
                count: notifications.filter((n) => n.type === 'whatsapp' || n.type === 'wallet').length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-dark-50 dark:bg-dark-700/60 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-dark-200 dark:bg-dark-600 text-dark-700 dark:text-dark-200'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications, contacts..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs divide-y divide-dark-100 dark:divide-dark-700/60 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-dark-400 gap-3">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <p className="text-xs font-semibold animate-pulse">Syncing live alerts & reminders...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner">
              <CheckCheck size={28} />
            </div>
            <h3 className="text-base font-bold text-dark-900 dark:text-white">All caught up!</h3>
            <p className="text-xs text-dark-500 dark:text-dark-400 max-w-sm mt-1">
              {searchQuery || activeTab !== 'all'
                ? 'No notifications match your current filter criteria.'
                : 'You have no pending alerts or unread notifications right now.'}
            </p>
            {(searchQuery || activeTab !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 sm:p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                !notif.read
                  ? 'bg-blue-50/30 dark:bg-blue-950/15 border-l-4 border-l-blue-600'
                  : 'hover:bg-dark-50/70 dark:hover:bg-dark-700/30'
              }`}
            >
              {/* Left Content Area */}
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                {getIcon(notif.type)}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4
                      onClick={() => handleActionClick(notif)}
                      className="text-xs sm:text-sm font-bold text-dark-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer truncate"
                    >
                      {notif.title}
                    </h4>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
                    )}
                    {getPriorityBadge(notif.priority)}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300">
                      {notif.category || 'General'}
                    </span>
                  </div>

                  <p className="text-xs text-dark-600 dark:text-dark-300 mt-1 leading-relaxed">
                    {notif.message}
                  </p>

                  {/* Meta items */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-dark-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatTimeAgo(notif.time)}
                    </span>
                    {notif.contactName && (
                      <span>• Contact: <strong className="text-dark-700 dark:text-dark-200">{notif.contactName}</strong></span>
                    )}
                    {notif.phone && (
                      <span>• Phone: <strong className="text-dark-700 dark:text-dark-200">{notif.phone}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {notif.route && (
                  <button
                    onClick={() => handleActionClick(notif)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>View</span>
                    <ArrowRight size={13} />
                  </button>
                )}

                <button
                  onClick={() => (notif.read ? markUnread(notif.id) : markRead(notif.id))}
                  className="p-2 rounded-xl text-dark-500 hover:text-dark-800 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors cursor-pointer"
                  title={notif.read ? 'Mark as unread' : 'Mark as read'}
                >
                  {notif.read ? <Check size={16} /> : <CheckCheck size={16} />}
                </button>

                <button
                  onClick={() => dismissNotification(notif.id)}
                  className="p-2 rounded-xl text-dark-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Dismiss notification"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
