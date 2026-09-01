import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

interface SwipeActionButtonProps {
  title: string;
  onConfirm: () => void;
  loading?: boolean;
  color?: string;
  icon?: string;
}

export function SwipeActionButton({
  title,
  onConfirm,
  loading = false,
  color = '#00b562',
  icon = '»'
}: SwipeActionButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <View style={styles.track}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={loading}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={onConfirm}
        style={[
          styles.button,
          {
            backgroundColor: color,
            transform: [{ scale: pressed ? 0.98 : 1.0 }],
          }
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <View style={styles.content}>
            <View style={styles.sliderThumb}>
              <Text style={[styles.thumbIcon, { color }]}>{icon}</Text>
            </View>
            <Text style={styles.titleText}>{title}</Text>
            <View style={{ width: 40 }} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    marginVertical: 8,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
  },
  sliderThumb: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  thumbIcon: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: -2,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
    flex: 1,
  },
});
