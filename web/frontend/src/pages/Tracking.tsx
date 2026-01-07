import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, Clock, Gauge, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { trackingApi, jobsApi, type TrackingEvent, type Job } from '../api';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const truckIcon = new L.DivIcon({
  html: `<div style="background:#3b82f6;border-radius:50%;padding:6px;box-shadow:0 2px 4px rgba(0,0,0,0.3)">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// City coordinates for Australia
const cityCoords: Record<string, [number, number]> = {
  'Melbourne': [-37.8136, 144.9631],
  'Sydney': [-33.8688, 151.2093],
  'Brisbane': [-27.4698, 153.0251],
  'Perth': [-31.9505, 115.8605],
  'Adelaide': [-34.9285, 138.6007],
  'Darwin': [-12.4634, 130.8456],
  'Hobart': [-42.8821, 147.3272],
  'Canberra': [-35.2809, 149.1300],
  'Gold Coast': [-28.0167, 153.4000],
  'Alice Springs': [-23.6980, 133.8807],
};

// Fetch real road route from OSRM
async function fetchRoadRoute(start: [number, number], end: [number, number]): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
    }
  } catch (e) {
    console.error('Failed to fetch route:', e);
  }
  return [start, end];
}

function MapBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
}

// Detect stops (multiple consecutive speed=0 points at same location)
interface StopInfo {
  event: TrackingEvent;
  count: number;
  placeName?: string;
  nearbyPOIs?: string[];
}

async function fetchStopInfo(lat: number, lng: number): Promise<{ placeName: string; pois: string[] }> {
  try {
    // Reverse geocode
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const geoData = await geoRes.json();
    const placeName = geoData.address?.town || geoData.address?.city || geoData.address?.suburb || geoData.address?.village || 'Unknown';
    
    // Find nearby POIs (fuel, food, rest areas)
    const poiRes = await fetch(`https://overpass-api.de/api/interpreter?data=[out:json];(node["amenity"~"fuel|restaurant|cafe|fast_food"](around:500,${lat},${lng}););out%205;`);
    const poiData = await poiRes.json();
    const pois = poiData.elements?.slice(0, 3).map((e: { tags?: { name?: string; amenity?: string } }) => 
      e.tags?.name || e.tags?.amenity || 'POI'
    ) || [];
    
    return { placeName, pois };
  } catch {
    return { placeName: 'Unknown', pois: [] };
  }
}

function detectStops(events: TrackingEvent[]): StopInfo[] {
  const stops: StopInfo[] = [];
  for (let i = 0; i < events.length; i++) {
    if (events[i].speed === 0) {
      let count = 1;
      let j = i + 1;
      while (j < events.length && events[j].speed === 0 && 
             Math.abs(events[j].latitude - events[i].latitude) < 0.001 &&
             Math.abs(events[j].longitude - events[i].longitude) < 0.001) {
        count++;
        j++;
      }
      if (count >= 2) {
        stops.push({ event: events[i], count });
      }
      i = j - 1;
    }
  }
  return stops;
}

