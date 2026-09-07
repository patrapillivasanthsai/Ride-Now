import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Laptop active Wi-Fi IPv4 address for physical Android devices
const DEV_LAN_IP = '192.168.1.2';

const getApiUrl = () => {
  const g: any = globalThis;

  // 1. Web / Browser environment
  if (g && g.window && g.window.location && g.window.location.hostname) {
    const host = g.window.location.hostname;
    if (host && host !== '10.0.2.2') {
      return `http://${host}:3000`;
    }
  }

  // 2. Mobile environment check (Metro / scriptURL)
  const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    try {
      const match = scriptURL.match(/^https?:\/\/([^/:]+)/);
      const host = match ? match[1] : null;

      // Android Studio Emulator explicitly uses 10.0.2.2
      if (host === '10.0.2.2') {
        return 'http://10.0.2.2:3000';
      }

      // Physical phone over Metro/Wi-Fi
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:3000`;
      }
    } catch {
      // Ignore parse error and fallback
    }
  }

  // 3. Android fallback: use laptop Wi-Fi IPv4 (192.168.1.2) for physical phone connectivity
  if (Platform.OS === 'android') {
    return `http://${DEV_LAN_IP}:3000`;
  }

  return 'http://localhost:3000';
};

const API_URL = getApiUrl();

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('token');

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorCode = responseData.error?.code || 'HTTP_ERROR';
      const errorMessage = responseData.error?.message || `Request failed with status ${response.status}`;
      throw { status: response.status, code: errorCode, message: errorMessage };
    }

    return responseData.data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw { status: 0, code: 'TIMEOUT', message: `Server connection timed out at ${API_URL}. Check if backend server is running.` };
    }
    if (err.status) throw err;
    throw { status: 0, code: 'NETWORK_ERROR', message: err.message || `Cannot connect to server at ${API_URL}` };
  }
}

export const api = {
  login: async (email: string, password: string) => {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  registerDriver: async (data: {
    email: string;
    password: string;
    phone: string;
    name: string;
    licenseNumber: string;
    vehicle: {
      make: string;
      model: string;
      year: number;
      color: string;
      plateNumber: string;
      type: string;
    }
  }) => {
    return apiFetch('/api/auth/register/driver', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMe: async () => {
    return apiFetch('/api/auth/me');
  },

  getProfile: async () => {
    return apiFetch('/api/driver/profile');
  },

  updateProfile: async (data: {
    email?: string;
    password?: string;
    phone?: string;
    status?: string;
    name?: string;
    licenseNumber?: string;
    vehicle?: {
      make?: string;
      model?: string;
      year?: number;
      color?: string;
      plateNumber?: string;
      type?: string;
    };
  }) => {
    return apiFetch('/api/driver/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateVehicle: async (data: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    plateNumber?: string;
    type?: string;
  }) => {
    return apiFetch('/api/driver/vehicle', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateLocation: async (lat: number, lng: number) => {
    return apiFetch('/api/driver/location', {
      method: 'PUT',
      body: JSON.stringify({ lat, lng }),
    });
  },

  getRides: async () => {
    return apiFetch('/api/driver/rides');
  },

  getRideDetail: async (id: string) => {
    return apiFetch(`/api/driver/rides/${id}`);
  },
  submitRideRating: async (id: string, score: number, comment?: string) => {
    return apiFetch(`/api/driver/rides/${id}/rating`, {
      method: 'POST',
      body: JSON.stringify({ score, comment }),
    });
  },
  getEarnings: async () => {
    return apiFetch('/api/driver/earnings');
  },
  getAvailableRides: async () => {
    try {
      const data = await apiFetch('/api/driver/rides/available');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  acceptRide: async (id: string) => {
    return apiFetch(`/api/driver/rides/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
  declineRide: async (id: string, reason?: string) => {
    return apiFetch(`/api/driver/rides/${id}/decline`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  updateRideStatus: async (id: string, status: string, otp?: string) => {
    return apiFetch(`/api/driver/rides/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, otp }),
    });
  },

  // Notifications & FCM
  updateFcmToken: async (token: string) => apiFetch('/api/auth/fcm-token', { method: 'POST', body: JSON.stringify({ token }) }),
  getNotifications: async () => apiFetch('/api/driver/notifications'),
  markNotificationRead: async (id: string) => apiFetch(`/api/driver/notifications/${id}/read`, { method: 'PATCH' }),

  // Mobile & Email OTP Auth
  sendMobileOtp: async (phone: string) => apiFetch('/api/auth/otp/send-mobile', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyMobileOtp: async (phone: string, otp: string) => apiFetch('/api/auth/otp/verify-mobile', { method: 'POST', body: JSON.stringify({ phone, otp }) }),
  sendForgotPasswordOtp: async (email: string) => apiFetch('/api/auth/forgot-password/send-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyForgotPasswordOtp: async (email: string, otp: string) => apiFetch('/api/auth/forgot-password/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  resetForgotPassword: async (email: string, otp: string, newPassword: string) => apiFetch('/api/auth/forgot-password/reset', { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) }),

  // Documents
  getDocuments: async () => apiFetch('/api/driver/documents'),
  uploadDocument: async (type: string, frontUrl?: string, backUrl?: string) => apiFetch('/api/driver/documents/upload', { method: 'POST', body: JSON.stringify({ type, frontUrl, backUrl }) }),

  // Payout Setup
  getPayoutSetup: async () => apiFetch('/api/driver/payout-setup'),
  savePayoutSetup: async (data: { type: string; accountHolderName?: string; bankName?: string; accountNumber?: string; ifscCode?: string; upiId?: string }) => apiFetch('/api/driver/payout-setup', { method: 'POST', body: JSON.stringify(data) }),

  // Safety Training
  getSafetyTraining: async () => apiFetch('/api/driver/training'),
  completeSafetyTraining: async () => apiFetch('/api/driver/training/complete', { method: 'POST', body: JSON.stringify({}) }),

  // Wallet & Withdrawals
  getWallet: async () => apiFetch('/api/driver/wallet'),
  requestWithdrawal: async (amount: number) => apiFetch('/api/driver/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount }) }),

  // Referrals
  getReferrals: async () => apiFetch('/api/driver/referrals'),

  // Help & Support
  getSupportTickets: async () => apiFetch('/api/driver/support/tickets'),
  createSupportTicket: async (data: { category?: string; subject: string; message: string; isEmergency?: boolean }) => apiFetch('/api/driver/support/tickets', { method: 'POST', body: JSON.stringify(data) }),

  // Preferred Destination Area
  setPreferredArea: async (area: string) => apiFetch('/api/driver/preferred-area', { method: 'PUT', body: JSON.stringify({ area }) }),
};

