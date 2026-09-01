import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
  const normalized = status.toUpperCase();

  const getColors = () => {
    switch (normalized) {
      case 'ONLINE':
      case 'VERIFIED':
      case 'APPROVED':
      case 'COMPLETED':
      case 'ACTIVE':
        return { bg: 'rgba(0, 181, 98, 0.15)', text: '#00b562', border: '#00b562' };
      case 'UNDER_REVIEW':
      case 'PENDING':
      case 'DRIVER_ARRIVING':
      case 'DRIVER_ARRIVED':
      case 'RIDE_STARTED':
        return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#38bdf8' };
      case 'WARNING':
      case 'ACTION_REQUIRED':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: '#f59e0b' };
      case 'OFFLINE':
      case 'NOT_STARTED':
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: '#475569' };
      case 'REJECTED':
      case 'SUSPENDED':
      case 'CANCELLED':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444' };
      default:
        return { bg: 'rgba(0, 181, 98, 0.15)', text: '#00b562', border: '#00b562' };
    }
  };

  const colors = getColors();
  const displayLabel = label || normalized.replace(/_/g, ' ');

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingVertical: size === 'small' ? 3 : 5,
          paddingHorizontal: size === 'small' ? 8 : 12,
        }
      ]}
    >
      <Text style={[styles.text, { color: colors.text, fontSize: size === 'small' ? 11 : 13 }]}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
