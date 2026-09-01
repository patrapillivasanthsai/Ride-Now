import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onResend?: () => void;
  countdownSeconds?: number;
  error?: string | null;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onResend,
  countdownSeconds = 28,
  error
}: OtpInputProps) {
  const { theme } = useTheme();
  const inputs = useRef<Array<TextInput | null>>([]);
  const [timer, setTimer] = useState(countdownSeconds);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResendClick = () => {
    if (canResend && onResend) {
      onResend();
      setTimer(countdownSeconds);
      setCanResend(false);
    }
  };

  const handleTextChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const chars = value.split('');

    if (cleaned.length > 1) {
      // Pasted multi-digit OTP
      const pasted = cleaned.slice(0, length);
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, length - 1);
      inputs.current[nextIndex]?.focus();
      return;
    }

    chars[index] = cleaned;
    const newOtp = chars.join('').slice(0, length);
    onChange(newOtp);

    if (cleaned && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.boxesRow}>
        {Array.from({ length }).map((_, idx) => {
          const char = value[idx] || '';
          const isFocused = value.length === idx || (idx === length - 1 && value.length === length);
          return (
            <TextInput
              key={idx}
              ref={(ref) => { inputs.current[idx] = ref; }}
              style={[
                styles.box,
                {
                  backgroundColor: theme.cardSecondary,
                  borderColor: error ? '#ef4444' : char ? '#00b562' : isFocused ? '#38bdf8' : theme.border,
                  color: theme.text,
                }
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={char}
              onChangeText={(text) => handleTextChange(text, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              selectTextOnFocus
              textAlign="center"
            />
          );
        })}
      </View>

      {error ? (
        <Text style={styles.errorText}>⚠️ {error}</Text>
      ) : null}

      <View style={styles.resendRow}>
        {!canResend ? (
          <Text style={[styles.timerText, { color: theme.textMuted }]}>
            Resend OTP in <Text style={{ color: '#00b562', fontWeight: 'bold' }}>{formatTimer(timer)}</Text>
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResendClick}>
            <Text style={[styles.resendLink, { color: '#00b562' }]}>
              Didn't receive the code? <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>Resend OTP</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 18,
    alignItems: 'center',
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: '800',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  resendRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 13,
  },
  resendLink: {
    fontSize: 13,
  },
});
