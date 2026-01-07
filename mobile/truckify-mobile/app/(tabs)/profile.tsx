import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { router } from 'expo-router';

export default function Profile() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const handleMenuPress = (item: string) => {
    switch (item) {
      case 'Edit Profile':
        Alert.alert('Edit Profile', 'Profile editing coming soon');
        break;
      case 'My Vehicles':
        Alert.alert('My Vehicles', 'No vehicles registered\n\nTap to add a vehicle', [
          { text: 'Cancel' },
          { text: 'Add Vehicle', onPress: () => Alert.alert('Add Vehicle', 'Vehicle registration coming soon') }
        ]);
        break;
      case 'Documents':
        Alert.alert('Documents', '📄 Driver License: Verified\n📄 Insurance: Pending\n📄 Registration: Verified');
        break;
      case 'Payment Methods':
        Alert.alert('Payment Methods', '💳 •••• 4242 (Default)\n\nTap to manage', [
          { text: 'Close' },
          { text: 'Add Card', onPress: () => Alert.alert('Add Card', 'Payment setup coming soon') }
        ]);
        break;
      case 'Earnings History':
        Alert.alert('Earnings History', 'This Week: $850\nLast Week: $1,200\nThis Month: $4,250\n\nTotal Earned: $12,450');
        break;
      case 'Settings':
        Alert.alert('Settings', 'Notifications: On\nLocation: Always\nDark Mode: On');
        break;
      case 'Help & Support':
        Alert.alert('Help & Support', 'Email: support@truckify.com\nPhone: 1800-TRUCK\n\nFAQ and guides available on our website');
        break;
    }
  };

  const menuItems = [
    { icon: '👤', label: 'Edit Profile' },
    { icon: '🚛', label: 'My Vehicles' },
    { icon: '📄', label: 'Documents' },
    { icon: '💳', label: 'Payment Methods' },
    { icon: '📊', label: 'Earnings History' },
    { icon: '⚙️', label: 'Settings' },
    { icon: '❓', label: 'Help & Support' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatar} onPress={() => Alert.alert('Change Photo', 'Photo upload coming soon')}>
          <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || '?'}</Text>
        </TouchableOpacity>
        <Text style={styles.name}>{user?.email?.split('@')[0] || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{user?.user_type?.replace('_', ' ').toUpperCase() || 'USER'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.stat} onPress={() => Alert.alert('Jobs', '47 completed jobs\n3 active jobs')}>
          <Text style={styles.statValue}>47</Text>
          <Text style={styles.statLabel}>Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stat} onPress={() => Alert.alert('Rating', '4.9 out of 5 stars\nBased on 42 reviews')}>
          <Text style={styles.statValue}>4.9</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stat} onPress={() => Alert.alert('Membership', 'Member since Jan 2024\nPremium status')}>
          <Text style={styles.statValue}>2yr</Text>
          <Text style={styles.statLabel}>Member</Text>
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

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Truckify v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { alignItems: 'center', paddingVertical: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  email: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  typeBadge: { backgroundColor: '#1e3a5f', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  typeText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1f2937', marginHorizontal: 20 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  menu: { padding: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 8 },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 16, color: '#fff' },
  menuArrow: { fontSize: 20, color: '#6b7280' },
  logoutButton: { marginHorizontal: 20, backgroundColor: '#7f1d1d', borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  version: { textAlign: 'center', color: '#4b5563', fontSize: 12, paddingVertical: 20 },
});
