import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert
} from 'react-native';
import { api } from '../services/api';

interface EarningsProps {
  onNavigate: (screen: string) => void;
}

export function Earnings({ onNavigate }: EarningsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEarnings() {
      try {
        const earningsData = await api.getEarnings();
        setData(earningsData);
      } catch (error: any) {
        Alert.alert('Error', 'Failed to retrieve earnings summary.');
        onNavigate('DASHBOARD');
      } finally {
        setLoading(false);
      }
    }
    loadEarnings();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc107" />
        <Text style={styles.loadingText}>Retrieving financial summary...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('DASHBOARD')}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>My Payouts</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>TODAY</Text>
          <Text style={styles.cardValue}>₹{data?.dailyEarnings?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>THIS WEEK</Text>
          <Text style={styles.cardValue}>₹{data?.weeklyEarnings?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>ALL-TIME</Text>
          <Text style={[styles.cardValue, { color: '#28a745' }]}>
            ₹{data?.totalEarnings?.toFixed(2) || '0.00'}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 15, paddingVertical: 10 }}>
        <Text style={{ color: '#888', fontSize: 12 }}>
          Commission Split: {((data?.commissionRate || 0.80) * 100).toFixed(0)}% driver share | 20% system fee
        </Text>
      </View>

      {/* History List */}
      <FlatList
        data={data?.history || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.historyHeader}>Completed Trips Logs</Text>}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Text style={styles.emptyText}>No completed trips payouts recorded.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.payoutText}>+₹{item.driverShare.toFixed(2)}</Text>
                <Text style={styles.fareLabel}>Fare: ₹{item.fare.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.addressContainer}>
              <Text style={styles.addressText} numberOfLines={1}>
                🟢 {item.pickupAddress}
              </Text>
              <Text style={styles.addressText} numberOfLines={1}>
                🔴 {item.dropoffAddress}
              </Text>
            </View>
          </View>
        )}
      />
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  cardLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 15,
    paddingBottom: 40,
  },
  historyHeader: {
    color: '#ffc107',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  tripCard: {
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 15,
    marginBottom: 15,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tripDate: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: 'bold',
  },
  payoutText: {
    color: '#28a745',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fareLabel: {
    color: '#666',
    fontSize: 11,
  },
  addressContainer: {
    gap: 5,
  },
  addressText: {
    color: '#ddd',
    fontSize: 13,
  },
  emptyView: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
});
