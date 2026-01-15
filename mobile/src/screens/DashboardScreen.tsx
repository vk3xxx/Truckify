import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { jobsApi, Job } from '../api';

interface StatCard {
  label: string;
  value: string;
  icon: string;
  color: string;
}

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isDriver = user?.user_type === 'driver';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await jobsApi.listJobs({});
      setJobs(response.data || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const stats: StatCard[] = isDriver
    ? [
        {
          label: 'Available Jobs',
          value: jobs.filter((j) => j.status === 'pending').length.toString(),
          icon: 'cube-outline',
          color: '#3b82f6',
        },
        {
          label: 'Active Jobs',
          value: jobs.filter((j) => j.driver_id === user?.id && j.status !== 'delivered').length.toString(),
          icon: 'car-sport-outline',
          color: '#22c55e',
        },
        {
          label: 'In Transit',
          value: jobs.filter((j) => j.status === 'in_transit').length.toString(),
          icon: 'location-outline',
          color: '#eab308',
        },
        {
          label: 'Completed',
          value: jobs.filter((j) => j.driver_id === user?.id && j.status === 'delivered').length.toString(),
          icon: 'checkmark-circle-outline',
          color: '#10b981',
        },
      ]
    : [
        {
          label: 'Active Shipments',
          value: jobs.filter((j) => ['pending', 'assigned', 'in_transit'].includes(j.status)).length.toString(),
          icon: 'cube-outline',
          color: '#3b82f6',
        },
        {
          label: 'In Transit',
          value: jobs.filter((j) => j.status === 'in_transit').length.toString(),
          icon: 'car-sport-outline',
          color: '#eab308',
        },
        {
          label: 'Delivered',
          value: jobs.filter((j) => j.status === 'delivered').length.toString(),
          icon: 'checkmark-circle-outline',
          color: '#10b981',
        },
        {
          label: 'Total Value',
          value: `$${jobs.reduce((sum, j) => sum + j.price, 0).toLocaleString()}`,
          icon: 'cash-outline',
          color: '#22c55e',
        },
      ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.email?.split('@')[0] || 'User'}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}20` }]}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent Jobs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent {isDriver ? 'Available' : ''} Jobs</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
            <Text style={styles.sectionLink}>View all</Text>
          </TouchableOpacity>
        </View>

        {jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#404040" />
            <Text style={styles.emptyStateText}>No jobs yet</Text>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {jobs.slice(0, 5).map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => {
                  /* Navigate to job details */
                }}
              >
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{job.cargo_type}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                    <Text style={styles.statusText}>{job.status}</Text>
                  </View>
                </View>
                <View style={styles.jobRoute}>
                  <Ionicons name="location-outline" size={16} color="#6b7280" />
                  <Text style={styles.jobLocation}>
                    {job.pickup.city}, {job.pickup.state}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#6b7280" />
                  <Text style={styles.jobLocation}>
                    {job.delivery.city}, {job.delivery.state}
                  </Text>
                </View>
                <View style={styles.jobFooter}>
                  <Text style={styles.jobPrice}>${job.price.toLocaleString()}</Text>
                  <Text style={styles.jobWeight}>{job.weight}kg</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
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
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionLink: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  jobsList: {
    gap: 12,
  },
  jobCard: {
    backgroundColor: '#171717',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  jobRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  jobLocation: {
    fontSize: 14,
    color: '#6b7280',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  jobWeight: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});
