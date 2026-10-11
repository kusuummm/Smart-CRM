import api from './client';

export const getWallet = () =>
  api.get('/wallet').then((res) => res.data);

export const rechargeWallet = (payload) =>
  api.post('/wallet/recharge', payload).then((res) => res.data);
