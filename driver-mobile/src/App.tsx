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
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { RideDetail } from './pages/RideDetail';
import { Earnings } from './pages/Earnings';
import { PendingApproval } from './pages/PendingApproval';
import { Notifications } from './pages/Notifications';

type Screen = 'DASHBOARD' | 'PROFILE' | 'RIDE_DETAIL' | 'EARNINGS' | 'NOTIFICATIONS';

function SuspendedScreen({ reason, onLogout }: { reason?: string; onLogout: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Text style={{ fontSize: 48, marginBottom: 20 }}>⛔</Text>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>Account Suspended</Text>
      <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
        {reason || 'Your account has been suspended by the administrator. Please contact support for assistance.'}
      </Text>
      <TouchableOpacity onPress={onLogout}
        style={{ backgroundColor: '#ef4444', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Logout</Text>
      </TouchableOpacity>
      <Text style={{ color: '#475569', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
        📧 support@ridenow.com
      </Text>
    </View>
  );
}

function MainAppShell() {
  const { user, loading, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('DASHBOARD');
  const [screenParams, setScreenParams] = useState<any>(null);

  const handleNavigate = (screen: string, params: any = null) => {
    setCurrentScreen(screen as Screen);
    setScreenParams(params);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc107" />
        <Text style={styles.loadingText}>Initializing Session...</Text>
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
    return <PendingApproval />;
  }

  // Basic Router layout
  const renderScreen = () => {
    switch (currentScreen) {
      case 'PROFILE':
        return <Profile onNavigate={handleNavigate} />;
      case 'RIDE_DETAIL':
        return <RideDetail rideId={screenParams?.rideId} onNavigate={handleNavigate} />;
      case 'EARNINGS':
        return <Earnings onNavigate={handleNavigate} />;
      case 'NOTIFICATIONS':
        return <Notifications onNavigate={handleNavigate} />;
      case 'DASHBOARD':
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      {renderScreen()}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppShell />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaa',
    marginTop: 10,
    fontSize: 14,
  },
});
