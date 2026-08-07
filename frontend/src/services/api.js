import axios from 'axios';

export const FEATURE_FLAGS = {
  localDiscoveryEnabled: (import.meta.env.VITE_LOCAL_DISCOVERY_ENABLED || 'false') === 'true'
};

function getRuntimeApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) {
    return configured;
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname || 'localhost';
    const port = import.meta.env.VITE_API_PORT || '4000';
    return `${protocol}//${host}:${port}/api`;
  }

  return 'http://localhost:4000/api';
}

const api = axios.create({
  baseURL: getRuntimeApiBaseUrl(),
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ers_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
