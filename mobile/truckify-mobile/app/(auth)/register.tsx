import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

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
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, userType);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content}>
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
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6b7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
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
