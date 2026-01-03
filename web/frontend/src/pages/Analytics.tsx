import { useState, useEffect } from 'react';
import { analyticsApiClient, type DashboardStats, type JobsByStatus, type JobsByDay, type RevenueByDay, type TopRoute } from '../api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Truck, Users, DollarSign, Package, MapPin } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobsByStatus, setJobsByStatus] = useState<JobsByStatus[]>([]);
  const [jobsByDay, setJobsByDay] = useState<JobsByDay[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<RevenueByDay[]>([]);
  const [topRoutes, setTopRoutes] = useState<TopRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, statusRes, dailyRes, revenueRes, routesRes] = await Promise.all([
        analyticsApiClient.getDashboardStats(),
        analyticsApiClient.getJobsByStatus(),
        analyticsApiClient.getJobsByDay(days),
        analyticsApiClient.getRevenueByDay(days),
        analyticsApiClient.getTopRoutes(5),
      ]);
      setStats(statsRes.data.data);
      setJobsByStatus(statusRes.data.data || []);
      setJobsByDay(dailyRes.data.data || []);
      setRevenueByDay(revenueRes.data.data || []);
      setTopRoutes(routesRes.data.data || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  const statCards = [
    { label: 'Total Jobs', value: stats?.total_jobs || 0, icon: Package, color: 'text-blue-400' },
    { label: 'Active Jobs', value: stats?.active_jobs || 0, icon: Truck, color: 'text-green-400' },
    { label: 'Completed', value: stats?.completed_jobs || 0, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Total Revenue', value: `$${(stats?.total_revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-yellow-400' },
    { label: 'Drivers', value: stats?.total_drivers || 0, icon: Users, color: 'text-purple-400' },
    { label: 'Shippers', value: stats?.total_shippers || 0, icon: Users, color: 'text-pink-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="input"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Jobs by Day */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Jobs Created</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={jobsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Day */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Daily Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: '#9ca3af' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} formatter={(v) => [`$${v}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Jobs by Status */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Jobs by Status</h3>
          {jobsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={jobsByStatus as unknown as Record<string, unknown>[]}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {jobsByStatus.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>

        {/* Top Routes */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Top Routes</h3>
          {topRoutes.length > 0 ? (
            <div className="space-y-3">
              {topRoutes.map((route, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary-400" />
                    <span>{route.origin} → {route.destination}</span>
                  </div>
                  <span className="bg-primary-500/20 text-primary-400 px-3 py-1 rounded-full text-sm">
                    {route.count} jobs
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {stats && stats.completed_jobs > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-semibold mb-4">Summary</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-dark-800 rounded-lg">
              <p className="text-3xl font-bold text-green-400">${stats.avg_job_value.toFixed(0)}</p>
              <p className="text-gray-400">Average Job Value</p>
            </div>
            <div className="text-center p-4 bg-dark-800 rounded-lg">
              <p className="text-3xl font-bold text-blue-400">
                {stats.total_jobs > 0 ? ((stats.completed_jobs / stats.total_jobs) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-gray-400">Completion Rate</p>
            </div>
            <div className="text-center p-4 bg-dark-800 rounded-lg">
              <p className="text-3xl font-bold text-purple-400">
                {stats.total_drivers > 0 ? (stats.completed_jobs / stats.total_drivers).toFixed(1) : 0}
              </p>
              <p className="text-gray-400">Jobs per Driver</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
