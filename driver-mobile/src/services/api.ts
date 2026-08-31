import AsyncStorage from '@react-native-async-storage/async-storage';

// In Android emulators, 10.0.2.2 is mapped to the host's localhost (3000 for backend)
const API_URL = 'http://10.0.2.2:3000';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('token');

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
    const errorCode = responseData.error?.code || 'HTTP_ERROR';
    const errorMessage = responseData.error?.message || `Request failed with status ${response.status}`;
    throw { status: response.status, code: errorCode, message: errorMessage };
  }

  return responseData.data;
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
    return apiFetch('/api/driver/rides/available');
  },
  acceptRide: async (id: string) => {
    return apiFetch(`/api/driver/rides/${id}/accept`, {
      method: 'PATCH',
    });
  },
  updateRideStatus: async (id: string, status: string) => {
    return apiFetch(`/api/driver/rides/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Notifications
  getNotifications: async () => apiFetch('/api/driver/notifications'),
  markNotificationRead: async (id: string) => apiFetch(`/api/driver/notifications/${id}/read`, { method: 'PATCH' }),
};

