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
          <Link to="/" className="inline-flex items-center space-x-2">
            <Truck className="h-10 w-10 text-primary-500" />
            <span className="text-2xl font-bold">Truckify</span>
          </Link>
          <h1 className="mt-8 text-3xl font-bold">Create your account</h1>
          <p className="mt-3 text-gray-400">Start shipping or hauling in minutes</p>
        </div>

        <div className="card">
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 1 ? 'bg-primary-500' : 'bg-dark-600'}`}>
              1
            </div>
            <div className={`w-20 h-1 ${step >= 2 ? 'bg-primary-500' : 'bg-dark-600'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 2 ? 'bg-primary-500' : 'bg-dark-600'}`}>
              2
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-center text-gray-300 mb-6 font-medium">What best describes you?</p>
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
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-600 hover:border-dark-500 bg-dark-700 hover:bg-dark-600'
                    }`}
                  >
                    <div className="w-12 h-12 bg-dark-600 rounded-lg flex items-center justify-center mr-4 shrink-0">
                      <type.icon className="h-6 w-6 text-primary-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-sm text-gray-400 mt-0.5">{type.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-11"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-11 pr-11"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pl-11"
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
            <Link to="/terms" className="text-primary-500 hover:text-primary-400">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-primary-500 hover:text-primary-400">Privacy Policy</Link>
          </p>

          <p className="mt-6 text-center text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-400 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
