import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export function PendingApproval() {
  const { logout, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (err: any) {
      Alert.alert('Sync Failed', 'Could not refresh account status.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.badge}>PENDING REVIEW</Text>
        <Text style={styles.title}>Account Under Review</Text>
        <Text style={styles.description}>
          Our operations team is currently validating your documents (License, Vehicle details, and registration plates).
        </Text>
        <Text style={styles.note}>
          This process typically takes 24-48 hours. You will receive an alert once your Captain profile is activated.
        </Text>

        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.refreshBtnText}>Check Approval Status</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    padding: 24
  },
  content: {
    backgroundColor: '#222',
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    color: '#ffc107',
    fontSize: 11,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 20,
    letterSpacing: 1
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15
  },
  note: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 30
  },
  refreshBtn: {
    backgroundColor: '#ffc107',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15
  },
  logoutBtn: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center'
  },
  logoutBtnText: {
    color: '#ff4444',
    fontWeight: 'bold',
    fontSize: 14
  }
});
export default PendingApproval;
