import { useState, useEffect, useCallback } from 'react';
import { Download, FileText, TrendingUp, Users, CalendarCheck, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/Common';
import { useToast } from '../components/Toast';
import {
  getDailyFollowUpReport,
  getMonthlyReport,
  getLeadConversionReport,
  getTelecallerPerformanceReport,
  downloadDailyFollowUpReport,
  downloadMonthlyReport,
  downloadLeadConversionReport,
  downloadTelecallerPerformanceReport,
} from '../api/reports';
import { getDashboardStats } from '../api/dashboard';

const reports = [
  { id: 'daily', name: 'Daily Follow-up Report', desc: 'Summary of all follow-ups for a given day', icon: CalendarCheck, color: 'blue' },
  { id: 'monthly', name: 'Monthly Report', desc: 'Follow-up activity for a given month', icon: TrendingUp, color: 'green' },
  { id: 'conversion', name: 'Lead Conversion Report', desc: 'Lead status and conversion analysis', icon: TrendingUp, color: 'purple' },
  { id: 'performance', name: 'Telecaller Performance', desc: 'Individual telecaller performance metrics', icon: Users, color: 'orange' },
];

export default function Reports({ initialReportId }) {
  const [selectedReport, setSelectedReport] = useState(() => reports.find(r => r.id === initialReportId) || null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [quickStats, setQuickStats] = useState(null);
  const { addToast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const [dailyDate, setDailyDate] = useState(today);
  const [monthlyYear, setMonthlyYear] = useState(now.getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    getDashboardStats().then((data) => setQuickStats(data.stats)).catch(() => {});
  }, []);

  const loadReport = useCallback(async () => {
    if (!selectedReport) return;
    setLoading(true);
    try {
      let data;
      if (selectedReport.id === 'daily') data = await getDailyFollowUpReport(dailyDate);
      else if (selectedReport.id === 'monthly') data = await getMonthlyReport(monthlyYear, monthlyMonth);
      else if (selectedReport.id === 'conversion') data = await getLeadConversionReport();
      else if (selectedReport.id === 'performance') data = await getTelecallerPerformanceReport();
      setReportData(data);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReport, dailyDate, monthlyYear, monthlyMonth]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      if (selectedReport.id === 'daily') await downloadDailyFollowUpReport(dailyDate, format);
      else if (selectedReport.id === 'monthly') await downloadMonthlyReport(monthlyYear, monthlyMonth, format);
      else if (selectedReport.id === 'conversion') await downloadLeadConversionReport(format);
      else if (selectedReport.id === 'performance') await downloadTelecallerPerformanceReport(format);
      addToast(`Report exported as ${format.toUpperCase()}!`, 'success');
    } catch (error) {
      addToast('Failed to export report', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (selectedReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <button onClick={() => { setSelectedReport(null); setReportData(null); }} className="text-sm text-dark-500 hover:text-dark-700 mb-2 dark:text-dark-400 dark:hover:text-white">← Back to Reports</button>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">{selectedReport.name}</h1>
            <p className="text-sm text-dark-500 dark:text-dark-400">{selectedReport.desc}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleExport('csv')} disabled={exporting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-700 bg-white border border-dark-200 rounded-lg hover:bg-dark-50 disabled:opacity-50 dark:bg-dark-800 dark:border-dark-700 dark:text-gray-300 dark:hover:bg-dark-700">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={() => handleExport('excel')} disabled={exporting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
              <FileText size={16} /> Export Excel
            </button>
          </div>
        </div>

        {selectedReport.id === 'daily' && (
          <div className="bg-white rounded-xl p-4 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
            <label className="text-sm font-medium text-dark-700 dark:text-gray-300 mr-3">Date:</label>
            <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} className="px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700" />
          </div>
        )}

        {selectedReport.id === 'monthly' && (
          <div className="bg-white rounded-xl p-4 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700 flex gap-3">
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-gray-300 mr-2">Year:</label>
              <input type="number" value={monthlyYear} onChange={(e) => setMonthlyYear(Number(e.target.value))} className="w-24 px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700" />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-gray-300 mr-2">Month:</label>
              <select value={monthlyMonth} onChange={(e) => setMonthlyMonth(Number(e.target.value))} className="px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-700">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('en-US', { month: 'long' })}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {loading || !reportData ? (
          <div className="flex items-center justify-center py-16 text-dark-400 dark:text-dark-500">
            <Loader2 className="animate-spin mr-2" size={20} /> Loading report...
          </div>
        ) : (
        <div className="bg-white rounded-xl border border-dark-200 shadow-sm overflow-hidden dark:bg-dark-800 dark:border-dark-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-50 dark:bg-dark-700">
                {selectedReport.id === 'daily' && <>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Remarks</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Created By</th>
                </>}
                {selectedReport.id === 'monthly' && <>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Remarks</th>
                </>}
                {selectedReport.id === 'conversion' && <>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Count</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Percentage</th>
                </>}
                {selectedReport.id === 'performance' && <>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Telecaller</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Customers Handled</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Leads Converted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase dark:text-dark-400">Follow-ups Completed</th>
                </>}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
              {selectedReport.id === 'daily' && (reportData.rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-dark-400 dark:text-dark-500">No follow-ups for this date</td></tr>
              ) : reportData.rows.map((row) => (
                <tr key={row._id} className="hover:bg-dark-50 dark:hover:bg-dark-700">
                  <td className="px-4 py-3 font-medium text-dark-900 dark:text-white">{row.customerName}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{row.time}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${row.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span></td>
                  <td className="px-4 py-3 text-dark-600 max-w-xs truncate dark:text-dark-300">{row.remarks}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{row.createdByName}</td>
                </tr>
              )))}
              {selectedReport.id === 'monthly' && (reportData.rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-dark-400 dark:text-dark-500">No follow-ups this month</td></tr>
              ) : reportData.rows.map((row) => (
                <tr key={row._id} className="hover:bg-dark-50 dark:hover:bg-dark-700">
                  <td className="px-4 py-3 font-medium text-dark-900 dark:text-white">{row.customerName}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{row.date}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${row.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span></td>
                  <td className="px-4 py-3 text-dark-600 max-w-xs truncate dark:text-dark-300">{row.remarks}</td>
                </tr>
              )))}
              {selectedReport.id === 'conversion' && (reportData.breakdown.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-dark-400 dark:text-dark-500">No leads yet</td></tr>
              ) : reportData.breakdown.map((row) => (
                <tr key={row.status} className="hover:bg-dark-50 dark:hover:bg-dark-700">
                  <td className="px-4 py-3 capitalize text-dark-900 dark:text-white">{row.status.replace('-', ' ')}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{row.count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-dark-100 rounded-full overflow-hidden dark:bg-dark-700">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.round((row.count / reportData.total) * 100)}%` }}></div>
                      </div>
                      <span className="text-xs text-dark-500 dark:text-dark-400">{Math.round((row.count / reportData.total) * 100)}%</span>
                    </div>
                  </td>
                </tr>
              )))}
              {selectedReport.id === 'performance' && (reportData.rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-dark-400 dark:text-dark-500">No telecallers found</td></tr>
              ) : reportData.rows.map((row, i) => (
                <tr key={i} className="hover:bg-dark-50 dark:hover:bg-dark-700">
                  <td className="px-4 py-3 font-medium text-dark-900 dark:text-white">{row.name}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{row.customersHandled}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{row.leadsConverted}</td>
                  <td className="px-4 py-3 text-dark-700 dark:text-gray-300">{row.followUpsCompleted}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        )}

        {selectedReport.id === 'conversion' && reportData && (
          <div className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700 flex items-center justify-between">
            <span className="text-sm text-dark-600 dark:text-dark-300">Overall Conversion Rate</span>
            <span className="text-2xl font-bold text-green-600">{reportData.conversionRate}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Generate and export various CRM reports" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map(report => (
          <div
            key={report.id}
            onClick={() => setSelectedReport(report)}
            className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm hover:shadow-md hover:border-primary-300 cursor-pointer transition-all group dark:bg-dark-800 dark:border-dark-700"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                report.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                report.color === 'green' ? 'bg-green-50 text-green-600' :
                report.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                'bg-orange-50 text-orange-600'
              }`}>
                <report.icon size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-dark-900 group-hover:text-primary-600 transition-colors dark:text-white">{report.name}</h3>
                <p className="text-sm text-dark-500 mt-1 dark:text-dark-400">{report.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 border border-dark-200 shadow-sm dark:bg-dark-800 dark:border-dark-700">
        <h3 className="text-lg font-semibold text-dark-900 mb-4 dark:text-white">Quick Stats</h3>
        {!quickStats ? (
          <div className="flex items-center justify-center py-6 text-dark-400 dark:text-dark-500">
            <Loader2 className="animate-spin mr-2" size={18} /> Loading...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-dark-50 rounded-lg dark:bg-dark-700">
              <span className="text-sm text-dark-600 dark:text-dark-300">Total Leads</span>
              <span className="text-lg font-bold text-dark-900 dark:text-white">{quickStats.totalLeads}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-50 rounded-lg dark:bg-dark-700">
              <span className="text-sm text-dark-600 dark:text-dark-300">Total Customers</span>
              <span className="text-lg font-bold text-dark-900 dark:text-white">{quickStats.totalCustomers}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-50 rounded-lg dark:bg-dark-700">
              <span className="text-sm text-dark-600 dark:text-dark-300">Today's Follow-ups</span>
              <span className="text-lg font-bold text-purple-600">{quickStats.todayFollowUps}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-50 rounded-lg dark:bg-dark-700">
              <span className="text-sm text-dark-600 dark:text-dark-300">Pending Follow-ups</span>
              <span className="text-lg font-bold text-orange-600">{quickStats.pendingFollowUps}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
