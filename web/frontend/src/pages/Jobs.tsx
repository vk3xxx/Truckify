import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, MapPin, DollarSign, Truck, ChevronRight, Plus, X, Calendar, Package, FileText, Star, Gavel, Filter, ChevronDown, CreditCard } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { jobsApi, ratingsApi, biddingApiClient, pricingApi, messagingApi } from '../api';
import type { Job, Rating } from '../api';

interface Filters {
  search: string;
  status: string;
  vehicleType: string;
  minPrice: string;
  maxPrice: string;
  minWeight: string;
  maxWeight: string;
  pickupState: string;
  deliveryState: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const defaultFilters: Filters = {
  search: '',
  status: 'all',
  vehicleType: 'all',
  minPrice: '',
  maxPrice: '',
  minWeight: '',
  maxWeight: '',
  pickupState: 'all',
  deliveryState: 'all',
  dateFrom: '',
  dateTo: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
};

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

export default function Jobs() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    ...defaultFilters,
    status: searchParams.get('status') || 'all',
  });
  const [showMyJobs, setShowMyJobs] = useState(searchParams.get('mine') === 'true');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [bidJob, setBidJob] = useState<Job | null>(null);
  const isDriver = user?.user_type === 'driver';
  const isShipper = user?.user_type === 'shipper';

  useEffect(() => {
    setFilters(f => ({ ...f, status: searchParams.get('status') || 'all' }));
    setShowMyJobs(searchParams.get('mine') === 'true');
  }, [searchParams]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await jobsApi.listJobs({});
      setJobs(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs
    .filter(job => {
      // Text search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchesSearch = 
          job.pickup.city.toLowerCase().includes(q) ||
          job.delivery.city.toLowerCase().includes(q) ||
          job.pickup.state.toLowerCase().includes(q) ||
          job.delivery.state.toLowerCase().includes(q) ||
          job.cargo_type.toLowerCase().includes(q) ||
          job.id.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      
      // Status
      if (filters.status !== 'all' && job.status !== filters.status) return false;
      
      // Vehicle type
      if (filters.vehicleType !== 'all' && job.vehicle_type !== filters.vehicleType) return false;
      
      // Price range
      if (filters.minPrice && job.price < parseFloat(filters.minPrice)) return false;
      if (filters.maxPrice && job.price > parseFloat(filters.maxPrice)) return false;
      
      // Weight range
      if (filters.minWeight && job.weight < parseFloat(filters.minWeight)) return false;
      if (filters.maxWeight && job.weight > parseFloat(filters.maxWeight)) return false;
      
      // Pickup state
      if (filters.pickupState !== 'all' && job.pickup.state !== filters.pickupState) return false;
      
      // Delivery state
      if (filters.deliveryState !== 'all' && job.delivery.state !== filters.deliveryState) return false;
      
      // Date range
      if (filters.dateFrom && new Date(job.pickup_date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(job.pickup_date) > new Date(filters.dateTo)) return false;
      
      // My jobs
      if (showMyJobs && job.driver_id !== user?.id) return false;
      
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (filters.sortBy) {
        case 'price': cmp = a.price - b.price; break;
        case 'weight': cmp = a.weight - b.weight; break;
        case 'pickup_date': cmp = new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime(); break;
        default: cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return filters.sortOrder === 'desc' ? -cmp : cmp;
    });

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'sortBy' || k === 'sortOrder') return false;
    if (k === 'status' || k === 'vehicleType' || k === 'pickupState' || k === 'deliveryState') return v !== 'all';
    return v !== '';
  }).length;

  const clearFilters = () => {
    setFilters(defaultFilters);
    setShowMyJobs(false);
  };

  const handleBookJob = async (jobId: string) => {
    if (!user) return;
    try {
      await jobsApi.assignDriver(jobId, user.id);
      fetchJobs();
    } catch (err) {
      console.error('Failed to book job:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{isDriver ? 'Available Jobs' : 'Your Shipments'}</h1>
          <p className="text-gray-400 mt-2 text-base">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {isShipper && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary shrink-0">
            <Plus className="h-5 w-5 mr-2" />
            Create Shipment
          </button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="card mb-6 border-dark-700">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search cities, states, cargo type, or job ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input-field"
              style={{ paddingLeft: '3rem' }}
            />
          </div>
          <div className="flex gap-3">
            {isDriver && (
              <button
                onClick={() => setShowMyJobs(!showMyJobs)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                  showMyJobs 
                    ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30' 
                    : 'bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-600'
                }`}
              >
                My Jobs
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                showFilters || activeFilterCount > 0 
                  ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30' 
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-600'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white/25 px-2 py-0.5 rounded-full text-xs font-semibold">{activeFilterCount}</span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-dark-700">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="input-field text-sm">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Vehicle Type</label>
                <select value={filters.vehicleType} onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })} className="input-field text-sm">
                  <option value="all">All Types</option>
                  <option value="flatbed">Flatbed</option>
                  <option value="dry_van">Dry Van</option>
                  <option value="refrigerated">Refrigerated</option>
                  <option value="tanker">Tanker</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pickup State</label>
                <select value={filters.pickupState} onChange={(e) => setFilters({ ...filters, pickupState: e.target.value })} className="input-field text-sm">
                  <option value="all">Any State</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Delivery State</label>
                <select value={filters.deliveryState} onChange={(e) => setFilters({ ...filters, deliveryState: e.target.value })} className="input-field text-sm">
                  <option value="all">Any State</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Min Price ($)</label>
                <input type="number" placeholder="0" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Price ($)</label>
                <input type="number" placeholder="Any" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Min Weight (kg)</label>
                <input type="number" placeholder="0" value={filters.minWeight} onChange={(e) => setFilters({ ...filters, minWeight: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Weight (kg)</label>
                <input type="number" placeholder="Any" value={filters.maxWeight} onChange={(e) => setFilters({ ...filters, maxWeight: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pickup From</label>
                <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pickup To</label>
                <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Sort By</label>
                <select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })} className="input-field text-sm">
                  <option value="created_at">Date Created</option>
                  <option value="pickup_date">Pickup Date</option>
                  <option value="price">Price</option>
                  <option value="weight">Weight</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Order</label>
                <select value={filters.sortOrder} onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value as 'asc' | 'desc' })} className="input-field text-sm">
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-white">
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <div key={job.id} className="card hover:border-primary-500 transition-all cursor-pointer border-dark-700">
            <div className="flex flex-col xl:flex-row xl:items-center gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs text-gray-500 font-mono font-medium">{job.id.slice(0, 8)}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    job.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    job.status === 'assigned' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    job.status === 'in_transit' ? 'bg-primary-500/20 text-primary-400 border-primary-500/30' :
                    job.status === 'delivered' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-primary-500 rounded-full shrink-0 shadow-sm shadow-primary-500/50" />
                      <span className="font-semibold text-white">{job.pickup.city}, {job.pickup.state}</span>
                    </div>
                    <div className="text-sm text-gray-400 ml-6 mt-1.5">{new Date(job.pickup_date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex-1 border-t border-dashed border-dark-600 relative min-w-[60px] hidden sm:block">
                    {job.distance && (
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-dark-800 px-3 text-xs text-gray-500 whitespace-nowrap font-medium">
                        {job.distance} km
                      </span>
                    )}
                  </div>
                  <div className="shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 border-2 border-gray-400 rounded-full shrink-0" />
                      <span className="font-semibold text-white">{job.delivery.city}, {job.delivery.state}</span>
                    </div>
                    <div className="text-sm text-gray-400 ml-6 mt-1.5">{new Date(job.delivery_date).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 xl:gap-4 text-sm border-t xl:border-t-0 xl:border-l border-dark-700 pt-5 xl:pt-0 xl:pl-6">
                <div className="flex items-center gap-2 bg-dark-700 px-3 py-2 rounded-lg border border-dark-600">
                  <Truck className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300 capitalize">{job.vehicle_type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2 bg-dark-700 px-3 py-2 rounded-lg border border-dark-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300">{job.weight.toLocaleString()} kg</span>
                </div>
                <div className="flex items-center gap-1 text-primary-400 font-bold text-xl">
                  <DollarSign className="h-5 w-5" />
                  <span>{job.price.toLocaleString()}</span>
                </div>
              </div>

              <div className="shrink-0 flex gap-2 xl:flex-col">
                {isDriver && job.status === 'pending' && (
                  <>
                    <button onClick={() => setBidJob(job)} className="btn-secondary w-full xl:w-auto text-sm">
                      <Gavel className="h-4 w-4 mr-1.5" />
                      Bid
                    </button>
                    <button onClick={() => handleBookJob(job.id)} className="btn-primary w-full xl:w-auto text-sm">
                      Book Now
                    </button>
                  </>
                )}
                {(!isDriver || job.status !== 'pending') && (
                  <button onClick={() => setSelectedJob(job)} className="btn-secondary w-full xl:w-auto text-sm">
                    View Details
                    <ChevronRight className="h-4 w-4 ml-1.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-dark-700">
            <Truck className="h-10 w-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No jobs found</h3>
          <p className="text-gray-400 text-base">
            {isShipper ? 'Create your first shipment to get started' : 'Check back later for new opportunities'}
          </p>
        </div>
      )}

      {showCreateModal && <CreateJobModal onClose={() => setShowCreateModal(false)} onCreated={fetchJobs} />}
      {selectedJob && <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} onUpdate={fetchJobs} />}
      {bidJob && <PlaceBidModal job={bidJob} onClose={() => setBidJob(null)} />}
    </div>
  );
}

function PlaceBidModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const [amount, setAmount] = useState(job.price.toString());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await biddingApiClient.createBid({ job_id: job.id, amount: parseFloat(amount), notes: notes || undefined });
      onClose();
    } catch {
      setError('Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-md">
        <div className="modal-header">
          <h2 className="text-xl font-semibold">Place Bid</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">{error}</div>}
          
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="text-sm text-gray-400">Route</div>
            <div className="font-medium">{job.pickup.city} → {job.delivery.city}</div>
            <div className="text-sm text-gray-400 mt-2">Listed Price: ${job.price.toLocaleString()}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Your Bid Amount ($)</label>
            <input type="number" required className="input-field" value={amount} onChange={e => setAmount(e.target.value)} min="1" step="0.01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
            <textarea className="input-field" rows={2} placeholder="Why should they choose you?" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Submitting...' : 'Place Bid'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JobDetailsModal({ job, onClose, onUpdate }: { job: Job; onClose: () => void; onUpdate: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [bids, setBids] = useState<{ id: string; amount: number; notes?: string; status: string; created_at: string }[]>([]);
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const isDriver = user?.user_type === 'driver';
  const isAssignedDriver = job.driver_id === user?.id;
  const isJobOwner = job.shipper_id === user?.id;

  useEffect(() => {
    if (job.status === 'delivered') {
      ratingsApi.getJobRatings(job.id).then(res => setRatings(res.data.data || [])).catch(() => {});
    }
    if (job.status === 'pending' && isJobOwner) {
      biddingApiClient.getJobBids(job.id).then(res => setBids(res.data.data || [])).catch(() => {});
    }
  }, [job.id, job.status, isJobOwner]);

  const hasRated = ratings.some(r => r.rater_id === user?.id);
  const canRate = job.status === 'delivered' && !hasRated && (isAssignedDriver || isJobOwner);

  const handleAcceptBid = async (bidId: string) => {
    try {
      await biddingApiClient.acceptBid(bidId);
      onUpdate();
      onClose();
    } catch (err) { console.error('Failed:', err); }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    assigned: 'bg-blue-500/20 text-blue-400',
    in_transit: 'bg-purple-500/20 text-purple-400',
    delivered: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-red-500/20 text-red-400',
  };

  const handleAction = async (action: 'pickup' | 'deliver' | 'cancel') => {
    setLoading(true);
    try {
      if (action === 'pickup') await jobsApi.markPickedUp(job.id);
      else if (action === 'deliver') await jobsApi.markDelivered(job.id);
      else await jobsApi.cancelJob(job.id);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await pricingApi.createCheckout(
        job.id,
        `${window.location.origin}/jobs?payment=success&job=${job.id}`,
        `${window.location.origin}/jobs?payment=cancelled&job=${job.id}`
      );
      window.location.href = res.data.data.checkout_url;
    } catch (err) {
      console.error('Checkout failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!job.driver_id) return;
    setLoading(true);
    try {
      await messagingApi.getOrCreateConversation(job.id, job.shipper_id, job.driver_id);
      window.location.href = '/messages';
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
    setLoading(false);
  };

  const handleSubmitRating = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rateeId = isDriver ? job.shipper_id : job.driver_id;
      if (!rateeId) return;
      await ratingsApi.createRating({
        job_id: job.id,
        ratee_id: rateeId,
        rating: ratingValue,
        comment: ratingComment || undefined,
      });
      const res = await ratingsApi.getJobRatings(job.id);
      setRatings(res.data.data || []);
      setShowRating(false);
    } catch (err) {
      console.error('Rating failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-lg">
        <div className="modal-header">
          <h2 className="text-xl font-semibold">Job Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><X className="h-6 w-6" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Job ID</span>
            <span className="font-mono text-sm">{job.id.slice(0, 8)}...</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Status</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[job.status]}`}>
              {job.status.replace('_', ' ')}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 shrink-0" />
              <div>
                <div className="text-sm text-gray-400">Pickup</div>
                <div className="font-medium">{job.pickup.city}, {job.pickup.state}</div>
                {job.pickup.address && <div className="text-sm text-gray-400">{job.pickup.address}</div>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <div>
                <div className="text-sm text-gray-400">Delivery</div>
                <div className="font-medium">{job.delivery.city}, {job.delivery.state}</div>
                {job.delivery.address && <div className="text-sm text-gray-400">{job.delivery.address}</div>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Calendar className="h-4 w-4" /> Pickup Date
              </div>
              <div className="font-medium">{new Date(job.pickup_date).toLocaleDateString()}</div>
            </div>
            <div className="bg-dark-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Calendar className="h-4 w-4" /> Delivery Date
              </div>
              <div className="font-medium">{new Date(job.delivery_date).toLocaleDateString()}</div>
            </div>
            <div className="bg-dark-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Package className="h-4 w-4" /> Cargo
              </div>
              <div className="font-medium">{job.cargo_type} • {job.weight} kg</div>
            </div>
            <div className="bg-dark-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Truck className="h-4 w-4" /> Vehicle
              </div>
              <div className="font-medium capitalize">{job.vehicle_type.replace('_', ' ')}</div>
            </div>
          </div>

          <div className="bg-primary-500/10 rounded-xl p-4 flex items-center justify-between">
            <span className="text-gray-300">Payment</span>
            <span className="text-2xl font-bold text-primary-400">${job.price.toLocaleString()}</span>
          </div>

          {job.notes && (
            <div className="bg-dark-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <FileText className="h-4 w-4" /> Notes
              </div>
              <p className="text-gray-300">{job.notes}</p>
            </div>
          )}

          {/* Bids Section - for shippers on pending jobs */}
          {job.status === 'pending' && isJobOwner && bids.length > 0 && (
            <div className="bg-dark-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                <Gavel className="h-4 w-4" /> Bids ({bids.length})
              </div>
              <div className="space-y-3">
                {bids.map(bid => (
                  <div key={bid.id} className="flex items-center justify-between bg-dark-600 rounded-lg p-3">
                    <div>
                      <span className="text-lg font-bold text-primary-400">${bid.amount}</span>
                      {bid.notes && <p className="text-sm text-gray-400 mt-1">{bid.notes}</p>}
                    </div>
                    {bid.status === 'pending' && (
                      <button onClick={() => handleAcceptBid(bid.id)} className="btn-primary text-sm py-2 px-4">Accept</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating Section */}
          {job.status === 'delivered' && (
            <div className="bg-dark-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                <Star className="h-4 w-4" /> Ratings
              </div>
              {ratings.length > 0 ? (
                <div className="space-y-3">
                  {ratings.map(r => (
                    <div key={r.id} className="flex items-start gap-3">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className={`h-4 w-4 ${i <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                        ))}
                      </div>
                      {r.comment && <p className="text-sm text-gray-300">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No ratings yet</p>
              )}
              
              {canRate && !showRating && (
                <button onClick={() => setShowRating(true)} className="mt-3 text-primary-400 text-sm hover:text-primary-300">
                  + Leave a rating
                </button>
              )}
              
              {showRating && (
                <div className="mt-4 pt-4 border-t border-dark-600 space-y-3">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <button key={i} onClick={() => setRatingValue(i)}>
                        <Star className={`h-6 w-6 ${i <= ratingValue ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Add a comment (optional)"
                    className="input-field text-sm"
                    rows={2}
                    value={ratingComment}
                    onChange={e => setRatingComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowRating(false)} className="btn-secondary text-sm py-2 flex-1">Cancel</button>
                    <button onClick={handleSubmitRating} disabled={loading} className="btn-primary text-sm py-2 flex-1">
                      {loading ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-dark-700 space-y-3">
          {isDriver && isAssignedDriver && job.status === 'assigned' && (
            <button onClick={() => handleAction('pickup')} disabled={loading} className="btn-primary w-full">
              {loading ? 'Processing...' : 'Mark as Picked Up'}
            </button>
          )}
          {isDriver && isAssignedDriver && job.status === 'in_transit' && (
            <button onClick={() => handleAction('deliver')} disabled={loading} className="btn-primary w-full">
              {loading ? 'Processing...' : 'Mark as Delivered'}
            </button>
          )}
          {job.status === 'in_transit' && (
            <button onClick={() => navigate(`/tracking/${job.id}`)} className="btn-secondary w-full">
              📍 Track Shipment
            </button>
          )}
          {job.driver_id && (isJobOwner || isAssignedDriver) && (
            <button onClick={handleStartChat} disabled={loading} className="btn-secondary w-full">
              💬 Message {isJobOwner ? 'Driver' : 'Shipper'}
            </button>
          )}
          {isJobOwner && job.status === 'delivered' && (
            <button onClick={handlePay} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <CreditCard className="h-4 w-4" />
              {loading ? 'Processing...' : `Pay $${job.price.toLocaleString()}`}
            </button>
          )}
          {(job.status === 'pending' || job.status === 'assigned') && (
            <button onClick={() => handleAction('cancel')} disabled={loading} className="btn-secondary w-full text-red-400 hover:text-red-300">
              Cancel Job
            </button>
          )}
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        </div>
      </div>
    </div>
  );
}

function CreateJobModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    pickup_street: '', pickup_city: '', pickup_state: 'VIC', pickup_postcode: '',
    delivery_street: '', delivery_city: '', delivery_state: 'VIC', delivery_postcode: '',
    pickup_date: '', delivery_date: '', cargo_type: '', weight: '',
    vehicle_type: 'flatbed', price: '', notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await jobsApi.createJob({
        pickup_city: form.pickup_city, pickup_state: form.pickup_state, pickup_address: form.pickup_street,
        delivery_city: form.delivery_city, delivery_state: form.delivery_state, delivery_address: form.delivery_street,
        pickup_date: form.pickup_date, delivery_date: form.delivery_date,
        cargo_type: form.cargo_type, weight: parseFloat(form.weight),
        vehicle_type: form.vehicle_type, price: parseFloat(form.price),
        notes: form.notes || undefined
      });
      onCreated();
      onClose();
    } catch {
      setError('Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-lg">
        <div className="modal-header">
          <h2 className="text-xl font-semibold">Create Shipment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">{error}</div>}
          
          <div className="p-4 bg-dark-700 rounded-lg space-y-4">
            <h3 className="font-medium text-primary-500">Pickup Address</h3>
            <input type="text" required placeholder="Street address" className="input-field" value={form.pickup_street} onChange={e => setForm({...form, pickup_street: e.target.value})} />
            <div className="grid grid-cols-3 gap-3">
              <input type="text" required placeholder="Suburb" className="input-field" value={form.pickup_city} onChange={e => setForm({...form, pickup_city: e.target.value})} />
              <select className="input-field" value={form.pickup_state} onChange={e => setForm({...form, pickup_state: e.target.value})}>
                <option value="NSW">NSW</option><option value="VIC">VIC</option><option value="QLD">QLD</option>
                <option value="WA">WA</option><option value="SA">SA</option><option value="TAS">TAS</option>
                <option value="NT">NT</option><option value="ACT">ACT</option>
              </select>
              <input type="text" required placeholder="Postcode" maxLength={4} className="input-field" value={form.pickup_postcode} onChange={e => setForm({...form, pickup_postcode: e.target.value})} />
            </div>
          </div>

          <div className="p-4 bg-dark-700 rounded-lg space-y-4">
            <h3 className="font-medium text-primary-500">Delivery Address</h3>
            <input type="text" required placeholder="Street address" className="input-field" value={form.delivery_street} onChange={e => setForm({...form, delivery_street: e.target.value})} />
            <div className="grid grid-cols-3 gap-3">
              <input type="text" required placeholder="Suburb" className="input-field" value={form.delivery_city} onChange={e => setForm({...form, delivery_city: e.target.value})} />
              <select className="input-field" value={form.delivery_state} onChange={e => setForm({...form, delivery_state: e.target.value})}>
                <option value="NSW">NSW</option><option value="VIC">VIC</option><option value="QLD">QLD</option>
                <option value="WA">WA</option><option value="SA">SA</option><option value="TAS">TAS</option>
                <option value="NT">NT</option><option value="ACT">ACT</option>
              </select>
              <input type="text" required placeholder="Postcode" maxLength={4} className="input-field" value={form.delivery_postcode} onChange={e => setForm({...form, delivery_postcode: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Pickup Date</label>
              <input type="date" required className="input-field" value={form.pickup_date} onChange={e => setForm({...form, pickup_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Date</label>
              <input type="date" required className="input-field" value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Cargo Type</label>
              <input type="text" required className="input-field" placeholder="e.g., General, Perishable" value={form.cargo_type} onChange={e => setForm({...form, cargo_type: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Weight (kg)</label>
              <input type="number" required className="input-field" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle Type</label>
              <select className="input-field" value={form.vehicle_type} onChange={e => setForm({...form, vehicle_type: e.target.value})}>
                <option value="flatbed">Flatbed</option>
                <option value="dry_van">Dry Van</option>
                <option value="refrigerated">Refrigerated</option>
                <option value="tanker">Tanker</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Price ($)</label>
              <input type="number" required className="input-field" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create Shipment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
