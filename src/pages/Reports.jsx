import { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  ChevronDown,
  RefreshCw,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  RotateCcw,
  Users,
  Building2,
  X,
  Check,
  TrendingUp,
  Download,
  Info,
  ArrowUpRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getCalls } from '../api/callHistory';
import ReportDetails from './ReportDetails';

export default function Reports({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Active Team & Team Switcher
  const [activeTeam, setActiveTeam] = useState({
    name: 'Main Business Team',
    number: 'Active',
  });
  const [showSwitchTeamModal, setShowSwitchTeamModal] = useState(false);

  // Tabs: 'activity' (Call Activity) | 'team' (Team) | 'customers' (Customers)
  const [activeTab, setActiveTab] = useState('activity');

  // Period
  const [period, setPeriod] = useState('Oct 09, 2026 – Oct 09, 2026');

  // Staff Filters
  const allStaffMembers = user?.name ? [user.name] : ['Current User'];
  const [selectedStaffList, setSelectedStaffList] = useState(allStaffMembers);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  // Dedicated Page View Mode: 'overview' (Graphs Dashboard) | 'detail' (Dedicated Detail Page)
  const [viewMode, setViewMode] = useState('overview');
  const [currentDetailFilter, setCurrentDetailFilter] = useState({
    category: 'all',
    subStatus: 'all',
    title: '',
  });

  // Duration calculation helpers
  const parseDurationSeconds = (dur) => {
    if (!dur) return 0;
    if (typeof dur === 'number') return dur;
    const str = String(dur).trim().toLowerCase();
    let totalSec = 0;
    const mMatch = str.match(/(\d+)\s*m/);
    if (mMatch) totalSec += parseInt(mMatch[1], 10) * 60;
    const sMatch = str.match(/(\d+)\s*s/);
    if (sMatch) totalSec += parseInt(sMatch[1], 10);
    if (!mMatch && !sMatch) {
      const num = parseInt(str, 10);
      if (!isNaN(num)) totalSec += num;
    }
    return totalSec;
  };

  const formatSeconds = (sec) => {
    if (!sec || sec <= 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  // Real Call Records loaded dynamically from CRM backend and live calls
  const [calls, setCalls] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(false);

  useEffect(() => {
    setLoadingCalls(true);
    const localCalls = JSON.parse(localStorage.getItem('smartcrm_all_calls') || '[]');
    getCalls({ limit: 500 })
      .then((res) => {
        const serverCalls = res.calls || [];
        const existingIds = new Set(serverCalls.map((c) => c._id));
        const localOnly = localCalls
          .filter((l) => !existingIds.has(l.id))
          .map((l) => ({
            _id: l.id,
            customerName: l.customerName || 'Customer',
            phone: l.customerPhone || l.customerNumber || '',
            company: l.company || '-',
            calledByName: l.calledByName || l.staff || user?.name || 'Agent',
            callType: (l.callType || 'outgoing').toLowerCase(),
            status: l.status || (l.callStatus === 'Answered' ? 'connected' : 'missed'),
            subStatus: l.status === 'connected' ? 'Connected' : 'Not answered',
            duration: l.duration || '0s',
            durationSec: parseDurationSeconds(l.duration),
            date: l.date || 'Today',
            time: l.time || '',
            remarks: l.remarks || '',
          }));

        const mappedServer = serverCalls.map((c) => {
          const type = (c.callType || (c.type || 'outgoing')).toLowerCase();
          const isConn = c.status === 'connected';
          let subStatus = 'Not answered';
          if (type === 'outgoing') {
            subStatus = isConn ? 'Connected' : 'Not answered';
          } else if (type === 'incoming') {
            subStatus = isConn ? 'Answered' : 'Missed';
          } else if (type === 'missed') {
            subStatus = 'Not answered';
          }
          return {
            _id: c._id,
            customerName: c.customerName || c.customerId?.name || 'Customer',
            phone: c.customerPhone || c.customerId?.mobile || c.mobile || '',
            company: c.company || c.customerId?.company || '-',
            calledByName: c.calledByName || user?.name || 'Agent',
            callType: type,
            status: c.status || (isConn ? 'connected' : 'missed'),
            subStatus: c.subStatus || subStatus,
            duration: c.duration ? (String(c.duration).includes('s') ? c.duration : `${c.duration}s`) : '0s',
            durationSec: parseDurationSeconds(c.duration),
            date: c.date || 'Today',
            time: c.time || '',
            remarks: c.remarks || '',
          };
        });

        setCalls([...localOnly, ...mappedServer]);
      })
      .catch(() => {
        const fallbackLocal = localCalls.map((l) => ({
          _id: l.id,
          customerName: l.customerName || 'Customer',
          phone: l.customerPhone || l.customerNumber || '',
          company: l.company || '-',
          calledByName: l.calledByName || l.staff || user?.name || 'Agent',
          callType: (l.callType || 'outgoing').toLowerCase(),
          status: l.status || (l.callStatus === 'Answered' ? 'connected' : 'missed'),
          subStatus: l.status === 'connected' ? 'Connected' : 'Not answered',
          duration: l.duration || '0s',
          durationSec: parseDurationSeconds(l.duration),
          date: l.date || 'Today',
          time: l.time || '',
          remarks: l.remarks || '',
        }));
        setCalls(fallbackLocal);
      })
      .finally(() => setLoadingCalls(false));
  }, [user]);

  // Filtered by selected staff
  const filteredCalls = useMemo(() => {
    if (selectedStaffList.length === 0) return calls;
    return calls.filter((c) =>
      selectedStaffList.some(
        (st) =>
          (c.calledByName || '').toLowerCase().includes(st.toLowerCase()) ||
          st.toLowerCase().includes((c.calledByName || '').toLowerCase())
      )
    );
  }, [calls, selectedStaffList]);

  // Open Dedicated Report Element Details Page (No Popups)
  const handleOpenDetailPage = ({ category, subStatus = 'all', title }) => {
    const filterObj = {
      category,
      subStatus: subStatus || 'all',
      title: title || '',
    };
    setCurrentDetailFilter(filterObj);
    setViewMode('detail');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (onNavigate) {
      onNavigate('report-detail', filterObj);
    }
  };

  // Custom Chart Tooltip displaying click hint
  const ClickableChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-dark-900/95 dark:bg-dark-800 text-white px-3 py-2 rounded-xl text-xs shadow-2xl border border-dark-700 pointer-events-none space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: item.payload?.color || item.color }}
            />
            <span>
              {item.name} : <strong className="text-amber-300">{item.payload?.label || item.value}</strong>
            </span>
          </p>
          <p className="text-[10px] text-blue-300 font-semibold flex items-center gap-1">
            <span>👆 Click slice to view detailed report</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Real KPI Metrics
  const metrics = useMemo(() => {
    const missed = filteredCalls.filter((c) => c.callType === 'missed' || c.status === 'missed').length;
    const outgoing = filteredCalls.filter((c) => c.callType === 'outgoing').length;
    const incoming = filteredCalls.filter((c) => c.callType === 'incoming').length;
    const totalSec = filteredCalls.reduce((acc, c) => acc + (c.durationSec || 0), 0);
    return {
      missed,
      outgoing,
      incoming,
      totalTalktime: formatSeconds(totalSec),
      totalSec,
    };
  }, [filteredCalls]);

  // Donut 1: Real Missed calls breakdown
  const missedData = useMemo(() => {
    const missedCalls = filteredCalls.filter((c) => c.callType === 'missed' || c.status === 'missed');
    const dnd = missedCalls.filter((c) => /dnd|decline/i.test(c.subStatus || c.remarks || '')).length;
    const busy = missedCalls.filter((c) => /busy/i.test(c.subStatus || c.remarks || '')).length;
    const noNetwork = missedCalls.filter((c) => /network|unreachable|coverage/i.test(c.subStatus || c.remarks || '')).length;
    const notAnswered = Math.max(0, missedCalls.length - dnd - busy - noNetwork);
    return [
      { name: 'DND/Decline', value: dnd, color: '#94a3b8' },
      { name: 'Line busy', value: busy, color: '#f59e0b' },
      { name: 'No network', value: noNetwork, color: '#ef4444' },
      { name: 'Not answered', value: notAnswered, color: '#8b5cf6' },
    ];
  }, [filteredCalls]);

  // Donut 2: Real Incoming calls breakdown
  const incomingData = useMemo(() => {
    const incomingCalls = filteredCalls.filter((c) => c.callType === 'incoming');
    const answered = incomingCalls.filter((c) => c.status === 'connected' || /answered/i.test(c.subStatus || '')).length;
    const missed = incomingCalls.filter((c) => c.status === 'missed' || /missed|unanswered/i.test(c.subStatus || '')).length;
    const dnd = incomingCalls.filter((c) => /dnd/i.test(c.subStatus || c.remarks || '')).length;
    return [
      { name: 'Answered', value: answered, color: '#10b981' },
      { name: 'Missed', value: missed, color: '#ef4444' },
      { name: 'DND', value: dnd, color: '#64748b' },
    ];
  }, [filteredCalls]);

  // Donut 3: Real Outgoing calls breakdown
  const outgoingData = useMemo(() => {
    const outgoingCalls = filteredCalls.filter((c) => c.callType === 'outgoing');
    const connected = outgoingCalls.filter((c) => c.status === 'connected' || /connected/i.test(c.subStatus || '')).length;
    const notConnected = Math.max(0, outgoingCalls.length - connected);
    return [
      { name: 'Not connected', value: notConnected, color: '#ef4444' },
      { name: 'Connected', value: connected, color: '#10b981' },
    ];
  }, [filteredCalls]);

  // Donut 4: Real Total talktime breakdown
  const talktimeData = useMemo(() => {
    const outgoingSec = filteredCalls
      .filter((c) => c.callType === 'outgoing')
      .reduce((acc, c) => acc + (c.durationSec || 0), 0);
    const incomingSec = filteredCalls
      .filter((c) => c.callType === 'incoming')
      .reduce((acc, c) => acc + (c.durationSec || 0), 0);
    return [
      { name: 'Outgoing', value: outgoingSec, label: formatSeconds(outgoingSec), color: '#3b82f6' },
      { name: 'Incoming', value: incomingSec, label: formatSeconds(incomingSec), color: '#06b6d4' },
    ];
  }, [filteredCalls]);

  const removeStaffFilter = (staffName) => {
    setSelectedStaffList((prev) => prev.filter((s) => s !== staffName));
  };

  const resetFilters = () => {
    setSelectedStaffList(allStaffMembers);
    setPeriod('Oct 09, 2026 – Oct 09, 2026');
    addToast('Filters reset to default', 'info');
  };

  // Dedicated Report Elements Details Page (No Popups)
  if (viewMode === 'detail') {
    return (
      <ReportDetails
        filter={currentDetailFilter}
        onBack={() => setViewMode('overview')}
        onNavigate={onNavigate}
        staffName={selectedStaffList[0] || user?.name || 'Kusum Rathore'}
        period={period}
        calls={filteredCalls}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Page Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Title with Breadcrumb & Icon */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
            <BarChart3 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">
                Reports
              </h1>
              <span className="text-dark-400 font-normal text-lg">/</span>
              <span className="text-dark-600 dark:text-dark-300 font-semibold text-lg">
                {activeTeam.name}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5">
              Insights for {activeTeam.name} — call activity, team performance, and customers.
            </p>
          </div>
        </div>

        {/* Right Switch Team Button */}
        <div>
          <button
            onClick={() => setShowSwitchTeamModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 shadow-2xs transition-colors"
          >
            <RefreshCw size={14} className="text-dark-500" />
            <span>Switch team</span>
          </button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs: Call Activity | Team | Customers */}
      <div className="flex border-b border-dark-200 dark:border-dark-700 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
            activeTab === 'activity'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
          }`}
        >
          <PhoneCall size={16} />
          <span>Call Activity</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
            activeTab === 'team'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
          }`}
        >
          <Users size={16} />
          <span>Team</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
            activeTab === 'customers'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
          }`}
        >
          <Users size={16} />
          <span>Customers</span>
        </button>
      </div>

      {/* 3. Filter Card Container */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4">
        {/* Filter Title & Reset */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-dark-900 dark:text-white">
            <span>Filters</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {selectedStaffList.length}
            </span>
          </div>

          <button
            onClick={resetFilters}
            className="flex items-center gap-1 font-semibold text-dark-500 hover:text-dark-800 dark:text-dark-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        </div>

        {/* 2 Main Filter Inputs: STAFF & PERIOD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* STAFF Input Box */}
          <div className="relative">
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              STAFF
            </label>
            <div
              onClick={() => setShowStaffDropdown(!showStaffDropdown)}
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 cursor-pointer shadow-2xs min-h-[38px]"
            >
              <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
                {selectedStaffList.slice(0, 2).map((st) => (
                  <span
                    key={st}
                    className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold"
                  >
                    {st}
                  </span>
                ))}
                {selectedStaffList.length > 2 && (
                  <span className="text-dark-500 dark:text-dark-400 font-semibold text-[11px]">
                    +{selectedStaffList.length - 2} more
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-dark-400">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStaffList([]);
                  }}
                  className="hover:text-dark-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
                <ChevronDown size={14} />
              </div>
            </div>

            {/* Staff Dropdown Options */}
            {showStaffDropdown && (
              <div className="absolute left-0 mt-2 w-full rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2.5 shadow-2xl z-30 space-y-1">
                <div className="flex justify-between items-center px-1 pb-1 border-b border-dark-100 dark:border-dark-700 text-[11px] font-bold">
                  <span className="text-dark-400 uppercase">Select Staff</span>
                  <button
                    onClick={() => setSelectedStaffList(allStaffMembers)}
                    className="text-blue-600 hover:underline"
                  >
                    Select All
                  </button>
                </div>
                {allStaffMembers.map((member) => {
                  const isChecked = selectedStaffList.includes(member);
                  return (
                    <div
                      key={member}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedStaffList((prev) => prev.filter((m) => m !== member));
                        } else {
                          setSelectedStaffList((prev) => [...prev, member]);
                        }
                      }}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer text-xs"
                    >
                      <span className="font-semibold text-dark-800 dark:text-dark-200">
                        {member}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-blue-600"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PERIOD Input Box */}
          <div>
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              PERIOD
            </label>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 shadow-2xs min-h-[38px]">
              <div className="flex items-center gap-2 text-dark-700 dark:text-dark-200 font-medium">
                <Calendar size={14} className="text-dark-400" />
                <span>{period}</span>
              </div>
              <button
                onClick={() => addToast('Period filter reset', 'info')}
                className="text-dark-400 hover:text-dark-700"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Active Staff Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-dark-100 dark:border-dark-700/60 text-xs">
          <span className="font-bold text-dark-400 uppercase text-[10px]">
            STAFF {selectedStaffList.length}
          </span>
          {selectedStaffList.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium text-[11px] border border-blue-200 dark:border-blue-900/60"
            >
              <span>{st}</span>
              <button
                onClick={() => removeStaffFilter(st)}
                className="hover:text-rose-600 font-bold"
              >
                ×
              </button>
            </span>
          ))}
          {selectedStaffList.length > 0 && (
            <button
              onClick={() => setSelectedStaffList([])}
              className="text-blue-600 hover:underline font-semibold text-[11px] ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* 4. Four KPI Metric Cards Row matching Screenshot 1 */}
      {activeTab === 'activity' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Missed Calls */}
            <div
              onClick={() =>
                handleOpenDetailPage({
                  category: 'missed',
                  subStatus: 'all',
                  title: 'Detailed Report: All Missed Calls',
                })
              }
              className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-3 cursor-pointer hover:shadow-md hover:border-rose-400 dark:hover:border-rose-500 transition-all group"
              title="Click to view detailed report of all missed calls"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-500">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PhoneMissed size={16} />
                  </div>
                  <span className="text-xs font-semibold text-dark-600 dark:text-dark-300">
                    Missed
                  </span>
                </div>
                <span className="text-[10px] text-rose-500 font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  View <ArrowUpRight size={12} />
                </span>
              </div>
              <p className="text-3xl font-extrabold text-dark-900 dark:text-white">
                {metrics.missed}
              </p>
            </div>

            {/* Card 2: Outgoing Calls */}
            <div
              onClick={() =>
                handleOpenDetailPage({
                  category: 'outgoing',
                  subStatus: 'all',
                  title: 'Detailed Report: All Outgoing Calls',
                })
              }
              className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-3 cursor-pointer hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500 transition-all group"
              title="Click to view detailed report of all outgoing calls"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PhoneOutgoing size={16} />
                  </div>
                  <span className="text-xs font-semibold text-dark-600 dark:text-dark-300">
                    Outgoing
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  View <ArrowUpRight size={12} />
                </span>
              </div>
              <p className="text-3xl font-extrabold text-dark-900 dark:text-white">
                {metrics.outgoing}
              </p>
            </div>

            {/* Card 3: Incoming Calls */}
            <div
              onClick={() =>
                handleOpenDetailPage({
                  category: 'incoming',
                  subStatus: 'all',
                  title: 'Detailed Report: All Incoming Calls',
                })
              }
              className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-3 cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
              title="Click to view detailed report of all incoming calls"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PhoneIncoming size={16} />
                  </div>
                  <span className="text-xs font-semibold text-dark-600 dark:text-dark-300">
                    Incoming
                  </span>
                </div>
                <span className="text-[10px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  View <ArrowUpRight size={12} />
                </span>
              </div>
              <p className="text-3xl font-extrabold text-dark-900 dark:text-white">
                {metrics.incoming}
              </p>
            </div>

            {/* Card 4: Total talktime */}
            <div
              onClick={() =>
                handleOpenDetailPage({
                  category: 'talktime',
                  subStatus: 'all',
                  title: 'Detailed Report: Total Talktime Call Breakdown',
                })
              }
              className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-3 cursor-pointer hover:shadow-md hover:border-purple-400 dark:hover:border-purple-500 transition-all group"
              title="Click to view detailed talktime breakdown"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-600">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock size={16} />
                  </div>
                  <span className="text-xs font-semibold text-dark-600 dark:text-dark-300">
                    Total talktime
                  </span>
                </div>
                <span className="text-[10px] text-purple-600 font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  View <ArrowUpRight size={12} />
                </span>
              </div>
              <p className="text-3xl font-extrabold text-dark-900 dark:text-white">
                {metrics.totalTalktime}
              </p>
            </div>
          </div>

          {/* 5. Four Donut Breakdown Charts Grid matching Screenshot 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Missed calls breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    onClick={() =>
                      handleOpenDetailPage({
                        category: 'missed',
                        subStatus: 'all',
                        title: 'Detailed Report: All Missed Calls',
                      })
                    }
                    className="font-bold text-dark-900 dark:text-white text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <span>Missed calls</span>
                    <ArrowUpRight size={13} className="text-dark-400 group-hover:text-blue-600 transition-colors" />
                  </h3>
                  <p className="text-[11px] text-dark-400 mt-0.5">
                    Breakdown for the selected range (Click any slice or legend for details)
                  </p>
                </div>
                <div
                  onClick={() =>
                    handleOpenDetailPage({
                      category: 'missed',
                      subStatus: 'all',
                      title: 'Detailed Report: All Missed Calls',
                    })
                  }
                  className="text-right cursor-pointer hover:opacity-80 transition-opacity"
                  title="Click to view all missed calls"
                >
                  <span className="text-[10px] text-dark-400 font-bold uppercase">TOTAL</span>
                  <p className="font-extrabold text-dark-900 dark:text-white text-lg">{metrics.missed}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="w-36 h-36 relative flex-shrink-0 flex items-center justify-center">
                  {missedData.reduce((acc, d) => acc + d.value, 0) === 0 ? (
                    <div className="w-28 h-28 rounded-full border-2 border-dashed border-dark-200 dark:border-dark-700 flex flex-col items-center justify-center text-center p-2">
                      <span className="text-lg font-bold text-dark-400 dark:text-dark-500">0</span>
                      <span className="text-[9px] text-dark-400 dark:text-dark-500">No calls</span>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={missedData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        cursor="pointer"
                        onClick={(entry) =>
                          handleOpenDetailPage({
                            category: 'missed',
                            subStatus: entry.name,
                            title: `Detailed Report: Missed Calls — ${entry.name}`,
                          })
                        }
                      >
                        {missedData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            cursor="pointer"
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                            onClick={() =>
                              handleOpenDetailPage({
                                category: 'missed',
                                subStatus: entry.name,
                                title: `Detailed Report: Missed Calls — ${entry.name}`,
                              })
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ClickableChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-xs">
                  {missedData.map((item) => (
                    <div
                      key={item.name}
                      onClick={() =>
                        handleOpenDetailPage({
                          category: 'missed',
                          subStatus: item.name,
                          title: `Detailed Report: Missed Calls — ${item.name}`,
                        })
                      }
                      className="flex items-center justify-between p-1.5 -mx-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700/60 cursor-pointer transition-colors group"
                      title={`Click to view detailed report for ${item.name}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full group-hover:scale-125 transition-transform"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-dark-600 dark:text-dark-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-dark-900 dark:text-white">{item.value}</span>
                        <ArrowUpRight
                          size={12}
                          className="text-dark-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 2: Incoming calls breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    onClick={() =>
                      handleOpenDetailPage({
                        category: 'incoming',
                        subStatus: 'all',
                        title: 'Detailed Report: All Incoming Calls',
                      })
                    }
                    className="font-bold text-dark-900 dark:text-white text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <span>Incoming calls</span>
                    <ArrowUpRight size={13} className="text-dark-400 group-hover:text-blue-600 transition-colors" />
                  </h3>
                  <p className="text-[11px] text-dark-400 mt-0.5">
                    Breakdown for the selected range (Click any slice or legend for details)
                  </p>
                </div>
                <div
                  onClick={() =>
                    handleOpenDetailPage({
                      category: 'incoming',
                      subStatus: 'all',
                      title: 'Detailed Report: All Incoming Calls',
                    })
                  }
                  className="text-right cursor-pointer hover:opacity-80 transition-opacity"
                  title="Click to view all incoming calls"
                >
                  <span className="text-[10px] text-dark-400 font-bold uppercase">TOTAL</span>
                  <p className="font-extrabold text-dark-900 dark:text-white text-lg">{incomingData.reduce((a, b) => a + b.value, 0)}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="w-36 h-36 relative flex-shrink-0 flex items-center justify-center">
                  {incomingData.reduce((acc, d) => acc + d.value, 0) === 0 ? (
                    <div className="w-28 h-28 rounded-full border-2 border-dashed border-dark-200 dark:border-dark-700 flex flex-col items-center justify-center text-center p-2">
                      <span className="text-lg font-bold text-dark-400 dark:text-dark-500">0</span>
                      <span className="text-[9px] text-dark-400 dark:text-dark-500">No calls</span>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        cursor="pointer"
                        onClick={(entry) =>
                          handleOpenDetailPage({
                            category: 'incoming',
                            subStatus: entry.name,
                            title: `Detailed Report: Incoming Calls — ${entry.name}`,
                          })
                        }
                      >
                        {incomingData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            cursor="pointer"
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                            onClick={() =>
                              handleOpenDetailPage({
                                category: 'incoming',
                                subStatus: entry.name,
                                title: `Detailed Report: Incoming Calls — ${entry.name}`,
                              })
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ClickableChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-xs">
                  {incomingData.map((item) => (
                    <div
                      key={item.name}
                      onClick={() =>
                        handleOpenDetailPage({
                          category: 'incoming',
                          subStatus: item.name,
                          title: `Detailed Report: Incoming Calls — ${item.name}`,
                        })
                      }
                      className="flex items-center justify-between p-1.5 -mx-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700/60 cursor-pointer transition-colors group"
                      title={`Click to view detailed report for ${item.name}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full group-hover:scale-125 transition-transform"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-dark-600 dark:text-dark-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-dark-900 dark:text-white">{item.value}</span>
                        <ArrowUpRight
                          size={12}
                          className="text-dark-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 3: Outgoing calls breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    onClick={() =>
                      handleOpenDetailPage({
                        category: 'outgoing',
                        subStatus: 'all',
                        title: 'Detailed Report: All Outgoing Calls',
                      })
                    }
                    className="font-bold text-dark-900 dark:text-white text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <span>Outgoing calls</span>
                    <ArrowUpRight size={13} className="text-dark-400 group-hover:text-blue-600 transition-colors" />
                  </h3>
                  <p className="text-[11px] text-dark-400 mt-0.5">
                    Breakdown for the selected range (Click any slice or legend for details)
                  </p>
                </div>
                <div
                  onClick={() =>
                    handleOpenDetailPage({
                      category: 'outgoing',
                      subStatus: 'all',
                      title: 'Detailed Report: All Outgoing Calls',
                    })
                  }
                  className="text-right cursor-pointer hover:opacity-80 transition-opacity"
                  title="Click to view all outgoing calls"
                >
                  <span className="text-[10px] text-dark-400 font-bold uppercase">TOTAL</span>
                  <p className="font-extrabold text-dark-900 dark:text-white text-lg">{metrics.outgoing}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="w-36 h-36 relative flex-shrink-0 flex items-center justify-center">
                  {outgoingData.reduce((acc, d) => acc + d.value, 0) === 0 ? (
                    <div className="w-28 h-28 rounded-full border-2 border-dashed border-dark-200 dark:border-dark-700 flex flex-col items-center justify-center text-center p-2">
                      <span className="text-lg font-bold text-dark-400 dark:text-dark-500">0</span>
                      <span className="text-[9px] text-dark-400 dark:text-dark-500">No calls</span>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outgoingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        cursor="pointer"
                        onClick={(entry) =>
                          handleOpenDetailPage({
                            category: 'outgoing',
                            subStatus: entry.name,
                            title: `Detailed Report: Outgoing Calls — ${entry.name}`,
                          })
                        }
                      >
                        {outgoingData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            cursor="pointer"
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                            onClick={() =>
                              handleOpenDetailPage({
                                category: 'outgoing',
                                subStatus: entry.name,
                                title: `Detailed Report: Outgoing Calls — ${entry.name}`,
                              })
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ClickableChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-xs">
                  {outgoingData.map((item) => (
                    <div
                      key={item.name}
                      onClick={() =>
                        handleOpenDetailPage({
                          category: 'outgoing',
                          subStatus: item.name,
                          title: `Detailed Report: Outgoing Calls — ${item.name}`,
                        })
                      }
                      className="flex items-center justify-between p-1.5 -mx-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700/60 cursor-pointer transition-colors group"
                      title={`Click to view detailed report for ${item.name}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full group-hover:scale-125 transition-transform"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-dark-600 dark:text-dark-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-dark-900 dark:text-white">{item.value}</span>
                        <ArrowUpRight
                          size={12}
                          className="text-dark-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 4: Total talktime breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      onClick={() =>
                        handleOpenDetailPage({
                          category: 'talktime',
                          subStatus: 'all',
                          title: 'Detailed Report: Total Talktime Call Breakdown',
                        })
                      }
                      className="font-bold text-dark-900 dark:text-white text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 group"
                    >
                      <span>Total talktime</span>
                      <ArrowUpRight size={13} className="text-dark-400 group-hover:text-blue-600 transition-colors" />
                    </h3>
                    <p className="text-[11px] text-dark-400 mt-0.5">
                      Breakdown for the selected range (Click any slice or legend for details)
                    </p>
                  </div>
                  <div
                    onClick={() =>
                      handleOpenDetailPage({
                        category: 'talktime',
                        subStatus: 'all',
                        title: 'Detailed Report: Total Talktime Call Breakdown',
                      })
                    }
                    className="text-right cursor-pointer hover:opacity-80 transition-opacity"
                    title="Click to view all talktime calls"
                  >
                    <span className="text-[10px] text-dark-400 font-bold uppercase">TOTAL</span>
                    <p className="font-extrabold text-dark-900 dark:text-white text-lg">{metrics.totalTalktime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-4">
                  <div className="w-36 h-36 relative flex-shrink-0 flex items-center justify-center">
                    {talktimeData.reduce((acc, d) => acc + d.value, 0) === 0 ? (
                      <div className="w-28 h-28 rounded-full border-2 border-dashed border-dark-200 dark:border-dark-700 flex flex-col items-center justify-center text-center p-2">
                        <span className="text-lg font-bold text-dark-400 dark:text-dark-500">0s</span>
                        <span className="text-[9px] text-dark-400 dark:text-dark-500">No talktime</span>
                      </div>
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={talktimeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                          cursor="pointer"
                          onClick={(entry) =>
                            handleOpenDetailPage({
                              category: 'talktime',
                              subStatus: entry.name,
                              title: `Detailed Report: Talktime — ${entry.name}`,
                            })
                          }
                        >
                          {talktimeData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              cursor="pointer"
                              className="hover:opacity-80 transition-opacity cursor-pointer"
                              onClick={() =>
                                handleOpenDetailPage({
                                  category: 'talktime',
                                  subStatus: entry.name,
                                  title: `Detailed Report: Talktime — ${entry.name}`,
                                })
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<ClickableChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5 text-xs">
                    {talktimeData.map((item) => (
                      <div
                        key={item.name}
                        onClick={() =>
                          handleOpenDetailPage({
                            category: 'talktime',
                            subStatus: item.name,
                            title: `Detailed Report: Talktime — ${item.name}`,
                          })
                        }
                        className="flex items-center justify-between p-1.5 -mx-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700/60 cursor-pointer transition-colors group"
                        title={`Click to view detailed report for ${item.name}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full group-hover:scale-125 transition-transform"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-dark-600 dark:text-dark-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-dark-900 dark:text-white font-mono">
                            {item.label}
                          </span>
                          <ArrowUpRight
                            size={12}
                            className="text-dark-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footnote matching screenshot */}
              <p className="text-[11px] text-dark-400 dark:text-dark-500 pt-3 border-t border-dark-100 dark:border-dark-700/60 leading-relaxed">
                Note: Talktime is not pulse minutes. Pulse mins rounds up all outgoing calls to the nearest minute — see Menu &gt; Plans for details.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Team Performance View */}
      {activeTab === 'team' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4">
          <h3 className="font-bold text-dark-900 dark:text-white text-base">
            Telecaller Performance Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700 text-dark-400 uppercase font-bold">
                  <th className="py-3 px-3">Staff Member</th>
                  <th className="py-3 px-3">Outgoing</th>
                  <th className="py-3 px-3">Incoming</th>
                  <th className="py-3 px-3">Connected</th>
                  <th className="py-3 px-3">Talktime</th>
                  <th className="py-3 px-3">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60">
                {[
                  { name: user?.name || 'Current User', out: metrics.outgoing, inc: metrics.incoming, conn: filteredCalls.filter((c) => c.status === 'connected').length, talk: metrics.totalTalktime, eff: metrics.outgoing > 0 ? `${Math.round((filteredCalls.filter((c) => c.status === 'connected').length / metrics.outgoing) * 100)}%` : '—' },
                ].map((row) => (
                  <tr key={row.name} className="hover:bg-dark-50/50">
                    <td className="py-3 px-3 font-bold text-dark-900 dark:text-white">{row.name}</td>
                    <td className="py-3 px-3 font-semibold">{row.out}</td>
                    <td className="py-3 px-3 font-semibold">{row.inc}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-600">{row.conn}</td>
                    <td className="py-3 px-3 font-mono">{row.talk}</td>
                    <td className="py-3 px-3 font-bold text-blue-600">{row.eff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Customers View */}
      {activeTab === 'customers' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4">
          <h3 className="font-bold text-dark-900 dark:text-white text-base">
            Customer Call Engagement
          </h3>
          <p className="text-xs text-dark-500">
            Top customer interactions recorded across virtual DID lines.
          </p>
          <div className="space-y-2">
            <div className="py-8 text-center text-dark-400 text-xs">
              No customer engagement recordings logged yet for this reporting period.
            </div>
          </div>
        </div>
      )}

      {/* Switch Team Modal */}
      {showSwitchTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-dark-900 dark:text-white text-base">
                Switch Organization / Team
              </h3>
              <button
                onClick={() => setShowSwitchTeamModal(false)}
                className="text-dark-400 hover:text-dark-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { name: 'Main Business Team', number: 'Active' },
              ].map((tm) => (
                <div
                  key={tm.name}
                  onClick={() => {
                    setActiveTeam(tm);
                    setShowSwitchTeamModal(false);
                    addToast(`Switched active team view to ${tm.name}`, 'success');
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    activeTeam.name === tm.name
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold dark:bg-blue-950 dark:text-blue-300'
                      : 'border-dark-200 hover:bg-dark-50 text-dark-700'
                  }`}
                >
                  <div>
                    <p className="font-bold truncate max-w-[200px]">{tm.name}</p>
                    <p className="font-mono text-[11px] text-dark-500">{tm.number}</p>
                  </div>
                  {activeTeam.name === tm.name && <Check size={16} className="text-blue-600" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
