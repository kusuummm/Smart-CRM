import api from './client';

export const getTelephonyConfig = () =>
  api.get('/telephony/config').then((res) => res.data);

export const initiateServerCall = (payload) =>
  api.post('/telephony/call', payload).then((res) => res.data);
