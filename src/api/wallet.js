import api from './client';

export const getWallet = () =>
  api.get('/wallet', { skipCache: true }).then((res) => res.data);

export const createWalletOrder = (payload) =>
  api.post('/wallet/create-order', payload).then((res) => res.data);

export const rechargeWallet = (payload) =>
  api.post('/wallet/recharge', payload).then((res) => res.data);

export const getWalletTransactions = (params = {}) =>
  api.get('/wallet/transactions', { params, skipCache: true }).then((res) => res.data);
