import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

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

  // KPI Metrics
  const metrics = {
    missed: 2,
    outgoing: 11,
    incoming: 2,
    totalTalktime: '11m 9s',
  };

  // Donut 1: Missed calls breakdown
  const missedData = [
    { name: 'DND/Decline', value: 0, color: '#94a3b8' },
    { name: 'Line busy', value: 0, color: '#f59e0b' },
    { name: 'No network', value: 0, color: '#ef4444' },
    { name: 'Not answered', value: 2, color: '#8b5cf6' },
  ];

  // Donut 2: Incoming calls breakdown
  const incomingData = [
    { name: 'Answered', value: 2, color: '#10b981' },
    { name: 'Missed', value: 2, color: '#ef4444' },
    { name: 'DND', value: 0, color: '#64748b' },
  ];

  // Donut 3: Outgoing calls breakdown
  const outgoingData = [
    { name: 'Not connected', value: 6, color: '#ef4444' },
    { name: 'Connected', value: 5, color: '#10b981' },
  ];

  // Donut 4: Total talktime breakdown
  const talktimeData = [
    { name: 'Outgoing', value: 475, label: '7m 55s', color: '#3b82f6' },
    { name: 'Incoming', value: 194, label: '3m 14s', color: '#06b6d4' },
  ];

  const removeStaffFilter = (staffName) => {
    setSelectedStaffList((prev) => prev.filter((s) => s !== staffName));
  };

  const resetFilters = () => {
    setSelectedStaffList(allStaffMembers);
    setPeriod('Oct 09, 2026 – Oct 09, 2026');
    addToast('Filters reset to default', 'info');
  };

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
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-500">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                  <PhoneMissed size={16} />
                </div>
                <span className="text-xs font-semibold text-dark-600 dark:text-dark-300">
                  Missed
                </span>
              </div>
              <p className="text-3xl font-extrabold text-dark-900 dark:text-white">
                {metrics.missed}
              </p>
            </div>

            {/* Card 2: Outgoing Calls */}
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
                  <PhoneOutgoing size={16} />
                </div>
                <span className="text-xs font-semibold text-dark-600 dark:text-dark-300">
                  Outgoing
                </span>
              </div>
              <p className="text-3xl font-extrabold text-dark-900 dark:text-white">
                {metrics.outgoing}
              </p>
            </div>

            {/* Card 3: Incoming Calls */}
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
                  <PhoneIncoming size={16} />
                </div>
                <span className="text-xs font-semibold text-dark-600 dark:text-dark-300">
                  Incoming
                </span>
              </div>
              <p className="text-3xl font-extrabold text-dark-900 dark:text-white">
                {metrics.incoming}
              </p>
            </div>

            {/* Card 4: Total talktime */}
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-purple-600">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <span className="text-xs font-semibold text-dark-600 dark:text-dark-300">
                  Total talktime
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
                  <h3 className="font-bold text-dark-900 dark:text-white text-sm">
                    Missed calls
                  </h3>
                  <p className="text-[11px] text-dark-400 mt-0.5">
                    Breakdown for the selected range
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-dark-400 font-bold uppercase">TOTAL</span>
                  <p className="font-extrabold text-dark-900 dark:text-white text-lg">2</p>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="w-36 h-36 relative flex-shrink-0">
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
                      >
                        {missedData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  {missedData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-dark-600 dark:text-dark-300">{item.name}</span>
                      </div>
                      <span className="font-bold text-dark-900 dark:text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 2: Incoming calls breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-dark-900 dark:text-white text-sm">
                    Incoming calls
                  </h3>
                  <p className="text-[11px] text-dark-400 mt-0.5">
                    Breakdown for the selected range
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-dark-400 font-bold uppercase">TOTAL</span>
                  <p className="font-extrabold text-dark-900 dark:text-white text-lg">4</p>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="w-36 h-36 relative flex-shrink-0">
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
                      >
                        {incomingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  {incomingData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-dark-600 dark:text-dark-300">{item.name}</span>
                      </div>
                      <span className="font-bold text-dark-900 dark:text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 3: Outgoing calls breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-dark-900 dark:text-white text-sm">
                    Outgoing calls
                  </h3>
                  <p className="text-[11px] text-dark-400 mt-0.5">
                    Breakdown for the selected range
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-dark-400 font-bold uppercase">TOTAL</span>
                  <p className="font-extrabold text-dark-900 dark:text-white text-lg">11</p>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="w-36 h-36 relative flex-shrink-0">
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
                      >
                        {outgoingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  {outgoingData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-dark-600 dark:text-dark-300">{item.name}</span>
                      </div>
                      <span className="font-bold text-dark-900 dark:text-white">{item.value}</span>
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
                    <h3 className="font-bold text-dark-900 dark:text-white text-sm">
                      Total talktime
                    </h3>
                    <p className="text-[11px] text-dark-400 mt-0.5">
                      Breakdown for the selected range
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-dark-400 font-bold uppercase">TOTAL</span>
                    <p className="font-extrabold text-dark-900 dark:text-white text-lg">11m 9s</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-4">
                  <div className="w-36 h-36 relative flex-shrink-0">
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
                        >
                          {talktimeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex-1 space-y-2 text-xs">
                    {talktimeData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-dark-600 dark:text-dark-300">{item.name}</span>
                        </div>
                        <span className="font-bold text-dark-900 dark:text-white font-mono">
                          {item.label}
                        </span>
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
                  { name: user?.name || 'Current User', out: 0, inc: 0, conn: 0, talk: '0m 00s', eff: '—' },
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
