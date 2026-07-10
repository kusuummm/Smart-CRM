import api from './client';

export const loginRequest = (email, password) =>
  api.post('/api/auth/login', { email, password }).then((res) => res.data);

export const getMeRequest = () =>
  api.get('/api/auth/me').then((res) => res.data);

export const updateMeRequest = (payload) =>
  api.put('/api/auth/me', payload).then((res) => res.data);

export const getSessionsRequest = () =>
  api.get('/api/auth/sessions').then((res) => res.data);

export const revokeSessionRequest = (id) =>
  api.delete(`/api/auth/sessions/${id}`).then((res) => res.data);

export const logoutRequest = () =>
  api.post('/api/auth/logout').then((res) => res.data);

export const changePasswordRequest = (currentPassword, newPassword) =>
  api
    .put('/api/auth/change-password', {
      currentPassword,
      newPassword,
    })
    .then((res) => res.data);
