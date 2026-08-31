import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { api } from '../services/api';

interface RegisterProps {
  onBackToLogin: () => void;
}

export function Register({ onBackToLogin }: RegisterProps) {
  // Personal Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Vehicle Info
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('BIKE'); // Default type

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validations
    if (!name.trim() || !email.trim() || !phone.trim() || !password || !licenseNumber.trim()) {
      Alert.alert('Required Info', 'Please fill in all personal and driver profile details.');
      return;
    }

    if (!make.trim() || !model.trim() || !year.trim() || !color.trim() || !plateNumber.trim()) {
      Alert.alert('Required Info', 'Please fill in all vehicle details.');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.registerDriver({
        email: email.trim(),
        password,
        phone: phone.trim(),
        name: name.trim(),
        licenseNumber: licenseNumber.trim(),
        vehicle: {
          make: make.trim(),
          model: model.trim(),
          year: parseInt(year.trim(), 10),
          color: color.trim(),
          plateNumber: plateNumber.trim(),
          type: vehicleType
        }
      });

      Alert.alert(
        'Onboarding Successful',
        'Your captain account has been registered. You are currently pending administrator approval. You can now sign in using your credentials.',
        [{ text: 'OK', onPress: onBackToLogin }]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Check inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
        <Text style={styles.backText}>&larr; Back to Login</Text>
      </TouchableOpacity>

      <Text style={styles.logo}>Become a Captain</Text>
      <Text style={styles.subtitle}>Register your details to start taking ride requests</Text>

      {/* Personal Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>👤 Personal Information</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Rajesh Kumar"
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. rajesh@email.com"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Mobile Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. +91 98765 43210"
          placeholderTextColor="#666"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Minimum 6 characters"
          placeholderTextColor="#666"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>Driving License Number</Text>
        <TextInput
          style={styles.input}
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          placeholder="e.g. DL-1420110068769"
          placeholderTextColor="#666"
          autoCapitalize="characters"
        />
      </View>

      {/* Vehicle Details */}
      <View style={[styles.card, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>🏍️ Vehicle Details</Text>

        <Text style={styles.label}>Vehicle Type</Text>
        <View style={styles.pickerContainer}>
          {['BIKE', 'AUTO', 'CAB'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.pickerButton, vehicleType === t && styles.pickerActive]}
              onPress={() => setVehicleType(t)}
            >
              <Text style={[styles.pickerText, vehicleType === t && styles.pickerActiveText]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Brand / Make</Text>
            <TextInput
              style={styles.input}
              value={make}
              onChangeText={setMake}
              placeholder="e.g. Honda"
              placeholderTextColor="#666"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Model</Text>
            <TextInput
              style={styles.input}
              value={model}
              onChangeText={setModel}
              placeholder="e.g. Activa"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Year</Text>
            <TextInput
              style={styles.input}
              value={year}
              onChangeText={setYear}
              placeholder="e.g. 2022"
              placeholderTextColor="#666"
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Color</Text>
            <TextInput
              style={styles.input}
              value={color}
              onChangeText={setColor}
              placeholder="e.g. Black"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <Text style={styles.label}>Registration Number (Plate)</Text>
        <TextInput
          style={styles.input}
          value={plateNumber}
          onChangeText={setPlateNumber}
          placeholder="e.g. KA-01-AB-1234"
          placeholderTextColor="#666"
          autoCapitalize="characters"
        />
      </View>

      <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.registerBtnText}>Submit Application</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#111',
    paddingBottom: 40
  },
  backButton: {
    marginTop: 10,
    marginBottom: 20
  },
  backText: {
    color: '#ffc107',
    fontSize: 14,
    fontWeight: 'bold'
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffc107',
    marginBottom: 6
  },
  subtitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 25,
    lineHeight: 18
  },
  card: {
    backgroundColor: '#222',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 8
  },
  label: {
    color: '#ccc',
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 6,
    marginTop: 12
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 10,
    borderRadius: 6,
    fontSize: 14
  },
  row: {
    flexDirection: 'row',
    marginTop: 4
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  pickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#222'
  },
  pickerActive: {
    borderColor: '#ffc107',
    backgroundColor: 'rgba(255, 193, 7, 0.1)'
  },
  pickerText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold'
  },
  pickerActiveText: {
    color: '#ffc107'
  },
  registerBtn: {
    backgroundColor: '#ffc107',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  registerBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16
  }
});
export default Register;
