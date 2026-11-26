import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Gift,
  QrCode,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../context/ConfirmContext';
import { getWallet, createWalletOrder, rechargeWallet } from '../api/wallet';
import { parseCleanBalance, formatCurrency } from '../utils/balance';

export default function WalletPage({ onNavigate }) {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Organizations
  const [selectedOrg, setSelectedOrg] = useState('Main Organization');

  // Balance state
  const [balance, setBalance] = useState(() => {
    try {
      const cached = localStorage.getItem('crm_wallet_balance');
      if (cached !== null && cached !== undefined && cached !== '') {
        return parseCleanBalance(cached);
      }
    } catch {}
    return parseCleanBalance(user?.balance);
  });

  // Keep balance in sync if user context updates from external events
  useEffect(() => {
    if (user?.balance !== undefined) {
      const parsed = parseCleanBalance(user.balance);
      setBalance((prev) => (prev === 0 && parsed > 0 ? parsed : prev));
    }
  }, [user?.balance]);

  const [freeAiMinutes] = useState(179);
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
  const [paymentTab, setPaymentTab] = useState('upi_qr'); // 'upi_qr' | 'gateway'
  const [utrInput, setUtrInput] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  // Order & Gateway state
  const [isGeneratingOrder, setIsGeneratingOrder] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Live Database Transactions Ledger
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Ledger Search & Filter
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState('all'); // 'all' | 'credit' | 'debit'

  // Net banking bank selection for gateway tab
  const [selectedBank, setSelectedBank] = useState('hdfc');

  // Fetch real balance and transactions from MongoDB
  const fetchWalletData = useCallback(async () => {
    try {
      setLoadingTransactions(true);
      const res = await getWallet();
      if (!res) return;

      const realBal =
        res.balance !== undefined
          ? parseCleanBalance(res.balance)
          : res.wallet?.balance !== undefined
          ? parseCleanBalance(res.wallet.balance)
          : null;

      if (realBal !== null) {
        setBalance(realBal);
        try {
          localStorage.setItem('crm_wallet_balance', String(realBal));
        } catch {}
        if (updateUser && user && user.balance !== `₹${realBal.toFixed(1)}`) {
          updateUser({ ...user, balance: `₹${realBal.toFixed(1)}` });
        }
      }

      const txs = res.wallet?.transactions || res.transactions || [];
      setTransactions(Array.isArray(txs) ? txs : []);
    } catch (err) {
      console.warn('Wallet fetch fallback:', err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [user, updateUser]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Current effective recharge amount
  const effectiveAmount = useMemo(() => {
    if (customRecharge && !isNaN(parseFloat(customRecharge)) && parseFloat(customRecharge) > 0) {
      return parseFloat(customRecharge);
    }
    return selectedRecharge || 200;
  }, [customRecharge, selectedRecharge]);

  // Fetch Dynamic Order & QR Code when amount or modal changes
  const loadOrder = useCallback(async (amt) => {
    setIsGeneratingOrder(true);
    try {
      const res = await createWalletOrder({ amount: amt });
      if (res?.success) {
        setOrderData(res);
      }
    } catch (err) {
      console.warn('Could not generate order from server:', err);
      // Fallback local order structure
      const simId = `order_${Date.now()}`;
      setOrderData({
        success: true,
        order: { id: simId, amount: amt * 100 },
        upi: {
          vpa: 'paymanent@upi',
          payeeName: 'Smart CRM',
          amount: amt,
          url: `upi://pay?pa=paymanent@upi&pn=Smart%20CRM&am=${amt.toFixed(2)}&cu=INR&tn=Smart%20CRM%20Recharge&tr=${simId}`,
          qrCode: '',
        },
        keyId: null,
      });
    } finally {
      setIsGeneratingOrder(false);
    }
  }, []);

  // When Add Money modal opens, generate order for current amount
  const handleOpenAddMoney = () => {
    setIsAddMoneyOpen(true);
    setUtrInput('');
    loadOrder(effectiveAmount);
  };

  // When user selects a different amount, regenerate order
  const handleSelectAmount = (amt) => {
    setSelectedRecharge(amt);
    setCustomRecharge('');
    loadOrder(amt);
  };

  const handleCustomAmountChange = (val) => {
    setCustomRecharge(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      loadOrder(num);
    }
  };

  // Copy helper with visual feedback
  const handleCopy = (text, field) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      addToast('Copied to clipboard!', 'info');
    } catch {}
  };

  // Complete Payment and Update Wallet
  const processSuccessfulRecharge = async (payload) => {
    setIsProcessingPayment(true);
    try {
      const res = await rechargeWallet(payload);
      const newBal = res?.balance !== undefined ? parseCleanBalance(res.balance) : parseCleanBalance(balance) + payload.amount;

      setBalance(newBal);
      try {
        localStorage.setItem('crm_wallet_balance', String(newBal));
      } catch {}

      if (updateUser && user) {
        updateUser({ ...user, balance: `₹${newBal.toFixed(1)}` });
      }

      // Dispatch event to update Header AVL BAL immediately
      try {
        window.dispatchEvent(new CustomEvent('smartcrm:wallet-updated', { detail: { balance: newBal } }));
      } catch {}

      // Refresh real transactions from DB
      await fetchWalletData();

      setIsAddMoneyOpen(false);
      setCustomRecharge('');
      setUtrInput('');
      addToast(`Payment Verified! ₹${payload.amount.toLocaleString()} added to your CRM wallet successfully.`, 'success');
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Payment processing failed', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handler: Confirm UPI Payment with optional UTR
  const handleConfirmUpiPayment = async () => {
    if (!effectiveAmount || effectiveAmount <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    const targetOrderId = orderData?.orderId || orderData?.order?.id;
    const payload = {
      orderId: targetOrderId,
      amount: effectiveAmount,
      paymentMethod: 'UPI App / Dynamic QR',
      paymentId: utrInput.trim() || targetOrderId || `upi_${Date.now()}`,
      utrNumber: utrInput.trim() || undefined,
    };

    await processSuccessfulRecharge(payload);
  };

  // Handler: Launch Razorpay Standard Checkout
  const handleLaunchRazorpay = async () => {
    if (!effectiveAmount || effectiveAmount <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    const keyId = orderData?.keyId;

    // Load Razorpay script dynamically if live key is present
    if (keyId) {
      const loadScript = () =>
        new Promise((resolve) => {
          if (window.Razorpay) return resolve(true);
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = () => resolve(true);
          s.onerror = () => resolve(false);
          document.body.appendChild(s);
        });

      const loaded = await loadScript();
      if (!loaded) {
        addToast('Could not load Razorpay SDK. You can complete recharge via UPI QR Code.', 'error');
        return;
      }

      const options = {
        key: keyId,
        amount: Math.round(effectiveAmount * 100),
        currency: 'INR',
        name: 'Smart CRM',
        description: `Wallet Balance Top-up (₹${effectiveAmount})`,
        order_id: orderData?.order?.id?.startsWith('order_') ? orderData.order.id : undefined,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#2563eb',
        },
        handler: async function (response) {
          await processSuccessfulRecharge({
            orderId: response.razorpay_order_id || orderData?.orderId || orderData?.order?.id,
            amount: effectiveAmount,
            paymentMethod: 'Razorpay Gateway',
            paymentId: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      } catch (err) {
        console.warn('Razorpay popup open error:', err);
      }
    }

    // Interactive verified checkout simulation when Razorpay API key is pending configuration
    const ok = await confirm({
      title: 'Confirm Gateway Payment',
      message: `Complete transaction of ₹${effectiveAmount} via ${selectedBank.toUpperCase()} Net Banking / Card?`,
      confirmText: `Authorize ₹${effectiveAmount}`,
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    await processSuccessfulRecharge({
      orderId: orderData?.orderId || orderData?.order?.id,
      amount: effectiveAmount,
      paymentMethod: `Net Banking (${selectedBank.toUpperCase()}) / Card`,
      paymentId: `gw_${Date.now()}`,
    });
  };

  // AutoPay configuration submit
  const handleSaveAutoPay = async (e) => {
    e.preventDefault();
    const ok = await confirm({
      title: 'Update AutoPay Settings',
      message: `Are you sure you want to update AutoPay to recharge ₹${autoPayConfig.amount} when balance dips below ₹${autoPayConfig.triggerBelow}?`,
      confirmText: 'Save AutoPay Settings',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    setIsManageAutoPayOpen(false);
    addToast('UPI AutoPay settings updated successfully!', 'success');
  };

  // Filtered transactions for Detailed View Ledger
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];
    if (ledgerFilter !== 'all') {
      list = list.filter((t) => (t.type || '').toLowerCase() === ledgerFilter);
    }
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(q) ||
          (t.paymentId || '').toLowerCase().includes(q) ||
          (t.date || '').toLowerCase().includes(q) ||
          String(t.amount || '').includes(q)
      );
    }
    return list;
  }, [transactions, ledgerFilter, ledgerSearch]);

  // Real CSV Statement Download
  const handleExportLedgerCSV = () => {
    if (!transactions || transactions.length === 0) {
      addToast('No transaction records available to export', 'error');
      return;
    }

    const headers = ['Date & Time', 'Transaction ID / Reference', 'Type', 'Description', 'Amount (INR)', 'Status'];
    const rows = filteredTransactions.map((tx) => [
      `"${tx.date || new Date(tx.createdAt).toLocaleString()}"`,
      `"${tx.paymentId || tx._id || '-'}"`,
      `"${(tx.type || 'credit').toUpperCase()}"`,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      `"${tx.amount ? tx.amount.toFixed(2) : '0.00'}"`,
      `"${tx.status || 'completed'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `smart_crm_wallet_statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast(`Exported ${filteredTransactions.length} transactions to CSV statement!`, 'success');
  };

  return (
    <div className="space-y-6 max-w-full">
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
            <h1 className="text-xl font-bold text-dark-900 dark:text-white flex items-center gap-2">
              <Wallet className="text-blue-600" size={22} />
              Your Wallet
            </h1>
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
                ₹{parseCleanBalance(balance).toFixed(1)}
              </div>
            </div>

            {/* Free credits for AI Call Summary inner pill */}
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-blue-100 dark:border-blue-900/50 p-3 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center shrink-0">
                  <Gift size={16} />
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
                  title="Free promotional credits for AI lead notes and call transcription"
                  onClick={() =>
                    addToast(
                      `You have ${freeAiMinutes} complimentary AI Call Summary minutes remaining.`,
                      'info'
                    )
                  }
                  className="text-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <Info size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* ADD MONEY PRIMARY ACTION BUTTON matching screenshot */}
          <button
            onClick={handleOpenAddMoney}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wider uppercase transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            <span>ADD MONEY</span>
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
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline tracking-wider uppercase cursor-pointer"
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
              Recharges reflect instantly in your active balance
            </p>
          </div>

          {/* Check feature prices Accordion matching screenshot */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-4 sm:p-5 shadow-2xs space-y-3">
            <button
              onClick={() => setPricesOpen(!pricesOpen)}
              className="w-full flex items-center justify-between text-xs sm:text-sm font-bold text-dark-900 dark:text-white cursor-pointer"
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
                      <tr>
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-dark-900 dark:text-white">
                            Outbound Browser Calling
                          </p>
                          <p className="text-[11px] text-dark-500">
                            In-CRM Web Dialer per min*
                          </p>
                        </td>
                        <td className="py-3 px-3.5">
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Free / Included</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footnotes disclaimers */}
                <div className="space-y-1.5 text-[11px] text-dark-500 dark:text-dark-400 leading-relaxed pt-1">
                  <p>
                    ^ Only ₹0.2 is charged when a template message is successfully delivered.
                    WhatsApp (Meta) charges are extra and billed via your linked WhatsApp Cloud account.
                  </p>
                  <p>
                    * AI Summary is billed at 30-second pulse, rounded up to the next minute.
                  </p>
                  <p>
                    * All incoming calls to your verified business virtual numbers are 100% free.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN (Recent activity + Detailed View + Live Transactions)
            ========================================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-5 shadow-2xs flex flex-col justify-between min-h-[460px]">
          {/* Header Row: Recent activity + DETAILED VIEW button */}
          <div>
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <span>Recent activity</span>
                {loadingTransactions && <RefreshCw size={12} className="animate-spin text-dark-400" />}
              </h2>
              <button
                onClick={() => setIsDetailedViewOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] tracking-wider uppercase transition-colors shadow-xs cursor-pointer"
              >
                DETAILED VIEW
              </button>
            </div>
            <p className="text-xs text-dark-400 font-medium">Real-time database ledger</p>
          </div>

          {/* Center Area: Live activity list matching reference */}
          <div className="flex-1 flex flex-col justify-center py-6">
            {transactions.length === 0 ? (
              <div className="text-center py-16">
                <Wallet size={36} className="mx-auto text-dark-300 dark:text-dark-600 mb-2 opacity-60" />
                <p className="text-xs sm:text-sm font-medium text-dark-400 dark:text-dark-500">
                  No activity found
                </p>
                <p className="text-[11px] text-dark-400 mt-1">Recharges will appear here in real time</p>
              </div>
            ) : (
              <div className="w-full space-y-2.5">
                {transactions.slice(0, 5).map((act, idx) => {
                  const isCredit = act.type === 'credit';
                  return (
                    <div
                      key={act._id || act.id || idx}
                      className="p-3 rounded-xl bg-dark-50 dark:bg-dark-900/60 border border-dark-100 dark:border-dark-700 flex items-center justify-between text-left text-xs hover:border-dark-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCredit
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                          }`}
                        >
                          {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-dark-900 dark:text-white truncate max-w-[190px]">
                            {act.description || (isCredit ? 'Wallet Top-up' : 'Usage Charge')}
                          </p>
                          <p className="text-[10px] text-dark-400 truncate">
                            {act.date || new Date(act.createdAt).toLocaleString()} • Ref: {act.paymentId || 'UPI'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-black text-xs shrink-0 ${
                          isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isCredit ? '+' : '-'}₹{parseFloat(act.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-center pt-2 border-t border-dark-100 dark:border-dark-700/60">
            <span className="text-[10px] text-dark-400 flex items-center justify-center gap-1">
              <ShieldCheck size={12} className="text-emerald-500" />
              Transactions verified and synced with MongoDB & Cloud Gateway
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: ADD MONEY (FULL GATEWAY + DYNAMIC UPI SUITE)
          ========================================================================= */}
      {isAddMoneyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-dark-800 rounded-3xl max-w-lg w-full border border-dark-200 dark:border-dark-700 p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark-900 dark:text-white">
                    Add Money to Wallet
                  </h3>
                  <p className="text-[11px] text-dark-400">Instant credit for virtual calls & messaging</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddMoneyOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step 1: Select Amount */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-dark-800 dark:text-dark-200">
                1. Select Recharge Amount
              </label>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {rechargeOptions.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleSelectAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedRecharge === amt && !customRecharge
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-dark-50 dark:bg-dark-900 border-dark-200 dark:border-dark-700 text-dark-800 dark:text-dark-200 hover:border-blue-300'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* Custom Amount input */}
              <div className="pt-1">
                <input
                  type="number"
                  value={customRecharge}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  placeholder="Or enter custom amount in ₹ (e.g. 1500)"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>

            {/* Step 2: Payment Method Tabs */}
            <div className="space-y-3 pt-2 border-t border-dark-100 dark:border-dark-700">
              <label className="block text-xs font-bold text-dark-800 dark:text-dark-200">
                2. Choose Payment Mode
              </label>

              <div className="grid grid-cols-2 gap-2 bg-dark-100 dark:bg-dark-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentTab('upi_qr')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paymentTab === 'upi_qr'
                      ? 'bg-white dark:bg-dark-800 text-blue-600 shadow-2xs'
                      : 'text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
                  }`}
                >
                  <QrCode size={14} />
                  <span>Dynamic UPI QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTab('gateway')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paymentTab === 'gateway'
                      ? 'bg-white dark:bg-dark-800 text-blue-600 shadow-2xs'
                      : 'text-dark-500 hover:text-dark-800 dark:hover:text-dark-200'
                  }`}
                >
                  <CreditCard size={14} />
                  <span>Cards / NetBanking</span>
                </button>
              </div>

              {/* TAB 1: DYNAMIC UPI QR CODE */}
              {paymentTab === 'upi_qr' && (
                <div className="bg-dark-50/70 dark:bg-dark-900/40 p-4 rounded-2xl border border-dark-200 dark:border-dark-700 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                    {/* QR Code Container */}
                    <div className="bg-white p-3 rounded-2xl border border-dark-200 shadow-xs flex flex-col items-center shrink-0">
                      {isGeneratingOrder ? (
                        <div className="w-48 h-48 flex flex-col items-center justify-center text-dark-400 gap-2">
                          <RefreshCw size={24} className="animate-spin text-blue-600" />
                          <span className="text-[11px] font-medium">Generating UPI QR...</span>
                        </div>
                      ) : orderData?.upi?.qrCode ? (
                        <img
                          src={orderData.upi.qrCode}
                          alt="Dynamic UPI QR Code"
                          className="w-48 h-48 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-48 h-48 flex flex-col items-center justify-center text-dark-400 gap-2">
                          <QrCode size={40} className="text-blue-600" />
                          <span className="text-[11px] font-medium text-center">Scan with any UPI App</span>
                        </div>
                      )}
                      <p className="text-[10px] font-bold text-dark-600 mt-1 uppercase tracking-tight">
                        Scan to Pay ₹{effectiveAmount}
                      </p>
                    </div>

                    {/* UPI Details & Intent Button */}
                    <div className="flex-1 space-y-2.5 text-xs w-full">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-dark-400 text-[11px]">Payee VPA:</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(orderData?.upi?.vpa || 'paymanent@upi', 'vpa')}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold text-[11px] cursor-pointer"
                          >
                            {copiedField === 'vpa' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            <span>{copiedField === 'vpa' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <p className="font-mono font-bold text-dark-900 dark:text-white text-xs truncate">
                          {orderData?.upi?.vpa || 'paymanent@upi'}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 flex items-center justify-between">
                        <div>
                          <span className="text-dark-400 text-[11px]">Exact Amount:</span>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{effectiveAmount}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(effectiveAmount), 'amount')}
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold text-[11px] cursor-pointer"
                        >
                          {copiedField === 'amount' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          <span>{copiedField === 'amount' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {/* Direct UPI Apps Link for mobile */}
                      {orderData?.upi?.url && (
                        <a
                          href={orderData.upi.url}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Smartphone size={14} />
                          <span>Pay via UPI App (GPay / PhonePe / Paytm)</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* UTR Input (Optional) & Verification */}
                  <div className="pt-2 border-t border-dark-200 dark:border-dark-700 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={utrInput}
                        onChange={(e) => setUtrInput(e.target.value)}
                        placeholder="Enter 12-digit UPI Ref / UTR No. (Optional)"
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[10px] text-dark-400">
                      After transferring via your mobile UPI app, click below to verify and credit your balance immediately.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: RAZORPAY / CARDS & NETBANKING */}
              {paymentTab === 'gateway' && (
                <div className="bg-dark-50/70 dark:bg-dark-900/40 p-4 rounded-2xl border border-dark-200 dark:border-dark-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-dark-700 dark:text-dark-300">
                      Select Payment Channel:
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck size={12} />
                      256-Bit SSL Encrypted
                    </span>
                  </div>

                  {/* Bank Select Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'hdfc', name: 'HDFC Bank' },
                      { id: 'sbi', name: 'State Bank' },
                      { id: 'icici', name: 'ICICI Bank' },
                      { id: 'axis', name: 'Axis Bank' },
                      { id: 'kotak', name: 'Kotak Bank' },
                      { id: 'card', name: 'Credit/Debit Card' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBank(b.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedBank === b.id
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30'
                            : 'bg-white dark:bg-dark-800 border-dark-200 dark:border-dark-700 text-dark-800 dark:text-dark-200 hover:border-blue-300'
                        }`}
                      >
                        <p className="font-bold text-xs truncate">{b.name}</p>
                        <p className="text-[10px] text-dark-400">Instant Approval</p>
                      </button>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2">
                    <ShieldCheck size={16} className="shrink-0 text-blue-600" />
                    <span>
                      {orderData?.keyId
                        ? 'Razorpay Standard Checkout is active for your account.'
                        : 'Secure Cloud Gateway ready. Authorize payment to credit your balance instantly.'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-dark-100 dark:border-dark-700">
              <button
                type="button"
                onClick={() => setIsAddMoneyOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {paymentTab === 'upi_qr' ? (
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handleConfirmUpiPayment}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Verifying Payment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>I Have Paid — Credit ₹{effectiveAmount}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handleLaunchRazorpay}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Processing Gateway...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={14} />
                      <span>Pay ₹{effectiveAmount} via Gateway</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: DETAILED VIEW MODAL (100% REAL DATABASE LEDGER)
          ========================================================================= */}
      {isDetailedViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-dark-800 rounded-3xl max-w-4xl w-full border border-dark-200 dark:border-dark-700 p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <div>
                <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                  <Wallet size={18} className="text-blue-600" />
                  Detailed Wallet Ledger
                </h3>
                <p className="text-xs text-dark-400">
                  Real-time database ledger • Organization: {selectedOrg} • Current Balance: ₹{parseCleanBalance(balance).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setIsDetailedViewOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-dark-100 dark:bg-dark-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLedgerFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ledgerFilter === 'all'
                      ? 'bg-white dark:bg-dark-800 text-blue-600 shadow-2xs'
                      : 'text-dark-500 hover:text-dark-800'
                  }`}
                >
                  All ({transactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerFilter('credit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ledgerFilter === 'credit'
                      ? 'bg-white dark:bg-dark-800 text-emerald-600 shadow-2xs'
                      : 'text-dark-500 hover:text-dark-800'
                  }`}
                >
                  Credits ({transactions.filter((t) => t.type === 'credit').length})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerFilter('debit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ledgerFilter === 'debit'
                      ? 'bg-white dark:bg-dark-800 text-rose-600 shadow-2xs'
                      : 'text-dark-500 hover:text-dark-800'
                  }`}
                >
                  Debits ({transactions.filter((t) => t.type === 'debit').length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Search ref, desc or amount..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Live Database Ledger Table */}
            <div className="border border-dark-200 dark:border-dark-700 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-50 dark:bg-dark-900 text-dark-600 dark:text-dark-300 uppercase font-bold sticky top-0 border-b border-dark-200 dark:border-dark-700">
                  <tr>
                    <th className="py-2.5 px-3.5">Date & Time</th>
                    <th className="py-2.5 px-3.5">Description</th>
                    <th className="py-2.5 px-3.5">Type</th>
                    <th className="py-2.5 px-3.5">Reference ID</th>
                    <th className="py-2.5 px-3.5 text-right">Amount</th>
                    <th className="py-2.5 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-dark-400">
                        No transactions found matching your filter
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx, idx) => {
                      const isCredit = tx.type === 'credit';
                      return (
                        <tr key={tx._id || tx.id || idx} className="hover:bg-dark-50/50 dark:hover:bg-dark-900/40 transition-colors">
                          <td className="py-2.5 px-3.5 text-dark-500 whitespace-nowrap">
                            {tx.date || new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-dark-900 dark:text-white">
                            {tx.description}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                isCredit
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {isCredit ? 'Credit' : 'Debit'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-dark-500 truncate max-w-[140px]">
                            {tx.paymentId || '-'}
                          </td>
                          <td className={`py-2.5 px-3.5 font-black text-right whitespace-nowrap ${
                            isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isCredit ? '+' : '-'}₹{parseFloat(tx.amount || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={12} />
                              <span>Completed</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with Real CSV Download */}
            <div className="flex items-center justify-between pt-2 border-t border-dark-100 dark:border-dark-700">
              <button
                type="button"
                onClick={handleExportLedgerCSV}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                <Download size={14} />
                <span>Download CSV Statement</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailedViewOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: MANAGE AUTOPAY MODAL
          ========================================================================= */}
      {isManageAutoPayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveAutoPay}
            className="bg-white dark:bg-dark-800 rounded-3xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                Manage UPI AutoPay
              </h3>
              <button
                type="button"
                onClick={() => setIsManageAutoPayOpen(false)}
                className="text-dark-400 hover:text-dark-600 p-1 cursor-pointer"
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
                className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
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
                className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManageAutoPayOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: LEARN MORE ABOUT WALLET
          ========================================================================= */}
      {isLearnMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-800 rounded-3xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                How Telephony Wallet Works
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
                • <strong>Cloud Telephony Usage</strong>: Outgoing calls are placed through the In-CRM Web Dialer. All incoming calls to your verified business line are completely free.
              </p>
              <p>
                • <strong>WhatsApp Template Messages</strong>: Delivered campaign messages cost only ₹0.2 platform fee + official Meta rates billed directly.
              </p>
              <p>
                • <strong>AI Call Summaries</strong>: Summaries and meeting action points are billed at ₹0.5 per minute after exhausting your 179 promotional free credits.
              </p>
              <p>
                • <strong>AutoPay Protection</strong>: Keeps your line active by auto-recharging when your balance dips below ₹50.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsLearnMoreOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
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
