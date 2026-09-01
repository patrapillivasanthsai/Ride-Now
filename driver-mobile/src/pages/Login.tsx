import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { ForgotPassword } from './ForgotPassword';
import { Register } from './Register';

export function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Navigation mode
  const [viewState, setViewState] = useState<'LOGIN' | 'FORGOT_PASSWORD' | 'REGISTER'>('LOGIN');

  // Login inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      setError(t.invalidCredentials || 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.login(email.trim().toLowerCase(), password);
      await login(result.token, result.user);
    } catch (err: any) {
      setError(err.message || t.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  if (viewState === 'FORGOT_PASSWORD') {
    return <ForgotPassword onBackToLogin={() => setViewState('LOGIN')} />;
  }

  if (viewState === 'REGISTER') {
    return <Register onBackToLogin={() => setViewState('LOGIN')} />;
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: '#070d1e' }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top RideNow Captain Brand Header matching Reference Image */}
      <View style={styles.brandHeader}>
        <View style={styles.logoRow}>
          <Text style={styles.brandTitle}>RideNow </Text>
          <Text style={styles.brandSubtitle}>Captain</Text>
        </View>

        <Text style={styles.mainHeadline}>{t.tagline || 'Drive Earn Grow'}</Text>
        <Text style={styles.subHeadline}>
          {t.subtagline || 'Join RideNow and turn every journey into an opportunity.'}
        </Text>
      </View>

      {/* Hero Fleet Illustration Banner matching Reference Image */}
      <View style={styles.heroBanner}>
        {/* City Skyline Silhouette Backdrop */}
        <View style={styles.citySkyline}>
          <View style={[styles.building, { height: 50, left: 10 }]} />
          <View style={[styles.building, { height: 75, left: 35 }]} />
          <View style={[styles.building, { height: 95, left: 65 }]} />
          <View style={[styles.building, { height: 60, left: 100 }]} />
          <View style={[styles.building, { height: 85, left: 130 }]} />
          <View style={[styles.building, { height: 105, left: 165 }]} />
          <View style={[styles.building, { height: 70, left: 205 }]} />
          <View style={[styles.building, { height: 90, left: 235 }]} />
          <View style={[styles.building, { height: 60, left: 270 }]} />
        </View>

        {/* Ambient Dusk Glow */}
        <View style={styles.ambientGlow} />

        {/* Fleet Composition: Bike Captain, Auto Captain, Taxi Cab */}
        <View style={styles.fleetRow}>
          <View style={styles.fleetVehicle}>
            <View style={styles.vehicleShadow} />
            <Text style={{ fontSize: 44 }}>🏍️</Text>
          </View>
          <View style={[styles.fleetVehicle, { zIndex: 3, transform: [{ scale: 1.15 }] }]}>
            <View style={styles.vehicleShadow} />
            <Text style={{ fontSize: 52 }}>🛺</Text>
          </View>
          <View style={styles.fleetVehicle}>
            <View style={styles.vehicleShadow} />
            <Text style={{ fontSize: 48 }}>🚕</Text>
          </View>
        </View>

        {/* Road Surface */}
        <View style={styles.roadSurface}>
          <View style={styles.roadLine} />
          <View style={styles.roadLine} />
          <View style={styles.roadLine} />
        </View>
      </View>

      {/* Error banner */}
      {error && <Text style={styles.errorText}>⚠️ {error}</Text>}

      {/* Form Input Section */}
      <View style={styles.formSection}>
        <Text style={styles.inputLabel}>{t.emailLabel || 'Email Address'}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={t.emailPlaceholder || 'captain@gmail.com'}
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={(v) => { setEmail(v); if (error) setError(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={[styles.inputLabel, { marginTop: 14 }]}>{t.passwordLabel || 'Password'}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, { paddingRight: 60 }]}
            placeholder={t.passwordPlaceholder || 'Enter your password'}
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={(v) => { setPassword(v); if (error) setError(null); }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700' }}>
              {showPassword ? t.hidePassword || 'Hide' : t.showPassword || 'Show'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => setViewState('FORGOT_PASSWORD')}
        >
          <Text style={styles.forgotText}>{t.forgotPassword || 'Forgot Password?'}</Text>
        </TouchableOpacity>

        {/* Continue Button matching Reference Image (Full green pill) */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleEmailLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#070d1e" size="small" />
          ) : (
            <Text style={styles.continueText}>{t.continueBtn || 'Continue'}</Text>
          )}
        </TouchableOpacity>

        {/* Register Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>{t.newToRideNow || 'New to RideNow?'} </Text>
          <TouchableOpacity onPress={() => setViewState('REGISTER')}>
            <Text style={styles.registerLink}>{t.registerAsCaptain || 'Register as a Captain'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Selector matching Reference Image footer row */}
      <View style={styles.languageRow}>
        <TouchableOpacity
          onPress={() => setLanguage('en')}
          style={[styles.langItem, language === 'en' && styles.langItemActive]}
        >
          <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
            English
          </Text>
        </TouchableOpacity>

        <Text style={styles.langSeparator}>·</Text>

        <TouchableOpacity
          onPress={() => setLanguage('hi')}
          style={[styles.langItem, language === 'hi' && styles.langItemActive]}
        >
          <Text style={[styles.langText, language === 'hi' && styles.langTextActive]}>
            हिंदी
          </Text>
        </TouchableOpacity>

        <Text style={styles.langSeparator}>·</Text>

        <TouchableOpacity
          onPress={() => setLanguage('te')}
          style={[styles.langItem, language === 'te' && styles.langItemActive]}
        >
          <Text style={[styles.langText, language === 'te' && styles.langTextActive]}>
            తెలుగు
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: '#00b562',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  mainHeadline: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subHeadline: {
    color: '#94a3b8',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 290,
  },
  heroBanner: {
    height: 180,
    backgroundColor: '#0a142e',
    borderRadius: 20,
    marginVertical: 14,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  citySkyline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 40,
  },
  building: {
    position: 'absolute',
    bottom: 0,
    width: 26,
    backgroundColor: '#111d3d',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    opacity: 0.8,
  },
  ambientGlow: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: 'rgba(0, 181, 98, 0.08)',
    borderRadius: 40,
  },
  fleetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 16,
    marginBottom: 10,
    zIndex: 2,
  },
  fleetVehicle: {
    alignItems: 'center',
    position: 'relative',
  },
  vehicleShadow: {
    position: 'absolute',
    bottom: -4,
    width: 44,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 4,
  },
  roadSurface: {
    height: 16,
    backgroundColor: '#060a17',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  roadLine: {
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
  },
  formSection: {
    marginTop: 4,
  },
  inputLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  textInput: {
    backgroundColor: '#101a38',
    color: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e2c56',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  eyeToggle: {
    position: 'absolute',
    right: 16,
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
  },
  forgotText: {
    color: '#00b562',
    fontSize: 12.5,
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: '#00b562',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
    elevation: 4,
    shadowColor: '#00b562',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  continueText: {
    color: '#070d1e',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  errorText: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    padding: 10,
    borderRadius: 12,
    marginVertical: 8,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  footerMuted: {
    color: '#64748b',
    fontSize: 13.5,
  },
  registerLink: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13.5,
    textDecorationLine: 'underline',
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    paddingVertical: 8,
  },
  langItem: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  langItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#00b562',
  },
  langText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  langTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  langSeparator: {
    color: '#334155',
    fontSize: 14,
  },
});
