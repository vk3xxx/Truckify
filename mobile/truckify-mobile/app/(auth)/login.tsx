import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { biometricService } from '../../src/services/biometric';
import { passkeyService } from '../../src/services/passkey';
import { Passkey } from 'react-native-passkey';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const { login, loginWithBiometric, loginWithPasskey, biometricEnabled, biometricType, isOnline } = useAuth();

  useEffect(() => {
    checkAuthMethods();
  }, []);

  const checkAuthMethods = async () => {
    // Check biometric
    const bioSupported = await biometricService.isSupported();
    setBiometricAvailable(bioSupported && biometricEnabled);

    // Check passkey
    const passSupported = passkeyService.isPasskeySupported();
    setPasskeyAvailable(passSupported);
    
    if (passSupported) {
      const hasKey = await passkeyService.hasPasskey();
      setHasPasskey(hasKey);
    }

    // Auto-prompt biometric if available
    if (bioSupported && biometricEnabled) {
      handleBiometricLogin();
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const success = await loginWithBiometric();
      if (success) {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Passkey login requires internet connection');
      return;
    }

    setLoading(true);
    try {
      // Get challenge from server
      const challenge = await passkeyService.beginAuthentication();

      // Create passkey assertion
      const result = await Passkey.authenticate({
        challenge: challenge.challenge,
        rpId: challenge.rpId,
        allowCredentials: challenge.allowCredentials?.map(c => ({
          id: c.id,
          type: 'public-key' as const,
        })),
        userVerification: 'preferred',
      });

      // Send to server for verification
      const authResult = await passkeyService.completeAuthentication({
        id: result.id,
        rawId: result.rawId,
        type: 'public-key',
        response: {
          clientDataJSON: result.response.clientDataJSON,
          authenticatorData: result.response.authenticatorData,
          signature: result.response.signature,
          userHandle: result.response.userHandle,
        },
      });

      if (authResult.success) {
        await loginWithPasskey(authResult.data);
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      if (error.message?.includes('cancel')) {
        // User cancelled
      } else {
        Alert.alert('Passkey Login Failed', error.message || 'Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Offline Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>📡 You're offline</Text>
          </View>
        )}

        <Text style={styles.logo}>🚛 Truckify</Text>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {/* Passkey Login */}
        {passkeyAvailable && hasPasskey && (
          <TouchableOpacity style={styles.passkeyButton} onPress={handlePasskeyLogin} disabled={loading || !isOnline}>
            <Text style={styles.passkeyIcon}>🔑</Text>
            <Text style={styles.passkeyText}>Sign in with Passkey</Text>
          </TouchableOpacity>
        )}

        {/* Biometric Login */}
        {biometricAvailable && (
          <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin} disabled={loading}>
            <Text style={styles.biometricIcon}>{biometricType === 'Face ID' ? '😊' : '👆'}</Text>
            <Text style={styles.biometricText}>Sign in with {biometricType}</Text>
          </TouchableOpacity>
        )}

        {(passkeyAvailable && hasPasskey) || biometricAvailable ? (
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or use password</Text>
            <View style={styles.dividerLine} />
          </View>
        ) : null}

        <View style={styles.form}>
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
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6b7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign Up</Text>
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
  offlineBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  offlineText: { color: '#000', fontWeight: '600' },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#9ca3af', textAlign: 'center', marginBottom: 24 },
  passkeyButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  passkeyIcon: { fontSize: 24 },
  passkeyText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  biometricButton: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  biometricIcon: { fontSize: 28 },
  biometricText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#374151' },
  dividerText: { color: '#6b7280', paddingHorizontal: 12, fontSize: 14 },
  form: { gap: 16 },
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
