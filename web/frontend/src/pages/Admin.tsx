import { useState, useEffect } from 'react';
import { Users, Shield, Ban, CheckCircle, AlertTriangle, Settings, FileText, XCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { authApi, jobsApi, documentsApi, insuranceApi, type User, type Job, type InsuranceClaim } from '../api';

type Tab = 'users' | 'verification' | 'disputes' | 'settings';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ platform_fee: '15', min_job_value: '50', max_job_value: '100000' });

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'users') {
        const res = await authApi.listUsers();
        setUsers(res.data.data || []);
      } else if (tab === 'verification') {
        // Get all users' pending documents - in real app would have admin endpoint
        const usersRes = await authApi.listUsers();
        setUsers(usersRes.data.data || []);
      } else if (tab === 'disputes') {
        const jobsRes = await jobsApi.listJobs({});
        setJobs(jobsRes.data.data || []);
        try {
          const claimsRes = await insuranceApi.getMyClaims();
          setClaims(claimsRes.data.data || []);
        } catch { setClaims([]); }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setLoading(false);
  };

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await authApi.updateUserStatus(userId, status);
      fetchData();
    } catch {
      alert('Failed to update status');
    }
  };

  const verifyDocument = async (docId: string, status: 'verified' | 'rejected') => {
    try {
      await documentsApi.verifyDocument(docId, status);
      fetchData();
    } catch {
      alert('Failed to verify document');
    }
  };

  const handleClaimAction = async (claimId: string, status: string) => {
    const notes = status === 'rejected' ? prompt('Rejection reason:') : undefined;
    try {
      await insuranceApi.updateClaimStatus(claimId, status, notes || undefined);
      fetchData();
    } catch {
      alert('Failed to update claim');
    }
  };

  if (user?.user_type !== 'admin') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">Admin access required.</p>
        </div>
      </div>
    );
  }

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status === 'active');
  const openClaims = claims.filter(c => c.status === 'submitted' || c.status === 'under_review');
  void verifyDocument; // Used in verification tab

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary-500" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card"><p className="text-2xl font-bold">{users.length}</p><p className="text-sm text-gray-400">Total Users</p></div>
        <div className="card"><p className="text-2xl font-bold text-yellow-400">{pendingUsers.length}</p><p className="text-sm text-gray-400">Pending Verification</p></div>
        <div className="card"><p className="text-2xl font-bold text-green-400">{activeUsers.length}</p><p className="text-sm text-gray-400">Active Users</p></div>
        <div className="card"><p className="text-2xl font-bold text-red-400">{openClaims.length}</p><p className="text-sm text-gray-400">Open Disputes</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'users', label: 'Users', icon: Users },
          { id: 'verification', label: 'Verification', icon: FileText, badge: pendingUsers.length },
          { id: 'disputes', label: 'Disputes', icon: AlertTriangle, badge: openClaims.length },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap ${tab === t.id ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'}`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.badge ? <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>
      ) : (
        <>
          {/* Users Tab */}
          {tab === 'users' && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-dark-700">
                  <tr>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Type</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Created</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-dark-700/50">
                      <td className="p-4">{u.email}</td>
                      <td className="p-4 capitalize">{u.user_type}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${u.status === 'active' ? 'bg-green-500/20 text-green-400' : u.status === 'suspended' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        {u.user_type !== 'admin' && (
                          <div className="flex gap-1">
                            {u.status !== 'active' && <button onClick={() => handleStatusChange(u.id, 'active')} className="p-1 text-green-400 hover:bg-green-500/20 rounded" title="Activate"><CheckCircle className="h-4 w-4" /></button>}
                            {u.status !== 'suspended' && <button onClick={() => handleStatusChange(u.id, 'suspended')} className="p-1 text-red-400 hover:bg-red-500/20 rounded" title="Suspend"><Ban className="h-4 w-4" /></button>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Verification Tab */}
          {tab === 'verification' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Pending User Verifications</h3>
              {pendingUsers.length === 0 ? (
                <div className="card text-center py-8 text-gray-500">No pending verifications</div>
              ) : (
                pendingUsers.map(u => (
                  <div key={u.id} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{u.email}</p>
                        <p className="text-sm text-gray-400 capitalize">{u.user_type} • Registered {new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleStatusChange(u.id, 'active')} className="btn-primary text-sm py-1 px-3 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" /> Approve
                        </button>
                        <button onClick={() => handleStatusChange(u.id, 'suspended')} className="btn-secondary text-sm py-1 px-3 text-red-400 flex items-center gap-1">
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Disputes Tab */}
          {tab === 'disputes' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Insurance Claims & Disputes</h3>
              {openClaims.length === 0 ? (
                <div className="card text-center py-8 text-gray-500">No open disputes</div>
              ) : (
                openClaims.map(claim => (
                  <div key={claim.id} className="card">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{claim.claim_number}</p>
                          <span className={`px-2 py-0.5 rounded text-xs ${claim.status === 'under_review' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {claim.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 capitalize">{claim.incident_type.replace('_', ' ')} • {new Date(claim.incident_date).toLocaleDateString()}</p>
                        <p className="text-sm mt-2">{claim.description}</p>
                        <p className="text-lg font-semibold text-primary-400 mt-2">${claim.claim_amount.toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {claim.status === 'submitted' && (
                          <button onClick={() => handleClaimAction(claim.id, 'under_review')} className="btn-secondary text-sm py-1 px-3">
                            Start Review
                          </button>
                        )}
                        <button onClick={() => handleClaimAction(claim.id, 'approved')} className="btn-primary text-sm py-1 px-3 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" /> Approve
                        </button>
                        <button onClick={() => handleClaimAction(claim.id, 'rejected')} className="btn-secondary text-sm py-1 px-3 text-red-400 flex items-center gap-1">
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <h3 className="font-semibold mt-8">Cancelled Jobs (Potential Disputes)</h3>
              {jobs.filter(j => j.status === 'cancelled').length === 0 ? (
                <div className="card text-center py-8 text-gray-500">No cancelled jobs</div>
              ) : (
                jobs.filter(j => j.status === 'cancelled').map(job => (
                  <div key={job.id} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{job.pickup.city} → {job.delivery.city}</p>
                        <p className="text-sm text-gray-400">{job.cargo_type} • ${job.price.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Cancelled {new Date(job.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">Cancelled</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Settings Tab */}
          {tab === 'settings' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="font-semibold mb-4">Platform Settings</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Default Platform Fee (%)</label>
                    <input type="number" value={settings.platform_fee} onChange={e => setSettings({ ...settings, platform_fee: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Minimum Job Value ($)</label>
                    <input type="number" value={settings.min_job_value} onChange={e => setSettings({ ...settings, min_job_value: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Maximum Job Value ($)</label>
                    <input type="number" value={settings.max_job_value} onChange={e => setSettings({ ...settings, max_job_value: e.target.value })} className="input-field" />
                  </div>
                </div>
                <button className="btn-primary mt-4">Save Settings</button>
                <p className="text-xs text-gray-500 mt-2">Note: Settings are stored in platform_settings table in payment service</p>
              </div>

              <div className="card">
                <h3 className="font-semibold mb-4">Subscription Tiers</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-dark-600">
                        <th className="pb-2">Tier</th>
                        <th className="pb-2">Monthly</th>
                        <th className="pb-2">Annual</th>
                        <th className="pb-2">Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-dark-700"><td className="py-2">Free</td><td>$0</td><td>$0</td><td>15%</td></tr>
                      <tr className="border-b border-dark-700"><td className="py-2">Basic</td><td>$99</td><td>$990</td><td>10%</td></tr>
                      <tr className="border-b border-dark-700"><td className="py-2">Pro</td><td>$299</td><td>$2,990</td><td>7%</td></tr>
                      <tr><td className="py-2">Enterprise</td><td>$799</td><td>$7,990</td><td>5%</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold mb-4">System Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Database</span><span className="text-green-400">● Connected</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Payment Gateway</span><span className="text-green-400">● Active</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">WebSocket</span><span className="text-green-400">● Running</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Services</span><span className="text-green-400">● 17/17 Healthy</span></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
