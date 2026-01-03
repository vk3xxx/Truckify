import { useState, useEffect } from 'react';
import { fleetApiClient, type Fleet, type FleetVehicle, type FleetDriver, type VehicleHandover } from '../api';
import { Truck, Users, Plus, X, ArrowRightLeft, Check } from 'lucide-react';

export default function FleetManagement() {
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [handovers, setHandovers] = useState<VehicleHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateFleet, setShowCreateFleet] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showHandover, setShowHandover] = useState<string | null>(null);
  const [tab, setTab] = useState<'vehicles' | 'drivers' | 'handovers'>('vehicles');

  useEffect(() => {
    loadFleet();
  }, []);

  const loadFleet = async () => {
    try {
      const res = await fleetApiClient.getMyFleet();
      setFleet(res.data.data);
      const [vehiclesRes, driversRes, handoversRes] = await Promise.all([
        fleetApiClient.getFleetVehicles(),
        fleetApiClient.getFleetDrivers(),
        fleetApiClient.getPendingHandovers(),
      ]);
      setVehicles(vehiclesRes.data.data || []);
      setDrivers(driversRes.data.data || []);
      setHandovers(handoversRes.data.data || []);
    } catch {
      setFleet(null);
    }
    setLoading(false);
  };

  const createFleet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await fleetApiClient.createFleet({
        name: form.get('name') as string,
        abn: form.get('abn') as string,
      });
      setShowCreateFleet(false);
      loadFleet();
    } catch (err) {
      alert('Failed to create fleet');
    }
  };

  const addVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await fleetApiClient.createVehicle({
        type: form.get('type') as string,
        make: form.get('make') as string,
        model: form.get('model') as string,
        year: parseInt(form.get('year') as string),
        plate: form.get('plate') as string,
        capacity: parseFloat(form.get('capacity') as string),
        rego_expiry: form.get('rego_expiry') as string,
        insurance_expiry: form.get('insurance_expiry') as string,
      });
      setShowAddVehicle(false);
      loadFleet();
    } catch (err) {
      alert('Failed to add vehicle');
    }
  };

  const addDriver = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await fleetApiClient.addDriver(
        form.get('driver_id') as string,
        form.get('user_id') as string
      );
      setShowAddDriver(false);
      loadFleet();
    } catch (err) {
      alert('Failed to add driver');
    }
  };

  const requestHandover = async (vehicleId: string, toDriverId: string) => {
    try {
      await fleetApiClient.requestHandover({ vehicle_id: vehicleId, to_driver_id: toDriverId });
      setShowHandover(null);
      loadFleet();
    } catch (err) {
      alert('Failed to request handover');
    }
  };

  const handleHandover = async (id: string, accept: boolean) => {
    try {
      if (accept) {
        await fleetApiClient.acceptHandover(id);
      } else {
        await fleetApiClient.rejectHandover(id);
      }
      loadFleet();
    } catch (err) {
      alert('Failed to process handover');
    }
  };

  const assignVehicle = async (vehicleId: string, driverId: string) => {
    try {
      await fleetApiClient.assignVehicle(vehicleId, driverId);
      loadFleet();
    } catch (err) {
      alert('Failed to assign vehicle');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  if (!fleet) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <Truck className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Fleet Found</h2>
          <p className="text-gray-400 mb-6">Create a fleet to manage your vehicles and drivers</p>
          <button onClick={() => setShowCreateFleet(true)} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" /> Create Fleet
          </button>
        </div>

        {showCreateFleet && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="card w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Create Fleet</h3>
                <button onClick={() => setShowCreateFleet(false)}><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={createFleet} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fleet Name</label>
                  <input name="name" required className="input w-full" placeholder="My Trucking Company" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">ABN (optional)</label>
                  <input name="abn" className="input w-full" placeholder="12 345 678 901" />
                </div>
                <button type="submit" className="btn-primary w-full">Create Fleet</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{fleet.name}</h1>
          {fleet.abn && <p className="text-gray-400">ABN: {fleet.abn}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('vehicles')} className={`px-4 py-2 rounded-lg ${tab === 'vehicles' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-gray-400'}`}>
          <Truck className="h-4 w-4 inline mr-2" />Vehicles ({vehicles.length})
        </button>
        <button onClick={() => setTab('drivers')} className={`px-4 py-2 rounded-lg ${tab === 'drivers' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-gray-400'}`}>
          <Users className="h-4 w-4 inline mr-2" />Drivers ({drivers.length})
        </button>
        <button onClick={() => setTab('handovers')} className={`px-4 py-2 rounded-lg ${tab === 'handovers' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-gray-400'}`}>
          <ArrowRightLeft className="h-4 w-4 inline mr-2" />Handovers ({handovers.length})
        </button>
      </div>

      {/* Vehicles Tab */}
      {tab === 'vehicles' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddVehicle(true)} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" /> Add Vehicle
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map(v => (
              <div key={v.id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{v.make} {v.model}</h3>
                    <p className="text-sm text-gray-400">{v.plate} • {v.type}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${v.status === 'available' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {v.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-3">Capacity: {v.capacity} kg</p>
                {v.current_driver_id ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Assigned to driver</span>
                    <button onClick={() => setShowHandover(v.id)} className="text-sm text-primary-400 hover:text-primary-300">
                      Request Handover
                    </button>
                  </div>
                ) : (
                  <select
                    className="input w-full text-sm"
                    onChange={(e) => e.target.value && assignVehicle(v.id, e.target.value)}
                    defaultValue=""
                  >
                    <option value="">Assign to driver...</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.driver_id}>{d.driver_id.slice(0, 8)}...</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drivers Tab */}
      {tab === 'drivers' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddDriver(true)} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" /> Add Driver
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {drivers.map(d => (
              <div key={d.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">Driver</h3>
                    <p className="text-sm text-gray-400">{d.driver_id.slice(0, 8)}...</p>
                    <p className="text-xs text-gray-500">Joined {new Date(d.joined_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${d.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {d.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Handovers Tab */}
      {tab === 'handovers' && (
        <div className="space-y-4">
          {handovers.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">No pending handovers</div>
          ) : (
            handovers.map(h => (
              <div key={h.id} className="card flex justify-between items-center">
                <div>
                  <p className="font-semibold">Vehicle Handover Request</p>
                  <p className="text-sm text-gray-400">
                    {h.from_driver_id ? `From: ${h.from_driver_id.slice(0, 8)}...` : 'New assignment'} → To: {h.to_driver_id.slice(0, 8)}...
                  </p>
                  {h.notes && <p className="text-sm text-gray-500 mt-1">{h.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleHandover(h.id, true)} className="btn-primary py-1 px-3">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleHandover(h.id, false)} className="bg-red-500/20 text-red-400 py-1 px-3 rounded-lg hover:bg-red-500/30">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Vehicle</h3>
              <button onClick={() => setShowAddVehicle(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={addVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select name="type" required className="input w-full">
                    <option value="dry_van">Dry Van</option>
                    <option value="flatbed">Flatbed</option>
                    <option value="refrigerated">Refrigerated</option>
                    <option value="tanker">Tanker</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Year</label>
                  <input name="year" type="number" required className="input w-full" placeholder="2022" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Make</label>
                  <input name="make" required className="input w-full" placeholder="Kenworth" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Model</label>
                  <input name="model" required className="input w-full" placeholder="T680" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Plate</label>
                  <input name="plate" required className="input w-full" placeholder="ABC123" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Capacity (kg)</label>
                  <input name="capacity" type="number" required className="input w-full" placeholder="25000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Rego Expiry</label>
                  <input name="rego_expiry" type="date" required className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Insurance Expiry</label>
                  <input name="insurance_expiry" type="date" required className="input w-full" />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">Add Vehicle</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddDriver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Driver to Fleet</h3>
              <button onClick={() => setShowAddDriver(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={addDriver} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Driver ID</label>
                <input name="driver_id" required className="input w-full" placeholder="Driver UUID" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">User ID</label>
                <input name="user_id" required className="input w-full" placeholder="User UUID" />
              </div>
              <button type="submit" className="btn-primary w-full">Add Driver</button>
            </form>
          </div>
        </div>
      )}

      {/* Handover Modal */}
      {showHandover && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Request Vehicle Handover</h3>
              <button onClick={() => setShowHandover(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Transfer to Driver</label>
                <select
                  className="input w-full"
                  onChange={(e) => e.target.value && requestHandover(showHandover, e.target.value)}
                  defaultValue=""
                >
                  <option value="">Select driver...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.driver_id}>{d.driver_id.slice(0, 8)}...</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
