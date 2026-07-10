import api from './client';

// params can include: type, status, customerId, page, limit
export const getEmailLogs = (params = {}) => api.get('/emails', { params }).then((res) => res.data);

export const sendCustomerEmail = (payload) => api.post('/emails/send', payload).then((res) => res.data);
