import { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Download,
  SlidersHorizontal,
  ChevronDown,
  Search,
  Calendar,
  Copy,
  Check,
  Building2,
  Users,
  Bot,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getCalls } from '../api/callHistory';
import { getNotes, createNote, deleteNote } from '../api/notes';

export default function Notes({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Filter States
  const [selectedTeam, setSelectedTeam] = useState('Main Team');
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');

  const [customerFilter, setCustomerFilter] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const [dateRangeText, setDateRangeText] = useState('Pick a date range');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Staff members list
  const staffList = user?.name ? [user.name] : ['All Staff'];

  // Notes data
  const [notesData, setNotesData] = useState([]);

  // Fetch notes from real backend API (/api/notes) with fallback to call remarks
  useEffect(() => {
    getNotes()
      .then((res) => {
        if (res.notes && res.notes.length > 0) {
          setNotesData(res.notes);
        } else {
          // If no custom notes logged yet, extract notes from call history remarks
          getCalls({ limit: 50 })
            .then((callRes) => {
              if (callRes.calls && callRes.calls.length > 0) {
                const mapped = callRes.calls
                  .filter((c) => c.remarks)
                  .map((c) => ({
                    id: c._id,
                    teamName: c.teamName || 'Main Team',
                    sfNumber: c.sfNumber || '',
                    customerName: c.customerName || 'Customer',
                    customerPhone: c.customerPhone || '',
                    dateOfCreation: c.date ? `${c.date} ${c.time || ''}` : 'Today',
                    noteShort: (c.remarks || '').slice(0, 100),
                    noteFull: c.remarks || '',
                    createdBy: c.calledByName || user?.name || 'Agent',
                  }));
                if (mapped.length > 0) {
                  setNotesData((prev) => [...mapped, ...prev]);
                }
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [user]);

  // Copy phone number
  const handleCopyPhone = (id, phone) => {
    navigator.clipboard?.writeText(phone);
    setCopiedId(id);
    addToast(`Phone ${phone} copied to clipboard`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle staff selection
  const handleToggleStaff = (name) => {
    if (selectedStaff.includes(name)) {
      setSelectedStaff(selectedStaff.filter((s) => s !== name));
    } else {
      setSelectedStaff([...selectedStaff, name]);
    }
  };

  const handleSelectAllStaff = () => {
    if (selectedStaff.length === staffList.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff([...staffList]);
    }
  };

  // Date Preset Selection
  const handleSelectDatePreset = (preset) => {
    setActivePreset(preset);
    if (preset === 'today') setDateRangeText('Today (09 Oct 2026)');
    if (preset === '7days') setDateRangeText('Last 7 days');
    if (preset === '30days') setDateRangeText('Last 30 days');
    if (preset === 'thismonth') setDateRangeText('This month (Oct 2026)');
    setDatePickerOpen(false);
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const headers = ['Team Name,Virtual Number,Customer,Phone,Date of Creation,Note,Created By\n'];
    const rows = filteredNotes.map(
      (n) =>
        `"${n.teamName}","${n.sfNumber}","${n.customerName}","${n.customerPhone}","${n.dateOfCreation}","${n.noteFull.replace(/"/g, '""')}","${n.createdBy}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Notes_Report_${Date.now()}.csv`;
    a.click();
    addToast('Call notes report downloaded as CSV', 'success');
  };

  // Filtered staff list
  const filteredStaffList = staffList.filter((s) =>
    s.toLowerCase().includes(staffSearch.toLowerCase())
  );

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notesData.filter((n) => {
      const matchStaff =
        selectedStaff.length === 0 || selectedStaff.includes(n.createdBy);
      const matchCustomer =
        !customerFilter ||
        n.customerName.toLowerCase().includes(customerFilter.toLowerCase()) ||
        n.customerPhone.includes(customerFilter);
      return matchStaff && matchCustomer;
    });
  }, [notesData, selectedStaff, customerFilter]);

  // Active filter count
  const activeFiltersCount =
    (selectedStaff.length > 0 ? 1 : 0) +
    (customerFilter ? 1 : 0) +
    (activePreset ? 1 : 0) +
    1; // Team is default 1

  return (
    <div className="space-y-4">
      {/* =========================================================================
          TOP HEADER ROW matching Screenshot 1
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold">
              <FileText size={18} />
            </div>
            <h1 className="text-xl font-bold text-dark-900 dark:text-white">Notes</h1>
          </div>
          <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
            Browse and export notes your team has logged on customer calls.
          </p>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
        >
          <Download size={15} />
          <span>Download</span>
        </button>
      </div>

      {/* =========================================================================
          FILTERS CARD matching Screenshots 1, 2, 3
          ========================================================================= */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-4 shadow-2xs space-y-3">
        {/* Filter Title + Badge */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-dark-500" />
          <span className="text-xs font-bold text-dark-800 dark:text-dark-200">Filters</span>
          <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center">
            {activeFiltersCount}
          </span>
        </div>

        {/* 4 Filter Dropdown Inputs in Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Filter 1: TEAM */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-dark-400 uppercase tracking-wider">
              TEAM
            </label>
            <div className="relative">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-medium rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Main Team">Main Team</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Filter 2: STAFF (Matches Screenshot 2 with multi-select dropdown) */}
          <div className="space-y-1 relative">
            <label className="block text-[11px] font-bold text-dark-400 uppercase tracking-wider">
              STAFF
            </label>
            <button
              type="button"
              onClick={() => {
                setStaffDropdownOpen(!staffDropdownOpen);
                setDatePickerOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
            >
              <span className="truncate text-dark-500">
                {selectedStaff.length === 0
                  ? 'Select staff'
                  : selectedStaff.length === 1
                  ? selectedStaff[0]
                  : `${selectedStaff.length} staff selected`}
              </span>
              <ChevronDown size={14} className="text-dark-400 shrink-0" />
            </button>

            {/* Dropdown Menu matching Screenshot 2 */}
            {staffDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-dark-800 rounded-xl border border-dark-200 dark:border-dark-700 shadow-xl p-3 space-y-2.5 min-w-[220px]">
                {/* Search Bar */}
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none"
                  />
                </div>

                {/* Select All */}
                <div className="pb-1 border-b border-dark-100 dark:border-dark-700">
                  <button
                    type="button"
                    onClick={handleSelectAllStaff}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {selectedStaff.length === staffList.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                {/* Staff Checkbox List */}
                <div className="max-h-44 overflow-y-auto space-y-2 pt-1">
                  {filteredStaffList.map((name) => (
                    <label
                      key={name}
                      className="flex items-center gap-2.5 text-xs text-dark-800 dark:text-dark-200 cursor-pointer hover:text-blue-600"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStaff.includes(name)}
                        onChange={() => handleToggleStaff(name)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter 3: CUSTOMER */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-dark-400 uppercase tracking-wider">
              CUSTOMER
            </label>
            <div className="relative">
              <input
                type="text"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                placeholder="Select Customer"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Filter 4: CREATED DATE (Matches Screenshot 3 with Date Preset Popover) */}
          <div className="space-y-1 relative">
            <label className="block text-[11px] font-bold text-dark-400 uppercase tracking-wider">
              CREATED DATE
            </label>
            <button
              type="button"
              onClick={() => {
                setDatePickerOpen(!datePickerOpen);
                setStaffDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
            >
              <div className="flex items-center gap-2 truncate">
                <Calendar size={14} className="text-dark-400 shrink-0" />
                <span className={dateRangeText === 'Pick a date range' ? 'text-dark-400' : 'font-semibold'}>
                  {dateRangeText}
                </span>
              </div>
            </button>

            {/* Date Range Modal / Popover matching Screenshot 3 */}
            {datePickerOpen && (
              <div className="absolute top-full right-0 mt-1 z-30 bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xl p-4 space-y-4 w-[340px] sm:w-[460px]">
                {/* Presets Pills matching Screenshot 3 */}
                <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-dark-100 dark:border-dark-700">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: '7days', label: 'Last 7 days' },
                    { id: '30days', label: 'Last 30 days' },
                    { id: 'thismonth', label: 'This month' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectDatePreset(p.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        activePreset === p.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-dark-50 dark:bg-dark-900 text-dark-700 dark:text-dark-300 hover:bg-dark-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Simulated 2-Month Calendar matching Screenshot 3 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Month 1: October 2026 */}
                  <div>
                    <div className="flex items-center justify-between font-bold text-dark-900 dark:text-white mb-2">
                      <ChevronLeft size={14} className="cursor-pointer" />
                      <span>October 2026</span>
                      <span />
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-dark-400 font-medium mb-1">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {[...Array(4)].map((_, i) => (
                        <span key={i} className="text-dark-300 p-1">2{7 + i}</span>
                      ))}
                      {[...Array(31)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setDateRangeText(`${i + 1} Oct 2026`);
                            setDatePickerOpen(false);
                          }}
                          className={`p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 ${
                            i + 1 === 9 ? 'bg-blue-600 text-white font-bold' : ''
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Month 2: November 2026 */}
                  <div>
                    <div className="flex items-center justify-between font-bold text-dark-900 dark:text-white mb-2">
                      <span />
                      <span>November 2026</span>
                      <ChevronRight size={14} className="cursor-pointer" />
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-dark-400 font-medium mb-1">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {[...Array(30)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setDateRangeText(`${i + 1} Nov 2026`);
                            setDatePickerOpen(false);
                          }}
                          className="p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950"
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-dark-100 dark:border-dark-700">
                  <button
                    onClick={() => {
                      setDateRangeText('Pick a date range');
                      setActivePreset(null);
                      setDatePickerOpen(false);
                    }}
                    className="text-xs text-dark-500 hover:text-dark-800 mr-3 font-semibold"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setDatePickerOpen(false)}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          NOTES DIRECTORY TABLE matching Screenshot 1
          ========================================================================= */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f0f7ff] dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 text-dark-700 dark:text-dark-300 font-bold whitespace-nowrap">
              <tr>
                <th className="py-3 px-4">Team Name</th>
                <th className="py-3 px-4">Virtual Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date of Creation</th>
                <th className="py-3 px-4 min-w-[320px]">Note</th>
                <th className="py-3 px-4">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60">
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-dark-400">
                    No notes found matching your filters
                  </td>
                </tr>
              ) : (
                filteredNotes.map((note) => {
                  const isExpanded = expandedNoteId === note.id;
                  return (
                    <tr
                      key={note.id}
                      className="hover:bg-dark-50/50 dark:hover:bg-dark-700/40 transition-colors align-top"
                    >
                      {/* Team Name */}
                      <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                        {note.teamName}
                      </td>

                      {/* SF Number */}
                      <td className="py-3.5 px-4 text-dark-600 dark:text-dark-300 whitespace-nowrap">
                        {note.sfNumber}
                      </td>

                      {/* Customer (Name + Phone + Copy Button) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => onNavigate?.('contacts')}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline block text-left"
                        >
                          {note.customerName}
                        </button>
                        <div className="flex items-center gap-1.5 text-[11px] text-dark-500 mt-0.5">
                          <span>{note.customerPhone}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(note.id, note.customerPhone)}
                            className="text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 transition-colors"
                            title="Copy number"
                          >
                            {copiedId === note.id ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Date of Creation */}
                      <td className="py-3.5 px-4 text-dark-500 dark:text-dark-400 whitespace-nowrap">
                        {note.dateOfCreation}
                      </td>

                      {/* Note with Show more / Show less toggle */}
                      <td className="py-3.5 px-4 text-dark-800 dark:text-dark-200 leading-relaxed">
                        <p className="text-xs">
                          {isExpanded ? note.noteFull : note.noteShort}
                        </p>
                        <button
                          type="button"
                          onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline block mt-1"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      </td>

                      {/* Created By */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                          {note.createdBy}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
