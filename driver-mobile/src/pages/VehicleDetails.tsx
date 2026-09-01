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

interface VehicleDetailsProps {
  onBack: () => void;
}

export function VehicleDetails({ onBack }: VehicleDetailsProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('BIKE');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getProfile();
        const v = data.vehicle || user?.driver?.vehicle;
        if (v) {
          setMake(v.make || '');
          setModel(v.model || '');
          setYear(String(v.year || '2023'));
          setColor(v.color || 'Black');
          setPlateNumber(v.plateNumber || '');
          const raw = String(v.type).toUpperCase();
          setVehicleType(raw.includes('AUTO') ? 'AUTO' : raw.includes('CAB') ? 'CAB' : 'BIKE');
        }
      } catch {
        const v = user?.driver?.vehicle;
        if (v) {
          setMake(v.make || '');
          setModel(v.model || '');
          setYear(String(v.year || '2023'));
          setColor(v.color || 'Black');
          setPlateNumber(v.plateNumber || '');
          const raw = String(v.type).toUpperCase();
          setVehicleType(raw.includes('AUTO') ? 'AUTO' : raw.includes('CAB') ? 'CAB' : 'BIKE');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!make.trim() || !model.trim() || !plateNumber.trim()) {
      Alert.alert('Validation Error', 'Vehicle make, model, and plate number are required.');
      return;
    }

    setSaving(true);
    try {
      await api.updateProfile({
        vehicle: {
          make: make.trim(),
          model: model.trim(),
          year: year.trim() ? parseInt(year.trim()) : 2023,
          color: color.trim() || 'Black',
          plateNumber: plateNumber.trim().toUpperCase(),
          type: vehicleType
        }
      });
      setIsEditing(false);
      Alert.alert('Vehicle Updated ✅', 'Vehicle specifications updated successfully and synced with the Admin portal.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update vehicle details.');
    } finally {
      setSaving(false);
    }
  };

  const vehicleTypeName = vehicleType === 'BIKE' ? 'Bike (Two-Wheeler)' : vehicleType === 'AUTO' ? 'Auto (Three-Wheeler)' : 'Cab (Four-Wheeler)';
  const vehicleEmoji = vehicleType === 'BIKE' ? '🏍️' : vehicleType === 'AUTO' ? '🛺' : '🚗';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <AppHeader
        title="Vehicle Details"
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
          {/* Category Banner Card */}
          <View style={[styles.categoryCard, { backgroundColor: theme.card, borderColor: '#00b562' }]}>
            <Text style={{ fontSize: 44, marginBottom: 6 }}>{vehicleEmoji}</Text>
            <Text style={[styles.categoryTitle, { color: theme.text }]}>{vehicleTypeName}</Text>
            <View style={styles.statusPill}>
              <Text style={{ color: '#00b562', fontSize: 11, fontWeight: '800' }}>● Active on RideNow</Text>
            </View>
          </View>

          {/* Specs Card */}
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 14 }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>MAKE / BRAND</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                value={make}
                onChangeText={setMake}
                placeholder="e.g. Honda / Maruti"
                placeholderTextColor={theme.textMuted}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{make || '—'}</Text>
            )}

            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>MODEL</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                value={model}
                onChangeText={setModel}
                placeholder="e.g. Activa 6G / Dzire"
                placeholderTextColor={theme.textMuted}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{model || '—'}</Text>
            )}

            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>REGISTRATION YEAR</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                value={year}
                onChangeText={setYear}
                placeholder="2023"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{year || '—'}</Text>
            )}

            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>COLOR</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                value={color}
                onChangeText={setColor}
                placeholder="Black / White"
                placeholderTextColor={theme.textMuted}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.text }]}>{color || '—'}</Text>
            )}

            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>LICENSE PLATE NUMBER</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                value={plateNumber}
                onChangeText={setPlateNumber}
                placeholder="KA-01-EQ-4821"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters"
              />
            ) : (
              <Text style={[styles.fieldValue, { color: '#00b562', fontFamily: 'monospace', fontWeight: '800' }]}>{plateNumber || '—'}</Text>
            )}
          </View>

          {isEditing && (
            <AppButton
              title="Save Vehicle Changes"
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
  categoryCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  statusPill: {
    backgroundColor: 'rgba(0, 181, 98, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
