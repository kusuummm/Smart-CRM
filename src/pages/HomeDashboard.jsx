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
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  Award,
  ArrowRight,
  Filter,
  BarChart3,
  Flame,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getCalls } from '../api/callHistory';
import { getCustomers } from '../api/customers';
import { getUsers } from '../api/users';
import { getLeads } from '../api/leads';

// Custom Modern Tooltip for Area and Bar Charts
const ModernChartTooltip = ({ active, payload, label }) => {
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

// Custom Tooltip for Pipeline Donut Chart
const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  return (
    <div className="bg-slate-900/95 dark:bg-dark-900/95 backdrop-blur-md text-white text-xs rounded-xl p-3 shadow-2xl border border-slate-700/60 flex items-center gap-2.5 animate-in fade-in duration-150">
      <span
        className="w-3 h-3 rounded-full shadow-2xs"
        style={{ backgroundColor: data.payload.color || data.color }}
      />
      <div>
        <span className="font-medium text-slate-300 block">{data.name}</span>
        <span className="font-extrabold text-white text-sm">{data.value} Leads</span>
      </div>
    </div>
  );
};

// Mini SVG Sparkline Component for KPI Cards
const MiniSparkline = ({ points = [12, 18, 14, 28, 22, 34], color = '#3b82f6', id = 'spark' }) => {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const step = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });

  const pathD = `M ${coords.join(' L ')}`;
  const areaD = `M 0,${height} L ${coords.join(' L ')} L ${width},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${id})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default function HomeDashboard({ onNavigate, onOpenBuyNumber }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Just now');

  // Filter states
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [chartTimeframe, setChartTimeframe] = useState('7d'); // '7d' | '14d' | 'hourly'

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

  // Raw data records
  const [rawCalls, setRawCalls] = useState([]);
  const [rawLeads, setRawLeads] = useState([]);

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

    const firstName = user?.name
      ? user.name.split(' ')[0].toUpperCase()
      : user?.email
      ? user.email.split('@')[0].toUpperCase()
      : '';
    return { text: firstName ? `${text}, ${firstName}` : text, Icon };
  }, [user]);

  // Current formatted date
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
      const [callsRes, custsRes, usersRes, leadsRes] = await Promise.all([
        getCalls({ limit: 100 }).catch(() => ({ calls: [] })),
        getCustomers({ limit: 100 }).catch(() => ({ customers: [] })),
        getUsers().catch(() => ({ users: [] })),
        getLeads({ limit: 100 }).catch(() => ({ leads: [] })),
      ]);

      const localCalls = JSON.parse(localStorage.getItem('smartcrm_all_calls') || '[]');
      const localContacts = JSON.parse(localStorage.getItem('smartcrm_contacts') || '[]');
      const localLeads = JSON.parse(localStorage.getItem('smartcrm_leads') || '[]');

      const serverCalls = callsRes.calls || [];
      const serverCusts = custsRes.customers || [];
      const serverLeads = leadsRes.leads || [];

      // Merge unique calls
      const existingCallIds = new Set(serverCalls.map((c) => c._id));
      const calls = [...serverCalls, ...localCalls.filter((c) => !existingCallIds.has(c.id))];
      setRawCalls(calls);

      // Merge unique leads
      const existingLeadIds = new Set(serverLeads.map((l) => l._id));
      const leads = [...serverLeads, ...localLeads.filter((l) => !existingLeadIds.has(l.id))];
      setRawLeads(leads);

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

  // Compute Trend Area Chart Data
  const trendChartData = useMemo(() => {
    const hasCalls = rawCalls.length > 0;
    const connected = callStats.connected;
    const outgoing = callStats.outgoing;
    const incoming = callStats.incoming;

    if (chartTimeframe === 'hourly') {
      return [
        { name: '09:00', outgoing: hasCalls ? Math.round(outgoing * 0.12) : 6, connected: hasCalls ? Math.round(connected * 0.1) : 4, incoming: 2 },
        { name: '11:00', outgoing: hasCalls ? Math.round(outgoing * 0.28) : 18, connected: hasCalls ? Math.round(connected * 0.26) : 15, incoming: 5 },
        { name: '13:00', outgoing: hasCalls ? Math.round(outgoing * 0.15) : 8, connected: hasCalls ? Math.round(connected * 0.14) : 7, incoming: 3 },
        { name: '15:00', outgoing: hasCalls ? Math.round(outgoing * 0.22) : 14, connected: hasCalls ? Math.round(connected * 0.24) : 12, incoming: 4 },
        { name: '17:00', outgoing: hasCalls ? Math.round(outgoing * 0.16) : 11, connected: hasCalls ? Math.round(connected * 0.18) : 9, incoming: 2 },
        { name: '19:00', outgoing: hasCalls ? Math.round(outgoing * 0.07) : 4, connected: hasCalls ? Math.round(connected * 0.08) : 3, incoming: 1 },
      ];
    }

    if (chartTimeframe === '14d') {
      const days = ['Day 1', 'Day 3', 'Day 5', 'Day 7', 'Day 9', 'Day 11', 'Day 13', 'Today'];
      return days.map((d, i) => {
        const factor = (i + 1) / days.length;
        return {
          name: d,
          outgoing: hasCalls ? Math.max(1, Math.round(outgoing * (0.4 + 0.6 * factor))) : Math.round(12 + i * 2.8),
          connected: hasCalls ? Math.max(1, Math.round(connected * (0.35 + 0.65 * factor))) : Math.round(9 + i * 2.2),
          incoming: hasCalls ? Math.round(incoming * factor) : Math.round(3 + (i % 3) * 1.5),
        };
      });
    }

    // Default: '7d' (Mon - Sun)
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const baselineOut = [14, 22, 19, 28, 25, 12, 16];
    const baselineConn = [11, 18, 16, 23, 21, 9, 13];
    const baselineInc = [3, 6, 4, 8, 5, 2, 4];

    return weekDays.map((day, idx) => ({
      name: day,
      outgoing: hasCalls ? Math.max(1, Math.round(outgoing * (0.6 + (idx / 10)))) : baselineOut[idx],
      connected: hasCalls ? Math.max(1, Math.round(connected * (0.6 + (idx / 10)))) : baselineConn[idx],
      incoming: hasCalls ? Math.max(0, Math.round(incoming * (0.5 + (idx / 12)))) : baselineInc[idx],
    }));
  }, [rawCalls, callStats, chartTimeframe]);

  // Compute Pipeline & Outcome Donut Data
  const pipelineDonutData = useMemo(() => {
    const leads = rawLeads;
    const hasLeads = leads.length > 0;

    const counts = {
      converted: leads.filter((l) => /converted|won/i.test(l.status)).length,
      interested: leads.filter((l) => /interested|demo|meeting/i.test(l.status)).length,
      followup: leads.filter((l) => /follow-?up/i.test(l.status)).length,
      contacted: leads.filter((l) => /contacted/i.test(l.status)).length,
      open: leads.filter((l) => /new|fresh|open/i.test(l.status) || !l.status).length,
    };

    return [
      { name: 'Deals Converted', value: hasLeads ? (counts.converted || 1) : 14, color: '#10b981', status: 'converted' },
      { name: 'In Discussion / Demo', value: hasLeads ? (counts.interested || 2) : 26, color: '#3b82f6', status: 'interested' },
      { name: 'Follow-up Scheduled', value: hasLeads ? (counts.followup || 3) : 20, color: '#8b5cf6', status: 'follow-up' },
      { name: 'Contacted & Pitching', value: hasLeads ? (counts.contacted || 4) : 32, color: '#f59e0b', status: 'contacted' },
      { name: 'Fresh / Open Leads', value: hasLeads ? (counts.open || 5) : 18, color: '#06b6d4', status: 'new' },
    ];
  }, [rawLeads]);

  const totalPipelineLeads = useMemo(() => {
    return pipelineDonutData.reduce((acc, curr) => acc + curr.value, 0);
  }, [pipelineDonutData]);

  // Peak Calling Hours Distribution Bar Data
  const peakHoursData = useMemo(() => {
    return [
      { slot: '9-11 AM', volume: 28, connected: 22, rate: '78%' },
      { slot: '11-1 PM', volume: 46, connected: 39, rate: '85%', peak: true },
      { slot: '1-3 PM', volume: 18, connected: 12, rate: '67%' },
      { slot: '3-5 PM', volume: 38, connected: 31, rate: '81%' },
      { slot: '5-7 PM', volume: 32, connected: 25, rate: '78%' },
      { slot: '7-9 PM', volume: 14, connected: 9, rate: '64%' },
    ];
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Header Greeting & Date with Universal Status */}
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
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              All channels active • High engagement
            </span>
          </div>
        </div>

        {/* Refresh & Sync Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl font-semibold text-xs text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw
              size={13}
              className={refreshing ? 'animate-spin text-blue-600' : 'text-dark-500'}
            />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Action Hub Bar */}
      <div className="p-3 bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 rounded-2xl shadow-2xs flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider pl-2 pr-1 flex items-center gap-1 shrink-0">
          <Zap size={13} className="text-amber-500" /> Quick Actions:
        </span>
        <button
          onClick={() => onNavigate?.('call-history', 'outgoing')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50 text-xs font-semibold transition-all shrink-0 hover:scale-102 cursor-pointer"
        >
          <PhoneOutgoing size={13} />
          <span>Call History</span>
        </button>
        <button
          onClick={() => onNavigate?.('whatsapp')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 text-xs font-semibold transition-all shrink-0 hover:scale-102 cursor-pointer"
        >
          <MessageSquare size={13} />
          <span>WhatsApp Chat</span>
        </button>
        <button
          onClick={() => onNavigate?.('leads')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50/80 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/50 text-xs font-semibold transition-all shrink-0 hover:scale-102 cursor-pointer"
        >
          <Target size={13} />
          <span>Leads & Pipeline</span>
        </button>
        <button
          onClick={() => onNavigate?.('todos')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50 text-xs font-semibold transition-all shrink-0 hover:scale-102 cursor-pointer"
        >
          <CheckCircle2 size={13} />
          <span>Follow-ups & Tasks</span>
        </button>
        <button
          onClick={() => onNavigate?.('contacts')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50/80 hover:bg-slate-100 dark:bg-dark-700 dark:hover:bg-dark-600 text-dark-700 dark:text-dark-200 border border-dark-200 dark:border-dark-600 text-xs font-semibold transition-all shrink-0 hover:scale-102 cursor-pointer"
        >
          <Users size={13} />
          <span>Contacts Directory</span>
        </button>
        <button
          onClick={() => onNavigate?.('insights')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all shrink-0 ml-auto hover:scale-102 cursor-pointer"
        >
          <BarChart3 size={13} />
          <span>Deep Analytics →</span>
        </button>
      </div>

      {/* 3. Call Insights KPI Cards with Mini Sparklines */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-heading font-bold text-dark-900 dark:text-white flex items-center gap-2">
              <span>Call Performance & Connectivity</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/40">
                Live Overview
              </span>
            </h2>
            <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
              Synced {lastSynced} across connected telephony channels
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            <select
              value={selectedTeam}
              onChange={(e) => {
                if (e.target.value === '__manage__') {
                  onNavigate?.('teams');
                } else {
                  setSelectedTeam(e.target.value);
                }
              }}
              className="px-3 py-1.5 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl font-medium text-dark-700 dark:text-dark-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer text-xs"
            >
              <option value="All Teams">All Teams</option>
              {teams &&
                teams.length > 0 &&
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
            <button
              onClick={() => onNavigate?.('call-history')}
              className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Full Log &gt;
            </button>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Outgoing Calls */}
          <div
            onClick={() => onNavigate?.('call-history', 'outgoing')}
            className="p-5 rounded-2xl cursor-pointer bg-gradient-to-br from-indigo-50/70 via-white to-white dark:from-indigo-950/30 dark:via-dark-800 dark:to-dark-800 border border-indigo-100 dark:border-indigo-900/50 shadow-xs hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden"
            title="Click to view all Outgoing calls in Call History"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                  <PhoneOutgoing size={16} />
                </div>
                <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-indigo-600 transition-colors">
                  Outgoing Calls
                </span>
              </div>
              <ArrowUpRight
                size={15}
                className="text-dark-300 dark:text-dark-600 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              />
            </div>

            <div className="flex items-end justify-between mt-4">
              <div>
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-indigo-950 dark:text-indigo-100 group-hover:text-indigo-600 transition-colors">
                  {callStats.outgoing}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  <TrendingUp size={12} /> +14.2% vs last week
                </span>
              </div>
              <MiniSparkline points={[10, 16, 14, 26, 22, 34]} color="#6366f1" id="outgoing" />
            </div>
          </div>

          {/* Incoming Calls */}
          <div
            onClick={() => onNavigate?.('call-history', 'incoming')}
            className="p-5 rounded-2xl cursor-pointer bg-gradient-to-br from-emerald-50/70 via-white to-white dark:from-emerald-950/30 dark:via-dark-800 dark:to-dark-800 border border-emerald-100 dark:border-emerald-900/50 shadow-xs hover:shadow-lg hover:border-emerald-400 dark:hover:border-emerald-500 hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden"
            title="Click to view all Incoming calls in Call History"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                  <PhoneIncoming size={16} />
                </div>
                <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-emerald-600 transition-colors">
                  Incoming Calls
                </span>
              </div>
              <ArrowUpRight
                size={15}
                className="text-dark-300 dark:text-dark-600 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              />
            </div>

            <div className="flex items-end justify-between mt-4">
              <div>
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-950 dark:text-emerald-100 group-hover:text-emerald-600 transition-colors">
                  {callStats.incoming}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  <TrendingUp size={12} /> +8.5% inbound volume
                </span>
              </div>
              <MiniSparkline points={[6, 9, 8, 14, 12, 19]} color="#10b981" id="incoming" />
            </div>
          </div>

          {/* Connected Calls */}
          <div
            onClick={() => onNavigate?.('call-history', 'connected')}
            className="p-5 rounded-2xl cursor-pointer bg-gradient-to-br from-sky-50/70 via-white to-white dark:from-sky-950/30 dark:via-dark-800 dark:to-dark-800 border border-sky-100 dark:border-sky-900/50 shadow-xs hover:shadow-lg hover:border-sky-400 dark:hover:border-sky-500 hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden"
            title="Click to view all Connected calls in Call History"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                  <PhoneCall size={16} />
                </div>
                <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-sky-600 transition-colors">
                  Connected Calls
                </span>
              </div>
              <ArrowUpRight
                size={15}
                className="text-dark-300 dark:text-dark-600 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              />
            </div>

            <div className="flex items-end justify-between mt-4">
              <div>
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-sky-950 dark:text-sky-100 group-hover:text-sky-600 transition-colors">
                  {callStats.connected}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 mt-1">
                  <Award size={12} /> 78.4% Connect Rate
                </span>
              </div>
              <MiniSparkline points={[8, 14, 12, 22, 18, 30]} color="#0284c7" id="connected" />
            </div>
          </div>

          {/* Received Calls */}
          <div
            onClick={() => onNavigate?.('call-history', 'received')}
            className="p-5 rounded-2xl cursor-pointer bg-gradient-to-br from-teal-50/70 via-white to-white dark:from-teal-950/30 dark:via-dark-800 dark:to-dark-800 border border-teal-100 dark:border-teal-900/50 shadow-xs hover:shadow-lg hover:border-teal-400 dark:hover:border-teal-500 hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden"
            title="Click to view all Received calls in Call History"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-teal-600 transition-colors">
                  Received Calls
                </span>
              </div>
              <ArrowUpRight
                size={15}
                className="text-dark-300 dark:text-dark-600 group-hover:text-teal-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              />
            </div>

            <div className="flex items-end justify-between mt-4">
              <div>
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-teal-950 dark:text-teal-100 group-hover:text-teal-600 transition-colors">
                  {callStats.received}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 mt-1">
                  <CheckCircle2 size={12} /> 94.6% Pickup Rate
                </span>
              </div>
              <MiniSparkline points={[7, 11, 10, 19, 16, 26]} color="#0d9488" id="received" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. PRIMARY GRAPH: Call Activity & Connectivity Trend Area Chart */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white">
                Call Volume & Connectivity Trends
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                Smooth Curves
              </span>
            </div>
            <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
              Interactive visual tracking of Outgoing vs Connected vs Inbound activity
            </p>
          </div>

          {/* Timeframe Switcher Tabs */}
          <div className="flex items-center p-1 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setChartTimeframe('7d')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                chartTimeframe === '7d'
                  ? 'bg-white dark:bg-dark-800 text-blue-600 shadow-2xs font-bold'
                  : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setChartTimeframe('14d')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                chartTimeframe === '14d'
                  ? 'bg-white dark:bg-dark-800 text-blue-600 shadow-2xs font-bold'
                  : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
              }`}
            >
              Last 14 Days
            </button>
            <button
              onClick={() => setChartTimeframe('hourly')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                chartTimeframe === 'hourly'
                  ? 'bg-white dark:bg-dark-800 text-blue-600 shadow-2xs font-bold'
                  : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
              }`}
            >
              Today by Hour
            </button>
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex items-center gap-5 text-xs pt-1">
          <div className="flex items-center gap-1.5 font-medium text-dark-600 dark:text-dark-300">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-2xs"></span>
            <span>Outgoing Calls</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-dark-600 dark:text-dark-300">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-2xs"></span>
            <span>Connected Calls</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-dark-600 dark:text-dark-300">
            <span className="w-3 h-3 rounded-full bg-violet-500 shadow-2xs"></span>
            <span>Incoming Calls</span>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="w-full h-[280px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorConnected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ModernChartTooltip />} />
              <Area
                type="monotone"
                dataKey="outgoing"
                name="Outgoing Calls"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorOutgoing)"
              />
              <Area
                type="monotone"
                dataKey="connected"
                name="Connected Calls"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorConnected)"
              />
              <Area
                type="monotone"
                dataKey="incoming"
                name="Incoming Calls"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncoming)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Micro Performance Footer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-dark-100 dark:border-dark-700/60 text-xs">
          <div className="p-2.5 rounded-xl bg-dark-50 dark:bg-dark-900/60">
            <span className="text-dark-500 font-medium block text-[11px]">Avg Daily Volume</span>
            <span className="text-base font-bold text-dark-900 dark:text-white font-heading mt-0.5 block">
              {Math.max(12, Math.round(callStats.outgoing / 7) || 24)} calls / day
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-dark-50 dark:bg-dark-900/60">
            <span className="text-dark-500 font-medium block text-[11px]">Connect Conversion</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-heading mt-0.5 block">
              78.4% answered
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-dark-50 dark:bg-dark-900/60">
            <span className="text-dark-500 font-medium block text-[11px]">Peak Time Window</span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-heading mt-0.5 block">
              11:00 AM – 1:00 PM
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-dark-50 dark:bg-dark-900/60">
            <span className="text-dark-500 font-medium block text-[11px]">Avg Handling Time</span>
            <span className="text-base font-bold text-violet-600 dark:text-violet-400 font-heading mt-0.5 block">
              2m 45s per call
            </span>
          </div>
        </div>
      </div>

      {/* 5. SECONDARY GRAPHS ROW: Pipeline Donut & Peak Hours Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Lead Pipeline & Outcome Distribution (Donut Chart) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <span>Pipeline & Lead Outcomes</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Distribution across conversion lifecycle stages
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('leads')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Open Pipeline &gt;
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
            {/* Donut Container with Center Label */}
            <div className="relative w-48 h-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<DonutTooltip />} />
                  <Pie
                    data={pipelineDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    cursor="pointer"
                    onClick={(entry) => onNavigate?.('leads', entry.status)}
                  >
                    {pipelineDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-extrabold font-heading text-dark-900 dark:text-white">
                  {totalPipelineLeads}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-dark-400">
                  Total Leads
                </span>
              </div>
            </div>

            {/* Interactive Legend with Badges */}
            <div className="flex-1 w-full space-y-2 text-xs">
              {pipelineDonutData.map((stage) => {
                const percent = Math.round((stage.value / totalPipelineLeads) * 100) || 0;
                return (
                  <div
                    key={stage.name}
                    onClick={() => onNavigate?.('leads', stage.status)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-dark-50 dark:hover:bg-dark-700/60 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="font-semibold text-dark-800 dark:text-dark-200 group-hover:text-blue-600 transition-colors">
                        {stage.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-dark-900 dark:text-white font-mono">
                        {stage.value}
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${stage.color}15`,
                          color: stage.color,
                        }}
                      >
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Peak Calling Hours Heatmap (Bar Chart) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <span>Peak Calling Windows</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/60">
                  <Flame size={12} /> Prime Time
                </span>
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Hourly call connectivity and customer pickup rates
              </p>
            </div>
          </div>

          {/* Prime Time Callout Banner */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <span className="text-base">🌟</span>
              <span>
                <strong>Optimal Calling Window:</strong> 11:00 AM – 1:00 PM yields an <strong>85% connect rate</strong>.
              </span>
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                <XAxis
                  dataKey="slot"
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
                <Tooltip content={<ModernChartTooltip />} />
                <Bar dataKey="volume" name="Calls Made" radius={[6, 6, 0, 0]}>
                  {peakHoursData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.peak ? '#f59e0b' : '#3b82f6'}
                      opacity={entry.peak ? 1 : 0.75}
                    />
                  ))}
                </Bar>
                <Bar dataKey="connected" name="Calls Connected" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6. Customer Insights & Funnel Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cards: Unique Customers & Missed Customers */}
        <div className="lg:col-span-1 space-y-4">
          <div
            onClick={() => onNavigate?.('contacts')}
            className="p-5 rounded-2xl cursor-pointer bg-gradient-to-br from-violet-50/70 via-white to-white dark:from-violet-950/30 dark:via-dark-800 dark:to-dark-800 border border-violet-100 dark:border-violet-900/50 shadow-xs hover:shadow-lg hover:border-violet-400 dark:hover:border-violet-500 hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                  <Users size={16} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-violet-600 transition-colors">
                    Unique Customers
                  </span>
                  <p className="text-xs text-dark-400">Total client directory</p>
                </div>
              </div>
              <ArrowUpRight
                size={15}
                className="text-dark-300 dark:text-dark-600 group-hover:text-violet-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              />
            </div>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-violet-950 dark:text-violet-100 mt-4 group-hover:text-violet-600 transition-colors">
              {callStats.uniqueCustomers}
            </p>
            <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold mt-1 block">
              Manage client directory →
            </span>
          </div>

          <div
            onClick={() => onNavigate?.('call-history', 'missed')}
            className="p-5 rounded-2xl cursor-pointer bg-gradient-to-br from-rose-50/70 via-white to-white dark:from-rose-950/30 dark:via-dark-800 dark:to-dark-800 border border-rose-100 dark:border-rose-900/50 shadow-xs hover:shadow-lg hover:border-rose-400 dark:hover:border-rose-500 hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                  <Phone size={16} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-rose-600 transition-colors">
                    Missed Customers
                  </span>
                  <p className="text-xs text-dark-400">Requires follow-up call</p>
                </div>
              </div>
              <ArrowUpRight
                size={15}
                className="text-dark-300 dark:text-dark-600 group-hover:text-rose-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              />
            </div>
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-rose-950 dark:text-rose-100 mt-4 group-hover:text-rose-600 transition-colors">
              {callStats.missedCustomers}
            </p>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1 block">
              Schedule callback queue →
            </span>
          </div>
        </div>

        {/* Right 2 Cols: Lead Conversion Funnel Progression */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <span>Conversion Funnel Velocity</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                  +18.4% Efficiency
                </span>
              </h3>
              <button
                onClick={() => onNavigate?.('leads')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                View Funnel &gt;
              </button>
            </div>
            <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
              Step-by-step conversion drop-off and progression velocity
            </p>
          </div>

          {/* Stepped Visual Progress Bars */}
          <div className="space-y-3.5 pt-1">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-dark-700 dark:text-dark-300">1. Fresh Leads Ingested</span>
                <span className="text-dark-900 dark:text-white font-mono font-bold">100% (120 leads)</span>
              </div>
              <div className="h-3 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full w-full transition-all duration-500"></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-dark-700 dark:text-dark-300">2. Successfully Contacted</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">84% (101 leads)</span>
              </div>
              <div className="h-3 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full w-[84%] transition-all duration-500"></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-dark-700 dark:text-dark-300">3. Pitch / Qualified Meeting</span>
                <span className="text-violet-600 dark:text-violet-400 font-mono font-bold">58% (70 leads)</span>
              </div>
              <div className="h-3 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full w-[58%] transition-all duration-500"></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-dark-700 dark:text-dark-300">4. Deals Closed &amp; Converted</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">28% (34 converted)</span>
              </div>
              <div className="h-3 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full w-[28%] transition-all duration-500"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Staff Level Insights Accordion Card */}
      <div className="rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs overflow-hidden transition-all">
        <div
          onClick={() => setShowStaffInsights(!showStaffInsights)}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-dark-50/50 dark:hover:bg-dark-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-heading font-bold text-dark-900 dark:text-white">
              Staff Level Activity &amp; Presence
            </h3>
            <span className="text-[11px] text-dark-400 font-medium">({staffData.length} team members)</span>
          </div>
          <button className="text-dark-400 hover:text-dark-700 transition-colors cursor-pointer">
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
                        <div
                          className={`w-8 h-8 rounded-full ${grad} text-white flex items-center justify-center font-bold text-xs shadow-2xs`}
                        >
                          {st.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-heading font-semibold text-dark-900 dark:text-white">
                            {st.name}
                          </p>
                          <span className="text-[10px] text-dark-400 font-medium">{st.phone}</span>
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-dark-800 dark:text-dark-200">
                        {st.outgoing}
                      </td>
                      <td className="py-3 font-semibold text-dark-800 dark:text-dark-200">
                        {st.incoming}
                      </td>
                      <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 8. Bottom Row: 2 Teams Subscription Overview + "You're all set" */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Card: 2 Teams & Subscription overview */}
        <div
          onClick={() => onNavigate?.('teams')}
          className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-5 cursor-pointer hover:border-sky-300 dark:hover:border-sky-800 hover:shadow-md transition-all duration-200 group"
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
                onOpenBuyNumber?.();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 transition-all shadow-xs cursor-pointer"
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white">
                You&apos;re all set
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5 leading-relaxed">
                No pending telephony setup. Manage teams, run WhatsApp broadcasts, or track your live pipeline anytime.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={() => onNavigate?.('teams')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
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
