import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
} from 'react-native';

function App(): React.JSX.Element {
  const [isOnline, setIsOnline] = useState(false);
  const [earnings, setEarnings] = useState(120.50);

  const toggleStatus = () => {
    setIsOnline(!isOnline);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffc107" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>RideNow Driver</Text>
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: isOnline ? '#28a745' : '#dc3545' }]}
          onPress={toggleStatus}
        >
          <Text style={styles.statusBadgeText}>
            {isOnline ? 'Go Offline' : 'Go Online'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Earnings Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TODAY'S EARNINGS</Text>
          <Text style={styles.cardValue}>${earnings.toFixed(2)}</Text>
        </View>

        {/* Status Indicator */}
        <View style={[styles.infoBox, { borderColor: isOnline ? '#28a745' : '#6c757d' }]}>
          <Text style={styles.infoTitle}>
            {isOnline ? 'Waiting for passengers...' : 'You are currently offline'}
          </Text>
          <Text style={styles.infoSub}>
            {isOnline
              ? 'Keep the app open to receive new ride requests.'
              : 'Tap "Go Online" in the header to start accepting rides.'}
          </Text>
        </View>

        {/* Dummy Ride Request Card */}
        {isOnline && (
          <View style={styles.rideRequestCard}>
            <Text style={styles.rideTitle}>New Ride Request!</Text>
            <Text style={styles.rideText}>Pickup: Central Mall</Text>
            <Text style={styles.rideText}>Dropoff: City Airport</Text>
            <Text style={styles.rideText}>Est. Fare: $24.50</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.acceptBtn}>
                <Text style={styles.btnText}>ACCEPT</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffc107',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  content: {
    padding: 20,
    flex: 1,
    justifyContent: 'flex-start',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 20,
    alignItems: 'center',
  },
  cardLabel: {
    color: '#777',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  infoBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  infoSub: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
  },
  rideRequestCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffc107',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  rideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 8,
  },
  rideText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 3,
  },
  btnRow: {
    marginTop: 15,
    flexDirection: 'row',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#ffc107',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  btnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default App;
