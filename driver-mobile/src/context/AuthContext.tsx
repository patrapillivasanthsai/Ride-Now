import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface AuthContextType {
  user: any;
  token: string | null;
  loading: boolean;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Auto-sync REAL FCM Registration Token for notifications
  useEffect(() => {
    async function syncFcmToken() {
      if (user && user.role === 'DRIVER') {
        try {
          // Request Android 13+ Notification Permission
          if (Platform.OS === 'android' && (Platform as any).Version >= 33) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            ).catch(() => {});
          }

          // Request Firebase Messaging authorization
          await messaging().requestPermission().catch(() => {});

          // Acquire REAL FCM Registration Token directly from Firebase Messaging SDK
          let fcmToken: string | null = null;
          try {
            fcmToken = await messaging().getToken();
            console.log('🔥 [REAL FCM TOKEN OBTAINED FROM FIREBASE]:', fcmToken);
          } catch (err) {
            console.warn('[FCM Token Fetch Warning]:', err);
          }

          if (fcmToken) {
            await AsyncStorage.setItem('fcm_device_token', fcmToken);
            await api.updateFcmToken(fcmToken).catch(() => {});
            console.log('✅ [REAL FCM TOKEN SYNCED TO BACKEND DB]');
          }
        } catch {
          // Ignore sync errors
        }
      }
    }
    syncFcmToken();
  }, [user?.id]);

  useEffect(() => {
    async function loadAuth() {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          const userData = await api.getMe();
          if (userData.role === 'DRIVER' && !userData.driver) {
            throw new Error('Driver profile not found');
          }
          setUser(userData);
        }
      } catch (error) {
        console.error('Session load failed, clearing credentials:', error);
        await AsyncStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadAuth();
  }, []);

  const handleLogin = async (jwtToken: string, userData: any) => {
    if (jwtToken && typeof jwtToken === 'string') {
      await AsyncStorage.setItem('token', jwtToken);
      setToken(jwtToken);
    }
    setUser(userData);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Refresh user session failed:', error);
      await handleLogout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login: handleLogin, logout: handleLogout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
