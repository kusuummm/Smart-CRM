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
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
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

// High-Speed In-Memory Client Cache & In-Flight Request Deduplication
const cache = new Map();
const inFlight = new Map();
const CACHE_TTL_MS = 25000; // 25s TTL for lightning-fast tab navigation

export const clearApiCache = () => {
  cache.clear();
};

const originalGet = api.get.bind(api);

api.get = function (url, config = {}) {
  // If explicitly requested to skip cache (e.g. manual refresh button)
  if (config.skipCache) {
    return originalGet(url, config);
  }

  const key = `${url}?${JSON.stringify(config.params || {})}`;
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.response);
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = originalGet(url, config)
    .then((res) => {
      cache.set(key, { response: res, timestamp: Date.now() });
      inFlight.delete(key);
      return res;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
};

// Automatically invalidate cache on data mutations so CRM stays 100% in sync
['post', 'put', 'patch', 'delete'].forEach((method) => {
  const originalMethod = api[method].bind(api);
  api[method] = function (...args) {
    cache.clear();
    return originalMethod(...args);
  };
});

export default api;