import axios from 'axios';

// Base URL comes from a Vite env var so it's easy to point at a different
// backend (e.g. a deployed one) without changing code. Falls back to the
// local dev backend if VITE_API_URL isn't set.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL });

// Attach the JWT (if we have one) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend ever says the token is invalid/expired, log the user out
// client-side so they aren't stuck looking at a broken app.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      // Full reload is the simplest reliable way to bounce back to the
      // Login screen from anywhere in the app.
      if (!window.location.href.includes('login')) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default api;