import api from './client';

export const getAutomations = async () => {
  const response = await api.get('/automations');
  return response.data;
};

export const getAutomationLogs = async (params = {}) => {
  const response = await api.get('/automations/logs', { params });
  return response.data;
};

export const updateAutomation = async (id, data) => {
  const response = await api.put(`/automations/${id}`, data);
  return response.data;
};

export const testTriggerAutomation = async (data) => {
  const response = await api.post('/automations/test-trigger', data);
  return response.data;
};
