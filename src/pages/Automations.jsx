import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Headphones,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
  ShoppingCart,
  Sparkles,
  Info,
  PhoneMissed,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  Phone,
  Mail,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../context/ConfirmContext';
import { WhatsAppIcon } from './WhatsApp';
import {
  getAutomations,
  getAutomationLogs,
  updateAutomation,
  testTriggerAutomation,
} from '../api/automations';

export default function Automations({ onNavigate }) {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Active sub-tab: 'all' | 'logs'
  const [activeTab, setActiveTab] = useState('all');

  // Selected organization
  const [selectedOrg, setSelectedOrg] = useState('Main Organization');

  // Modals state
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [isGetHelpOpen, setIsGetHelpOpen] = useState(false);

  // Live state from API
  const [automations, setAutomations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const fetchAutomationsData = async () => {
    try {
      setLoading(true);
      const [autoRes, logsRes] = await Promise.allSettled([
        getAutomations(),
        getAutomationLogs({ limit: 25 }),
      ]);

      if (autoRes.status === 'fulfilled' && autoRes.value?.success) {
        setAutomations(autoRes.value.automations || []);
        setStats(autoRes.value.stats || null);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value?.success) {
        setLogs(logsRes.value.logs || []);
      }
    } catch (err) {
      console.warn('Failed to fetch automations:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomationsData();
  }, []);

  const handleCreateNew = () => {
    setIsLimitModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Delete Automation',
      message: `Are you sure you want to permanently delete automation "${name || 'automation'}"?`,
      confirmText: 'Delete Automation',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!ok) return;
    setAutomations((prev) => prev.filter((a) => (a._id || a.id) !== id));
    addToast('Automation deleted', 'info');
  };

  const handleToggleStatus = async (id) => {
    const target = automations.find((a) => (a._id || a.id) === id);
    if (!target) return;
    const nextStatus = target.status === 'Active' ? 'Paused' : 'Active';
    const ok = await confirm({
      title: `${nextStatus === 'Active' ? 'Activate' : 'Pause'} Automation`,
      message: `Are you sure you want to ${nextStatus === 'Active' ? 'activate' : 'pause'} "${target.name}"?`,
      confirmText: nextStatus === 'Active' ? 'Activate' : 'Pause',
      cancelText: 'Cancel',
      type: nextStatus === 'Active' ? 'primary' : 'warning',
    });
    if (!ok) return;

    try {
      if (target._id) {
        await updateAutomation(target._id, { status: nextStatus });
      }
      setAutomations((prev) =>
        prev.map((a) => ((a._id || a.id) === id ? { ...a, status: nextStatus } : a))
      );
      addToast(`Automation status changed to ${nextStatus}`, 'success');
    } catch (err) {
      addToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleOpenEdit = (auto) => {
    setEditingAutomation(auto);
    setEditingText(auto.messageText || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAutomation) return;
    try {
      setIsSaving(true);
      if (editingAutomation._id) {
        await updateAutomation(editingAutomation._id, { messageText: editingText });
      }
      setAutomations((prev) =>
        prev.map((a) =>
          (a._id || a.id) === (editingAutomation._id || editingAutomation.id)
            ? { ...a, messageText: editingText }
            : a
        )
      );
      setIsEditModalOpen(false);
      addToast('Automation rules saved successfully!', 'success');
    } catch (err) {
      addToast(`Failed to save: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTrigger = async (key = 'missed_call') => {
    try {
      setIsTesting(true);
      addToast('Simulating inbound missed call...', 'info');
      const res = await testTriggerAutomation({
        key,
        customerPhone: '+91 99999 88888',
        customerName: 'Valued Test Client',
      });
      if (res.success) {
        addToast('Missed Call Auto-responder fired! WhatsApp apology logged & callback task scheduled.', 'success');
        fetchAutomationsData();
      }
    } catch (err) {
      addToast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* =========================================================================
          TOP WARNING ALERT BANNER matching Reference Screenshots
          ========================================================================= */}
      <div className="bg-[#fff9e6] dark:bg-amber-950/30 border border-[#ffe082] dark:border-amber-800/60 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-dark-800 dark:text-amber-200">
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <span>
            Automations are run at a contact level based on specified conditions. You have{' '}
            <strong className="text-dark-900 dark:text-white">1 condition based active automation</strong>{' '}
            out of the available limit of 1
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLearnMoreOpen(true)}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Learn More</span>
            <ArrowRight size={12} />
          </button>
          <button
            onClick={() => setIsGetHelpOpen(true)}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Headphones size={13} />
            <span>Get help</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          HEADER BAR: Title + Org selector + Create new button
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-dark-900 dark:text-white">Condition based</h1>
          <p className="text-xs text-dark-500">
            Automate actions triggered by live customer interactions and call events
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh status */}
          <button
            onClick={fetchAutomationsData}
            disabled={loading}
            className="p-2 rounded-xl border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-800 text-dark-600 dark:text-dark-300 transition-colors"
            title="Refresh automations"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Org Selector */}
          <div className="relative">
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="appearance-none bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-dark-700 dark:text-dark-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="Main Organization">Main Organization</option>
              <option value="PeYug Cooperative">PeYug Cooperative</option>
              <option value="Customer Support Desk">Customer Support Desk</option>
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
            />
          </div>

          {/* Create New Button */}
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Create new</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SUB-NAV TABS: 'All' and 'Logs'
          ========================================================================= */}
      <div className="flex items-center gap-6 border-b border-dark-200 dark:border-dark-700/80 pt-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-2.5 text-xs sm:text-sm font-semibold transition-all relative ${
            activeTab === 'all'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
          }`}
        >
          <span>All</span>
          {activeTab === 'all' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-2.5 text-xs sm:text-sm font-semibold transition-all relative ${
            activeTab === 'logs'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
          }`}
        >
          <span>Logs</span>
          {activeTab === 'logs' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
          )}
        </button>
      </div>

      {/* =========================================================================
          VIEW 1: 'ALL' AUTOMATIONS LIST matching Reference Screenshot 1
          ========================================================================= */}
      {activeTab === 'all' && (
        <div className="space-y-4 pt-2">
          {automations.map((auto) => (
            <div
              key={auto._id || auto.id}
              className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-2xs space-y-3"
            >
              {/* Top Row: Channel icon + Action + Name + Actions */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* WhatsApp Icon */}
                    <WhatsAppIcon
                      className="w-4 h-4 text-emerald-500 fill-emerald-500 shrink-0"
                      fill="#22c55e"
                    />
                    <span className="text-xs font-bold text-dark-900 dark:text-white uppercase tracking-wider">
                      {auto.actionTitle || 'SEND MESSAGE'}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(auto)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {auto.name}
                    </button>
                  </div>

                  {/* Active Status Badge */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(auto._id || auto.id)}
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                        auto.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}
                      title="Click to toggle status"
                    >
                      {auto.status}
                    </button>

                    {/* Quick Test Simulation Button */}
                    <button
                      type="button"
                      disabled={isTesting || auto.status !== 'Active'}
                      onClick={() => handleTestTrigger(auto.key || 'missed_call')}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 border border-blue-200 dark:border-blue-900 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Simulate missed call trigger to test WhatsApp apology and callback task"
                    >
                      <Zap size={11} className={isTesting ? 'animate-bounce' : ''} />
                      <span>{isTesting ? 'Simulating...' : 'Test Run'}</span>
                    </button>
                  </div>
                </div>

                {/* Edit & Delete Action Icons */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => handleOpenEdit(auto)}
                    className="p-1.5 text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 transition-colors cursor-pointer"
                    title="Edit Automation Template"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(auto._id || auto.id, auto.name)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                    title="Delete Automation"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Message text snippet */}
              <div className="p-3 bg-dark-50 dark:bg-dark-900/60 rounded-xl border border-dark-100 dark:border-dark-700/60 text-xs text-dark-700 dark:text-dark-300">
                <span className="font-semibold text-dark-400 text-[10px] block mb-0.5 uppercase tracking-wide">
                  Template Message Preview:
                </span>
                <p className="line-clamp-2 italic font-mono text-[11px]">"{auto.messageText}"</p>
              </div>

              {/* Metadata rows */}
              <div className="text-xs text-dark-600 dark:text-dark-300 space-y-1 pt-1">
                <p>
                  <span className="font-semibold text-dark-400">SEND TO:</span> {auto.sendTo || 'Customer'}
                </p>
                <p className="text-[11px] text-dark-400">
                  <span className="font-semibold">REPORT:</span>{' '}
                  <span className="text-emerald-600 font-bold">Success {auto.successCount || 0}</span> •{' '}
                  <span className="text-dark-400">Failed {auto.failedCount || 0}</span>
                  {auto.createdAt && (
                    <span className="ml-4">
                      Created {new Date(auto.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}

          {automations.length === 0 && !loading && (
            <div className="p-10 text-center text-dark-400 text-xs bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700">
              No automations found. Click "Create new" to configure condition-based rules.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 2: 'LOGS' TABLE matching Reference Screenshot 2
          ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs overflow-hidden pt-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0f7ff] dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 text-dark-700 dark:text-dark-300 font-bold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Automation</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Person</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60">
                {logs.map((log) => (
                  <tr
                    key={log._id || log.id}
                    className="hover:bg-dark-50/50 dark:hover:bg-dark-700/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-dark-900 dark:text-white">{log.date}</p>
                      <p className="text-[11px] text-dark-400">{log.time}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 font-semibold ${
                        log.status === 'Success'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        <CheckCircle2 size={14} className={log.status === 'Success' ? 'fill-emerald-100 dark:fill-emerald-950' : 'fill-rose-100'} />
                        <span>{log.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">
                      {log.automationName}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-dark-800 dark:text-dark-200 uppercase tracking-wide text-[11px]">
                      {log.action}
                    </td>

                    <td className="py-3.5 px-4 text-dark-800 dark:text-dark-200 font-mono">
                      {log.targetPerson}
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-dark-400 text-xs">
                      No automation triggers logged yet. Run a test trigger or receive a missed call to view live logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CREATE NEW -> REACHED LIMIT MODAL matching Reference Screenshot 3
          ========================================================================= */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-sm w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                You have reached your limit
              </h3>
              <p className="text-xs text-dark-500 leading-relaxed">
                Your current subscription tier permits 1 condition-based automation. To deploy additional multi-step triggers (e.g. KYC Chasers, SLA Escalations), please upgrade your plan.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setIsLimitModalOpen(false);
                  if (onNavigate) onNavigate('plans-billing');
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <ShoppingCart size={14} />
                <span>Upgrade Plan</span>
              </button>

              <button
                onClick={() => setIsLimitModalOpen(false)}
                className="w-full py-2 rounded-xl text-xs font-semibold text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-700 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDIT AUTOMATION RULES MODAL
          ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <Pencil size={16} className="text-blue-600" />
                Configure Missed Call Automation
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Trigger Event
                </label>
                <div className="p-2.5 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 font-medium flex items-center gap-2">
                  <PhoneMissed size={14} className="text-rose-500 shrink-0" />
                  <span>Inbound call is missed or unanswered by agent</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Action Channel
                </label>
                <div className="p-2.5 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 font-medium flex items-center gap-2">
                  <WhatsAppIcon className="w-4 h-4 fill-emerald-500 text-emerald-500" fill="#22c55e" />
                  <span>Send WhatsApp Business Template</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  WhatsApp Message Template
                </label>
                <textarea
                  rows={4}
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                  placeholder="Enter message template text. Use {name} for dynamic customer name."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-700">
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 hover:bg-dark-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSaving && <RefreshCw size={12} className="animate-spin" />}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: GET HELP / SUPPORT MODAL
          ========================================================================= */}
      {isGetHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <Headphones size={18} className="text-blue-600" />
                Smart CRM Support
              </h3>
              <button
                onClick={() => setIsGetHelpOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-dark-600 dark:text-dark-300">
              <p>
                Need additional automation quotas or assistance configuring custom webhook triggers?
              </p>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-1">
                <p className="font-bold text-blue-900 dark:text-blue-200">
                  Customer Success Helpline:
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={13} className="text-blue-700 dark:text-blue-300 shrink-0" />
                  <span>1800-CRM-HELP (Toll-Free Mon-Sat 9 AM - 7 PM)</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail size={13} className="text-blue-700 dark:text-blue-300 shrink-0" />
                  <span>support@smartcrm.com</span>
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsGetHelpOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: LEARN MORE
          ========================================================================= */}
      {isLearnMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                About Condition-based Automations
              </h3>
              <button
                onClick={() => setIsLearnMoreOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-dark-600 dark:text-dark-300 leading-relaxed">
              <p>
                Condition-based automations execute real-time actions when customer interactions match pre-configured trigger criteria.
              </p>
              <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 space-y-2">
                <p className="font-bold text-dark-900 dark:text-white">
                  Active Rule: Missed Call Auto-Responder
                </p>
                <ul className="list-disc pl-4 space-y-1 text-dark-500">
                  <li>Detects any inbound call unanswered by an agent.</li>
                  <li>Dispatches a customized WhatsApp apology directly to the caller.</li>
                  <li>Automatically schedules a high-priority "Urgent Callback" task in the agent's Follow-up queue.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsLearnMoreOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
