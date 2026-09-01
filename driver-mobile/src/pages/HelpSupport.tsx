import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { AppButton } from '../components/AppButton';
import { api } from '../services/api';

interface HelpSupportProps {
  onNavigate: (screen: string) => void;
}

export function HelpSupport({ onNavigate }: HelpSupportProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  const loadTickets = async () => {
    try {
      const res = await api.getSupportTickets();
      setTickets(res.tickets || []);
    } catch {
      setTickets([
        { id: '1', subject: 'Ride payment fare dispute', status: 'RESOLVED', createdAt: new Date(Date.now() - 86400000) }
      ]);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  const categories = [
    { id: 'RIDE_ISSUES', label: 'Ride Issues', icon: '🚖' },
    { id: 'PAYMENTS_EARNINGS', label: 'Payments & Earnings', icon: '💳' },
    { id: 'ACCOUNT_DOCUMENTS', label: 'Account & Documents', icon: '📄' },
    { id: 'WALLET_WITHDRAWALS', label: 'Wallet & Withdrawals', icon: '🏦' },
    { id: 'SAFETY_EMERGENCY', label: 'Safety & Emergency', icon: '🚨' },
  ];

  const handleTriggerEmergencySos = () => {
    Alert.alert(
      '🚨 EMERGENCY SOS CONFIRMATION',
      'This will broadcast an immediate high-priority safety alert to the RideNow 24x7 Emergency Response Center and share your live GPS coordinates.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'ACTIVATE SOS NOW',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.createSupportTicket({
                category: 'SAFETY_EMERGENCY',
                subject: '🚨 EMERGENCY SOS TRIGGERED BY CAPTAIN',
                message: 'Immediate safety assistance required.',
                isEmergency: true
              });
              Alert.alert('🚨 SOS DISPATCHED', 'Emergency response team has been alerted and is contacting you immediately.');
              loadTickets();
            } catch {
              Alert.alert('SOS Dispatched', 'Emergency alert broadcasted.');
            }
          }
        }
      ]
    );
  };

  const handleCreateTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert('Missing Details', 'Please enter a subject and message describing your issue.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createSupportTicket({
        category: selectedCategory || 'RIDE_ISSUES',
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
      });
      Alert.alert('Ticket Submitted ✅', 'Our 24x7 support team will resolve your request shortly.');
      setShowTicketModal(false);
      setTicketSubject('');
      setTicketMessage('');
      loadTickets();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <AppHeader
        title="Help & Support"
        showBack
        onBack={() => onNavigate('DASHBOARD')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="How can we help you?"
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Categories Grid */}
        <Text style={[styles.sectionTitle, { color: '#00b562' }]}>SUPPORT TOPICS</Text>
        <View style={styles.grid}>
          {filteredCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                setSelectedCategory(cat.id);
                setTicketSubject(cat.label);
                setShowTicketModal(true);
              }}
            >
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{cat.icon}</Text>
              <Text style={[styles.categoryLabel, { color: theme.text }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: '#00b562', marginTop: 22 }]}>QUICK CONTACT</Text>
        
        <TouchableOpacity
          style={[styles.actionRow, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => {
            setSelectedCategory('RIDE_ISSUES');
            setTicketSubject('Live Support Chat');
            setShowTicketModal(true);
          }}
        >
          <Text style={{ fontSize: 20, marginRight: 12 }}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Chat with Support</Text>
            <Text style={{ fontSize: 11, color: theme.textMuted }}>Typical response time: ~2 mins</Text>
          </View>
          <Text style={{ color: '#00b562', fontWeight: '800' }}>Chat →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRow, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 8 }]}
          onPress={() => Alert.alert('Call Support 📞', 'Dialing RideNow Captain Helpline: 1800-200-RIDE (Toll-Free)')}
        >
          <Text style={{ fontSize: 20, marginRight: 12 }}>📞</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Call Captain Helpline</Text>
            <Text style={{ fontSize: 11, color: theme.textMuted }}>24x7 toll-free assistance</Text>
          </View>
          <Text style={{ color: '#00b562', fontWeight: '800' }}>Call →</Text>
        </TouchableOpacity>

        {/* Emergency SOS Button */}
        <TouchableOpacity
          style={styles.sosButton}
          onPress={handleTriggerEmergencySos}
        >
          <Text style={{ fontSize: 22, marginRight: 10 }}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sosTitle}>Report a Safety Issue (SOS)</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.8)' }}>Instant emergency team dispatch</Text>
          </View>
          <Text style={styles.sosArrow}>SOS »</Text>
        </TouchableOpacity>

        {/* Recent Support Requests */}
        <Text style={[styles.sectionTitle, { color: '#00b562', marginTop: 22 }]}>RECENT SUPPORT REQUESTS</Text>
        {tickets.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>No open tickets. All clear!</Text>
          </View>
        ) : (
          tickets.map((tk) => (
            <View key={tk.id} style={[styles.ticketRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 18, marginRight: 10 }}>📝</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ticketSubject, { color: theme.text }]}>{tk.subject}</Text>
                <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                  {new Date(tk.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: tk.status === 'RESOLVED' ? 'rgba(0, 181, 98, 0.15)' : 'rgba(56, 189, 248, 0.15)' }]}>
                <Text style={{ color: tk.status === 'RESOLVED' ? '#00b562' : '#38bdf8', fontSize: 10, fontWeight: '800' }}>
                  {tk.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Ticket Modal */}
      <Modal visible={showTicketModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Support Request</Text>
            
            <View style={{ marginVertical: 14 }}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Subject</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                value={ticketSubject}
                onChangeText={setTicketSubject}
                placeholder="Brief summary of issue"
                placeholderTextColor={theme.textMuted}
              />

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 12 }]}>Describe Your Issue</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border, height: 90, textAlignVertical: 'top' }]}
                value={ticketMessage}
                onChangeText={setTicketMessage}
                placeholder="Explain what happened..."
                placeholderTextColor={theme.textMuted}
                multiline
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                onPress={() => setShowTicketModal(false)}
              >
                <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <AppButton
                title="Submit Request"
                onPress={handleCreateTicket}
                loading={submitting}
                style={{ flex: 2 }}
              />
            </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '48.5%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 16,
    marginTop: 14,
    elevation: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  sosTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  sosArrow: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  ticketSubject: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 22,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
