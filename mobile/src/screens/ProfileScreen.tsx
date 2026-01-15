import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout, enableBiometric, isBiometricAvailable, isBiometricEnabled } = useAuth();
  const [biometricToggle, setBiometricToggle] = useState(isBiometricEnabled);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value && !isBiometricEnabled) {
      Alert.prompt(
        'Enable Biometric Login',
        'Enter your password to enable biometric login',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async (password) => {
              if (password) {
                try {
                  await enableBiometric(password);
                  setBiometricToggle(true);
                  Alert.alert('Success', 'Biometric login enabled');
                } catch (error) {
                  Alert.alert('Error', 'Failed to enable biometric login');
                }
              }
            },
          },
        ],
        'secure-text'
      );
    } else {
      setBiometricToggle(value);
    }
  };

  const profileSections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Personal Information',
          value: user?.email,
          onPress: () => Alert.alert('Coming Soon', 'Edit profile feature coming soon'),
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Account Type',
          value: user?.user_type?.replace('_', ' ').toUpperCase(),
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: 'finger-print',
          label: 'Biometric Login',
          value: isBiometricAvailable ? (
            <Switch
              value={biometricToggle}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: '#262626', true: '#22c55e' }}
              thumbColor="#fff"
            />
          ) : (
            <Text style={styles.unavailableText}>Not Available</Text>
          ),
        },
        {
          icon: 'lock-closed-outline',
          label: 'Change Password',
          onPress: () => Alert.alert('Coming Soon', 'Change password feature coming soon'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Push Notifications',
          value: (
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#262626', true: '#22c55e' }}
              thumbColor="#fff"
            />
          ),
        },
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          value: <Text style={styles.activeText}>Always On</Text>,
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'App Version',
          value: '1.0.0',
        },
        {
          icon: 'document-text-outline',
          label: 'Terms & Conditions',
          onPress: () => Alert.alert('Coming Soon', 'Terms & Conditions coming soon'),
        },
        {
          icon: 'shield-outline',
          label: 'Privacy Policy',
          onPress: () => Alert.alert('Coming Soon', 'Privacy Policy coming soon'),
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={48} color="#fff" />
        </View>
        <Text style={styles.name}>{user?.email?.split('@')[0] || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Sections */}
      {profileSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.card}>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={item.onPress}
                  disabled={!item.onPress}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.iconContainer}>
                      <Ionicons name={item.icon as any} size={20} color="#6b7280" />
                    </View>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    {typeof item.value === 'string' ? (
                      <Text style={styles.rowValue}>{item.value}</Text>
                    ) : (
                      item.value
                    )}
                    {item.onPress && (
                      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                    )}
                  </View>
                </TouchableOpacity>
                {itemIndex < section.items.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#171717',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'right',
  },
  activeText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  unavailableText: {
    fontSize: 14,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#262626',
    marginLeft: 68,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});
