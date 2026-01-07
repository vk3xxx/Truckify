import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Switch } from 'react-native';
import { useState } from 'react';
import { sendTestNotification, NotificationType } from '../../src/services/notifications';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: '1', type: 'job_alert', title: '🚛 New Job Available!', body: 'Sydney → Melbourne, $1,250 - 878km', time: '5 min ago', read: false },
  { id: '2', type: 'message', title: '💬 New Message', body: 'John: "What\'s your ETA?"', time: '15 min ago', read: false },
  { id: '3', type: 'payment', title: '💰 Payment Received', body: '$450 deposited to your account', time: '2 hours ago', read: true },
  { id: '4', type: 'job_accepted', title: '✅ Job Accepted', body: 'Your bid for Job #456 accepted', time: '1 day ago', read: true },
  { id: '5', type: 'reminder', title: '⏰ Pickup Reminder', body: 'Job #789 pickup tomorrow at 8 AM', time: '1 day ago', read: true },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [settings, setSettings] = useState({
    jobAlerts: true,
    messages: true,
    payments: true,
    reminders: true,
  });

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Remove all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setNotifications([]) },
    ]);
  };

  const testNotification = (type: NotificationType) => {
    sendTestNotification(type);
    Alert.alert('Test Sent', `${type} notification sent!`);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotification = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unread]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody}>{item.body}</Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Notifications {unreadCount > 0 && <Text style={styles.badge}>({unreadCount})</Text>}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.headerAction}>Mark all read</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAll}>
            <Text style={[styles.headerAction, styles.clearAction]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />

      {/* Settings Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsTitle}>Notification Settings</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>🚛 Job Alerts</Text>
          <Switch
            value={settings.jobAlerts}
            onValueChange={(v) => setSettings({ ...settings, jobAlerts: v })}
            trackColor={{ false: '#374151', true: '#22c55e' }}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>💬 Messages</Text>
          <Switch
            value={settings.messages}
            onValueChange={(v) => setSettings({ ...settings, messages: v })}
            trackColor={{ false: '#374151', true: '#22c55e' }}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>💰 Payments</Text>
          <Switch
            value={settings.payments}
            onValueChange={(v) => setSettings({ ...settings, payments: v })}
            trackColor={{ false: '#374151', true: '#22c55e' }}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>⏰ Reminders</Text>
          <Switch
            value={settings.reminders}
            onValueChange={(v) => setSettings({ ...settings, reminders: v })}
            trackColor={{ false: '#374151', true: '#22c55e' }}
          />
        </View>
      </View>

      {/* Test Buttons (Dev only) */}
      <View style={styles.testSection}>
        <Text style={styles.testTitle}>Test Notifications</Text>
        <View style={styles.testButtons}>
          <TouchableOpacity style={styles.testBtn} onPress={() => testNotification('job_alert')}>
            <Text style={styles.testBtnText}>🚛 Job</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testBtn} onPress={() => testNotification('message')}>
            <Text style={styles.testBtnText}>💬 Msg</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testBtn} onPress={() => testNotification('payment')}>
            <Text style={styles.testBtnText}>💰 Pay</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testBtn} onPress={() => testNotification('reminder')}>
            <Text style={styles.testBtnText}>⏰ Alert</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  badge: { color: '#3b82f6' },
  headerActions: { flexDirection: 'row', gap: 16 },
  headerAction: { color: '#3b82f6', fontSize: 14 },
  clearAction: { color: '#ef4444' },
  list: { padding: 16 },
  notificationItem: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  unread: { backgroundColor: '#1e3a5f', borderLeftWidth: 3, borderLeftColor: '#3b82f6' },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 4 },
  notificationBody: { fontSize: 13, color: '#9ca3af', marginBottom: 4 },
  notificationTime: { fontSize: 11, color: '#6b7280' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { color: '#6b7280', fontSize: 16 },
  settingsSection: { padding: 16, borderTopWidth: 1, borderTopColor: '#1f2937' },
  settingsTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  settingLabel: { fontSize: 14, color: '#d1d5db' },
  testSection: { padding: 16, borderTopWidth: 1, borderTopColor: '#1f2937' },
  testTitle: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  testButtons: { flexDirection: 'row', gap: 8 },
  testBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 8, padding: 10, alignItems: 'center' },
  testBtnText: { color: '#fff', fontSize: 12 },
});
