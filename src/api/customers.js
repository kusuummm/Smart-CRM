import api from './client';

// params can include: search, city, source, status, telecallerId, assignedTelecaller, unassigned, page, limit, sortBy, sortOrder
export const getCustomers = (params = {}) =>
  api.get('/customers', { params }).then((res) => res.data);

export const getCustomerById = (id) => api.get(`/customers/${id}`).then((res) => res.data);

export const createCustomer = (payload) => api.post('/customers', payload).then((res) => res.data);

export const updateCustomer = (id, payload) =>
  api.put(`/customers/${id}`, payload).then((res) => res.data);

export const deleteCustomer = (id) => api.delete(`/customers/${id}`).then((res) => res.data);

export const bulkAssignCustomers = (payload) =>
  api.post('/customers/bulk-assign', payload).then((res) => res.data);

export const bulkDeleteCustomers = (payload) =>
  api.post('/customers/bulk-delete', payload).then((res) => res.data);