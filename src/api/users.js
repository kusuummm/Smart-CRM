import api from './client';

export const getUsers = (params = {}) => api.get('/users', { params }).then((res) => res.data);

export const getUserById = (id) => api.get(`/users/${id}`).then((res) => res.data);

export const createUser = (payload) => api.post('/users', payload).then((res) => res.data);

export const updateUser = (id, payload) => api.put(`/users/${id}`, payload).then((res) => res.data);

export const resetUserPassword = (id, newPassword) =>
  api.put(`/users/${id}/reset-password`, { newPassword }).then((res) => res.data);

export const toggleUserStatus = (id) => api.put(`/users/${id}/status`).then((res) => res.data);

export const deleteUser = (id) => api.delete(`/users/${id}`).then((res) => res.data);

export const reassignUserWorkload = (payload) =>
  api.post('/users/reassign-workload', payload).then((res) => res.data);

export const getSystemOverview = () =>
  api.get('/users/system-overview').then((res) => res.data);

export const getAuditLogs = (params = {}) =>
  api.get('/users/audit-logs', { params }).then((res) => res.data);
