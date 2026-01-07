import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { router } from 'expo-router';
import { offlineService } from '../../src/services/offline';
import { biometricService } from '../../src/services/biometric';
import { passkeyService } from '../../src/services/passkey';
import { Passkey } from 'react-native-passkey';
import { t, setLocale, getLocale, availableLocales } from '../../src/services/i18n';

export default function Profile() {
  const { user, logout, isOnline, biometricEnabled, biometricType, hasPasskey, enableBiometric, disableBiometric, removePasskey } = useAuth();
  const [queueCount, setQueueCount] = useState(0);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [currentLocale, setCurrentLocale] = useState(getLocale());

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    const count = await offlineService.getQueueCount();
    setQueueCount(count);
    setBiometricSupported(await biometricService.isSupported());
    setPasskeySupported(passkeyService.isPasskeySupported());
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const success = await enableBiometric();
      if (!success) Alert.alert('Failed', 'Could not enable biometric login');
    } else {
      await disableBiometric();
    }
  };

  const handleAddPasskey = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Passkey setup requires internet connection');
      return;
    }

    try {
      const challenge = await passkeyService.beginRegistration(user!.email);

      const result = await Passkey.register({
        challenge: challenge.challenge,
        rp: { id: challenge.rpId, name: challenge.rpName },
        user: { id: challenge.userId!, name: challenge.userName!, displayName: challenge.userDisplayName! },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'preferred', residentKey: 'preferred' },
        timeout: 60000,
      });

      await passkeyService.completeRegistration(user!.email, {
        id: result.id,
        rawId: result.rawId,
        type: 'public-key',
        response: { clientDataJSON: result.response.clientDataJSON, attestationObject: result.response.attestationObject },
      });

      Alert.alert('Success', 'Passkey added successfully!');
      loadStatus();
    } catch (error: any) {
      if (!error.message?.includes('cancel')) {
        Alert.alert('Failed', error.message || 'Could not add passkey');
      }
    }
  };

  const handleRemovePasskey = () => {
    Alert.alert('Remove Passkey', 'You will need to use password to login. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await removePasskey();
        Alert.alert('Done', 'Passkey removed');
      }},
    ]);
  };

  const handleSyncNow = async () => {
    if (!isOnline) { Alert.alert('Offline', 'Cannot sync while offline'); return; }
    const result = await offlineService.syncOfflineQueue();
    Alert.alert('Sync Complete', `Synced: ${result.synced}, Failed: ${result.failed}`);
    loadStatus();
  };

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'Remove all cached data?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await offlineService.clearCache(); Alert.alert('Done', 'Cache cleared'); }},
    ]);
  };

  const handleLanguageChange = async (locale: string) => {
    await setLocale(locale);
    setCurrentLocale(locale);
    setShowLanguage(false);
  };

  const handleMenuPress = (item: string) => {
    const messages: Record<string, string> = {
      'Edit Profile': 'Profile editing coming soon',
      'My Vehicles': 'No vehicles registered',
      'Documents': '📄 Driver License: Verified\n📄 Insurance: Pending',
      'Payment Methods': '💳 •••• 4242 (Default)',
      'Earnings History': 'This Week: $850\nThis Month: $4,250',
      'Help & Support': 'Email: support@truckify.com',
    };
    Alert.alert(item, messages[item]);
  };

  const menuItems = [
    { icon: '👤', label: 'Edit Profile' },
    { icon: '🚛', label: 'My Vehicles' },
    { icon: '📄', label: 'Documents' },
    { icon: '💳', label: 'Payment Methods' },
    { icon: '📊', label: 'Earnings History' },
    { icon: '❓', label: 'Help & Support' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Connection Status */}
      <View style={[styles.statusBar, isOnline ? styles.online : styles.offline]}>
        <Text style={styles.statusText}>{isOnline ? '🟢 Online' : '🔴 Offline'}{queueCount > 0 && ` • ${queueCount} pending`}</Text>
        {queueCount > 0 && isOnline && <TouchableOpacity onPress={handleSyncNow}><Text style={styles.syncText}>Sync Now</Text></TouchableOpacity>}
      </View>

      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || '?'}</Text></View>
        <Text style={styles.name}>{user?.email?.split('@')[0] || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.typeBadge}><Text style={styles.typeText}>{user?.user_type?.replace('_', ' ').toUpperCase() || 'USER'}</Text></View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statValue}>47</Text><Text style={styles.statLabel}>Jobs</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>4.9</Text><Text style={styles.statLabel}>Rating</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>2yr</Text><Text style={styles.statLabel}>Member</Text></View>
      </View>

      {/* Security Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        
        {/* Passkey */}
        {passkeySupported && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🔑 Passkey</Text>
              <Text style={styles.settingDesc}>{hasPasskey ? 'Passkey configured' : 'More secure than passwords'}</Text>
            </View>
            {hasPasskey ? (
              <TouchableOpacity onPress={handleRemovePasskey}><Text style={styles.removeText}>Remove</Text></TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.addButton} onPress={handleAddPasskey}><Text style={styles.addButtonText}>Add</Text></TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Biometric */}
        {biometricSupported && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{biometricType === 'Face ID' ? '😊' : '👆'} {biometricType}</Text>
              <Text style={styles.settingDesc}>Quick login with biometrics</Text>
            </View>
            <Switch value={biometricEnabled} onValueChange={handleBiometricToggle} trackColor={{ false: '#374151', true: '#22c55e' }} />
          </View>
        )}
      </View>

      {/* Data & Storage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Storage</Text>
        <TouchableOpacity style={styles.settingRow} onPress={handleClearCache}>
          <View style={styles.settingInfo}><Text style={styles.settingLabel}>🗑️ Clear Cache</Text><Text style={styles.settingDesc}>Remove cached data</Text></View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <TouchableOpacity style={styles.settingRow} onPress={() => setShowLanguage(true)}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>🌐 {availableLocales.find(l => l.code === currentLocale)?.name}</Text>
            <Text style={styles.settingDesc}>Change app language</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={() => handleMenuPress(item.label)}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutText}>🚪 {t('logout')}</Text></TouchableOpacity>
      <Text style={styles.version}>Truckify v1.0.0</Text>

      {/* Language Modal */}
      <Modal visible={showLanguage} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>
            {availableLocales.map((locale) => (
              <TouchableOpacity
                key={locale.code}
                style={[styles.langOption, currentLocale === locale.code && styles.langOptionActive]}
                onPress={() => handleLanguageChange(locale.code)}
              >
                <Text style={[styles.langText, currentLocale === locale.code && styles.langTextActive]}>{locale.name}</Text>
                {currentLocale === locale.code && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLanguage(false)}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 8 },
  online: { backgroundColor: '#14532d' },
  offline: { backgroundColor: '#7f1d1d' },
  statusText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  syncText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  header: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  email: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  typeBadge: { backgroundColor: '#1e3a5f', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  typeText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1f2937', marginHorizontal: 20 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase' },
  settingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 8 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, color: '#fff' },
  settingDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  addButton: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  removeText: { color: '#ef4444', fontWeight: '600' },
  menu: { padding: 16, paddingTop: 0 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 8 },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 16, color: '#fff' },
  menuArrow: { fontSize: 20, color: '#6b7280' },
  logoutButton: { marginHorizontal: 16, backgroundColor: '#7f1d1d', borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  version: { textAlign: 'center', color: '#4b5563', fontSize: 12, paddingVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1f2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  langOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#374151' },
  langOptionActive: { backgroundColor: '#1e3a5f' },
  langText: { color: '#fff', fontSize: 16 },
  langTextActive: { color: '#3b82f6', fontWeight: '600' },
  checkmark: { color: '#3b82f6', fontSize: 18 },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#6b7280', fontSize: 16 },
});
