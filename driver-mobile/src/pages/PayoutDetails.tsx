import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { AppButton } from '../components/AppButton';
import { api } from '../services/api';

interface PayoutDetailsProps {
  onBack: () => void;
}

export function PayoutDetails({ onBack }: PayoutDetailsProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [payoutTab, setPayoutTab] = useState<'BANK' | 'UPI'>('BANK');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const profileData = await api.getProfile();
        const accounts = profileData.payoutAccounts || [];
        if (accounts.length > 0) {
          const bankAcc = accounts.find((a: any) => a.type === 'BANK_ACCOUNT');
          const upiAcc = accounts.find((a: any) => a.type === 'UPI');
          if (bankAcc) {
            setAccountHolderName(bankAcc.accountHolderName || '');
            setBankName(bankAcc.bankName || '');
            setAccountNumber(bankAcc.accountNumber || '');
            setIfscCode(bankAcc.ifscCode || '');
          }
          if (upiAcc) {
            setUpiId(upiAcc.upiId || '');
          }
        }
      } catch {
        // Keep empty for new user
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (payoutTab === 'BANK') {
      if (!accountHolderName.trim() || !bankName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
        Alert.alert('Validation Error', 'Please complete all bank account fields.');
        return;
      }
    } else {
      if (!upiId.trim() || !upiId.includes('@')) {
        Alert.alert('Validation Error', 'Please enter a valid UPI ID (e.g. captain@okaxis).');
        return;
      }
    }

    setSaving(true);
    try {
      if (payoutTab === 'BANK') {
        await api.savePayoutSetup({
          type: 'BANK_ACCOUNT',
          accountHolderName: accountHolderName.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase()
        });
      } else {
        await api.savePayoutSetup({
          type: 'UPI',
          upiId: upiId.trim()
        });
      }
      setIsEditing(false);
      Alert.alert('Payout Setup Saved ✅', 'Your payout information has been securely updated and synced with Admin.');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not update payout details.');
    } finally {
      setSaving(false);
    }
  };

  const hasBankDetails = !!(accountHolderName || bankName || accountNumber);
  const hasUpiDetails = !!upiId;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <AppHeader
        title="Bank & Payout Details"
        showBack
        onBack={onBack}
        rightAction={
          <TouchableOpacity
            onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
            style={[styles.editPill, { backgroundColor: theme.cardSecondary, borderColor: '#00b562' }]}
          >
            <Text style={{ color: '#00b562', fontSize: 12, fontWeight: '800' }}>
              {isEditing ? 'Save' : '✏️ Edit'}
            </Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00b562" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Method Switcher Tabs */}
          <View style={[styles.payoutTabs, { backgroundColor: theme.cardSecondary }]}>
            <TouchableOpacity
              onPress={() => setPayoutTab('BANK')}
              style={[styles.payoutTabBtn, payoutTab === 'BANK' && { backgroundColor: theme.card, borderColor: '#00b562', borderWidth: 1 }]}
            >
              <Text style={[styles.payoutTabText, { color: payoutTab === 'BANK' ? '#00b562' : theme.textMuted }]}>
                {payoutTab === 'BANK' ? '✓ ' : ''}Bank Account
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPayoutTab('UPI')}
              style={[styles.payoutTabBtn, payoutTab === 'UPI' && { backgroundColor: theme.card, borderColor: '#00b562', borderWidth: 1 }]}
            >
              <Text style={[styles.payoutTabText, { color: payoutTab === 'UPI' ? '#00b562' : theme.textMuted }]}>
                {payoutTab === 'UPI' ? '✓ ' : ''}UPI ID
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bank Account Form */}
          {payoutTab === 'BANK' ? (
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>ACCOUNT HOLDER NAME</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                  placeholder="Enter Account Holder Name"
                  placeholderTextColor={theme.textMuted}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: hasBankDetails ? theme.text : theme.textMuted }]}>
                  {accountHolderName || 'Not configured'}
                </Text>
              )}

              <View style={styles.divider} />

              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>BANK NAME</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="e.g. HDFC Bank / SBI"
                  placeholderTextColor={theme.textMuted}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: hasBankDetails ? theme.text : theme.textMuted }]}>
                  {bankName || 'Not configured'}
                </Text>
              )}

              <View style={styles.divider} />

              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>ACCOUNT NUMBER</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Enter Bank Account Number"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                />
              ) : (
                <Text style={[styles.fieldValue, { color: hasBankDetails ? theme.text : theme.textMuted, fontFamily: 'monospace' }]}>
                  {accountNumber ? `•••• ${accountNumber.slice(-4)}` : 'Not configured'}
                </Text>
              )}

              <View style={styles.divider} />

              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>IFSC CODE</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                  value={ifscCode}
                  onChangeText={setIfscCode}
                  placeholder="e.g. HDFC0000123"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="characters"
                />
              ) : (
                <Text style={[styles.fieldValue, { color: hasBankDetails ? '#00b562' : theme.textMuted, fontFamily: 'monospace' }]}>
                  {ifscCode || 'Not configured'}
                </Text>
              )}
            </View>
          ) : (
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>UPI ID</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="e.g. captain@okaxis"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                />
              ) : (
                <Text style={[styles.fieldValue, { color: hasUpiDetails ? '#00b562' : theme.textMuted, fontWeight: '800' }]}>
                  {upiId || 'Not configured'}
                </Text>
              )}
            </View>
          )}

          <Text style={{ textAlign: 'center', fontSize: 12, color: theme.textMuted, marginTop: 16 }}>
            🔒 Your payout details are encrypted and securely stored for trip disbursements.
          </Text>

          {isEditing && (
            <AppButton
              title="Save Payout Details"
              onPress={handleSave}
              loading={saving}
              style={{ marginTop: 20 }}
            />
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
  editPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  payoutTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  payoutTabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  payoutTabText: {
    fontSize: 13,
    fontWeight: '800',
  },
  infoCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12,
  },
});
