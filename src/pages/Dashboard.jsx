import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { Users, TrendingUp, CalendarCheck, Clock, MessageCircle, Mail, BarChart3 as BarChart3Icon, Phone, Loader2, Bell, Gift } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { getDashboardStats } from '../api/dashboard';
import { getLeads } from '../api/leads';
import { getTodayFollowUps, getFollowUps } from '../api/followups';
import { getCalls } from '../api/callHistory';
import { getUpcomingEvents } from '../api/events';

const COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  gray: '#64748b',
  indigo: '#6366f1',
};

const LEAD_STATUS_COLORS = {
  new: COLORS.blue,
  contacted: COLORS.yellow,
  interested: COLORS.purple,
  'follow-up': COLORS.orange,
  converted: COLORS.green,
  'not-interested': COLORS.gray,
  closed: COLORS.red,
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-dark-200 dark:border-dark-700 p-3">
      <p className="text-sm font-semibold text-dark-900 dark:text-white mb-1">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
          <span className="text-dark-600 dark:text-dark-400 dark:text-dark-300">{entry.name}:</span>
          <span className="font-semibold text-dark-900 dark:text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard({ onNavigate }) {
  const { t } = useApp();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [followUpTrend, setFollowUpTrend] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const handleStatClick = (route) => {
    if (onNavigate) onNavigate(route);
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, leadsData, todayData, callsData, allFollowUpsData, upcomingEventsData] = await Promise.all([
        getDashboardStats(),
        getLeads({ limit: 1000 }),
        getTodayFollowUps(),
        getCalls({ limit: 5 }),
        getFollowUps({ limit: 1000 }),
        getUpcomingEvents(7),
      ]);

      setStats(statsData.stats);
      setLeads(leadsData.leads);
      setTodayFollowUps(todayData.followUps);
      setRecentCalls(callsData.calls);
      setUpcomingEvents(upcomingEventsData.events);

      // Build a simple 7-day follow-up trend (pending vs completed by date)
      // from the real follow-up records, since there's no separate
      // historical-analytics endpoint.
      const byDate = {};
      allFollowUpsData.followUps.forEach((fu) => {
        if (!byDate[fu.date]) byDate[fu.date] = { date: fu.date, pending: 0, completed: 0 };
        byDate[fu.date][fu.status === 'completed' ? 'completed' : 'pending'] += 1;
      });
      const sortedDays = Object.values(byDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-7)
        .map((d) => ({ ...d, label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }));
      setFollowUpTrend(sortedDays);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const leadStatusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});
  const leadChartData = Object.entries(leadStatusCounts).map(([name, value]) => ({
    name: name.replace('-', ' '),
    value,
    color: LEAD_STATUS_COLORS[name] || COLORS.gray,
  }));
  const convertedCount = leadStatusCounts.converted || 0;
  const conversionRate = leads.length > 0 ? Math.round((convertedCount / leads.length) * 100) : 0;

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-24 text-dark-400 dark:text-dark-500">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">{t('dashboard')}</h1>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">{t('welcomeBack') || "Here's your CRM overview"}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-300 bg-white dark:bg-dark-800 px-4 py-2 rounded-lg border border-dark-200 dark:border-dark-700">
          <span className="font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => handleStatClick('customers')} className="group bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{t('totalCustomers')}</p>
              <p className="text-3xl font-bold text-dark-900 dark:text-white mt-1">{stats.totalCustomers}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div onClick={() => handleStatClick('leads')} className="group bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{t('totalLeads')}</p>
              <p className="text-3xl font-bold text-dark-900 dark:text-white mt-1">{stats.totalLeads}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div onClick={() => handleStatClick('followups')} className="group bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{t('todaysFollowups')}</p>
              <p className="text-3xl font-bold text-dark-900 dark:text-white mt-1">{stats.todayFollowUps}</p>
              <p className="text-xs text-dark-400 dark:text-dark-500 mt-1">{stats.pendingFollowUps} pending</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarCheck className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </div>

        <div onClick={() => handleStatClick('calls')} className="group bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{t('totalCalls')}</p>
              <p className="text-3xl font-bold text-dark-900 dark:text-white mt-1">{recentCalls.length}</p>
              <p className="text-xs text-dark-400 dark:text-dark-500 mt-1">Recent</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
          </div>
        </div>

        <div onClick={() => handleStatClick('whatsapp')} className="group bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{t('whatsappSent')}</p>
              <p className="text-3xl font-bold text-dark-900 dark:text-white mt-1">{stats.totalWhatsAppSent}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircle className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div onClick={() => handleStatClick('emails')} className="group bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{t('emailsSent')}</p>
              <p className="text-3xl font-bold text-dark-900 dark:text-white mt-1">{stats.totalEmailsSent}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="text-red-600 dark:text-red-400" size={24} />
            </div>
          </div>
        </div>

        <div className="group bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 transition-all cursor-pointer" onClick={() => handleStatClick('reports')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{t('conversionRate')}</p>
              <p className="text-3xl font-bold text-dark-900 dark:text-white mt-1">{conversionRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3Icon className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
          </div>
        </div>

        <div className="group bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 transition-all cursor-pointer" onClick={() => handleStatClick('followups')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{t('pendingFollowups')}</p>
              <p className="text-3xl font-bold text-dark-900 dark:text-white mt-1">{stats.pendingFollowUps}</p>
              <p className="text-xs text-dark-400 dark:text-dark-500 mt-1">{stats.completedFollowUps} completed</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Follow-up Trend (last 7 active days)</h3>
          </div>
          <div className="h-[320px]">
            {followUpTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-dark-400 dark:text-dark-500 text-sm">No follow-up activity yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={followUpTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 20 }} />
                  <Bar dataKey="pending" name="Pending" fill={COLORS.orange} radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="completed" name="Completed" fill={COLORS.green} radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">{t('leadDistribution')}</h3>
            <span className="text-xs font-medium text-dark-500 dark:text-dark-400 bg-dark-100 dark:bg-dark-700 px-3 py-1.5 rounded-md">{leads.length} Total Leads</span>
          </div>
          {leads.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-dark-400 dark:text-dark-500 text-sm">No leads yet</div>
          ) : (
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="relative w-56 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {leadChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-dark-900 dark:text-white">{leads.length}</span>
                <span className="text-xs text-dark-500 dark:text-dark-400">{t('totalLeads')}</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {leadChartData.map((item) => {
                const percentage = Math.round((item.value / leads.length) * 100);
                return (
                  <div
                    key={item.name}
                    onClick={() => onNavigate?.('leads', item.name.replace(' ', '-'), 'status')}
                    className="flex items-center gap-3 p-3 rounded-lg bg-dark-50 dark:bg-dark-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors cursor-pointer"
                  >
                    <div className="w-4 h-4 rounded-lg shadow-sm" style={{ backgroundColor: item.color }}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-900 dark:text-white truncate capitalize">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-dark-200 dark:bg-dark-600 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: item.color }}></div>
                        </div>
                        <span className="text-xs font-bold text-dark-700 dark:text-dark-300 w-8 dark:text-gray-300">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2"><Bell size={18} className="text-orange-500" /> Upcoming Events</h3>
            <button onClick={() => onNavigate?.('events')} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">{t('viewAll')} →</button>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-10 h-10 text-dark-300 dark:text-dark-600 mx-auto mb-2" />
              <p className="text-dark-400 dark:text-dark-500 text-sm">No events in the next 7 days</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {upcomingEvents.map(ev => (
                <div key={ev._id} onClick={() => onNavigate?.('events')} className="flex items-center gap-3 p-3 rounded-lg bg-dark-50 dark:bg-dark-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer transition-all group">
                  <Gift className="text-purple-500 flex-shrink-0" size={18} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors capitalize">{ev.customerName} · {ev.type}</p>
                    <p className="text-xs text-dark-500 dark:text-dark-400">{new Date(ev.date).toLocaleDateString()} {ev.description && `· ${ev.description}`}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">{t('todayFollowups') || "Today's Follow-ups"}</h3>
            <button onClick={() => onNavigate?.('followups')} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">{t('viewAll')} →</button>
          </div>
          {todayFollowUps.length === 0 ? (
            <div className="text-center py-8">
              <CalendarCheck className="w-10 h-10 text-dark-300 dark:text-dark-600 mx-auto mb-2" />
              <p className="text-dark-400 dark:text-dark-500 text-sm">{t('noFollowups') || 'No follow-ups today'}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {todayFollowUps.map(fu => (
                <div key={fu._id} onClick={() => onNavigate?.('followups')} className="flex items-center gap-3 p-3 rounded-lg bg-dark-50 dark:bg-dark-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer transition-all group">
                  <div className={`w-2.5 h-2.5 rounded-full ${fu.status === 'pending' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{fu.customerName}</p>
                    <p className="text-xs text-dark-500 dark:text-dark-400">{fu.time} · {fu.remarks}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${fu.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>{fu.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-dark-200 dark:border-dark-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">{t('recentCalls')}</h3>
            <button onClick={() => onNavigate?.('calls')} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">{t('viewAll')} →</button>
          </div>
          {recentCalls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="w-10 h-10 text-dark-300 dark:text-dark-600 mx-auto mb-2" />
              <p className="text-dark-400 dark:text-dark-500 text-sm">{t('noCalls') || 'No call history'}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {recentCalls.map(call => (
                <div key={call._id} onClick={() => onNavigate?.('calls')} className="flex items-center gap-3 p-3 rounded-lg bg-dark-50 dark:bg-dark-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer transition-all group">
                  <div className={`w-2.5 h-2.5 rounded-full ${call.status === 'connected' ? 'bg-green-500' : call.status === 'missed' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{call.customerName}</p>
                    <p className="text-xs text-dark-500 dark:text-dark-400">{call.duration} · {call.date}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${call.status === 'connected' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : call.status === 'missed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>{call.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
