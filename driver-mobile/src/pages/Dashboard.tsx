import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  Modal,
  TextInput,
  RefreshControl
} from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { SwipeActionButton } from '../components/SwipeActionButton';
import { playIncomingRideRingtone, playSuccessChime } from '../utils/audioAlert';
import { dutyTimeTracker } from '../utils/dutyTimeTracker';

interface DashboardProps {
  onNavigate: (screen: string, params?: any) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();

  const [driver, setDriver] = useState<any>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [availableRides, setAvailableRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [onlineSeconds, setOnlineSeconds] = useState(0);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({ lat: 17.7210, lng: 83.3110 });
  const [locationAddress, setLocationAddress] = useState('Siripuram, Visakhapatnam');
  const [syncingLocation, setSyncingLocation] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Incoming Ride Request Countdown Timer (18s ring)
  const [incomingCountdown, setIncomingCountdown] = useState(18);
  const countdownIntervalRef = useRef<any>(null);

  // 4-Digit Passenger Start OTP Modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  const fetchDriverDashboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const driverData = await api.getProfile();
      setDriver(driverData);
      const onlineState = driverData.status === 'ONLINE' || driverData.status === 'BUSY';
      setIsOnline(onlineState);

      const ridesData = await api.getRides();
      setRides(Array.isArray(ridesData) ? ridesData : []);

      if (onlineState && driverData.isApproved) {
        const availableData = await api.getAvailableRides();
        setAvailableRides(Array.isArray(availableData) ? availableData : []);
      }
    } catch {
      setRides([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDriverDashboard();
    syncLocation();
  }, []);

  // Synchronized continuous duty time tracker
  useEffect(() => {
    const syncTime = async () => {
      const secs = await dutyTimeTracker.getTodayOnlineSeconds(isOnline);
      setOnlineSeconds(secs);
    };
    syncTime();
    const timer = setInterval(syncTime, 1000);
    return () => clearInterval(timer);
  }, [isOnline]);

  // Polling loop for online drivers
  useEffect(() => {
    let interval: any = null;
    if (isOnline && driver?.isApproved) {
      interval = setInterval(async () => {
        try {
          const availableData = await api.getAvailableRides();
          setAvailableRides(Array.isArray(availableData) ? availableData : []);
          const ridesData = await api.getRides();
          setRides(Array.isArray(ridesData) ? ridesData : []);
        } catch {
          // Silent
        }
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline, driver]);

  // GPS Location Sync
  const syncLocation = async (manual = false) => {
    if (syncingLocation) return;
    if (manual) setSyncingLocation(true);

    try {
      const nav: any = (globalThis as any).navigator;
      if (nav && nav.geolocation) {
        nav.geolocation.getCurrentPosition(
          async (pos: any) => {
            const { latitude, longitude } = pos.coords;
            setCurrentCoords({ lat: latitude, lng: longitude });
            setLocationAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)} · GPS Live`);
            await api.updateLocation(latitude, longitude).catch(() => {});
            if (manual) Alert.alert('GPS Synced', `Position: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            if (manual) setSyncingLocation(false);
          },
          () => {
            if (manual) setSyncingLocation(false);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        await api.updateLocation(currentCoords.lat, currentCoords.lng).catch(() => {});
        if (manual) setSyncingLocation(false);
      }
    } catch {
      if (manual) setSyncingLocation(false);
    }
  };

  // Toggle Duty Online / Offline
  const handleStatusToggle = async () => {
    if (!driver?.isApproved) {
      Alert.alert(
        'Account Under Review ⏳',
        'Your Captain account is currently under review by admin. You will be able to go online once approved.'
      );
      return;
    }

    const nextStatus = !isOnline ? 'ONLINE' : 'OFFLINE';
    if (!isOnline) {
      await dutyTimeTracker.startDuty();
    } else {
      await dutyTimeTracker.stopDuty();
    }
    setActionLoading(true);
    try {
      await api.updateProfile({ status: nextStatus });
      setIsOnline(!isOnline);
      if (!isOnline) {
        syncLocation();
        playSuccessChime();
        Alert.alert('Duty ONLINE 🟢', `Ready to receive ${vehicleLabel} ride requests!`);
      } else {
        Alert.alert('Duty OFFLINE ⚪', 'You are now offline.');
      }
      fetchDriverDashboard();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not update duty status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Active Assigned Trip
  const activeTrip = rides.find(
    (r) =>
      r.status === 'DRIVER_ASSIGNED' ||
      r.status === 'DRIVER_ARRIVING' ||
      r.status === 'DRIVER_ARRIVED' ||
      r.status === 'RIDE_STARTED'
  );

  // Incoming Request
  const currentIncomingRequest = availableRides.length > 0 ? availableRides[0] : null;

  // Sound chime & Countdown for incoming request
  useEffect(() => {
    if (currentIncomingRequest && isOnline && !activeTrip) {
      playIncomingRideRingtone();
      setIncomingCountdown(18);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setIncomingCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [currentIncomingRequest?.id, isOnline, !!activeTrip]);

  // Accept Ride
  const handleAcceptRide = async (rideId: string) => {
    setActionLoading(true);
    try {
      await api.acceptRide(rideId);
      playSuccessChime();
      Alert.alert('Ride Accepted! 🚀', 'Navigate to the passenger pickup location.');
      fetchDriverDashboard();
    } catch (error: any) {
      Alert.alert('Could Not Accept', error.message || 'Ride was assigned to another driver or cancelled.');
      fetchDriverDashboard();
    } finally {
      setActionLoading(false);
    }
  };

  // Decline Ride
  const handleDeclineRide = async (rideId: string) => {
    try {
      await api.declineRide(rideId, 'Captain declined request');
      setAvailableRides((prev) => prev.filter((r) => r.id !== rideId));
    } catch {
      // Silent
    }
  };

  // Update Active Trip Status
  const handleUpdateActiveTripStatus = async (rideId: string, nextStatus: string, otpCode?: string) => {
    setActionLoading(true);
    try {
      await api.updateRideStatus(rideId, nextStatus, otpCode);
      playSuccessChime();
      fetchDriverDashboard();
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Could not update ride status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Verify 4-Digit Passenger Start OTP
  const handleVerifyOtpAndStart = async (rideId: string) => {
    const code = otpInput.trim();
    if (code.length !== 4) {
      setOtpError('Please enter the 4-digit passenger OTP code.');
      return;
    }

    setOtpSubmitting(true);
    setOtpError(null);
    try {
      await api.updateRideStatus(rideId, 'RIDE_STARTED', code);
      setShowOtpModal(false);
      setOtpInput('');
      playSuccessChime();
      Alert.alert('🎉 Trip Started!', 'Passenger verified successfully. Have a safe journey!');
      fetchDriverDashboard();
    } catch (err: any) {
      const msg = err.message || 'Invalid passenger OTP. Ask the customer for the 4-digit code.';
      setOtpError(msg);
    } finally {
      setOtpSubmitting(false);
    }
  };

  // Real Calculated Stats (Zero for clean new users)
  const completedRidesList = rides.filter((r) => r.status === 'RIDE_COMPLETED');
  const todayEarningsAmount = completedRidesList.reduce((acc, r) => acc + (r.fare || 0) * 0.8, 0);
  const completedTripsCount = completedRidesList.length;

  const formatOnlineTime = (totalSeconds: number) => {
    return dutyTimeTracker.formatDutyHours(totalSeconds);
  };

  // Case-Insensitive Vehicle Category Normalization
  const rawType = String(driver?.vehicle?.type || user?.driver?.vehicle?.type || 'BIKE').toUpperCase();
  const vehicleLabel = rawType.includes('AUTO') ? 'Auto' : rawType.includes('CAB') ? 'Cab' : 'Bike';
  const vehicleEmoji = vehicleLabel === 'Bike' ? '🏍️' : vehicleLabel === 'Auto' ? '🛺' : '🚗';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header with Profile Avatar linking to Personal Information */}
      <AppHeader
        showNotifications
        unreadCount={0}
        onOpenNotifications={() => onNavigate('NOTIFICATIONS')}
        showProfile
        avatarText={driver?.name ? driver.name.slice(0, 2).toUpperCase() : '👨‍✈️'}
        onOpenProfile={() => onNavigate('PERSONAL_INFO')}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDriverDashboard(true)} tintColor="#00b562" />}
      >
        {/* OFFLINE / ONLINE DUTY CARD */}
        <View style={[styles.dutyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.dutyTitle, { color: theme.text }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
          <Text style={[styles.dutySubtitle, { color: theme.textMuted }]}>
            {isOnline ? 'Ready to receive ride requests.' : 'Go online to start receiving ride requests.'}
          </Text>

          <TouchableOpacity
            style={[
              styles.goOnlineBtn,
              { backgroundColor: isOnline ? '#ef4444' : '#00b562' }
            ]}
            onPress={handleStatusToggle}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : isOnline ? (
              <Text style={styles.goOnlineText}>Go Offline</Text>
            ) : (
              <View style={styles.goOnlineInnerRow}>
                <View style={styles.goOnlineIconBadge}>
                  <Text style={{ color: '#00b562', fontSize: 16, fontWeight: '900' }}>»</Text>
                </View>
                <Text style={styles.goOnlineText}>Go Online</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ACTIVE ASSIGNED RIDE CARD */}
        {activeTrip && (
          <View style={[styles.activeRideCard, { backgroundColor: theme.card, borderColor: '#00b562' }]}>
            <View style={styles.navBanner}>
              <Text style={{ fontSize: 24, marginRight: 10 }}>↰</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.navBannerTitle}>Turn left in 300 m</Text>
                <Text style={styles.navBannerSub}>
                  {activeTrip.status === 'RIDE_STARTED' ? activeTrip.dropoffAddress : activeTrip.pickupAddress}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.navBannerTime}>12 min</Text>
                <Text style={styles.navBannerDist}>3.8 km</Text>
              </View>
            </View>

            <View style={[styles.passengerCard, { backgroundColor: theme.cardSecondary }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textMuted }}>PASSENGER</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: theme.text, marginTop: 2 }}>
                    {activeTrip.customer?.name || 'Customer'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#f59e0b', fontWeight: '700' }}>★ 4.8 Rating</Text>
                </View>

                <View style={styles.otpBox}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textMuted }}>START OTP</Text>
                  <Text style={styles.otpCode}>{activeTrip.otp || '4821'}</Text>
                </View>
              </View>

              <View style={styles.passengerActionsRow}>
                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: theme.card }]}
                  onPress={() => {
                    if (activeTrip.customer?.phone) Linking.openURL(`tel:${activeTrip.customer.phone}`);
                    else Alert.alert('Customer Phone', 'Dialing passenger via secure bridge.');
                  }}
                >
                  <Text style={{ fontSize: 16 }}>📞</Text>
                  <Text style={[styles.actionBtnText, { color: theme.text }]}>Call Customer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: theme.card }]}
                  onPress={() => Alert.alert('Chat', 'Opening passenger in-app chat.')}
                >
                  <Text style={{ fontSize: 16 }}>💬</Text>
                  <Text style={[styles.actionBtnText, { color: theme.text }]}>Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: '#ef4444' }]}
                  onPress={() => onNavigate('HELP')}
                >
                  <Text style={{ fontSize: 16 }}>🛡️</Text>
                  <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>Safety</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              {activeTrip.status === 'DRIVER_ASSIGNED' && (
                <SwipeActionButton
                  title="Swipe to Arrive at Pickup"
                  icon="»"
                  color="#00b562"
                  loading={actionLoading}
                  onConfirm={() => handleUpdateActiveTripStatus(activeTrip.id, 'DRIVER_ARRIVING', undefined)}
                />
              )}

              {activeTrip.status === 'DRIVER_ARRIVING' && (
                <SwipeActionButton
                  title="📍 Arrived at Pickup Spot"
                  icon="»"
                  color="#7c3aed"
                  loading={actionLoading}
                  onConfirm={() => handleUpdateActiveTripStatus(activeTrip.id, 'DRIVER_ARRIVED', undefined)}
                />
              )}

              {activeTrip.status === 'DRIVER_ARRIVED' && (
                <SwipeActionButton
                  title="🔒 Enter Passenger OTP — Start Trip"
                  icon="»"
                  color="#0284c7"
                  loading={actionLoading}
                  onConfirm={() => {
                    setOtpInput('');
                    setOtpError(null);
                    setShowOtpModal(true);
                  }}
                />
              )}

              {activeTrip.status === 'RIDE_STARTED' && (
                <SwipeActionButton
                  title={`🏁 Swipe to Complete Ride (₹${activeTrip.fare.toFixed(0)})`}
                  icon="»"
                  color="#059669"
                  loading={actionLoading}
                  onConfirm={() => handleUpdateActiveTripStatus(activeTrip.id, 'RIDE_COMPLETED', undefined)}
                />
              )}
            </View>
          </View>
        )}

        {/* INCOMING RIDE REQUEST CARD */}
        {currentIncomingRequest && isOnline && !activeTrip && (
          <View style={[styles.incomingCard, { backgroundColor: theme.card, borderColor: '#00b562' }]}>
            <View style={styles.incomingHeader}>
              <Text style={[styles.incomingSheetTitle, { color: theme.text }]}>New Ride Request</Text>
              <View style={styles.countdownRing}>
                <Text style={styles.countdownNumber}>00:{String(incomingCountdown).padStart(2, '0')}</Text>
              </View>
            </View>

            <View style={[styles.routeBox, { backgroundColor: theme.cardSecondary }]}>
              <View style={styles.routePointRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Pickup</Text>
                  <Text style={[styles.routeAddressText, { color: theme.text }]} numberOfLines={1}>
                    {currentIncomingRequest.pickupAddress || 'MG Road Metro Station'}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Drop</Text>
                  <Text style={[styles.routeAddressText, { color: theme.text }]} numberOfLines={1}>
                    {currentIncomingRequest.dropoffAddress || 'Indiranagar'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.tripStatsRow}>
              <View>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>Distance to Pickup</Text>
                <Text style={[styles.tripStatVal, { color: theme.text }]}>1.8 km</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>Estimated Trip Distance</Text>
                <Text style={[styles.tripStatVal, { color: theme.text }]}>
                  {currentIncomingRequest.distance ? `${currentIncomingRequest.distance.toFixed(1)} km` : '6.4 km'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>Estimated Fare</Text>
                <Text style={[styles.tripStatVal, { color: theme.text, fontSize: 18, fontWeight: '900' }]}>
                  ₹{currentIncomingRequest.fare?.toFixed(0) || '186'}
                </Text>
              </View>
            </View>

            <View style={[styles.passengerDetailBox, { backgroundColor: theme.cardSecondary }]}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: theme.text, marginBottom: 6 }}>
                Ride Type: <Text style={{ color: '#00b562' }}>{vehicleLabel} Ride</Text>
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.passengerAvatarMini}>
                  <Text style={{ fontSize: 16 }}>👤</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: theme.text }}>Customer: Rahul S.</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>
                    Passenger rating: <Text style={{ color: '#f59e0b', fontWeight: '800' }}>4.8 ★</Text>
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.requestActionsRow}>
              <TouchableOpacity
                style={[styles.declineBtn, { backgroundColor: theme.cardSecondary, borderColor: '#00b562' }]}
                onPress={() => handleDeclineRide(currentIncomingRequest.id)}
              >
                <Text style={[styles.declineText, { color: '#00b562' }]}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAcceptRide(currentIncomingRequest.id)}
              >
                <Text style={styles.acceptText}>Accept Ride ✨</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Live Interactive Map Surface */}
        <View style={[styles.mapCard, { backgroundColor: '#091024', borderColor: theme.border }]}>
          {/* Street Grid Graphic Lines */}
          <View style={styles.streetRoad1} />
          <View style={styles.streetRoad2} />
          <View style={styles.streetRoad3} />

          {/* Live GPS Location Badge */}
          <TouchableOpacity style={styles.liveLocationBadge} onPress={() => syncLocation(true)}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLocationText}>{locationAddress}</Text>
          </TouchableOpacity>

          {/* Center Pulsating Radar & Vehicle Marker */}
          <View style={styles.radarVisual}>
            <View style={styles.radarRing1} />
            <View style={styles.radarRing2} />
            <View style={styles.captainMarker}>
              <Text style={{ fontSize: 20 }}>{vehicleEmoji}</Text>
            </View>
          </View>

          {/* Vehicle Category Availability Pill */}
          <View style={[styles.vehicleAvailabilityPill, { backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#00b562' }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
              {vehicleEmoji} {vehicleLabel} • Available for {vehicleLabel} Rides
            </Text>
          </View>
        </View>

        {/* Bottom Sheet KPI Summary Bar */}
        <View style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.kpiItem} onPress={() => onNavigate('EARNINGS')}>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Today's Earnings</Text>
            <Text style={[styles.kpiValue, { color: theme.text }]}>₹{todayEarningsAmount.toFixed(0)}</Text>
          </TouchableOpacity>
          <View style={styles.kpiDivider} />
          <TouchableOpacity style={styles.kpiItem} onPress={() => onNavigate('EARNINGS')}>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Completed Trips</Text>
            <Text style={[styles.kpiValue, { color: theme.text }]}>{completedTripsCount}</Text>
          </TouchableOpacity>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Online Time</Text>
            <Text style={[styles.kpiValue, { color: theme.text }]}>{formatOnlineTime(onlineSeconds)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* 4-Digit Passenger Start OTP Modal */}
      <Modal visible={showOtpModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.otpModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Enter Passenger Start OTP</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Ask passenger for the 4-digit code shown on their booking screen.
            </Text>

            {otpError && (
              <View style={styles.otpErrorBox}>
                <Text style={styles.otpErrorText}>⚠️ {otpError}</Text>
              </View>
            )}

            <TextInput
              style={[styles.otpInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: otpError ? '#ef4444' : '#00b562' }]}
              placeholder="••••"
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              value={otpInput}
              onChangeText={(v) => { setOtpInput(v); if (otpError) setOtpError(null); }}
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.otpCancelBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                onPress={() => setShowOtpModal(false)}
              >
                <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.otpVerifyBtn}
                onPress={() => activeTrip && handleVerifyOtpAndStart(activeTrip.id)}
                disabled={otpSubmitting}
              >
                {otpSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.otpVerifyText}>Verify & Start Trip 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab="DASHBOARD"
        onSelectTab={(tab) => {
          if (tab === 'EARNINGS') onNavigate('EARNINGS');
          else if (tab === 'WALLET') onNavigate('WALLET');
          else if (tab === 'REFERRALS') onNavigate('REFERRALS');
          else if (tab === 'PROFILE') onNavigate('PROFILE');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  dutyCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'center',
    elevation: 3,
  },
  dutyTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dutySubtitle: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  goOnlineBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  goOnlineInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  goOnlineIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goOnlineText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  mapCard: {
    height: 250,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streetRoad1: {
    position: 'absolute',
    left: '25%',
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#162347',
    transform: [{ rotate: '25deg' }],
  },
  streetRoad2: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: '#162347',
    transform: [{ rotate: '-10deg' }],
  },
  streetRoad3: {
    position: 'absolute',
    right: '30%',
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: '#162347',
    transform: [{ rotate: '-35deg' }],
  },
  liveLocationBadge: {
    position: 'absolute',
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 13, 30, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00b562',
    gap: 6,
    zIndex: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00b562',
  },
  liveLocationText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  radarVisual: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 181, 98, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarRing1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 181, 98, 0.4)',
  },
  radarRing2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: 'rgba(0, 181, 98, 0.2)',
  },
  captainMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00b562',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  vehicleAvailabilityPill: {
    position: 'absolute',
    bottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    zIndex: 5,
  },
  kpiCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 19,
    fontWeight: '900',
  },
  activeRideCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 16,
    elevation: 4,
  },
  navBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00b562',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  navBannerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  navBannerSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 1,
  },
  navBannerTime: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  navBannerDist: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
  },
  passengerCard: {
    padding: 14,
    borderRadius: 14,
  },
  otpBox: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 181, 98, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00b562',
  },
  otpCode: {
    color: '#00b562',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  passengerActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  iconActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  incomingCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 16,
    elevation: 6,
  },
  incomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  incomingSheetTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  countdownRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 181, 98, 0.15)',
    borderWidth: 2,
    borderColor: '#00b562',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    color: '#00b562',
    fontSize: 12,
    fontWeight: '900',
  },
  routeBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  routePointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeAddressText: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  tripStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  tripStatVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  passengerDetailBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  passengerAvatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 14,
    fontWeight: '800',
  },
  acceptBtn: {
    flex: 1.5,
    backgroundColor: '#00b562',
    paddingVertical: 13,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 3,
  },
  acceptText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  otpModalCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  otpErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  otpErrorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpInput: {
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 12,
    paddingVertical: 10,
  },
  otpCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  otpVerifyBtn: {
    flex: 2,
    backgroundColor: '#00b562',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  otpVerifyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
