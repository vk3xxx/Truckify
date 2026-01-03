import { useState } from 'react';
import { MapPin, Plus, X, Route, Fuel, Clock, DollarSign, Sparkles } from 'lucide-react';
import { routingApi, type Location, type RouteResult, type OptimizeResult } from '../api';

const CITIES: Record<string, Location> = {
  'Sydney, NSW': { lat: -33.8688, lng: 151.2093, address: 'Sydney, NSW' },
  'Melbourne, VIC': { lat: -37.8136, lng: 144.9631, address: 'Melbourne, VIC' },
  'Brisbane, QLD': { lat: -27.4698, lng: 153.0251, address: 'Brisbane, QLD' },
  'Perth, WA': { lat: -31.9505, lng: 115.8605, address: 'Perth, WA' },
  'Adelaide, SA': { lat: -34.9285, lng: 138.6007, address: 'Adelaide, SA' },
  'Canberra, ACT': { lat: -35.2809, lng: 149.1300, address: 'Canberra, ACT' },
  'Hobart, TAS': { lat: -42.8821, lng: 147.3272, address: 'Hobart, TAS' },
  'Darwin, NT': { lat: -12.4634, lng: 130.8456, address: 'Darwin, NT' },
  'Newcastle, NSW': { lat: -32.9283, lng: 151.7817, address: 'Newcastle, NSW' },
  'Gold Coast, QLD': { lat: -28.0167, lng: 153.4000, address: 'Gold Coast, QLD' },
  'Wollongong, NSW': { lat: -34.4278, lng: 150.8931, address: 'Wollongong, NSW' },
  'Geelong, VIC': { lat: -38.1499, lng: 144.3617, address: 'Geelong, VIC' },
};

