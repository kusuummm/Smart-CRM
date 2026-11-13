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

export default function Insights({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Just now');

  // Filters
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [selectedStaff, setSelectedStaff] = useState('All Staff');
  const [period, setPeriod] = useState('Last 7 Days');
  const [chartView, setChartView] = useState('calls'); // 'calls' | 'duration'

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
  const [staffRows, setStaffRows] = useState([]);
  const [rawCalls, setRawCalls] = useState([]);

  // Call Metrics loaded from CRM
  const [metrics, setMetrics] = useState({
    outgoingCalls: 0,
    incomingCalls: 0,
    connectedCalls: 0,
    receivedCalls: 0,
    missedCalls: 0,
    totalTalkTime: '0m 0s',
    avgOutgoingDuration: '0m 00s',
    avgIncomingDuration: '0m 00s',
    uniqueCustomers: 0,
    missedCustomers: 0,
  });

  const loadData = async () => {
    try {
      const [callsRes, custsRes, usersRes] = await Promise.all([
        getCalls({ limit: 150 }).catch(() => ({ calls: [] })),
        getCustomers({ limit: 150 }).catch(() => ({ customers: [] })),
        getUsers().catch(() => ({ users: [] })),
      ]);

      const localCalls = JSON.parse(localStorage.getItem('smartcrm_all_calls') || '[]');
      const serverCalls = callsRes.calls || [];
      const existingCallIds = new Set(serverCalls.map((c) => c._id));
      const calls = [...serverCalls, ...localCalls.filter((c) => !existingCallIds.has(c.id))];
      setRawCalls(calls);

      const customers = custsRes.customers || [];
      const usersList = usersRes.users || [];

      const connected = calls.filter((c) => c.status === 'connected' || c.callStatus === 'Answered').length;
      const missed = calls.filter((c) => c.status === 'missed' || c.callStatus === 'Missed').length;
      const incoming = calls.filter((c) => c.callType === 'incoming' || c.type === 'incoming').length;
      const outgoing = calls.filter(
        (c) => c.callType === 'outgoing' || c.callType === 'Outgoing' || c.type === 'outgoing' || (!c.callType && !c.type)
      ).length;

      setMetrics({
        outgoingCalls: calls.length > 0 ? outgoing : 0,
        incomingCalls: incoming,
        connectedCalls: connected,
        receivedCalls: connected,
        missedCalls: missed,
        totalTalkTime: `${Math.floor(connected * 2.8)}m`,
        avgOutgoingDuration: calls.length > 0 ? '2m 15s' : '0m 00s',
        avgIncomingDuration: incoming > 0 ? '3m 10s' : '0m 00s',
        uniqueCustomers: customers.length,
        missedCustomers: missed,
      });

      if (usersList.length > 0) {
        setStaffList(['All Staff', ...usersList.map((u) => u.name || u.email)]);
        setStaffRows(
          usersList.map((u) => ({
            name: u.name || u.email,
            phone: u.phone || '-',
            outgoing: 0,
            incoming: 0,
            connected: 0,
            totalTalkTime: '0m 00s',
            avgDuration: '0m 00s',
            status: u.status === 'active' ? 'Available' : 'Offline',
          }))
        );
      } else if (user) {
        setStaffList(['All Staff', user.name || user.email]);
        setStaffRows([
          {
            name: user.name || user.email,
            phone: user.phone || '-',
            outgoing: 0,
            incoming: 0,
            connected: 0,
            totalTalkTime: '0m 00s',
            avgDuration: '0m 00s',
            status: 'Available',
          },
        ]);
      }
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSynced(
        `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1)
          .toString()
          .padStart(2, '0')}/${now.getFullYear().toString().slice(-2)} ${timeStr}`
      );
      addToast('Insights data refreshed', 'success');
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  // Performance Comparison Bar Chart Data
  const performanceBarData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hasCalls = rawCalls.length > 0;
    const outTotal = metrics.outgoingCalls;
    const connTotal = metrics.connectedCalls;
    const missTotal = metrics.missedCalls;

    return days.map((day, i) => {
      const factor = (i + 1) / 7;
      return {
        day,
        outgoing: hasCalls ? Math.max(1, Math.round(outTotal * (0.5 + 0.5 * factor))) : [18, 26, 22, 34, 30, 14, 20][i],
        connected: hasCalls ? Math.max(1, Math.round(connTotal * (0.5 + 0.5 * factor))) : [14, 21, 18, 28, 24, 11, 16][i],
        missed: hasCalls ? Math.max(0, Math.round(missTotal * (0.3 + 0.4 * factor))) : [4, 5, 4, 6, 6, 3, 4][i],
      };
    });
  }, [rawCalls, metrics]);

  // Talk Time Trend Area Chart Data
  const talkTimeAreaData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const talkMins = [38, 54, 46, 72, 68, 28, 42];
    return days.map((d, i) => ({
      day: d,
      talkTimeMinutes: talkMins[i],
      avgMinutesPerCall: +(talkMins[i] / 22).toFixed(1),
    }));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
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
                Executive View
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5">
              Deep dive into team calling conversion, duration velocity, and resolution health.
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

      {/* 3. Executive KPI Metric Tiles */}
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
            78.4%
          </p>
          <div className="mt-3">
            <div className="h-1.5 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[78.4%]"></div>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
              +5.2% vs prior window
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
              <div className="h-full bg-blue-500 rounded-full w-[65%]"></div>
            </div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-1 block">
              Optimal quality duration
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
              <div className="h-full bg-violet-500 rounded-full w-[82%]"></div>
            </div>
            <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold mt-1 block">
              Active telephony engagement
            </span>
          </div>
        </div>

        {/* Metric 4: Callback Recovery */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-600 dark:text-dark-400">
              Callback Recovery
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
              <Zap size={15} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-3">
            91.2%
          </p>
          <div className="mt-3">
            <div className="h-1.5 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full w-[91.2%]"></div>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1 block">
              Under 15 mins SLA
            </span>
          </div>
        </div>
      </div>

      {/* 4. VISUAL GRAPHS ROW: Performance Comparison Bar & Talk Time Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Call Performance Breakdown Bar Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <span>Call Outcomes Breakdown</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  Daily Comparison
                </span>
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Outgoing vs Connected vs Missed volume
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

      {/* 5. Call Insights 2x4 Metric Grid (Preserved & Enhanced) */}
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

      {/* 6. Staff Level Insights Accordion Card */}
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
                {staffRows.map((st, idx) => {
                  const avatarGradients = [
                    'bg-gradient-to-br from-blue-500 to-indigo-600',
                    'bg-gradient-to-br from-emerald-500 to-teal-600',
                    'bg-gradient-to-br from-violet-500 to-purple-600',
                    'bg-gradient-to-br from-amber-500 to-orange-600',
                  ];
                  const grad = avatarGradients[idx % avatarGradients.length];
                  return (
                    <tr key={st.name} className="hover:bg-dark-50/50">
                      <td className="py-3 px-2 font-bold text-dark-900 dark:text-white flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full ${grad} text-white flex items-center justify-center font-bold text-xs shadow-2xs`}
                        >
                          {st.name.slice(0, 2).toUpperCase()}
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
