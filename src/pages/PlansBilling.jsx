import { useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Sparkles,
  FileText,
  CreditCard,
  Clock,
  Calendar,
  CheckCircle2,
  Gauge,
  Plus,
  History,
  Download,
  ShieldCheck,
  X,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../context/ConfirmContext';

export default function PlansBilling({ onNavigate }) {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Active Tab: 'plan-details' | 'ai-calls' | 'invoices'
  const [activeTab, setActiveTab] = useState('plan-details');

  // Selected Org Dropdown
  const [selectedOrg, setSelectedOrg] = useState('Main Organization');

  // Modals state
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [isManageMandateOpen, setIsManageMandateOpen] = useState(false);

  const handleConfirmRenewal = async () => {
    const ok = await confirm({
      title: 'Confirm Plan Renewal',
      message: 'Are you sure you want to renew Unlimited All-in-One Pro plan for ₹14,999/yr?',
      confirmText: 'Renew Plan',
      type: 'primary'
    });
    if (!ok) return;
    setIsRenewModalOpen(false);
    addToast('Plan renewed successfully!', 'success');
  };

  const handlePurchaseAddon = async () => {
    const ok = await confirm({
      title: 'Confirm Add-on Purchase',
      message: 'Are you sure you want to proceed with purchasing selected telephony add-ons?',
      confirmText: 'Proceed to Checkout',
      type: 'primary'
    });
    if (!ok) return;
    setIsAddonModalOpen(false);
    addToast('Add-on activated instantly!', 'success');
  };

  // Plan history data matching reference screenshot 2
  const planHistory = [
    {
      id: 1,
      title: 'Unlimited All-in-One Pro',
      status: 'Active',
      startedOn: '14 Nov 2025',
      validTill: '12 Feb 2027',
    },
    {
      id: 2,
      title: 'Unlimited Biz Phone',
      status: 'Renewed',
      startedOn: '13 Nov 2025',
      validTill: '14 Nov 2025',
    },
    {
      id: 3,
      title: 'Biz Phone',
      status: 'Renewed',
      startedOn: '07 May 2025',
      validTill: '05 Aug 2025',
    },
  ];

  // Invoices for Invoices tab
  const invoices = [
    {
      id: 'INV-2026-009',
      title: 'Unlimited All-in-One Pro Annual Plan',
      date: '14 Nov 2025',
      amount: '₹14,999.00',
      status: 'Paid',
      gst: '07AAAAA0000A1Z5',
    },
    {
      id: 'INV-2026-008',
      title: 'Users (x2) Lead Add-on Quota',
      date: '14 Nov 2025',
      amount: '₹1,180.00',
      status: 'Paid',
      gst: '07AAAAA0000A1Z5',
    },
    {
      id: 'INV-2025-003',
      title: 'Biz Phone 3-Month Plan Renewal',
      date: '07 May 2025',
      amount: '₹3,499.00',
      status: 'Paid',
      gst: '07AAAAA0000A1Z5',
    },
  ];

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP ORG HEADER CARD matching reference screenshot 1
          ========================================================================= */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Back Arrow + M Avatar + Org Metadata */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => onNavigate?.('home')}
            className="w-9 h-9 rounded-full border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 flex items-center justify-center text-dark-500 hover:text-dark-800 dark:hover:text-white transition-colors"
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Blue Circular Avatar with letter M */}
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-2xs">
            M
          </div>

          <div>
            <p className="text-[10px] font-bold tracking-wider text-dark-400 uppercase">
              PLANS & BILLING
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-lg font-bold text-dark-900 dark:text-white">Main Organization</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-dark-500 dark:text-dark-400 mt-0.5">
              <CreditCard size={13} className="text-dark-400" />
              <span>Unlimited All-in-One Pro • expires 12 Feb 2027</span>
            </div>
          </div>
        </div>

        {/* Right Side: Org Selector Dropdown */}
        <div className="relative min-w-[160px]">
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full appearance-none pl-3.5 pr-8 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="Main Organization">Main Organization</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
          />
        </div>
      </div>

      {/* =========================================================================
          MAIN TABS BAR & ACTION BUTTONS matching reference screenshot 1
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dark-200 dark:border-dark-700">
        {/* Sub-tabs with active underline */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('plan-details')}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-semibold transition-all relative ${
              activeTab === 'plan-details'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
            }`}
          >
            <CreditCard size={15} />
            <span>Plan Details</span>
            {activeTab === 'plan-details' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ai-calls')}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-semibold transition-all relative ${
              activeTab === 'ai-calls'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
            }`}
          >
            <Sparkles size={15} />
            <span>AI Calls</span>
            {activeTab === 'ai-calls' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-semibold transition-all relative ${
              activeTab === 'invoices'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
            }`}
          >
            <FileText size={15} />
            <span>Invoices</span>
            {activeTab === 'invoices' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Top Right Action Buttons: Renew Plan + Buy Addon */}
        <div className="flex items-center gap-2.5 pb-2">
          <button
            onClick={() => setIsRenewModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
          >
            Renew Plan
          </button>

          <button
            onClick={() => setIsAddonModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
          >
            Buy Addon
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: PLAN DETAILS VIEW (Screenshots 1 & 2)
          ========================================================================= */}
      {activeTab === 'plan-details' && (
        <div className="space-y-5">
          {/* CARD 1: Current Plan - Unlimited All-in-One Pro matching screenshot 1 */}
          <div className="bg-[#f0f7ff] dark:bg-blue-950/25 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 p-5 shadow-2xs space-y-4">
            {/* Title with icon */}
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-blue-600" />
              <h2 className="text-sm font-bold text-dark-900 dark:text-white">
                Current Plan - Unlimited All-in-One Pro
              </h2>
            </div>

            {/* 3-Column Metrics: Duration, Started on, Expiring on */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="flex items-center gap-3">
                <div className="text-dark-400">
                  <Gauge size={18} />
                </div>
                <div>
                  <p className="text-[11px] text-dark-500 font-medium">Duration</p>
                  <p className="text-xs sm:text-sm font-bold text-dark-900 dark:text-white">
                    455 days
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-dark-400">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-[11px] text-dark-500 font-medium">Started on</p>
                  <p className="text-xs sm:text-sm font-bold text-dark-900 dark:text-white">
                    14 Nov 2025
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-dark-400">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[11px] text-dark-500 font-medium">Expiring on</p>
                  <p className="text-xs sm:text-sm font-bold text-dark-900 dark:text-white">
                    12 Feb 2027
                  </p>
                </div>
              </div>
            </div>

            {/* Unlimited Calls Tag Pill */}
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Sparkles size={12} />
                <span>Unlimited calls</span>
              </span>
            </div>
          </div>

          {/* CARD 2: AutoPay Card matching screenshots 1 & 2 */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-2xs space-y-4">
            {/* Header: AutoPay Active + Manage Mandate Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-sm font-bold text-dark-900 dark:text-white">AutoPay</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Active
                </span>
              </div>

              <button
                onClick={() => setIsManageMandateOpen(true)}
                className="px-3.5 py-1.5 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-800 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
              >
                Manage Mandate
              </button>
            </div>

            {/* 3 Detail Columns: Max amount, Provider, Expires */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <p className="text-[11px] text-dark-500 font-medium">Max amount:</p>
                <p className="text-xs sm:text-sm font-bold text-dark-900 dark:text-white mt-0.5">
                  ₹472
                </p>
              </div>

              <div>
                <p className="text-[11px] text-dark-500 font-medium">Provider:</p>
                <p className="text-xs sm:text-sm font-bold text-dark-900 dark:text-white mt-0.5">
                  RAZORPAY
                </p>
              </div>

              <div>
                <p className="text-[11px] text-dark-500 font-medium">Expires:</p>
                <p className="text-xs sm:text-sm font-bold text-dark-900 dark:text-white mt-0.5">
                  24 Feb 2031
                </p>
              </div>
            </div>
          </div>

          {/* CARD 3: Add-ons Card matching screenshot 2 */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-dark-900 dark:text-white">Add-ons</h3>

            <div className="flex items-center justify-between py-2 border-t border-dark-100 dark:border-dark-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-dark-200 dark:border-dark-700 flex items-center justify-center text-dark-400">
                  <Plus size={15} />
                </div>
                <div>
                  <p className="text-xs font-bold text-dark-900 dark:text-white">Users (x2)</p>
                  <p className="text-[11px] text-dark-400 font-medium">Valid till 12 Feb 2027</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-dark-900 dark:text-white">₹1,180</span>
              </div>
            </div>
          </div>

          {/* CARD 4: Plan History Table matching screenshot 2 */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 flex items-center gap-2 border-b border-dark-100 dark:border-dark-700">
              <History size={16} className="text-dark-500" />
              <h3 className="text-sm font-bold text-dark-900 dark:text-white">Plan History</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f0f7ff] dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 text-dark-600 dark:text-dark-300 font-bold">
                  <tr>
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Started On</th>
                    <th className="py-3 px-4">Valid Till</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60">
                  {planHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-dark-50/50 dark:hover:bg-dark-700/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-dark-500">{item.id}</td>
                      <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white">
                        {item.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400'
                              : 'bg-dark-100 text-dark-700 dark:bg-dark-700 dark:text-dark-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-dark-600 dark:text-dark-300">
                        {item.startedOn}
                      </td>
                      <td className="py-3.5 px-4 text-dark-600 dark:text-dark-300">
                        {item.validTill}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AI CALLS VIEW
          ========================================================================= */}
      {activeTab === 'ai-calls' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-dark-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" /> AI Calls & Summary Usage
                </h3>
                <p className="text-xs text-dark-500 mt-0.5">
                  Intelligent meeting minutes and call transcription usage breakdown
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                179 mins promotional credit left
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900/60 border border-dark-100 dark:border-dark-700">
                <p className="text-xs text-dark-500 font-medium">AI Summaries Generated</p>
                <p className="text-xl font-bold text-dark-900 dark:text-white mt-1">42 calls</p>
                <p className="text-[11px] text-dark-400 mt-0.5">This billing cycle</p>
              </div>
              <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900/60 border border-dark-100 dark:border-dark-700">
                <p className="text-xs text-dark-500 font-medium">Total AI Minutes Consumed</p>
                <p className="text-xl font-bold text-dark-900 dark:text-white mt-1">84 mins</p>
                <p className="text-[11px] text-dark-400 mt-0.5">Billed in 30s pulse</p>
              </div>
              <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900/60 border border-dark-100 dark:border-dark-700">
                <p className="text-xs text-dark-500 font-medium">AI Call Sentiment Accuracy</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  97.4%
                </p>
                <p className="text-[11px] text-emerald-600 mt-0.5">High confidence</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: INVOICES VIEW
          ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-dark-100 dark:border-dark-700">
            <h3 className="text-sm font-bold text-dark-900 dark:text-white">
              Tax Invoices & GST Receipts
            </h3>
            <p className="text-xs text-dark-500 mt-0.5">
              Download GST compliant tax invoices for all subscription renewals and addon purchases
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0f7ff] dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 text-dark-600 dark:text-dark-300 font-bold">
                <tr>
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-dark-50/50 dark:hover:bg-dark-700/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white">{inv.id}</td>
                    <td className="py-3.5 px-4 text-dark-700 dark:text-dark-300">{inv.title}</td>
                    <td className="py-3.5 px-4 text-dark-500">{inv.date}</td>
                    <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white">
                      {inv.amount}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => addToast(`Downloading invoice ${inv.id}...`, 'info')}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold text-xs inline-flex items-center gap-1"
                      >
                        <Download size={13} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: RENEW PLAN MODAL
          ========================================================================= */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                Renew Pro Subscription Plan
              </h3>
              <button
                onClick={() => setIsRenewModalOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <p className="font-bold text-dark-900 dark:text-white">
                  Unlimited All-in-One Pro (1 Year)
                </p>
                <p className="text-dark-500 mt-0.5">
                  Extends validity to 12 Feb 2028 with 10 lead seats and unlimited outbound
                  calling.
                </p>
                <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-2">
                  ₹14,999 / year + GST
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-2">
                <ShieldCheck size={16} className="shrink-0" />
                <span>Auto-debit mandate active via Razorpay UPI.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRenewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 hover:bg-dark-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRenewal}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
              >
                Confirm Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: BUY ADDON MODAL
          ========================================================================= */}
      {isAddonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                Purchase Telephony Add-ons
              </h3>
              <button
                onClick={() => setIsAddonModalOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-dark-200 dark:border-dark-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-dark-900 dark:text-white">+2 Additional Users</p>
                  <p className="text-[11px] text-dark-400">Co-termed till 12 Feb 2027</p>
                </div>
                <span className="font-bold text-dark-900 dark:text-white">₹1,180</span>
              </div>

              <div className="p-3 rounded-xl border border-dark-200 dark:border-dark-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-dark-900 dark:text-white">
                    +500 AI Call Summary Minutes
                  </p>
                  <p className="text-[11px] text-dark-400">Never expires</p>
                </div>
                <span className="font-bold text-dark-900 dark:text-white">₹250</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddonModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 hover:bg-dark-100"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchaseAddon}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: MANAGE MANDATE MODAL
          ========================================================================= */}
      {isManageMandateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                Razorpay AutoPay Mandate
              </h3>
              <button
                onClick={() => setIsManageMandateOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-dark-100 dark:border-dark-700">
                <span className="text-dark-500">Provider</span>
                <span className="font-bold text-dark-900 dark:text-white">RAZORPAY</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-dark-100 dark:border-dark-700">
                <span className="text-dark-500">Max Deductible Amount</span>
                <span className="font-bold text-dark-900 dark:text-white">₹472.00</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-dark-100 dark:border-dark-700">
                <span className="text-dark-500">Frequency</span>
                <span className="font-bold text-dark-900 dark:text-white">As Presented</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-dark-100 dark:border-dark-700">
                <span className="text-dark-500">Expiry Date</span>
                <span className="font-bold text-dark-900 dark:text-white">24 Feb 2031</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-dark-500">Linked Account</span>
                <span className="font-bold text-dark-900 dark:text-white">UPI / billing@smartcrm.com</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsManageMandateOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 hover:bg-dark-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsManageMandateOpen(false);
                  addToast('Mandate details synced with bank', 'info');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
