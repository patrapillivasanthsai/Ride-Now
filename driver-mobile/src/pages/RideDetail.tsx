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
  TextInput
} from 'react-native';
import { api } from '../services/api';

interface RideDetailProps {
  rideId: string;
  onNavigate: (screen: string) => void;
}

export function RideDetail({ rideId, onNavigate }: RideDetailProps) {
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const handleAccept = async () => {
    try {
      setTransitioning(true);
      await api.acceptRide(rideId);
      const data = await api.getRideDetail(rideId);
      setRide(data);
      Alert.alert('Success', 'You have accepted this trip request!');
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
      Alert.alert('Success', `Ride status updated to ${nextStatus}!`);
    } catch (error: any) {
      Alert.alert('Action Failed', error.message || 'Could not update ride status.');
    } finally {
      setTransitioning(false);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc107" />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#fff' }}>Trip not found.</Text>
      </View>
    );
  }

  const renderActionButtons = () => {
    let buttonLabel = '';
    let onPressAction: () => Promise<void> = async () => {};

    if (ride.status === 'REQUESTED' || ride.status === 'SEARCHING_DRIVER') {
      buttonLabel = 'Accept Ride Request';
      onPressAction = handleAccept;
    } else if (ride.status === 'DRIVER_ASSIGNED') {
      buttonLabel = 'Head to Pickup Point (Start Arriving)';
      onPressAction = () => handleStatusChange('DRIVER_ARRIVING');
    } else if (ride.status === 'DRIVER_ARRIVING') {
      buttonLabel = 'Arrived at Pickup Location';
      onPressAction = () => handleStatusChange('DRIVER_ARRIVED');
    } else if (ride.status === 'DRIVER_ARRIVED') {
      buttonLabel = 'Start Passenger Trip';
      onPressAction = () => handleStatusChange('RIDE_STARTED');
    } else if (ride.status === 'RIDE_STARTED') {
      buttonLabel = 'Complete Ride (Finish Trip)';
      onPressAction = () => handleStatusChange('RIDE_COMPLETED');
    }

    if (!buttonLabel) return null;

    return (
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Trip Actions</Text>
        <TouchableOpacity
          onPress={onPressAction}
          disabled={transitioning}
          style={{
            backgroundColor: '#ffc107',
            padding: 15,
            borderRadius: 4,
            alignItems: 'center',
            marginTop: 5
          }}
        >
          {transitioning ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>{buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('DASHBOARD')}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Trip Details</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Core Info */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Trip Summary</Text>
          <View style={styles.row}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.statusBadge}>{ride.status}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <View>
              <Text style={styles.infoLabel}>Total Fare:</Text>
              <Text style={styles.fareText}>₹{ride.fare.toFixed(2)}</Text>
            </View>
            <View>
              <Text style={styles.infoLabel}>Your Earnings (80%):</Text>
              <Text style={[styles.fareText, { color: '#28a745' }]}>₹{(ride.fare * 0.8).toFixed(2)}</Text>
            </View>
          </View>

          {ride.payments && ride.payments.length > 0 ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.infoLabel}>Payment Status:</Text>
              <Text style={{
                color: ride.payments[0].status === 'COMPLETED' ? '#28a745' : '#ffc107',
                fontWeight: 'bold',
                fontSize: 15
              }}>
                {ride.payments[0].status === 'COMPLETED' ? 'PAID / COMPLETED' : ride.payments[0].status}
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.infoLabel}>Payment Status:</Text>
              <Text style={{ color: '#aaa', fontStyle: 'italic' }}>No payment recorded</Text>
            </View>
          )}
          
          <Text style={styles.infoLabel}>Pickup Point:</Text>
          <Text style={styles.valueText}>{ride.pickupAddress}</Text>
          
          <Text style={styles.infoLabel}>Destination Point:</Text>
          <Text style={styles.valueText}>{ride.dropoffAddress}</Text>

          <Text style={styles.infoLabel}>Request Date:</Text>
          <Text style={styles.valueText}>{new Date(ride.createdAt).toLocaleString()}</Text>
        </View>

        {/* Action Button Card */}
        {renderActionButtons()}

        {/* Passenger Info */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Passenger Details</Text>
          <Text style={styles.infoLabel}>Email Address:</Text>
          <Text style={styles.valueText}>{ride.customer?.user.email}</Text>
          <Text style={styles.infoLabel}>Phone Number:</Text>
          <Text style={styles.valueText}>{ride.customer?.phone || 'N/A'}</Text>
        </View>

        {/* Ratings & Reviews */}
        {ride.status === 'RIDE_COMPLETED' && (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Ratings & Reviews</Text>
            {(() => {
              const myRating = ride.ratings?.find((r: any) => r.raterRole === 'DRIVER');
              if (myRating) {
                return (
                  <View>
                    <Text style={{ color: '#ffc107', fontSize: 18, fontWeight: 'bold', marginBottom: 5 }}>
                      {'★'.repeat(myRating.score)}{'☆'.repeat(5 - myRating.score)} ({myRating.score} / 5)
                    </Text>
                    {myRating.comment ? (
                      <Text style={{ color: '#bbb', fontStyle: 'italic', backgroundColor: '#333', padding: 10, borderRadius: 4 }}>
                        "{myRating.comment}"
                      </Text>
                    ) : null}
                  </View>
                );
              }

              return (
                <View>
                  <Text style={styles.infoLabel}>Rate customer behavior:</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => setRatingScore(star)}>
                        <Text style={{ fontSize: 32, color: ratingScore >= star ? '#ffc107' : '#555' }}>★</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.infoLabel}>Comments:</Text>
                  <TextInput
                    placeholder="Provide optional feedback..."
                    placeholderTextColor="#777"
                    value={ratingComment}
                    onChangeText={setRatingComment}
                    style={{
                      borderWidth: 1,
                      borderColor: '#444',
                      backgroundColor: '#333',
                      color: '#fff',
                      padding: 10,
                      borderRadius: 4,
                      minHeight: 60,
                      textAlignVertical: 'top',
                      marginBottom: 15,
                    }}
                    multiline
                  />
                  <TouchableOpacity
                    onPress={handleRatingSubmit}
                    disabled={submittingRating}
                    style={{
                      backgroundColor: '#ffc107',
                      padding: 12,
                      borderRadius: 4,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#000', fontWeight: 'bold' }}>
                      {submittingRating ? 'Submitting...' : 'Submit Rating'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        )}

        {/* Activity Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Activity Timeline</Text>
          {ride.statusHistory && ride.statusHistory.length > 0 ? (
            <View style={styles.timeline}>
              {ride.statusHistory.map((history: any) => (
                <View key={history.id} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <Text style={styles.timelineStatus}>{history.status}</Text>
                  <Text style={styles.timelineTime}>{new Date(history.createdAt).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#888', fontStyle: 'italic' }}>No logs available.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  topBarTitle: {
    color: '#ffc107',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backBtn: {
    padding: 5,
  },
  backBtnText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  sectionHeader: {
    color: '#ffc107',
    fontSize: 16,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
    marginTop: 10,
  },
  statusBadge: {
    backgroundColor: '#ffc107',
    color: '#000',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 'bold',
  },
  fareText: {
    color: '#28a745',
    fontSize: 20,
    fontWeight: 'bold',
  },
  valueText: {
    color: '#fff',
    fontSize: 15,
  },
  timeline: {
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#ffc107',
    marginLeft: 5,
    marginTop: 10,
  },
  timelineItem: {
    marginBottom: 15,
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -16,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffc107',
    borderWidth: 2,
    borderColor: '#222',
  },
  timelineStatus: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timelineTime: {
    color: '#888',
    fontSize: 12,
  },
});
