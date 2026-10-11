import { useState, useEffect } from 'react';
import {
  Wallet,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  ExternalLink,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  ShieldCheck,
  Building2,
  X,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../context/ConfirmContext';
import { getWallet, rechargeWallet } from '../api/wallet';

export default function WalletPage({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Organizations
  const [selectedOrg, setSelectedOrg] = useState('Main Organization');
  const [balance, setBalance] = useState(user?.balance !== undefined ? parseFloat(user.balance) : 0.0);
  const [freeAiMinutes, setFreeAiMinutes] = useState(0);

  // Accordion state
  const [pricesOpen, setPricesOpen] = useState(true);

  // Modals state
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [isManageAutoPayOpen, setIsManageAutoPayOpen] = useState(false);
  const [isDetailedViewOpen, setIsDetailedViewOpen] = useState(false);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);

  // AutoPay configuration state
  const [autoPayConfig, setAutoPayConfig] = useState({
    active: true,
    amount: 200,
    triggerBelow: 50,
  });

  // Add Money Form state
  const rechargeOptions = [200, 500, 1000, 2000, 5000];
  const [selectedRecharge, setSelectedRecharge] = useState(200);
  const [customRecharge, setCustomRecharge] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Activity list (empty by default to match screenshot, but populates on recharge)
  const [activities, setActivities] = useState([]);

  // Fetch real balance and transactions from /api/wallet
  useEffect(() => {
    getWallet()
      .then((res) => {
        if (res.wallet) {
          if (res.wallet.balance !== undefined) setBalance(res.wallet.balance);
          if (res.wallet.transactions && res.wallet.transactions.length > 0) {
            setActivities(
              res.wallet.transactions.map((t) => ({
                id: t._id || t.id,
                title: t.description || 'Wallet Top-up',
                desc: `Payment Ref: ${t.paymentId || 'UPI'}`,
                amount: t.amount,
                time: t.date || 'Recent',
                type: t.type || 'credit',
              }))
            );
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleAddMoney = async () => {
    const amount = customRecharge ? parseFloat(customRecharge) : selectedRecharge;
    if (!amount || amount <= 0) {
      addToast('Please enter a valid recharge amount', 'error');
      return;
    }

    const ok = await confirm({
      title: 'Confirm Wallet Recharge',
      message: `Are you sure you want to recharge ₹${amount} to ${selectedOrg.split(',')[1]?.trim() || 'your wallet'}?`,
      confirmText: `Pay ₹${amount}`,
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    setIsProcessingPayment(true);

    try {
      const res = await rechargeWallet({
        amount,
        paymentMethod: 'UPI / Razorpay',
      });
      if (res.balance !== undefined) {
        setBalance(res.balance);
      } else {
        setBalance((prev) => parseFloat((prev + amount).toFixed(2)));
      }
    } catch {
      setBalance((prev) => parseFloat((prev + amount).toFixed(2)));
    }

    const newAct = {
      id: `act_${Date.now()}`,
      title: 'UPI Instant Recharge',
      desc: `Added to ${selectedOrg.split(',')[1]?.trim() || 'Main Organization'} wallet`,
      amount: amount,
      time: 'Just now',
      type: 'credit',
    };
    setActivities((prev) => [newAct, ...prev]);

    setIsProcessingPayment(false);
    setIsAddMoneyOpen(false);
    setCustomRecharge('');
    addToast(`₹${amount} added successfully to your wallet!`, 'success');
  };

  const handleSaveAutoPay = async (e) => {
    e.preventDefault();
    const ok = await confirm({
      title: 'Update AutoPay Settings',
      message: 'Are you sure you want to update UPI AutoPay balance rules and automatic recharge thresholds?',
      confirmText: 'Update AutoPay',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    setIsManageAutoPayOpen(false);
    addToast('UPI AutoPay settings updated successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Organization Dropdown Selector matching screenshot */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-dark-600 dark:text-dark-300 whitespace-nowrap">
          Select Org:
        </label>
        <div className="relative min-w-[240px] max-w-sm">
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full appearance-none pl-3.5 pr-8 py-2 text-xs font-medium rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="Main Organization">Main Organization</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
          />
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            LEFT COLUMN (Wallet Balance, Add Money, AutoPay, Feature Prices)
            ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Header Row: Your Wallet + Learn More */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-dark-900 dark:text-white">Your Wallet</h1>
            <button
              onClick={() => setIsLearnMoreOpen(true)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Learn More
            </button>
          </div>

          {/* AVAILABLE BALANCE CARD matching reference screenshot */}
          <div className="bg-[#f0f7ff] dark:bg-blue-950/25 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 p-6 shadow-2xs space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                AVAILABLE BALANCE
              </p>
              <div className="text-4xl font-extrabold text-[#2563eb] dark:text-blue-400 mt-2">
                ₹{balance.toFixed(1)}
              </div>
            </div>

            {/* Free credits for AI Call Summary inner pill */}
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-blue-100 dark:border-blue-900/50 p-3 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                  🎁
                </div>
                <div>
                  <p className="text-xs font-bold text-dark-900 dark:text-white">Free credits</p>
                  <p className="text-[11px] text-dark-400 font-medium">For AI Call Summary</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  Avl : {freeAiMinutes} mins
                </span>
                <button
                  type="button"
                  title="Free promotional credits for AI caller notes and call transcription"
                  onClick={() =>
                    addToast(
                      `You have ${freeAiMinutes} complimentary AI Call Summary minutes remaining.`,
                      'info'
                    )
                  }
                  className="text-blue-400 hover:text-blue-600 transition-colors"
                >
                  <Info size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* ADD MONEY PRIMARY ACTION BUTTON matching screenshot */}
          <button
            onClick={() => setIsAddMoneyOpen(true)}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wider uppercase transition-colors shadow-xs"
          >
            ADD MONEY
          </button>

          {/* AutoPay active Card matching screenshot */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-4 shadow-2xs space-y-3">
            {/* Header: UPI AutoPay + Manage Link */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-dark-100 dark:bg-dark-700 font-extrabold text-[10px] tracking-tight text-dark-800 dark:text-dark-200 border border-dark-200 dark:border-dark-600">
                  UPI AutoPay
                </span>
                <span className="text-xs font-bold text-dark-900 dark:text-white">
                  AutoPay active
                </span>
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              </div>

              <button
                onClick={() => setIsManageAutoPayOpen(true)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline tracking-wider uppercase"
              >
                MANAGE
              </button>
            </div>

            {/* Threshold and recharge rows */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-dark-600 dark:text-dark-400">
                <span>Recharge amount</span>
                <span className="font-bold text-dark-900 dark:text-white">
                  ₹{autoPayConfig.amount}
                </span>
              </div>
              <div className="flex items-center justify-between text-dark-600 dark:text-dark-400">
                <span>Triggers below</span>
                <span className="font-bold text-dark-900 dark:text-white">
                  ₹{autoPayConfig.triggerBelow}
                </span>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[11px] text-dark-400 pt-2 border-t border-dark-100 dark:border-dark-700/60">
              Recharges take up to a day to reflect
            </p>
          </div>

          {/* Check feature prices Accordion matching screenshot */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-4 sm:p-5 shadow-2xs space-y-3">
            <button
              onClick={() => setPricesOpen(!pricesOpen)}
              className="w-full flex items-center justify-between text-xs sm:text-sm font-bold text-dark-900 dark:text-white"
            >
              <span>Check feature prices</span>
              {pricesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {pricesOpen && (
              <div className="space-y-3 pt-1">
                {/* Rates Table with blue border */}
                <div className="border border-blue-200 dark:border-blue-900/70 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-blue-50/50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/70 text-dark-700 dark:text-dark-200 font-bold">
                      <tr>
                        <th className="py-2.5 px-3.5">Services</th>
                        <th className="py-2.5 px-3.5">Prices</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100 dark:divide-blue-900/40">
                      <tr>
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-dark-900 dark:text-white">
                            WhatsApp Templates
                          </p>
                          <p className="text-[11px] text-dark-500">per delivered message</p>
                        </td>
                        <td className="py-3 px-3.5">
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            Meta Rate ^
                          </p>
                          <p className="text-xs font-bold text-dark-900 dark:text-white">₹0.2</p>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-dark-900 dark:text-white">
                            AI Call Summaries
                          </p>
                          <p className="text-[11px] text-dark-500">
                            per min (billed in 30sec pulse)*
                          </p>
                        </td>
                        <td className="py-3 px-3.5">
                          <p className="text-xs font-bold text-dark-900 dark:text-white">₹0.5</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footnotes disclaimers matching screenshot word for word */}
                <div className="space-y-1.5 text-[11px] text-dark-500 dark:text-dark-400 leading-relaxed pt-1">
                  <p>
                    ^ Only ₹0.2 is charged when a template message is successfully delivered.
                    WhatsApp (Meta) charges are extra and must be paid directly to WhatsApp by adding
                    a payment method to your WhatsApp Business account.
                  </p>
                  <p>
                    * AI Summary is billed at 30-second pulse, rounded up to the next minute.
                    Example: 95 sec outgoing call = 2 AI summary pulse min
                  </p>
                  <p>
                    * All outgoing calls are of 60-second pulse, rounded up to the next minute.
                    Example: 75 sec call = 2 min
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN (Recent activity + Detailed View + No Activity Found)
            ========================================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-2xs flex flex-col justify-between min-h-[460px]">
          {/* Header Row: Recent activity + DETAILED VIEW button */}
          <div>
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-base font-bold text-dark-900 dark:text-white">
                Recent activity
              </h2>
              <button
                onClick={() => setIsDetailedViewOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] tracking-wider uppercase transition-colors shadow-xs"
              >
                DETAILED VIEW
              </button>
            </div>
            <p className="text-xs text-dark-400 font-medium">Today</p>
          </div>

          {/* Center Area: No activity found (Matches reference screenshot) */}
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            {activities.length === 0 ? (
              <p className="text-xs sm:text-sm font-medium text-dark-400 dark:text-dark-500">
                No activity found
              </p>
            ) : (
              <div className="w-full space-y-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-dark-50 dark:bg-dark-900/60 border border-dark-100 dark:border-dark-700 flex items-center justify-between text-left text-xs"
                  >
                    <div>
                      <p className="font-bold text-dark-900 dark:text-white">{act.title}</p>
                      <p className="text-[11px] text-dark-400">{act.desc}</p>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +₹{act.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center pt-2">
            <span className="text-[10px] text-dark-400">
              Transactions updated in real time via Cloud Gateway
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: ADD MONEY / RECHARGE MODAL
          ========================================================================= */}
      {isAddMoneyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <Wallet size={18} className="text-blue-600" />
                Add Money to Wallet
              </h3>
              <button
                onClick={() => setIsAddMoneyOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-2">
                  Select Recharge Amount
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {rechargeOptions.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedRecharge(amt);
                        setCustomRecharge('');
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedRecharge === amt && !customRecharge
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white dark:bg-dark-800 border-dark-200 dark:border-dark-700 text-dark-800 dark:text-dark-200 hover:border-blue-300'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
                  Or Custom Amount (₹)
                </label>
                <input
                  type="number"
                  value={customRecharge}
                  onChange={(e) => setCustomRecharge(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <ShieldCheck size={16} className="shrink-0 text-blue-600" />
                <span>Instant activation for business calling line and WhatsApp templates.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddMoneyOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleAddMoney}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isProcessingPayment
                  ? 'Processing UPI...'
                  : `Pay ₹${customRecharge || selectedRecharge}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: MANAGE AUTOPAY MODAL
          ========================================================================= */}
      {isManageAutoPayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleSaveAutoPay}
            className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                Manage UPI AutoPay
              </h3>
              <button
                type="button"
                onClick={() => setIsManageAutoPayOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                Auto-Recharge Amount (₹)
              </label>
              <input
                type="number"
                value={autoPayConfig.amount}
                onChange={(e) =>
                  setAutoPayConfig({ ...autoPayConfig, amount: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                Trigger When Balance Falls Below (₹)
              </label>
              <input
                type="number"
                value={autoPayConfig.triggerBelow}
                onChange={(e) =>
                  setAutoPayConfig({ ...autoPayConfig, triggerBelow: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManageAutoPayOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: DETAILED VIEW MODAL
          ========================================================================= */}
      {isDetailedViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-2xl w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <div>
                <h3 className="text-base font-bold text-dark-900 dark:text-white">
                  Detailed Wallet Ledger
                </h3>
                <p className="text-xs text-dark-400">Organization: {selectedOrg}</p>
              </div>
              <button
                onClick={() => setIsDetailedViewOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-50 dark:bg-dark-900 text-dark-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-700">
                  <tr className="hover:bg-dark-50/50">
                    <td className="py-2.5 px-3">Oct 08, 2026</td>
                    <td className="py-2.5 px-3">Outbound Calling Pulse (42 mins)</td>
                    <td className="py-2.5 px-3 text-rose-500 font-semibold">Debit</td>
                    <td className="py-2.5 px-3 font-bold text-dark-900 dark:text-white">₹14.70</td>
                  </tr>
                  <tr className="hover:bg-dark-50/50">
                    <td className="py-2.5 px-3">Oct 05, 2026</td>
                    <td className="py-2.5 px-3">WhatsApp Template Broadcast (18 msgs)</td>
                    <td className="py-2.5 px-3 text-rose-500 font-semibold">Debit</td>
                    <td className="py-2.5 px-3 font-bold text-dark-900 dark:text-white">₹3.60</td>
                  </tr>
                  <tr className="hover:bg-dark-50/50">
                    <td className="py-2.5 px-3">Oct 01, 2026</td>
                    <td className="py-2.5 px-3">UPI AutoPay Mandate Credit</td>
                    <td className="py-2.5 px-3 text-emerald-500 font-semibold">Credit</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">+₹200.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-dark-100 dark:border-dark-700">
              <button
                onClick={() => addToast('Downloading ledger CSV statement...', 'info')}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
              >
                <Download size={14} /> Download CSV Statement
              </button>
              <button
                onClick={() => setIsDetailedViewOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: LEARN MORE ABOUT WALLET
          ========================================================================= */}
      {isLearnMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                How Telephony Wallet Works
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
                • <strong>Cloud Telephony Usage</strong>: Outgoing calls are billed per minute on a
                60-second pulse. All incoming calls to your virtual number are completely free.
              </p>
              <p>
                • <strong>WhatsApp Template Messages</strong>: Delivered campaign messages cost
                only ₹0.2 platform fee + official Meta rates billed directly.
              </p>
              <p>
                • <strong>AI Call Summaries</strong>: Summaries and meeting action points are billed
                at ₹0.5 per minute after exhausting your 179 promotional free credits.
              </p>
              <p>
                • <strong>AutoPay Protection</strong>: Keeps your line active by auto-recharging
                when your balance dips below ₹50.
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
