import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { api } from '../services/api';

interface ProfileProps {
  onNavigate: (screen: string) => void;
}

export function Profile({ onNavigate }: ProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form values
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [type, setType] = useState('Car');

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await api.getProfile();
        setProfile(data);
        setName(data.name || '');
        setLicenseNumber(data.licenseNumber || '');
        setPhone(data.phone || '');
        if (data.vehicle) {
          setMake(data.vehicle.make || '');
          setModel(data.vehicle.model || '');
          setYear(String(data.vehicle.year || ''));
          setColor(data.vehicle.color || '');
          setPlateNumber(data.vehicle.plateNumber || '');
          setType(data.vehicle.type || 'Car');
        }
      } catch (error: any) {
        Alert.alert('Error', 'Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleUpdate = async () => {
    if (!name.trim() || !licenseNumber.trim() || !phone.trim() || !make.trim() || !model.trim() || !year.trim() || !color.trim() || !plateNumber.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    setUpdating(true);
    try {
      // 1. Update Profile (phone, name, licenseNumber)
      await api.updateProfile({ phone, name, licenseNumber });

      // 2. Update Vehicle specs
      await api.updateVehicle({
        make,
        model,
        year: parseInt(year, 10),
        color,
        plateNumber,
        type,
      });

      Alert.alert('Success', 'Profile and vehicle information updated!');
    } catch (error: any) {
      Alert.alert('Update Failed', error.message || 'Could not save changes.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc107" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('DASHBOARD')}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Core Profile */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Account Details</Text>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{profile?.email}</Text>
          
          <Text style={styles.infoLabel}>Account Status:</Text>
          <Text style={[styles.infoValue, { color: profile?.isApproved ? '#28a745' : '#dc3545', fontWeight: 'bold' }]}>
            {profile?.isApproved ? 'APPROVED' : 'PENDING APPROVAL'}
          </Text>

          {profile?.averageRating !== undefined && profile?.averageRating !== null && (
            <View>
              <Text style={styles.infoLabel}>Driver Rating Score:</Text>
              <Text style={[styles.infoValue, { color: '#ffc107', fontWeight: 'bold' }]}>
                ★ {profile.averageRating} ({profile.totalRatings} ratings)
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => onNavigate('EARNINGS')}
            style={{
              backgroundColor: '#333',
              borderWidth: 1,
              borderColor: '#444',
              padding: 10,
              borderRadius: 4,
              alignItems: 'center',
              marginTop: 15,
              marginBottom: 15
            }}
          >
            <Text style={{ color: '#ffc107', fontWeight: 'bold' }}>View Earnings Dashboard</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Driver Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>Driving License Number</Text>
          <TextInput
            style={styles.input}
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            placeholder="KA-01-20150001234"
            placeholderTextColor="#888"
          />
        </View>

        {/* Vehicle specs */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Vehicle Details</Text>

          <Text style={styles.label}>Vehicle Type</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5, marginBottom: 15 }}>
            {['Car', 'Bike', 'Auto'].map((vt) => (
              <TouchableOpacity
                key={vt}
                onPress={() => setType(vt)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: type === vt ? '#ffc107' : '#444',
                  backgroundColor: type === vt ? '#ffd54f22' : '#333',
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: type === vt ? '#ffc107' : '#fff', fontWeight: 'bold' }}>{vt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Vehicle Make</Text>
          <TextInput
            style={styles.input}
            value={make}
            onChangeText={setMake}
            placeholder="Toyota"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>Vehicle Model</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="Camry"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>Manufacturing Year</Text>
          <TextInput
            style={styles.input}
            value={year}
            onChangeText={setYear}
            placeholder="2021"
            placeholderTextColor="#888"
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Vehicle Color</Text>
          <TextInput
            style={styles.input}
            value={color}
            onChangeText={setColor}
            placeholder="Silver"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>License Plate Number</Text>
          <TextInput
            style={styles.input}
            value={plateNumber}
            onChangeText={setPlateNumber}
            placeholder="KA 01 AB 1234"
            placeholderTextColor="#888"
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={updating}>
          {updating ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  topBarTitle: {
    color: '#ffc107',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backBtn: {
    padding: 5,
  },
  backBtnText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  sectionHeader: {
    color: '#ffc107',
    fontSize: 16,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 8,
    marginBottom: 12,
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
  },
  label: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 10,
    borderRadius: 4,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#ffc107',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
