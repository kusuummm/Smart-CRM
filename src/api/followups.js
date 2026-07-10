import api from './client';

// params can include: status, date, page, limit
export const getFollowUps = (params = {}) => api.get('/followups', { params }).then((res) => res.data);

export const getTodayFollowUps = () => api.get('/followups/today').then((res) => res.data);

export const createFollowUp = (payload) => api.post('/followups', payload).then((res) => res.data);

export const updateFollowUp = (id, payload) =>
  api.put(`/followups/${id}`, payload).then((res) => res.data);

export const deleteFollowUp = (id) => api.delete(`/followups/${id}`).then((res) => res.data);
