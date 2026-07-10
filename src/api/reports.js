import api from './client';

export const getDailyFollowUpReport = (date) =>
  api.get('/reports/daily-followups', { params: { date, format: 'json' } }).then((res) => res.data);

export const getMonthlyReport = (year, month) =>
  api.get('/reports/monthly', { params: { year, month, format: 'json' } }).then((res) => res.data);

export const getLeadConversionReport = () =>
  api.get('/reports/lead-conversion', { params: { format: 'json' } }).then((res) => res.data);

export const getTelecallerPerformanceReport = () =>
  api.get('/reports/telecaller-performance', { params: { format: 'json' } }).then((res) => res.data);

// Downloads report as excel/csv - triggers a browser file download from the
// blob response rather than parsing it as JSON.
const downloadReport = async (path, params, filename) => {
  const response = await api.get(path, { params, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadDailyFollowUpReport = (date, format) =>
  downloadReport('/reports/daily-followups', { date, format }, `daily-followups-${date}.${format === 'excel' ? 'xlsx' : 'csv'}`);

export const downloadMonthlyReport = (year, month, format) =>
  downloadReport('/reports/monthly', { year, month, format }, `monthly-report-${year}-${month}.${format === 'excel' ? 'xlsx' : 'csv'}`);

export const downloadLeadConversionReport = (format) =>
  downloadReport('/reports/lead-conversion', { format }, `lead-conversion-report.${format === 'excel' ? 'xlsx' : 'csv'}`);

export const downloadTelecallerPerformanceReport = (format) =>
  downloadReport('/reports/telecaller-performance', { format }, `telecaller-performance-report.${format === 'excel' ? 'xlsx' : 'csv'}`);
