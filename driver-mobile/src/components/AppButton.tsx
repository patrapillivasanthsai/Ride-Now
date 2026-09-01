import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'large',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon
}: AppButtonProps) {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return '#2a3a60';
    switch (variant) {
      case 'primary':
      case 'success':
        return '#00b562';
      case 'secondary':
        return theme.cardSecondary;
      case 'outline':
        return 'transparent';
      case 'danger':
        return '#ef4444';
      default:
        return '#00b562';
    }
  };

  const getTextColor = () => {
    if (disabled) return '#94a3b8';
    switch (variant) {
      case 'primary':
      case 'success':
      case 'danger':
        return '#ffffff';
      case 'secondary':
        return theme.text;
      case 'outline':
        return '#00b562';
      default:
        return '#ffffff';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 8, paddingHorizontal: 14 };
      case 'medium':
        return { paddingVertical: 12, paddingHorizontal: 18 };
      case 'large':
      default:
        return { paddingVertical: 15, paddingHorizontal: 20 };
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        getPadding(),
        {
          backgroundColor: getBackgroundColor(),
          borderColor: variant === 'outline' ? '#00b562' : variant === 'secondary' ? theme.border : 'transparent',
          borderWidth: variant === 'outline' || variant === 'secondary' ? 1.5 : 0,
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={[styles.text, { color: getTextColor(), fontSize: size === 'small' ? 13 : size === 'medium' ? 15 : 16 }, textStyle]}>
          {icon ? `${icon}  ` : ''}{title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  text: {
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
