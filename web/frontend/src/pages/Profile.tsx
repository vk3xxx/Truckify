import { useState, useEffect } from 'react';
import { User, Mail, Phone, Fingerprint, Plus, Trash2, Shield, Truck, FileText } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { profileApi, authApi, driverProfileApi } from '../api';
import type { UserProfile, DriverProfile } from '../api';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [passkeys, setPasskeys] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editMode, setEditMode] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', phone: '' });

  const isDriver = user?.user_type === 'driver';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, passkeysRes] = await Promise.all([
          profileApi.getProfile().catch(() => null),
          authApi.getPasskeys().catch(() => null),
        ]);
        
        if (profileRes?.data.data) {
          setProfile(profileRes.data.data);
          setFormData({
            first_name: profileRes.data.data.first_name,
            last_name: profileRes.data.data.last_name,
            phone: profileRes.data.data.phone || '',
          });
        }
        if (passkeysRes?.data.data) setPasskeys(passkeysRes.data.data);

        if (isDriver) {
          const driverRes = await driverProfileApi.getDriver().catch(() => null);
          if (driverRes?.data.data) setDriverProfile(driverRes.data.data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isDriver]);

  const [errors, setErrors] = useState<{ first_name?: string; last_name?: string; phone?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    else if (formData.first_name.length > 100) newErrors.first_name = 'First name must be less than 100 characters';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    else if (formData.last_name.length > 100) newErrors.last_name = 'Last name must be less than 100 characters';
    if (formData.phone && !/^\+?[1-9]\d{6,14}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Enter a valid phone number (e.g., +61412345678)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const phone = formData.phone?.replace(/\s/g, '') || undefined;
      const data = { first_name: formData.first_name.trim(), last_name: formData.last_name.trim(), phone };
      const response = profile 
        ? await profileApi.updateProfile(data)
        : await profileApi.createProfile(data);
      setProfile(response.data.data);
      setEditMode(false);
      setErrors({});
      setMessage({ type: 'success', text: 'Profile saved successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const toBase64Url = (buffer: ArrayBuffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const handleAddPasskey = async () => {
    setMessage({ type: '', text: '' });
    try {
      const beginRes = await authApi.beginPasskeyRegistration();
      const options = beginRes.data.data as any;
      const challenge = options.publicKey.challenge.replace(/-/g, '+').replace(/_/g, '/');
      const userId = options.publicKey.user.id.replace(/-/g, '+').replace(/_/g, '/');
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        ...options.publicKey,
        challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
        user: { ...options.publicKey.user, id: Uint8Array.from(atob(userId), c => c.charCodeAt(0)) },
      };
      const credential = await navigator.credentials.create({ publicKey: publicKeyOptions }) as PublicKeyCredential;
      if (!credential) return;
      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialResponse = {
        id: credential.id,
        rawId: toBase64Url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: toBase64Url(response.attestationObject),
          clientDataJSON: toBase64Url(response.clientDataJSON),
        },
      };
      const name = prompt('Name this passkey (e.g., "MacBook Pro")') || 'My Passkey';
      await authApi.finishPasskeyRegistration(name, btoa(JSON.stringify(credentialResponse)));
      const passkeysRes = await authApi.getPasskeys();
      setPasskeys(passkeysRes.data.data || []);
      setMessage({ type: 'success', text: 'Passkey added successfully' });
    } catch (err: unknown) {
      console.error('Passkey error:', err);
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string; code?: string };
      let msg = 'Failed to add passkey';
      if (axiosErr.code === 'ERR_NETWORK') msg = 'Network error - check if services are running';
      else if (axiosErr.response?.data?.error?.message) msg = axiosErr.response.data.error.message;
      else if (axiosErr.message) msg = axiosErr.message;
      setMessage({ type: 'error', text: msg });
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm('Delete this passkey?')) return;
    try {
      await authApi.deletePasskey(id);
      setPasskeys(passkeys.filter(p => p.id !== id));
      setMessage({ type: 'success', text: 'Passkey deleted' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete passkey' });
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-10">Profile Settings</h1>

      {message.text && (
        <div className={`mb-8 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/50 text-green-400' : 'bg-red-500/10 border border-red-500/50 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Account Info */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg sm:text-xl font-semibold flex items-center">
            <User className="h-5 w-5 mr-3 text-primary-500" />
            Account Information
          </h2>
          {!editMode && <button onClick={() => setEditMode(true)} className="text-primary-500 hover:text-primary-400 font-medium text-sm">Edit</button>}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-dark-700 rounded-xl">
            <div className="w-10 h-10 bg-dark-600 rounded-lg flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-gray-400">Email</div>
              <div className="font-medium truncate mt-0.5">{user?.email}</div>
            </div>
          </div>

          {editMode ? (
            <div className="space-y-5 pt-2">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">First Name <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.first_name} onChange={(e) => { setFormData({ ...formData, first_name: e.target.value }); setErrors({ ...errors, first_name: undefined }); }} className={`input-field ${errors.first_name ? 'border-red-500' : ''}`} placeholder="John" />
                  {errors.first_name && <p className="text-red-400 text-sm mt-1">{errors.first_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Name <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.last_name} onChange={(e) => { setFormData({ ...formData, last_name: e.target.value }); setErrors({ ...errors, last_name: undefined }); }} className={`input-field ${errors.last_name ? 'border-red-500' : ''}`} placeholder="Doe" />
                  {errors.last_name && <p className="text-red-400 text-sm mt-1">{errors.last_name}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input type="tel" value={formData.phone} onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setErrors({ ...errors, phone: undefined }); }} className={`input-field ${errors.phone ? 'border-red-500' : ''}`} placeholder="+61 412 345 678" />
                {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
              </div>
              <div className="flex gap-4 pt-2">
                <button onClick={() => { setEditMode(false); setErrors({}); }} className="btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 p-4 bg-dark-700 rounded-xl">
                <div className="w-10 h-10 bg-dark-600 rounded-lg flex items-center justify-center shrink-0"><User className="h-5 w-5 text-gray-400" /></div>
                <div className="min-w-0">
                  <div className="text-sm text-gray-400">Name</div>
                  <div className="font-medium mt-0.5">{profile?.first_name || profile?.last_name ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() : '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-dark-700 rounded-xl">
                <div className="w-10 h-10 bg-dark-600 rounded-lg flex items-center justify-center shrink-0"><Phone className="h-5 w-5 text-gray-400" /></div>
                <div className="min-w-0">
                  <div className="text-sm text-gray-400">Phone</div>
                  <div className="font-medium mt-0.5">{profile?.phone || '—'}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Driver Profile */}
      {isDriver && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center">
              <Truck className="h-5 w-5 mr-3 text-primary-500" />
              Driver Information
            </h2>
            {!driverProfile && <button onClick={() => setShowDriverForm(true)} className="btn-primary py-2 px-4"><Plus className="h-4 w-4 mr-2" />Add License</button>}
          </div>

          {driverProfile ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-dark-700 rounded-xl">
                  <div className="text-sm text-gray-400">License Number</div>
                  <div className="font-medium mt-1">{driverProfile.license_number}</div>
                </div>
                <div className="p-4 bg-dark-700 rounded-xl">
                  <div className="text-sm text-gray-400">License Class</div>
                  <div className="font-medium mt-1">{driverProfile.license_class}</div>
                </div>
                <div className="p-4 bg-dark-700 rounded-xl">
                  <div className="text-sm text-gray-400">State</div>
                  <div className="font-medium mt-1">{driverProfile.license_state}</div>
                </div>
                <div className="p-4 bg-dark-700 rounded-xl">
                  <div className="text-sm text-gray-400">Expiry</div>
                  <div className="font-medium mt-1">{new Date(driverProfile.license_expiry).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-dark-700 rounded-xl">
                <div>
                  <div className="text-sm text-gray-400">Status</div>
                  <div className="font-medium mt-1 capitalize">{driverProfile.status}</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${driverProfile.is_available ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {driverProfile.is_available ? 'Available' : 'Offline'}
                </div>
              </div>

              {/* Vehicle */}
              <div className="pt-4 border-t border-dark-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Vehicle</h3>
                  {!driverProfile.vehicle && <button onClick={() => setShowVehicleForm(true)} className="text-primary-500 text-sm font-medium">Add Vehicle</button>}
                </div>
                {driverProfile.vehicle ? (
                  <div className="p-4 bg-dark-700 rounded-xl">
                    <div className="font-medium">{driverProfile.vehicle.year} {driverProfile.vehicle.make} {driverProfile.vehicle.model}</div>
                    <div className="text-sm text-gray-400 mt-1">{driverProfile.vehicle.type} • {driverProfile.vehicle.plate} • {driverProfile.vehicle.capacity.toLocaleString()} kg</div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No vehicle added yet</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Add your driver's license to start accepting jobs</p>
            </div>
          )}
        </div>
      )}

      {/* Passkeys */}
      <div className="card">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg sm:text-xl font-semibold flex items-center">
            <Shield className="h-5 w-5 mr-3 text-primary-500" />
            Passkeys
          </h2>
          <button onClick={handleAddPasskey} className="btn-primary py-2 px-4"><Plus className="h-4 w-4 mr-2" />Add Passkey</button>
        </div>
        <p className="text-gray-400 mb-6 leading-relaxed">Sign in securely without a password using your device's biometrics.</p>
        {passkeys.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4"><Fingerprint className="h-8 w-8 opacity-50" /></div>
            <p>No passkeys registered yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {passkeys.map((passkey) => (
              <div key={passkey.id} className="flex items-center justify-between p-4 bg-dark-700 rounded-xl">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-dark-600 rounded-lg flex items-center justify-center shrink-0"><Fingerprint className="h-5 w-5 text-primary-500" /></div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{passkey.name}</div>
                    <div className="text-sm text-gray-400 mt-0.5">Added {new Date(passkey.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <button onClick={() => handleDeletePasskey(passkey.id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-dark-600 rounded-lg transition-colors shrink-0 ml-4">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDriverForm && <DriverFormModal onClose={() => setShowDriverForm(false)} onSaved={(d) => { setDriverProfile(d); setShowDriverForm(false); setMessage({ type: 'success', text: 'Driver profile created' }); }} />}
      {showVehicleForm && <VehicleFormModal onClose={() => setShowVehicleForm(false)} onSaved={async () => { const res = await driverProfileApi.getDriver(); setDriverProfile(res.data.data); setShowVehicleForm(false); setMessage({ type: 'success', text: 'Vehicle added' }); }} />}
    </div>
  );
}

function DriverFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: (d: DriverProfile) => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ license_number: '', license_state: 'NSW', license_expiry: '', license_class: 'HC', years_experience: '0' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await driverProfileApi.createDriver({ ...form, years_experience: parseInt(form.years_experience) });
      onSaved(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-800 rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-6">Add Driver's License</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">License Number</label>
            <input type="text" required className="input-field" value={form.license_number} onChange={e => setForm({...form, license_number: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
              <select className="input-field" value={form.license_state} onChange={e => setForm({...form, license_state: e.target.value})}>
                <option value="NSW">NSW</option><option value="VIC">VIC</option><option value="QLD">QLD</option>
                <option value="WA">WA</option><option value="SA">SA</option><option value="TAS">TAS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Class</label>
              <select className="input-field" value={form.license_class} onChange={e => setForm({...form, license_class: e.target.value})}>
                <option value="C">C - Car</option><option value="LR">LR - Light Rigid</option><option value="MR">MR - Medium Rigid</option>
                <option value="HR">HR - Heavy Rigid</option><option value="HC">HC - Heavy Combination</option><option value="MC">MC - Multi Combination</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Expiry Date</label>
              <input type="date" required className="input-field" value={form.license_expiry} onChange={e => setForm({...form, license_expiry: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Years Experience</label>
              <input type="number" className="input-field" value={form.years_experience} onChange={e => setForm({...form, years_experience: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VehicleFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ type: 'flatbed', make: '', model: '', year: '', plate: '', capacity: '', rego_expiry: '', insurance_expiry: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await driverProfileApi.addVehicle({ ...form, year: parseInt(form.year), capacity: parseFloat(form.capacity) });
      onSaved();
    } catch { } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-800 rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-6">Add Vehicle</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle Type</label>
            <select className="input-field" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="flatbed">Flatbed</option><option value="dry_van">Dry Van</option>
              <option value="refrigerated">Refrigerated</option><option value="tanker">Tanker</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Make</label>
              <input type="text" required className="input-field" placeholder="e.g., Kenworth" value={form.make} onChange={e => setForm({...form, make: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
              <input type="text" required className="input-field" placeholder="e.g., T680" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
              <input type="number" required className="input-field" value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Plate</label>
              <input type="text" required className="input-field" value={form.plate} onChange={e => setForm({...form, plate: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Capacity (kg)</label>
            <input type="number" required className="input-field" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Rego Expiry</label>
              <input type="date" required className="input-field" value={form.rego_expiry} onChange={e => setForm({...form, rego_expiry: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Insurance Expiry</label>
              <input type="date" required className="input-field" value={form.insurance_expiry} onChange={e => setForm({...form, insurance_expiry: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Add Vehicle'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
