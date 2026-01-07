import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { AuthProvider } from '../src/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { notificationService } from '../src/services/notifications';
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  useEffect(() => {
    // Initialize push notifications
    notificationService.initialize().then((token) => {
      if (token) {
        console.log('Push token:', token);
      }
    });

    // Handle notification received while app is open
    notificationService.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Handle notification tap
    notificationService.addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      handleNotificationTap(data);
    });

    return () => {
      notificationService.removeListeners();
    };
  }, []);

  const handleNotificationTap = (data: Record<string, any>) => {
    switch (data?.type) {
      case 'job_alert':
      case 'job_accepted':
        router.push('/(tabs)/jobs');
        break;
      case 'message':
        Alert.alert('Messages', 'Opening chat...');
        break;
      case 'payment':
        router.push('/(tabs)/profile');
        break;
      case 'reminder':
        router.push('/(tabs)/tracking');
        break;
      default:
        router.push('/(tabs)/home');
    }
  };

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1f2937' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#111827' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
