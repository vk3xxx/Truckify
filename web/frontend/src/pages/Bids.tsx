import { useState, useEffect } from 'react';
import { Clock, Check, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { biddingApiClient, jobsApi } from '../api';
import type { Bid, Job } from '../api';

export default function Bids() {
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobBids, setJobBids] = useState<Bid[]>([]);
  const isDriver = user?.user_type === 'driver';

  useEffect(() => {
    fetchData();
  }, [isDriver]);

  const fetchData = async () => {
    try {
      if (isDriver) {
        const res = await biddingApiClient.getMyBids();
        setBids(res.data.data || []);
      } else {
        const res = await jobsApi.listJobs();
        setJobs((res.data.data || []).filter(j => j.shipper_id === user?.id));
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewJobBids = async (job: Job) => {
    setSelectedJob(job);
    try {
      const res = await biddingApiClient.getJobBids(job.id);
      setJobBids(res.data.data || []);
    } catch { setJobBids([]); }
  };

  const handleAcceptBid = async (bidId: string) => {
    try {
      await biddingApiClient.acceptBid(bidId);
      if (selectedJob) viewJobBids(selectedJob);
      fetchData();
    } catch (err) { console.error('Failed:', err); }
  };

  const handleRejectBid = async (bidId: string) => {
    try {
      await biddingApiClient.rejectBid(bidId);
      if (selectedJob) viewJobBids(selectedJob);
    } catch (err) { console.error('Failed:', err); }
  };

  const handleWithdraw = async (bidId: string) => {
    try {
      await biddingApiClient.withdrawBid(bidId);
      fetchData();
    } catch (err) { console.error('Failed:', err); }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    accepted: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    expired: 'bg-gray-500/20 text-gray-400',
  };

  if (loading) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 tracking-tight">{isDriver ? 'My Bids' : 'Manage Bids'}</h1>

      {isDriver ? (
        <div className="space-y-4">
          {bids.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              No bids yet. Go to Jobs to place bids on available shipments.
            </div>
          ) : bids.map(bid => (
            <div key={bid.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Job {bid.job_id.slice(0, 8)}...</div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xl font-bold text-primary-400">${bid.amount}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[bid.status]}`}>{bid.status}</span>
                  </div>
                  {bid.notes && <p className="text-sm text-gray-400 mt-2">{bid.notes}</p>}
                </div>
                {bid.status === 'pending' && (
                  <button onClick={() => handleWithdraw(bid.id)} className="btn-secondary text-red-400">Withdraw</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">No jobs found.</div>
          ) : jobs.map(job => (
            <div key={job.id} className="card cursor-pointer hover:border-primary-500/50" onClick={() => viewJobBids(job)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{job.pickup.city} → {job.delivery.city}</div>
                  <div className="text-sm text-gray-400 mt-1">${job.price} • {job.status}</div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedJob && (
        <div className="modal-overlay">
          <div className="modal-content w-full max-w-lg">
            <div className="modal-header">
              <h2 className="text-xl font-semibold">Bids for {selectedJob.pickup.city} → {selectedJob.delivery.city}</h2>
              <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              {jobBids.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No bids yet</p>
              ) : jobBids.map(bid => (
                <div key={bid.id} className="bg-dark-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-primary-400">${bid.amount}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${statusColors[bid.status]}`}>{bid.status}</span>
                      </div>
                      {bid.notes && <p className="text-sm text-gray-400 mt-2">{bid.notes}</p>}
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                        <Clock className="h-3 w-3" />
                        {new Date(bid.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {bid.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAcceptBid(bid.id)} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                          <Check className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleRejectBid(bid.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
