import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type NotificationType = 'job_alert' | 'job_accepted' | 'message' | 'payment' | 'reminder' | 'system';

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
}

let expoPushToken: string | null = null;
let notificationListener: Notifications.Subscription | null = null;
let responseListener: Notifications.Subscription | null = null;

async function registerTokenWithServer(token: string): Promise<void> {
  try {
    await api.registerPushToken(token, Platform.OS);
  } catch (error) {
    console.error('Failed to register push token:', error);
  }
}

export const notificationService = {
  async initialize(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      // Get Expo push token
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        expoPushToken = tokenData.data;
        await registerTokenWithServer(expoPushToken);
      } catch (error) {
        console.log('Push token unavailable (dev mode):', error);
      }

      // Configure Android channels
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
        });

        await Notifications.setNotificationChannelAsync('jobs', {
          name: 'Job Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });
      }

      return expoPushToken;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return null;
    }
  },

  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void): void {
    notificationListener = Notifications.addNotificationReceivedListener(callback);
  },

  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void): void {
    responseListener = Notifications.addNotificationResponseReceivedListener(callback);
  },

  removeListeners(): void {
    if (notificationListener) Notifications.removeNotificationSubscription(notificationListener);
    if (responseListener) Notifications.removeNotificationSubscription(responseListener);
  },

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: trigger || null,
    });
  },

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  },

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  },

  getToken(): string | null {
    return expoPushToken;
  },
};

export async function sendTestNotification(type: NotificationType): Promise<void> {
  const notifications: Record<NotificationType, PushNotification> = {
    job_alert: { title: '🚛 New Job Available!', body: 'Sydney → Melbourne, $1,250', data: { type: 'job_alert', jobId: '123' } },
    job_accepted: { title: '✅ Job Accepted', body: 'Your bid for Job #456 has been accepted', data: { type: 'job_accepted', jobId: '456' } },
    message: { title: '💬 New Message', body: 'John: "What\'s your ETA?"', data: { type: 'message', chatId: '789' } },
    payment: { title: '💰 Payment Received', body: '$1,250 deposited', data: { type: 'payment', amount: 1250 } },
    reminder: { title: '⏰ Pickup Reminder', body: 'Job #123 pickup in 30 minutes', data: { type: 'reminder', jobId: '123' } },
    system: { title: '📢 System Update', body: 'New features available!', data: { type: 'system' } },
  };

  const n = notifications[type];
  await notificationService.scheduleLocalNotification(n.title, n.body, n.data);
}
