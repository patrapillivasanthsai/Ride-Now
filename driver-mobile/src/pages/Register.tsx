import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Image
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { VehicleCard, VehicleOption } from '../components/VehicleCard';
import { AppButton } from '../components/AppButton';

interface RegisterProps {
  onBackToLogin: () => void;
}

export function Register({ onBackToLogin }: RegisterProps) {
  const { theme } = useTheme();
  const { login } = useAuth();
  const { t } = useLanguage();

  // Multi-step progress (Step 1 to 4)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Personal Details (Starts cleanly with empty fields)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  // Step 2: Vehicle Selection & Specs (Starts with empty fields)
  const [vehicleType, setVehicleType] = useState<'BIKE' | 'AUTO' | 'CAB'>('BIKE');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');

  // Step 3: Profile Photo / Selfie & Default Avatar
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [useDefaultAvatar, setUseDefaultAvatar] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

  // Step 4: Payout Setup (Starts cleanly with empty fields)
  const [payoutTab, setPayoutTab] = useState<'BANK' | 'UPI'>('BANK');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const startCamera = async () => {
    setUseDefaultAvatar(false);
    try {
      const nav: any = (globalThis as any).navigator;
      if (nav && nav.mediaDevices && nav.mediaDevices.getUserMedia) {
        setCameraActive(true);
        const stream = await nav.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        openDeviceCameraInput();
      }
    } catch {
      openDeviceCameraInput();
    }
  };

  const openDeviceCameraInput = () => {
    const doc: any = (globalThis as any).document;
    if (!doc) return;
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
          if (re.target?.result) {
            setSelfieUri(re.target.result as string);
            setUseDefaultAvatar(false);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const capturePhoto = () => {
    const doc: any = (globalThis as any).document;
    if (videoRef.current && doc) {
      try {
        const canvas = doc.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 320;
        canvas.height = videoRef.current.videoHeight || 320;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          setSelfieUri(dataUrl);
          stopCameraStream();
        }
      } catch {
        stopCameraStream();
      }
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: any) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Step 1 Validation
  const handleStep1Continue = () => {
    if (!name.trim()) {
      setError(t.enterFullName || 'Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setError(t.enterMobile || 'Please enter your mobile number.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError(t.enterEmail || 'Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError(t.enterPassword || 'Password must be at least 6 characters.');
      return;
    }
    if (!dob.trim()) {
      setError(t.enterDOB || 'Please enter your date of birth.');
      return;
    }
    setError(null);
    setStep(2);
  };

  // Step 2 Validation
  const handleStep2Continue = () => {
    if (!make.trim()) {
      setError(t.enterVehicleMake || 'Please enter vehicle make (e.g. Honda / Maruti).');
      return;
    }
    if (!model.trim()) {
      setError(t.enterVehicleModel || 'Please enter vehicle model (e.g. Activa / Swift).');
      return;
    }
    if (!year.trim() || isNaN(Number(year))) {
      setError(t.enterVehicleYear || 'Please enter a valid registration year.');
      return;
    }
    if (!plateNumber.trim()) {
      setError(t.enterPlateNumber || 'Please enter vehicle license plate number.');
      return;
    }
    setError(null);
    setStep(3);
  };

  // Step 3 Validation
  const handleStep3Continue = () => {
    if (!selfieUri && !useDefaultAvatar) {
      setError(t.selfieRequired || 'Please take a selfie photo or select the default profile avatar.');
      return;
    }
    stopCameraStream();
    setError(null);
    setStep(4);
  };

  // Step 4: Final Payout Submission & Registration
  const handleFinalSubmit = async () => {
    if (payoutTab === 'BANK') {
      if (!accountHolderName.trim()) {
        setError('Please enter account holder name.');
        return;
      }
      if (!bankName.trim()) {
        setError('Please enter bank name.');
        return;
      }
      if (!accountNumber.trim()) {
        setError('Please enter bank account number.');
        return;
      }
      if (accountNumber.trim() !== confirmAccountNumber.trim()) {
        setError('Account numbers do not match. Please verify.');
        return;
      }
      if (!ifscCode.trim()) {
        setError('Please enter IFSC code.');
        return;
      }
    } else {
      if (!upiId.trim() || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. captain@okaxis).');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const regData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
        licenseNumber: 'DL-' + Math.floor(10000000 + Math.random() * 90000000),
        vehicle: {
          make: make.trim(),
          model: model.trim(),
          year: parseInt(year.trim()) || 2023,
          color: color.trim() || 'Black',
          plateNumber: plateNumber.trim().toUpperCase(),
          type: vehicleType,
        }
      };

      const result = await api.registerDriver(regData);

      // Establish authenticated session
      let authToken = result?.token;
      let authUser = result?.user;

      if (!authToken) {
        // Fallback: login immediately to acquire JWT token
        const loginRes = await api.login(email.trim().toLowerCase(), password);
        authToken = loginRes.token;
        authUser = loginRes.user;
      }

      if (authToken && authUser) {
        await login(authToken, authUser);
      }

      // Save payout details with active token
      if (payoutTab === 'BANK') {
        try {
          await api.savePayoutSetup({
            type: 'BANK_ACCOUNT',
            accountHolderName: accountHolderName.trim(),
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
            ifscCode: ifscCode.trim().toUpperCase()
          });
        } catch (payoutErr: any) {
          console.warn('Payout save notice:', payoutErr.message);
        }
      } else {
        try {
          await api.savePayoutSetup({
            type: 'UPI',
            upiId: upiId.trim()
          });
        } catch (payoutErr: any) {
          console.warn('Payout save notice:', payoutErr.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const vehicleOptions: VehicleOption[] = [
    {
      type: 'BIKE',
      title: t.bikeTitle || 'Bike / Two-Wheeler',
      category: 'Bike',
      icon: '🏍️',
      desc: t.bikeSubtitle || 'Fast city rides & food deliveries',
      rateEstimate: '1.0x Base Fare'
    },
    {
      type: 'AUTO',
      title: t.autoTitle || 'Auto / Three-Wheeler',
      category: 'Auto',
      icon: '🛺',
      desc: t.autoSubtitle || 'Reliable daily urban transit',
      rateEstimate: '1.4x Base Fare'
    },
    {
      type: 'CAB',
      title: t.cabTitle || 'Cab / Four-Wheeler',
      category: 'Cab',
      icon: '🚗',
      desc: t.cabSubtitle || 'Comfortable AC rides & outstation',
      rateEstimate: '2.0x Base Fare'
    },
  ];

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]} keyboardShouldPersistTaps="handled">
      {/* Top Header with segmented 4-bar progress */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={step === 1 ? onBackToLogin : () => setStep((s) => (s - 1) as any)} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: '#00b562' }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.stepIndicator, { color: '#00b562' }]}>Step {step} of 4</Text>
      </View>

      {/* 4-Bar Progress Indicator */}
      <View style={styles.segmentedProgressBar}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={[
              styles.progressSegment,
              { backgroundColor: s <= step ? '#00b562' : 'rgba(255, 255, 255, 0.1)' }
            ]}
          />
        ))}
      </View>

      {/* Error banner */}
      {error && <Text style={styles.errorText}>⚠️ {error}</Text>}

      {/* ==================================================== */}
      {/* STEP 1: PERSONAL DETAILS                             */}
      {/* ==================================================== */}
      {step === 1 && (
        <View style={styles.stepContainer}>
          <View style={styles.headerBlock}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>{t.step1Title || 'Step 1: Details'}</Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              {t.step1Subtitle || 'Enter your basic personal information to create your Captain profile.'}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>{t.fullNameLabel || 'Full Name'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder={t.fullNamePlaceholder || 'Enter your legal full name'}
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={(v) => { setName(v); if (error) setError(null); }}
            />

            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 14 }]}>{t.mobileLabel || 'Mobile Number'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder={t.mobilePlaceholder || '+91 XXXXX XXXXX'}
              placeholderTextColor={theme.textMuted}
              value={phone}
              onChangeText={(v) => { setPhone(v); if (error) setError(null); }}
              keyboardType="phone-pad"
            />

            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 14 }]}>{t.emailLabel || 'Email Address'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder={t.emailPlaceholder || 'captain@gmail.com'}
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={(v) => { setEmail(v); if (error) setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 14 }]}>{t.passwordLabel || 'Create Password'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder={t.passwordPlaceholder || 'Min 6 characters'}
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={(v) => { setPassword(v); if (error) setError(null); }}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 14 }]}>{t.dobLabel || 'Date of Birth'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder={t.dobPlaceholder || 'YYYY-MM-DD (e.g. 1995-08-20)'}
              placeholderTextColor={theme.textMuted}
              value={dob}
              onChangeText={(v) => { setDob(v); if (error) setError(null); }}
            />

            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 14 }]}>{t.genderLabel || 'Gender'}</Text>
            <View style={styles.genderRow}>
              {(['Male', 'Female', 'Other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderPill,
                    { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                    gender === g && { backgroundColor: 'rgba(0, 181, 98, 0.15)', borderColor: '#00b562' }
                  ]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderText, { color: theme.textMuted }, gender === g && { color: '#00b562', fontWeight: '800' }]}>
                    {g === 'Male' ? '👨 Male' : g === 'Female' ? '👩 Female' : '🧑 Other'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <AppButton
            title={t.continueBtn || 'Continue to Next Step'}
            onPress={handleStep1Continue}
            style={{ marginTop: 20 }}
          />
        </View>
      )}

      {/* ==================================================== */}
      {/* STEP 2: CHOOSE VEHICLE                               */}
      {/* ==================================================== */}
      {step === 2 && (
        <View style={styles.stepContainer}>
          <View style={styles.headerBlock}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>{t.step2Title || 'Step 2: Choose Vehicle'}</Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              {t.step2Subtitle || 'Select your vehicle category and provide the vehicle specifications.'}
            </Text>
          </View>

          <View style={{ gap: 10, marginBottom: 16 }}>
            {vehicleOptions.map((opt) => (
              <VehicleCard
                key={opt.type}
                option={opt}
                selected={vehicleType === opt.type}
                onSelect={(type) => setVehicleType(type)}
              />
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Vehicle Make / Brand</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. Honda / Maruti / Bajaj"
              placeholderTextColor={theme.textMuted}
              value={make}
              onChangeText={(v) => { setMake(v); if (error) setError(null); }}
            />

            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 12 }]}>Vehicle Model</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. Activa 6G / Swift / RE Compact"
              placeholderTextColor={theme.textMuted}
              value={model}
              onChangeText={(v) => { setModel(v); if (error) setError(null); }}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Reg. Year</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                  placeholder="2023"
                  placeholderTextColor={theme.textMuted}
                  value={year}
                  onChangeText={(v) => { setYear(v); if (error) setError(null); }}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Color</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                  placeholder="e.g. Black"
                  placeholderTextColor={theme.textMuted}
                  value={color}
                  onChangeText={(v) => { setColor(v); if (error) setError(null); }}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 12 }]}>License Plate Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="KA-01-EQ-4821"
              placeholderTextColor={theme.textMuted}
              value={plateNumber}
              onChangeText={(v) => { setPlateNumber(v); if (error) setError(null); }}
              autoCapitalize="characters"
            />
          </View>

          <AppButton
            title={t.continueBtn || 'Continue to Next Step'}
            onPress={handleStep2Continue}
            style={{ marginTop: 20 }}
          />
        </View>
      )}

      {/* ==================================================== */}
      {/* STEP 3: PROFILE PHOTO (CAMERA & DEFAULT AVATAR)       */}
      {/* ==================================================== */}
      {step === 3 && (
        <View style={styles.stepContainer}>
          <View style={styles.headerBlock}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>{t.step3Title || 'Step 3: Profile Photo'}</Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              {t.step3Subtitle || 'Take a selfie photo or choose to use the default profile avatar.'}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, alignItems: 'center' }]}>
            {/* Live Camera Stream Container */}
            {cameraActive ? (
              <View style={styles.cameraLiveContainer}>
                <video
                  ref={videoRef}
                  style={{ width: 240, height: 240, borderRadius: 120, objectFit: 'cover' }}
                  playsInline
                  autoPlay
                  muted
                />
                <TouchableOpacity style={styles.shutterBtn} onPress={capturePhoto}>
                  <View style={styles.shutterInner} />
                </TouchableOpacity>
              </View>
            ) : selfieUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selfieUri }} style={styles.selfieImage} />
                <TouchableOpacity
                  style={[styles.retakeBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                  onPress={startCamera}
                >
                  <Text style={{ color: '#00b562', fontWeight: '800', fontSize: 13 }}>📷 Retake Selfie</Text>
                </TouchableOpacity>
              </View>
            ) : useDefaultAvatar ? (
              <View style={styles.previewContainer}>
                <View style={[styles.defaultAvatarCircle, { backgroundColor: 'rgba(0, 181, 98, 0.15)', borderColor: '#00b562' }]}>
                  <Text style={{ fontSize: 56 }}>👨‍✈️</Text>
                </View>
                <Text style={{ color: '#00b562', fontWeight: '800', marginTop: 10 }}>Default Captain Avatar Selected</Text>
              </View>
            ) : (
              <View style={styles.previewContainer}>
                <View style={[styles.defaultAvatarCircle, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                  <Text style={{ fontSize: 48 }}>👤</Text>
                </View>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                  Please take a selfie or choose default avatar
                </Text>
              </View>
            )}

            {/* Direct Action Buttons */}
            <View style={{ width: '100%', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={[
                  styles.choiceButton,
                  cameraActive && { borderColor: '#00b562', backgroundColor: 'rgba(0, 181, 98, 0.1)' }
                ]}
                onPress={startCamera}
              >
                <Text style={{ fontSize: 20, marginRight: 10 }}>📷</Text>
                <Text style={styles.choiceButtonText}>Take Selfie (Mobile Camera)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.choiceButton,
                  useDefaultAvatar && { borderColor: '#00b562', backgroundColor: 'rgba(0, 181, 98, 0.1)' }
                ]}
                onPress={() => {
                  stopCameraStream();
                  setSelfieUri(null);
                  setUseDefaultAvatar(true);
                  if (error) setError(null);
                }}
              >
                <Text style={{ fontSize: 20, marginRight: 10 }}>👨‍✈️</Text>
                <Text style={styles.choiceButtonText}>Use Default Profile Avatar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <AppButton
            title={t.continueBtn || 'Continue to Next Step'}
            onPress={handleStep3Continue}
            style={{ marginTop: 20 }}
          />
        </View>
      )}

      {/* ==================================================== */}
      {/* STEP 4: BANK & PAYOUT DETAILS (FINAL SUBMISSION)     */}
      {/* ==================================================== */}
      {step === 4 && (
        <View style={styles.stepContainer}>
          <View style={styles.headerBlock}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>{t.step5Title || 'Step 4: Payout Details'}</Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              {t.step5Subtitle || 'Link your Bank Account or UPI ID to receive instant earnings.'}
            </Text>
          </View>

          {/* Bank / UPI Toggle */}
          <View style={[styles.payoutTabs, { backgroundColor: theme.cardSecondary }]}>
            <TouchableOpacity
              onPress={() => setPayoutTab('BANK')}
              style={[
                styles.payoutTabBtn,
                payoutTab === 'BANK' && { backgroundColor: theme.card, borderColor: '#00b562', borderWidth: 1 }
              ]}
            >
              <Text style={[styles.payoutTabText, { color: payoutTab === 'BANK' ? '#00b562' : theme.textMuted }]}>
                {payoutTab === 'BANK' ? '✓ ' : ''}{t.bankAccountTab || 'Bank Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPayoutTab('UPI')}
              style={[
                styles.payoutTabBtn,
                payoutTab === 'UPI' && { backgroundColor: theme.card, borderColor: '#00b562', borderWidth: 1 }
              ]}
            >
              <Text style={[styles.payoutTabText, { color: payoutTab === 'UPI' ? '#00b562' : theme.textMuted }]}>
                {payoutTab === 'UPI' ? '✓ ' : ''}{t.upiTab || 'UPI ID'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          {payoutTab === 'BANK' ? (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>{t.accountHolderLabel || 'Account Holder Name'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder={t.accountHolderPlaceholder || 'Enter full name on bank account'}
                placeholderTextColor={theme.textMuted}
                value={accountHolderName}
                onChangeText={(v) => { setAccountHolderName(v); if (error) setError(null); }}
              />

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 12 }]}>{t.bankNameLabel || 'Bank Name'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder={t.bankNamePlaceholder || 'e.g. HDFC Bank, SBI, ICICI'}
                placeholderTextColor={theme.textMuted}
                value={bankName}
                onChangeText={(v) => { setBankName(v); if (error) setError(null); }}
              />

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 12 }]}>{t.accountNumberLabel || 'Account Number'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder={t.accountNumberPlaceholder || 'Enter bank account number'}
                placeholderTextColor={theme.textMuted}
                value={accountNumber}
                onChangeText={(v) => { setAccountNumber(v); if (error) setError(null); }}
                keyboardType="number-pad"
              />

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 12 }]}>{t.confirmAccountLabel || 'Confirm Account Number'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder={t.confirmAccountPlaceholder || 'Re-enter account number'}
                placeholderTextColor={theme.textMuted}
                value={confirmAccountNumber}
                onChangeText={(v) => { setConfirmAccountNumber(v); if (error) setError(null); }}
                keyboardType="number-pad"
              />

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 12 }]}>{t.ifscLabel || 'IFSC Code'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder={t.ifscPlaceholder || 'e.g. HDFC0000123'}
                placeholderTextColor={theme.textMuted}
                value={ifscCode}
                onChangeText={(v) => { setIfscCode(v); if (error) setError(null); }}
                autoCapitalize="characters"
              />
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>{t.upiIdLabel || 'UPI ID'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder={t.upiIdPlaceholder || 'e.g. captain@okaxis / 9876543210@paytm'}
                placeholderTextColor={theme.textMuted}
                value={upiId}
                onChangeText={(v) => { setUpiId(v); if (error) setError(null); }}
                autoCapitalize="none"
              />
            </View>
          )}

          <AppButton
            title={t.verifyAndContinue || 'Verify & Complete Registration'}
            onPress={handleFinalSubmit}
            loading={loading}
            style={{ marginTop: 20 }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  stepIndicator: {
    fontSize: 13,
    fontWeight: '800',
  },
  segmentedProgressBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
  },
  headerBlock: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cameraLiveContainer: {
    alignItems: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  shutterBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00b562',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  shutterInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  selfieImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#00b562',
  },
  retakeBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  defaultAvatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101a38',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e2c56',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  choiceButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  payoutTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  payoutTabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  payoutTabText: {
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
});
