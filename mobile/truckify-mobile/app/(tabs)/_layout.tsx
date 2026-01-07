import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useEffect } from 'react';
import { loadLocale } from '../../src/services/i18n';

const TabIcon = ({ icon, label, focused }: { icon: string; label: string; focused: boolean }) => (
  <View style={{ alignItems: 'center', paddingTop: 8 }}>
    <Text style={{ fontSize: 22 }}>{icon}</Text>
    <Text style={{ fontSize: 9, color: focused ? '#3b82f6' : '#6b7280', marginTop: 2 }}>{label}</Text>
  </View>
);

export default function TabsLayout() {
  useEffect(() => { loadLocale(); }, []);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1f2937' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#1f2937', borderTopColor: '#374151', height: 65, paddingBottom: 6 },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused }) => <TabIcon icon="📦" label="Jobs" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tracking"
        options={{
          title: 'Track',
          tabBarIcon: ({ focused }) => <TabIcon icon="📍" label="Track" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Docs',
          tabBarIcon: ({ focused }) => <TabIcon icon="📄" label="Docs" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ focused }) => <TabIcon icon="💰" label="Pay" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => <TabIcon icon="💬" label="Chat" focused={focused} />,
          href: null, // Hide from tab bar, access from home
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔔" label="Alerts" focused={focused} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
