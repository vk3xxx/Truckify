import { useState, useEffect } from 'react';
import { Users, Truck, MapPin, Clock, CheckCircle } from 'lucide-react';
import { driverProfileApi, jobsApi, trackingApi, type DriverProfile, type Job, type CurrentLocation } from '../api';

export default function Dispatcher() {
  const [drivers, setDrivers] = useState<(DriverProfile & { location?: CurrentLocation; activeJob?: Job })[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [assigningJob, setAssigningJob] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [driversRes, jobsRes] = await Promise.all([
        driverProfileApi.getAvailableDrivers(),
        jobsApi.listJobs({}),
      ]);

      const driverList = driversRes.data.data || [];
      const jobList = jobsRes.data.data || [];
      setJobs(jobList);

      // Enrich drivers with location and active job
      const enrichedDrivers = await Promise.all(
        driverList.map(async (driver) => {
          let location: CurrentLocation | undefined;
          try {
            const locRes = await trackingApi.getDriverLocation(driver.user_id);
            location = locRes.data.data;
          } catch {}
          const activeJob = jobList.find(j => j.driver_id === driver.user_id && ['assigned', 'in_transit'].includes(j.status));
          return { ...driver, location, activeJob };
        })
      );

      setDrivers(enrichedDrivers);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  const handleAssignJob = async (jobId: string, driverId: string) => {
    try {
      await jobsApi.assignDriver(jobId, driverId);
      setAssigningJob(null);
      loadData();
    } catch (err) {
      alert('Failed to assign driver');
    }
  };

  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const activeJobs = jobs.filter(j => ['assigned', 'in_transit'].includes(j.status));
  const onlineDrivers = drivers.filter(d => d.is_available);
  const busyDrivers = drivers.filter(d => d.activeJob);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Dispatcher Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg"><Users className="h-5 w-5 text-green-400" /></div>
            <div>
              <p className="text-2xl font-bold">{onlineDrivers.length}</p>
              <p className="text-sm text-gray-400">Online Drivers</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg"><Truck className="h-5 w-5 text-blue-400" /></div>
            <div>
              <p className="text-2xl font-bold">{busyDrivers.length}</p>
              <p className="text-sm text-gray-400">On Active Jobs</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg"><Clock className="h-5 w-5 text-yellow-400" /></div>
            <div>
              <p className="text-2xl font-bold">{pendingJobs.length}</p>
              <p className="text-sm text-gray-400">Pending Jobs</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/20 rounded-lg"><CheckCircle className="h-5 w-5 text-primary-400" /></div>
            <div>
              <p className="text-2xl font-bold">{activeJobs.length}</p>
              <p className="text-sm text-gray-400">Active Jobs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Drivers Panel */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" /> Drivers ({drivers.length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {drivers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No drivers available</p>
            ) : (
              drivers.map(driver => (
                <div
                  key={driver.id}
                  onClick={() => setSelectedDriver(selectedDriver === driver.id ? null : driver.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedDriver === driver.id ? 'bg-primary-500/20 border border-primary-500' : 'bg-dark-700 hover:bg-dark-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${driver.is_available ? 'bg-green-400' : 'bg-gray-500'}`} />
                      <div>
                        <p className="font-medium">Driver #{driver.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-400">{driver.vehicle?.type || 'No vehicle'}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {driver.activeJob ? (
                        <span className="text-blue-400">On Job</span>
                      ) : driver.is_available ? (
                        <span className="text-green-400">Available</span>
                      ) : (
                        <span className="text-gray-500">Offline</span>
                      )}
                    </div>
                  </div>
                  
                  {selectedDriver === driver.id && (
                    <div className="mt-3 pt-3 border-t border-dark-600 text-sm space-y-2">
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="h-4 w-4" />
                        {driver.location ? (
                          <span>{driver.location.latitude.toFixed(4)}, {driver.location.longitude.toFixed(4)}</span>
                        ) : (
                          <span>Location unknown</span>
                        )}
                      </div>
                      {driver.vehicle && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Truck className="h-4 w-4" />
                          <span>{driver.vehicle.make} {driver.vehicle.model} ({driver.vehicle.plate})</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Rating: {driver.rating.toFixed(1)} • {driver.total_trips} trips</span>
                      </div>
                      {driver.activeJob && (
                        <div className="mt-2 p-2 bg-blue-500/10 rounded text-blue-400">
                          Active: {driver.activeJob.pickup.city} → {driver.activeJob.delivery.city}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Jobs Panel */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5" /> Pending Jobs ({pendingJobs.length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pendingJobs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No pending jobs</p>
            ) : (
              pendingJobs.map(job => (
                <div key={job.id} className="p-3 bg-dark-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{job.pickup.city} → {job.delivery.city}</p>
                      <p className="text-sm text-gray-400">{job.cargo_type} • {job.vehicle_type}</p>
                    </div>
                    <p className="text-primary-400 font-medium">${job.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Pickup: {new Date(job.pickup_date).toLocaleDateString()}</span>
                    {assigningJob === job.id ? (
                      <select
                        className="input-field py-1 px-2 text-sm"
                        onChange={e => e.target.value && handleAssignJob(job.id, e.target.value)}
                        defaultValue=""
                      >
                        <option value="">Select driver...</option>
                        {onlineDrivers.filter(d => !d.activeJob && d.vehicle?.type === job.vehicle_type).map(d => (
                          <option key={d.id} value={d.user_id}>Driver #{d.id.slice(0, 8)}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setAssigningJob(job.id)}
                        className="text-primary-400 hover:text-primary-300"
                      >
                        Assign Driver
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Jobs */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-4">Active Jobs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-dark-600">
                <th className="pb-3">Route</th>
                <th className="pb-3">Driver</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Pickup Date</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeJobs.length === 0 ? (
                <tr><td colSpan={5} className="py-4 text-center text-gray-500">No active jobs</td></tr>
              ) : (
                activeJobs.map(job => {
                  const driver = drivers.find(d => d.user_id === job.driver_id);
                  return (
                    <tr key={job.id} className="border-b border-dark-700">
                      <td className="py-3">{job.pickup.city} → {job.delivery.city}</td>
                      <td className="py-3">{driver ? `#${driver.id.slice(0, 8)}` : 'Unknown'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          job.status === 'in_transit' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3">{new Date(job.pickup_date).toLocaleDateString()}</td>
                      <td className="py-3">
                        <button
                          onClick={() => window.location.href = `/tracking/${job.id}`}
                          className="text-primary-400 hover:text-primary-300"
                        >
                          Track
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
