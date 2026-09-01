import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AppButton } from '../components/AppButton';

interface PendingApprovalProps {
  onNavigate: (screen: string) => void;
}

export function PendingApproval({ onNavigate }: PendingApprovalProps) {
  const { logout, refreshUser } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      Alert.alert('Status Checked', 'Account profile synced. If admin has approved, your dashboard will open automatically.');
    } catch {
      Alert.alert('Sync Failed', 'Could not refresh account status. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={[styles.themeToggle, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={toggleTheme}>
          <Text style={{ fontSize: 13, color: theme.textSub }}>{isDark ? '☀️ Light' : '🌙 Dark'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.contentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 44 }}>🛡️</Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {t.accountUnderReview || 'Your account is under review'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {t.underReviewSub || "We're reviewing your Captain profile and vehicle details. You'll be notified when your account is approved."}
        </Text>

        {/* Verification Checklist */}
        <View style={[styles.checklistCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
          <View style={styles.checkRow}>
            <Text style={[styles.checkMark, { color: '#00b562' }]}>✓</Text>
            <Text style={[styles.checkText, { color: theme.text }]}>{t.profileCompleted || 'Profile details submitted'}</Text>
          </View>
          <View style={styles.checkRow}>
            <Text style={[styles.checkMark, { color: '#00b562' }]}>✓</Text>
            <Text style={[styles.checkText, { color: theme.text }]}>Vehicle details registered</Text>
          </View>
          <View style={styles.checkRow}>
            <Text style={[styles.checkMark, { color: '#00b562' }]}>✓</Text>
            <Text style={[styles.checkText, { color: theme.text }]}>{t.payoutAdded || 'Payout details added'}</Text>
          </View>
          <View style={styles.checkRow}>
            <Text style={[styles.checkMark, { color: '#38bdf8' }]}>◌</Text>
            <Text style={[styles.checkText, { color: '#38bdf8', fontWeight: '800' }]}>
              {t.verificationInProgress || 'Verification in progress'}
            </Text>
          </View>
        </View>

        {/* Safety Training Prompt Banner */}
        <View style={[styles.trainingBanner, { backgroundColor: 'rgba(0, 181, 98, 0.12)', borderColor: '#00b562' }]}>
          <Text style={[styles.trainingPrompt, { color: theme.text }]}>
            🎓 {t.startTrainingPrompt || 'While you wait, complete your Captain safety training.'}
          </Text>
          <AppButton
            title={`${t.startTrainingBtn || 'Start Training'} →`}
            onPress={() => onNavigate('SAFETY_TRAINING')}
            style={{ marginTop: 12 }}
          />
        </View>

        <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]} onPress={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <ActivityIndicator color="#00b562" size="small" />
          ) : (
            <Text style={[styles.refreshBtnText, { color: '#00b562' }]}>
              {t.checkStatusBtn || '🔄 Check Approval Status'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
    paddingTop: 48,
    paddingBottom: 40,
  },
  topBar: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  themeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  contentCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0, 181, 98, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  checklistCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '900',
  },
  checkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trainingBanner: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  trainingPrompt: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  refreshBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  logoutBtn: {
    paddingVertical: 10,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
});
