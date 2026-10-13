import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Phone,
  Clock,
  Users,
  Calendar,
  TrendingUp,
  BarChart2,
  RefreshCw,
  Download,
  Search,
  X,
  Filter,
  Sparkles,
  Award,
  PhoneCall,
  CheckCircle,
  XCircle,
  HelpCircle,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';
import Modal from './Modal';
import { useToast } from './Toast';
import { getCallersProgressReport, getCallersProgressDetail } from '../api/users';

const OUTCOME_COLORS = {
  Connected: '#10b981',
  Missed: '#ef4444',
  Busy: '#f59e0b',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-dark-800 p-3 rounded-xl shadow-xl border border-dark-200 dark:border-dark-700 text-xs space-y-1.5 z-50">
        <p className="font-bold text-dark-900 dark:text-white border-b border-dark-100 dark:border-dark-700 pb-1">
          {label}
        </p>
        {payload.map((entry, idx) => (
          <div key={`tip-${idx}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium text-dark-600 dark:text-dark-300">{entry.name}:</span>
            </span>
            <span className="font-bold text-dark-900 dark:text-white font-mono">
              {entry.name.includes('Duration') ? `${entry.value} mins` : entry.value}
            </span>
          </div>
        ))}
        <div className="pt-1 text-[10px] text-primary-600 dark:text-primary-400 font-semibold italic text-center">
          👉 Click to open detailed day report
        </div>
      </div>
    );
  }
  return null;
};

export default function CallerProgressReports({ onNavigate }) {
  const navigate = useNavigate();

  const handleQuickNavigate = (page) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      const pathMap = {
        'call-history': '/call-history',
        calls: '/call-history',
        todos: '/todos',
        leads: '/leads',
        'admin-agents': '/admin/agents',
        contacts: '/contacts',
      };
      const target = pathMap[page] || (page.startsWith('/') ? page : `/${page}`);
      navigate(target);
    }
  };

  const [period, setPeriod] = useState('7d');
  const [customRange, setCustomRange] = useState({
    startDate: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addToast } = useToast();

  // Detailed Report Drilldown Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailFilterType, setDetailFilterType] = useState('all'); // 'all' | 'call' | 'lead-update'
  const [detailSearch, setDetailSearch] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = { period };
      if (period === 'custom') {
        params.startDate = customRange.startDate;
        params.endDate = customRange.endDate;
      }
      const data = await getCallersProgressReport(params);
      setReportData(data);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load callers progress report', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, customRange, addToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  // Open detailed report when clicking ANY part of the graph
  const handleGraphClick = async (clickedObj) => {
    // clickedObj can be a date string, or chart payload item
    const targetDate =
      typeof clickedObj === 'string'
        ? clickedObj
        : clickedObj?.date || clickedObj?.payload?.date || reportData?.dailyTrend?.[0]?.date;

    if (!targetDate) return;

    setDetailModalOpen(true);
    setLoadingDetail(true);
    setDetailFilterType('all');
    setDetailSearch('');

    try {
      const data = await getCallersProgressDetail({ date: targetDate });
      setSelectedDayDetail(data);
    } catch (err) {
      addToast('Failed to load detailed day logs', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Export CSV of the detailed report
  const handleExportDetailCsv = () => {
    if (!selectedDayDetail || !selectedDayDetail.logs?.length) {
      addToast('No logs to export', 'error');
      return;
    }

    const headers = ['Time', 'Type', 'Caller', 'Customer Name', 'Phone', 'Company', 'Status', 'Duration', 'Remarks'];
    const rows = selectedDayDetail.logs.map((log) => [
      `"${log.time || ''}"`,
      `"${log.type || ''}"`,
      `"${log.callerName || ''}"`,
      `"${log.customerName || ''}"`,
      `"${log.customerPhone || ''}"`,
      `"${log.customerCompany || ''}"`,
      `"${log.status || ''}"`,
      `"${log.duration || ''}"`,
      `"${(log.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Caller_Detailed_Report_${selectedDayDetail.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Report CSV exported successfully!', 'success');
  };

  const summary = reportData?.summary || {};
  const dailyTrend = reportData?.dailyTrend || [];
  const pipelineDist = reportData?.pipelineDistribution || [];
  const callOutcomes = reportData?.callOutcomes || [];
  const callersBreakdown = reportData?.callersBreakdown || [];

  // Filtered detailed logs inside modal
  const filteredLogs = (selectedDayDetail?.logs || []).filter((log) => {
    const typeMatch = detailFilterType === 'all' || log.type === detailFilterType;
    const searchMatch =
      !detailSearch ||
      (log.customerName || '').toLowerCase().includes(detailSearch.toLowerCase()) ||
      (log.customerPhone || '').includes(detailSearch) ||
      (log.callerName || '').toLowerCase().includes(detailSearch.toLowerCase()) ||
      (log.remarks || '').toLowerCase().includes(detailSearch.toLowerCase());
    return typeMatch && searchMatch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER & TIME PERIOD SELECTOR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <BarChart2 size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark-900 dark:text-white">
                Overall Lead Progress &amp; Performance
              </h2>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Aggregate team-wide metrics over time. Click on any chart node, bar, or pie slice to inspect detailed activity logs.
              </p>
            </div>
          </div>
        </div>

        {/* Period Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-dark-100 dark:bg-dark-700/60 p-1 border border-dark-200 dark:border-dark-700 text-xs font-semibold">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '14d', label: 'Last 14 Days' },
              { id: 'this-month', label: 'This Month' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPeriod(p.id);
                  if (p.id === 'custom') setShowCustomRange(true);
                  else setShowCustomRange(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === p.id
                    ? 'bg-white dark:bg-dark-800 text-primary-600 dark:text-primary-400 shadow-xs font-bold'
                    : 'text-dark-600 dark:text-dark-300 hover:text-dark-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="p-2 rounded-xl border border-dark-200 dark:border-dark-700 hover:bg-dark-100 dark:hover:bg-dark-700 text-dark-600 dark:text-dark-300 transition-colors shadow-2xs"
            title="Refresh Report Data"
          >
            <RefreshCw size={16} className={refreshing || loading ? 'animate-spin text-primary-600' : ''} />
          </button>
        </div>
      </div>

      {/* CUSTOM DATE RANGE PICKER DROPDOWN */}
      {showCustomRange && (
        <div className="p-4 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-sm flex flex-wrap items-center gap-4 text-xs animate-in fade-in-50">
          <span className="font-bold text-dark-700 dark:text-dark-300">Select Date Window:</span>
          <div className="flex items-center gap-2">
            <label className="text-dark-500">From:</label>
            <input
              type="date"
              value={customRange.startDate}
              onChange={(e) => setCustomRange({ ...customRange, startDate: e.target.value })}
              className="px-2.5 py-1.5 border border-dark-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-dark-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-dark-500">To:</label>
            <input
              type="date"
              value={customRange.endDate}
              onChange={(e) => setCustomRange({ ...customRange, endDate: e.target.value })}
              className="px-2.5 py-1.5 border border-dark-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-dark-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => loadReport()}
            className="px-4 py-1.5 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-xs"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* TOP AGGREGATE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Outbound Calls */}
        <div
          onClick={() => {
            sessionStorage.removeItem('smartcrm_filter_telecaller');
            handleQuickNavigate('call-history');
          }}
          className="bg-white dark:bg-dark-800 p-4 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xs cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
          title="Click to view all call logs in Call History"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Total Calls</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                View <ArrowUpRight size={12} />
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 transition-colors">
                <Phone size={18} />
              </div>
            </div>
          </div>
          <p className="text-2xl font-black text-dark-900 dark:text-white mt-2 font-mono">
            {summary.totalCalls || 0}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-dark-500">
            <span className="text-emerald-600 font-bold">{summary.connectedCalls || 0} Connected</span>
            <span>&bull;</span>
            <span className="text-red-500 font-medium">{summary.missedCalls || 0} Missed</span>
          </div>
        </div>

        {/* Total Talk Time */}
        <div
          onClick={() => {
            sessionStorage.removeItem('smartcrm_filter_telecaller');
            handleQuickNavigate('call-history');
          }}
          className="bg-white dark:bg-dark-800 p-4 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xs cursor-pointer hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group"
          title="Click to view call durations and logs in Call History"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Talk Time Logged</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                View <ArrowUpRight size={12} />
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition-colors">
                <Clock size={18} />
              </div>
            </div>
          </div>
          <p className="text-2xl font-black text-dark-900 dark:text-white mt-2 font-mono">
            {summary.totalDurationFormatted || '0h 0m'}
          </p>
          <p className="mt-2 text-[11px] text-dark-500">
            Avg call duration: <strong className="text-dark-700 dark:text-dark-300">{summary.avgCallDuration || '0m 0s'}</strong>
          </p>
        </div>

        {/* Follow-up Progress */}
        <div
          onClick={() => {
            sessionStorage.removeItem('smartcrm_filter_telecaller');
            handleQuickNavigate('todos');
          }}
          className="bg-white dark:bg-dark-800 p-4 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xs cursor-pointer hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500 transition-all group"
          title="Click to view scheduled follow-ups and tasks in To-Dos"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Follow-up Updates</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                View <ArrowUpRight size={12} />
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 transition-colors">
                <TrendingUp size={18} />
              </div>
            </div>
          </div>
          <p className="text-2xl font-black text-dark-900 dark:text-white mt-2 font-mono">
            {summary.totalLeadsFollowedUp || 0}
          </p>
          <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
            Active pipeline stage movements
          </p>
        </div>

        {/* Conversions Won */}
        <div
          onClick={() => {
            sessionStorage.removeItem('smartcrm_filter_telecaller');
            handleQuickNavigate('leads');
          }}
          className="bg-white dark:bg-dark-800 p-4 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xs cursor-pointer hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500 transition-all group"
          title="Click to view converted deals in Leads Pipeline"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Deals Converted</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                View <ArrowUpRight size={12} />
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 transition-colors">
                <Award size={18} />
              </div>
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {summary.totalConversions || 0}
          </p>
          <p className="mt-2 text-[11px] text-dark-500">
            Conversion Rate: <strong className="text-emerald-600 font-bold">{summary.overallConversionRate || '0.0%'}</strong>
          </p>
        </div>

        {/* Active Callers */}
        <div
          onClick={() => {
            handleQuickNavigate('admin-agents');
          }}
          className="bg-white dark:bg-dark-800 p-4 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xs cursor-pointer hover:shadow-md hover:border-purple-400 dark:hover:border-purple-500 transition-all group"
          title="Click to view active leads in Lead Presence"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Active Callers</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                View <ArrowUpRight size={12} />
              </span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/60 transition-colors">
                <Users size={18} />
              </div>
            </div>
          </div>
          <p className="text-2xl font-black text-dark-900 dark:text-white mt-2 font-mono">
            {summary.activeCallersCount || 0}{' '}
            <span className="text-sm font-normal text-dark-400">/ {summary.totalRegisteredCallers || 0}</span>
          </p>
          <p className="mt-2 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
            Contributing leads
          </p>
        </div>
      </div>

      {/* INTERACTIVE HINT BANNER */}
      <div className="px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-900/60 flex items-center justify-between text-xs text-primary-900 dark:text-primary-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary-600 dark:text-primary-400 flex-shrink-0" />
          <span>
            <strong>Interactive Graphs:</strong> Click on any day or point on the charts below to open the complete <strong>Detailed Activity Report</strong> with call logs, customer info, and individual caller breakdowns for that date.
          </span>
        </div>
        <span className="text-[11px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider hidden sm:inline">
          Drilldown Enabled
        </span>
      </div>

      {/* MAIN GRAPHS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRAPH 1: OVERALL TEAM ACTIVITY TREND (Area/Composed Chart) */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-dark-900 dark:text-white text-sm">
                Overall Team Calling &amp; Follow-up Activity Trend
              </h3>
              <p className="text-xs text-dark-500">
                Daily volume of calls made, calls connected, and follow-ups progressed by callers
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300">
              {dailyTrend.length} Days
            </span>
          </div>

          <div className="h-72 w-full cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dailyTrend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    handleGraphClick(e.activePayload[0].payload);
                  }
                }}
              >
                <defs>
                  <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="connectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area
                  type="monotone"
                  dataKey="totalCalls"
                  name="Total Calls"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#callsGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="connectedCalls"
                  name="Connected Calls"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#connectedGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="leadsFollowedUp"
                  name="Follow-ups Progressed"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  name="Conversions"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 2: CALL OUTCOMES (Answered / Missed / Busy Pie) */}
        <div className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-dark-900 dark:text-white text-sm">Call Connection Breakdown</h3>
            <p className="text-xs text-dark-500">Distribution of overall call outcomes across the team</p>
          </div>

          <div className="h-56 w-full cursor-pointer relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={callOutcomes.filter((o) => o.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  onClick={(e) => handleGraphClick(dailyTrend[dailyTrend.length - 1]?.date)}
                >
                  {callOutcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={OUTCOME_COLORS[entry.name] || '#3b82f6'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-dark-900 dark:text-white font-mono">
                {summary.totalCalls || 0}
              </span>
              <span className="text-[10px] uppercase font-bold text-dark-400">Calls</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dark-100 dark:border-dark-700/60 text-center text-xs">
            {callOutcomes.map((o) => (
              <div key={o.name} className="p-1.5 rounded-lg bg-dark-50 dark:bg-dark-900/50">
                <span className="block text-[11px] font-semibold text-dark-500">{o.name}</span>
                <span className="font-mono font-bold text-sm" style={{ color: OUTCOME_COLORS[o.name] }}>
                  {o.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECOND ROW GRAPHS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 3: DAILY CALL DURATION & TALK TIME */}
        <div className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-dark-900 dark:text-white text-sm">
                Daily Caller Talking Time (Minutes Logged)
              </h3>
              <p className="text-xs text-dark-500">
                Total hours and minutes spent by callers on customer phone conversations
              </p>
            </div>
          </div>

          <div className="h-64 w-full cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyTrend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    handleGraphClick(e.activePayload[0].payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="durationMinutes"
                  name="Calling Duration (Mins)"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 4: PIPELINE STAGE DISTRIBUTION */}
        <div className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-dark-900 dark:text-white text-sm">
                Follow-up Pipeline Progression Distribution
              </h3>
              <p className="text-xs text-dark-500">
                Current stages of all leads progressed by callers across the CRM
              </p>
            </div>
          </div>

          <div className="h-64 w-full cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pipelineDist.filter((p) => p.count > 0)}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                onClick={() => handleGraphClick(dailyTrend[dailyTrend.length - 1]?.date)}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" name="Leads in Stage" radius={[0, 6, 6, 0]}>
                  {pipelineDist.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CALLERS AGGREGATE SUMMARY TABLE */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-dark-200 dark:border-dark-700 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-sm text-dark-900 dark:text-white">
              Contributing Leads Overview
            </h4>
            <p className="text-xs text-dark-500">
              Breakdown of total calls, talk time, and conversions logged by each caller in this period
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300">
            {callersBreakdown.length} Callers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-dark-50 dark:bg-dark-700/60 text-dark-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="px-4 py-3 text-left">Caller</th>
                <th className="px-4 py-3 text-center">Total Calls</th>
                <th className="px-4 py-3 text-center">Connected</th>
                <th className="px-4 py-3 text-center">Talk Time</th>
                <th className="px-4 py-3 text-center">Follow-ups Updated</th>
                <th className="px-4 py-3 text-center">Conversions</th>
                <th className="px-4 py-3 text-center">Conv. Rate</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
              {callersBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-dark-400">
                    No caller activity records found in this time period.
                  </td>
                </tr>
              ) : (
                  callersBreakdown.map((caller) => (
                    <tr key={caller.callerId} className="hover:bg-dark-50 dark:hover:bg-dark-700/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-dark-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs">
                              {caller.avatar || 'TC'}
                            </div>
                            {caller.isOnline && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-dark-800" />
                            )}
                          </div>
                          <div
                            className="cursor-pointer group/caller"
                            onClick={() => {
                              sessionStorage.setItem('smartcrm_filter_telecaller', caller.name);
                              handleQuickNavigate('leads');
                            }}
                            title={`Click to view all leads assigned to ${caller.name}`}
                          >
                            <p className="font-bold group-hover/caller:text-primary-600 transition-colors flex items-center gap-1">
                              {caller.name}
                              <ArrowUpRight size={11} className="opacity-0 group-hover/caller:opacity-100 transition-opacity text-primary-600" />
                            </p>
                            <p className="text-[10px] text-dark-400">{caller.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            sessionStorage.setItem('smartcrm_filter_telecaller', caller.name);
                            handleQuickNavigate('call-history');
                          }}
                          className="font-bold font-mono text-dark-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
                          title={`Click to view call history logs for ${caller.name}`}
                        >
                          {caller.totalCalls}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            sessionStorage.setItem('smartcrm_filter_telecaller', caller.name);
                            handleQuickNavigate('call-history');
                          }}
                          className="font-mono text-emerald-600 font-semibold hover:underline cursor-pointer"
                          title={`Click to view connected calls for ${caller.name}`}
                        >
                          {caller.connectedCalls}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-indigo-600 font-medium">
                        {caller.totalDurationMinutes} mins
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            sessionStorage.setItem('smartcrm_filter_telecaller', caller.name);
                            handleQuickNavigate('todos');
                          }}
                          className="font-mono text-amber-600 font-semibold hover:underline cursor-pointer"
                          title={`Click to view follow-up tasks for ${caller.name}`}
                        >
                          {caller.leadsFollowedUp}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            sessionStorage.setItem('smartcrm_filter_telecaller', caller.name);
                            handleQuickNavigate('leads');
                          }}
                          className="font-mono text-emerald-600 font-bold hover:underline cursor-pointer"
                          title={`Click to view converted leads for ${caller.name}`}
                        >
                          {caller.conversions}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-dark-800 dark:text-dark-200">
                        {caller.conversionRate}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              sessionStorage.setItem('smartcrm_filter_telecaller', caller.name);
                              handleQuickNavigate('call-history');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-semibold transition-colors cursor-pointer"
                            title={`View ${caller.name}'s calls in Call History`}
                          >
                            Calls <ArrowUpRight size={11} />
                          </button>
                          <button
                            onClick={() => handleGraphClick(dailyTrend[dailyTrend.length - 1]?.date)}
                            className="px-2.5 py-1 rounded-lg bg-dark-100 dark:bg-dark-700 hover:bg-primary-50 dark:hover:bg-primary-950/50 hover:text-primary-600 text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Inspect detailed logs for this date"
                          >
                            Inspect Logs
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED REPORT MODAL (DRILLDOWN TRIGGERED BY GRAPH CLICKS) */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Detailed Progress Report — ${selectedDayDetail?.date || 'Selected Segment'}`}
        size="xl"
      >
        <div className="space-y-4">
          {/* Day Highlight Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-center">
              <span className="text-[10px] font-bold text-blue-600 uppercase">Calls Made</span>
              <p className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono mt-0.5">
                {selectedDayDetail?.totalCalls || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Connected</span>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                {selectedDayDetail?.connectedCalls || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 text-center">
              <span className="text-[10px] font-bold text-purple-600 uppercase">Active Callers</span>
              <p className="text-xl font-black text-purple-700 dark:text-purple-300 font-mono mt-0.5">
                {selectedDayDetail?.activeCallersThisDay?.length || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-center">
              <span className="text-[10px] font-bold text-amber-600 uppercase">Total Activity Logs</span>
              <p className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono mt-0.5">
                {selectedDayDetail?.totalLogs || 0}
              </p>
            </div>
          </div>

          {/* Active Callers Contributing on this date */}
          {selectedDayDetail?.activeCallersThisDay?.length > 0 && (
            <div className="p-3.5 rounded-xl bg-dark-50 dark:bg-dark-900/60 border border-dark-200 dark:border-dark-700">
              <h5 className="font-bold text-xs text-dark-800 dark:text-dark-200 mb-2">
                Callers Contributing on {selectedDayDetail?.date}:
              </h5>
              <div className="flex flex-wrap gap-2">
                {selectedDayDetail.activeCallersThisDay.map((c) => (
                  <div
                    key={c.callerId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-xs shadow-2xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-[10px]">
                      {c.avatar}
                    </span>
                    <span className="font-bold text-dark-900 dark:text-white">{c.name}</span>
                    <span className="text-dark-400 font-mono text-[11px]">
                      ({c.callsCount} calls &bull; {c.leadsUpdated} updates)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters & Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDetailFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  detailFilterType === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300'
                }`}
              >
                All Activity ({selectedDayDetail?.logs?.length || 0})
              </button>
              <button
                onClick={() => setDetailFilterType('call')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  detailFilterType === 'call'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300'
                }`}
              >
                Calls Only ({selectedDayDetail?.logs?.filter((l) => l.type === 'call').length || 0})
              </button>
              <button
                onClick={() => setDetailFilterType('lead-update')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  detailFilterType === 'lead-update'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300'
                }`}
              >
                Follow-ups Only ({selectedDayDetail?.logs?.filter((l) => l.type === 'lead-update').length || 0})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2 text-dark-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  className="pl-7 pr-3 py-1 border border-dark-200 dark:border-dark-700 rounded-lg text-xs bg-white dark:bg-dark-800 text-dark-900 dark:text-white w-40"
                />
              </div>

              <button
                onClick={handleExportDetailCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-dark-100 dark:bg-dark-700 hover:bg-dark-200 dark:hover:bg-dark-600 text-dark-700 dark:text-dark-200 text-xs font-bold rounded-lg transition-colors"
                title="Download CSV"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Activity Logs Table */}
          <div className="border border-dark-200 dark:border-dark-700 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-dark-100 dark:bg-dark-700/90 text-dark-600 dark:text-dark-300 text-[11px] font-semibold uppercase">
                <tr>
                  <th className="px-3 py-2.5 text-left">Time</th>
                  <th className="px-3 py-2.5 text-left">Caller</th>
                  <th className="px-3 py-2.5 text-left">Customer</th>
                  <th className="px-3 py-2.5 text-left">Type &amp; Status</th>
                  <th className="px-3 py-2.5 text-left">Duration</th>
                  <th className="px-3 py-2.5 text-left">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-200 dark:divide-dark-700 bg-white dark:bg-dark-800">
                {loadingDetail ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-dark-400">
                      Loading detailed logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-dark-400">
                      No matching activity logs found for this date.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-dark-50 dark:hover:bg-dark-700/50">
                      <td className="px-3 py-2 font-mono text-dark-500">{log.time}</td>
                      <td className="px-3 py-2 font-bold text-dark-900 dark:text-white">
                        {log.callerName}
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-dark-900 dark:text-white">{log.customerName}</p>
                        {log.customerPhone && (
                          <p className="text-[10px] text-dark-400 font-mono">
                            {log.customerPhone}
                            {log.customerCompany ? ` • ${log.customerCompany}` : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            log.status === 'connected' || log.status === 'converted'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : log.status === 'missed' || log.status === 'not-interested'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {log.type === 'call' ? `Call: ${log.status}` : `Follow-up: ${log.status}`}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-dark-600 dark:text-dark-300">
                        {log.duration || '-'}
                      </td>
                      <td className="px-3 py-2 text-dark-600 dark:text-dark-400 max-w-xs truncate" title={log.remarks}>
                        {log.remarks}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 border-t border-dark-200 dark:border-dark-700">
            <button
              onClick={() => setDetailModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-dark-700 bg-dark-100 rounded-lg hover:bg-dark-200 dark:text-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
