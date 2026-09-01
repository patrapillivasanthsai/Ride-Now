import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { OtpInput } from '../components/OtpInput';
import { AppButton } from '../components/AppButton';
import { api } from '../services/api';

interface MobileOtpProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

export function MobileOtp({ phone, onVerified, onBack }: MobileOtpProps) {
  const { theme } = useTheme();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maskedPhone = phone.length >= 10
    ? `+91 ${phone.slice(0, 2)}XXXXXX${phone.slice(-2)}`
    : `+91 ${phone}`;

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.verifyMobileOtp(phone, otp);
      onVerified();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.sendMobileOtp(phone);
      Alert.alert('OTP Resent', `A new 6-digit code was sent to ${maskedPhone}. Check terminal console.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not resend OTP.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backText, { color: '#00b562' }]}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.iconBadge}>
        <Text style={styles.icon}>📱</Text>
      </View>

      <Text style={[styles.title, { color: theme.text }]}>Verify your number</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        We sent a 6-digit verification code to
      </Text>
      <Text style={[styles.phoneHighlight, { color: '#00b562' }]}>{maskedPhone}</Text>

      <OtpInput
        length={6}
        value={otp}
        onChange={(val) => {
          setOtp(val);
          if (error) setError(null);
        }}
        onResend={handleResend}
        countdownSeconds={28}
        error={error}
      />

      <AppButton
        title="Verify & Continue"
        onPress={handleVerify}
        loading={loading}
        disabled={otp.length !== 6}
        style={{ marginTop: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 24,
    padding: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: '700',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 181, 98, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  phoneHighlight: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
});
