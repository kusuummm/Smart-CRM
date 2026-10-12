import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Search,
  Download,
  Copy,
  Check,
  Calendar,
  User,
  ArrowUpRight,
  X,
  Filter,
  FileSpreadsheet,
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function ReportDetails({
  filter = {},
  onBack,
  onNavigate,
  staffName = 'Kusum Rathore',
  period = 'Oct 09, 2026',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(filter.category || 'all');
  const [selectedSubStatus, setSelectedSubStatus] = useState(filter.subStatus || 'all');
  const [copiedPhone, setCopiedPhone] = useState(null);

  // Sync when prop filter changes
  useEffect(() => {
    if (filter.category) setSelectedCategory(filter.category);
    if (filter.subStatus) setSelectedSubStatus(filter.subStatus);
  }, [filter]);

  // Master Call Dataset Matching Reports Dashboard Exact Metrics
  const allCallRecords = useMemo(
    () => [
      // 1. Missed calls (2) - Not answered
      {
        _id: 'call-m1',
        customerName: 'Ramesh Verma',
        phone: '+91 98765 43210',
        company: 'Verma Exports Pvt Ltd',
        calledByName: staffName,
        callType: 'missed',
        subStatus: 'Not answered',
        date: 'Oct 09, 2026',
        time: '10:45 AM',
        duration: '0s',
        durationSec: 0,
        remarks: 'Ringing timeout, customer did not pick up after 6 rings',
      },
      {
        _id: 'call-m2',
        customerName: 'Anita Desai',
        phone: '+91 98123 45678',
        company: 'Desai Solutions & Tech',
        calledByName: staffName,
        callType: 'missed',
        subStatus: 'Not answered',
        date: 'Oct 09, 2026',
        time: '03:15 PM',
        duration: '0s',
        durationSec: 0,
        remarks: 'Incoming customer call missed while agent was on another call',
      },

      // 2. Incoming calls (4 total: 2 Answered, 2 Missed)
      {
        _id: 'call-i1',
        customerName: 'Vikram Singh',
        phone: '+91 99334 55667',
        company: 'Apex Realty Group',
        calledByName: staffName,
        callType: 'incoming',
        subStatus: 'Answered',
        date: 'Oct 09, 2026',
        time: '11:30 AM',
        duration: '1m 50s',
        durationSec: 110,
        remarks: 'Inbound inquiry regarding WhatsApp CRM API & pricing quotation',
      },
      {
        _id: 'call-i2',
        customerName: 'Swati Kulkarni',
        phone: '+91 99445 66778',
        company: 'Kulkarni Tech Solutions',
        calledByName: staffName,
        callType: 'incoming',
        subStatus: 'Answered',
        date: 'Oct 09, 2026',
        time: '03:00 PM',
        duration: '1m 24s',
        durationSec: 84,
        remarks: 'Customer requested consultation with sales team regarding CRM migration',
      },
      {
        _id: 'call-i3',
        customerName: 'Ramesh Verma',
        phone: '+91 98765 43210',
        company: 'Verma Exports Pvt Ltd',
        calledByName: staffName,
        callType: 'incoming',
        subStatus: 'Missed',
        date: 'Oct 09, 2026',
        time: '10:45 AM',
        duration: '0s',
        durationSec: 0,
        remarks: 'Inbound customer call missed',
      },
      {
        _id: 'call-i4',
        customerName: 'Anita Desai',
        phone: '+91 98123 45678',
        company: 'Desai Solutions & Tech',
        calledByName: staffName,
        callType: 'incoming',
        subStatus: 'Missed',
        date: 'Oct 09, 2026',
        time: '03:15 PM',
        duration: '0s',
        durationSec: 0,
        remarks: 'Inbound customer call disconnected',
      },

      // 3. Outgoing calls (11 total: 5 Connected, 6 Not connected)
      // Connected total talktime = 7m 55s (475 seconds)
      {
        _id: 'call-o1',
        customerName: 'Rajesh Gupta',
        phone: '+91 98220 11223',
        company: 'Gupta Traders',
        calledByName: staffName,
        callType: 'outgoing',
        subStatus: 'Connected',
        date: 'Oct 09, 2026',
        time: '11:10 AM',
        duration: '2m 15s',
        durationSec: 135,
        remarks: 'Discussed Enterprise Pro subscription and user license requirements',
      },
      {
        _id: 'call-o2',
        customerName: 'Sunita Rao',
        phone: '+91 98334 55667',
        company: 'Rao Logistics Hub',
        calledByName: staffName,
        callType: 'outgoing',
        subStatus: 'Connected',
        date: 'Oct 09, 2026',
        time: '12:05 PM',
        duration: '1m 40s',
        durationSec: 100,
        remarks: 'Follow-up on product demonstration, scheduled consultation meeting',
      },
      {
        _id: 'call-o3',
        customerName: 'Deepak Kumar',
        phone: '+91 98445 66778',
        company: 'Kumar Infotech',
        calledByName: staffName,
        callType: 'outgoing',
        subStatus: 'Connected',
        date: 'Oct 09, 2026',
        time: '02:20 PM',
        duration: '1m 20s',
        durationSec: 80,
        remarks: 'Clarified payment terms and GST invoice requirements',
      },
      {
        _id: 'call-o4',
        customerName: 'Pooja Mehta',
        phone: '+91 98556 77889',
        company: 'Mehta Textiles',
        calledByName: staffName,
        callType: 'outgoing',
        subStatus: 'Connected',
        date: 'Oct 09, 2026',
        time: '04:10 PM',
        duration: '1m 35s',
        durationSec: 95,
        remarks: 'Onboarding walkthrough for 5 telecaller accounts',
      },
      {
        _id: 'call-o5',
        customerName: 'Manish Joshi',
        phone: '+91 98667 88990',
        company: 'Joshi Automations',
        calledByName: staffName,
        callType: 'outgoing',
        subStatus: 'Connected',
        date: 'Oct 09, 2026',
        time: '05:30 PM',
        duration: '1m 05s',
        durationSec: 65,
        remarks: 'Introductory follow-up completed, marked lead status as Contacted',
      },

      // Not connected calls (6 total)
      {
        _id: 'call-o6',
        customerName: 'Amit Shah',
        phone: '+91 98778 99001',
        company: 'Shah Motors',
        calledByName: staffName,
        callType: 'outgoing',
        subStatus: 'Line busy',
        date: 'Oct 09, 2026',
        time: '10:15 AM',
        duration: '0s',
        durationSec: 0,
        remarks: 'Customer was busy on another phone call',
      },
      {
        _id: 'call-o7',
        customerName: 'Neha Agarwal',
        phone: '+91 98889 00112',
        company: 'Agarwal Spices',
        calledByName: staffName,
        callType: 'outgoing',
        subStatus: 'Not answered',
        date: 'Oct 09, 2026',
        time: '11:45 AM',
        duration: '0s',
        durationSec: 0,
        remarks: 'Dialed 30 seconds, no answer from customer',
      },
      {
        _id: 'call-o8',
        customerName: 'Rahul Nair',
        phone: '+91 98990 11223',
        company: 'Nair Logistics',
        calledByName: staffName,
        callType: 'outgoing',
        subStatus: 'No network',
        date: 'Oct 09, 2026',
        time: '01:10 PM',
        duration: '0s',
        durationSec: 0,
        remarks: 'Out of coverage area / network issue',
      },
      {
        _id: 'call-o9',
        customerName: 'Kavita Roy',
        phone: '+91 99001 22334',
        company: 'Roy Creations',
        calledByName: staffName,
        callType: 'outgoing',
        subStatus: 'Line busy',
        date: 'Oct 09, 2026',
        time: '02:45 PM',
        duration: '0s',
        durationSec: 0,
        remarks: 'Call rejected / disconnected by customer',
      },
      {
        _id: 'call-o10',
        customerName: 'Sanjay Patel',
        phone: '+91 99112 33445',
        company: 'Patel Electronics',
        calledByName: staffName,
        callType: 'outgoing',
        subStatus: 'Not answered',
        date: 'Oct 09, 2026',
        time: '03:50 PM',
        duration: '0s',
        durationSec: 0,
        remarks: 'No pickup after ringing',
      },
      {
        _id: 'call-o11',
        customerName: 'Divya Jain',
        phone: '+91 99223 44556',
        company: 'Jain Chemicals',
        calledByName: staffName,
        callType: 'outgoing',
        subStatus: 'No network',
        date: 'Oct 09, 2026',
        time: '04:40 PM',
        duration: '0s',
        durationSec: 0,
        remarks: 'Customer mobile switched off',
      },
    ],
    [staffName]
  );

  // Filter records based on category, subStatus, and search term
  const filteredCalls = useMemo(() => {
    let list = allCallRecords;

    // Filter by Category
    if (selectedCategory === 'missed') {
      list = list.filter((c) => c.callType === 'missed');
    } else if (selectedCategory === 'incoming') {
      list = list.filter((c) => c.callType === 'incoming');
    } else if (selectedCategory === 'outgoing') {
      list = list.filter((c) => c.callType === 'outgoing');
    } else if (selectedCategory === 'talktime') {
      list = list.filter((c) => c.durationSec > 0);
    }

    // Filter by Sub-status
    if (selectedSubStatus && selectedSubStatus !== 'all') {
      if (selectedSubStatus === 'Connected') {
        list = list.filter((c) => c.subStatus === 'Connected');
      } else if (selectedSubStatus === 'Not connected') {
        list = list.filter((c) => c.subStatus !== 'Connected');
      } else {
        list = list.filter(
          (c) => c.subStatus.toLowerCase() === selectedSubStatus.toLowerCase()
        );
      }
    }

    // Filter by Search Term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName?.toLowerCase().includes(term) ||
          c.phone?.includes(term) ||
          c.company?.toLowerCase().includes(term) ||
          c.subStatus?.toLowerCase().includes(term) ||
          c.remarks?.toLowerCase().includes(term)
      );
    }

    return list;
  }, [allCallRecords, selectedCategory, selectedSubStatus, searchTerm]);

  // Dynamic Statistics
  const totalCalls = filteredCalls.length;
  const totalDurationSec = filteredCalls.reduce((acc, c) => acc + (c.durationSec || 0), 0);
  const totalTalktimeFormatted =
    totalDurationSec > 0
      ? `${Math.floor(totalDurationSec / 60)}m ${totalDurationSec % 60}s`
      : '0s';

  const handleCopy = (phone) => {
    navigator.clipboard?.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!filteredCalls.length) return;
    const headers = ['Customer Name', 'Phone', 'Company', 'Staff', 'Call Type', 'Sub-Status', 'Date', 'Time', 'Duration', 'Remarks'];
    const rows = filteredCalls.map((c) => [
      `"${c.customerName || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.company || ''}"`,
      `"${c.calledByName || staffName}"`,
      `"${c.callType || ''}"`,
      `"${c.subStatus || ''}"`,
      `"${c.date || period}"`,
      `"${c.time || ''}"`,
      `"${c.duration || '0s'}"`,
      `"${(c.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `detailed_report_${selectedCategory}_${selectedSubStatus.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Connected':
      case 'Answered':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Not answered':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Line busy':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Missed':
      case 'Not connected':
      case 'No network':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getCallTypeIcon = (type) => {
    switch (type) {
      case 'incoming':
        return <PhoneIncoming size={14} className="text-blue-500" />;
      case 'outgoing':
        return <PhoneOutgoing size={14} className="text-emerald-500" />;
      case 'missed':
      default:
        return <PhoneMissed size={14} className="text-rose-500" />;
    }
  };

  // Human title
  const getHeaderTitle = () => {
    if (filter.title) return filter.title;
    if (selectedCategory === 'missed') {
      return selectedSubStatus !== 'all' ? `Missed Calls — ${selectedSubStatus}` : 'All Missed Calls Report';
    }
    if (selectedCategory === 'outgoing') {
      return selectedSubStatus !== 'all' ? `Outgoing Calls — ${selectedSubStatus}` : 'All Outgoing Calls Report';
    }
    if (selectedCategory === 'incoming') {
      return selectedSubStatus !== 'all' ? `Incoming Calls — ${selectedSubStatus}` : 'All Incoming Calls Report';
    }
    if (selectedCategory === 'talktime') {
      return selectedSubStatus !== 'all' ? `Talktime Breakdown — ${selectedSubStatus}` : 'Total Talktime Call Breakdown';
    }
    return 'Detailed Call Activity Report';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* 1. Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb with Back Button */}
          <div className="flex items-center gap-2 text-xs text-dark-500 dark:text-dark-400 mb-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Reports Overview</span>
            </button>
            <span>/</span>
            <span>Call Activity</span>
            <span>/</span>
            <span className="font-semibold text-dark-800 dark:text-dark-200 capitalize">
              {selectedCategory}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <PhoneCall size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <span>{getHeaderTitle()}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {totalCalls} {totalCalls === 1 ? 'Call' : 'Calls'}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5">
                Staff: <strong className="text-dark-800 dark:text-dark-200">{staffName}</strong> • Period:{' '}
                <strong className="text-dark-800 dark:text-dark-200">{period}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            disabled={filteredCalls.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} className="text-dark-500" />
            <span>Export CSV</span>
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate('call-history')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>View in Call History</span>
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Category Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold border-b border-dark-200 dark:border-dark-700">
        {[
          { id: 'all', label: 'All Report Calls', count: 17 },
          { id: 'missed', label: 'Missed Calls', count: 2 },
          { id: 'outgoing', label: 'Outgoing Calls', count: 11 },
          { id: 'incoming', label: 'Incoming Calls', count: 4 },
          { id: 'talktime', label: 'Talktime Calls', count: 7 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedCategory(tab.id);
              setSelectedSubStatus('all');
            }}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              selectedCategory === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 border border-dark-200 dark:border-dark-700'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedCategory === tab.id ? 'bg-white/20 text-white' : 'bg-dark-100 dark:bg-dark-700 text-dark-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 3. Four KPI Metric Cards for this View */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-1">
          <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">Calls in this View</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-dark-900 dark:text-white">
            {totalCalls}
          </p>
          <span className="text-[11px] text-dark-400">Total volume logged</span>
        </div>

        {/* Talktime */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-1">
          <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">Combined Talktime</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
            {totalTalktimeFormatted}
          </p>
          <span className="text-[11px] text-dark-400">Total conversation time</span>
        </div>

        {/* Active Filter */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-1">
          <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">Selected Filter</span>
          <p className="text-lg sm:text-xl font-bold text-dark-900 dark:text-white truncate capitalize">
            {selectedSubStatus !== 'all' ? selectedSubStatus : selectedCategory}
          </p>
          <span className="text-[11px] text-dark-400">Telemetry status</span>
        </div>

        {/* Staff Member */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs space-y-1">
          <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">Staff Member</span>
          <p className="text-lg sm:text-xl font-bold text-dark-900 dark:text-white truncate">
            {staffName}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Active Telecaller
          </span>
        </div>
      </div>

      {/* 4. Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-dark-400" size={15} />
          <input
            type="text"
            placeholder="Search by customer name, phone number, company, or remarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs bg-dark-50 dark:bg-dark-900 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-dark-400 hover:text-dark-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sub-status Quick Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-500 font-medium whitespace-nowrap">Sub-status:</span>
          <select
            value={selectedSubStatus}
            onChange={(e) => setSelectedSubStatus(e.target.value)}
            className="px-3 py-1.5 border border-dark-200 dark:border-dark-700 rounded-xl text-xs bg-white dark:bg-dark-900 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Sub-statuses</option>
            <option value="Not answered">Not answered</option>
            <option value="Connected">Connected</option>
            <option value="Answered">Answered</option>
            <option value="Line busy">Line busy</option>
            <option value="No network">No network</option>
            <option value="Missed">Missed</option>
            <option value="DND/Decline">DND / Decline</option>
          </select>

          {(selectedSubStatus !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedSubStatus('all');
                setSearchTerm('');
              }}
              className="text-xs text-blue-600 hover:underline font-semibold ml-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 5. Detailed Records Table */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-xs overflow-hidden">
        {filteredCalls.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-12 h-12 rounded-full bg-dark-100 dark:bg-dark-700 text-dark-400 flex items-center justify-center mx-auto">
              <Search size={22} />
            </div>
            <h3 className="font-bold text-dark-800 dark:text-dark-200 text-sm">
              No matching call records found
            </h3>
            <p className="text-xs text-dark-400 max-w-sm mx-auto">
              {searchTerm
                ? `No calls match "${searchTerm}". Try adjusting your search query.`
                : `There are currently 0 calls logged under "${selectedSubStatus}" for the selected reporting range.`}
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSubStatus('all');
              }}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Clear filters and view all calls
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-dark-50 dark:bg-dark-800/80 text-dark-500 dark:text-dark-400 uppercase font-bold text-[10px] tracking-wider border-b border-dark-200 dark:border-dark-700">
                  <th className="py-3 px-4">Customer / Contact</th>
                  <th className="py-3 px-3">Phone Number</th>
                  <th className="py-3 px-3">Staff</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Sub-Status</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3 text-right">Duration</th>
                  <th className="py-3 px-4">Call Remarks / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60 bg-white dark:bg-dark-900">
                {filteredCalls.map((call, idx) => (
                  <tr
                    key={call._id || idx}
                    className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {call.customerName ? call.customerName.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <p className="font-bold text-dark-900 dark:text-white truncate max-w-[170px]">
                            {call.customerName || 'Anonymous Customer'}
                          </p>
                          {call.company && (
                            <p className="text-[10px] text-dark-400 truncate max-w-[170px]">
                              {call.company}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-dark-700 dark:text-dark-300">
                        <span>{call.phone || '—'}</span>
                        {call.phone && (
                          <button
                            onClick={() => handleCopy(call.phone)}
                            className="text-dark-400 hover:text-dark-700 dark:hover:text-white"
                            title="Copy Phone Number"
                          >
                            {copiedPhone === call.phone ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Staff */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-dark-700 dark:text-dark-300">
                      {call.calledByName || staffName}
                    </td>

                    {/* Call Type */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize bg-dark-50 dark:bg-dark-800 text-dark-700 dark:text-dark-300">
                        {getCallTypeIcon(call.callType)}
                        <span>{call.callType || 'Call'}</span>
                      </div>
                    </td>

                    {/* Sub-Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                          call.subStatus
                        )}`}
                      >
                        {call.subStatus || 'Completed'}
                      </span>
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-dark-600 dark:text-dark-300">
                      <p className="font-semibold text-[11px]">{call.date || period}</p>
                      <p className="text-[10px] text-dark-400 font-mono">{call.time || '10:00 AM'}</p>
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-right font-mono font-bold text-dark-900 dark:text-white">
                      {call.duration || '0s'}
                    </td>

                    {/* Remarks */}
                    <td className="py-3.5 px-4 text-dark-500 dark:text-dark-400 max-w-[260px]">
                      <p className="truncate text-[11px]" title={call.remarks}>
                        {call.remarks || 'No notes logged'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-dark-500 dark:text-dark-400">
          <div>
            Showing <strong className="text-dark-900 dark:text-white">{filteredCalls.length}</strong> of{' '}
            <strong className="text-dark-900 dark:text-white">{allCallRecords.length}</strong> calls
          </div>

          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Return to Reports Graphs</span>
          </button>
        </div>
      </div>
    </div>
  );
}
