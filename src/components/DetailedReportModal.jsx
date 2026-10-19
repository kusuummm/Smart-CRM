import { useState, useMemo } from 'react';
import {
  X,
  Search,
  Download,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  User,
  Phone,
  Copy,
  Check,
  Calendar,
  ExternalLink,
  Filter,
  FileSpreadsheet,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export default function DetailedReportModal({
  isOpen,
  onClose,
  title,
  subtitle,
  category = 'all',
  subStatus = 'all',
  staffName = 'Kusum Rathore',
  period = 'Oct 09, 2026',
  calls = [],
  onNavigate,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(null);

  // Filter calls by search term
  const filteredCalls = useMemo(() => {
    if (!searchTerm.trim()) return calls;
    const term = searchTerm.toLowerCase();
    return calls.filter(
      (c) =>
        (c.customerName && c.customerName.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.subStatus && c.subStatus.toLowerCase().includes(term)) ||
        (c.remarks && c.remarks.toLowerCase().includes(term)) ||
        (c.calledByName && c.calledByName.toLowerCase().includes(term))
    );
  }, [calls, searchTerm]);

  // Calculate quick stats
  const totalCalls = filteredCalls.length;
  const connectedCount = filteredCalls.filter(
    (c) => c.subStatus === 'Connected' || c.subStatus === 'Answered'
  ).length;

  const handleCopy = (phone) => {
    navigator.clipboard?.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!filteredCalls.length) return;
    const headers = ['Customer Name', 'Phone', 'Staff', 'Call Type', 'Sub-Status', 'Date', 'Time', 'Duration', 'Remarks'];
    const rows = filteredCalls.map((c) => [
      `"${c.customerName || ''}"`,
      `"${c.phone || ''}"`,
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
    link.setAttribute('download', `detailed_call_report_${category}_${subStatus.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for badge colors
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Connected':
      case 'Answered':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Not answered':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50 dark:bg-dark-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <PhoneCall size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-dark-900 dark:text-white">
                  {title || 'Detailed Call Activity Report'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  {totalCalls} {totalCalls === 1 ? 'Record' : 'Records'}
                </span>
              </div>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                {subtitle || `Detailed drill-down for ${staffName} • ${period}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 text-dark-400 hover:text-dark-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Stats & Search & Export */}
        <div className="p-4 sm:p-5 border-b border-dark-100 dark:border-dark-700/60 bg-white dark:bg-dark-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-dark-400" size={15} />
            <input
              type="text"
              placeholder="Search by customer name, phone, or remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-dark-200 dark:border-dark-700 rounded-xl text-xs bg-dark-50 dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-dark-400 hover:text-dark-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCsv}
              disabled={filteredCalls.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download size={14} className="text-dark-500" />
              <span>Export CSV</span>
            </button>

            {onNavigate && (
              <button
                onClick={() => {
                  onClose();
                  onNavigate('call-history');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>View in Call History</span>
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Call Logs Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredCalls.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-full bg-dark-100 dark:bg-dark-800 text-dark-400 flex items-center justify-center mx-auto">
                <Search size={22} />
              </div>
              <h3 className="font-bold text-dark-800 dark:text-dark-200 text-sm">
                No matching call records found
              </h3>
              <p className="text-xs text-dark-400 max-w-sm mx-auto">
                {searchTerm
                  ? `No calls match "${searchTerm}". Try resetting your search filter.`
                  : `There are currently 0 calls logged under "${subStatus}" for the selected reporting range.`}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-dark-200 dark:border-dark-700">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-dark-50 dark:bg-dark-800/80 text-dark-500 dark:text-dark-400 uppercase font-bold text-[10px] tracking-wider border-b border-dark-200 dark:border-dark-700">
                    <th className="py-3 px-3.5">Customer / Contact</th>
                    <th className="py-3 px-3">Phone Number</th>
                    <th className="py-3 px-3">Staff</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Sub-Status</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3 text-right">Duration</th>
                    <th className="py-3 px-3.5">Call Remarks / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800 bg-white dark:bg-dark-900">
                  {filteredCalls.map((call, idx) => (
                    <tr
                      key={call._id || idx}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                    >
                      {/* Customer Name */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                            {call.customerName ? call.customerName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <p className="font-bold text-dark-900 dark:text-white truncate max-w-[150px]">
                              {call.customerName || 'Anonymous Customer'}
                            </p>
                            {call.company && (
                              <p className="text-[10px] text-dark-400 truncate max-w-[150px]">
                                {call.company}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-3 whitespace-nowrap">
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
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-dark-700 dark:text-dark-300">
                        {call.calledByName || staffName}
                      </td>

                      {/* Call Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize bg-dark-50 dark:bg-dark-800 text-dark-700 dark:text-dark-300">
                          {getCallTypeIcon(call.callType)}
                          <span>{call.callType || 'Call'}</span>
                        </div>
                      </td>

                      {/* Sub-Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                            call.subStatus
                          )}`}
                        >
                          {call.subStatus || 'Completed'}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-3 whitespace-nowrap text-dark-600 dark:text-dark-300">
                        <p className="font-semibold text-[11px]">{call.date || period}</p>
                        <p className="text-[10px] text-dark-400 font-mono">{call.time || '10:00 AM'}</p>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3 whitespace-nowrap text-right font-mono font-bold text-dark-900 dark:text-white">
                        {call.duration || '0s'}
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-3.5 text-dark-500 dark:text-dark-400 max-w-[220px]">
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
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-800/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-dark-500 dark:text-dark-400 text-[11px]">
            <span>
              Showing <strong className="text-dark-900 dark:text-white">{filteredCalls.length}</strong> of{' '}
              <strong className="text-dark-900 dark:text-white">{calls.length}</strong> calls
            </span>
            <span>•</span>
            <span>Staff Filter: <strong className="text-dark-900 dark:text-white">{staffName}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-dark-200 hover:bg-dark-300 dark:bg-dark-700 dark:hover:bg-dark-600 text-dark-800 dark:text-white font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
