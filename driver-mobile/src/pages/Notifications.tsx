import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { api } from '../services/api';

interface NotificationsScreenProps {
  onNavigate: (screen: string, params?: any) => void;
}

const TYPE_ICONS: Record<string, string> = {
  SYSTEM: '⚙️', OFFER: '🎁', BROADCAST: '📢', SAFETY: '🚨',
  RIDE_UPDATE: '🚖', APPROVAL: '✅',
};

export function Notifications({ onNavigate }: NotificationsScreenProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await api.getNotifications();
      setData(result);
    } catch (e: any) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleMarkRead = async (id: string) => {
    try { await api.markNotificationRead(id); load(); }
    catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try { await api.markNotificationRead('all'); load(); }
    catch { /* silent */ }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('DASHBOARD')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🔔 Notifications</Text>
        {data?.unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#ffc107" style={{ marginTop: 40 }} />}

      {!loading && (
        <ScrollView
          style={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#ffc107" />}>
          {(!data?.notifications || data.notifications.length === 0) ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>All clear!</Text>
              <Text style={styles.emptyText}>No notifications yet.</Text>
            </View>
          ) : (
            data.notifications.map((n: any) => (
              <TouchableOpacity key={n.id} onPress={() => !n.isRead && handleMarkRead(n.id)} activeOpacity={n.isRead ? 1 : 0.7}>
                <View style={[styles.notifCard, !n.isRead && styles.unreadCard]}>
                  <View style={styles.notifRow}>
                    <Text style={styles.notifIcon}>{TYPE_ICONS[n.type] || '🔔'}</Text>
                    <View style={styles.notifContent}>
                      <View style={styles.notifTitleRow}>
                        <Text style={[styles.notifTitle, !n.isRead && styles.unreadTitle]} numberOfLines={1}>{n.title}</Text>
                        {!n.isRead && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
                      <Text style={styles.notifTime}>{new Date(n.createdAt).toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  backBtn: { marginRight: 12 },
  backText: { color: '#ffc107', fontSize: 15, fontWeight: '600' },
  title: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '800' },
  markAllBtn: { padding: 6, paddingHorizontal: 10, backgroundColor: '#222', borderRadius: 8 },
  markAllText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  errorBox: { margin: 16, backgroundColor: '#2d1515', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  errorText: { color: '#f87171', fontSize: 13 },
  list: { flex: 1 },
  emptyContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#64748b', fontSize: 14 },
  notifCard: { margin: 8, marginBottom: 4, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a2a' },
  unreadCard: { backgroundColor: '#1a2a1a', borderColor: '#2d5a2d' },
  notifRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  notifIcon: { fontSize: 22, marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  notifTitle: { color: '#ccc', fontSize: 14, fontWeight: '600', flex: 1 },
  unreadTitle: { color: '#fff', fontWeight: '800' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffc107' },
  notifBody: { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  notifTime: { color: '#555', fontSize: 11 },
});

export default Notifications;
