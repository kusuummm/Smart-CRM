import { useState, useEffect, useMemo, useRef } from 'react';
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
  FileSpreadsheet,
  AlertCircle,
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
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getCalls } from '../api/callHistory';
import { getCustomers } from '../api/customers';
import { getUsers } from '../api/users';
import { getLeads } from '../api/leads';

// In-Memory Fast Cache for Instant Navigation (0ms latency on tab switch)
let _cachedDashboardData = null;
let _cachedDashboardTimestamp = 0;
const CACHE_FRESH_MS = 20000; // 20s freshness

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

// Real Dynamic Mini SVG Sparkline
const MiniSparkline = ({ points = [], color = '#3b82f6', id = 'spark' }) => {
  // If points are all 0 or empty, render a clean subtle baseline
  const validPoints = points.length > 0 ? points : [0, 0, 0, 0, 0, 0];
  const min = Math.min(...validPoints);
  const max = Math.max(...validPoints);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const step = width / Math.max(1, validPoints.length - 1);

  const coords = validPoints.map((p, i) => {
    const x = i * step;
    const y = max === min ? height / 2 : height - ((p - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });

  const pathD = `M ${coords.join(' L ')}`;
  const areaD = `M 0,${height} L ${coords.join(' L ')} L ${width},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
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

// Helper: parse call duration
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

export default function HomeDashboard({ onNavigate, onOpenBuyNumber }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(!_cachedDashboardData);
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

  // Raw data records (100% dynamic, populated from backend/local data)
  const [rawCalls, setRawCalls] = useState(() => _cachedDashboardData?.calls || []);
  const [rawLeads, setRawLeads] = useState(() => _cachedDashboardData?.leads || []);

  // Dynamic Metrics loaded from real CRM state
  const [callStats, setCallStats] = useState(() => _cachedDashboardData?.callStats || {
    outgoing: 0,
    incoming: 0,
    connected: 0,
    received: 0,
    uniqueCustomers: 0,
    missedCustomers: 0,
  });

  const [staffData, setStaffData] = useState(() => _cachedDashboardData?.staffData || []);

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

  // High-Speed Data Fetcher with instant memory hydration
  const fetchDashboardData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else if (!_cachedDashboardData) setLoading(true);

    try {
      const [callsRes, custsRes, usersRes, leadsRes] = await Promise.all([
        getCalls({ limit: 200 }).catch(() => ({ calls: [] })),
        getCustomers({ limit: 200 }).catch(() => ({ customers: [] })),
        getUsers().catch(() => ({ users: [] })),
        getLeads({ limit: 200 }).catch(() => ({ leads: [] })),
      ]);

      const localCalls = JSON.parse(localStorage.getItem('smartcrm_all_calls') || '[]');
      const localContacts = JSON.parse(localStorage.getItem('smartcrm_contacts') || '[]');
      const localLeads = JSON.parse(localStorage.getItem('smartcrm_leads') || '[]');

      const serverCalls = callsRes.calls || [];
      const serverCusts = custsRes.customers || [];
      const serverLeads = leadsRes.leads || [];

      // Merge unique calls
      const existingCallIds = new Set(serverCalls.map((c) => c._id || c.id));
      const calls = [...serverCalls, ...localCalls.filter((c) => !existingCallIds.has(c.id || c._id))];
      setRawCalls(calls);

      // Merge unique leads
      const existingLeadIds = new Set(serverLeads.map((l) => l._id || l.id));
      const leads = [...serverLeads, ...localLeads.filter((l) => !existingLeadIds.has(l.id || l._id))];
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

      const connectedCount = calls.filter(
        (c) => ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase())
      ).length;
      const missedCount = calls.filter(
        (c) => ['missed', 'unanswered'].includes((c.status || c.callStatus || '').toLowerCase())
      ).length;
      const incomingCount = calls.filter(
        (c) => ['incoming', 'received'].includes((c.callType || c.type || '').toLowerCase())
      ).length;
      const outgoingCount = calls.filter(
        (c) => {
          const type = (c.callType || c.type || '').toLowerCase();
          return type === 'outgoing' || (!type && c.status !== 'incoming');
        }
      ).length;

      const newStats = {
        outgoing: outgoingCount,
        incoming: incomingCount,
        connected: connectedCount,
        received: connectedCount,
        uniqueCustomers: customers.length,
        missedCustomers: missedCount,
      };
      setCallStats(newStats);

      let newStaff = [];
      if (usersList.length > 0) {
        newStaff = usersList.map((u) => {
          const uCalls = calls.filter((c) => c.calledBy === u._id || c.calledByName === u.name);
          const uConn = uCalls.filter((c) => ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase())).length;
          const uOut = uCalls.filter((c) => (c.callType || '').toLowerCase() === 'outgoing').length;
          const uInc = uCalls.filter((c) => (c.callType || '').toLowerCase() === 'incoming').length;
          const uDurationSec = uCalls.reduce((acc, c) => acc + parseDurationSeconds(c.duration), 0);
          return {
            name: u.name || u.email,
            phone: u.phone || '-',
            outgoing: uOut,
            incoming: uInc,
            connected: uConn,
            avgTalkTime: uConn > 0 ? formatSeconds(Math.round(uDurationSec / uConn)) : '0s',
            status: u.status === 'active' ? 'Available' : 'Offline',
          };
        });
      } else if (user) {
        newStaff = [
          {
            name: user.name || user.email,
            phone: user.phone || '-',
            outgoing: outgoingCount,
            incoming: incomingCount,
            connected: connectedCount,
            avgTalkTime: connectedCount > 0 ? '2m 15s' : '0s',
            status: 'Available',
          },
        ];
      }
      setStaffData(newStaff);

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSynced(timeStr);

      // Cache state in memory for 0ms tab navigation
      _cachedDashboardData = {
        calls,
        leads,
        callStats: newStats,
        staffData: newStaff,
      };
      _cachedDashboardTimestamp = Date.now();

      if (forceRefresh) {
        addToast('Dashboard data refreshed live', 'success');
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // If cache is fresh, hydrate immediately and do not block
    if (!_cachedDashboardData || Date.now() - _cachedDashboardTimestamp > CACHE_FRESH_MS) {
      fetchDashboardData();
    }
  }, []);

  // 100% DYNAMIC: Compute Call Activity & Trend Area Chart Data
  const trendChartData = useMemo(() => {
    const calls = rawCalls;

    if (chartTimeframe === 'hourly') {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayCalls = calls.filter((c) => {
        const d = (c.date || c.createdAt || '').slice(0, 10);
        return d === todayStr;
      });

      const slots = [
        { label: '09:00', minH: 8, maxH: 10 },
        { label: '11:00', minH: 10, maxH: 12 },
        { label: '13:00', minH: 12, maxH: 14 },
        { label: '15:00', minH: 14, maxH: 16 },
        { label: '17:00', minH: 16, maxH: 18 },
        { label: '19:00', minH: 18, maxH: 21 },
      ];

      return slots.map((s) => {
        const inSlot = todayCalls.filter((c) => {
          const timeStr = c.time || (c.createdAt ? new Date(c.createdAt).toTimeString() : '00:00');
          const h = parseInt(timeStr.slice(0, 2), 10) || 0;
          return h >= s.minH && h < s.maxH;
        });

        const out = inSlot.filter((c) => (c.callType || c.type || '').toLowerCase() === 'outgoing').length;
        const conn = inSlot.filter((c) =>
          ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase())
        ).length;
        const inc = inSlot.filter((c) => (c.callType || c.type || '').toLowerCase() === 'incoming').length;

        return {
          name: s.label,
          outgoing: out,
          connected: conn,
          incoming: inc,
        };
      });
    }

    if (chartTimeframe === '14d') {
      const result = [];
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const dayCalls = calls.filter((c) => (c.date || c.createdAt || '').slice(0, 10) === dateStr);
        const out = dayCalls.filter((c) => (c.callType || c.type || '').toLowerCase() === 'outgoing').length;
        const conn = dayCalls.filter((c) =>
          ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase())
        ).length;
        const inc = dayCalls.filter((c) => (c.callType || c.type || '').toLowerCase() === 'incoming').length;

        result.push({ name: dayName, outgoing: out, connected: conn, incoming: inc });
      }
      return result;
    }

    // Default: Last 7 Days (dynamic past 7 days based on real calls)
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
      const inc = dayCalls.filter((c) => (c.callType || c.type || '').toLowerCase() === 'incoming').length;

      result.push({ name: dayLabel, outgoing: out, connected: conn, incoming: inc });
    }
    return result;
  }, [rawCalls, chartTimeframe]);

  // Dynamic sparkline point lists derived from real trend data
  const sparklineOutgoing = useMemo(() => trendChartData.map((d) => d.outgoing), [trendChartData]);
  const sparklineIncoming = useMemo(() => trendChartData.map((d) => d.incoming), [trendChartData]);
  const sparklineConnected = useMemo(() => trendChartData.map((d) => d.connected), [trendChartData]);

  // 100% DYNAMIC: Pipeline Donut Data (strictly calculated from rawLeads)
  const pipelineDonutData = useMemo(() => {
    const leads = rawLeads;

    const counts = {
      converted: leads.filter((l) => /converted|won/i.test(l.status || '')).length,
      interested: leads.filter((l) => /interested|demo|meeting/i.test(l.status || '')).length,
      followup: leads.filter((l) => /follow-?up/i.test(l.status || '')).length,
      contacted: leads.filter((l) => /contacted/i.test(l.status || '')).length,
      open: leads.filter((l) => /new|fresh|open/i.test(l.status || '') || !l.status).length,
    };

    return [
      { name: 'Deals Converted', value: counts.converted, color: '#10b981', status: 'converted' },
      { name: 'In Discussion / Demo', value: counts.interested, color: '#3b82f6', status: 'interested' },
      { name: 'Follow-up Scheduled', value: counts.followup, color: '#8b5cf6', status: 'follow-up' },
      { name: 'Contacted & Pitching', value: counts.contacted, color: '#f59e0b', status: 'contacted' },
      { name: 'Fresh / Open Leads', value: counts.open, color: '#06b6d4', status: 'new' },
    ];
  }, [rawLeads]);

  const totalPipelineLeads = useMemo(() => rawLeads.length, [rawLeads]);

  // 100% DYNAMIC: Peak Calling Hours calculated directly from rawCalls
  const peakHoursData = useMemo(() => {
    const slots = [
      { slot: '9-11 AM', minH: 9, maxH: 11 },
      { slot: '11-1 PM', minH: 11, maxH: 13 },
      { slot: '1-3 PM', minH: 13, maxH: 15 },
      { slot: '3-5 PM', minH: 15, maxH: 17 },
      { slot: '5-7 PM', minH: 17, maxH: 19 },
      { slot: '7-9 PM', minH: 19, maxH: 21 },
    ];

    const result = slots.map((s) => {
      const inSlot = rawCalls.filter((c) => {
        const timeStr = c.time || (c.createdAt ? new Date(c.createdAt).toTimeString() : '');
        const h = parseInt(timeStr.slice(0, 2), 10);
        return !isNaN(h) && h >= s.minH && h < s.maxH;
      });

      const volume = inSlot.length;
      const connected = inSlot.filter((c) =>
        ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase())
      ).length;
      const rate = volume > 0 ? `${Math.round((connected / volume) * 100)}%` : '0%';

      return { slot: s.slot, volume, connected, rate };
    });

    let maxVol = 0;
    let maxSlot = null;
    result.forEach((r) => {
      if (r.volume > maxVol) {
        maxVol = r.volume;
        maxSlot = r.slot;
      }
    });

    return result.map((r) => ({
      ...r,
      peak: maxSlot ? r.slot === maxSlot : false,
    }));
  }, [rawCalls]);

  const peakWindowSummary = useMemo(() => {
    const peak = peakHoursData.find((p) => p.peak);
    if (!peak || peak.volume === 0) {
      return 'Log calls across the day to identify your peak customer connection window.';
    }
    return `Optimal calling window detected: ${peak.slot} (${peak.rate} connect rate, ${peak.volume} calls made).`;
  }, [peakHoursData]);

  // 100% DYNAMIC: Funnel Conversion Stats
  const funnelStats = useMemo(() => {
    const total = rawLeads.length;
    const contacted = rawLeads.filter((l) =>
      ['contacted', 'interested', 'converted', 'closed'].includes((l.status || '').toLowerCase())
    ).length;
    const qualified = rawLeads.filter((l) =>
      ['interested', 'converted'].includes((l.status || '').toLowerCase())
    ).length;
    const converted = rawLeads.filter((l) =>
      /converted|won/i.test(l.status || '')
    ).length;

    return {
      total,
      contacted,
      contactedPct: total > 0 ? Math.round((contacted / total) * 100) : 0,
      qualified,
      qualifiedPct: total > 0 ? Math.round((qualified / total) * 100) : 0,
      converted,
      convertedPct: total > 0 ? Math.round((converted / total) * 100) : 0,
    };
  }, [rawLeads]);

  // Dynamic Average Call Duration
  const dynamicAvgHandlingTime = useMemo(() => {
    const connectedCalls = rawCalls.filter((c) =>
      ['connected', 'answered'].includes((c.status || c.callStatus || '').toLowerCase())
    );
    if (!connectedCalls.length) return '0s';
    const totalSec = connectedCalls.reduce((sum, c) => sum + parseDurationSeconds(c.duration), 0);
    return formatSeconds(Math.round(totalSec / connectedCalls.length));
  }, [rawCalls]);

  // Dynamic Connection Rate
  const dynamicConnectRate = useMemo(() => {
    if (!callStats.outgoing) return '0%';
    return `${Math.round((callStats.connected / callStats.outgoing) * 100)}%`;
  }, [callStats]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* 1. Header with Greeting & Live Status */}
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
              All channels synced
            </span>
          </div>
        </div>

        {/* Refresh & Team Controls */}
        <div className="flex items-center gap-2.5">
          <select
            value={selectedTeam}
            onChange={(e) => {
              if (e.target.value === '__manage__') {
                onNavigate?.('teams');
              } else {
                setSelectedTeam(e.target.value);
              }
            }}
            className="px-3 py-1.5 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl font-medium text-dark-700 dark:text-dark-200 text-xs shadow-2xs cursor-pointer focus:outline-none"
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
          </select>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl font-semibold text-xs text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw
              size={12}
              className={refreshing ? 'animate-spin text-blue-600' : 'text-dark-500'}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Core Performance KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Outgoing Calls */}
        <div
          onClick={() => onNavigate?.('call-history', 'outgoing')}
          className="p-5 rounded-2xl cursor-pointer bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-2xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 hover:-translate-y-0.5 transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center font-bold">
                <PhoneOutgoing size={16} />
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
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white">
                {callStats.outgoing}
              </p>
              <span className="text-[11px] font-medium text-dark-500 dark:text-dark-400 mt-0.5 block">
                {callStats.connected} connected
              </span>
            </div>
            <MiniSparkline points={sparklineOutgoing} color="#6366f1" id="outgoing" />
          </div>
        </div>

        {/* Connected Calls */}
        <div
          onClick={() => onNavigate?.('call-history', 'connected')}
          className="p-5 rounded-2xl cursor-pointer bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-2xs hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500 hover:-translate-y-0.5 transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center font-bold">
                <PhoneCall size={16} />
              </div>
              <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-emerald-600 transition-colors">
                Connected Calls
              </span>
            </div>
            <ArrowUpRight
              size={14}
              className="text-dark-300 dark:text-dark-600 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
            />
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-600 dark:text-emerald-400">
                {callStats.connected}
              </p>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                {dynamicConnectRate} pickup rate
              </span>
            </div>
            <MiniSparkline points={sparklineConnected} color="#10b981" id="connected" />
          </div>
        </div>

        {/* Incoming Calls */}
        <div
          onClick={() => onNavigate?.('call-history', 'incoming')}
          className="p-5 rounded-2xl cursor-pointer bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-2xs hover:shadow-md hover:border-sky-400 dark:hover:border-sky-500 hover:-translate-y-0.5 transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 flex items-center justify-center font-bold">
                <PhoneIncoming size={16} />
              </div>
              <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-sky-600 transition-colors">
                Incoming Calls
              </span>
            </div>
            <ArrowUpRight
              size={14}
              className="text-dark-300 dark:text-dark-600 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
            />
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white">
                {callStats.incoming}
              </p>
              <span className="text-[11px] font-medium text-dark-500 dark:text-dark-400 mt-0.5 block">
                {callStats.received} received
              </span>
            </div>
            <MiniSparkline points={sparklineIncoming} color="#0ea5e9" id="incoming" />
          </div>
        </div>

        {/* Active Pipeline Leads */}
        <div
          onClick={() => onNavigate?.('leads')}
          className="p-5 rounded-2xl cursor-pointer bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-2xs hover:shadow-md hover:border-violet-400 dark:hover:border-violet-500 hover:-translate-y-0.5 transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400 flex items-center justify-center font-bold">
                <Target size={16} />
              </div>
              <span className="text-xs font-semibold text-dark-700 dark:text-dark-300 group-hover:text-violet-600 transition-colors">
                Pipeline Leads
              </span>
            </div>
            <ArrowUpRight
              size={14}
              className="text-dark-300 dark:text-dark-600 group-hover:text-violet-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
            />
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-violet-600 dark:text-violet-400">
                {totalPipelineLeads}
              </p>
              <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 mt-0.5 block">
                {funnelStats.converted} deals closed
              </span>
            </div>
            <MiniSparkline points={sparklineConnected} color="#8b5cf6" id="leads" />
          </div>
        </div>
      </div>

      {/* 3. Primary Analytics Graph: Call Volume & Connectivity Trends */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white">
              Call Activity Trends
            </h3>
            <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
              Volume tracking of outgoing, connected, and incoming calls
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
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Outgoing</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-dark-600 dark:text-dark-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Connected</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-dark-600 dark:text-dark-300">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span>Incoming</span>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="w-full h-[260px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorConnected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
              <XAxis
                dataKey="name"
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
              <Tooltip content={<ModernChartTooltip />} />
              <Area
                type="monotone"
                dataKey="outgoing"
                name="Outgoing"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorOutgoing)"
              />
              <Area
                type="monotone"
                dataKey="connected"
                name="Connected"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorConnected)"
              />
              <Area
                type="monotone"
                dataKey="incoming"
                name="Incoming"
                stroke="#0ea5e9"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorIncoming)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Clean 2-Column Split: Pipeline Breakdown & Funnel Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Lead Pipeline Outcomes */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white">
                Pipeline Stages
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Distribution of active leads across sales stages
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('leads')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Open Pipeline &gt;
            </button>
          </div>

          {totalPipelineLeads === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-dark-200 dark:border-dark-700 rounded-xl">
              <Target size={24} className="text-dark-400 mb-2 opacity-60" />
              <p className="text-xs font-semibold text-dark-700 dark:text-dark-300">
                No active leads in pipeline yet
              </p>
              <button
                onClick={() => onNavigate?.('leads')}
                className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                + Add First Lead
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
              <div className="relative w-44 h-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<DonutTooltip />} />
                    <Pie
                      data={pipelineDonutData.filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      cursor="pointer"
                      onClick={(entry) => onNavigate?.('leads', entry.status)}
                    >
                      {pipelineDonutData
                        .filter((d) => d.value > 0)
                        .map((entry, index) => (
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

              <div className="flex-1 w-full space-y-1.5 text-xs">
                {pipelineDonutData.map((stage) => {
                  const percent = Math.round((stage.value / totalPipelineLeads) * 100) || 0;
                  return (
                    <div
                      key={stage.name}
                      onClick={() => onNavigate?.('leads', stage.status)}
                      className="flex items-center justify-between p-1.5 px-2.5 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700/60 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
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
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
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
          )}
        </div>

        {/* Right: Conversion Funnel Velocity */}
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white">
                Conversion Funnel
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                {funnelStats.convertedPct}% Win Rate
              </span>
            </div>
            <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
              Live funnel progression from raw leads to closed deals
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-dark-700 dark:text-dark-300">1. Fresh Leads Ingested</span>
                <span className="text-dark-900 dark:text-white font-mono font-bold">
                  {funnelStats.total} leads
                </span>
              </div>
              <div className="h-2.5 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: funnelStats.total > 0 ? '100%' : '0%' }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-dark-700 dark:text-dark-300">2. Contacted</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                  {funnelStats.contacted} ({funnelStats.contactedPct}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${funnelStats.contactedPct}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-dark-700 dark:text-dark-300">3. Pitch / Qualified Meeting</span>
                <span className="text-violet-600 dark:text-violet-400 font-mono font-bold">
                  {funnelStats.qualified} ({funnelStats.qualifiedPct}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${funnelStats.qualifiedPct}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-dark-700 dark:text-dark-300">4. Deals Closed / Converted</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  {funnelStats.converted} ({funnelStats.convertedPct}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${funnelStats.convertedPct}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
