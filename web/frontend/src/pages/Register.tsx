import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Truck, Mail, Lock, Eye, EyeOff, Building, Users, User } from 'lucide-react';
import { authApi } from '../api';
import { useAuth } from '../AuthContext';

const userTypes = [
  { id: 'shipper', label: 'Shipper', icon: Building, desc: 'I need to ship freight' },
  { id: 'driver', label: 'Driver', icon: Truck, desc: 'I want to haul loads' },
  { id: 'fleet_operator', label: 'Fleet Operator', icon: Users, desc: 'I manage multiple trucks' },
  { id: 'dispatcher', label: 'Dispatcher', icon: User, desc: 'I coordinate shipments' },
];

export default function Register() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState(searchParams.get('type') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register(email, password, userType);
      const { user, access_token, refresh_token } = response.data.data;
      login(user, access_token, refresh_token);
      navigate('/onboarding');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center space-x-2.5 group">
            <Truck className="h-9 w-9 text-primary-500 transition-transform group-hover:scale-105" />
            <span className="text-2xl font-bold text-white">Truckify</span>
          </Link>
          <h1 className="mt-10 text-4xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-3 text-gray-400 text-base">Start shipping or hauling in minutes</p>
        </div>

        <div className="card">
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              step >= 1 
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                : 'bg-dark-700 text-gray-500 border border-dark-600'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 transition-all ${step >= 2 ? 'bg-primary-500' : 'bg-dark-700'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              step >= 2 
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                : 'bg-dark-700 text-gray-500 border border-dark-600'
            }`}>
              2
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-center text-gray-300 mb-8 font-medium text-base">What best describes you?</p>
              <div className="space-y-3">
                {userTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setUserType(type.id);
                      setStep(2);
                    }}
                    className={`w-full p-4 rounded-xl border transition-all flex items-center ${
                      userType === type.id
                        ? 'border-primary-500 bg-dark-700 shadow-lg shadow-primary-500/10'
                        : 'border-dark-700 hover:border-dark-600 bg-dark-800 hover:bg-dark-700'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shrink-0 transition-all ${
                      userType === type.id 
                        ? 'bg-primary-500/20' 
                        : 'bg-dark-600'
                    }`}>
                      <type.icon className={`h-6 w-6 ${userType === type.id ? 'text-primary-500' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-white">{type.label}</div>
                      <div className="text-sm text-gray-400 mt-0.5">{type.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '3rem' }}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '3rem' }}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                  Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-8 text-center text-gray-400 text-sm leading-relaxed">
            By signing up, you agree to our{' '}
            <Link to="/terms" className="text-primary-500 hover:text-primary-400 transition-colors">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-primary-500 hover:text-primary-400 transition-colors">Privacy Policy</Link>
          </p>

          <p className="mt-6 text-center text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-400 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
