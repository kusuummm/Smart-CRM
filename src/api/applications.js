import api from './client';

// Application Statistics for Admin Overview
export const getApplicationStats = () =>
  api.get('/applications/stats', { skipCache: true }).then((res) => res.data);

// Application List with filters and pagination
export const getApplications = (params = {}) =>
  api.get('/applications', { params, skipCache: true }).then((res) => res.data);

// Single Application details
export const getApplicationById = (id) =>
  api.get(`/applications/${id}`, { skipCache: true }).then((res) => res.data);

// Create Application
export const createApplication = (payload) =>
  api.post('/applications', payload).then((res) => res.data);

// Update Status (approve, reject, resubmit, etc.)
export const updateApplicationStatus = (id, payload) =>
  api.patch(`/applications/${id}/status`, payload).then((res) => res.data);

// Update Payment Status
export const updatePaymentStatus = (id, payload) =>
  api.patch(`/applications/${id}/payment`, payload).then((res) => res.data);

// Document Folder: Upload Document
export const uploadApplicationDocument = (id, formData) =>
  api
    .post(`/applications/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);

// Document Folder: Update Document Status
export const updateDocumentStatus = (id, docId, payload) =>
  api.patch(`/applications/${id}/documents/${docId}/status`, payload).then((res) => res.data);

// Document Folder: Delete Document
export const deleteApplicationDocument = (id, docId) =>
  api.delete(`/applications/${id}/documents/${docId}`).then((res) => res.data);

// Final Certificate: Upload
export const uploadFinalCertificate = (id, formData) =>
  api
    .post(`/applications/${id}/certificate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);

// Final Certificate: Delete
export const deleteFinalCertificate = (id) =>
  api.delete(`/applications/${id}/certificate`).then((res) => res.data);

// Customer-wise Unified Communication History
export const getCustomerCommunicationHistory = (customerId) =>
  api.get(`/customers/${customerId}/communication-history`, { skipCache: true }).then((res) => res.data);
