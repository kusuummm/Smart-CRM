import api from './client';

export const getWallet = () =>
  api.get('/wallet', { skipCache: true }).then((res) => res.data);

export const getPricingCatalog = () =>
  api.get('/wallet/pricing/catalog').then((res) => res.data);

export const calculateCheckoutPricing = (payload) =>
  api.post('/wallet/calculate-pricing', payload).then((res) => res.data);

export const createWalletOrder = (payload) =>
  api.post('/wallet/create-order', payload).then((res) => res.data);

export const rechargeWallet = (payload) =>
  api.post('/wallet/recharge', payload).then((res) => res.data);

export const payWithWallet = (payload) =>
  api.post('/wallet/pay-with-wallet', payload).then((res) => res.data);

export const getWalletOrders = () =>
  api.get('/wallet/orders', { skipCache: true }).then((res) => res.data);

export const getWalletTransactions = (params = {}) =>
  api.get('/wallet/transactions', { params, skipCache: true }).then((res) => res.data);

