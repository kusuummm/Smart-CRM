import { useState, useMemo, useEffect } from 'react';
import {
  BarChart2,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Phone,
  PhoneCall,
  Clock,
  Users,
  X,
  Check,
  TrendingUp,
  Award,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  PhoneIncoming,
  PhoneOutgoing,
  Sliders,
  Filter,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getCalls } from '../api/callHistory';
import { getCustomers } from '../api/customers';
import { getUsers } from '../api/users';

// In-Memory Fast Cache for Instant Navigation
let _cachedInsightsData = null;
let _cachedInsightsTimestamp = 0;
const CACHE_FRESH_MS = 20000;

// Sleek Custom Tooltip
const InsightsChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-900/95 dark:bg-dark-900/95 backdrop-blur-md text-white text-xs rounded-xl p-3 shadow-2xl border border-slate-700/60 min-w-[150px] space-y-1.5 animate-in fade-in duration-150">
      <p className="font-bold text-slate-300 pb-1 border-b border-slate-800 text-[11px] uppercase tracking-wider">
        {label}
      </p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-2xs"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            {entry.name}:
          </span>
          <span className="font-bold text-white font-mono">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Duration calculation helper
const parseDurationSeconds = (dur) => {
  if (!dur) return 0;
  if (typeof dur === 'number') return dur;
  const str = String(dur).trim().toLowerCase();
  let total = 0;
  const mMatch = str.match(/(\d+)\s*m/);
  if (mMatch) total += parseInt(mMatch[1], 10) * 60;
  const sMatch = str.match(/(\d+)\s*s/);
  if (sMatch) total += parseInt(sMatch[1], 10);
  if (!mMatch && !sMatch) {
    const num = parseInt(str, 10);
    if (!isNaN(num)) total += num;
  }
  return total;
};

