import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface NotificationsScreenProps {
  onNavigate: (screen: string, params?: any) => void;
}

const TYPE_ICONS: Record<string, string> = {
  SYSTEM: '⚙️', OFFER: '🎁', BROADCAST: '📢', SAFETY: '🚨',
  RIDE_UPDATE: '🚖', APPROVAL: '✅',
};

function cleanNotificationText(text: string | null | undefined): string {
  if (!text) return '';
  // Strip any accidental leading '=', ',', ':', brackets, or enum prefixes like [SYSTEM] or SYSTEM:
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^[=,:\s\-_]+/, '');
  cleaned = cleaned.replace(/^\[[A-Za-z0-9_\-]+\]\s*/, '');
  cleaned = cleaned.replace(/^(SYSTEM|OFFER|BROADCAST|SAFETY|RIDE_UPDATE|APPROVAL)\s*[:=\-]\s*/i, '');
  cleaned = cleaned.replace(/^[=,:\s\-_]+/, '');
  return cleaned.trim();
}

export function Notifications({ onNavigate }: NotificationsScreenProps) {
  const { theme } = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => onNavigate('DASHBOARD')} style={styles.backBtn}>
          <Text style={[styles.backText, { color: '#00b562' }]}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>🔔 Alerts & Offers</Text>
        {data?.unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={[styles.markAllBtn, { backgroundColor: theme.cardSecondary }]}>
            <Text style={[styles.markAllText, { color: theme.textSub }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#00b562" style={{ marginTop: 40 }} />}

      {!loading && (
        <ScrollView
          style={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#00b562" />}
        >
          {(!data?.notifications || data.notifications.length === 0) ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>All clear, Captain!</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No notifications right now.</Text>
            </View>
          ) : (
            data.notifications.map((n: any) => {
              const displayTitle = cleanNotificationText(n.title);
              const displayBody = cleanNotificationText(n.body);

              return (
                <TouchableOpacity key={n.id} onPress={() => !n.isRead && handleMarkRead(n.id)} activeOpacity={n.isRead ? 1 : 0.7}>
                  <View style={[
                    styles.notifCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    !n.isRead && { backgroundColor: '#022c22', borderColor: '#00b562' }
                  ]}>
                    <View style={styles.notifRow}>
                      <Text style={styles.notifIcon}>{TYPE_ICONS[n.type] || '🔔'}</Text>
                      <View style={styles.notifContent}>
                        <View style={styles.notifTitleRow}>
                          <Text style={[styles.notifTitle, { color: theme.text }, !n.isRead && { fontWeight: 'bold', color: '#00b562' }]} numberOfLines={1}>
                            {displayTitle || 'System Alert'}
                          </Text>
                          {!n.isRead && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={[styles.notifBody, { color: theme.textSub }]} numberOfLines={2}>
                          {displayBody || 'Notification details'}
                        </Text>
                        <Text style={[styles.notifTime, { color: theme.textMuted }]}>
                          {new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    marginTop: Platform.OS === 'ios' ? 44 : 8,
  },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 15, fontWeight: '700' },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  markAllBtn: { padding: 6, paddingHorizontal: 10, borderRadius: 8 },
  markAllText: { fontSize: 11, fontWeight: '600' },
  errorBox: { margin: 16, backgroundColor: '#fef2f2', borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  errorText: { color: '#dc2626', fontSize: 13 },
  list: { flex: 1, padding: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: 14 },
  notifCard: { marginVertical: 5, borderRadius: 12, padding: 14, borderWidth: 1 },
  notifRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  notifIcon: { fontSize: 22, marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  notifTitle: { fontSize: 14, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00b562' },
  notifBody: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  notifTime: { fontSize: 11 },
});

export default Notifications;
