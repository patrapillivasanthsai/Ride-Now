import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type TabScreen = 'DASHBOARD' | 'EARNINGS' | 'WALLET' | 'REFERRALS' | 'PROFILE';

interface BottomNavProps {
  currentTab: TabScreen;
  onSelectTab: (tab: TabScreen) => void;
  unreadNotifications?: number;
}

export function BottomNav({ currentTab, onSelectTab }: BottomNavProps) {
  const { theme } = useTheme();

  const tabs: Array<{ id: TabScreen; label: string; icon: string }> = [
    { id: 'DASHBOARD', label: 'Trips', icon: '⚡' },
    { id: 'EARNINGS', label: 'Earnings', icon: '💰' },
    { id: 'WALLET', label: 'Wallet', icon: '💳' },
    { id: 'REFERRALS', label: 'Refer', icon: '🎁' },
    { id: 'PROFILE', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.7}
            onPress={() => onSelectTab(tab.id)}
            style={styles.tabItem}
          >
            <View style={[styles.iconWrapper, isActive && { backgroundColor: 'rgba(0, 181, 98, 0.15)' }]}>
              <Text style={[styles.icon, isActive && { color: '#00b562' }]}>{tab.icon}</Text>
            </View>
            <Text style={[styles.label, { color: isActive ? '#00b562' : theme.textMuted, fontWeight: isActive ? '800' : '600' }]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 11,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00b562',
    marginTop: 2,
  },
});
