import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  PhoneCall,
  TrendingUp,
  Target,
  Send,
  MessageSquare,
  Users,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Award,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Download,
  Check,
  X,
  MessageCircle,
  HelpCircle,
  Shield,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { isAdminOrOwner, isManager } from '../utils/permissions';
import {
  submitEod,
  getMyTodayEod,
  getMyEodHistory,
  getAllEods,
  getEodSummary,
  reviewEod,
} from '../api/eod';
import Modal from '../components/Modal';

export default function EodSheet({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdminOrMgr = isAdminOrOwner(user) || isManager(user);

  // Active View Tab: For Admin: 'oversight' | 'my-eod'. For Member: 'my-eod'
  const [activeTab, setActiveTab] = useState(isAdminOrMgr ? 'oversight' : 'my-eod');

  // Today date formatted
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // -------------------------------------------------------------
  // MEMBER STATE
  // -------------------------------------------------------------
  const [loadingMember, setLoadingMember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoMetricsLoaded, setAutoMetricsLoaded] = useState(false);

  const [formData, setFormData] = useState({
    date: todayStr,
    callsMade: 0,
    callsConnected: 0,
    talkTime: '0s',
    leadsGenerated: 0,
    dealsClosed: 0,
    followUpsDone: 0,
    meetingsScheduled: 0,
    keyAchievements: '',
    challenges: '',
    planForTomorrow: '',
  });

  const [existingEod, setExistingEod] = useState(null);
  const [myHistory, setMyHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // -------------------------------------------------------------
  // ADMIN / MANAGER STATE
  // -------------------------------------------------------------
  const [adminSummary, setAdminSummary] = useState(null);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');

  // Review Modal State
  const [selectedReportForReview, setSelectedReportForReview] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // -------------------------------------------------------------
  // LOAD MEMBER TODAY DATA
  // -------------------------------------------------------------
  const loadMemberToday = useCallback(async (date = todayStr) => {
    setLoadingMember(true);
    try {
      const res = await getMyTodayEod(date);
      if (res && res.success) {
        if (res.existingEod) {
          setExistingEod(res.existingEod);
          setFormData({
            date: res.existingEod.date || date,
            callsMade: res.existingEod.callsMade || 0,
            callsConnected: res.existingEod.callsConnected || 0,
            talkTime: res.existingEod.talkTime || '0s',
            leadsGenerated: res.existingEod.leadsGenerated || 0,
            dealsClosed: res.existingEod.dealsClosed || 0,
            followUpsDone: res.existingEod.followUpsDone || 0,
            meetingsScheduled: res.existingEod.meetingsScheduled || 0,
            keyAchievements: res.existingEod.keyAchievements || '',
            challenges: res.existingEod.challenges || '',
            planForTomorrow: res.existingEod.planForTomorrow || '',
          });
        } else if (res.autoMetrics) {
          // Pre-fill with today's real CRM telephony metrics
          setExistingEod(null);
          setFormData((prev) => ({
            ...prev,
            date,
            callsMade: res.autoMetrics.callsMade || 0,
            callsConnected: res.autoMetrics.callsConnected || 0,
            talkTime: res.autoMetrics.talkTime || '0s',
            followUpsDone: res.autoMetrics.followUpsDone || 0,
            leadsGenerated: res.autoMetrics.leadsGenerated || 0,
            dealsClosed: res.autoMetrics.dealsClosed || 0,
          }));
        }
        setAutoMetricsLoaded(true);
      }
    } catch (err) {
      // Fallback: check localStorage for offline support
      try {
        const stored = JSON.parse(localStorage.getItem(`smartcrm_eod_${user?._id}_${date}`) || 'null');
        if (stored) {
          setExistingEod(stored);
          setFormData(stored);
        }
      } catch {}
    } finally {
      setLoadingMember(false);
    }
  }, [todayStr, user]);

  const loadMemberHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await getMyEodHistory({ limit: 30 });
      if (res && res.success) {
        setMyHistory(res.eods || []);
      }
    } catch {
      // Fallback local history
      try {
        const localList = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`smartcrm_eod_${user?._id}_`)) {
            localList.push(JSON.parse(localStorage.getItem(key)));
          }
        }
        setMyHistory(localList);
      } catch {}
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  // -------------------------------------------------------------
  // LOAD ADMIN SUMMARY & ALL SUBMISSIONS
  // -------------------------------------------------------------
  const loadAdminData = useCallback(async (date = selectedDate) => {
    setLoadingAdmin(true);
    try {
      const [summaryRes, allRes] = await Promise.all([
        getEodSummary(date).catch(() => null),
        getAllEods({ date }).catch(() => null),
      ]);

      if (summaryRes && summaryRes.success) {
        setAdminSummary(summaryRes);
      }
      if (allRes && allRes.success) {
        setAllSubmissions(allRes.eods || []);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoadingAdmin(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadMemberToday(todayStr);
    loadMemberHistory();
    if (isAdminOrMgr) {
      loadAdminData(selectedDate);
    }
  }, [loadMemberToday, loadMemberHistory, loadAdminData, isAdminOrMgr, todayStr, selectedDate]);

  // -------------------------------------------------------------
  // SUBMIT MEMBER EOD
  // -------------------------------------------------------------
  const handleSubmitEod = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        date: formData.date || todayStr,
      };

      const res = await submitEod(payload);
      if (res && res.success) {
        setExistingEod(res.eod);
        addToast('EOD Sheet submitted successfully!', 'success');
        // Cache locally for offline backup
        localStorage.setItem(`smartcrm_eod_${user?._id}_${payload.date}`, JSON.stringify(res.eod));
        loadMemberHistory();
        if (isAdminOrMgr) loadAdminData(selectedDate);
      }
    } catch (err) {
      // Save locally if offline
      const localBackup = {
        ...formData,
        userId: user?._id,
        userName: user?.name,
        status: 'submitted',
        submittedAt: new Date(),
      };
      localStorage.setItem(`smartcrm_eod_${user?._id}_${formData.date}`, JSON.stringify(localBackup));
      setExistingEod(localBackup);
      addToast('EOD saved locally to your device', 'success');
      loadMemberHistory();
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // SUBMIT ADMIN REVIEW
  // -------------------------------------------------------------
  const handleReviewSubmit = async () => {
    if (!selectedReportForReview) return;
    setSubmittingReview(true);
    try {
      const res = await reviewEod(selectedReportForReview._id, {
        adminFeedback: reviewFeedback,
        status: 'reviewed',
      });
      if (res && res.success) {
        addToast('Feedback and review recorded', 'success');
        setSelectedReportForReview(null);
        setReviewFeedback('');
        loadAdminData(selectedDate);
      }
    } catch {
      addToast('Failed to save review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // -------------------------------------------------------------
  // CSV EXPORT
  // -------------------------------------------------------------
  const exportEodCsv = () => {
    const list = allSubmissions.length > 0 ? allSubmissions : myHistory;
    if (!list.length) {
      addToast('No EOD records available to export', 'info');
      return;
    }

    const headers = [
      'Date',
      'Staff Name',
      'Email',
      'Calls Made',
      'Calls Connected',
      'Talk Time',
      'Leads Generated',
      'Deals Closed',
      'Follow-ups Done',
      'Achievements',
      'Challenges',
      'Plan For Tomorrow',
      'Status',
      'Admin Feedback',
    ];

    const rows = list.map((item) => [
      `"${item.date || ''}"`,
      `"${item.userName || ''}"`,
      `"${item.userEmail || ''}"`,
      item.callsMade || 0,
      item.callsConnected || 0,
      `"${item.talkTime || '0s'}"`,
      item.leadsGenerated || 0,
      item.dealsClosed || 0,
      item.followUpsDone || 0,
      `"${(item.keyAchievements || '').replace(/"/g, '""')}"`,
      `"${(item.challenges || '').replace(/"/g, '""')}"`,
      `"${(item.planForTomorrow || '').replace(/"/g, '""')}"`,
      `"${item.status || ''}"`,
      `"${(item.adminFeedback || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EOD_Report_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('EOD Sheet exported to CSV', 'success');
  };

  // -------------------------------------------------------------
  // WHATSAPP NUDGE TO MISSING MEMBERS
  // -------------------------------------------------------------
  const handleNudgeMember = (member) => {
    const phone = (member.phone || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hi ${member.name}, this is a reminder from CRM management to submit your End of Day (EOD) sheet for today (${selectedDate}). Thank you!`
    );
    if (phone) {
      window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${text}`, '_blank');
    } else {
      addToast(`Opening chat for ${member.name}`, 'info');
      onNavigate?.('whatsapp');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-150">
      {/* 1. Header with Role Badges */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-dark-900 dark:text-white">
                End of Day (EOD) Sheet
              </h1>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/40">
                Daily Accountability
              </span>
            </div>
            <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-0.5">
              Submit everyday calling milestones, conversions, blockers, and tomorrow&apos;s pipeline plan.
            </p>
          </div>
        </div>

        {/* Tab Switcher for Admin / Manager */}
        {isAdminOrMgr && (
          <div className="flex items-center p-1 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('oversight')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'oversight'
                  ? 'bg-white dark:bg-dark-800 text-blue-600 shadow-2xs font-bold'
                  : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
              }`}
            >
              <Shield size={14} />
              <span>Team Oversight Console</span>
            </button>
            <button
              onClick={() => setActiveTab('my-eod')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'my-eod'
                  ? 'bg-white dark:bg-dark-800 text-blue-600 shadow-2xs font-bold'
                  : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
              }`}
            >
              <Edit3 size={14} />
              <span>My EOD Sheet</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SECTION A: ADMIN / MANAGER TEAM OVERSIGHT CONSOLE         */}
      {/* ========================================================= */}
      {isAdminOrMgr && activeTab === 'oversight' && (
        <div className="space-y-6">
          {/* Top Controls: Date Picker, Refresh, CSV Export */}
          <div className="p-4 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-dark-700 dark:text-dark-200">Inspect Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-dark-800 dark:text-dark-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              />
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-2.5 py-1.5 rounded-lg bg-dark-50 dark:bg-dark-900 text-dark-600 dark:text-dark-300 hover:bg-dark-100 font-medium transition-colors"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadAdminData(selectedDate)}
                disabled={loadingAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-dark-700 dark:text-dark-200 font-semibold hover:bg-dark-50 dark:hover:bg-dark-800 shadow-2xs transition-colors cursor-pointer"
              >
                <RefreshCw
                  size={13}
                  className={loadingAdmin ? 'animate-spin text-blue-600' : 'text-dark-500'}
                />
                <span>Refresh</span>
              </button>
              <button
                onClick={exportEodCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Download size={13} />
                <span>Export EOD CSV</span>
              </button>
            </div>
          </div>

          {/* Oversight KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Submission Rate */}
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-dark-600 dark:text-dark-400">
                  Submission Rate
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-dark-900 dark:text-white mt-3">
                {adminSummary?.submissionRate || '0%'}
              </p>
              <span className="text-[11px] text-dark-500 font-medium mt-1 block">
                {adminSummary?.submittedCount || 0} of {adminSummary?.totalMembers || 0} members submitted
              </span>
            </div>

            {/* 2. Missing Submissions */}
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-dark-600 dark:text-dark-400">
                  Missing EODs
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center font-bold">
                  <AlertCircle size={16} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-rose-600 dark:text-rose-400 mt-3">
                {adminSummary?.missingCount || 0}
              </p>
              <span className="text-[11px] text-dark-500 font-medium mt-1 block">
                {adminSummary?.missingCount > 0 ? 'Requires follow-up reminder' : 'All members submitted!'}
              </span>
            </div>

            {/* 3. Team Calls Reported */}
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-dark-600 dark:text-dark-400">
                  Calls Reported Today
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                  <Phone size={16} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-600 dark:text-emerald-400 mt-3">
                {adminSummary?.totals?.callsMade || 0}
              </p>
              <span className="text-[11px] text-dark-500 font-medium mt-1 block">
                {adminSummary?.totals?.callsConnected || 0} connected calls
              </span>
            </div>

            {/* 4. Deals & Leads Closed */}
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-dark-600 dark:text-dark-400">
                  Deals Closed Today
                </span>
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-600 flex items-center justify-center font-bold">
                  <Award size={16} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-violet-600 dark:text-violet-400 mt-3">
                {adminSummary?.totals?.dealsClosed || 0}
              </p>
              <span className="text-[11px] text-dark-500 font-medium mt-1 block">
                {adminSummary?.totals?.leadsGenerated || 0} fresh leads generated
              </span>
            </div>
          </div>

          {/* Missing Submissions Queue (If any) */}
          {adminSummary?.missing && adminSummary.missing.length > 0 && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-50/80 via-white to-white dark:from-rose-950/20 dark:via-dark-800 dark:to-dark-800 border border-rose-200/70 dark:border-rose-900/40 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={17} className="text-rose-600" />
                  <h3 className="text-sm font-heading font-bold text-rose-950 dark:text-rose-200">
                    Missing Submissions for {selectedDate} ({adminSummary.missing.length} staff)
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                  Pending End of Day Submission
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {adminSummary.missing.map(({ user: m }) => (
                  <div
                    key={m._id}
                    className="p-3 rounded-xl bg-white dark:bg-dark-900 border border-rose-100 dark:border-rose-900/30 shadow-2xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-dark-900 dark:text-white">{m.name}</p>
                      <span className="text-[10px] text-dark-400 block">{m.phone || m.email}</span>
                    </div>
                    <button
                      onClick={() => handleNudgeMember(m)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                      title="Send WhatsApp Nudge"
                    >
                      <MessageCircle size={12} />
                      <span>Nudge</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All EOD Submissions Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white">
                  Member EOD Submissions ({allSubmissions.length})
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                  Detailed daily logs, calling outputs, and review feedback
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-dark-400" />
                  <input
                    type="text"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="Search staff, notes..."
                    className="pl-8 pr-3 py-1.5 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs text-dark-800 dark:text-dark-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-dark-200 dark:border-dark-700 text-dark-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-2">Member</th>
                    <th className="py-3 px-2">Date</th>
                    <th className="py-3 px-2">Calls (Made / Conn)</th>
                    <th className="py-3 px-2">Talk Time</th>
                    <th className="py-3 px-2">Leads / Deals</th>
                    <th className="py-3 px-2">Achievements &amp; Challenges</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-700/40">
                  {allSubmissions
                    .filter((item) => {
                      if (!adminSearch) return true;
                      const q = adminSearch.toLowerCase();
                      return (
                        (item.userName || '').toLowerCase().includes(q) ||
                        (item.keyAchievements || '').toLowerCase().includes(q) ||
                        (item.challenges || '').toLowerCase().includes(q)
                      );
                    })
                    .map((report) => (
                      <tr key={report._id} className="hover:bg-dark-50/50 dark:hover:bg-dark-700/30">
                        <td className="py-3.5 px-2 font-bold text-dark-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                              {(report.userName || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-dark-900 dark:text-white">
                                {report.userName}
                              </p>
                              <span className="text-[10px] text-dark-400 font-medium">
                                {report.userEmail}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 font-mono text-dark-700 dark:text-dark-300">
                          {report.date}
                        </td>
                        <td className="py-3.5 px-2 font-semibold">
                          <span className="text-dark-900 dark:text-white">{report.callsMade}</span>
                          <span className="text-dark-400"> / </span>
                          <span className="text-emerald-600 font-bold">{report.callsConnected}</span>
                        </td>
                        <td className="py-3.5 px-2 font-mono text-violet-600 dark:text-violet-400 font-semibold">
                          {report.talkTime || '0s'}
                        </td>
                        <td className="py-3.5 px-2 font-semibold">
                          <span className="text-blue-600">{report.leadsGenerated} leads</span>
                          <span className="text-dark-400"> • </span>
                          <span className="text-emerald-600 font-bold">{report.dealsClosed} closed</span>
                        </td>
                        <td className="py-3.5 px-2 max-w-xs">
                          {report.keyAchievements && (
                            <p className="text-[11px] text-dark-800 dark:text-dark-200 line-clamp-1 font-medium">
                              🏆 {report.keyAchievements}
                            </p>
                          )}
                          {report.challenges && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 line-clamp-1 mt-0.5">
                              ⚠️ {report.challenges}
                            </p>
                          )}
                          {!report.keyAchievements && !report.challenges && (
                            <span className="text-dark-400 text-[11px]">No notes</span>
                          )}
                        </td>
                        <td className="py-3.5 px-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              report.status === 'reviewed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                report.status === 'reviewed' ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}
                            ></span>
                            {report.status === 'reviewed' ? 'Reviewed' : 'Submitted'}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-right">
                          <button
                            onClick={() => {
                              setSelectedReportForReview(report);
                              setReviewFeedback(report.adminFeedback || '');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-dark-50 hover:bg-dark-100 dark:bg-dark-700 dark:hover:bg-dark-600 text-blue-600 dark:text-blue-400 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Review &gt;
                          </button>
                        </td>
                      </tr>
                    ))}
                  {allSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-dark-400 text-xs">
                        No EOD sheets submitted yet for {selectedDate}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION B: MEMBER SUBMISSION & MY HISTORY                  */}
      {/* ========================================================= */}
      {(!isAdminOrMgr || activeTab === 'my-eod') && (
        <div className="space-y-6">
          {/* Top Status Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-white dark:from-dark-800 dark:via-dark-800 dark:to-dark-850 border border-blue-100 dark:border-dark-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-dark-400">
                  TODAY&apos;S SUBMISSION STATUS
                </span>
                {existingEod ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Submitted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    <Clock size={13} className="text-amber-600" />
                    Pending Submission
                  </span>
                )}
              </div>
              <h2 className="text-xl font-heading font-bold text-dark-900 dark:text-white mt-1">
                {user?.name}&apos;s Daily Work Record
              </h2>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Target Date: <strong className="text-dark-800 dark:text-dark-200">{formData.date}</strong> • Telephony metrics auto-synced from your CRM logs
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadMemberToday(formData.date)}
                disabled={loadingMember}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 shadow-2xs transition-all cursor-pointer"
              >
                <RefreshCw
                  size={13}
                  className={loadingMember ? 'animate-spin text-blue-600' : 'text-dark-500'}
                />
                <span>Sync CRM Stats</span>
              </button>
            </div>
          </div>

          {/* The EOD Form */}
          <form
            onSubmit={handleSubmitEod}
            className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <span>1. Today&apos;s Performance Numbers</span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  Auto-populated from Call History
                </span>
              </h3>
            </div>

            {/* Metrics Input Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">
                  Calls Made
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-2.5 text-dark-400" />
                  <input
                    type="number"
                    min="0"
                    value={formData.callsMade}
                    onChange={(e) => setFormData({ ...formData, callsMade: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs font-bold text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">
                  Calls Connected
                </label>
                <div className="relative">
                  <PhoneCall size={14} className="absolute left-3 top-2.5 text-emerald-500" />
                  <input
                    type="number"
                    min="0"
                    value={formData.callsConnected}
                    onChange={(e) => setFormData({ ...formData, callsConnected: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">
                  Total Talk Time
                </label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-2.5 text-violet-500" />
                  <input
                    type="text"
                    value={formData.talkTime}
                    onChange={(e) => setFormData({ ...formData, talkTime: e.target.value })}
                    placeholder="e.g. 1h 25m"
                    className="w-full pl-8 pr-3 py-2 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs font-bold text-violet-600 dark:text-violet-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">
                  Follow-ups Done
                </label>
                <div className="relative">
                  <CheckCircle2 size={14} className="absolute left-3 top-2.5 text-amber-500" />
                  <input
                    type="number"
                    min="0"
                    value={formData.followUpsDone}
                    onChange={(e) => setFormData({ ...formData, followUpsDone: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">
                  Leads Generated
                </label>
                <div className="relative">
                  <Target size={14} className="absolute left-3 top-2.5 text-blue-500" />
                  <input
                    type="number"
                    min="0"
                    value={formData.leadsGenerated}
                    onChange={(e) => setFormData({ ...formData, leadsGenerated: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">
                  Deals Closed
                </label>
                <div className="relative">
                  <Award size={14} className="absolute left-3 top-2.5 text-emerald-500" />
                  <input
                    type="number"
                    min="0"
                    value={formData.dealsClosed}
                    onChange={(e) => setFormData({ ...formData, dealsClosed: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Qualitative Reporting */}
            <div className="pt-2 space-y-4">
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white">
                2. Qualitative Daily Reflections
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                    🏆 Key Achievements / Accomplishments Today
                  </label>
                  <textarea
                    rows={2}
                    value={formData.keyAchievements}
                    onChange={(e) => setFormData({ ...formData, keyAchievements: e.target.value })}
                    placeholder="e.g. Pitched to 35 prospects, scheduled 2 client demos, converted 1 enterprise deal..."
                    className="w-full px-3.5 py-2.5 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs text-dark-800 dark:text-dark-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                    ⚠️ Challenges, Objections &amp; Blockers
                  </label>
                  <textarea
                    rows={2}
                    value={formData.challenges}
                    onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                    placeholder="e.g. Several clients raised pricing concerns; need fresh lead contacts for Logistics segment..."
                    className="w-full px-3.5 py-2.5 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs text-dark-800 dark:text-dark-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                    🎯 Plan &amp; Focus for Tomorrow
                  </label>
                  <textarea
                    rows={2}
                    value={formData.planForTomorrow}
                    onChange={(e) => setFormData({ ...formData, planForTomorrow: e.target.value })}
                    placeholder="e.g. Complete 15 callback follow-ups, close meeting with Acme Corp, aim for 2 conversions..."
                    className="w-full px-3.5 py-2.5 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs text-dark-800 dark:text-dark-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Admin Feedback Box (If Reviewed) */}
            {existingEod && existingEod.adminFeedback && (
              <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <Shield size={14} />
                  <span>Admin Feedback &amp; Review ({existingEod.reviewedByName || 'Manager'}):</span>
                </div>
                <p className="text-xs text-emerald-900 dark:text-emerald-200 font-medium pl-5">
                  &ldquo;{existingEod.adminFeedback}&rdquo;
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-dark-400">
                {existingEod ? 'Updating existing EOD report' : 'New submission for ' + formData.date}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Send size={14} className={submitting ? 'animate-pulse' : ''} />
                  <span>{submitting ? 'Submitting...' : existingEod ? 'Update EOD Sheet' : 'Submit EOD Sheet'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Past Submissions History Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200/90 dark:border-dark-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-heading font-bold text-dark-900 dark:text-white">
                My Past EOD Submissions ({myHistory.length})
              </h3>
              <button
                onClick={loadMemberHistory}
                disabled={loadingHistory}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <RefreshCw size={12} className={loadingHistory ? 'animate-spin' : ''} />
                <span>Reload</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-dark-200 dark:border-dark-700 text-dark-400 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-2">Date</th>
                    <th className="py-2.5 px-2">Calls (Made / Conn)</th>
                    <th className="py-2.5 px-2">Talk Time</th>
                    <th className="py-2.5 px-2">Leads / Deals</th>
                    <th className="py-2.5 px-2">Key Highlights</th>
                    <th className="py-2.5 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-700/40">
                  {myHistory.map((item) => (
                    <tr key={item._id || item.date} className="hover:bg-dark-50/50">
                      <td className="py-3 px-2 font-bold font-mono text-dark-900 dark:text-white">
                        {item.date}
                      </td>
                      <td className="py-3 px-2 font-semibold">
                        <span className="text-dark-900 dark:text-white">{item.callsMade}</span>
                        <span className="text-dark-400"> / </span>
                        <span className="text-emerald-600 font-bold">{item.callsConnected}</span>
                      </td>
                      <td className="py-3 px-2 font-mono text-violet-600">{item.talkTime || '0s'}</td>
                      <td className="py-3 px-2 font-semibold">
                        <span className="text-blue-600">{item.leadsGenerated} leads</span>
                        <span className="text-dark-400"> • </span>
                        <span className="text-emerald-600 font-bold">{item.dealsClosed} deals</span>
                      </td>
                      <td className="py-3 px-2 max-w-xs text-dark-700 dark:text-dark-300 line-clamp-1">
                        {item.keyAchievements || item.planForTomorrow || '-'}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'reviewed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {item.status === 'reviewed' ? 'Reviewed' : 'Submitted'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {myHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-dark-400 text-xs">
                        No previous EOD sheets recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REVIEW & FEEDBACK MODAL (ADMIN / MANAGER)                 */}
      {/* ========================================================= */}
      <Modal
        isOpen={!!selectedReportForReview}
        onClose={() => setSelectedReportForReview(null)}
        title={`Review EOD: ${selectedReportForReview?.userName} (${selectedReportForReview?.date})`}
      >
        {selectedReportForReview && (
          <div className="space-y-4 text-xs">
            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-dark-50 dark:bg-dark-900 rounded-xl text-center">
              <div>
                <span className="text-[10px] text-dark-400 font-medium">Calls Dialed</span>
                <p className="text-sm font-bold text-dark-900 dark:text-white mt-0.5">
                  {selectedReportForReview.callsMade}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-dark-400 font-medium">Connected</span>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">
                  {selectedReportForReview.callsConnected}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-dark-400 font-medium">Talk Time</span>
                <p className="text-sm font-bold text-violet-600 mt-0.5">
                  {selectedReportForReview.talkTime || '0s'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-dark-400 font-medium">Deals Closed</span>
                <p className="text-sm font-bold text-blue-600 mt-0.5">
                  {selectedReportForReview.dealsClosed}
                </p>
              </div>
            </div>

            {/* Full Member Notes */}
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-blue-900 dark:text-blue-300 block mb-0.5">
                  🏆 Key Achievements:
                </span>
                <p className="text-dark-800 dark:text-dark-200 leading-relaxed">
                  {selectedReportForReview.keyAchievements || 'No notes provided'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                <span className="font-bold text-rose-900 dark:text-rose-300 block mb-0.5">
                  ⚠️ Challenges &amp; Blockers:
                </span>
                <p className="text-dark-800 dark:text-dark-200 leading-relaxed">
                  {selectedReportForReview.challenges || 'None reported'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40">
                <span className="font-bold text-violet-900 dark:text-violet-300 block mb-0.5">
                  🎯 Tomorrow&apos;s Focus:
                </span>
                <p className="text-dark-800 dark:text-dark-200 leading-relaxed">
                  {selectedReportForReview.planForTomorrow || 'No plan entered'}
                </p>
              </div>
            </div>

            {/* Admin Review Feedback Input */}
            <div>
              <label className="block text-xs font-bold text-dark-800 dark:text-dark-200 mb-1">
                Manager / Admin Feedback &amp; Comments:
              </label>
              <textarea
                rows={3}
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Write feedback, praise, or action items for this member..."
                className="w-full px-3 py-2 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs text-dark-800 dark:text-dark-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-700">
              <button
                type="button"
                onClick={() => setSelectedReportForReview(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewSubmit}
                disabled={submittingReview}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                {submittingReview ? 'Saving Review...' : 'Mark as Reviewed & Send Feedback'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
