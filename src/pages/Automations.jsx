import { useState } from 'react';
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
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../context/ConfirmContext';
import { WhatsAppIcon } from './WhatsApp';

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

  // Active automation card data matching Screenshot 1
  const [automations, setAutomations] = useState([
    {
      id: 'auto_1835',
      channel: 'whatsapp',
      actionTitle: 'SEND MESSAGE',
      name: 'Missed call message',
      status: 'Active',
      sendTo: 'Customer',
      successCount: 19,
      failedCount: 0,
      createdAt: '16 May 2026',
      messageText:
        'Hi, sorry we missed your call! An executive from our team will get back to you shortly. Feel free to reply here if urgent.',
    },
  ]);

  // Logs data matching Screenshot 2
  const logs = [
    {
      id: 'log_1',
      date: '09 Oct',
      time: '12:22:23 pm',
      status: 'Success',
      automationName: 'Missed call message ID: 1835',
      action: 'SEND MESSAGE',
      targetPerson: '+919899701319',
    },
    {
      id: 'log_2',
      date: '09 Oct',
      time: '10:52:29 am',
      status: 'Success',
      automationName: 'Missed call message ID: 1835',
      action: 'SEND MESSAGE',
      targetPerson: '+919944125005',
    },
    {
      id: 'log_3',
      date: '07 Oct',
      time: '08:51:04 am',
      status: 'Success',
      automationName: 'Missed call message ID: 1835',
      action: 'SEND MESSAGE',
      targetPerson: '+918745974228',
    },
    {
      id: 'log_4',
      date: '07 Oct',
      time: '08:50:34 am',
      status: 'Success',
      automationName: 'Missed call message ID: 1835',
      action: 'SEND MESSAGE',
      targetPerson: '+918745974228',
    },
    {
      id: 'log_5',
      date: '07 Oct',
      time: '08:50:04 am',
      status: 'Success',
      automationName: 'Missed call message ID: 1835',
      action: 'SEND MESSAGE',
      targetPerson: '+918745974228',
    },
  ];

  // Handle Create New click -> Triggers limit modal per Screenshot 3
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
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    addToast('Automation deleted', 'info');
  };

  const handleToggleStatus = async (id) => {
    const target = automations.find((a) => a.id === id);
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
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a))
    );
    addToast(`Automation status changed to ${nextStatus}`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* =========================================================================
          TOP WARNING ALERT BANNER matching Screenshots 1, 2, 3
          ========================================================================= */}
      <div className="bg-[#fff9e6] dark:bg-amber-950/30 border border-[#ffe082] dark:border-amber-800/60 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-dark-800 dark:text-amber-200">
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <span>
            <strong className="font-bold text-dark-900 dark:text-amber-100 uppercase tracking-tight mr-1">
              MAXIMUM LIMIT REACHED
            </strong>
            Buy an automation pack to create more automation
          </span>
        </div>

        <div className="flex items-center gap-4 font-bold text-[11px] tracking-wider uppercase">
          <button
            onClick={() => onNavigate?.('plans-billing')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            PURCHASE ADDON
          </button>
          <button
            onClick={() => setIsGetHelpOpen(true)}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            CONTACT US
          </button>
        </div>
      </div>

      {/* =========================================================================
          HEADER ROW & CONTROLS matching Screenshots 1, 2, 3
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {/* Title + Org Dropdown */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-dark-900 dark:text-white">Automations</h1>
          <div className="relative min-w-[140px]">
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full appearance-none pl-3 pr-7 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Main Organization">Main Organization</option>
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Right Buttons: GET HELP + Create new */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsGetHelpOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-bold text-dark-800 dark:text-dark-200 bg-white dark:bg-dark-800 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors uppercase tracking-wider shadow-2xs"
          >
            <Headphones size={14} className="text-dark-500" />
            <span>GET HELP</span>
          </button>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors uppercase tracking-wider shadow-xs"
          >
            <Plus size={15} />
            <span>Create new</span>
          </button>
        </div>
      </div>

      {/* Description Line */}
      <p className="text-xs text-dark-500 dark:text-dark-400">
        Create condition-based actions and let Smart CRM automate your workflow while you focus on
        your business.{' '}
        <button
          onClick={() => setIsLearnMoreOpen(true)}
          className="text-blue-600 dark:text-blue-400 font-bold hover:underline ml-1"
        >
          LEARN MORE
        </button>
      </p>

      {/* =========================================================================
          SUB-TABS: All & Logs
          ========================================================================= */}
      <div className="flex items-center gap-6 border-b border-dark-200 dark:border-dark-700 pt-2">
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
          VIEW 1: 'ALL' AUTOMATIONS LIST matching Screenshot 1
          ========================================================================= */}
      {activeTab === 'all' && (
        <div className="space-y-4 pt-2">
          {automations.map((auto) => (
            <div
              key={auto.id}
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
                      {auto.actionTitle}
                    </span>
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {auto.name}
                    </button>
                  </div>

                  {/* Active Status Badge */}
                  <div>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(auto.id)}
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                        auto.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}
                      title="Click to toggle status"
                    >
                      {auto.status}
                    </button>
                  </div>
                </div>

                {/* Edit & Delete Action Icons */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-1.5 text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 transition-colors cursor-pointer"
                    title="Edit Automation"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(auto.id, auto.name)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                    title="Delete Automation"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Metadata rows */}
              <div className="text-xs text-dark-600 dark:text-dark-300 space-y-1 pt-1">
                <p>
                  <span className="font-semibold text-dark-400">SEND TO:</span> {auto.sendTo}
                </p>
                <p className="text-[11px] text-dark-400">
                  <span className="font-semibold">REPORT (7D):</span>{' '}
                  <span className="text-emerald-600 font-bold">Success {auto.successCount}</span> •{' '}
                  <span className="text-dark-400">Failed {auto.failedCount}</span>
                  <span className="ml-4">Created {auto.createdAt}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          VIEW 2: 'LOGS' TABLE matching Screenshot 2
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
                    key={log.id}
                    className="hover:bg-dark-50/50 dark:hover:bg-dark-700/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-dark-900 dark:text-white">{log.date}</p>
                      <p className="text-[11px] text-dark-400">{log.time}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={14} className="fill-emerald-100 dark:fill-emerald-950" />
                        <span>{log.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                      {log.automationName}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300">
                        <WhatsAppIcon
                          className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500"
                          fill="#22c55e"
                        />
                        <span>{log.action}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white">
                      {log.targetPerson}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: EXCEEDED AUTOMATIONS LIMIT MODAL matching Screenshot 3
          ========================================================================= */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl text-center space-y-4 relative animate-in fade-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => setIsLimitModalOpen(false)}
              className="absolute top-4 right-4 text-dark-400 hover:text-dark-600 p-1"
            >
              <X size={18} />
            </button>

            {/* Red Alert Triangle in red circle */}
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            {/* Modal Heading & Description matching screenshot 3 word-for-word */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-dark-900 dark:text-white leading-snug">
                You have exceeded your active automations limit.
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 leading-relaxed px-2">
                Buy an automation pack to create more automations, or connect with us for help.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              {/* Button 1: PURCHASE ADDON */}
              <button
                onClick={() => {
                  setIsLimitModalOpen(false);
                  onNavigate?.('plans-billing');
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 uppercase tracking-wider transition-colors shadow-xs"
              >
                <ShoppingCart size={15} />
                <span>PURCHASE ADDON</span>
              </button>

              {/* Button 2: GET HELP */}
              <button
                onClick={() => {
                  setIsLimitModalOpen(false);
                  setIsGetHelpOpen(true);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-dark-800 dark:text-dark-200 border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 flex items-center justify-center gap-2 uppercase tracking-wider transition-colors"
              >
                <Headphones size={15} />
                <span>GET HELP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDIT AUTOMATION MODAL
          ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-lg w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <Pencil size={16} className="text-blue-600" />
                Configure Missed Call Automation
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Trigger Event
                </label>
                <div className="p-2.5 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 font-medium">
                  📞 Inbound call is missed or unanswered by agent
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
                  rows={3}
                  defaultValue={automations[0]?.messageText}
                  className="w-full p-2.5 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-700">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 hover:bg-dark-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  addToast('Automation rules saved successfully!', 'success');
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
              >
                Save Changes
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
                className="text-dark-400 hover:text-dark-600 p-1"
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
                <p>📞 1800-CRM-HELP (Toll-Free Mon-Sat 9 AM - 7 PM)</p>
                <p>✉️ support@smartcrm.com</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsGetHelpOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
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
                className="text-dark-400 hover:text-dark-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-dark-600 dark:text-dark-300 leading-relaxed">
              <p>
                • <strong>Missed Call Responder</strong>: Automatically sends a WhatsApp message or
                SMS to callers when your team is busy or unavailable.
              </p>
              <p>
                • <strong>Lead Follow-up Triggers</strong>: Automatically creates reminder tasks and
                schedules call queues when a lead status changes.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsLearnMoreOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
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
