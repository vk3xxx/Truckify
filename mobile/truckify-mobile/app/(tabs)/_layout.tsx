import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

const TabIcon = ({ icon, label, focused }: { icon: string; label: string; focused: boolean }) => (
  <View style={{ alignItems: 'center', paddingTop: 8 }}>
    <Text style={{ fontSize: 24 }}>{icon}</Text>
    <Text style={{ fontSize: 10, color: focused ? '#3b82f6' : '#6b7280', marginTop: 2 }}>{label}</Text>
  </View>
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1f2937' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#1f2937', borderTopColor: '#374151', height: 70, paddingBottom: 8 },
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
          title: 'Tracking',
          tabBarIcon: ({ focused }) => <TabIcon icon="📍" label="Track" focused={focused} />,
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
