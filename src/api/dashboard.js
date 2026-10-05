import api from './client';

export const getDashboardStats = (params = {}) =>
  api.get('/dashboard/stats', { params }).then((res) => res.data);
