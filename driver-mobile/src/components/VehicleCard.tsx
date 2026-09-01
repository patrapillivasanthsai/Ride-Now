import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface VehicleOption {
  type: 'BIKE' | 'AUTO' | 'CAB';
  title: string;
  category: string;
  icon: string;
  desc: string;
  rateEstimate: string;
}

interface VehicleCardProps {
  option: VehicleOption;
  selected: boolean;
  onSelect: (type: 'BIKE' | 'AUTO' | 'CAB') => void;
}

export function VehicleCard({ option, selected, onSelect }: VehicleCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onSelect(option.type)}
      style={[
        styles.card,
        {
          backgroundColor: selected ? '#083321' : theme.card,
          borderColor: selected ? '#00b562' : theme.border,
          borderWidth: selected ? 2 : 1,
        }
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{option.icon}</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>{option.title}</Text>
          <Text style={[styles.categoryBadge, { color: selected ? '#00b562' : theme.textMuted }]}>
            {option.category}
          </Text>
        </View>
        <Text style={[styles.desc, { color: theme.textMuted }]}>{option.desc}</Text>
        <Text style={[styles.rate, { color: '#00b562' }]}>{option.rateEstimate}</Text>
      </View>

      <View style={styles.checkboxContainer}>
        <View
          style={[
            styles.radioCircle,
            {
              borderColor: selected ? '#00b562' : theme.border,
              backgroundColor: selected ? '#00b562' : 'transparent',
            }
          ]}
        >
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 32,
  },
  details: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  rate: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  checkboxContainer: {
    marginLeft: 10,
  },
  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