export default function Tracking() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [currentLocation, setCurrentLocation] = useState<TrackingEvent | null>(null);
  const [plannedRoute, setPlannedRoute] = useState<[number, number][]>([]);
  const [stops, setStops] = useState<StopInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) { setLoading(false); return; }
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [jobId]);

  const loadData = async () => {
    if (!jobId) return;
    try {
      const jobRes = await jobsApi.getJob(jobId);
      const jobData = jobRes.data.data;
      setJob(jobData);

      // Get planned route from OSRM
      const pickupCoords = cityCoords[jobData.pickup.city] || [-33.8688, 151.2093];
      const deliveryCoords = cityCoords[jobData.delivery.city] || [-33.8688, 151.2093];
      const roadRoute = await fetchRoadRoute(pickupCoords, deliveryCoords);
      setPlannedRoute(roadRoute);

      try {
        const historyRes = await trackingApi.getJobHistory(jobId);
        const trackingEvents = (historyRes.data.data || []).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setEvents(trackingEvents);
        if (trackingEvents.length > 0) {
          setCurrentLocation(trackingEvents[trackingEvents.length - 1]);
        }
        
        // Detect stops and fetch POI info
        const detectedStops = detectStops(trackingEvents);
        const stopsWithInfo = await Promise.all(
          detectedStops.map(async (stop) => {
            const info = await fetchStopInfo(stop.event.latitude, stop.event.longitude);
            return { ...stop, placeName: info.placeName, nearbyPOIs: info.pois };
          })
        );
        setStops(stopsWithInfo);
      } catch { setEvents([]); }
    } catch (err) {
      console.error('Failed to load tracking:', err);
    } finally { setLoading(false); }
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString();
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString();

  const completedRoute: [number, number][] = events.map(e => [e.latitude, e.longitude]);
  
  // All points for map bounds
  const allPoints: [number, number][] = [...completedRoute, ...plannedRoute];

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  if (!job) {
    return <div className="text-center py-12 text-gray-400">Job not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col">
          <div className="card p-0 overflow-hidden flex-1 flex flex-col">
            <div className="flex-1 min-h-[300px]" style={{ height: 'calc(100vh - 320px)' }}>
              <MapContainer center={[-33.8688, 151.2093]} zoom={6} className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapBounds points={allPoints.length > 0 ? allPoints : [[-33.8688, 151.2093]]} />
                
                {/* Planned route - dotted line */}
                {plannedRoute.length > 1 && (
                  <Polyline positions={plannedRoute} color="#6b7280" weight={3} dashArray="10, 10" />
                )}
                
                {/* Completed route - solid line */}
                {completedRoute.length > 1 && (
                  <Polyline positions={completedRoute} color="#3b82f6" weight={4} />
                )}
                
                {/* Stops - red dots */}
                {stops.map((stop, i) => (
                  <CircleMarker
                    key={`stop-${i}`}
                    center={[stop.event.latitude, stop.event.longitude]}
                    radius={8}
                    fillColor="#ef4444"
                    fillOpacity={0.8}
                    color="#dc2626"
                    weight={2}
                  >
                    <Popup>
                      <div className="text-sm min-w-[150px]">
                        <p className="font-semibold text-red-600">Stop - {stop.placeName || 'Unknown'}</p>
                        <p>Time: {formatTime(stop.event.timestamp)}</p>
                        <p>Duration: ~{stop.count * 3} mins</p>
                        {stop.nearbyPOIs && stop.nearbyPOIs.length > 0 && (
                          <div className="mt-1 pt-1 border-t border-gray-200">
                            <p className="text-xs text-gray-500">Nearby:</p>
                            {stop.nearbyPOIs.map((poi, j) => (
                              <p key={j} className="text-xs">• {poi}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
                
                {/* Pickup marker */}
                {plannedRoute.length > 0 && (
                  <Marker position={plannedRoute[0]}>
                    <Popup><span className="font-semibold text-green-600">Pickup: {job.pickup.city}</span></Popup>
                  </Marker>
                )}
                
                {/* Delivery marker */}
                {plannedRoute.length > 1 && (
                  <Marker position={plannedRoute[plannedRoute.length - 1]}>
                    <Popup><span className="font-semibold text-red-600">Delivery: {job.delivery.city}</span></Popup>
                  </Marker>
                )}
                
                {/* Current truck location */}
                {currentLocation && (
                  <Marker position={[currentLocation.latitude, currentLocation.longitude]} icon={truckIcon}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">Current Location</p>
                        <p>Speed: {currentLocation.speed.toFixed(0)} km/h</p>
                        <p>Updated: {formatTime(currentLocation.timestamp)}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-6 px-4 py-2 bg-dark-700 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-blue-500"></div>
                <span className="text-gray-400">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-gray-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #6b7280 0, #6b7280 4px, transparent 4px, transparent 8px)' }}></div>
                <span className="text-gray-400">Planned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-400">Stop &gt;5min</span>
              </div>
            </div>
            
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

        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-3">Job Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-400 mt-0.5" />
                <div><p className="text-gray-400">Pickup</p><p>{job.pickup.city}, {job.pickup.state}</p></div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-red-400 mt-0.5" />
                <div><p className="text-gray-400">Delivery</p><p>{job.delivery.city}, {job.delivery.state}</p></div>
              </div>
              <div className="pt-2 border-t border-dark-600">
                <span className={`px-2 py-1 rounded text-xs ${job.status === 'in_transit' ? 'bg-blue-500/20 text-blue-400' : job.status === 'delivered' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
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
                    <div className={`w-2 h-2 rounded-full ${event.speed === 0 ? 'bg-red-400' : event.event_type === 'job_start' ? 'bg-green-400' : 'bg-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300">{event.speed === 0 ? 'Stopped' : `${event.speed.toFixed(0)} km/h`}</p>
                      <p className="text-xs text-gray-500">{event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}</p>
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
