import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { RideDetail } from './pages/RideDetail';
import { Earnings } from './pages/Earnings';
import { Wallet } from './pages/Wallet';
import { ReferAndEarn } from './pages/ReferAndEarn';
import { HelpSupport } from './pages/HelpSupport';
import { SafetyTraining } from './pages/SafetyTraining';
import { PendingApproval } from './pages/PendingApproval';
import { Notifications } from './pages/Notifications';
import { PersonalInfo } from './pages/PersonalInfo';
import { VehicleDetails } from './pages/VehicleDetails';
import { PayoutDetails } from './pages/PayoutDetails';

import { BottomNav, TabScreen } from './components/BottomNav';

type Screen =
  | 'DASHBOARD'
  | 'PROFILE'
  | 'PERSONAL_INFO'
  | 'VEHICLE_DETAILS'
  | 'PAYOUT_DETAILS'
  | 'RIDE_DETAIL'
  | 'EARNINGS'
  | 'WALLET'
  | 'REFERRALS'
  | 'HELP'
  | 'SAFETY_TRAINING'
  | 'REGISTER'
  | 'NOTIFICATIONS';

function SuspendedScreen({ reason, onLogout }: { reason?: string; onLogout: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Text style={{ fontSize: 48, marginBottom: 20 }}>⛔</Text>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>Account Suspended</Text>
      <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
        {reason || 'Your account has been suspended by the administrator. Please contact support for assistance.'}
      </Text>
      <TouchableOpacity onPress={onLogout}
        style={{ backgroundColor: '#ef4444', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Logout</Text>
      </TouchableOpacity>
      <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 20, textAlign: 'center' }}>
        📧 support@ridenow.com
      </Text>
    </View>
  );
}

function MainAppShell() {
  const { user, loading, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<Screen>('DASHBOARD');
  const [screenParams, setScreenParams] = useState<any>(null);

  const handleNavigate = (screen: string, params: any = null) => {
    setCurrentScreen(screen as Screen);
    setScreenParams(params);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color="#00b562" />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Initializing Captain Session...</Text>
      </View>
    );
  }

  // Auth gate
  if (!user) {
    return <Login />;
  }

  // Suspension gate — check user's driver suspension status
  if (user.role === 'DRIVER' && user.driver?.isSuspended) {
    return <SuspendedScreen reason={user.driver.suspendReason} onLogout={logout} />;
  }

  // Pending approval gate
  if (user.role === 'DRIVER' && user.driver && !user.driver.isApproved) {
    if (currentScreen === 'SAFETY_TRAINING') {
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
          <SafetyTraining onBack={() => setCurrentScreen('DASHBOARD')} />
        </SafeAreaView>
      );
    }
    return <PendingApproval onNavigate={handleNavigate} />;
  }

  const isMainTabScreen = ['DASHBOARD', 'EARNINGS', 'WALLET', 'REFERRALS', 'PROFILE'].includes(currentScreen);
  const currentTab: TabScreen = (isMainTabScreen ? currentScreen : 'DASHBOARD') as TabScreen;

  // Router layout
  const renderScreen = () => {
    switch (currentScreen) {
      case 'PROFILE':
        return <Profile onNavigate={handleNavigate} />;
      case 'PERSONAL_INFO':
        return <PersonalInfo onBack={() => handleNavigate('PROFILE')} />;
      case 'VEHICLE_DETAILS':
        return <VehicleDetails onBack={() => handleNavigate('PROFILE')} />;
      case 'PAYOUT_DETAILS':
        return <PayoutDetails onBack={() => handleNavigate('PROFILE')} />;
      case 'RIDE_DETAIL':
        return <RideDetail rideId={screenParams?.rideId} onNavigate={handleNavigate} />;
      case 'EARNINGS':
        return <Earnings onNavigate={handleNavigate} />;
      case 'WALLET':
        return <Wallet onNavigate={handleNavigate} />;
      case 'REFERRALS':
        return <ReferAndEarn onNavigate={handleNavigate} />;
      case 'HELP':
        return <HelpSupport onNavigate={handleNavigate} />;
      case 'SAFETY_TRAINING':
        return <SafetyTraining onBack={() => handleNavigate('DASHBOARD')} />;
      case 'REGISTER':
        return <Register onBackToLogin={() => handleNavigate('DASHBOARD')} />;
      case 'NOTIFICATIONS':
        return <Notifications onNavigate={handleNavigate} />;
      case 'DASHBOARD':
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>
      {isMainTabScreen && (
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => handleNavigate(tab)}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MainAppShell />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
});
