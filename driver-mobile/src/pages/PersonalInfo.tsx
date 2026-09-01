import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { AppButton } from '../components/AppButton';
import { api } from '../services/api';

interface PersonalInfoProps {
  onBack: () => void;
}

export function PersonalInfo({ onBack }: PersonalInfoProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getProfile();
        setName(data.name || user?.driver?.name || user?.name || '');
        setPhone(data.phone || user?.driver?.phone || user?.phone || '');
        setEmail(data.email || user?.email || '');
        setDob(data.dob ? new Date(data.dob).toISOString().split('T')[0] : '1995-06-15');
        setGender(data.gender || 'Male');
      } catch {
        setName(user?.driver?.name || user?.name || 'Captain');
        setPhone(user?.driver?.phone || user?.phone || '—');
        setEmail(user?.email || '—');
        setDob('1995-06-15');
        setGender('Male');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({ name: name.trim(), phone: phone.trim() });
      setIsEditing(false);
      Alert.alert('Success ✅', 'Personal information updated successfully.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile information.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <AppHeader
        title="Personal Information"
        showBack
        onBack={onBack}
        rightAction={
          <TouchableOpacity
            onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
            style={[styles.editPill, { backgroundColor: theme.cardSecondary, borderColor: '#00b562' }]}
          >
            <Text style={{ color: '#00b562', fontSize: 12, fontWeight: '800' }}>
              {isEditing ? 'Save' : '✏️ Edit'}
            </Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00b562" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>FULL NAME</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                placeholderTextColor={theme.textMuted}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{name || '—'}</Text>
            )}

            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>MOBILE NUMBER</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Mobile Number"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{phone || '—'}</Text>
            )}

            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>EMAIL ADDRESS</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{email || '—'}</Text>

            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>DATE OF BIRTH</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{dob || '—'}</Text>
            )}

            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>GENDER</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{gender || 'Male'}</Text>
          </View>

          {isEditing && (
            <AppButton
              title="Save Changes"
              onPress={handleSave}
              loading={saving}
              style={{ marginTop: 20 }}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  editPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12,
  },
});
