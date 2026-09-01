import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { AppButton } from '../components/AppButton';
import { api } from '../services/api';

interface ReferAndEarnProps {
  onNavigate: (screen: string) => void;
}

export function ReferAndEarn({ onNavigate }: ReferAndEarnProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fallbackCode = `CAPTAIN-${(user?.driver?.name || user?.name || user?.email?.split('@')[0] || 'RN').toUpperCase().slice(0, 5)}26`;

  const load = async () => {
    try {
      const res = await api.getReferrals();
      setData(res);
    } catch {
      setData({
        referralCode: fallbackCode,
        invitedCount: 0,
        joinedCount: 0,
        qualifiedCount: 0,
        totalEarned: 0,
        rewardPerReferral: 1500
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const refCode = data?.referralCode || fallbackCode;

  const handleCopy = () => {
    setCopied(true);
    Alert.alert('Referral Code Copied 📋', `Share code ${refCode} with fellow captains to earn ₹1,500 bonus!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    Alert.alert('Share Link 🔗', `https://ridenow.app/join?ref=${refCode}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <AppHeader
        title="Refer & Earn"
        showBack
        onBack={() => onNavigate('DASHBOARD')}
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00b562" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Hero Card */}
          <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: '#00b562' }]}>
            <View style={styles.badgePill}>
              <Text style={{ color: '#00b562', fontSize: 11, fontWeight: '800' }}>CAPTAIN REWARDS PROGRAM</Text>
            </View>
            <Text style={[styles.heroTitle, { color: theme.text }]}>Invite a Captain.</Text>
            <Text style={[styles.heroHighlight, { color: '#00b562' }]}>Earn up to ₹1,500.</Text>
            <Text style={[styles.heroSubtitle, { color: theme.textMuted }]}>
              Know someone with a Bike, Auto, or Cab? Invite them to RideNow and get rewarded after their first 10 trips.
            </Text>

            {/* Code Box */}
            <View style={[styles.codeBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <Text style={[styles.codeText, { color: theme.text }]}>{refCode}</Text>
              <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
                <Text style={{ color: '#00b562', fontWeight: '800', fontSize: 13 }}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </Text>
              </TouchableOpacity>
            </View>

            <AppButton
              title="Share Referral Link"
              icon="🔗"
              onPress={handleShare}
              style={{ marginTop: 14 }}
            />
          </View>

          {/* Referral Statistics Grid */}
          <Text style={[styles.sectionTitle, { color: '#00b562', marginTop: 20 }]}>YOUR REFERRAL STATS</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>{data?.invitedCount ?? 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Invited</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>{data?.joinedCount ?? 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Joined</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.statValue, { color: '#00b562' }]}>₹{data?.totalEarned ?? 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Earned</Text>
            </View>
          </View>

          {/* Empty State for New Driver */}
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 16 }]}>
            <Text style={{ fontSize: 32, marginBottom: 6 }}>🎁</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Referrals Yet</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              Share your referral code ${refCode} with drivers looking to earn on RideNow.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  badgePill: {
    backgroundColor: 'rgba(0, 181, 98, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroHighlight: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  copyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
