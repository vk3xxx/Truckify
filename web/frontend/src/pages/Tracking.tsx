import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, Clock, Gauge, MapPin } from 'lucide-react';
import { trackingApi, jobsApi, type TrackingEvent, type Job } from '../api';

export default function Tracking() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [currentLocation, setCurrentLocation] = useState<TrackingEvent | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [jobId]);

  const loadData = async () => {
    if (!jobId) return;
    try {
      const [jobRes, historyRes] = await Promise.all([
        jobsApi.getJob(jobId),
        trackingApi.getJobHistory(jobId),
      ]);
      setJob(jobRes.data.data);
      const trackingEvents = historyRes.data.data || [];
      setEvents(trackingEvents);
      if (trackingEvents.length > 0) {
        setCurrentLocation(trackingEvents[trackingEvents.length - 1]);
      }
    } catch (err) {
      console.error('Failed to load tracking:', err);
    }
    setLoading(false);
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString();
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString();

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  if (!job) {
    return <div className="text-center py-12 text-gray-400">Job not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-2">
          <div className="card p-0 overflow-hidden">
            <div ref={mapRef} className="h-96 bg-dark-700 relative">
              {/* Simple visual map representation */}
              <div className="absolute inset-0 flex items-center justify-center">
                {currentLocation ? (
                  <div className="text-center">
                    <div className="relative">
                      <div className="w-4 h-4 bg-primary-500 rounded-full animate-ping absolute" />
                      <div className="w-4 h-4 bg-primary-500 rounded-full relative z-10" />
                    </div>
                    <p className="mt-4 text-sm text-gray-400">
                      {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last update: {formatTime(currentLocation.timestamp)}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No tracking data available</p>
                )}
              </div>
              
              {/* Route visualization */}
              {events.length > 1 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <polyline
                    points={events.map((_, i) => {
                      const x = 50 + (i / (events.length - 1)) * 300;
                      const y = 150 + Math.sin(i * 0.5) * 50;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                </svg>
              )}
            </div>
            
            {/* Current stats */}
            {currentLocation && (
              <div className="grid grid-cols-3 divide-x divide-dark-600 border-t border-dark-600">
                <div className="p-4 text-center">
                  <Gauge className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                  <p className="text-xl font-bold">{currentLocation.speed.toFixed(0)}</p>
                  <p className="text-xs text-gray-400">km/h</p>
                </div>
                <div className="p-4 text-center">
                  <Navigation className="h-5 w-5 mx-auto text-gray-400 mb-1" style={{ transform: `rotate(${currentLocation.heading}deg)` }} />
                  <p className="text-xl font-bold">{currentLocation.heading.toFixed(0)}°</p>
                  <p className="text-xs text-gray-400">Heading</p>
                </div>
                <div className="p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                  <p className="text-xl font-bold">{events.length}</p>
                  <p className="text-xs text-gray-400">Updates</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Job Info & History */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-3">Job Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-400 mt-0.5" />
                <div>
                  <p className="text-gray-400">Pickup</p>
                  <p>{job.pickup.city}, {job.pickup.state}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-red-400 mt-0.5" />
                <div>
                  <p className="text-gray-400">Delivery</p>
                  <p>{job.delivery.city}, {job.delivery.state}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-dark-600">
                <span className={`px-2 py-1 rounded text-xs ${
                  job.status === 'in_transit' ? 'bg-blue-500/20 text-blue-400' :
                  job.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Tracking History</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-sm text-gray-500">No tracking events yet</p>
              ) : (
                [...events].reverse().slice(0, 20).map((event, i) => (
                  <div key={event.id || i} className="flex items-center gap-3 text-sm py-2 border-b border-dark-700 last:border-0">
                    <div className={`w-2 h-2 rounded-full ${
                      event.event_type === 'job_start' ? 'bg-green-400' :
                      event.event_type === 'job_end' ? 'bg-red-400' :
                      event.event_type === 'stop' ? 'bg-yellow-400' :
                      'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 capitalize">{event.event_type.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      <p>{formatTime(event.timestamp)}</p>
                      <p>{formatDate(event.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
