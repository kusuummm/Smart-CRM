import api from './client';

export const getTeams = () => api.get('/teams').then((res) => res.data);
export const createTeam = (payload) => api.post('/teams', payload).then((res) => res.data);
export const updateTeam = (id, payload) => api.put(`/teams/${id}`, payload).then((res) => res.data);
export const deleteTeam = (id) => api.delete(`/teams/${id}`).then((res) => res.data);
