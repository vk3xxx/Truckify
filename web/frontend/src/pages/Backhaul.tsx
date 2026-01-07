import { useState } from 'react';
import { Search, Truck, MapPin, DollarSign, TrendingDown, ArrowRight } from 'lucide-react';
import { backhaulApi, type BackhaulMatch } from '../api';

const CITIES: Record<string, { lat: number; lng: number }> = {
  'Sydney, NSW': { lat: -33.8688, lng: 151.2093 },
  'Melbourne, VIC': { lat: -37.8136, lng: 144.9631 },
  'Brisbane, QLD': { lat: -27.4698, lng: 153.0251 },
  'Perth, WA': { lat: -31.9505, lng: 115.8605 },
  'Adelaide, SA': { lat: -34.9285, lng: 138.6007 },
  'Canberra, ACT': { lat: -35.2809, lng: 149.1300 },
  'Hobart, TAS': { lat: -42.8821, lng: 147.3272 },
  'Darwin, NT': { lat: -12.4634, lng: 130.8456 },
};

export default function Backhaul() {
  const [currentCity, setCurrentCity] = useState('');
  const [destCity, setDestCity] = useState('');
  const [vehicleType, setVehicleType] = useState('flatbed');
  const [maxDetour, setMaxDetour] = useState('50');
  const [matches, setMatches] = useState<BackhaulMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const current = CITIES[currentCity];
    const dest = CITIES[destCity];
    if (!current || !dest) {
      alert('Please select valid cities');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await backhaulApi.findBackhauls(
        current.lat, current.lng,
        dest.lat, dest.lng,
        vehicleType,
        parseFloat(maxDetour) || 50
      );
      setMatches(res.data.data || []);
    } catch (err) {
      console.error('Search failed:', err);
      setMatches([]);
    }
    setLoading(false);
  };

  const handleClaim = async (id: string) => {
    try {
      await backhaulApi.claimOpportunity(id);
      setMatches(matches.filter(m => m.opportunity.id !== id));
      alert('Backhaul claimed successfully!');
    } catch (err) {
      alert('Failed to claim');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Find Backhaul Loads</h1>
        <p className="text-gray-400">Reduce empty miles by finding return loads along your route</p>
      </div>

      {/* Search Form */}
      <div className="card mb-6">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Current Location</label>
            <select value={currentCity} onChange={e => setCurrentCity(e.target.value)} className="input-field">
              <option value="">Select city...</option>
              {Object.keys(CITIES).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Final Destination</label>
            <select value={destCity} onChange={e => setDestCity(e.target.value)} className="input-field">
              <option value="">Select city...</option>
              {Object.keys(CITIES).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Vehicle Type</label>
            <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className="input-field">
              <option value="flatbed">Flatbed</option>
              <option value="refrigerated">Refrigerated</option>
              <option value="tanker">Tanker</option>
              <option value="container">Container</option>
              <option value="van">Van</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Detour (km)</label>
            <input type="number" value={maxDetour} onChange={e => setMaxDetour(e.target.value)} className="input-field" min="10" max="200" />
          </div>
          <div className="flex items-end">
            <button onClick={handleSearch} disabled={loading || !currentCity || !destCity} className="btn-primary w-full flex items-center justify-center gap-2">
              <Search className="h-4 w-4" />
              {loading ? 'Searching...' : 'Find Loads'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {matches.length > 0 ? `${matches.length} Backhaul Opportunities Found` : 'No Matches Found'}
          </h2>
          
          {matches.length === 0 && (
            <div className="card text-center py-8 text-gray-400">
              <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No backhaul loads match your route criteria.</p>
              <p className="text-sm mt-1">Try increasing the max detour distance.</p>
            </div>
          )}

          <div className="space-y-4">
            {matches.map(match => (
              <div key={match.opportunity.id} className="card hover:border-primary-500/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-lg font-medium mb-2">
                      <MapPin className="h-4 w-4 text-green-400" />
                      {match.opportunity.origin_city}, {match.opportunity.origin_state}
                      <ArrowRight className="h-4 w-4 text-gray-500" />
                      <MapPin className="h-4 w-4 text-red-400" />
                      {match.opportunity.dest_city}, {match.opportunity.dest_state}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        {match.opportunity.vehicle_type}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ${match.opportunity.price.toLocaleString()}
                      </span>
                      <span>Pickup: {new Date(match.opportunity.pickup_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Detour</div>
                      <div className="font-medium text-yellow-400">+{match.detour_km} km</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Empty Miles Saved</div>
                      <div className="font-medium text-green-400">{match.savings_km} km</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Score</div>
                      <div className="font-bold text-primary-400">{match.score}</div>
                    </div>
                    <button onClick={() => handleClaim(match.opportunity.id)} className="btn-primary whitespace-nowrap">
                      Claim Load
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="card mt-8">
        <h3 className="font-semibold mb-2">How Backhaul Matching Works</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• We find loads that are along your route with minimal detour</li>
          <li>• Score is based on how much empty driving you'll save</li>
          <li>• Higher scores mean better efficiency for your trip</li>
          <li>• Claiming a load reserves it for you to complete</li>
        </ul>
      </div>
    </div>
  );
}
