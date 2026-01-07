import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { passkeyService } from '../../src/services/passkey';
import { Passkey } from 'react-native-passkey';

const USER_TYPES = [
  { id: 'driver', label: '🚛 Driver', desc: 'Deliver freight' },
  { id: 'shipper', label: '📦 Shipper', desc: 'Ship goods' },
  { id: 'fleet_operator', label: '🏢 Fleet Operator', desc: 'Manage fleet' },
  { id: 'dispatcher', label: '📋 Dispatcher', desc: 'Coordinate loads' },
];

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('driver');
  const [loading, setLoading] = useState(false);
  const [usePasskey, setUsePasskey] = useState(false);
  const { register, registerWithPasskey, isOnline } = useAuth();

  const passkeySupported = passkeyService.isPasskeySupported();

  const handleRegister = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!usePasskey && !password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    setLoading(true);
    try {
      if (usePasskey) {
        await handlePasskeyRegister();
      } else {
        await register(email, password, userType);
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyRegister = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Passkey registration requires internet connection');
      return;
    }

    try {
      // Get challenge from server
      const challenge = await passkeyService.beginRegistration(email);

      // Create passkey
      const result = await Passkey.register({
        challenge: challenge.challenge,
        rp: {
          id: challenge.rpId,
          name: challenge.rpName,
        },
        user: {
          id: challenge.userId!,
          name: challenge.userName!,
          displayName: challenge.userDisplayName!,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          residentKey: 'preferred',
        },
        timeout: challenge.timeout || 60000,
      });

      // Send to server
      const regResult = await passkeyService.completeRegistration(email, {
        id: result.id,
        rawId: result.rawId,
        type: 'public-key',
        response: {
          clientDataJSON: result.response.clientDataJSON,
          attestationObject: result.response.attestationObject,
        },
      });

      if (regResult.success) {
        await registerWithPasskey(regResult.data, userType);
        Alert.alert('Success', 'Account created with passkey!', [
          { text: 'Continue', onPress: () => router.replace('/(tabs)/home') }
        ]);
      }
    } catch (error: any) {
      if (error.message?.includes('cancel')) {
        setUsePasskey(false);
      } else {
        throw error;
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🚛 Truckify</Text>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the trucking network</Text>

        <View style={styles.form}>
          <Text style={styles.label}>I am a...</Text>
          <View style={styles.typeGrid}>
            {USER_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typeCard, userType === type.id && styles.typeCardActive]}
                onPress={() => setUserType(type.id)}
              >
                <Text style={styles.typeLabel}>{type.label}</Text>
                <Text style={styles.typeDesc}>{type.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6b7280"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          {/* Passkey Option */}
          {passkeySupported && isOnline && (
            <TouchableOpacity
              style={[styles.passkeyOption, usePasskey && styles.passkeyOptionActive]}
              onPress={() => setUsePasskey(!usePasskey)}
            >
              <Text style={styles.passkeyIcon}>🔑</Text>
              <View style={styles.passkeyInfo}>
                <Text style={styles.passkeyTitle}>Use Passkey instead of password</Text>
                <Text style={styles.passkeyDesc}>More secure, no password to remember</Text>
              </View>
              <View style={[styles.checkbox, usePasskey && styles.checkboxActive]}>
                {usePasskey && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          )}

          {!usePasskey && (
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#6b7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          )}

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Creating...' : usePasskey ? 'Create with Passkey' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#9ca3af', textAlign: 'center', marginBottom: 24 },
  form: { gap: 16 },
  label: { color: '#9ca3af', fontSize: 14, marginBottom: 4 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeCard: {
    width: '47%',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#374151',
  },
  typeCardActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  typeLabel: { fontSize: 16, color: '#fff', fontWeight: '600' },
  typeDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#374151',
  },
  passkeyOption: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#374151',
  },
  passkeyOptionActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#1e1b4b',
  },
  passkeyIcon: { fontSize: 28 },
  passkeyInfo: { flex: 1 },
  passkeyTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  passkeyDesc: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#9ca3af', fontSize: 16 },
  link: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
});
