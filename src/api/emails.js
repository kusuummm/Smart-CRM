import api from './client';

// params can include: type, status, customerId, leadId, direction, page, limit
export const getEmailLogs = (params = {}) => api.get('/emails', { params }).then((res) => res.data);

export const sendCustomerEmail = (payload) => api.post('/emails/send', payload).then((res) => res.data);

// Send an email directly to a lead (or customer)
export const sendLeadEmail = (payload) => api.post('/emails/send', payload).then((res) => res.data);

// Fetch all emails (received & sent) for a lead
export const getLeadEmails = (leadId) => api.get(`/leads/${leadId}/emails`).then((res) => res.data);

// Receive/log incoming email from a lead onto CRM system
export const receiveLeadEmail = (payload) => api.post('/emails/receive', payload).then((res) => res.data);

// Mark email as read
export const markEmailAsRead = (id) => api.patch(`/emails/${id}/read`).then((res) => res.data);

export const testEmailDelivery = (payload) => api.post('/emails/test', payload).then((res) => res.data);
