import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (email, password, role) => {
    const response = await api.post('/auth/login', { email, password, role });
    if (response.data.success) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  createTeacher: async (teacherData) => {
    const response = await api.post('/auth/teachers', teacherData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};

// Student Service
export const studentService = {
  getAll: async () => {
    const response = await api.get('/students');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  getMyProfile: async () => {
    const response = await api.get('/students/me');
    return response.data;
  },

  getEnrollmentStatus: async () => {
    const response = await api.get('/students/enrollment-status');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/students', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  getAttendance: async (id, params = {}) => {
    const response = await api.get(`/students/${id}/attendance`, { params });
    return response.data;
  },
};

// Fingerprint Service
export const fingerprintService = {
  checkStatus: async () => {
    const response = await api.get('/fingerprint/status');
    return response.data;
  },

  enroll: async (studentId) => {
    const response = await api.post('/fingerprint/register', { studentId });
    return response.data;
  },

  verify: async () => {
    const response = await api.post('/fingerprint/verify');
    return response.data;
  },

  verifyAndMark: async (classId) => {
    const response = await api.post('/fingerprint/verify-and-mark', { classId });
    return response.data;
  },

  getRegistered: async () => {
    const response = await api.get('/fingerprint/registered');
    return response.data;
  },

  deleteEnrollment: async (studentId) => {
    const response = await api.delete(`/fingerprint/${studentId}`);
    return response.data;
  },
};

// Attendance Service
export const attendanceService = {
  mark: async (data) => {
    const response = await api.post('/attendance/mark', data);
    return response.data;
  },

  markByFingerprint: async (fingerprintId, classId) => {
    const response = await api.post('/attendance/mark-by-fingerprint', {
      fingerprintId,
      classId,
    });
    return response.data;
  },

  get: async (params = {}) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  },

  getByDate: async (date, classId) => {
    const response = await api.get('/attendance/date', {
      params: { date, classId },
    });
    return response.data;
  },

  getStats: async (params = {}) => {
    const response = await api.get('/attendance/stats', { params });
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/attendance/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/attendance/${id}`);
    return response.data;
  },
};

// Class Service
export const classService = {
  getAll: async () => {
    const response = await api.get('/classes');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/classes', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/classes/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },

  getStudents: async (id) => {
    const response = await api.get(`/classes/${id}/students`);
    return response.data;
  },

  addStudent: async (classId, studentId) => {
    const response = await api.post(`/classes/${classId}/students`, { studentId });
    return response.data;
  },

  removeStudent: async (classId, studentId) => {
    const response = await api.delete(`/classes/${classId}/students/${studentId}`);
    return response.data;
  },
};

export default api;
