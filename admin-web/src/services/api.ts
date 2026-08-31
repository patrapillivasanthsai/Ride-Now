/// <reference types="vite/client" />
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.clear();
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    const errorCode = responseData.error?.code || 'HTTP_ERROR';
    const errorMessage = responseData.error?.message || `Request failed with status ${response.status}`;
    throw { status: response.status, code: errorCode, message: errorMessage };
  }

  return responseData.data;
}

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) throw { message: responseData.error?.message || 'Login failed' };
    return responseData.data;
  },

  getMe: async () => apiFetch('/api/auth/me'),

  // ── Stats ─────────────────────────────────────────────────────────────────
  getStats: async () => apiFetch('/api/admin/stats'),

  // ── Drivers ───────────────────────────────────────────────────────────────
  getDrivers: async (params?: { isApproved?: boolean; status?: string; vehicleType?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.isApproved !== undefined) q.set('isApproved', String(params.isApproved));
    if (params?.status) q.set('status', params.status);
    if (params?.vehicleType) q.set('vehicleType', params.vehicleType);
    if (params?.search) q.set('search', params.search);
    return apiFetch(`/api/admin/drivers?${q}`);
  },

  approveDriver: async (id: string) => apiFetch(`/api/admin/drivers/${id}/approve`, { method: 'PATCH' }),
  rejectDriver: async (id: string, reason?: string) => apiFetch(`/api/admin/drivers/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  suspendDriver: async (id: string, reason: string) => apiFetch(`/api/admin/drivers/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  activateDriver: async (id: string) => apiFetch(`/api/admin/drivers/${id}/activate`, { method: 'PATCH' }),

  // ── Rides ─────────────────────────────────────────────────────────────────
  getRides: async (params?: { status?: string; vehicleType?: string; search?: string; page?: number; dateFrom?: string; dateTo?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.vehicleType) q.set('vehicleType', params.vehicleType);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return apiFetch(`/api/admin/rides?${q}`);
  },

  getRideDetail: async (id: string) => apiFetch(`/api/admin/rides/${id}`),
  getEligibleDrivers: async (rideId: string) => apiFetch(`/api/admin/rides/${rideId}/eligible-drivers`),
  assignDriver: async (rideId: string, driverId: string) => apiFetch(`/api/admin/rides/${rideId}/assign-driver`, { method: 'POST', body: JSON.stringify({ driverId }) }),
  adminCancelRide: async (rideId: string, reason: string) => apiFetch(`/api/admin/rides/${rideId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // ── Pricing ───────────────────────────────────────────────────────────────
  getPricing: async () => apiFetch('/api/admin/pricing'),
  updatePricing: async (vehicleType: string, data: { baseFare: number; perKmRate: number; perMinuteRate: number; minimumFare?: number }) =>
    apiFetch(`/api/admin/pricing/${vehicleType}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Payments ──────────────────────────────────────────────────────────────
  getPayments: async (params?: { status?: string; paymentMethod?: string; page?: number; dateFrom?: string; dateTo?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.paymentMethod) q.set('paymentMethod', params.paymentMethod);
    if (params?.page) q.set('page', String(params.page));
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return apiFetch(`/api/admin/payments?${q}`);
  },
  getPaymentDetail: async (id: string) => apiFetch(`/api/admin/payments/${id}`),

  // ── Customers ─────────────────────────────────────────────────────────────
  getCustomers: async (params?: { search?: string; isSuspended?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.isSuspended !== undefined) q.set('isSuspended', String(params.isSuspended));
    return apiFetch(`/api/admin/customers?${q}`);
  },
  getCustomerDetail: async (id: string) => apiFetch(`/api/admin/customers/${id}`),
  suspendCustomer: async (id: string, reason: string) => apiFetch(`/api/admin/customers/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  reactivateCustomer: async (id: string) => apiFetch(`/api/admin/customers/${id}/reactivate`, { method: 'PATCH' }),

  // ── Analytics ─────────────────────────────────────────────────────────────
  getAnalytics: async (period: number = 7) => apiFetch(`/api/admin/analytics?period=${period}`),

  // ── Ratings ───────────────────────────────────────────────────────────────
  getRatings: async (params?: { isFlagged?: boolean; raterRole?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.isFlagged !== undefined) q.set('isFlagged', String(params.isFlagged));
    if (params?.raterRole) q.set('raterRole', params.raterRole);
    if (params?.page) q.set('page', String(params.page));
    return apiFetch(`/api/admin/ratings?${q}`);
  },
  flagRating: async (id: string, flagReason: string) => apiFetch(`/api/admin/ratings/${id}/flag`, { method: 'PATCH', body: JSON.stringify({ flagReason }) }),
  resolveRating: async (id: string, resolveNote: string) => apiFetch(`/api/admin/ratings/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ resolveNote }) }),

  // ── Notifications ─────────────────────────────────────────────────────────
  getAdminNotifications: async (page?: number) => apiFetch(`/api/admin/notifications?page=${page || 1}`),
  createNotification: async (data: { title: string; body: string; type: string; targetRole: string; targetUserId?: string }) =>
    apiFetch('/api/admin/notifications', { method: 'POST', body: JSON.stringify(data) }),

  // ── Offers ────────────────────────────────────────────────────────────────
  getOffers: async () => apiFetch('/api/admin/offers'),
  createOffer: async (data: any) => apiFetch('/api/admin/offers', { method: 'POST', body: JSON.stringify(data) }),
  updateOffer: async (id: string, data: any) => apiFetch(`/api/admin/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOffer: async (id: string) => apiFetch(`/api/admin/offers/${id}`, { method: 'DELETE' }),

  // ── Staff ─────────────────────────────────────────────────────────────────
  getStaff: async () => apiFetch('/api/admin/staff'),
  createStaff: async (data: { email: string; password: string; staffRole: string }) =>
    apiFetch('/api/admin/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: async (id: string, data: { staffRole?: string; isActive?: boolean }) =>
    apiFetch(`/api/admin/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Audit Logs ────────────────────────────────────────────────────────────
  getAuditLogs: async (page?: number) => apiFetch(`/api/admin/audit-logs?page=${page || 1}`),

  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings: async () => apiFetch('/api/admin/settings'),
  updateSettings: async (settings: Record<string, string>) =>
    apiFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
};
