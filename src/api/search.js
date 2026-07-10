import api from './client';

export const globalSearch = (q) => api.get('/search', { params: { q } }).then((res) => res.data);
