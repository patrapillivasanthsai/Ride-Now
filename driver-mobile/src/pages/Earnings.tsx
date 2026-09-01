import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';

interface EarningsScreenProps {
  onNavigate: (screen: string, params?: any) => void;
}

export function Earnings({ onNavigate }: EarningsScreenProps) {
  const { theme } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY');

  const loadEarnings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await api.getEarnings();
      setData(result);
    } catch {
      setData({
        dailyEarnings: 0.00,
        dailyTrips: 0,
        dailyAvgPerTrip: 0.00,
        weeklyEarnings: 0.00,
        weeklyTrips: 0,
        weeklyAvgPerTrip: 0.00,
        monthlyEarnings: 0.00,
        monthlyTrips: 0,
        monthlyAvgPerTrip: 0.00,
        totalEarnings: 0.00,
        totalTrips: 0,
        averagePerTrip: 0.00,
        todayOnlineTime: '0h 00m',
        weeklyOnlineTime: '0h 00m',
        monthlyOnlineTime: '0h 00m',
        history: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadEarnings(); }, []);

  const getDisplayedEarnings = () => {
    if (timeFilter === 'WEEK') return data?.weeklyEarnings || 0.00;
    if (timeFilter === 'MONTH') return data?.monthlyEarnings || 0.00;
    return data?.dailyEarnings || 0.00;
  };

  const getTripsCount = () => {
    if (timeFilter === 'WEEK') return data?.weeklyTrips ?? 0;
    if (timeFilter === 'MONTH') return data?.monthlyTrips ?? 0;
    return data?.dailyTrips ?? 0;
  };

  const getAvgPerTrip = () => {
    if (timeFilter === 'WEEK') {
      return data?.weeklyAvgPerTrip ?? (data?.weeklyTrips > 0 ? (data.weeklyEarnings / data.weeklyTrips) : 0);
    }
    if (timeFilter === 'MONTH') {
      return data?.monthlyAvgPerTrip ?? (data?.monthlyTrips > 0 ? (data.monthlyEarnings / data.monthlyTrips) : 0);
    }
    return data?.dailyAvgPerTrip ?? (data?.dailyTrips > 0 ? (data.dailyEarnings / data.dailyTrips) : 0);
  };

  const getOnlineTime = () => {
    if (timeFilter === 'WEEK') return data?.weeklyOnlineTime || '0h 00m';
    if (timeFilter === 'MONTH') return data?.monthlyOnlineTime || '0h 00m';
    return data?.todayOnlineTime || '0h 00m';
  };

  const historyList = data?.history || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <AppHeader
        title="Earnings & Incentives"
        showBack
        onBack={() => onNavigate('DASHBOARD')}
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00b562" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadEarnings(true)} tintColor="#00b562" />}
        >
          {/* Time Filter Pills */}
          <View style={[styles.filterContainer, { backgroundColor: theme.cardSecondary }]}>
            {(['TODAY', 'WEEK', 'MONTH'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterBtn,
                  timeFilter === filter && { backgroundColor: theme.card, borderColor: '#00b562', borderWidth: 1 }
                ]}
                onPress={() => setTimeFilter(filter)}
              >
                <Text style={[styles.filterText, { color: timeFilter === filter ? '#00b562' : theme.textMuted, fontWeight: timeFilter === filter ? '800' : '600' }]}>
                  {filter === 'TODAY' ? 'Today' : filter === 'WEEK' ? 'This Week' : 'This Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hero Earnings Card */}
          <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: '#00b562' }]}>
            <Text style={[styles.heroLabel, { color: theme.textMuted }]}>
              {timeFilter === 'TODAY' ? "TODAY'S NET EARNINGS" : timeFilter === 'WEEK' ? "THIS WEEK'S EARNINGS" : "THIS MONTH'S EARNINGS"}
            </Text>
            <Text style={[styles.heroAmount, { color: '#00b562' }]}>₹{getDisplayedEarnings().toFixed(2)}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>TRIPS</Text>
                <Text style={[styles.statVal, { color: theme.text }]}>{getTripsCount()}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>ONLINE</Text>
                <Text style={[styles.statVal, { color: theme.text }]}>{getOnlineTime()}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>AVG / TRIP</Text>
                <Text style={[styles.statVal, { color: theme.text }]}>₹{getAvgPerTrip().toFixed(0)}</Text>
              </View>
            </View>
          </View>

          {/* Incentives & Target Bonus */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 16 }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Performance Targets & Bonuses</Text>
            <Text style={[styles.cardSub, { color: theme.textMuted }]}>Complete trips to unlock milestone bonuses</Text>

            <View style={{ gap: 8, marginTop: 12 }}>
              <View style={[styles.incentiveRow, { backgroundColor: theme.cardSecondary }]}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>🎯</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.incentiveTitle, { color: theme.text }]}>Daily Target (10 Trips)</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Progress: {getTripsCount()} / 10</Text>
                </View>
                <Text style={{ color: '#00b562', fontWeight: '900', fontSize: 14 }}>+₹200</Text>
              </View>

              <View style={[styles.incentiveRow, { backgroundColor: theme.cardSecondary }]}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>⭐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.incentiveTitle, { color: theme.text }]}>Peak Hours Boost (6 PM - 10 PM)</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>1.2x Payout Boost</Text>
                </View>
                <Text style={{ color: '#00b562', fontWeight: '900', fontSize: 14 }}>Active</Text>
              </View>
            </View>
          </View>

          {/* Completed Trips Breakdown List */}
          <Text style={[styles.sectionTitle, { color: '#00b562', marginTop: 20 }]}>COMPLETED TRIPS HISTORY</Text>

          {historyList.length > 0 ? (
            <View style={{ gap: 10 }}>
              {historyList.map((ride: any) => (
                <View key={ride.id} style={[styles.tripCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>
                      {new Date(ride.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(ride.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#00b562' }}>
                      +₹{(ride.driverShare || ride.fare || 0).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={[styles.tripAddress, { color: theme.text }]} numberOfLines={1}>
                    🟢 {ride.pickupAddress || 'Pickup Point'}
                  </Text>
                  <Text style={[styles.tripAddress, { color: theme.text, marginTop: 2 }]} numberOfLines={1}>
                    🔴 {ride.dropoffAddress || 'Drop Location'}
                  </Text>
                  {ride.distance ? (
                    <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
                      📏 {(ride.distance).toFixed(1)} km · {ride.vehicleType || 'Ride'}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>⚡</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Completed Trips Yet</Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                Go online and accept ride requests. Your completed earnings will appear here live.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  filterContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 13,
  },
  heroCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  incentiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  incentiveTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  tripCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  tripAddress: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
