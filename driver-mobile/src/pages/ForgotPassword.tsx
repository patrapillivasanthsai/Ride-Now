import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { OtpInput } from '../components/OtpInput';
import { AppButton } from '../components/AppButton';
import { api } from '../services/api';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const { theme } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Send OTP to email
  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.sendForgotPasswordOtp(email.trim());
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'No account found with this email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.verifyForgotPasswordOtp(email.trim(), otp);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.resetForgotPassword(email.trim(), otp, newPassword);
      Alert.alert('Password Updated', 'Your password has been successfully reset! Please log in.', [
        { text: 'Log In Now', onPress: onBackToLogin }
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // Password criteria checklist helpers
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

  const getStrengthLevel = () => {
    let score = 0;
    if (hasMinLength) score++;
    if (hasUpperCase) score++;
    if (hasNumber) score++;
    if (hasSpecialChar) score++;
    if (score <= 1) return { label: 'Weak', color: '#ef4444', percent: '33%' };
    if (score <= 3) return { label: 'Medium', color: '#f59e0b', percent: '66%' };
    return { label: 'Strong', color: '#00b562', percent: '100%' };
  };

  const strength = getStrengthLevel();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={onBackToLogin} style={styles.backButton}>
        <Text style={[styles.backText, { color: '#00b562' }]}>← Back to Login</Text>
      </TouchableOpacity>

      {/* STEP 1: Enter Email */}
      {step === 1 && (
        <View style={styles.content}>
          <View style={styles.iconBadge}>
            <Text style={styles.icon}>🔑</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Enter your registered email address and we'll send you a verification code.
          </Text>

          {error && <Text style={styles.errorBanner}>⚠️ {error}</Text>}

          <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              value={email}
              onChangeText={(val) => { setEmail(val); if (error) setError(null); }}
              placeholder="captain@ridenow.com"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <AppButton
            title="Send Verification Code"
            onPress={handleSendOtp}
            loading={loading}
            style={{ marginTop: 20 }}
          />
        </View>
      )}

      {/* STEP 2: Verify Email OTP */}
      {step === 2 && (
        <View style={styles.content}>
          <View style={styles.iconBadge}>
            <Text style={styles.icon}>📧</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Verify your email</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Enter the 6-digit verification code sent to your email ({email})
          </Text>

          <OtpInput
            length={6}
            value={otp}
            onChange={(val) => { setOtp(val); if (error) setError(null); }}
            onResend={handleSendOtp}
            countdownSeconds={42}
            error={error}
          />

          <AppButton
            title="Verify Email"
            onPress={handleVerifyOtp}
            loading={loading}
            disabled={otp.length !== 6}
            style={{ marginTop: 20 }}
          />
        </View>
      )}

      {/* STEP 3: Create New Password */}
      {step === 3 && (
        <View style={styles.content}>
          <View style={styles.iconBadge}>
            <Text style={styles.icon}>🔒</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Create new password</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Choose a strong password to secure your Captain account.
          </Text>

          {error && <Text style={styles.errorBanner}>⚠️ {error}</Text>}

          <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.text }]}>New Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              value={newPassword}
              onChangeText={(val) => { setNewPassword(val); if (error) setError(null); }}
              placeholder="••••••••"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />

            {/* Strength meter bar */}
            {newPassword.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Strength: <Text style={{ color: strength.color, fontWeight: 'bold' }}>{strength.label}</Text></Text>
                </View>
                <View style={{ height: 4, backgroundColor: theme.border, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ width: `${strength.percent}%` as any, height: '100%', backgroundColor: strength.color }} />
                </View>
              </View>
            )}

            <Text style={[styles.label, { color: theme.text, marginTop: 14 }]}>Confirm New Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              value={confirmPassword}
              onChangeText={(val) => { setConfirmPassword(val); if (error) setError(null); }}
              placeholder="••••••••"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />

            {/* Criteria Checklist */}
            <View style={styles.checklist}>
              <Text style={[styles.checkItem, { color: hasMinLength ? '#00b562' : theme.textMuted }]}>
                {hasMinLength ? '✓' : '•'} At least 8 characters
              </Text>
              <Text style={[styles.checkItem, { color: hasUpperCase ? '#00b562' : theme.textMuted }]}>
                {hasUpperCase ? '✓' : '•'} One uppercase letter
              </Text>
              <Text style={[styles.checkItem, { color: hasNumber ? '#00b562' : theme.textMuted }]}>
                {hasNumber ? '✓' : '•'} One number
              </Text>
              <Text style={[styles.checkItem, { color: hasSpecialChar ? '#00b562' : theme.textMuted }]}>
                {hasSpecialChar ? '✓' : '•'} One special character
              </Text>
            </View>
          </View>

          <AppButton
            title="Reset Password"
            onPress={handleResetPassword}
            loading={loading}
            style={{ marginTop: 20 }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 54,
    justifyContent: 'center',
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    width: '100%',
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
    fontSize: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  inputCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  checklist: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  checkItem: {
    fontSize: 12,
    fontWeight: '600',
  },
});
