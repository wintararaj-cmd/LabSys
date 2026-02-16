import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
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

// Handle responses
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

// Auth API
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (data) => api.post('/auth/register', data),
};

// Patient API
export const patientAPI = {
    getAll: (params) => api.get('/patients', { params }),
    getById: (id) => api.get(`/patients/${id}`),
    create: (data) => api.post('/patients', data),
    update: (id, data) => api.put(`/patients/${id}`, data),
};

// Test API
export const testAPI = {
    getAll: (params) => api.get('/tests', { params }),
    create: (data) => api.post('/tests', data),
    update: (id, data) => api.put(`/tests/${id}`, data),
    delete: (id) => api.delete(`/tests/${id}`),
};

// Invoice API
export const invoiceAPI = {
    getAll: (params) => api.get('/invoices', { params }),
    getById: (id) => api.get(`/invoices/${id}`),
    create: (data) => api.post('/invoices', data),
    updatePayment: (id, data) => api.put(`/invoices/${id}/payment`, data),
    downloadPDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

// Report API
export const reportAPI = {
    getPending: () => api.get('/reports/pending'),
    getByInvoice: (invoiceId) => api.get(`/reports/invoice/${invoiceId}`),
    updateResult: (id, data) => api.put(`/reports/${id}/result`, data),
    verify: (id) => api.put(`/reports/${id}/verify`),
};

// Dashboard API
export const dashboardAPI = {
    getStats: (branchId) => api.get('/dashboard/stats', { params: { branchId } }),
    getAnalytics: (params) => api.get('/dashboard/analytics', { params }),
};

// Doctor API
export const doctorAPI = {
    getAll: (params) => api.get('/doctors', { params }),
    create: (data) => api.post('/doctors', data),
    update: (id, data) => api.put(`/doctors/${id}`, data),
    getCommission: (id, params) => api.get(`/doctors/${id}/commission`, { params }),
    getOutstanding: (id) => api.get(`/doctors/${id}/outstanding`),
    createPayout: (id, data) => api.post(`/doctors/${id}/payout`, data),
    getPayouts: (id) => api.get(`/doctors/${id}/payouts`),
};

// Inventory API
export const inventoryAPI = {
    getAll: (params) => api.get('/inventory', { params }),
    getAlerts: () => api.get('/inventory/alerts'),
    create: (data) => api.post('/inventory', data),
    update: (id, data) => api.put(`/inventory/${id}`, data),
    adjustStock: (id, data) => api.post(`/inventory/${id}/adjust`, data),
    getLogs: (params) => api.get('/inventory/logs', { params }),
    delete: (id) => api.delete(`/inventory/${id}`),
};

// Branch API
export const branchAPI = {
    getAll: () => api.get('/branches'),
    create: (data) => api.post('/branches', data),
};

// User API
export const userAPI = {
    getAll: () => api.get('/users'),
    create: (data) => api.post('/users', data),
};

// Backup API
export const backupAPI = {
    export: () => api.get('/backup/export', { responseType: 'blob' }),
    import: (data) => api.post('/backup/import', { backupData: data }),
};

export default api;
