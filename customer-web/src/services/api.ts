/// <reference types="vite/client" />
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Custom base fetch wrapper that automatically appends JWT and parses error structures.
 */
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorCode = responseData.error?.code || 'HTTP_ERROR';
    const errorMessage = responseData.error?.message || `Request failed with status ${response.status}`;
    throw { status: response.status, code: errorCode, message: errorMessage };
  }

  return responseData.data;
}

export const api = {
  // Public auth endpoints
  login: async (email: string, password: string) => {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  registerCustomer: async (email: string, password: string, phone: string, name: string) => {
    return apiFetch('/api/auth/register/customer', {
      method: 'POST',
      body: JSON.stringify({ email, password, phone, name })
    });
  },

  // Protected auth endpoints
  getMe: async () => {
    return apiFetch('/api/auth/me');
  },

  // Customer routes
  getProfile: async () => {
    return apiFetch('/api/customer/profile');
  },

  updateProfile: async (data: { 
    email?: string; 
    password?: string; 
    phone?: string; 
    name?: string; 
    gender?: string; 
    dob?: string; 
    trustedContacts?: Array<{ name: string; phone: string }>;
    defaultPaymentMethod?: string;
    defaultUpiId?: string;
  }) => {
    return apiFetch('/api/customer/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  getRides: async () => {
    return apiFetch('/api/customer/rides');
  },

  getRideDetail: async (id: string) => {
    return apiFetch(`/api/customer/rides/${id}`);
  },

  // Notifications
  getNotifications: async () => apiFetch('/api/customer/notifications'),
  markNotificationRead: async (id: string) => apiFetch(`/api/customer/notifications/${id}/read`, { method: 'PATCH' }),

  // Offers
  getActiveOffers: async () => apiFetch('/api/customer/offers'),
};
