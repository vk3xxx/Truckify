import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Switch } from 'react-native';
import { useState, useCallback } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { router } from 'expo-router';

export default function Home() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
    Alert.alert(
      'Status Updated',
      `You are now ${!isAvailable ? 'available' : 'offline'}`,
      [{ text: 'OK' }]
    );
  };

  const stats = [
    { label: 'Active Jobs', value: '3', icon: '📦' },
    { label: 'Completed', value: '47', icon: '✅' },
    { label: 'Earnings', value: '$4,250', icon: '💰' },
    { label: 'Rating', value: '4.9', icon: '⭐' },
  ];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'find':
        router.push('/(tabs)/jobs');
        break;
      case 'track':
        router.push('/(tabs)/tracking');
        break;
      case 'messages':
        Alert.alert('Messages', 'No new messages');
        break;
      case 'earnings':
        Alert.alert('Earnings', 'Total: $4,250\nThis week: $850\nPending: $320');
        break;
    }
  };

  const handleActivityPress = (title: string) => {
    Alert.alert('Activity Details', title);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.email?.split('@')[0] || 'Driver'}</Text>
        </View>
        {user?.user_type === 'driver' && (
          <TouchableOpacity
            style={[styles.statusBadge, isAvailable ? styles.available : styles.unavailable]}
            onPress={toggleAvailability}
          >
            <View style={[styles.statusDot, { backgroundColor: isAvailable ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.statusText}>{isAvailable ? 'Available' : 'Offline'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <TouchableOpacity key={stat.label} style={styles.statCard} onPress={() => Alert.alert(stat.label, `Current: ${stat.value}`)}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('find')}>
          <Text style={styles.actionIcon}>🔍</Text>
          <Text style={styles.actionLabel}>Find Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('track')}>
          <Text style={styles.actionIcon}>📍</Text>
          <Text style={styles.actionLabel}>Track Load</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('messages')}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('earnings')}>
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionLabel}>Earnings</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityList}>
        {[
          { title: 'Job #1234 Completed', time: '2 hours ago', icon: '✅' },
          { title: 'Payment Received - $450', time: '5 hours ago', icon: '💰' },
          { title: 'New job match nearby', time: '1 day ago', icon: '📦' },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.activityItem} onPress={() => handleActivityPress(item.title)}>
            <Text style={styles.activityIcon}>{item.icon}</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
            <Text style={styles.activityArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  greeting: { fontSize: 16, color: '#9ca3af' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  available: { backgroundColor: '#14532d' },
  unavailable: { backgroundColor: '#7f1d1d' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 10 },
  statCard: { width: '47%', backgroundColor: '#1f2937', borderRadius: 16, padding: 16, alignItems: 'center' },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, gap: 10 },
  actionCard: { width: '47%', backgroundColor: '#1f2937', borderRadius: 16, padding: 20, alignItems: 'center' },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionLabel: { fontSize: 14, color: '#fff', fontWeight: '500' },
  activityList: { padding: 20, gap: 12 },
  activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 12, padding: 16 },
  activityIcon: { fontSize: 24, marginRight: 12 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, color: '#fff', fontWeight: '500' },
  activityTime: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  activityArrow: { fontSize: 20, color: '#6b7280' },
});
