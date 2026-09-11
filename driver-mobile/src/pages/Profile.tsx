import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { AppHeader } from '../components/AppHeader';

interface ProfileProps {
  onNavigate: (screen: string, params?: any) => void;
}

export function Profile({ onNavigate }: ProfileProps) {
  const { user, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [profileData, ridesData, earningsData] = await Promise.all([
          api.getProfile().catch(() => null),
          api.getRides().catch(() => []),
          api.getEarnings().catch(() => null)
        ]);

        const completedFromRides = Array.isArray(ridesData)
          ? ridesData.filter((r: any) => r.status === 'RIDE_COMPLETED').length
          : 0;

        const completedFromEarnings = earningsData?.completedTrips || 0;
        const completedFromProfile = profileData?.completedTrips || 0;

        const maxCompletedTrips = Math.max(
          completedFromProfile,
          completedFromRides,
          completedFromEarnings
        );

        if (profileData) {
          setProfile({
            ...profileData,
            completedTrips: maxCompletedTrips
          });
        } else {
          setProfile({
            name: user?.driver?.name || user?.name || (user?.email ? user.email.split('@')[0] : 'Captain'),
            phone: user?.driver?.phone || user?.phone || '—',
            email: user?.email || '—',
            avgRating: user?.driver?.avgRating || null,
            completedTrips: maxCompletedTrips,
            isApproved: user?.driver?.isApproved ?? false,
            vehicle: user?.driver?.vehicle || {
              make: 'Registered',
              model: 'Vehicle',
              plateNumber: '—',
              type: 'BIKE'
            }
          });
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const languageLabel = language === 'en' ? 'English' : language === 'hi' ? 'हिंदी (Hindi)' : 'తెలుగు (Telugu)';
  const captainName = profile?.name || user?.driver?.name || user?.email?.split('@')[0] || 'Captain';
  const vehicle = profile?.vehicle || user?.driver?.vehicle;
  const rawType = String(vehicle?.type || 'BIKE').toUpperCase();
  const vehicleTypeName = rawType.includes('AUTO') ? 'Auto' : rawType.includes('CAB') ? 'Cab' : 'Bike';
  const isVerified = profile?.isApproved ?? user?.driver?.isApproved ?? false;
  const completedTrips = profile?.completedTrips ?? 0;
  const ratingDisplay = profile?.avgRating ? `${profile.avgRating} ★` : profile?.averageRating ? `${profile.averageRating} ★` : 'New';

  const menuSections = [
    {
      id: 'personal',
      title: 'Personal Information',
      icon: '👤',
      action: () => onNavigate('PERSONAL_INFO')
    },
    {
      id: 'vehicle',
      title: 'Vehicle Details',
      icon: '🚗',
      action: () => onNavigate('VEHICLE_DETAILS')
    },
    {
      id: 'payout',
      title: 'Bank & Payout Details',
      icon: '🏦',
      action: () => onNavigate('PAYOUT_DETAILS')
    },
    {
      id: 'language',
      title: `Language (${languageLabel})`,
      icon: '🌐',
      action: () => setShowLanguageModal(true)
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: '🔔',
      action: () => onNavigate('NOTIFICATIONS')
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: '🔒',
      action: () => Alert.alert('Privacy & Security', 'Your data, live GPS tracking, and payout credentials are encrypted.')
    }
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <AppHeader
        title="Settings"
        showBack
        onBack={() => onNavigate('DASHBOARD')}
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00b562" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Captain Profile Top Card */}
          <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardHeaderLabel, { color: theme.textMuted }]}>Captain Profile</Text>

            {/* Profile Avatar & Info Row */}
            <View style={styles.profileMainRow}>
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 32 }}>👨‍✈️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.captainNameText, { color: theme.text }]}>{captainName}</Text>
                <Text style={styles.captainRoleText}>RideNow Captain</Text>
              </View>
            </View>

            {/* 3-Column Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCol}>
                <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Captain Rating</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{ratingDisplay}</Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Completed Trips</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{completedTrips}</Text>
              </View>
              <View style={[styles.metricCol, { alignItems: 'flex-end' }]}>
                <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Account Status</Text>
                <Text style={[styles.metricValue, { color: isVerified ? '#00b562' : '#f59e0b', fontSize: 13 }]}>
                  {isVerified ? 'Verified ✅' : 'Under Review ⏳'}
                </Text>
              </View>
            </View>

            {/* Vehicle Information Box */}
            <View style={[styles.vehicleInfoBox, { backgroundColor: theme.cardSecondary }]}>
              <Text style={[styles.vehicleInfoTitle, { color: theme.textMuted }]}>Vehicle Information</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={[styles.vehicleNameText, { color: theme.text }]}>
                  {vehicle?.make || 'Vehicle'} {vehicle?.model || ''}
                </Text>
                <View style={styles.vehicleCategoryBadge}>
                  <Text style={{ color: '#00b562', fontSize: 12, fontWeight: '800' }}>
                    {vehicleTypeName} {isVerified ? '✓' : ''}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Menu Sections List */}
          <View style={styles.menuList}>
            {menuSections.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={item.action}
              >
                <View style={styles.menuIconContainer}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                </View>
                <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 16, marginLeft: 'auto' }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}> Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Language Selector Modal */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Application Language</Text>
            <Text style={[styles.modalSub, { color: theme.textMuted }]}>Choose your preferred language</Text>

            <View style={{ gap: 10, marginVertical: 18 }}>
              {[
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिंदी (Hindi)' },
                { code: 'te', label: 'తెలుగు (Telugu)' },
              ].map((l) => (
                <TouchableOpacity
                  key={l.code}
                  style={[
                    styles.langOptionBtn,
                    {
                      backgroundColor: language === l.code ? 'rgba(0, 181, 98, 0.15)' : theme.cardSecondary,
                      borderColor: language === l.code ? '#00b562' : theme.border,
                    }
                  ]}
                  onPress={async () => {
                    await setLanguage(l.code as any);
                    setShowLanguageModal(false);
                  }}
                >
                  <Text style={[styles.langOptionText, { color: language === l.code ? '#00b562' : theme.text, fontWeight: language === l.code ? '900' : '600' }]}>
                    {l.label}
                  </Text>
                  {language === l.code && <Text style={{ color: '#00b562', fontWeight: '900' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={styles.modalCloseBtn}>
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
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
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 16,
    elevation: 3,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 181, 98, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#00b562',
  },
  captainNameText: {
    fontSize: 18,
    fontWeight: '900',
  },
  captainRoleText: {
    fontSize: 13,
    color: '#00b562',
    fontWeight: '700',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  vehicleInfoBox: {
    padding: 12,
    borderRadius: 12,
  },
  vehicleInfoTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  vehicleNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  vehicleCategoryBadge: {
    backgroundColor: 'rgba(0, 181, 98, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  menuList: {
    gap: 10,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  menuIconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 10,
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  langOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  langOptionText: {
    fontSize: 15,
  },
  modalCloseBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginTop: 6,
  },
});
