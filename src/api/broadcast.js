import api from './client';

export const getBroadcasts = (params = {}) =>
  api.get('/broadcast', { params }).then((res) => res.data);

export const createBroadcast = (payload) =>
  api.post('/broadcast', payload).then((res) => res.data);

export const retryBroadcast = (id) =>
  api.post(`/broadcast/${id}/retry`).then((res) => res.data);
