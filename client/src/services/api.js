import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_UrL || 'http://localhost:5000/api',
  // baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Important for cookies
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const subjectsAPI = {
  getAll: () => api.get('/subjects'),
  getById: (id) => api.get(`/subjects/${id}`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
};

export const topicsAPI = {
  getBySubject: (subjectId) => api.get(`/topics/subject/${subjectId}`),
  create: (data) => api.post('/topics', data),
  update: (id, data) => api.put(`/topics/${id}`, data),
  delete: (id) => api.delete(`/topics/${id}`),
  markComplete: (id) => api.post(`/topics/${id}/complete`),
  recordReview: (id) => api.post(`/topics/${id}/review`),
};

export const notesAPI = {
  getAll: (params) => api.get('/notes', { params }),
  getById: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
  uploadPDF: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/notes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const aiAPI = {
  summarize: (text) => api.post('/ai/summarize', { text }),
  summarizePDF: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ai/summarize/pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const rewardsAPI = {
  getUserRewards: () => api.get('/rewards'),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.post(`/notifications/${id}/read`),
};

export default api;
