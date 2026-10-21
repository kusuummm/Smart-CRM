import { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Sparkles,
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
  Sun,
  Sunrise,
  Moon,
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


  // Filter states
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [dateRangeText, setDateRangeText] = useState('Today');

  // Dynamic teams loaded from CRM state / localStorage
  const [teams, setTeams] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('smartcrm_teams') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const syncTeams = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('smartcrm_teams') || '[]');
        if (Array.isArray(stored)) {
          setTeams(stored);
        }
      } catch {
        setTeams([]);
      }
    };
    syncTeams();
    window.addEventListener('storage', syncTeams);
    return () => window.removeEventListener('storage', syncTeams);
  }, []);

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
    let Icon = Sun;

    if (hour < 12) {
      text = 'Good morning';
      Icon = Sunrise;
    } else if (hour >= 17) {
      text = 'Good evening';
      Icon = Moon;
    }

    // User first name in caps
    const firstName = user?.name
      ? user.name.split(' ')[0].toUpperCase()
      : user?.email
      ? user.email.split('@')[0].toUpperCase()
      : '';
    return { text: firstName ? `${text}, ${firstName}` : text, Icon };
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
      const existingCustPhones = new Set(
        serverCusts.map((c) => (c.mobile || c.phone || '').slice(-10))
      );
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
            {greeting.Icon && <greeting.Icon size={24} className="text-amber-500 shrink-0" />}
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
              {teams && teams.length > 0 &&
                teams.map((t) => {
                  const tName = typeof t === 'string' ? t : t.name;
                  return (
                    <option key={t.id || tName} value={tName}>
                      {tName}
                    </option>
                  );
                })}
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
                <X size={12} />
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
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 border-t-4 border-t-indigo-500 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <h3 className="text-sm font-heading font-bold text-dark-900 dark:text-white">
                Call Insights
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Real-time sync
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            {/* Outgoing Calls */}
            <div
              onClick={() => onNavigate?.('call-history', 'outgoing')}
              className="p-4 rounded-xl cursor-pointer bg-gradient-to-br from-indigo-50/90 via-blue-50/40 to-white dark:from-indigo-950/30 dark:via-dark-800 dark:to-dark-800 border border-indigo-100/90 dark:border-indigo-900/40 shadow-2xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 group"
              title="Click to view all Outgoing calls in Call History"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                    <PhoneOutgoing size={14} />
                  </div>
                  <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-indigo-600 transition-colors">
                    Outgoing Calls
                  </span>
                </div>
                <ArrowUpRight
                  size={14}
                  className="text-dark-300 dark:text-dark-600 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-indigo-950 dark:text-indigo-100 mt-3 group-hover:text-indigo-600 transition-colors">
                {callStats.outgoing}
              </p>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                View calls →
              </span>
            </div>

            {/* Incoming Calls */}
            <div
              onClick={() => onNavigate?.('call-history', 'incoming')}
              className="p-4 rounded-xl cursor-pointer bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white dark:from-emerald-950/30 dark:via-dark-800 dark:to-dark-800 border border-emerald-100/90 dark:border-emerald-900/40 shadow-2xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200 group"
              title="Click to view all Incoming calls in Call History"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                    <PhoneIncoming size={14} />
                  </div>
                  <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-emerald-600 transition-colors">
                    Incoming Calls
                  </span>
                </div>
                <ArrowUpRight
                  size={14}
                  className="text-dark-300 dark:text-dark-600 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-950 dark:text-emerald-100 mt-3 group-hover:text-emerald-600 transition-colors">
                {callStats.incoming}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                View calls →
              </span>
            </div>

            {/* Connected Calls */}
            <div
              onClick={() => onNavigate?.('call-history', 'connected')}
              className="p-4 rounded-xl cursor-pointer bg-gradient-to-br from-sky-50/90 via-blue-50/40 to-white dark:from-sky-950/30 dark:via-dark-800 dark:to-dark-800 border border-sky-100/90 dark:border-sky-900/40 shadow-2xs hover:shadow-md hover:border-sky-300 dark:hover:border-sky-600 transition-all duration-200 group"
              title="Click to view all Connected calls in Call History"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                    <PhoneCall size={14} />
                  </div>
                  <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-sky-600 transition-colors">
                    Connected Calls
                  </span>
                </div>
                <ArrowUpRight
                  size={14}
                  className="text-dark-300 dark:text-dark-600 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-sky-950 dark:text-sky-100 mt-3 group-hover:text-sky-600 transition-colors">
                {callStats.connected}
              </p>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                View calls →
              </span>
            </div>

            {/* Received Calls */}
            <div
              onClick={() => onNavigate?.('call-history', 'received')}
              className="p-4 rounded-xl cursor-pointer bg-gradient-to-br from-teal-50/90 via-cyan-50/40 to-white dark:from-teal-950/30 dark:via-dark-800 dark:to-dark-800 border border-teal-100/90 dark:border-teal-900/40 shadow-2xs hover:shadow-md hover:border-teal-300 dark:hover:border-teal-600 transition-all duration-200 group"
              title="Click to view all Received calls in Call History"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-teal-600 transition-colors">
                    Received Calls
                  </span>
                </div>
                <ArrowUpRight
                  size={14}
                  className="text-dark-300 dark:text-dark-600 group-hover:text-teal-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-teal-950 dark:text-teal-100 mt-3 group-hover:text-teal-600 transition-colors">
                {callStats.received}
              </p>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                View calls →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Customer Insights Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 border-t-4 border-t-violet-500 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse"></span>
            <h3 className="text-sm font-heading font-bold text-dark-900 dark:text-white">
              Customer Insights
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 border border-violet-200/60 dark:border-violet-800/40">
            Active directory
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Unique Customers */}
          <div
            onClick={() => onNavigate?.('contacts')}
            className="p-4 rounded-xl cursor-pointer bg-gradient-to-br from-violet-50/90 via-purple-50/40 to-white dark:from-violet-950/30 dark:via-dark-800 dark:to-dark-800 border border-violet-100/90 dark:border-violet-900/40 shadow-2xs hover:shadow-md hover:border-violet-300 dark:hover:border-violet-600 transition-all duration-200 group"
            title="Click to view all Customers in Contacts"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                  <Users size={14} />
                </div>
                <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-violet-600 transition-colors">
                  Unique Customers
                </span>
              </div>
              <ArrowUpRight
                size={14}
                className="text-dark-300 dark:text-dark-600 group-hover:text-violet-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              />
            </div>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-violet-950 dark:text-violet-100 mt-3 group-hover:text-violet-600 transition-colors">
              {callStats.uniqueCustomers}
            </p>
            <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
              View customer list →
            </span>
          </div>

          {/* Missed Customers */}
          <div
            onClick={() => onNavigate?.('call-history', 'missed')}
            className="p-4 rounded-xl cursor-pointer bg-gradient-to-br from-rose-50/90 via-orange-50/40 to-white dark:from-rose-950/30 dark:via-dark-800 dark:to-dark-800 border border-rose-100/90 dark:border-rose-900/40 shadow-2xs hover:shadow-md hover:border-rose-300 dark:hover:border-rose-600 transition-all duration-200 group"
            title="Click to view Missed calls in Call History"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                  <Phone size={14} />
                </div>
                <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-rose-600 transition-colors">
                  Missed Customers
                </span>
              </div>
              <ArrowUpRight
                size={14}
                className="text-dark-300 dark:text-dark-600 group-hover:text-rose-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              />
            </div>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-rose-950 dark:text-rose-100 mt-3 group-hover:text-rose-600 transition-colors">
              {callStats.missedCustomers}
            </p>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
              View missed calls →
            </span>
          </div>
        </div>
      </div>

      {/* 6. Staff Level Insights Accordion Card */}
      <div className="rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 border-t-4 border-t-emerald-500 shadow-xs overflow-hidden transition-all">
        <div
          onClick={() => setShowStaffInsights(!showStaffInsights)}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-dark-50/50 dark:hover:bg-dark-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
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
                {staffData.map((st, idx) => {
                  const avatarGradients = [
                    'bg-gradient-to-br from-blue-500 to-indigo-600',
                    'bg-gradient-to-br from-emerald-500 to-teal-600',
                    'bg-gradient-to-br from-violet-500 to-purple-600',
                    'bg-gradient-to-br from-amber-500 to-orange-600',
                    'bg-gradient-to-br from-rose-500 to-pink-600',
                    'bg-gradient-to-br from-cyan-500 to-blue-600',
                  ];
                  const grad = avatarGradients[idx % avatarGradients.length];
                  return (
                  <tr key={idx} className="hover:bg-dark-50/50 dark:hover:bg-dark-700/30">
                    <td className="py-3 font-bold text-dark-900 dark:text-white flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full ${grad} text-white flex items-center justify-center font-bold text-xs shadow-2xs`}>
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
          className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 border-t-4 border-t-sky-500 shadow-xs space-y-5 cursor-pointer hover:border-sky-300 dark:hover:border-sky-800 hover:shadow-md transition-all duration-200 group"
          title="Click to view and manage Teams"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
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
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 transition-all shadow-xs"
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
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 border-t-4 border-t-teal-500 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-xs">
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
