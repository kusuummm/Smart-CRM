import api from './client';

// params can include: status, date, customerId, page, limit
export const getCalls = (params = {}) => api.get('/calls', { params }).then((res) => res.data);

export const createCall = (payload) => api.post('/calls', payload).then((res) => res.data);

export const updateCall = (id, payload) => api.put(`/calls/${id}`, payload).then((res) => res.data);

export const deleteCall = (id) => api.delete(`/calls/${id}`).then((res) => res.data);
