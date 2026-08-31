import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  onNavigate: (screen: string, params?: any) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, logout } = useAuth();
  const [driver, setDriver] = useState<any>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [availableRides, setAvailableRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Disabled');
  const [watchId, setWatchId] = useState<number | null>(null);

  const fetchDriverDashboard = async () => {
    try {
      const driverData = await api.getProfile();
      setDriver(driverData);
      const onlineState = driverData.status === 'ONLINE';
      setIsOnline(onlineState);

      const ridesData = await api.getRides();
      setRides(ridesData);

      if (onlineState) {
        const availableData = await api.getAvailableRides().catch(() => []);
        setAvailableRides(availableData);
      } else {
        setAvailableRides([]);
      }
    } catch (error: any) {
      console.error('Failed to load driver dashboard:', error);
      if (error.status === 404 || error.code === 'DRIVER_PROFILE_NOT_FOUND') {
        Alert.alert('Session Expired', 'Your driver profile could not be found. Please log in again.');
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverDashboard();
  }, []);

  // Polling available rides when online
  useEffect(() => {
    let intervalId: any;
    if (isOnline) {
      intervalId = setInterval(async () => {
        try {
          const availableData = await api.getAvailableRides();
          setAvailableRides(availableData);
        } catch (error) {
          console.error('Failed to poll available rides:', error);
        }
      }, 5000); // poll every 5 seconds
    } else {
      setAvailableRides([]);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOnline]);

  // Request location permission and start tracking location if online
  useEffect(() => {
    if (isOnline) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
    return () => {
      stopLocationTracking();
    };
  }, [isOnline]);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'RideNow Location Permission',
          message: 'RideNow needs location permissions to track and match you to nearby passengers.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const startLocationTracking = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setLocationStatus('Permission Denied');
      Alert.alert('Permission Denied', 'Please enable location services to go online.');
      setIsOnline(false);
      // Toggle backend status back to OFFLINE
      await api.updateProfile({ status: 'OFFLINE' });
      return;
    }

    setLocationStatus('Locating...');
    
    // Fallback: get one-time location first
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStatus(`Active (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        await api.updateLocation(latitude, longitude).catch(err => console.error(err));
        if (isOnline) {
          const availableData = await api.getAvailableRides().catch(() => []);
          setAvailableRides(availableData);
        }
      },
      (error) => {
        console.warn('Geolocation one-time check error:', error);
        setLocationStatus('GPS Signal Weak');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    const id = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStatus(`Active (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        await api.updateLocation(latitude, longitude).catch(err => console.error(err));
        if (isOnline) {
          const availableData = await api.getAvailableRides().catch(() => []);
          setAvailableRides(availableData);
        }
      },
      (error) => {
        console.warn('Geolocation track watch error:', error);
        setLocationStatus('GPS Weak');
      },
      { enableHighAccuracy: true, distanceFilter: 10 }
    );

    setWatchId(id);
  };

  const stopLocationTracking = () => {
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setLocationStatus('Disabled');
  };

  const handleStatusToggle = async (value: boolean) => {
    const nextStatus = value ? 'ONLINE' : 'OFFLINE';
    setLoading(true);
    try {
      await api.updateProfile({ status: nextStatus });
      setIsOnline(value);
      if (driver) {
        setDriver({ ...driver, status: nextStatus });
      }
      if (value) {
        const availableData = await api.getAvailableRides().catch(() => []);
        setAvailableRides(availableData);
      } else {
        setAvailableRides([]);
      }
    } catch (error: any) {
      Alert.alert('Update Failed', error.message || 'Could not update online status.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'RIDE_COMPLETED': return { color: '#28a745' };
      case 'DRIVER_ASSIGNED':
      case 'RIDE_STARTED': return { color: '#17a2b8' };
      case 'CANCELLED': return { color: '#dc3545' };
      default: return { color: '#ffc107' };
    }
  };

  if (loading && !driver) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc107" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.emailText}>{driver?.name || user?.driver?.name || user?.email}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.profileBtn} onPress={() => onNavigate('NOTIFICATIONS')}>
            <Text style={styles.profileBtnText}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => onNavigate('EARNINGS')}>
            <Text style={styles.profileBtnText}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => onNavigate('PROFILE')}>
            <Text style={styles.profileBtnText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Online Status Card */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Duty Status</Text>
          <Switch
            value={isOnline}
            onValueChange={handleStatusToggle}
            trackColor={{ false: '#767577', true: '#ffd54f' }}
            thumbColor={isOnline ? '#ffc107' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.statusText}>
          You are currently <Text style={{ color: isOnline ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
        </Text>
        <Text style={styles.locationLabel}>
          GPS Location: <Text style={{ color: '#aaa', fontStyle: 'italic' }}>{locationStatus}</Text>
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Assigned Rides Section */}
        <Text style={styles.sectionTitle}>Assigned Trips</Text>
        {rides.length > 0 ? (
          rides.map((item) => (
            <TouchableOpacity key={item.id} style={styles.rideItem} onPress={() => onNavigate('RIDE_DETAIL', { rideId: item.id })}>
              <View style={styles.rideHeader}>
                <Text style={styles.rideDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                <Text style={[styles.rideStatus, getStatusStyle(item.status)]}>{item.status}</Text>
              </View>
              <Text style={styles.addressText} numberOfLines={1}>Pickup: {item.pickupAddress}</Text>
              <Text style={styles.addressText} numberOfLines={1}>Dropoff: {item.dropoffAddress}</Text>
              <Text style={styles.fareText}>Fare: ₹{item.fare.toFixed(2)}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No rides assigned currently.</Text>
          </View>
        )}

        {/* Available Rides Section */}
        {isOnline && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Available Trips Nearby</Text>
            {availableRides.length > 0 ? (
              availableRides.map((item) => (
                <TouchableOpacity key={item.id} style={styles.rideItem} onPress={() => onNavigate('RIDE_DETAIL', { rideId: item.id })}>
                  <View style={styles.rideHeader}>
                    <Text style={styles.rideDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    <Text style={[styles.rideStatus, { color: '#ffc107' }]}>{item.status}</Text>
                  </View>
                  <Text style={styles.addressText} numberOfLines={1}>Pickup: {item.pickupAddress}</Text>
                  <Text style={styles.addressText} numberOfLines={1}>Dropoff: {item.dropoffAddress}</Text>
                  <Text style={styles.fareText}>Fare: ₹{item.fare.toFixed(2)} {item.distanceToPickup !== undefined ? `(${item.distanceToPickup.toFixed(1)} km away)` : ''}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No nearby rides available.</Text>
              </View>
            )}
          </View>
        )}

        {/* Logout button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaa',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  welcomeText: {
    color: '#888',
    fontSize: 14,
  },
  emailText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileBtn: {
    backgroundColor: '#ffc107',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 4,
  },
  profileBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#aaa',
    marginTop: 8,
    fontSize: 14,
  },
  locationLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },
  sectionTitle: {
    color: '#ffc107',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  rideItem: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rideDate: {
    color: '#888',
    fontSize: 12,
  },
  rideStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  addressText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  fareText: {
    color: '#ffc107',
    fontWeight: 'bold',
    marginTop: 5,
  },
  emptyContainer: {
    backgroundColor: '#222',
    padding: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
  },
  logoutBtn: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  logoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
