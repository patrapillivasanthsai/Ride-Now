import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  Modal
} from 'react-native';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface RideDetailProps {
  rideId: string;
  onNavigate: (screen: string) => void;
}

export function RideDetail({ rideId, onNavigate }: RideDetailProps) {
  const { theme } = useTheme();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  const handleAccept = async () => {
    try {
      setTransitioning(true);
      await api.acceptRide(rideId);
      const data = await api.getRideDetail(rideId);
      setRide(data);
      Alert.alert('🎉 Success', 'You have accepted this trip request!');
    } catch (error: any) {
      Alert.alert('Action Failed', error.message || 'Could not accept ride.');
    } finally {
      setTransitioning(false);
    }
  };

  const handleStatusChange = async (nextStatus: string) => {
    try {
      setTransitioning(true);
      await api.updateRideStatus(rideId, nextStatus);
      const data = await api.getRideDetail(rideId);
      setRide(data);
      Alert.alert('Trip Milestone Updated', `Ride status updated to ${nextStatus.replace(/_/g, ' ')}!`);
    } catch (error: any) {
      Alert.alert('Action Failed', error.message || 'Could not update ride status.');
    } finally {
      setTransitioning(false);
    }
  };

  const handleVerifyOtpAndStart = async () => {
    const trimmed = otpInput.trim();
    if (!trimmed || trimmed.length !== 4) {
      setOtpError('Please enter the 4-digit OTP code (0000 - 9999)');
      return;
    }
    setOtpSubmitting(true);
    setOtpError(null);
    try {
      await api.updateRideStatus(rideId, 'RIDE_STARTED', trimmed);
      setShowOtpModal(false);
      setOtpInput('');
      const data = await api.getRideDetail(rideId);
      setRide(data);
      Alert.alert('🎉 Ride Started!', 'Passenger OTP verified successfully! Have a safe trip.');
    } catch (err: any) {
      const msg = err.message || 'Wrong OTP! Please verify the 4-digit Start OTP with the customer.';
      setOtpError(msg);
      Alert.alert('❌ Wrong OTP', msg);
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleRatingSubmit = async () => {
    try {
      setSubmittingRating(true);
      await api.submitRideRating(rideId, ratingScore, ratingComment);
      Alert.alert('Success', 'Customer rated successfully!');
      const data = await api.getRideDetail(rideId);
      setRide(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  useEffect(() => {
    async function loadRideDetail() {
      try {
        const data = await api.getRideDetail(rideId);
        setRide(data);
      } catch (error: any) {
        Alert.alert('Error', 'Failed to retrieve ride details.');
        onNavigate('DASHBOARD');
      } finally {
        setLoading(false);
      }
    }
    loadRideDetail();
  }, [rideId]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color="#00b562" />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading trip details...</Text>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.text }}>Trip not found.</Text>
      </View>
    );
  }

  const renderActionButtons = () => {
    let buttonLabel = '';
    let btnColor = '#00b562';
    let onPressAction: () => Promise<void> | void = async () => {};

    if (ride.status === 'REQUESTED' || ride.status === 'SEARCHING_DRIVER') {
      buttonLabel = '✅ Accept Ride Request';
      btnColor = '#00b562';
      onPressAction = handleAccept;
    } else if (ride.status === 'DRIVER_ASSIGNED') {
      buttonLabel = '🚗 Head to Pickup Point (Start Arriving)';
      btnColor = '#00b562';
      onPressAction = () => handleStatusChange('DRIVER_ARRIVING');
    } else if (ride.status === 'DRIVER_ARRIVING') {
      buttonLabel = '📍 Arrived at Pickup Location';
      btnColor = '#7c3aed';
      onPressAction = () => handleStatusChange('DRIVER_ARRIVED');
    } else if (ride.status === 'DRIVER_ARRIVED') {
      buttonLabel = '🔒 Enter Passenger OTP — Start Trip';
      btnColor = '#0284c7';
      onPressAction = () => {
        setOtpInput('');
        setOtpError(null);
        setShowOtpModal(true);
      };
    } else if (ride.status === 'RIDE_STARTED') {
      buttonLabel = `🏁 Complete Trip & Collect ₹${ride.fare.toFixed(0)}`;
      btnColor = '#059669';
      onPressAction = () => handleStatusChange('RIDE_COMPLETED');
    }

    if (!buttonLabel) return null;

    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: '#00b562' }]}>
        <Text style={[styles.sectionHeader, { color: '#00b562' }]}>⚡ Trip Action</Text>
        <TouchableOpacity
          onPress={onPressAction}
          disabled={transitioning}
          style={[styles.mainActionBtn, { backgroundColor: btnColor }]}
        >
          {transitioning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.mainActionBtnText}>{buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Navigation */}
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('DASHBOARD')}>
          <Text style={[styles.backBtnText, { color: '#00b562' }]}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: theme.text }]}>Trip Navigation</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Live Trip Actions Banner */}
        {renderActionButtons()}

        {/* Core Trip Summary */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted }}>TRIP STATUS</Text>
              <Text style={[styles.statusBadge, { color: '#00b562' }]}>{ride.status.replace(/_/g, ' ')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted }}>AUTHORITATIVE FARE</Text>
              <Text style={styles.fareAmount}>₹{ride.fare.toFixed(2)}</Text>
            </View>
          </View>

          <View style={{ marginTop: 12, gap: 10 }}>
            <View>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>🟢 PICKUP LOCATION</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{ride.pickupAddress}</Text>
            </View>
            <View>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>🔴 DROPOFF DESTINATION</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{ride.dropoffAddress}</Text>
            </View>
          </View>
        </View>

        {/* Passenger Information */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeader, { color: '#00b562' }]}>👤 Passenger Details</Text>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Passenger Name:</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{ride.customer?.name || 'RideNow Passenger'}</Text>
          {ride.customer?.phone && (
            <View>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Contact Phone:</Text>
              <Text style={{ color: '#00b562', fontWeight: 'bold', fontSize: 15, marginTop: 2 }}>
                📞 {ride.customer.phone}
              </Text>
            </View>
          )}
        </View>

        {/* Rate Customer if completed */}
        {ride.status === 'RIDE_COMPLETED' && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionHeader, { color: '#00b562' }]}>⭐ Rate Passenger</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRatingScore(star)}>
                  <Text style={{ fontSize: 32, color: ratingScore >= star ? '#f59e0b' : '#64748b' }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="Feedback about rider..."
              placeholderTextColor={theme.textMuted}
            />
            <TouchableOpacity
              style={[styles.submitRatingBtn, { backgroundColor: '#00b562' }]}
              onPress={handleRatingSubmit}
              disabled={submittingRating}
            >
              {submittingRating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitRatingBtnText}>Submit Passenger Rating</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 4-Digit Passenger Start OTP Modal */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.otpModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0, 181, 98, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 26 }}>🔒</Text>
              </View>
              <Text style={[styles.otpModalTitle, { color: theme.text }]}>Enter Passenger Start OTP</Text>
              <Text style={[styles.otpModalSubtitle, { color: theme.textMuted }]}>
                Ask passenger for the 4-digit security code shown on their booking screen.
              </Text>
            </View>

            {otpError && (
              <View style={styles.otpErrorBox}>
                <Text style={styles.otpErrorText}>⚠️ {otpError}</Text>
              </View>
            )}

            <View style={{ marginVertical: 14 }}>
              <TextInput
                style={[styles.otpInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: otpError ? '#ef4444' : '#00b562' }]}
                placeholder="• • • •"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                value={otpInput}
                onChangeText={(val) => {
                  setOtpInput(val);
                  if (otpError) setOtpError(null);
                }}
                autoFocus={true}
              />
              <Text style={{ textAlign: 'center', fontSize: 11, color: theme.textMuted, marginTop: 6 }}>
                4-digit code (e.g. 1234)
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.otpCancelBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                onPress={() => setShowOtpModal(false)}
                disabled={otpSubmitting}
              >
                <Text style={[styles.otpCancelBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.otpVerifyBtn, { opacity: otpSubmitting ? 0.7 : 1 }]}
                onPress={handleVerifyOtpAndStart}
                disabled={otpSubmitting}
              >
                {otpSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.otpVerifyBtnText}>Verify & Start Trip 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    marginTop: Platform.OS === 'ios' ? 44 : 8,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backBtn: {
    padding: 4,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 10,
  },
  statusBadge: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  fareAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#00b562',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  mainActionBtn: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  mainActionBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  submitRatingBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitRatingBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // OTP Verification Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  otpModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  otpModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  otpModalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  otpErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  otpCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  otpVerifyBtn: {
    flex: 2,
    backgroundColor: '#00b562',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00b562',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  otpVerifyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
