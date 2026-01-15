import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { jobsApi, Job } from '../api';

export default function JobsScreen() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'assigned' | 'in_transit' | 'delivered'>('all');

  const isDriver = user?.user_type === 'driver';

  useEffect(() => {
    fetchJobs();
  }, [filter]);

  const fetchJobs = async () => {
    try {
      const response = await jobsApi.listJobs({
        ...(filter !== 'all' && { status: filter }),
      });
      setJobs(response.data || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const renderJobCard = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => {
        /* Navigate to job details */
      }}
    >
      <View style={styles.jobHeader}>
        <View>
          <Text style={styles.jobTitle}>{item.cargo_type}</Text>
          <Text style={styles.jobDate}>Pickup: {new Date(item.pickup_date).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, styles.routeDotActive]} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeLocation}>
              {item.pickup.city}, {item.pickup.state}
            </Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <View style={styles.routeDot} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Delivery</Text>
            <Text style={styles.routeLocation}>
              {item.delivery.city}, {item.delivery.state}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.jobFooter}>
        <View style={styles.jobDetails}>
          <Ionicons name="cube-outline" size={16} color="#6b7280" />
          <Text style={styles.jobDetailText}>{item.weight}kg</Text>
          <Ionicons name="car-outline" size={16} color="#6b7280" style={{ marginLeft: 12 }} />
          <Text style={styles.jobDetailText}>{item.vehicle_type}</Text>
        </View>
        <Text style={styles.jobPrice}>${item.price.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'in_transit' && styles.filterButtonActive]}
          onPress={() => setFilter('in_transit')}
        >
          <Text style={[styles.filterText, filter === 'in_transit' && styles.filterTextActive]}>
            In Transit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'delivered' && styles.filterButtonActive]}
          onPress={() => setFilter('delivered')}
        >
          <Text style={[styles.filterText, filter === 'delivered' && styles.filterTextActive]}>
            Delivered
          </Text>
        </TouchableOpacity>
      </View>

      {/* Jobs List */}
      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#404040" />
            <Text style={styles.emptyStateText}>No jobs found</Text>
            <Text style={styles.emptyStateSubtext}>Try adjusting your filters</Text>
          </View>
        }
      />
    </View>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'rgba(234, 179, 8, 0.2)',
    assigned: 'rgba(59, 130, 246, 0.2)',
    in_transit: 'rgba(34, 197, 94, 0.2)',
    delivered: 'rgba(16, 185, 129, 0.2)',
    cancelled: 'rgba(239, 68, 68, 0.2)',
  };
  return colors[status] || colors.pending;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#22c55e',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#22c55e',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  jobCard: {
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  jobDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  routeContainer: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#404040',
    marginTop: 4,
    marginRight: 12,
  },
  routeDotActive: {
    backgroundColor: '#22c55e',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#262626',
    marginLeft: 5,
    marginVertical: 4,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  routeLocation: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  jobDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobDetailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  jobPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
});
