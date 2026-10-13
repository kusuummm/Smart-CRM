import { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Sparkles,
  Megaphone,
  RefreshCw,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  CheckCircle2,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneCall,
  Clock,
  X,
  Plus,
  Play,
  Volume2,
  Sliders,
  Users,
  Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getCalls } from '../api/callHistory';
import { getCustomers } from '../api/customers';
import { getUsers } from '../api/users';

export default function HomeDashboard({
  onNavigate,
  onOpenBuyNumber,
}) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Just now');

  // Dismissable announcement banner
  const [showIvrBanner, setShowIvrBanner] = useState(true);

  // Filter states
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [dateRangeText, setDateRangeText] = useState('Today');

  // Collapsible staff level insights
  const [showStaffInsights, setShowStaffInsights] = useState(false);

  // Dynamic Metrics loaded from CRM state
  const [callStats, setCallStats] = useState({
    outgoing: 0,
    incoming: 0,
    connected: 0,
    received: 0,
    uniqueCustomers: 0,
    missedCustomers: 0,
  });

  const [staffData, setStaffData] = useState([]);

  // Dynamic time-based greeting calculation
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let text = 'Good afternoon';
    let emoji = '⛅';

    if (hour < 12) {
      text = 'Good morning';
      emoji = '🌅';
    } else if (hour >= 17) {
      text = 'Good evening';
      emoji = '🌙';
    }

    // User first name in caps
    const firstName = user?.name
      ? user.name.split(' ')[0].toUpperCase()
      : user?.email
      ? user.email.split('@')[0].toUpperCase()
      : '';
    return { text: firstName ? `${text}, ${firstName}` : text, emoji };
  }, [user]);

  // Current formatted date (e.g. "Friday, Oct 9")
  const formattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Fetch real metrics from CRM APIs
  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [callsRes, custsRes, usersRes] = await Promise.all([
        getCalls({ limit: 100 }).catch(() => ({ calls: [] })),
        getCustomers({ limit: 100 }).catch(() => ({ customers: [] })),
        getUsers().catch(() => ({ users: [] })),
      ]);

      const localCalls = JSON.parse(localStorage.getItem('smartcrm_all_calls') || '[]');
      const localContacts = JSON.parse(localStorage.getItem('smartcrm_contacts') || '[]');

      const serverCalls = callsRes.calls || [];
      const serverCusts = custsRes.customers || [];

      // Merge unique calls
      const existingCallIds = new Set(serverCalls.map((c) => c._id));
      const calls = [...serverCalls, ...localCalls.filter((c) => !existingCallIds.has(c.id))];

      // Merge unique customers
      const validLocalContacts = localContacts.filter((c) => !/private client/i.test(c.name || ''));
      const customers = [
        ...serverCusts,
        ...validLocalContacts.filter((c) => !existingCustPhones.has((c.phone || '').slice(-10))),
      ];
      const usersList = usersRes.users || [];

      const connectedCount = calls.filter((c) => c.status === 'connected' || c.callStatus === 'Answered').length;
      const missedCount = calls.filter((c) => c.status === 'missed' || c.callStatus === 'Missed').length;
      const incomingCount = calls.filter((c) => c.callType === 'incoming' || c.type === 'incoming').length;
      const outgoingCount = calls.filter(
        (c) => c.callType === 'outgoing' || c.callType === 'Outgoing' || c.type === 'outgoing' || (!c.callType && !c.type)
      ).length;

      setCallStats({
        outgoing: calls.length > 0 ? outgoingCount : 0,
        incoming: incomingCount,
        connected: connectedCount,
        received: connectedCount,
        uniqueCustomers: customers.length,
        missedCustomers: missedCount,
      });

      if (usersList.length > 0) {
        setStaffData(
          usersList.map((u) => ({
            name: u.name || u.email,
            phone: u.phone || '-',
            outgoing: 0,
            incoming: 0,
            connected: 0,
            avgTalkTime: '0m 00s',
            status: u.status === 'active' ? 'Available' : 'Offline',
          }))
        );
      } else if (user) {
        setStaffData([
          {
            name: user.name || user.email,
            phone: user.phone || '-',
            outgoing: 0,
            incoming: 0,
            connected: 0,
            avgTalkTime: '0m 00s',
            status: 'Available',
          },
        ]);
      } else {
        setStaffData([]);
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSynced(
        `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1)
          .toString()
          .padStart(2, '0')}/${now.getFullYear().toString().slice(-2)} ${timeStr}`
      );

      if (silent) {
        addToast('Call insights updated successfully', 'success');
      }
    } catch {
      // Empty fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Greeting & Date */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-dark-900 dark:text-white flex items-center gap-2">
            <span>{greeting.text}</span>
            <span className="text-2xl">{greeting.emoji}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs sm:text-sm font-medium text-dark-500 dark:text-dark-400">
              {formattedDate}
            </p>
            <span className="text-dark-300 dark:text-dark-600">•</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              All channels active
            </span>
          </div>
        </div>

      </div>

      {/* 4. IVR Announcement Card */}
      {showIvrBanner && (
        <div className="rounded-2xl p-4 sm:p-5 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Megaphone size={16} />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-indigo-950 dark:text-indigo-200">
              New: IVR management has been upgraded — set up your new flow in Settings.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => onNavigate?.('settings')}
              className="px-3.5 py-1.5 text-xs font-bold text-dark-800 dark:text-white bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl hover:bg-dark-50 shadow-2xs transition-colors"
            >
              Set up now &gt;
            </button>
            <button
              onClick={() => setShowIvrBanner(false)}
              className="p-1.5 text-dark-400 hover:text-dark-700 rounded-lg hover:bg-indigo-100/50 transition-colors"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 4. Call Insights Section Header with Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-heading font-bold text-dark-900 dark:text-white">
              Call insights
            </h2>
            <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
              Oct 9 – Oct 9 synced {lastSynced}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Select Team Dropdown */}
            <select
              value={selectedTeam}
              onChange={(e) => {
                if (e.target.value === '__manage__') {
                  onNavigate?.('teams');
                } else {
                  setSelectedTeam(e.target.value);
                }
              }}
              className="px-3.5 py-2 bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 rounded-xl font-medium text-dark-700 dark:text-dark-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs hover:border-dark-300 transition-colors cursor-pointer"
            >
              <option value="All Teams">Select team</option>
              <option value="Lead Team">Lead Team</option>
              <option value="Sales Line">Sales Line</option>
              <option value="Support Line">Support Line</option>
              <option value="__manage__">Manage Teams →</option>
            </select>

            {/* Date Range Picker Pill */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 rounded-xl font-medium text-dark-700 dark:text-dark-200 shadow-2xs hover:border-dark-300 transition-colors">
              <Calendar size={14} className="text-dark-400" />
              <span>Oct 09, 2026 – Oct 09,...</span>
              <button
                onClick={() => addToast('Date filter reset', 'info')}
                className="text-dark-400 hover:text-dark-700 ml-1 transition-colors"
                title="Reset date"
              >
                ✕
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 rounded-xl font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 shadow-2xs transition-colors"
            >
              <RefreshCw
                size={14}
                className={refreshing ? 'animate-spin text-blue-600' : 'text-dark-500'}
              />
              <span>Refresh</span>
            </button>

            {/* Details Link */}
            <button
              onClick={() => onNavigate?.('call-history')}
              className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Details &gt;
            </button>
          </div>
        </div>

        {/* Call Insights Metrics Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold text-dark-900 dark:text-white">
              Call Insights
            </h3>
            <span className="text-[11px] text-dark-400 font-medium">Real-time sync</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
            {/* Outgoing Calls */}
            <div
              onClick={() => onNavigate?.('call-history', 'outgoing')}
              className="p-3.5 rounded-xl cursor-pointer hover:bg-blue-50/70 dark:hover:bg-blue-950/40 border border-transparent hover:border-blue-200/80 dark:hover:border-blue-900/60 transition-all duration-150 group shadow-none hover:shadow-2xs"
              title="Click to view all Outgoing calls in Call History"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-dark-500 dark:text-dark-400 font-medium group-hover:text-blue-600 transition-colors">
                  <PhoneOutgoing size={13} className="text-blue-500" />
                  <span>Outgoing Calls</span>
                </div>
                <ArrowUpRight
                  size={13}
                  className="text-dark-300 dark:text-dark-600 group-hover:text-blue-600 transition-colors"
                />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-2 group-hover:text-blue-600 transition-colors">
                {callStats.outgoing}
              </p>
              <span className="text-[10px] text-dark-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                View calls →
              </span>
            </div>

            {/* Incoming Calls */}
            <div
              onClick={() => onNavigate?.('call-history', 'incoming')}
              className="p-3.5 rounded-xl cursor-pointer hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-200/80 dark:hover:border-emerald-900/60 transition-colors duration-150 group"
              title="Click to view all Incoming calls in Call History"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-dark-500 dark:text-dark-400 font-medium group-hover:text-emerald-600 transition-colors">
                  <PhoneIncoming size={13} className="text-emerald-500" />
                  <span>Incoming Calls</span>
                </div>
                <ArrowUpRight
                  size={13}
                  className="text-dark-300 dark:text-dark-600 group-hover:text-emerald-600 transition-colors"
                />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-2 group-hover:text-emerald-600 transition-colors">
                {callStats.incoming}
              </p>
              <span className="text-[10px] text-dark-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                View calls →
              </span>
            </div>

            {/* Connected Calls */}
            <div
              onClick={() => onNavigate?.('call-history', 'connected')}
              className="p-3.5 rounded-xl cursor-pointer hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200/80 dark:hover:border-indigo-900/60 transition-colors duration-150 group"
              title="Click to view all Connected calls in Call History"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-dark-500 dark:text-dark-400 font-medium group-hover:text-indigo-600 transition-colors">
                  <PhoneCall size={13} className="text-indigo-500" />
                  <span>Connected Calls</span>
                </div>
                <ArrowUpRight
                  size={13}
                  className="text-dark-300 dark:text-dark-600 group-hover:text-indigo-600 transition-colors"
                />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-2 group-hover:text-indigo-600 transition-colors">
                {callStats.connected}
              </p>
              <span className="text-[10px] text-dark-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                View calls →
              </span>
            </div>

            {/* Received Calls */}
            <div
              onClick={() => onNavigate?.('call-history', 'received')}
              className="p-3.5 rounded-xl cursor-pointer hover:bg-teal-50/70 dark:hover:bg-teal-950/40 border border-transparent hover:border-teal-200/80 dark:hover:border-teal-900/60 transition-colors duration-150 group"
              title="Click to view all Received calls in Call History"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-dark-500 dark:text-dark-400 font-medium group-hover:text-teal-600 transition-colors">
                  <CheckCircle2 size={13} className="text-teal-500" />
                  <span>Received Calls</span>
                </div>
                <ArrowUpRight
                  size={13}
                  className="text-dark-300 dark:text-dark-600 group-hover:text-teal-600 transition-colors"
                />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-2 group-hover:text-teal-600 transition-colors">
                {callStats.received}
              </p>
              <span className="text-[10px] text-dark-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                View calls →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Customer Insights Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-dark-900 dark:text-white">
            Customer Insights
          </h3>
          <span className="text-[11px] text-dark-400 font-medium">Active directory</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Unique Customers */}
          <div
            onClick={() => onNavigate?.('contacts')}
            className="p-3.5 rounded-xl cursor-pointer hover:bg-blue-50/70 dark:hover:bg-blue-950/40 border border-transparent hover:border-blue-200/80 dark:hover:border-blue-900/60 transition-all duration-150 group shadow-none hover:shadow-2xs"
            title="Click to view all Customers in Contacts"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-dark-500 dark:text-dark-400 font-medium group-hover:text-blue-600 transition-colors">
                <Users size={13} className="text-blue-500" />
                <span>Unique Customers</span>
              </div>
              <ArrowUpRight
                size={13}
                className="text-dark-300 dark:text-dark-600 group-hover:text-blue-600 transition-colors"
              />
            </div>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-2 group-hover:text-blue-600 transition-colors">
              {callStats.uniqueCustomers}
            </p>
            <span className="text-[10px] text-dark-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
              View customer list →
            </span>
          </div>

          {/* Missed Customers */}
          <div
            onClick={() => onNavigate?.('call-history', 'missed')}
            className="p-3.5 rounded-xl cursor-pointer hover:bg-rose-50/70 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200/80 dark:hover:border-rose-900/60 transition-colors duration-150 group"
            title="Click to view Missed calls in Call History"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-dark-500 dark:text-dark-400 font-medium group-hover:text-rose-600 transition-colors">
                <Phone size={13} className="text-rose-500" />
                <span>Missed Customers</span>
              </div>
              <ArrowUpRight
                size={13}
                className="text-dark-300 dark:text-dark-600 group-hover:text-rose-600 transition-colors"
              />
            </div>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-2 group-hover:text-rose-600 transition-colors">
              {callStats.missedCustomers}
            </p>
            <span className="text-[10px] text-dark-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
              View missed calls →
            </span>
          </div>
        </div>
      </div>

      {/* 6. Staff Level Insights Accordion Card */}
      <div className="rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs overflow-hidden transition-all">
        <div
          onClick={() => setShowStaffInsights(!showStaffInsights)}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-dark-50/50 dark:hover:bg-dark-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-heading font-bold text-dark-900 dark:text-white">
              Staff Level Insights
            </h3>
            <span className="text-[11px] text-dark-400 font-medium">({staffData.length} active)</span>
          </div>
          <button className="text-dark-400 hover:text-dark-700 transition-colors">
            {showStaffInsights ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
          </button>
        </div>

        {showStaffInsights && (
          <div className="p-5 pt-0 border-t border-dark-100 dark:border-dark-700/60 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700 text-dark-400 uppercase tracking-wider font-semibold">
                  <th className="py-2.5">Staff / Lead</th>
                  <th className="py-2.5">Outgoing</th>
                  <th className="py-2.5">Incoming</th>
                  <th className="py-2.5">Connected</th>
                  <th className="py-2.5">Avg Talk Time</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-700/40">
                {staffData.map((st, idx) => (
                  <tr key={idx} className="hover:bg-dark-50/50 dark:hover:bg-dark-700/30">
                    <td className="py-3 font-bold text-dark-900 dark:text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold text-xs shadow-2xs">
                        {st.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-heading font-semibold text-dark-900 dark:text-white">{st.name}</p>
                        <span className="text-[10px] text-dark-400 font-medium">{st.phone}</span>
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-dark-800 dark:text-dark-200">
                      {st.outgoing}
                    </td>
                    <td className="py-3 font-semibold text-dark-800 dark:text-dark-200">
                      {st.incoming}
                    </td>
                    <td className="py-3 font-semibold text-dark-800 dark:text-dark-200">
                      {st.connected}
                    </td>
                    <td className="py-3 font-mono text-dark-600 dark:text-dark-300">
                      {st.avgTalkTime}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          st.status === 'Available'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            st.status === 'Available' ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                        ></span>
                        {st.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Bottom Row: 2 Teams Subscription Overview + "You're all set" */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Card: 2 Teams & Subscription overview (Clickable) */}
        <div
          onClick={() => onNavigate?.('teams')}
          className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-md transition-all duration-200 group"
          title="Click to view and manage Teams"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                <Users size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    2 Teams
                  </h3>
                  <ArrowUpRight
                    size={15}
                    className="text-dark-300 dark:text-dark-600 group-hover:text-blue-600 transition-colors"
                  />
                </div>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                  Subscription overview • Click to manage teams
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenBuyNumber();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
            >
              Buy a new Number
            </button>
          </div>

          <div className="grid grid-cols-3 divide-x divide-dark-200 dark:divide-dark-700/60 pt-2">
            <div className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 p-2 rounded-lg transition-colors">
              <span className="text-xs text-dark-500 font-medium">Expiring soon</span>
              <p className="text-2xl font-heading font-extrabold text-amber-500 mt-1">0</p>
            </div>
            <div className="px-4 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 p-2 rounded-lg transition-colors">
              <span className="text-xs text-dark-500 font-medium">Expired</span>
              <p className="text-2xl font-heading font-extrabold text-rose-500 mt-1">0</p>
            </div>
            <div className="px-4 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 p-2 rounded-lg transition-colors">
              <span className="text-xs text-dark-500 font-medium">On trial</span>
              <p className="text-2xl font-heading font-extrabold text-blue-600 mt-1">0</p>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-xs text-blue-600 font-semibold group-hover:underline">
            <span>Manage teams &amp; member allocations →</span>
          </div>
        </div>

        {/* Right Card: You're all set */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white">
                You&apos;re all set
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5 leading-relaxed">
                No pending setup. Manage teams or invite your staff anytime.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={() => onNavigate?.('teams')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <span>Manage teams</span>
              <span>&gt;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
