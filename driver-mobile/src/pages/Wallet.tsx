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
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { AppButton } from '../components/AppButton';
import { api } from '../services/api';

interface WalletProps {
  onNavigate: (screen: string) => void;
}

export function Wallet({ onNavigate }: WalletProps) {
  const { theme } = useTheme();
  const [data, setData] = useState<any>(null);
  const [payoutAccount, setPayoutAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [walletRes, profileRes] = await Promise.all([
        api.getWallet().catch(() => null),
        api.getProfile().catch(() => null)
      ]);

      setData(walletRes || { availableBalance: 0.00, transactions: [] });

      const accounts = profileRes?.payoutAccounts || [];
      if (accounts.length > 0) {
        setPayoutAccount(accounts[0]);
      } else {
        setPayoutAccount(null);
      }
    } catch {
      setData({ availableBalance: 0.00, transactions: [] });
      setPayoutAccount(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    if (amt > (data?.availableBalance || 0)) {
      Alert.alert('Insufficient Balance', 'Withdrawal amount exceeds your current available balance.');
      return;
    }

    if (!payoutAccount) {
      Alert.alert('No Account Linked', 'Please link your Bank Account or UPI ID first in Bank & Payout Details.');
      return;
    }

    setSubmittingWithdraw(true);
    try {
      await api.requestWithdrawal(amt);
      Alert.alert('Withdrawal Initiated ⚡', `₹${amt.toFixed(2)} will be credited to your linked account within 15 minutes.`);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      load();
    } catch (err: any) {
      Alert.alert('Withdrawal Failed', err.message || 'Could not process withdrawal. Please try again later.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <AppHeader
        title="Wallet & Payouts"
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#00b562" />}
        >
          {/* Balance Card */}
          <View style={[styles.balanceCard, { backgroundColor: '#00b562' }]}>
            <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
            <Text style={styles.balanceAmount}>₹{(data?.availableBalance || 0).toFixed(2)}</Text>
            <Text style={styles.balanceSub}>Instant daily bank disbursements</Text>

            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => setShowWithdrawModal(true)}
            >
              <Text style={styles.withdrawBtnText}>⚡ Withdraw Earnings</Text>
            </TouchableOpacity>
          </View>

          {/* Linked Payout Method Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 16 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Linked Payout Method</Text>
              <TouchableOpacity onPress={() => onNavigate('PAYOUT_DETAILS')}>
                <Text style={{ color: '#00b562', fontSize: 12, fontWeight: '800' }}>Manage</Text>
              </TouchableOpacity>
            </View>

            {payoutAccount ? (
              <View style={[styles.accountRow, { backgroundColor: theme.cardSecondary, marginTop: 10 }]}>
                <Text style={{ fontSize: 26, marginRight: 12 }}>{payoutAccount.type === 'UPI' ? '⚡' : '🏦'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bankName, { color: theme.text }]}>
                    {payoutAccount.type === 'UPI' ? 'UPI ID' : payoutAccount.bankName || 'Bank Account'}
                  </Text>
                  <Text style={[styles.accountNumber, { color: theme.textMuted }]}>
                    {payoutAccount.type === 'UPI' ? payoutAccount.upiId : payoutAccount.accountNumberMasked || 'Linked'}
                  </Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={{ color: '#00b562', fontSize: 10, fontWeight: '800' }}>Active</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.noAccountBox, { backgroundColor: theme.cardSecondary, marginTop: 10 }]}>
                <Text style={{ fontSize: 24, marginRight: 10 }}>💳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bankName, { color: theme.text }]}>No Payout Method Linked</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>Link Bank Account or UPI to withdraw</Text>
                </View>
                <TouchableOpacity
                  style={styles.addPayoutBtn}
                  onPress={() => onNavigate('PAYOUT_DETAILS')}
                >
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>+ Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Recent Transactions List */}
          <Text style={[styles.sectionTitle, { color: '#00b562', marginTop: 20 }]}>RECENT TRANSACTIONS</Text>

          {data?.transactions && data.transactions.length > 0 ? (
            <View style={styles.txList}>
              {data.transactions.map((tx: any) => (
                <View key={tx.id} style={[styles.txItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.txDesc, { color: theme.text }]}>{tx.description}</Text>
                    <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.amount >= 0 ? '#00b562' : '#ef4444' }]}>
                    {tx.amount >= 0 ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🪙</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Transactions Yet</Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                Complete trips to receive live earnings directly into your wallet.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Withdrawal Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Withdraw Earnings</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: '800' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: theme.textMuted }]}>
              Available balance: ₹{(data?.availableBalance || 0).toFixed(2)}
            </Text>

            <TextInput
              style={[styles.withdrawInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Enter amount (₹)"
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              autoFocus
            />

            <AppButton
              title="Confirm Withdrawal"
              onPress={handleWithdraw}
              loading={submittingWithdraw}
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  balanceCard: {
    padding: 22,
    borderRadius: 22,
    alignItems: 'center',
    elevation: 4,
  },
  balanceLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 4,
  },
  balanceSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
  },
  withdrawBtn: {
    backgroundColor: '#070d1e',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 14,
  },
  withdrawBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
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
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  noAccountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  addPayoutBtn: {
    backgroundColor: '#00b562',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '700',
  },
  accountNumber: {
    fontSize: 12,
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(0, 181, 98, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  txList: {
    gap: 8,
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  txDesc: {
    fontSize: 13,
    fontWeight: '700',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '900',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 6,
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
  modalSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  withdrawInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '800',
  },
});
