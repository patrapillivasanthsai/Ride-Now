import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AppButton } from '../components/AppButton';
import { api } from '../services/api';

interface SafetyTrainingProps {
  onBack: () => void;
  onCompleted?: () => void;
}

export function SafetyTraining({ onBack, onCompleted }: SafetyTrainingProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeVideo, setActiveVideo] = useState(false);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    try {
      const res = await api.getSafetyTraining();
      setData(res);
    } catch {
      // Fallback
      setData({
        completedCount: 3,
        totalCount: 4,
        isFullyCompleted: false,
        modules: [
          { id: 1, title: 'Safe Driving Practices', duration: '4 mins', completed: true },
          { id: 2, title: 'Customer Etiquette & Guidelines', duration: '3 mins', completed: true },
          { id: 3, title: 'Ride Cancellation & Acceptance Policy', duration: '3 mins', completed: true },
          { id: 4, title: 'Emergency, Safety & SOS Features', duration: '5 mins', completed: false }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCompleteAll = async () => {
    setSubmitting(true);
    try {
      await api.completeSafetyTraining();
      Alert.alert('🎉 Training Certified!', 'You have successfully completed all Captain Safety Training modules! Your profile is verified.');
      if (onCompleted) onCompleted();
      else onBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not record training completion.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color="#00b562" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: '#00b562' }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Captain Safety Training</Text>
        <View style={{ width: 50 }} />
      </View>

      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Complete the training to prepare for your first RideNow trip.
      </Text>

      {/* Video Banner Card */}
      <View style={[styles.videoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.videoPlayer}>
          <Text style={{ fontSize: 50 }}>{activeVideo ? '▶️' : '🎬'}</Text>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => setActiveVideo(!activeVideo)}
          >
            <Text style={{ fontSize: 24, color: '#ffffff' }}>{activeVideo ? '⏸️' : '▶️'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.videoInfo}>
          <Text style={[styles.videoTitle, { color: theme.text }]}>Introduction to Captain Safety</Text>
          <Text style={{ color: '#00b562', fontSize: 12, fontWeight: '700', marginTop: 2 }}>
            Duration: 15 mins total
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 13 }}>Course Modules</Text>
          <Text style={{ color: '#00b562', fontWeight: '900', fontSize: 13 }}>
            {data?.completedCount || 3} of {data?.totalCount || 4} modules completed
          </Text>
        </View>
        <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ width: `${((data?.completedCount || 3) / (data?.totalCount || 4)) * 100}%`, height: '100%', backgroundColor: '#00b562' }} />
        </View>
      </View>

      {/* Modules List */}
      <View style={styles.modulesList}>
        {data?.modules?.map((m: any, idx: number) => (
          <View
            key={m.id}
            style={[
              styles.moduleRow,
              {
                backgroundColor: theme.card,
                borderColor: m.completed ? '#00b562' : theme.border,
              }
            ]}
          >
            <View style={[styles.moduleNumber, { backgroundColor: m.completed ? 'rgba(0, 181, 98, 0.15)' : theme.cardSecondary }]}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: m.completed ? '#00b562' : theme.textMuted }}>
                0{idx + 1}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.moduleTitle, { color: theme.text }]}>{m.title}</Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{m.duration}</Text>
            </View>

            <View style={[styles.statusIcon, { backgroundColor: m.completed ? '#00b562' : 'transparent', borderColor: m.completed ? '#00b562' : theme.border }]}>
              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '900' }}>
                {m.completed ? '✓' : '○'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <AppButton
        title="Complete Training"
        onPress={handleCompleteAll}
        loading={submitting}
        style={{ marginTop: 20 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    padding: 4,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  videoCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  videoPlayer: {
    height: 160,
    backgroundColor: '#0a1020',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  playButton: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(0, 181, 98, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    padding: 14,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  modulesList: {
    gap: 10,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  moduleNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
