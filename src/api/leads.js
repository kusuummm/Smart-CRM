import api from './client';

// params can include: status, search, page, limit
export const getLeads = (params = {}) => api.get('/leads', { params }).then((res) => res.data);

export const getLeadById = (id) => api.get(`/leads/${id}`).then((res) => res.data);

export const createLead = (payload) => api.post('/leads', payload).then((res) => res.data);

export const updateLeadStatus = (id, payload) =>
  api.put(`/leads/${id}/status`, payload).then((res) => res.data);

export const deleteLead = (id) => api.delete(`/leads/${id}`).then((res) => res.data);
