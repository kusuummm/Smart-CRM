import api from './client';

// params can include: type, status, customerId, page, limit
export const getWhatsAppLogs = (params = {}) => api.get('/whatsapp', { params }).then((res) => res.data);

export const sendWhatsAppMessage = (payload) =>
  api.post('/whatsapp/send', payload).then((res) => res.data);

export const sendWhatsAppTemplate = (payload) =>
  api.post('/whatsapp/send-template', payload).then((res) => res.data);

export const sendFollowUpReminder = (payload) =>
  api.post('/whatsapp/send-followup-reminder', payload).then((res) => res.data);
