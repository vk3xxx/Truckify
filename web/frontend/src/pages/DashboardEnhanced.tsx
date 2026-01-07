import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Package, MapPin, DollarSign, Plus, Bell, Check, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { profileApi, jobsApi, driverProfileApi, matchingApiClient } from '../api';
import { SkeletonStats, EmptyState, StatusBadge, useToast } from '../components/ui';
import type { UserProfile, Job, DriverProfile, Match } from '../api';

export default function DashboardEnhanced() {
  const { user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pendingMatches, setPendingMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const isDriver = user?.user_type === 'driver';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, jobsRes] = await Promise.all([
          profileApi.getProfile().catch(() => null),
          jobsApi.listJobs({ status: isDriver ? 'pending' : undefined }).catch(() => null),
        ]);

        if (profileRes?.data.data) setProfile(profileRes.data.data);
        if (jobsRes?.data.data) setJobs(jobsRes.data.data.slice(0, 5));

        if (isDriver) {
          const [driverRes, matchesRes] = await Promise.all([
            driverProfileApi.getDriver().catch(() => null),
            matchingApiClient.getPendingMatches().catch(() => null),
          ]);
          if (driverRes?.data.data) setDriverProfile(driverRes.data.data);
          if (matchesRes?.data.data) setPendingMatches(matchesRes.data.data);
        }
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isDriver, toast]);

  const handleAcceptMatch = async (matchId: string) => {
    try {
      await matchingApiClient.acceptMatch(matchId);
      setPendingMatches(prev => prev.filter(m => m.id !== matchId));
      toast.success('Match accepted! Job assigned to you.');
    } catch (err) {
      toast.error('Failed to accept match. Please try again.');
    }
  };

  const handleRejectMatch = async (matchId: string) => {
    try {
      await matchingApiClient.rejectMatch(matchId);
      setPendingMatches(prev => prev.filter(m => m.id !== matchId));
      toast.info('Match rejected');
    } catch (err) {
      toast.error('Failed to reject match. Please try again.');
    }
  };

  const stats = isDriver ? [
    { label: 'Available Jobs', value: jobs.filter(j => j.status === 'pending').length.toString(), icon: Package, link: '/jobs?status=pending', color: 'text-blue-400' },
    { label: 'My Active Jobs', value: jobs.filter(j => j.driver_id === user?.id && ['assigned', 'in_transit'].includes(j.status)).length.toString(), icon: Truck, link: '/jobs?mine=true', color: 'text-primary-400' },
    { label: 'In Transit', value: jobs.filter(j => j.driver_id === user?.id && j.status === 'in_transit').length.toString(), icon: MapPin, link: '/tracking', color: 'text-yellow-400' },
    { label: 'Completed Today', value: jobs.filter(j => j.driver_id === user?.id && j.status === 'delivered').length.toString(), icon: DollarSign, link: '/jobs?status=delivered', color: 'text-green-400' },
  ] : [
    { label: 'Active Shipments', value: jobs.filter(j => ['pending', 'assigned', 'in_transit'].includes(j.status)).length.toString(), icon: Package, link: '/jobs', color: 'text-blue-400' },
    { label: 'In Transit', value: jobs.filter(j => j.status === 'in_transit').length.toString(), icon: Truck, link: '/tracking', color: 'text-yellow-400' },
    { label: 'Delivered', value: jobs.filter(j => j.status === 'delivered').length.toString(), icon: MapPin, link: '/jobs?status=delivered', color: 'text-green-400' },
    { label: 'Total Value', value: '$' + jobs.reduce((sum, j) => sum + j.price, 0).toLocaleString(), icon: DollarSign, link: '/jobs', color: 'text-primary-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}
          </h1>
          <p className="text-gray-400 mt-2 text-base">
            Here's what's happening with your {isDriver ? 'deliveries' : 'shipments'}
          </p>
        </div>
        <Link to={isDriver ? '/jobs' : '/jobs'} className="btn-primary shrink-0">
          <Plus className="h-5 w-5 mr-2" />
          {isDriver ? 'Find Jobs' : 'Create Shipment'}
        </Link>
      </div>

      {/* Driver Setup Banner */}
      {isDriver && !driverProfile && !loading && (
        <div className="card mb-8 border-primary-500/30 bg-primary-500/5 animate-slide-up">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-semibold text-lg text-white mb-1">Complete Your Driver Profile</h3>
              <p className="text-gray-400 text-sm">Add your license and vehicle details to start accepting jobs</p>
            </div>
            <Link to="/profile" className="btn-primary shrink-0">Setup Profile</Link>
          </div>
        </div>
      )}

      {/* Pending Matches for Drivers */}
      {isDriver && pendingMatches.length > 0 && (
        <div className="card mb-8 border-yellow-500/30 bg-yellow-500/5 animate-slide-up">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <Bell className="h-5 w-5 text-yellow-500" />
            </div>
            <h3 className="font-semibold text-lg text-white">Job Matches ({pendingMatches.length})</h3>
          </div>
          <div className="space-y-3">
            {pendingMatches.slice(0, 3).map((match, idx) => (
              <div key={match.id} className={`flex items-center justify-between p-4 bg-dark-700/50 rounded-xl border border-dark-600/50 hover:border-yellow-500/30 transition-all animate-fade-in-up stagger-${idx + 1}`}>
                <div>
                  <div className="font-semibold text-white">Match Score: {match.score.toFixed(0)}%</div>
                  <div className="text-sm text-gray-400 mt-1">{match.distance_km.toFixed(1)} km away • Expires {new Date(match.expires_at).toLocaleTimeString()}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRejectMatch(match.id)}
                    className="p-2.5 bg-dark-600 hover:bg-red-500/20 rounded-lg transition-all hover:scale-105"
                    aria-label="Reject match"
                  >
                    <X className="h-5 w-5 text-red-400" />
                  </button>
                  <button
                    onClick={() => handleAcceptMatch(match.id)}
                    className="p-2.5 bg-primary-500/20 hover:bg-primary-500/30 rounded-lg transition-all hover:scale-105"
                    aria-label="Accept match"
                  >
                    <Check className="h-5 w-5 text-primary-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {loading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          {stats.map((stat, i) => (
            <Link
              key={i}
              to={stat.link}
              className="card card-interactive group animate-fade-in-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className={`w-11 h-11 bg-primary-500/10 rounded-xl flex items-center justify-center group-hover:bg-primary-500/20 transition-colors`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-primary-500 transition-colors" />
              </div>
              <div className="text-3xl font-bold mb-1.5 text-white">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent Jobs */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Recent {isDriver ? 'Available' : ''} Jobs</h2>
          <Link to="/jobs" className="text-primary-500 hover:text-primary-400 text-sm font-medium flex items-center gap-1 transition-colors">
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="shimmer h-24 rounded-lg" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Package}
            title={isDriver ? "No jobs available" : "No shipments yet"}
            description={isDriver ? "Check back later for new job opportunities." : "Create your first shipment to get started."}
            action={{
              label: isDriver ? "Browse All Jobs" : "Create Shipment",
              onClick: () => window.location.href = '/jobs'
            }}
          />
        ) : (
          <div className="space-y-3">
            {jobs.slice(0, 5).map((job, idx) => (
              <Link
                key={job.id}
                to={`/jobs?id=${job.id}`}
                className="block p-4 bg-dark-700/30 hover:bg-dark-700 rounded-lg border border-dark-700 hover:border-primary-500/50 transition-all group animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white truncate">{job.cargo_type}</h3>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {job.pickup.city}, {job.pickup.state}
                      </span>
                      <span>→</span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {job.delivery.city}, {job.delivery.state}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-white">${job.price.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">{job.weight}kg</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-primary-500 transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
