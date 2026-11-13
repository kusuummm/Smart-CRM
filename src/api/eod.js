import api from './client';

// Member API Endpoints
export const submitEod = (payload) =>
  api.post('/eod', payload).then((res) => res.data);

export const getMyTodayEod = (date) =>
  api.get('/eod/today', { params: date ? { date } : {} }).then((res) => res.data);

export const getMyEodHistory = (params = {}) =>
  api.get('/eod/history', { params }).then((res) => res.data);

// Admin & Manager API Endpoints
export const getAllEods = (params = {}) =>
  api.get('/eod/admin/all', { params }).then((res) => res.data);

export const getEodSummary = (date) =>
  api.get('/eod/admin/summary', { params: date ? { date } : {} }).then((res) => res.data);

export const reviewEod = (id, payload) =>
  api.put(`/eod/${id}/review`, payload).then((res) => res.data);

export const deleteEod = (id) =>
  api.delete(`/eod/${id}`).then((res) => res.data);
