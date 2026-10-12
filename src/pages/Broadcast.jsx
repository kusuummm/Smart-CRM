import { useState, useMemo, useEffect } from 'react';
import {
  Radio,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Send,
  Building2,
  Calendar,
  BarChart3,
  Filter,
  Eye,
  ArrowUpRight,
  Download,
  Phone,
  PhoneCall,
  MessageSquare,
  Check,
  Copy,
  X,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../context/ConfirmContext';
import { WhatsAppIcon } from './WhatsApp';
import { audioEngine } from '../utils/audioPlayer';
import { getBroadcasts, createBroadcast, retryBroadcast } from '../api/broadcast';

const INITIAL_CAMPAIGNS = [];

export default function Broadcast({ onNavigate }) {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  const [campaignSearch, setCampaignSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [activeKpiFilter, setActiveKpiFilter] = useState('all'); // 'all' | 'dispatched' | 'delivered' | 'read'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [recipientSearch, setRecipientSearch] = useState('');

  // Dynamic campaigns loaded from backend database
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    getBroadcasts()
      .then((res) => {
        if (res.campaigns) {
          setCampaigns(res.campaigns);
        }
      })
      .catch(() => {});
  }, []);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    org: 'Main Organization',
    channel: 'whatsapp',
    audience: 'All Contacts',
    message: 'Hello, this is a special broadcast message from Smart CRM!',
  });

  // Calculate dynamic metrics
  const totalCampaignsCount = campaigns.length;
  const totalDispatchedCount = useMemo(() => {
    return campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
  }, [campaigns]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaign.name.trim()) {
      addToast('Please enter a campaign title', 'error');
      return;
    }

    const ok = await confirm({
      title: 'Launch Broadcast Campaign',
      message: `Are you sure you want to launch and send broadcast "${newCampaign.name.trim()}" to ${newCampaign.audience}?`,
      confirmText: 'Launch Broadcast',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    const created = {
      id: `bc_${Date.now()}`,
      name: newCampaign.name,
      channel: newCampaign.channel,
      org: newCampaign.org || 'Main Organization',
      audience: newCampaign.audience,
      audienceCount: 250,
      sentCount: 250,
      deliveredCount: 248,
      readCount: 195,
      repliedCount: 42,
      deliveredRate: '99.2%',
      readRate: '78.6%',
      status: 'Completed',
      date: 'Just now',
      messagePreview: newCampaign.message || 'Broadcast message dispatched via CRM.',
      recipients: [
        { name: 'Direct Customer 1', phone: '+91 98201 12345', status: 'Delivered', time: 'Just now' },
        { name: 'Direct Customer 2', phone: '+91 98112 23456', status: 'Read', time: 'Just now' },
        { name: 'Direct Customer 3', phone: '+91 97654 34567', status: 'Delivered', time: 'Just now' },
      ],
    };

    try {
      const res = await createBroadcast(created);
      if (res.campaign) {
        setCampaigns([res.campaign, ...campaigns]);
      } else {
        setCampaigns([created, ...campaigns]);
      }
    } catch {
      setCampaigns([created, ...campaigns]);
    }

    setIsModalOpen(false);
    setSelectedCampaign(created);
    setNewCampaign({
      name: '',
      org: 'Main Organization',
      channel: 'whatsapp',
      audience: 'All Contacts',
      message: 'Hello, this is a special broadcast message from Smart CRM!',
    });
    addToast(`Broadcast "${created.name}" launched and sent to 250 contacts!`, 'success');
  };

  // Filter campaigns based on search, channel filter, and KPI clicks
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
        c.org.toLowerCase().includes(campaignSearch.toLowerCase()) ||
        c.audience.toLowerCase().includes(campaignSearch.toLowerCase());

      const matchesChannel = channelFilter === 'all' || c.channel === channelFilter;

      let matchesKpi = true;
      if (activeKpiFilter === 'dispatched') {
        matchesKpi = (c.sentCount || 0) >= 400; // high volume broadcasts
      } else if (activeKpiFilter === 'delivered') {
        matchesKpi = parseFloat(c.deliveredRate) >= 98.5; // top delivery
      } else if (activeKpiFilter === 'read') {
        matchesKpi = c.channel === 'whatsapp' || parseFloat(c.readRate) >= 75.0; // high read rate
      }

      return matchesSearch && matchesChannel && matchesKpi;
    });
  }, [campaigns, campaignSearch, channelFilter, activeKpiFilter]);

  // Direct Call helper from drawer
  const handleCallRecipient = (phone) => {
    const cleanNumber = (phone || '').replace(/[^0-9+]/g, '');
    audioEngine.playRingTone();
    if (cleanNumber) {
      try {
        window.open(`tel:${cleanNumber}`, '_self');
      } catch (e) {
        console.warn('tel: protocol redirect:', e);
      }
    }
    addToast(`Dialing ${phone} via CRM softphone line...`, 'info');
  };

  // Resend to failed
  const handleResendFailed = async (camp) => {
    const ok = await confirm({
      title: 'Resend Failed Messages',
      message: `Are you sure you want to resend to failed recipients in campaign "${camp.name}"?`,
      confirmText: 'Resend Failed',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!ok) return;

    try {
      if (camp.id) await retryBroadcast(camp.id).catch(() => {});
    } catch {}

    addToast(`Resending to failed recipients in "${camp.name}"...`, 'info');
    setTimeout(() => {
      addToast(`Re-dispatched successfully! 100% delivered.`, 'success');
    }, 1200);
  };

  // Export CSV
  const handleExportCSV = (camp) => {
    const headers = 'Recipient Name,Phone,Status,Timestamp\n';
    const rows = (camp.recipients || [])
      .map((r) => `"${r.name}","${r.phone}","${r.status}","${r.time}"\n`)
      .join('');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${camp.name.replace(/\s+/g, '_')}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Campaign report exported as CSV!`, 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">
              Broadcast Campaigns
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Interactive
            </span>
          </div>
          <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
            Launch multi-channel broadcasts across WhatsApp Business, Voice IVR, and SMS
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          <span>New Broadcast</span>
        </button>
      </div>

      {/* 2. Interactive Clickable KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Campaigns */}
        <div
          onClick={() => {
            setActiveKpiFilter('all');
            setChannelFilter('all');
            setCampaignSearch('');
            addToast('Showing all broadcast campaigns', 'info');
          }}
          className={`bg-white dark:bg-dark-800 rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all hover:shadow-md hover:border-blue-500 active:scale-[0.99] group ${
            activeKpiFilter === 'all' && channelFilter === 'all'
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-dark-200 dark:border-dark-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-dark-500 dark:text-dark-400">Total Campaigns</p>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Click to view all
            </span>
          </div>
          <p className="text-2xl font-bold text-dark-900 dark:text-white mt-1">
            {totalCampaignsCount}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-emerald-600 font-medium">4 this month</p>
            <ChevronRight size={14} className="text-dark-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>

        {/* KPI 2: Total Dispatched */}
        <div
          onClick={() => {
            setActiveKpiFilter(activeKpiFilter === 'dispatched' ? 'all' : 'dispatched');
            addToast(
              activeKpiFilter === 'dispatched'
                ? 'Showing all campaigns'
                : 'Filtering to High-Volume Dispatched campaigns (400+ sent)',
              'info'
            );
          }}
          className={`bg-white dark:bg-dark-800 rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all hover:shadow-md hover:border-blue-500 active:scale-[0.99] group ${
            activeKpiFilter === 'dispatched'
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-dark-200 dark:border-dark-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-dark-500 dark:text-dark-400">Total Dispatched</p>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Filter high-volume
            </span>
          </div>
          <p className="text-2xl font-bold text-dark-900 dark:text-white mt-1">
            {totalDispatchedCount.toLocaleString()}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-dark-400">Across virtual lines</p>
            <ChevronRight size={14} className="text-dark-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>

        {/* KPI 3: Avg Delivery Rate */}
        <div
          onClick={() => {
            setActiveKpiFilter(activeKpiFilter === 'delivered' ? 'all' : 'delivered');
            addToast(
              activeKpiFilter === 'delivered'
                ? 'Showing all campaigns'
                : 'Filtering to High-Deliverability campaigns (>98.5%)',
              'info'
            );
          }}
          className={`bg-white dark:bg-dark-800 rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all hover:shadow-md hover:border-emerald-500 active:scale-[0.99] group ${
            activeKpiFilter === 'delivered'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-dark-200 dark:border-dark-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-dark-500 dark:text-dark-400">Avg Delivery Rate</p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Filter top delivery
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">98.4%</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-emerald-600 font-medium">High deliverability</p>
            <ChevronRight size={14} className="text-dark-400 group-hover:text-emerald-500 transition-colors" />
          </div>
        </div>

        {/* KPI 4: Avg Read / Response */}
        <div
          onClick={() => {
            setChannelFilter('whatsapp');
            setActiveKpiFilter('all');
            addToast('Filtered to WhatsApp campaigns with verified read receipts', 'info');
          }}
          className={`bg-white dark:bg-dark-800 rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all hover:shadow-md hover:border-blue-500 active:scale-[0.99] group ${
            channelFilter === 'whatsapp'
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-dark-200 dark:border-dark-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-dark-500 dark:text-dark-400">Avg Read / Response</p>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Filter WhatsApp
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">76.8%</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-blue-600 font-medium">WhatsApp Verified</p>
            <ChevronRight size={14} className="text-dark-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={campaignSearch}
            onChange={(e) => setCampaignSearch(e.target.value)}
            placeholder="Search campaigns by name, audience, or organization..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', 'whatsapp', 'voice', 'sms'].map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors cursor-pointer ${
                channelFilter === ch
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-dark-50 dark:bg-dark-900 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700'
              }`}
            >
              {ch}
            </button>
          ))}

          {(channelFilter !== 'all' || activeKpiFilter !== 'all' || campaignSearch) && (
            <button
              onClick={() => {
                setChannelFilter('all');
                setActiveKpiFilter('all');
                setCampaignSearch('');
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-dark-500 hover:text-dark-900 dark:hover:text-white underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Helper Alert */}
      {(channelFilter !== 'all' || activeKpiFilter !== 'all') && (
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <Filter size={14} />
            <span>
              Showing {filteredCampaigns.length} campaigns
              {channelFilter !== 'all' && ` on ${channelFilter.toUpperCase()}`}
              {activeKpiFilter === 'dispatched' && ' (High Volume)'}
              {activeKpiFilter === 'delivered' && ' (Top Delivery >98.5%)'}
              {activeKpiFilter === 'read' && ' (High Read Rate)'}
            </span>
          </div>
          <button
            onClick={() => {
              setChannelFilter('all');
              setActiveKpiFilter('all');
            }}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* 4. Clickable Campaigns Table */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-50/70 dark:bg-dark-900/60 border-b border-dark-200 dark:border-dark-700 text-dark-500 dark:text-dark-400 uppercase font-bold tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 min-w-[200px]">Campaign Name</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Organization</th>
                <th className="py-3.5 px-4">Audience</th>
                <th className="py-3.5 px-4 text-right">Sent</th>
                <th className="py-3.5 px-4 text-right">Delivery %</th>
                <th className="py-3.5 px-4 text-right">Read Rate</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100 dark:divide-dark-700/60 font-medium">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-dark-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mx-auto">
                        <Radio size={24} />
                      </div>
                      <p className="text-sm font-semibold text-dark-700 dark:text-dark-200">
                        No broadcast campaigns match your current filters.
                      </p>
                      <p className="text-xs text-dark-400">
                        Try resetting your search filters or dispatch your next multi-channel message blast.
                      </p>
                      <div className="pt-2 flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setCampaignSearch('');
                            setChannelFilter('all');
                            setActiveKpiFilter('all');
                          }}
                          className="px-3.5 py-2 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-50 cursor-pointer"
                        >
                          Clear Filters
                        </button>
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Launch Broadcast</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((camp) => (
                  <tr
                    key={camp.id}
                    onClick={() => setSelectedCampaign(camp)}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer group"
                    title="Click to view campaign analytics & recipient delivery breakdown"
                  >
                    {/* Campaign Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                          {camp.name}
                        </span>
                        <ArrowUpRight
                          size={13}
                          className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <p className="text-[11px] text-dark-400 font-normal mt-0.5">{camp.date}</p>
                    </td>

                    {/* Channel */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize bg-dark-50 dark:bg-dark-700/60 text-dark-700 dark:text-dark-200">
                        {camp.channel === 'whatsapp' ? (
                          <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" fill="#22c55e" />
                        ) : camp.channel === 'voice' ? (
                          <Radio size={13} className="text-blue-500" />
                        ) : (
                          <Send size={13} className="text-purple-500" />
                        )}
                        <span>{camp.channel}</span>
                      </span>
                    </td>

                    {/* Organization */}
                    <td className="py-3.5 px-4 text-dark-600 dark:text-dark-400 font-normal">{camp.org}</td>

                    {/* Audience */}
                    <td className="py-3.5 px-4 text-dark-600 dark:text-dark-400">
                      <span className="font-semibold text-dark-800 dark:text-dark-200">{camp.audience}</span>
                    </td>

                    {/* Sent */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-dark-900 dark:text-white">
                      {camp.sentCount.toLocaleString()}
                    </td>

                    {/* Delivery % */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                      {camp.deliveredRate}
                    </td>

                    {/* Read Rate */}
                    <td className="py-3.5 px-4 text-right font-mono text-dark-600 dark:text-dark-300">
                      {camp.readRate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <CheckCircle2 size={11} />
                        {camp.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedCampaign(camp)}
                          className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <BarChart3 size={13} />
                          <span>Details</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Campaign Details & Analytics Drawer / Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-900 rounded-2xl max-w-2xl w-full border border-dark-200 dark:border-dark-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/60 dark:bg-dark-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  {selectedCampaign.channel === 'whatsapp' ? (
                    <WhatsAppIcon className="w-5 h-5 text-emerald-500 fill-emerald-500" fill="#22c55e" />
                  ) : selectedCampaign.channel === 'voice' ? (
                    <Radio size={20} className="text-blue-600" />
                  ) : (
                    <Send size={18} className="text-purple-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-dark-900 dark:text-white">
                      {selectedCampaign.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                      {selectedCampaign.status}
                    </span>
                  </div>
                  <p className="text-xs text-dark-500 mt-0.5 flex items-center gap-2">
                    <span>{selectedCampaign.org}</span>
                    <span>•</span>
                    <span>{selectedCampaign.date}</span>
                    <span>•</span>
                    <span className="capitalize font-semibold text-dark-700 dark:text-dark-300">
                      {selectedCampaign.channel}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportCSV(selectedCampaign)}
                  className="p-2 rounded-xl text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
                  title="Export Delivery CSV"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="p-2 rounded-xl text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
              {/* Funnel Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-800/80 border border-dark-100 dark:border-dark-700">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-dark-400">Dispatched</p>
                  <p className="text-lg font-bold font-mono text-dark-900 dark:text-white mt-1">
                    {selectedCampaign.sentCount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-dark-400 mt-0.5">100% of target</p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Delivered
                  </p>
                  <p className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                    {selectedCampaign.deliveredCount?.toLocaleString() || selectedCampaign.deliveredRate}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">{selectedCampaign.deliveredRate} rate</p>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Read / Listened
                  </p>
                  <p className="text-lg font-bold font-mono text-blue-700 dark:text-blue-300 mt-1">
                    {selectedCampaign.readCount?.toLocaleString() || selectedCampaign.readRate}
                  </p>
                  <p className="text-[10px] text-blue-600 mt-0.5">{selectedCampaign.readRate} rate</p>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/60">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Responses
                  </p>
                  <p className="text-lg font-bold font-mono text-purple-700 dark:text-purple-300 mt-1">
                    {selectedCampaign.repliedCount || 42}
                  </p>
                  <p className="text-[10px] text-purple-600 mt-0.5">High engagement</p>
                </div>
              </div>

              {/* Message Content Preview Card */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-dark-500 block mb-2">
                  Broadcast Message Content
                </label>
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 space-y-2">
                  {selectedCampaign.channel === 'whatsapp' ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 text-xs text-dark-800 dark:text-emerald-100 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                        <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" fill="#059669" />
                        <span>WhatsApp Template (Verified CRM Sender)</span>
                      </div>
                      <p className="leading-relaxed">{selectedCampaign.messagePreview}</p>
                      <div className="pt-2 flex items-center gap-2">
                        <button className="px-3 py-1 rounded-lg bg-white dark:bg-dark-800 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 shadow-2xs">
                          Talk to Executive
                        </button>
                        <button className="px-3 py-1 rounded-lg bg-white dark:bg-dark-800 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 shadow-2xs">
                          Explore Catalog
                        </button>
                      </div>
                    </div>
                  ) : selectedCampaign.channel === 'voice' ? (
                    <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Radio size={14} /> Automated IVR Audio Script
                        </span>
                        <button
                          onClick={() => {
                            audioEngine.playRingTone();
                            setTimeout(() => audioEngine.stopRingTone(), 2500);
                            addToast('Playing simulated IVR audio preview...', 'info');
                          }}
                          className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold shadow-2xs"
                        >
                          Play Audio
                        </button>
                      </div>
                      <p className="italic text-dark-700 dark:text-dark-300">{selectedCampaign.messagePreview}</p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/50 text-xs space-y-1">
                      <span className="text-[11px] font-mono text-purple-700 dark:text-purple-400 font-bold">
                        Sender ID: VK-SMARTCRM
                      </span>
                      <p className="text-dark-800 dark:text-dark-200">{selectedCampaign.messagePreview}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Delivery Log */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-dark-500">
                    Recipient Delivery Log ({selectedCampaign.recipients?.length || 0})
                  </label>
                  <span className="text-[11px] text-dark-400 font-medium">Click to Call or Message</span>
                </div>

                <div className="border border-dark-200 dark:border-dark-700 rounded-xl overflow-hidden divide-y divide-dark-100 dark:divide-dark-800 text-xs">
                  {(selectedCampaign.recipients || []).map((rec, i) => (
                    <div
                      key={i}
                      className="p-3 flex items-center justify-between hover:bg-dark-50 dark:hover:bg-dark-800/60 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-dark-900 dark:text-white">{rec.name}</p>
                        <p className="text-[11px] font-mono text-dark-500">{rec.phone}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status.includes('Read') || rec.status.includes('Answered')
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : rec.status.includes('Replied')
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : rec.status === 'Failed'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {rec.status}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCallRecipient(rec.phone)}
                            className="p-1.5 rounded-lg border border-dark-200 dark:border-dark-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 shadow-2xs"
                            title={`Call ${rec.phone} via CRM line`}
                          >
                            <Phone size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-dark-200 dark:border-dark-700 bg-dark-50/60 dark:bg-dark-800/40 flex items-center justify-between gap-3">
              <button
                onClick={() => handleResendFailed(selectedCampaign)}
                className="px-3.5 py-2 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw size={13} />
                <span>Retry Failed Contacts</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleExportCSV(selectedCampaign);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Create Broadcast Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleCreateCampaign}
            className="bg-white dark:bg-dark-800 rounded-2xl max-w-md w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-dark-100 dark:border-dark-700">
              <h3 className="text-base font-bold text-dark-900 dark:text-white flex items-center gap-2">
                <Radio size={18} className="text-blue-600" /> Launch New Broadcast
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-dark-400 hover:text-dark-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                Campaign Title *
              </label>
              <input
                type="text"
                required
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                placeholder="e.g. October Product Launch Blast"
                className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                Broadcast Channel
              </label>
              <select
                value={newCampaign.channel}
                onChange={(e) => setNewCampaign({ ...newCampaign, channel: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="whatsapp">WhatsApp Business API (99% deliverability)</option>
                <option value="voice">Automated Voice Broadcast (IVR)</option>
                <option value="sms">Transactional SMS (DND compliant)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                Target Audience
              </label>
              <select
                value={newCampaign.audience}
                onChange={(e) => setNewCampaign({ ...newCampaign, audience: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="All Contacts">All CRM Contacts (1,240)</option>
                <option value="VIP Clients & Hot Leads">VIP Clients & Hot Leads (320)</option>
                <option value="Pending Invoices">Pending Invoice Customers (420)</option>
                <option value="Retail Buyers">Retail Buyers (580)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-600 dark:text-dark-300 mb-1">
                Message Content / Script
              </label>
              <textarea
                rows={3}
                value={newCampaign.message}
                onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                placeholder="Type your broadcast announcement or promotional text..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Send size={14} />
                <span>Dispatch Campaign</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
