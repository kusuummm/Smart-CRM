import api from './client';

// params can include: type, status, page, limit
export const getEvents = (params = {}) => api.get('/events', { params }).then((res) => res.data);

export const getUpcomingEvents = (days) =>
  api.get('/events/upcoming', { params: { days } }).then((res) => res.data);

export const createEvent = (payload) => api.post('/events', payload).then((res) => res.data);

export const updateEvent = (id, payload) => api.put(`/events/${id}`, payload).then((res) => res.data);

export const triggerReminder = (id, via) =>
  api.post(`/events/${id}/remind`, { via }).then((res) => res.data);

export const deleteEvent = (id) => api.delete(`/events/${id}`).then((res) => res.data);
