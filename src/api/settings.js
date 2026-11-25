import api from './client';

export const getSettings = () => api.get('/settings').then((res) => res.data);
export const saveSettings = (payload) => api.post('/settings', payload).then((res) => res.data);
