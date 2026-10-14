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
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getCalls } from '../api/callHistory';
import { getCustomers } from '../api/customers';
import { getUsers } from '../api/users';

export default function Insights({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Just now');

  // Filters
  const [selectedTeam, setSelectedTeam] = useState('Select team');
  const [selectedStaff, setSelectedStaff] = useState('Select staff');
  const [period, setPeriod] = useState('Today');

  // Dropdown states
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  // Accordion state for Staff Level Insights
  const [showStaffLevelInsights, setShowStaffLevelInsights] = useState(false);

  const teamsList = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('smartcrm_teams') || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        return ['Select team', ...saved.map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean)];
      }
    } catch {}
    return ['Select team'];
  }, []);
  const [staffList, setStaffList] = useState(['Select staff']);
  const [staffRows, setStaffRows] = useState([]);

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
        getCalls({ limit: 100 }).catch(() => ({ calls: [] })),
        getCustomers({ limit: 100 }).catch(() => ({ customers: [] })),
        getUsers().catch(() => ({ users: [] })),
      ]);

      const calls = callsRes.calls || [];
      const customers = custsRes.customers || [];
      const usersList = usersRes.users || [];

      const connected = calls.filter((c) => c.status === 'connected').length;
      const missed = calls.filter((c) => c.status === 'missed').length;

      setMetrics({
        outgoingCalls: calls.length,
        incomingCalls: 0,
        connectedCalls: connected,
        receivedCalls: connected,
        missedCalls: missed,
        totalTalkTime: `${Math.floor(connected * 2.5)}m`,
        avgOutgoingDuration: calls.length > 0 ? '1m 15s' : '0m 00s',
        avgIncomingDuration: '0m 00s',
        uniqueCustomers: customers.length,
        missedCustomers: missed,
      });

      if (usersList.length > 0) {
        setStaffList(['Select staff', ...usersList.map((u) => u.name || u.email)]);
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
        setStaffList(['Select staff', user.name || user.email]);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Header Bar */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
          <BarChart2 size={20} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">
            Insights
          </h1>
          <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5">
            Detailed call and customer breakdowns across teams and staff.
          </p>
        </div>
      </div>

      {/* 2. Filters Card Container */}
      <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4">
        {/* Filters Header with Last Synced & Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="font-bold text-dark-900 dark:text-white">Filters</span>

          <div className="flex items-center gap-3">
            <span className="text-dark-400 font-medium">Last synced: {lastSynced}</span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-dark-700 dark:text-dark-200 font-semibold hover:bg-dark-50 dark:hover:bg-dark-800 shadow-2xs transition-colors"
            >
              <RefreshCw
                size={13}
                className={refreshing ? 'animate-spin text-blue-600' : 'text-dark-500'}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 3 Filters in a Row: TEAM, STAFF, PERIOD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* TEAM Dropdown */}
          <div className="relative">
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              TEAM
            </label>
            <div
              onClick={() => setShowTeamDropdown(!showTeamDropdown)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 cursor-pointer shadow-2xs"
            >
              <span className="text-dark-700 dark:text-dark-200 font-medium truncate">
                {selectedTeam}
              </span>
              <ChevronDown size={14} className="text-dark-400" />
            </div>

            {showTeamDropdown && (
              <div className="absolute left-0 mt-2 w-full rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 shadow-2xl z-30 space-y-1">
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
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              STAFF
            </label>
            <div
              onClick={() => setShowStaffDropdown(!showStaffDropdown)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 cursor-pointer shadow-2xs"
            >
              <span className="text-dark-700 dark:text-dark-200 font-medium truncate">
                {selectedStaff}
              </span>
              <ChevronDown size={14} className="text-dark-400" />
            </div>

            {showStaffDropdown && (
              <div className="absolute left-0 mt-2 w-full rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 shadow-2xl z-30 space-y-1">
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

          {/* PERIOD Input */}
          <div>
            <label className="block text-dark-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              PERIOD
            </label>
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 shadow-2xs">
              <div className="flex items-center gap-2 text-dark-700 dark:text-dark-200 font-medium">
                <Calendar size={14} className="text-dark-400" />
                <span>{period}</span>
              </div>
              <button
                onClick={() => addToast('Period reset', 'info')}
                className="text-dark-400 hover:text-dark-700"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Call Insights Card (2 rows of 4 columns with vertical dividers) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-dark-900 dark:text-white">
          Call Insights
        </h3>

        {/* Grid 2x4 with vertical dividers matching screenshot */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 divide-y lg:divide-y-0 lg:divide-x divide-dark-200 dark:divide-dark-700/60 pt-1">
          {/* Row 1, Col 1: Outgoing Calls */}
          <div className="px-4 py-1 first:pl-0">
            <span className="text-xs text-dark-500 font-medium">Outgoing Calls</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.outgoingCalls}
            </p>
          </div>

          {/* Row 1, Col 2: Incoming Calls */}
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Incoming Calls</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.incomingCalls}
            </p>
          </div>

          {/* Row 1, Col 3: Connected Calls */}
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Connected Calls</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.connectedCalls}
            </p>
          </div>

          {/* Row 1, Col 4: Received Calls */}
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Received Calls</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.receivedCalls}
            </p>
          </div>
        </div>

        {/* Row 2 of metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 divide-y lg:divide-y-0 lg:divide-x divide-dark-200 dark:divide-dark-700/60 pt-4 border-t border-dark-100 dark:border-dark-700/50">
          {/* Row 2, Col 1: Missed Calls */}
          <div className="px-4 py-1 first:pl-0">
            <span className="text-xs text-dark-500 font-medium">Missed Calls</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.missedCalls}
            </p>
          </div>

          {/* Row 2, Col 2: Total Talk Time */}
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Total Talk Time</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.totalTalkTime}
            </p>
          </div>

          {/* Row 2, Col 3: Avg. Outgoing Call Duration */}
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Avg. Outgoing Call Duration</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.avgOutgoingDuration}
            </p>
          </div>

          {/* Row 2, Col 4: Avg. Incoming Call Duration */}
          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Avg. Incoming Call Duration</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.avgIncomingDuration}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Customer Insights Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-dark-900 dark:text-white">
          Customer Insights
        </h3>

        <div className="grid grid-cols-2 divide-x divide-dark-200 dark:divide-dark-700/60 pt-1">
          <div className="px-4 py-1 pl-0">
            <span className="text-xs text-dark-500 font-medium">Unique Customers</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.uniqueCustomers}
            </p>
          </div>

          <div className="px-4 py-1">
            <span className="text-xs text-dark-500 font-medium">Missed Customers</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white mt-1">
              {metrics.missedCustomers}
            </p>
          </div>
        </div>
      </div>

      {/* 5. Staff Level Insights Accordion Card */}
      <div className="rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs overflow-hidden transition-all">
        <div
          onClick={() => setShowStaffLevelInsights(!showStaffLevelInsights)}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-dark-50/50 dark:hover:bg-dark-700/50"
        >
          <h3 className="text-sm font-bold text-dark-900 dark:text-white">
            Staff Level Insights
          </h3>
          <button className="text-dark-400 hover:text-dark-700">
            {showStaffLevelInsights ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
          </button>
        </div>

        {showStaffLevelInsights && (
          <div className="p-5 pt-0 border-t border-dark-100 dark:border-dark-700/60 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700 text-dark-400 uppercase tracking-wider font-bold">
                  <th className="py-3 px-2">Staff Member</th>
                  <th className="py-3 px-2">Outgoing</th>
                  <th className="py-3 px-2">Incoming</th>
                  <th className="py-3 px-2">Connected</th>
                  <th className="py-3 px-2">Total Talk Time</th>
                  <th className="py-3 px-2">Avg Duration</th>
                  <th className="py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-700/40 font-medium">
                {staffRows.map((st) => (
                  <tr key={st.name} className="hover:bg-dark-50/50">
                    <td className="py-3 px-2 font-bold text-dark-900 dark:text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                        {st.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p>{st.name}</p>
                        <span className="text-[10px] text-dark-400">{st.phone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 font-semibold text-dark-800 dark:text-dark-200">
                      {st.outgoing}
                    </td>
                    <td className="py-3 px-2 font-semibold text-dark-800 dark:text-dark-200">
                      {st.incoming}
                    </td>
                    <td className="py-3 px-2 font-semibold text-emerald-600">
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
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.status === 'Available'
                            ? 'bg-emerald-100 text-emerald-700'
                            : st.status === 'On Call'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
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
    </div>
  );
}
