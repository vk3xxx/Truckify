import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X } from 'lucide-react';

interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface AddressInputProps {
  value: Address | null;
  onChange: (address: Address) => void;
  label?: string;
  required?: boolean;
}

interface Suggestion {
  full: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
}

export default function AddressInput({ value, onChange, label = 'Address', required = false }: AddressInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [manual, setManual] = useState<Address>({ street: '', city: '', state: '', postal_code: '', country: 'Australia' });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions from Australian address API
  const fetchSuggestions = async (term: string) => {
    if (term.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Using Australia Post PAF API (free tier) or fallback to mock
      const response = await fetch(
        `https://api.addressify.com.au/addresspro/autocomplete?api_key=demo&term=${encodeURIComponent(term)}&max_results=5`
      );
      
      if (response.ok) {
        const data = await response.json();
        const parsed: Suggestion[] = data.map((item: string) => parseAddress(item));
        setSuggestions(parsed);
      } else {
        // Fallback: use basic matching for common AU cities
        setSuggestions(getLocalSuggestions(term));
      }
    } catch {
      // Fallback to local suggestions
      setSuggestions(getLocalSuggestions(term));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    onChange({
      street: suggestion.street,
      city: suggestion.suburb,
      state: suggestion.state,
      postal_code: suggestion.postcode,
      country: 'Australia',
    });
    setQuery(suggestion.full);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleManualSave = () => {
    onChange(manual);
    setQuery(`${manual.street}, ${manual.city} ${manual.state} ${manual.postal_code}`);
    setShowManual(false);
  };

  const clearAddress = () => {
    setQuery('');
    onChange({ street: '', city: '', state: '', postal_code: '', country: 'Australia' });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      
      {!showManual ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => query.length >= 3 && setShowDropdown(true)}
              placeholder="Start typing an address..."
              className="input-field pl-11 pr-10"
              required={required && !value?.street}
            />
            {query && (
              <button type="button" onClick={clearAddress} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (suggestions.length > 0 || loading) && (
            <div className="absolute z-50 w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-xl overflow-hidden">
              {loading ? (
                <div className="p-4 text-center text-gray-400">Searching...</div>
              ) : (
                <>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className="w-full px-4 py-3 text-left hover:bg-dark-700 flex items-start gap-3 border-b border-dark-700 last:border-0"
                    >
                      <MapPin className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium">{s.street}</div>
                        <div className="text-sm text-gray-400">{s.suburb}, {s.state} {s.postcode}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Manual entry link */}
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="mt-2 text-sm text-primary-500 hover:text-primary-400"
          >
            Can't find your address? Enter manually
          </button>

          {/* Selected address display */}
          {value?.street && !showDropdown && (
            <div className="mt-3 p-3 bg-dark-700 rounded-lg flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <div>{value.street}</div>
                <div className="text-gray-400">{value.city}, {value.state} {value.postal_code}</div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Manual entry form */
        <div className="space-y-4 p-4 bg-dark-700 rounded-lg">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Street Address</label>
            <input
              type="text"
              value={manual.street}
              onChange={e => setManual({ ...manual, street: e.target.value })}
              className="input-field"
              placeholder="123 Main Street"
              required={required}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Suburb/City</label>
              <input
                type="text"
                value={manual.city}
                onChange={e => setManual({ ...manual, city: e.target.value })}
                className="input-field"
                required={required}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">State</label>
              <select
                value={manual.state}
                onChange={e => setManual({ ...manual, state: e.target.value })}
                className="input-field"
                required={required}
              >
                <option value="">Select</option>
                <option value="NSW">NSW</option>
                <option value="VIC">VIC</option>
                <option value="QLD">QLD</option>
                <option value="WA">WA</option>
                <option value="SA">SA</option>
                <option value="TAS">TAS</option>
                <option value="NT">NT</option>
                <option value="ACT">ACT</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Postcode</label>
              <input
                type="text"
                value={manual.postal_code}
                onChange={e => setManual({ ...manual, postal_code: e.target.value })}
                className="input-field"
                maxLength={4}
                pattern="[0-9]{4}"
                required={required}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Country</label>
              <input type="text" value="Australia" disabled className="input-field bg-dark-600" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowManual(false)} className="btn-secondary flex-1">Back to Search</button>
            <button type="button" onClick={handleManualSave} className="btn-primary flex-1">Use This Address</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Parse address string into components
function parseAddress(full: string): Suggestion {
  // Format: "123 STREET NAME, SUBURB STATE POSTCODE"
  const parts = full.split(',');
  const street = parts[0]?.trim() || '';
  const rest = parts[1]?.trim() || '';
  
  // Extract postcode (4 digits at end)
  const postcodeMatch = rest.match(/(\d{4})$/);
  const postcode = postcodeMatch?.[1] || '';
  
  // Extract state (2-3 letter code before postcode)
  const stateMatch = rest.match(/\b(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\b/i);
  const state = stateMatch?.[1]?.toUpperCase() || '';
  
  // Suburb is everything before state
  const suburb = rest.replace(postcode, '').replace(state, '').trim();

  return { full, street, suburb, state, postcode };
}

// Fallback local suggestions for common Australian locations
function getLocalSuggestions(term: string): Suggestion[] {
  const locations = [
    { street: '1 George Street', suburb: 'Sydney', state: 'NSW', postcode: '2000' },
    { street: '100 Collins Street', suburb: 'Melbourne', state: 'VIC', postcode: '3000' },
    { street: '1 Queen Street', suburb: 'Brisbane', state: 'QLD', postcode: '4000' },
    { street: '1 St Georges Terrace', suburb: 'Perth', state: 'WA', postcode: '6000' },
    { street: '1 King William Street', suburb: 'Adelaide', state: 'SA', postcode: '5000' },
    { street: '1 Elizabeth Street', suburb: 'Hobart', state: 'TAS', postcode: '7000' },
    { street: '1 Mitchell Street', suburb: 'Darwin', state: 'NT', postcode: '0800' },
    { street: '1 London Circuit', suburb: 'Canberra', state: 'ACT', postcode: '2601' },
    { street: '1 Pitt Street', suburb: 'Sydney', state: 'NSW', postcode: '2000' },
    { street: '1 Bourke Street', suburb: 'Melbourne', state: 'VIC', postcode: '3000' },
    { street: '1 Adelaide Street', suburb: 'Brisbane', state: 'QLD', postcode: '4000' },
    { street: '1 Hay Street', suburb: 'Perth', state: 'WA', postcode: '6000' },
  ];

  const lower = term.toLowerCase();
  return locations
    .filter(l => 
      l.street.toLowerCase().includes(lower) || 
      l.suburb.toLowerCase().includes(lower) ||
      l.postcode.includes(term)
    )
    .slice(0, 5)
    .map(l => ({ ...l, full: `${l.street}, ${l.suburb} ${l.state} ${l.postcode}` }));
}