const formatSeconds = (sec) => {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

export default function Insights({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Just now');

  // Filters
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [selectedStaff, setSelectedStaff] = useState('All Staff');
  const [period, setPeriod] = useState('Last 7 Days');

  // Dropdown states
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Accordion state for Staff Level Insights
  const [showStaffLevelInsights, setShowStaffLevelInsights] = useState(false);

  const teamsList = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('smartcrm_teams') || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        return ['All Teams', ...saved.map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean)];
      }
    } catch {}
    return ['All Teams'];
  }, []);

  const [staffList, setStaffList] = useState(['All Staff']);
  const [staffRows, setStaffRows] = useState(() => _cachedInsightsData?.staffRows || []);
  const [rawCalls, setRawCalls] = useState(() => _cachedInsightsData?.calls || []);

  // Call Metrics loaded from CRM (100% dynamic)
  const [metrics, setMetrics] = useState(() => _cachedInsightsData?.metrics || {
    outgoingCalls: 0,
    incomingCalls: 0,
    connectedCalls: 0,
    receivedCalls: 0,
    missedCalls: 0,
    totalTalkTime: '0s',
    avgOutgoingDuration: '0s',
    avgIncomingDuration: '0s',
    uniqueCustomers: 0,
    missedCustomers: 0,
  });

  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    try {
      const [callsRes, custsRes, usersRes] = await Promise.all([
        getCalls({ limit: 200 }).catch(() => ({ calls: [] })),
        getCustomers({ limit: 200 }).catch(() => ({ customers: [] })),
        getUsers().catch(() => ({ users: [] })),
      ]);

      const localCalls = JSON.parse(localStorage.getItem('smartcrm_all_calls') || '[]');
      const serverCalls = callsRes.calls || [];
      const existingCallIds = new Set(serverCalls.map((c) => c._id || c.id));
      const calls = [...serverCalls, ...localCalls.filter((c) => !existingCallIds.has(c.id || c._id))];
      setRawCalls(calls);

      const customers = custsRes.customers || [];
      const usersList = usersRes.users || [];

      const connectedCalls = calls.filter((c) =>
        ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase())
      );
      const missed = calls.filter((c) =>
        ['missed', 'unanswered'].includes((c.status || c.callStatus || '').toLowerCase())
      ).length;
      const incomingCalls = calls.filter((c) =>
        ['incoming', 'received'].includes((c.callType || c.type || '').toLowerCase())
      );
      const outgoingCalls = calls.filter((c) => {
        const type = (c.callType || c.type || '').toLowerCase();
        return type === 'outgoing' || (!type && c.status !== 'incoming');
      });

      const totalSpokenSec = connectedCalls.reduce(
        (sum, c) => sum + parseDurationSeconds(c.duration),
        0
      );

      const outgoingConnected = outgoingCalls.filter((c) =>
        ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase())
      );
      const outgoingSpokenSec = outgoingConnected.reduce(
        (sum, c) => sum + parseDurationSeconds(c.duration),
        0
      );

      const incomingConnected = incomingCalls.filter((c) =>
        ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase())
      );
      const incomingSpokenSec = incomingConnected.reduce(
        (sum, c) => sum + parseDurationSeconds(c.duration),
        0
      );

      const newMetrics = {
        outgoingCalls: outgoingCalls.length,
        incomingCalls: incomingCalls.length,
        connectedCalls: connectedCalls.length,
        receivedCalls: connectedCalls.length,
        missedCalls: missed,
        totalTalkTime: formatSeconds(totalSpokenSec),
        avgOutgoingDuration: outgoingConnected.length
          ? formatSeconds(Math.round(outgoingSpokenSec / outgoingConnected.length))
          : '0s',
        avgIncomingDuration: incomingConnected.length
          ? formatSeconds(Math.round(incomingSpokenSec / incomingConnected.length))
          : '0s',
        uniqueCustomers: customers.length,
        missedCustomers: missed,
      };
      setMetrics(newMetrics);

      let newStaff = [];
      if (usersList.length > 0) {
        setStaffList(['All Staff', ...usersList.map((u) => u.name || u.email)]);
        newStaff = usersList.map((u) => {
          const uCalls = calls.filter((c) => c.calledBy === u._id || c.calledByName === u.name);
          const uConn = uCalls.filter((c) => ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase()));
          const uSec = uConn.reduce((sum, c) => sum + parseDurationSeconds(c.duration), 0);
          return {
            name: u.name || u.email,
            phone: u.phone || '-',
            outgoing: uCalls.filter((c) => (c.callType || '').toLowerCase() === 'outgoing').length,
            incoming: uCalls.filter((c) => (c.callType || '').toLowerCase() === 'incoming').length,
            connected: uConn.length,
            totalTalkTime: formatSeconds(uSec),
            avgDuration: uConn.length ? formatSeconds(Math.round(uSec / uConn.length)) : '0s',
            status: u.status === 'active' ? 'Available' : 'Offline',
          };
        });
        setStaffRows(newStaff);
      } else if (user) {
        setStaffList(['All Staff', user.name || user.email]);
        newStaff = [
          {
            name: user.name || user.email,
            phone: user.phone || '-',
            outgoing: outgoingCalls.length,
            incoming: incomingCalls.length,
            connected: connectedCalls.length,
            totalTalkTime: formatSeconds(totalSpokenSec),
            avgDuration: connectedCalls.length ? formatSeconds(Math.round(totalSpokenSec / connectedCalls.length)) : '0s',
            status: 'Available',
          },
        ];
        setStaffRows(newStaff);
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSynced(timeStr);

      _cachedInsightsData = {
        calls,
        metrics: newMetrics,
        staffRows: newStaff,
      };
      _cachedInsightsTimestamp = Date.now();

      if (forceRefresh) {
        addToast('Insights data refreshed live', 'success');
      }
    } catch {} finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!_cachedInsightsData || Date.now() - _cachedInsightsTimestamp > CACHE_FRESH_MS) {
      loadData();
    }
  }, []);

  const handleRefresh = () => {
    loadData(true);
  };

  // 100% DYNAMIC: Performance Comparison Bar Chart (Daily calls calculated directly from rawCalls)
  const performanceBarData = useMemo(() => {
    const calls = rawCalls;
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayCalls = calls.filter((c) => (c.date || c.createdAt || '').slice(0, 10) === dateStr);
      const out = dayCalls.filter((c) => (c.callType || c.type || '').toLowerCase() === 'outgoing').length;
      const conn = dayCalls.filter((c) =>
        ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase())
      ).length;
      const miss = dayCalls.filter((c) =>
        ['missed', 'unanswered'].includes((c.status || c.callStatus || '').toLowerCase())
      ).length;

      result.push({
        day: dayLabel,
        outgoing: out,
        connected: conn,
        missed: miss,
      });
    }

    return result;
  }, [rawCalls]);

  // 100% DYNAMIC: Talk Time Velocity (Sum duration in minutes calculated directly from rawCalls)
  const talkTimeAreaData = useMemo(() => {
    const calls = rawCalls;
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayCalls = calls.filter((c) => (c.date || c.createdAt || '').slice(0, 10) === dateStr);
      const dayConnected = dayCalls.filter((c) =>
        ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase())
      );
      const totalSec = dayConnected.reduce((sum, c) => sum + parseDurationSeconds(c.duration), 0);
      const talkMins = +(totalSec / 60).toFixed(1);

      result.push({
        day: dayLabel,
        talkTimeMinutes: talkMins,
      });
    }

    return result;
  }, [rawCalls]);

  // 100% Dynamic Connection Rate
  const dynamicConnectionRate = useMemo(() => {
    if (!metrics.outgoingCalls) return '0%';
    return `${Math.round((metrics.connectedCalls / metrics.outgoingCalls) * 100)}%`;
  }, [metrics]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* 1. Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
            <BarChart2 size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-dark-900 dark:text-white flex items-center gap-2">
              <span>Insights &amp; Analytics</span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                Live Data
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5">
              Real-time calling conversion, duration velocity, and telephony performance metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-dark-400 font-medium">Last synced: {lastSynced}</span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-200 text-xs font-semibold hover:bg-dark-50 dark:hover:bg-dark-700 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw
              size={13}
              className={refreshing ? 'animate-spin text-blue-600' : 'text-dark-500'}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Card Container */}
      <div className="p-4 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* TEAM Dropdown */}
          <div className="relative">
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1">
              TEAM
            </label>
            <div
              onClick={() => {
                setShowTeamDropdown(!showTeamDropdown);
                setShowStaffDropdown(false);
                setShowPeriodDropdown(false);
              }}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 cursor-pointer shadow-2xs hover:border-dark-300 transition-colors"
            >
              <span className="text-dark-700 dark:text-dark-200 font-medium truncate">
                {selectedTeam}
              </span>
              <ChevronDown size={14} className="text-dark-400" />
            </div>

            {showTeamDropdown && (
              <div className="absolute left-0 mt-2 w-full rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 shadow-2xl z-30 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                {teamsList.map((tm) => (
                  <div
                    key={tm}
                    onClick={() => {
                      setSelectedTeam(tm);
                      setShowTeamDropdown(false);
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer"
                  >
                    <span className="font-semibold text-dark-800 dark:text-dark-200 truncate">
                      {tm}
                    </span>
                    {selectedTeam === tm && <Check size={14} className="text-blue-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STAFF Dropdown */}
          <div className="relative">
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1">
              STAFF
            </label>
            <div
              onClick={() => {
                setShowStaffDropdown(!showStaffDropdown);
                setShowTeamDropdown(false);
                setShowPeriodDropdown(false);
              }}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 cursor-pointer shadow-2xs hover:border-dark-300 transition-colors"
            >
              <span className="text-dark-700 dark:text-dark-200 font-medium truncate">
                {selectedStaff}
              </span>
              <ChevronDown size={14} className="text-dark-400" />
            </div>

            {showStaffDropdown && (
              <div className="absolute left-0 mt-2 w-full rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 shadow-2xl z-30 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                {staffList.map((st) => (
                  <div
                    key={st}
                    onClick={() => {
                      setSelectedStaff(st);
                      setShowStaffDropdown(false);
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer"
                  >
                    <span className="font-semibold text-dark-800 dark:text-dark-200 truncate">
                      {st}
                    </span>
                    {selectedStaff === st && <Check size={14} className="text-blue-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PERIOD Selector */}
          <div className="relative">
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1">
              PERIOD
            </label>
            <div
              onClick={() => {
                setShowPeriodDropdown(!showPeriodDropdown);
                setShowTeamDropdown(false);
                setShowStaffDropdown(false);
              }}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 cursor-pointer shadow-2xs hover:border-dark-300 transition-colors"
            >
              <div className="flex items-center gap-2 text-dark-700 dark:text-dark-200 font-medium truncate">
                <Calendar size={14} className="text-dark-400 shrink-0" />
                <span>{period}</span>
              </div>
              <ChevronDown size={14} className="text-dark-400" />
            </div>

            {showPeriodDropdown && (
              <div className="absolute left-0 mt-2 w-full rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 shadow-2xl z-30 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                {['Today', 'Last 7 Days', 'Last 30 Days', 'This Quarter'].map((p) => (
                  <div
                    key={p}
                    onClick={() => {
                      setPeriod(p);
                      setShowPeriodDropdown(false);
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer"
                  >
                    <span className="font-semibold text-dark-800 dark:text-dark-200">{p}</span>
                    {period === p && <Check size={14} className="text-blue-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Executive KPI Metric Tiles (100% Dynamic) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Connect Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-600 dark:text-dark-400">
              Connection Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
              <PhoneCall size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-3">
            {dynamicConnectionRate}
          </p>
          <div className="mt-3">
            <div className="h-1.5 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: dynamicConnectionRate }}
              ></div>
            </div>
            <span className="text-[10px] text-dark-500 dark:text-dark-400 mt-1 block">
              {metrics.connectedCalls} connected of {metrics.outgoingCalls} calls
            </span>
          </div>
        </div>

        {/* Metric 2: Avg Duration */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-600 dark:text-dark-400">
              Avg Talk Duration
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold">
              <Clock size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-3">
            {metrics.avgOutgoingDuration}
          </p>
          <div className="mt-3">
            <div className="h-1.5 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: metrics.connectedCalls > 0 ? '70%' : '0%' }}
              ></div>
            </div>
            <span className="text-[10px] text-dark-500 dark:text-dark-400 mt-1 block">
              Per answered conversation
            </span>
          </div>
        </div>

        {/* Metric 3: Total Talk Time */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs relative overflow-hidden group hover:border-violet-300 dark:hover:border-violet-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-600 dark:text-dark-400">
              Total Spoken Time
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-600 flex items-center justify-center font-bold">
              <Activity size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-3">
            {metrics.totalTalkTime}
          </p>
          <div className="mt-3">
            <div className="h-1.5 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full"
                style={{ width: metrics.connectedCalls > 0 ? '80%' : '0%' }}
              ></div>
            </div>
            <span className="text-[10px] text-dark-500 dark:text-dark-400 mt-1 block">
              Cumulative call duration
            </span>
          </div>
        </div>

        {/* Metric 4: Missed Call Status */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-600 dark:text-dark-400">
              Missed Calls
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
              <Zap size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-3">
            {metrics.missedCalls}
          </p>
          <div className="mt-3">
            <div className="h-1.5 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: metrics.missedCalls > 0 ? '45%' : '0%' }}
              ></div>
            </div>
            <span className="text-[10px] text-dark-500 dark:text-dark-400 mt-1 block">
              {metrics.missedCalls > 0 ? 'Pending callbacks in queue' : 'Clean queue'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. VISUAL GRAPHS ROW: 100% Dynamic Performance Comparison Bar & Talk Time Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Call Performance Breakdown Bar Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <span>Call Outcomes Breakdown</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  Daily Activity
                </span>
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Outgoing vs Connected vs Missed calls by day
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-500"></span>
              <span className="text-dark-700 dark:text-dark-300">Outgoing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
              <span className="text-dark-700 dark:text-dark-300">Connected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-400"></span>
              <span className="text-dark-700 dark:text-dark-300">Missed</span>
            </div>
          </div>

          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<InsightsChartTooltip />} />
                <Bar dataKey="outgoing" name="Outgoing" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                <Bar dataKey="connected" name="Connected" fill="#10b981" radius={[5, 5, 0, 0]} />
                <Bar dataKey="missed" name="Missed" fill="#f43f5e" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Talk Time Volume Trends Area Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <span>Talk Time Velocity</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                  Minutes Spoken
                </span>
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Total duration of telephony conversations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-violet-500"></span>
              <span className="text-dark-700 dark:text-dark-300">Talk Time (Minutes)</span>
            </div>
          </div>

          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={talkTimeAreaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="insightsViolet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<InsightsChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="talkTimeMinutes"
                  name="Talk Time (Mins)"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#insightsViolet)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Telephony Breakdowns Grid */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-5">
        <h3 className="text-sm font-heading font-bold text-dark-900 dark:text-white">
          Detailed Telephony Breakdowns
        </h3>

        {/* Row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 divide-y lg:divide-y-0 lg:divide-x divide-dark-200 dark:divide-dark-700/60 pt-1">
          <div className="px-4 py-1 first:pl-0">
            <span className="text-xs text-dark-500 font-medium">Outgoing Calls</span>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.outgoingCalls}
            </p>
          </div>
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Incoming Calls</span>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.incomingCalls}
            </p>
          </div>
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Connected Calls</span>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.connectedCalls}
            </p>
          </div>
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Received Calls</span>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-teal-600 dark:text-teal-400 mt-1">
              {metrics.receivedCalls}
            </p>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 divide-y lg:divide-y-0 lg:divide-x divide-dark-200 dark:divide-dark-700/60 pt-4 border-t border-dark-100 dark:border-dark-700/50">
          <div className="px-4 py-1 first:pl-0">
            <span className="text-xs text-dark-500 font-medium">Missed Calls</span>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {metrics.missedCalls}
            </p>
          </div>
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Total Talk Time</span>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-violet-600 dark:text-violet-400 mt-1">
              {metrics.totalTalkTime}
            </p>
          </div>
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Avg Outgoing Duration</span>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.avgOutgoingDuration}
            </p>
          </div>
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Avg Incoming Duration</span>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.avgIncomingDuration}
            </p>
          </div>
        </div>
      </div>

      {/* 6. Dynamic Staff Level Insights Accordion Card */}
      <div className="rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs overflow-hidden transition-all">
        <div
          onClick={() => setShowStaffLevelInsights(!showStaffLevelInsights)}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-dark-50/50 dark:hover:bg-dark-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-heading font-bold text-dark-900 dark:text-white">
              Staff Level Performance &amp; Leaderboard
            </h3>
            <span className="text-xs text-dark-400 font-medium">({staffRows.length} members)</span>
          </div>
          <button className="text-dark-400 hover:text-dark-700 cursor-pointer">
            {showStaffLevelInsights ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
          </button>
        </div>

        {showStaffLevelInsights && (
          <div className="p-5 pt-0 border-t border-dark-100 dark:border-dark-700/60 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700 text-dark-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-2">Staff Member</th>
                  <th className="py-3 px-2">Outgoing</th>
                  <th className="py-3 px-2">Incoming</th>
                  <th className="py-3 px-2">Connected</th>
                  <th className="py-3 px-2">Total Talk Time</th>
                  <th className="py-3 px-2">Avg Duration</th>
                  <th className="py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-700/40">
                {staffRows.map((st) => {
                  const avatarGradients = [
                    'bg-gradient-to-br from-blue-500 to-indigo-600',
                    'bg-gradient-to-br from-emerald-500 to-teal-600',
                    'bg-gradient-to-br from-violet-500 to-purple-600',
                    'bg-gradient-to-br from-amber-500 to-orange-600',
                  ];
                  const grad = avatarGradients[Math.abs(st.name.charCodeAt(0) || 0) % avatarGradients.length];
                  return (
                    <tr key={st.name} className="hover:bg-dark-50/50">
                      <td className="py-3 px-2 font-bold text-dark-900 dark:text-white flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full ${grad} text-white flex items-center justify-center font-bold text-xs shadow-2xs`}
                        >
                          {(st.name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-dark-900 dark:text-white">{st.name}</p>
                          <span className="text-[10px] text-dark-400">{st.phone}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-semibold text-dark-800 dark:text-dark-200">
                        {st.outgoing}
                      </td>
                      <td className="py-3 px-2 font-semibold text-dark-800 dark:text-dark-200">
                        {st.incoming}
                      </td>
                      <td className="py-3 px-2 font-semibold text-emerald-600 dark:text-emerald-400">
                        {st.connected}
                      </td>
                      <td className="py-3 px-2 font-mono text-dark-700 dark:text-dark-300">
                        {st.totalTalkTime}
                      </td>
                      <td className="py-3 px-2 font-mono text-dark-700 dark:text-dark-300">
                        {st.avgDuration}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            st.status === 'Available'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
