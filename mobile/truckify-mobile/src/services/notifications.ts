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

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  async initialize(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Request permissions
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
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Replace with actual Expo project ID
      });
      this.expoPushToken = tokenData.data;

      // Send token to backend
      await this.registerTokenWithServer(this.expoPushToken);

      // Configure Android channel
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

      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  private async registerTokenWithServer(token: string): Promise<void> {
    try {
      await api.registerPushToken(token, Platform.OS);
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): void {
    this.notificationListener = Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): void {
    this.responseListener = Notifications.addNotificationResponseReceivedListener(callback);
  }

  removeListeners(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Schedule a local notification
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: trigger || null, // null = immediate
    });
  }

  // Cancel a scheduled notification
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  getToken(): string | null {
    return this.expoPushToken;
  }
}

export const notificationService = new NotificationService();

// Helper to send test notifications (for development)
export async function sendTestNotification(type: NotificationType): Promise<void> {
  const notifications: Record<NotificationType, PushNotification> = {
    job_alert: {
      title: '🚛 New Job Available!',
      body: 'Sydney → Melbourne, $1,250 - 878km',
      data: { type: 'job_alert', jobId: '123' },
    },
    job_accepted: {
      title: '✅ Job Accepted',
      body: 'Your bid for Job #456 has been accepted',
      data: { type: 'job_accepted', jobId: '456' },
    },
    message: {
      title: '💬 New Message',
      body: 'John from ABC Logistics: "What\'s your ETA?"',
      data: { type: 'message', chatId: '789' },
    },
    payment: {
      title: '💰 Payment Received',
      body: '$1,250 has been deposited to your account',
      data: { type: 'payment', amount: 1250 },
    },
    reminder: {
      title: '⏰ Pickup Reminder',
      body: 'Job #123 pickup in 30 minutes at Sydney CBD',
      data: { type: 'reminder', jobId: '123' },
    },
    system: {
      title: '📢 System Update',
      body: 'New features available! Update your app.',
      data: { type: 'system' },
    },
  };

  const notification = notifications[type];
  await notificationService.scheduleLocalNotification(
    notification.title,
    notification.body,
    notification.data
  );
}
