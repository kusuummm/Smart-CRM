import api from './client';

export const loginRequest = (email, password) =>
  api.post('/auth/login', { email, password }).then((res) => res.data);

export const getMeRequest = () => api.get('/auth/me').then((res) => res.data);

export const updateMeRequest = (payload) => api.put('/auth/me', payload).then((res) => res.data);

export const getSessionsRequest = () => api.get('/auth/sessions').then((res) => res.data);

export const revokeSessionRequest = (id) => api.delete(`/auth/sessions/${id}`).then((res) => res.data);

export const logoutRequest = () => api.post('/auth/logout').then((res) => res.data);

export const changePasswordRequest = (currentPassword, newPassword) =>
  api.put('/auth/change-password', { currentPassword, newPassword }).then((res) => res.data);
