import { useState, useCallback, useEffect } from 'react';
import { Users, TrendingUp, CalendarCheck, Phone, MessageCircle, Mail, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getCustomers } from '../api/customers';
import { getLeads } from '../api/leads';
import { getTodayFollowUps } from '../api/followups';
import { getWhatsAppLogs } from '../api/whatsapp';
import { getEmailLogs } from '../api/emails';
import { getCalls } from '../api/callHistory';

export default function TelecallerPanel({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  // The backend already scopes customers/leads/follow-ups/logs to the
  // logged-in telecaller automatically (see scopeToRole in each controller),
  // so these calls only ever return "my" data.
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [customerData, leadData, followUpData, waData, emailData, callData] = await Promise.all([
        getCustomers({ limit: 1000 }),
        getLeads({ limit: 1000 }),
        getTodayFollowUps(),
        getWhatsAppLogs({ limit: 5 }),
        getEmailLogs({ limit: 5 }),
        getCalls({ limit: 5 }),
      ]);

      setCustomers(customerData.customers);
      setLeads(leadData.leads);
      setTodayFollowUps(followUpData.followUps);

      // Merge the last few WhatsApp / email / call events into one activity feed.
      const activities = [
        ...waData.logs.map(l => ({ id: l._id, type: 'whatsapp', customer: l.customerName, time: l.createdAt, status: l.status })),
        ...emailData.logs.map(l => ({ id: l._id, type: 'email', customer: l.customerName, time: l.createdAt, status: l.status })),
        ...callData.calls.map(c => ({ id: c._id, type: 'call', customer: c.customerName, time: c.createdAt, status: c.status, duration: c.duration })),
      ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);
      setRecentActivities(activities);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load your dashboard', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPending = todayFollowUps.filter(f => f.status === 'pending').length;
  const convertedCount = leads.filter(l => l.status === 'converted').length;
  const conversionRate = leads.length > 0 ? Math.round((convertedCount / leads.length) * 100) : 0;

  const customerStatusCounts = customers.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    { title: 'My Customers', value: customers.length, icon: Users, color: 'blue', onClick: () => onNavigate?.('tc-customers') },
    { title: 'My Leads', value: leads.length, icon: TrendingUp, color: 'green', onClick: () => onNavigate?.('tc-leads') },
    { title: "Today's Follow-ups", value: todayFollowUps.length, icon: CalendarCheck, color: 'purple', onClick: () => onNavigate?.('tc-followups') },
    { title: 'Pending Follow-ups', value: totalPending, icon: Clock, color: 'orange', onClick: () => onNavigate?.('tc-followups') },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'call': return <Phone className="text-blue-500" size={18} />;
      case 'whatsapp': return <MessageCircle className="text-green-500" size={18} />;
      case 'email': return <Mail className="text-red-500" size={18} />;
      default: return <Clock className="text-gray-500" size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-dark-400 dark:text-dark-500">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">My Dashboard</h1>
          <p className="text-sm text-dark-500 dark:text-dark-400">Welcome back, {user?.name}!</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-dark-500 bg-white px-4 py-2 rounded-lg border border-dark-200 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-400">
          <span className="font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600',
            orange: 'bg-orange-50 text-orange-600',
          };
          return (
            <div
              key={index}
              onClick={stat.onClick}
              className="group bg-white rounded-xl p-6 border border-dark-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all cursor-pointer dark:bg-dark-800 dark:border-dark-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-500 dark:text-dark-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-dark-900 mt-1 dark:text-white">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[stat.color]} group-hover:scale-110 transition-transform`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Today's Follow-ups</h3>
            <button onClick={() => onNavigate?.('tc-followups')} className="text-xs text-primary-600 hover:text-primary-700 font-medium">View All →</button>
          </div>
          {todayFollowUps.length === 0 ? (
            <div className="text-center py-8">
              <CalendarCheck className="w-10 h-10 text-dark-300 mx-auto mb-2" />
              <p className="text-dark-400 text-sm dark:text-dark-500">No follow-ups scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayFollowUps.map(fu => (
                <div key={fu._id} onClick={() => onNavigate?.('tc-followups')} className="flex items-center gap-3 p-3 rounded-lg bg-dark-50 hover:bg-primary-50 cursor-pointer transition-all group dark:bg-dark-700">
                  <div className={`w-2.5 h-2.5 rounded-full ${fu.status === 'pending' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-900 group-hover:text-primary-700 transition-colors dark:text-white">{fu.customerName}</p>
                    <p className="text-xs text-dark-500 dark:text-dark-400">{fu.time} · {fu.remarks}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${fu.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{fu.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Recent Activities</h3>
          </div>
          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-dark-300 mx-auto mb-2" />
              <p className="text-dark-400 text-sm dark:text-dark-500">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-dark-50 hover:bg-primary-50 transition-all dark:bg-dark-700">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-900 dark:text-white">{activity.customer}</p>
                    <p className="text-xs text-dark-500 dark:text-dark-400 capitalize">{activity.type} · {new Date(activity.time).toLocaleString()}</p>
                  </div>
                  {activity.type === 'call' ? (
                    <span className="text-xs font-medium text-dark-600 dark:text-dark-300">{activity.duration}</span>
                  ) : (
                    <span className="text-xs font-medium text-dark-600 dark:text-dark-300 capitalize">{activity.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onNavigate?.('tc-whatsapp')} className="flex flex-col items-center gap-2 p-3 bg-dark-50 rounded-lg hover:bg-primary-50 transition-colors dark:bg-dark-700">
              <MessageCircle className="text-green-500" size={20} />
              <span className="text-xs font-medium text-dark-700 dark:text-gray-300">Send WhatsApp</span>
            </button>
            <button onClick={() => onNavigate?.('tc-emails')} className="flex flex-col items-center gap-2 p-3 bg-dark-50 rounded-lg hover:bg-primary-50 transition-colors dark:bg-dark-700">
              <Mail className="text-red-500" size={20} />
              <span className="text-xs font-medium text-dark-700 dark:text-gray-300">Send Email</span>
            </button>
            <button onClick={() => onNavigate?.('tc-calls')} className="flex flex-col items-center gap-2 p-3 bg-dark-50 rounded-lg hover:bg-primary-50 transition-colors dark:bg-dark-700">
              <Phone className="text-blue-500" size={20} />
              <span className="text-xs font-medium text-dark-700 dark:text-gray-300">Log Call</span>
            </button>
            <button onClick={() => onNavigate?.('tc-followups')} className="flex flex-col items-center gap-2 p-3 bg-dark-50 rounded-lg hover:bg-primary-50 transition-colors dark:bg-dark-700">
              <CalendarCheck className="text-purple-500" size={20} />
              <span className="text-xs font-medium text-dark-700 dark:text-gray-300">Add Follow-up</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Conversion Rate</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-600 dark:text-dark-300">Leads converted</span>
              <span className="text-lg font-bold text-green-600">{conversionRate}%</span>
            </div>
            <div className="w-full h-2 bg-dark-100 rounded-full overflow-hidden dark:bg-dark-700">
              <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full" style={{ width: `${conversionRate}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-dark-500 dark:text-dark-400">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white">My Customers by Status</h3>
          <button onClick={() => onNavigate?.('tc-customers')} className="text-xs text-primary-600 hover:text-primary-700 font-medium">View All →</button>
        </div>
        {customers.length === 0 ? (
          <p className="text-dark-400 text-sm dark:text-dark-500 text-center py-4">No customers assigned yet</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(customerStatusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-700 dark:text-gray-300 capitalize">{status}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-dark-100 rounded-full overflow-hidden dark:bg-dark-700">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full" style={{ width: `${(count / customers.length) * 100}%` }}></div>
                  </div>
                  <span className="text-xs font-medium text-dark-900 dark:text-white">{count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
