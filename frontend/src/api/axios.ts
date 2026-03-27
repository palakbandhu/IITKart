/// <reference types="vite/client" />
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (config.headers) {
      if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
      // Let browser set the proper Content-Type with boundary for FormData
      if (config.data instanceof FormData) {
        delete (config.headers as any)['Content-Type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
