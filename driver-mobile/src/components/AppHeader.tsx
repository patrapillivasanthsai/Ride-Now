import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotifications?: boolean;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  showProfile?: boolean;
  onOpenProfile?: () => void;
  avatarText?: string;
  rightAction?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  showNotifications = false,
  unreadCount = 0,
  onOpenNotifications,
  showProfile = false,
  onOpenProfile,
  avatarText = '👨‍✈️',
  rightAction
}: AppHeaderProps) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
      <View style={styles.leftRow}>
        {showBack && onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backIcon, { color: '#00b562' }]}>←</Text>
          </TouchableOpacity>
        ) : null}

        <View>
          {title ? (
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          ) : (
            <View style={styles.brandRow}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#00b562', fontStyle: 'italic' }}>R</Text>
              <Text style={[styles.brandTitle, { color: theme.text }]}>RideNow</Text>
            </View>
          )}
          {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.rightRow}>
        {rightAction}

        {/* Dark / Light Theme Toggle Pill */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themePill, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
        >
          <Text style={{ fontSize: 13 }}>{isDark ? '🌙' : '☀️'}</Text>
        </TouchableOpacity>

        {showNotifications && (
          <TouchableOpacity onPress={onOpenNotifications} style={[styles.iconButton, { backgroundColor: theme.cardSecondary }]}>
            <Text style={styles.headerIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {showProfile && (
          <TouchableOpacity onPress={onOpenProfile} style={[styles.avatarButton, { backgroundColor: theme.cardSecondary, borderColor: '#00b562', borderWidth: 1.5 }]}>
            <Text style={styles.avatarText}>{avatarText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 6,
    marginRight: 4,
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '900',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#00b562',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 18,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00b562',
    letterSpacing: 1.5,
    marginTop: -2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerIcon: {
    fontSize: 18,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
