import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Package, MapPin, DollarSign, Plus, Bell, Check, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { profileApi, jobsApi, driverProfileApi, matchingApiClient } from '../api';
import type { UserProfile, Job, DriverProfile, Match } from '../api';

export default function Dashboard() {
  const { user } = useAuth();
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
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isDriver]);

  const handleAcceptMatch = async (matchId: string) => {
    try {
      await matchingApiClient.acceptMatch(matchId);
      setPendingMatches(prev => prev.filter(m => m.id !== matchId));
    } catch (err) {
      console.error('Failed to accept match:', err);
    }
  };

  const handleRejectMatch = async (matchId: string) => {
    try {
      await matchingApiClient.rejectMatch(matchId);
      setPendingMatches(prev => prev.filter(m => m.id !== matchId));
    } catch (err) {
      console.error('Failed to reject match:', err);
    }
  };

  const stats = isDriver ? [
    { label: 'Available Jobs', value: jobs.filter(j => j.status === 'pending').length.toString(), icon: Package, link: '/jobs?status=pending' },
    { label: 'My Active Jobs', value: jobs.filter(j => j.driver_id === user?.id && ['assigned', 'in_transit'].includes(j.status)).length.toString(), icon: Truck, link: '/jobs?mine=true' },
    { label: 'In Transit', value: jobs.filter(j => j.driver_id === user?.id && j.status === 'in_transit').length.toString(), icon: MapPin, link: '/tracking' },
    { label: 'My Bids', value: '-', icon: DollarSign, link: '/bids' },
  ] : [
    { label: 'Active Shipments', value: jobs.filter(j => ['pending', 'assigned', 'in_transit'].includes(j.status)).length.toString(), icon: Package, link: '/jobs' },
    { label: 'In Transit', value: jobs.filter(j => j.status === 'in_transit').length.toString(), icon: Truck, link: '/tracking' },
    { label: 'Delivered', value: jobs.filter(j => j.status === 'delivered').length.toString(), icon: MapPin, link: '/jobs?status=delivered' },
    { label: 'Total Value', value: '$' + jobs.reduce((sum, j) => sum + j.price, 0).toLocaleString(), icon: DollarSign, link: '/jobs' },
  ];

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}
          </h1>
          <p className="text-gray-400 mt-2">
            Here's what's happening with your {isDriver ? 'deliveries' : 'shipments'}
          </p>
        </div>
        <Link to={isDriver ? '/jobs' : '/jobs'} className="btn-primary shrink-0">
          <Plus className="h-5 w-5 mr-2" />
          {isDriver ? 'Find Jobs' : 'Create Shipment'}
        </Link>
      </div>

      {/* Driver Setup Banner */}
      {isDriver && !driverProfile && (
        <div className="card mb-8 border-primary-500/50 bg-primary-500/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Complete Your Driver Profile</h3>
              <p className="text-gray-400 mt-1">Add your license and vehicle details to start accepting jobs</p>
            </div>
            <Link to="/profile" className="btn-primary">Setup Profile</Link>
          </div>
        </div>
      )}

      {/* Pending Matches for Drivers */}
      {isDriver && pendingMatches.length > 0 && (
        <div className="card mb-8 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold text-lg">Job Matches ({pendingMatches.length})</h3>
          </div>
          <div className="space-y-3">
            {pendingMatches.slice(0, 3).map((match) => (
              <div key={match.id} className="flex items-center justify-between p-4 bg-dark-700 rounded-xl">
                <div>
                  <div className="font-medium">Match Score: {match.score.toFixed(0)}%</div>
                  <div className="text-sm text-gray-400">{match.distance_km.toFixed(1)} km away • Expires {new Date(match.expires_at).toLocaleTimeString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRejectMatch(match.id)} className="p-2 bg-dark-600 hover:bg-red-500/20 rounded-lg transition-colors">
                    <X className="h-5 w-5 text-red-400" />
                  </button>
                  <button onClick={() => handleAcceptMatch(match.id)} className="p-2 bg-primary-500/20 hover:bg-primary-500/30 rounded-lg transition-colors">
                    <Check className="h-5 w-5 text-primary-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
        {stats.map((stat, i) => (
          <Link key={i} to={stat.link} className="card hover:border-primary-500/50 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-primary-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
            <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Jobs List */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-semibold">
                {isDriver ? 'Available Jobs' : 'Recent Shipments'}
              </h2>
              <Link to="/jobs" className="text-primary-500 hover:text-primary-400 text-sm font-medium">
                View all
              </Link>
            </div>
            
            {jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="bg-dark-700 rounded-xl p-4 sm:p-5 hover:bg-dark-600 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-400 font-medium">{job.id.slice(0, 8)}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        job.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        job.status === 'in_transit' ? 'bg-primary-500/20 text-primary-500' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-2.5 h-2.5 bg-primary-500 rounded-full shrink-0" />
                          <span className="truncate">{job.pickup.city}, {job.pickup.state}</span>
                        </div>
                        <div className="ml-1 w-0.5 h-4 bg-dark-500 my-1.5" />
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-2.5 h-2.5 border-2 border-gray-500 rounded-full shrink-0" />
                          <span className="truncate">{job.delivery.city}, {job.delivery.state}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-lg">${job.price.toLocaleString()}</div>
                        <div className="text-sm text-gray-400 mt-1">{job.vehicle_type.replace('_', ' ')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{isDriver ? 'No available jobs at the moment' : 'No shipments yet'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 sm:space-y-8">
          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg sm:text-xl font-semibold mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/jobs" className="flex items-center justify-between p-4 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors">
                <span>{isDriver ? 'Browse Jobs' : 'Create Shipment'}</span>
                <ChevronRight className="h-5 w-5 text-primary-500" />
              </Link>
              <Link to="/profile" className="flex items-center justify-between p-4 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors">
                <span>Edit Profile</span>
                <ChevronRight className="h-5 w-5 text-primary-500" />
              </Link>
              {isDriver && (
                <button 
                  onClick={async () => {
                    try {
                      await driverProfileApi.updateDriver({ is_available: !driverProfile?.is_available });
                      const res = await driverProfileApi.getDriver();
                      setDriverProfile(res.data.data);
                    } catch {}
                  }}
                  className="flex items-center justify-between p-4 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors w-full text-left"
                >
                  <span>{driverProfile?.is_available ? 'Go Offline' : 'Go Online'}</span>
                  <div className={`w-3 h-3 rounded-full ${driverProfile?.is_available ? 'bg-green-500' : 'bg-gray-500'}`} />
                </button>
              )}
            </div>
          </div>

          {/* Performance (for drivers) */}
          {isDriver && driverProfile && (
            <div className="card">
              <h2 className="text-lg sm:text-xl font-semibold mb-6">Your Stats</h2>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Rating</span>
                    <span className="font-medium">{driverProfile.rating?.toFixed(1) || '0.0'}/5</span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div className="h-2 bg-primary-500 rounded-full" style={{ width: `${(driverProfile.rating || 0) * 20}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Total Trips</span>
                    <span className="font-medium">{driverProfile.total_trips || 0}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Experience</span>
                    <span className="font-medium">{driverProfile.years_experience || 0} years</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
