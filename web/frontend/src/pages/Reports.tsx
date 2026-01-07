import { useState, useEffect } from 'react';
import { FileDown, Calendar, DollarSign, Truck, TrendingUp } from 'lucide-react';
import { jobsApi, type Job } from '../api';
import { useAuth } from '../AuthContext';

export default function Reports() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [reportType, setReportType] = useState<'jobs' | 'earnings' | 'summary'>('summary');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const res = await jobsApi.listJobs({});
      setJobs(res.data.data || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
    setLoading(false);
  };

  const filteredJobs = jobs.filter(job => {
    const jobDate = new Date(job.created_at);
    if (dateRange.from && jobDate < new Date(dateRange.from)) return false;
    if (dateRange.to && jobDate > new Date(dateRange.to)) return false;
    // Filter by user role
    if (user?.user_type === 'shipper') return job.shipper_id === user.id;
    if (user?.user_type === 'driver') return job.driver_id === user.id;
    return true;
  });

  const stats = {
    totalJobs: filteredJobs.length,
    completedJobs: filteredJobs.filter(j => j.status === 'delivered').length,
    totalRevenue: filteredJobs.filter(j => j.status === 'delivered').reduce((sum, j) => sum + j.price, 0),
    avgJobValue: filteredJobs.length > 0 ? filteredJobs.reduce((sum, j) => sum + j.price, 0) / filteredJobs.length : 0,
  };

  const exportCSV = () => {
    const headers = ['Job ID', 'Route', 'Cargo Type', 'Vehicle Type', 'Price', 'Status', 'Pickup Date', 'Created'];
    const rows = filteredJobs.map(job => [
      job.id,
      `${job.pickup.city} to ${job.delivery.city}`,
      job.cargo_type,
      job.vehicle_type,
      job.price,
      job.status,
      job.pickup_date,
      job.created_at,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truckify-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = {
      generated_at: new Date().toISOString(),
      date_range: dateRange,
      summary: stats,
      jobs: filteredJobs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truckify-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-gray-400">View and export your job history and earnings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <FileDown className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={exportJSON} className="btn-primary flex items-center gap-2">
            <FileDown className="h-4 w-4" /> Export JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-1">From Date</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">To Date</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value as typeof reportType)} className="input-field">
              <option value="summary">Summary</option>
              <option value="jobs">Job Details</option>
              <option value="earnings">Earnings</option>
            </select>
          </div>
          <button onClick={() => setDateRange({ from: '', to: '' })} className="text-primary-400 hover:text-primary-300 text-sm">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg"><Truck className="h-5 w-5 text-blue-400" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.totalJobs}</p>
              <p className="text-sm text-gray-400">Total Jobs</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg"><TrendingUp className="h-5 w-5 text-green-400" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.completedJobs}</p>
              <p className="text-sm text-gray-400">Completed</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/20 rounded-lg"><DollarSign className="h-5 w-5 text-primary-400" /></div>
            <div>
              <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Total Revenue</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg"><Calendar className="h-5 w-5 text-yellow-400" /></div>
            <div>
              <p className="text-2xl font-bold">${stats.avgJobValue.toFixed(0)}</p>
              <p className="text-sm text-gray-400">Avg Job Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {reportType === 'summary' && (
        <div className="card">
          <h3 className="font-semibold mb-4">Summary Report</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm text-gray-400 mb-2">Jobs by Status</h4>
              <div className="space-y-2">
                {['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'].map(status => {
                  const count = filteredJobs.filter(j => j.status === status).length;
                  const pct = filteredJobs.length > 0 ? (count / filteredJobs.length) * 100 : 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-24 text-sm capitalize">{status.replace('_', ' ')}</span>
                      <div className="flex-1 bg-dark-700 rounded-full h-2">
                        <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-gray-400 w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="text-sm text-gray-400 mb-2">Jobs by Vehicle Type</h4>
              <div className="space-y-2">
                {['flatbed', 'refrigerated', 'tanker', 'container', 'van'].map(type => {
                  const count = filteredJobs.filter(j => j.vehicle_type === type).length;
                  const pct = filteredJobs.length > 0 ? (count / filteredJobs.length) * 100 : 0;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="w-24 text-sm capitalize">{type}</span>
                      <div className="flex-1 bg-dark-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-gray-400 w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {reportType === 'jobs' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-dark-700">
              <tr>
                <th className="text-left p-3">Route</th>
                <th className="text-left p-3">Cargo</th>
                <th className="text-left p-3">Vehicle</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {filteredJobs.map(job => (
                <tr key={job.id} className="hover:bg-dark-700">
                  <td className="p-3">{job.pickup.city} → {job.delivery.city}</td>
                  <td className="p-3">{job.cargo_type}</td>
                  <td className="p-3 capitalize">{job.vehicle_type}</td>
                  <td className="p-3 text-primary-400">${job.price.toLocaleString()}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${job.status === 'delivered' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{job.status}</span></td>
                  <td className="p-3 text-gray-400">{new Date(job.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reportType === 'earnings' && (
        <div className="card">
          <h3 className="font-semibold mb-4">Earnings Report</h3>
          <div className="space-y-4">
            {filteredJobs.filter(j => j.status === 'delivered').map(job => (
              <div key={job.id} className="flex items-center justify-between py-3 border-b border-dark-700 last:border-0">
                <div>
                  <p className="font-medium">{job.pickup.city} → {job.delivery.city}</p>
                  <p className="text-sm text-gray-400">{job.cargo_type} • {new Date(job.created_at).toLocaleDateString()}</p>
                </div>
                <p className="text-xl font-bold text-green-400">+${job.price.toLocaleString()}</p>
              </div>
            ))}
            {filteredJobs.filter(j => j.status === 'delivered').length === 0 && (
              <p className="text-center text-gray-500 py-8">No completed jobs in this period</p>
            )}
            <div className="pt-4 border-t border-dark-600 flex justify-between items-center">
              <span className="text-lg font-semibold">Total Earnings</span>
              <span className="text-2xl font-bold text-green-400">${stats.totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
