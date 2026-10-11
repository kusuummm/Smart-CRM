import api from './client';

export const getNotes = (params = {}) =>
  api.get('/notes', { params }).then((res) => res.data);

export const createNote = (payload) =>
  api.post('/notes', payload).then((res) => res.data);

export const deleteNote = (id) =>
  api.delete(`/notes/${id}`).then((res) => res.data);
