import { useState, useEffect } from 'react';
import { Shield, Plus, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { insuranceApi, type InsurancePolicy, type InsuranceClaim } from '../api';
import { useAuth } from '../AuthContext';

const POLICY_TYPES = [
  { value: 'comprehensive', label: 'Comprehensive (Vehicle)', forDriver: true },
  { value: 'third_party', label: 'Third Party (Vehicle)', forDriver: true },
  { value: 'cargo', label: 'Cargo Insurance', forDriver: true, forShipper: true },
  { value: 'liability', label: 'Public Liability', forDriver: true },
  { value: 'freight', label: 'Freight Insurance', forShipper: true },
  { value: 'goods_in_transit', label: 'Goods in Transit', forShipper: true },
];

const INCIDENT_TYPES = [
  { value: 'accident', label: 'Vehicle Accident', forDriver: true },
  { value: 'theft', label: 'Theft', forDriver: true, forShipper: true },
  { value: 'damage', label: 'Property Damage', forDriver: true },
  { value: 'cargo_loss', label: 'Cargo Loss/Damage', forDriver: true, forShipper: true },
  { value: 'freight_damage', label: 'Freight Damage', forShipper: true },
  { value: 'delivery_failure', label: 'Delivery Failure', forShipper: true },
];

export default function Insurance() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'policies' | 'claims'>('policies');
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [showAddClaim, setShowAddClaim] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicy | null>(null);

  const [policyForm, setPolicyForm] = useState({ policy_number: '', provider: '', policy_type: 'comprehensive', coverage_amount: '', premium: '', start_date: '', end_date: '' });
  const [claimForm, setClaimForm] = useState({ policy_id: '', incident_date: '', incident_type: 'accident', description: '', claim_amount: '', job_id: '' });

  const isDriver = user?.user_type === 'driver';
  const isShipper = user?.user_type === 'shipper';
  const availablePolicyTypes = POLICY_TYPES.filter(t => (isDriver && t.forDriver) || (isShipper && t.forShipper));
  const availableIncidentTypes = INCIDENT_TYPES.filter(t => (isDriver && t.forDriver) || (isShipper && t.forShipper));

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [policiesRes, claimsRes] = await Promise.all([
        insuranceApi.getMyPolicies(),
        insuranceApi.getMyClaims(),
      ]);
      setPolicies(policiesRes.data.data || []);
      setClaims(claimsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load insurance data:', err);
    }
    setLoading(false);
  };

  const handleAddPolicy = async () => {
    try {
      await insuranceApi.createPolicy({
        ...policyForm,
        coverage_amount: parseFloat(policyForm.coverage_amount),
        premium: policyForm.premium ? parseFloat(policyForm.premium) : undefined,
      });
      setShowAddPolicy(false);
      setPolicyForm({ policy_number: '', provider: '', policy_type: 'comprehensive', coverage_amount: '', premium: '', start_date: '', end_date: '' });
      loadData();
    } catch (err) {
      alert('Failed to add policy');
    }
  };

  const handleAddClaim = async () => {
    try {
      await insuranceApi.createClaim({
        ...claimForm,
        claim_amount: parseFloat(claimForm.claim_amount),
        job_id: claimForm.job_id || undefined,
      });
      setShowAddClaim(false);
      setClaimForm({ policy_id: '', incident_date: '', incident_type: 'accident', description: '', claim_amount: '', job_id: '' });
      loadData();
    } catch (err) {
      alert('Failed to submit claim');
    }
  };

  const handleVerifyPolicy = async (id: string, approve: boolean) => {
    try {
      await insuranceApi.verifyPolicy(id, approve);
      loadData();
    } catch (err) {
      alert('Verification failed');
    }
  };

  const handleUpdateClaimStatus = async (id: string, status: string) => {
    const notes = status === 'rejected' ? prompt('Rejection reason:') : undefined;
    try {
      await insuranceApi.updateClaimStatus(id, status, notes || undefined);
      loadData();
    } catch (err) {
      alert('Update failed');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      expired: 'bg-red-500/20 text-red-400',
      cancelled: 'bg-gray-500/20 text-gray-400',
      submitted: 'bg-blue-500/20 text-blue-400',
      under_review: 'bg-yellow-500/20 text-yellow-400',
      approved: 'bg-green-500/20 text-green-400',
      rejected: 'bg-red-500/20 text-red-400',
      paid: 'bg-primary-500/20 text-primary-400',
    };
    return <span className={`px-2 py-1 rounded text-xs ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>{status.replace('_', ' ')}</span>;
  };

  const isExpiringSoon = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days > 0;
  };

  const isAdmin = user?.user_type === 'admin';
  const activePolicies = policies.filter(p => p.status === 'active');

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> Insurance</h1>
          <p className="text-gray-400">Manage your insurance policies and claims</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card"><p className="text-2xl font-bold">{activePolicies.length}</p><p className="text-sm text-gray-400">Active Policies</p></div>
        <div className="card"><p className="text-2xl font-bold">${activePolicies.reduce((sum, p) => sum + p.coverage_amount, 0).toLocaleString()}</p><p className="text-sm text-gray-400">Total Coverage</p></div>
        <div className="card"><p className="text-2xl font-bold">{claims.filter(c => c.status === 'submitted' || c.status === 'under_review').length}</p><p className="text-sm text-gray-400">Open Claims</p></div>
        <div className="card"><p className="text-2xl font-bold">{policies.filter(p => isExpiringSoon(p.end_date)).length}</p><p className="text-sm text-gray-400">Expiring Soon</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('policies')} className={`px-4 py-2 rounded-lg ${tab === 'policies' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400'}`}>
          Policies ({policies.length})
        </button>
        <button onClick={() => setTab('claims')} className={`px-4 py-2 rounded-lg ${tab === 'claims' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400'}`}>
          Claims ({claims.length})
        </button>
        <div className="flex-1" />
        {tab === 'policies' && <button onClick={() => setShowAddPolicy(true)} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> Add Policy</button>}
        {tab === 'claims' && activePolicies.length > 0 && <button onClick={() => setShowAddClaim(true)} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> File Claim</button>}
      </div>

      {/* Policies Tab */}
      {tab === 'policies' && (
        <div className="space-y-4">
          {policies.length === 0 ? (
            <div className="card text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No insurance policies yet</p>
              <button onClick={() => setShowAddPolicy(true)} className="text-primary-400 hover:text-primary-300 mt-2">Add your first policy</button>
            </div>
          ) : (
            policies.map(policy => (
              <div key={policy.id} className={`card ${isExpiringSoon(policy.end_date) ? 'border border-yellow-500/50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{policy.provider}</p>
                      {getStatusBadge(policy.status)}
                      {isExpiringSoon(policy.end_date) && <span className="text-yellow-400 text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Expiring soon</span>}
                    </div>
                    <p className="text-sm text-gray-400">Policy #{policy.policy_number}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="capitalize">{policy.policy_type.replace('_', ' ')}</span>
                      <span>Coverage: ${policy.coverage_amount.toLocaleString()}</span>
                      {policy.premium > 0 && <span>Premium: ${policy.premium}/mo</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(policy.start_date).toLocaleDateString()} - {new Date(policy.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && policy.status === 'pending' && (
                      <>
                        <button onClick={() => handleVerifyPolicy(policy.id, true)} className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg"><CheckCircle className="h-4 w-4" /></button>
                        <button onClick={() => handleVerifyPolicy(policy.id, false)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><XCircle className="h-4 w-4" /></button>
                      </>
                    )}
                    <button onClick={() => setSelectedPolicy(selectedPolicy?.id === policy.id ? null : policy)} className="text-primary-400 hover:text-primary-300 text-sm">
                      {selectedPolicy?.id === policy.id ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>
                {selectedPolicy?.id === policy.id && (
                  <div className="mt-4 pt-4 border-t border-dark-600 text-sm">
                    <p className="text-gray-400 mb-2">Claims on this policy:</p>
                    {claims.filter(c => c.policy_id === policy.id).length === 0 ? (
                      <p className="text-gray-500">No claims filed</p>
                    ) : (
                      claims.filter(c => c.policy_id === policy.id).map(claim => (
                        <div key={claim.id} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
                          <div>
                            <p>{claim.claim_number} - {claim.incident_type}</p>
                            <p className="text-xs text-gray-500">${claim.claim_amount.toLocaleString()}</p>
                          </div>
                          {getStatusBadge(claim.status)}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Claims Tab */}
      {tab === 'claims' && (
        <div className="space-y-4">
          {claims.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No claims filed</p>
            </div>
          ) : (
            claims.map(claim => (
              <div key={claim.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{claim.claim_number}</p>
                      {getStatusBadge(claim.status)}
                    </div>
                    <p className="text-sm text-gray-400 capitalize">{claim.incident_type.replace('_', ' ')} - {new Date(claim.incident_date).toLocaleDateString()}</p>
                    <p className="text-sm mt-2">{claim.description}</p>
                    <p className="text-lg font-semibold text-primary-400 mt-2">${claim.claim_amount.toLocaleString()}</p>
                    {claim.resolution_notes && <p className="text-sm text-gray-500 mt-2 italic">Note: {claim.resolution_notes}</p>}
                  </div>
                  {isAdmin && (claim.status === 'submitted' || claim.status === 'under_review') && (
                    <div className="flex gap-2">
                      {claim.status === 'submitted' && (
                        <button onClick={() => handleUpdateClaimStatus(claim.id, 'under_review')} className="text-yellow-400 hover:text-yellow-300 text-sm">Review</button>
                      )}
                      <button onClick={() => handleUpdateClaimStatus(claim.id, 'approved')} className="text-green-400 hover:text-green-300 text-sm">Approve</button>
                      <button onClick={() => handleUpdateClaimStatus(claim.id, 'rejected')} className="text-red-400 hover:text-red-300 text-sm">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Policy Modal */}
      {showAddPolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h2 className="text-xl font-semibold">Add Insurance Policy</h2>
              <button onClick={() => setShowAddPolicy(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">Policy Number</label><input value={policyForm.policy_number} onChange={e => setPolicyForm({ ...policyForm, policy_number: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Provider</label><input value={policyForm.provider} onChange={e => setPolicyForm({ ...policyForm, provider: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="block text-sm text-gray-400 mb-1">Policy Type</label><select value={policyForm.policy_type} onChange={e => setPolicyForm({ ...policyForm, policy_type: e.target.value })} className="input-field">{availablePolicyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">Coverage Amount ($)</label><input type="number" value={policyForm.coverage_amount} onChange={e => setPolicyForm({ ...policyForm, coverage_amount: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Monthly Premium ($)</label><input type="number" value={policyForm.premium} onChange={e => setPolicyForm({ ...policyForm, premium: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">Start Date</label><input type="date" value={policyForm.start_date} onChange={e => setPolicyForm({ ...policyForm, start_date: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">End Date</label><input type="date" value={policyForm.end_date} onChange={e => setPolicyForm({ ...policyForm, end_date: e.target.value })} className="input-field" /></div>
              </div>
              {isShipper && <p className="text-sm text-gray-500">Tip: Freight insurance protects your cargo during transit. Coverage should match your typical shipment values.</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddPolicy(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAddPolicy} className="btn-primary flex-1">Add Policy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Claim Modal */}
      {showAddClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h2 className="text-xl font-semibold">File Insurance Claim</h2>
              <button onClick={() => setShowAddClaim(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">Policy</label><select value={claimForm.policy_id} onChange={e => setClaimForm({ ...claimForm, policy_id: e.target.value })} className="input-field"><option value="">Select policy...</option>{activePolicies.map(p => <option key={p.id} value={p.id}>{p.provider} - {p.policy_number} ({p.policy_type})</option>)}</select></div>
              {isShipper && (
                <div><label className="block text-sm text-gray-400 mb-1">Related Job (optional)</label><input value={claimForm.job_id} onChange={e => setClaimForm({ ...claimForm, job_id: e.target.value })} className="input-field" placeholder="Enter Job ID if claim relates to a specific shipment" /></div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">Incident Date</label><input type="date" value={claimForm.incident_date} onChange={e => setClaimForm({ ...claimForm, incident_date: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Incident Type</label><select value={claimForm.incident_type} onChange={e => setClaimForm({ ...claimForm, incident_type: e.target.value })} className="input-field">{availableIncidentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              </div>
              <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={claimForm.description} onChange={e => setClaimForm({ ...claimForm, description: e.target.value })} className="input-field" rows={3} placeholder={isShipper ? "Describe the damage/loss to your freight..." : "Describe the incident..."} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Claim Amount ($)</label><input type="number" value={claimForm.claim_amount} onChange={e => setClaimForm({ ...claimForm, claim_amount: e.target.value })} className="input-field" /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddClaim(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAddClaim} disabled={!claimForm.policy_id} className="btn-primary flex-1">Submit Claim</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