export default function RoutePlanner() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [returnToOrigin, setReturnToOrigin] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [optimized, setOptimized] = useState<OptimizeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'route' | 'optimize'>('route');

  const addStop = () => setStops([...stops, '']);
  const removeStop = (i: number) => setStops(stops.filter((_, idx) => idx !== i));
  const updateStop = (i: number, val: string) => setStops(stops.map((s, idx) => idx === i ? val : s));

  const handleCalculate = async () => {
    const originLoc = CITIES[origin];
    const destLoc = CITIES[destination];
    if (!originLoc) return alert('Select origin');

    setLoading(true);
    setResult(null);
    setOptimized(null);

    try {
      if (mode === 'route') {
        if (!destLoc) return alert('Select destination');
        const waypoints = stops.map(s => CITIES[s]).filter(Boolean);
        const res = await routingApi.calculateRoute(originLoc, destLoc, waypoints.length > 0 ? waypoints : undefined);
        setResult(res.data.data);
      } else {
        const stopLocs = stops.map(s => CITIES[s]).filter(Boolean);
        if (stopLocs.length === 0) return alert('Add at least one stop');
        const res = await routingApi.optimizeRoute(originLoc, stopLocs, returnToOrigin ? originLoc : undefined);
        setOptimized(res.data.data);
      }
    } catch (err) {
      console.error('Route calculation failed:', err);
      alert('Failed to calculate route');
    }
    setLoading(false);
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Route Planner</h1>
        <p className="text-gray-400">Calculate distances, fuel costs, and optimize multi-stop routes</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setMode('route')} className={`px-4 py-2 rounded-lg ${mode === 'route' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400'}`}>
          <Route className="h-4 w-4 inline mr-2" />Point to Point
        </button>
        <button onClick={() => setMode('optimize')} className={`px-4 py-2 rounded-lg ${mode === 'optimize' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400'}`}>
          <Sparkles className="h-4 w-4 inline mr-2" />Optimize Stops
        </button>
      </div>

      {/* Input Form */}
      <div className="card mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              <MapPin className="h-4 w-4 inline text-green-400 mr-1" />
              {mode === 'route' ? 'Origin' : 'Starting Point'}
            </label>
            <select value={origin} onChange={e => setOrigin(e.target.value)} className="input-field">
              <option value="">Select city...</option>
              {Object.keys(CITIES).map(city => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>

          {mode === 'route' ? (
            <>
              {stops.map((stop, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-1">
                      <MapPin className="h-4 w-4 inline text-yellow-400 mr-1" />Stop {i + 1}
                    </label>
                    <select value={stop} onChange={e => updateStop(i, e.target.value)} className="input-field">
                      <option value="">Select city...</option>
                      {Object.keys(CITIES).map(city => <option key={city} value={city}>{city}</option>)}
                    </select>
                  </div>
                  <button onClick={() => removeStop(i)} className="self-end p-2 text-red-400 hover:text-red-300">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button onClick={addStop} className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add Stop
              </button>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  <MapPin className="h-4 w-4 inline text-red-400 mr-1" />Destination
                </label>
                <select value={destination} onChange={e => setDestination(e.target.value)} className="input-field">
                  <option value="">Select city...</option>
                  {Object.keys(CITIES).map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Stops to Visit</label>
                {stops.map((stop, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={stop} onChange={e => updateStop(i, e.target.value)} className="input-field flex-1">
                      <option value="">Select city...</option>
                      {Object.keys(CITIES).map(city => <option key={city} value={city}>{city}</option>)}
                    </select>
                    <button onClick={() => removeStop(i)} className="p-2 text-red-400 hover:text-red-300">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button onClick={addStop} className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Add Stop
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={returnToOrigin} onChange={e => setReturnToOrigin(e.target.checked)} className="rounded" />
                Return to starting point
              </label>
            </>
          )}
        </div>

        <button onClick={handleCalculate} disabled={loading} className="btn-primary w-full mt-6">
          {loading ? 'Calculating...' : mode === 'route' ? 'Calculate Route' : 'Optimize Route'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="card">
          <h3 className="font-semibold mb-4">Route Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-dark-700 rounded-lg p-4 text-center">
              <Route className="h-5 w-5 mx-auto text-primary-400 mb-1" />
              <p className="text-2xl font-bold">{result.distance_km}</p>
              <p className="text-xs text-gray-400">kilometers</p>
            </div>
            <div className="bg-dark-700 rounded-lg p-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-blue-400 mb-1" />
              <p className="text-2xl font-bold">{formatDuration(result.duration_mins)}</p>
              <p className="text-xs text-gray-400">drive time</p>
            </div>
            <div className="bg-dark-700 rounded-lg p-4 text-center">
              <Fuel className="h-5 w-5 mx-auto text-yellow-400 mb-1" />
              <p className="text-2xl font-bold">{result.fuel_estimate_liters}L</p>
              <p className="text-xs text-gray-400">fuel estimate</p>
            </div>
            <div className="bg-dark-700 rounded-lg p-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto text-green-400 mb-1" />
              <p className="text-2xl font-bold">${result.toll_estimate}</p>
              <p className="text-xs text-gray-400">toll estimate</p>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green-400" /> {result.origin.address || `${result.origin.lat}, ${result.origin.lng}`}</p>
            {result.waypoints?.map((wp, i) => (
              <p key={i} className="flex items-center gap-2 ml-4"><MapPin className="h-4 w-4 text-yellow-400" /> {wp.address || `${wp.lat}, ${wp.lng}`}</p>
            ))}
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-red-400" /> {result.destination.address || `${result.destination.lat}, ${result.destination.lng}`}</p>
          </div>
        </div>
      )}

      {optimized && (
        <div className="card">
          <h3 className="font-semibold mb-4">Optimized Route</h3>
          {optimized.savings_km > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
              <p className="text-green-400 font-medium">🎉 Saved {optimized.savings_km} km by optimizing!</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-dark-700 rounded-lg p-4 text-center">
              <Route className="h-5 w-5 mx-auto text-primary-400 mb-1" />
              <p className="text-2xl font-bold">{optimized.total_distance_km}</p>
              <p className="text-xs text-gray-400">kilometers</p>
            </div>
            <div className="bg-dark-700 rounded-lg p-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-blue-400 mb-1" />
              <p className="text-2xl font-bold">{formatDuration(optimized.total_duration_mins)}</p>
              <p className="text-xs text-gray-400">drive time</p>
            </div>
            <div className="bg-dark-700 rounded-lg p-4 text-center">
              <Sparkles className="h-5 w-5 mx-auto text-green-400 mb-1" />
              <p className="text-2xl font-bold">{optimized.savings_km}</p>
              <p className="text-xs text-gray-400">km saved</p>
            </div>
          </div>
          <div className="text-sm">
            <p className="text-gray-400 mb-2">Optimized order:</p>
            {optimized.optimized_route.map((loc, i) => (
              <p key={i} className="flex items-center gap-2 py-1">
                <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs flex items-center justify-center">{i + 1}</span>
                {loc.address || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
