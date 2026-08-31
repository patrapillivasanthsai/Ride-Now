import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import { api } from './api';

let watchId: number | null = null;

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'RideNow Driver Location Permission',
        message: 'RideNow needs access to your location to receive ride requests nearby.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Error requesting location permission:', err);
    return false;
  }
}

export async function startLocationTracking() {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    console.warn('Location permission denied. Cannot start tracking.');
    return;
  }

  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
  }

  watchId = Geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        await api.updateLocation(latitude, longitude);
      } catch (err) {
        console.error('Failed to sync location to backend:', err);
      }
    },
    (error) => {
      console.error('Error getting position coordinates:', error);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 10,
      interval: 10000,
      fastestInterval: 5000,
    }
  );
}

export function stopLocationTracking() {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
}
