import api from './client';

export const getMeetings = (params = {}) =>
  api.get('/meetings', { params }).then((res) => res.data);

export const createMeeting = (payload) =>
  api.post('/meetings', payload).then((res) => res.data);

export const updateMeeting = (id, payload) =>
  api.put(`/meetings/${id}`, payload).then((res) => res.data);

export const sendMeetingReminderNow = (id) =>
  api.post(`/meetings/${id}/send-reminder`).then((res) => res.data);

export const deleteMeeting = (id) =>
  api.delete(`/meetings/${id}`).then((res) => res.data);
