import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useState, useCallback } from 'react';

interface Job {
  id: string;
  pickup: string;
  delivery: string;
  distance: string;
  pay: string;
  weight: string;
  status: 'available' | 'in_progress' | 'completed';
  pickupDate: string;
}

const MOCK_JOBS: Job[] = [
  { id: '1', pickup: 'Sydney, NSW', delivery: 'Melbourne, VIC', distance: '878 km', pay: '$1,250', weight: '18,000 kg', status: 'available', pickupDate: 'Tomorrow, 8:00 AM' },
  { id: '2', pickup: 'Brisbane, QLD', delivery: 'Gold Coast, QLD', distance: '94 km', pay: '$320', weight: '5,500 kg', status: 'available', pickupDate: 'Today, 2:00 PM' },
  { id: '3', pickup: 'Perth, WA', delivery: 'Fremantle, WA', distance: '25 km', pay: '$150', weight: '2,000 kg', status: 'in_progress', pickupDate: 'In Progress' },
  { id: '4', pickup: 'Adelaide, SA', delivery: 'Sydney, NSW', distance: '1,376 km', pay: '$2,100', weight: '22,000 kg', status: 'available', pickupDate: 'Jan 10, 6:00 AM' },
];

export default function Jobs() {
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'in_progress'>('all');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleAcceptJob = (job: Job) => {
    Alert.alert(
      'Accept Job',
      `Accept delivery from ${job.pickup} to ${job.delivery} for ${job.pay}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'in_progress' as const, pickupDate: 'In Progress' } : j));
            Alert.alert('Success', 'Job accepted! Check the Tracking tab.');
          }
        }
      ]
    );
  };

  const handleViewDetails = (job: Job) => {
    Alert.alert(
      `Job #${job.id}`,
      `📍 Pickup: ${job.pickup}\n📍 Delivery: ${job.delivery}\n📏 Distance: ${job.distance}\n⚖️ Weight: ${job.weight}\n💰 Pay: ${job.pay}\n📅 ${job.pickupDate}`,
      [{ text: 'Close' }]
    );
  };

  const filteredJobs = jobs.filter((job) => filter === 'all' || job.status === filter);

  const renderJob = ({ item }: { item: Job }) => (
    <TouchableOpacity style={styles.jobCard} onPress={() => handleViewDetails(item)}>
      <View style={styles.jobHeader}>
        <View style={[styles.statusBadge, item.status === 'available' ? styles.available : styles.inProgress]}>
          <Text style={styles.statusText}>{item.status === 'available' ? 'Available' : 'In Progress'}</Text>
        </View>
        <Text style={styles.pay}>{item.pay}</Text>
      </View>

      <View style={styles.route}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.location}>{item.pickup}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.location}>{item.delivery}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detail}>
          <Text style={styles.detailIcon}>📏</Text>
          <Text style={styles.detailText}>{item.distance}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailIcon}>⚖️</Text>
          <Text style={styles.detailText}>{item.weight}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>{item.pickupDate}</Text>
        </View>
      </View>

      {item.status === 'available' && (
        <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptJob(item)}>
          <Text style={styles.acceptText}>Accept Job</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filters}>
        {(['all', 'available', 'in_progress'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'available' ? 'Available' : 'Active'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredJobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No jobs found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  filters: { flexDirection: 'row', padding: 16, gap: 8 },
  filterTab: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1f2937', alignItems: 'center' },
  filterActive: { backgroundColor: '#3b82f6' },
  filterText: { color: '#9ca3af', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, gap: 16 },
  jobCard: { backgroundColor: '#1f2937', borderRadius: 16, padding: 16 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  available: { backgroundColor: '#14532d' },
  inProgress: { backgroundColor: '#1e3a5f' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  pay: { fontSize: 20, fontWeight: 'bold', color: '#22c55e' },
  route: { marginBottom: 16 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  location: { fontSize: 16, color: '#fff', fontWeight: '500' },
  routeLine: { width: 2, height: 20, backgroundColor: '#374151', marginLeft: 5, marginVertical: 4 },
  details: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailIcon: { fontSize: 14 },
  detailText: { color: '#9ca3af', fontSize: 13 },
  acceptButton: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center' },
  acceptText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#6b7280', fontSize: 16 },
});
