import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Mail, Lock, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { authApi } from '../api';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      const { user, access_token, refresh_token } = response.data.data;
      login(user, access_token, refresh_token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }
    setError('');
    setLoading(true);

    const toBase64Url = (buffer: ArrayBuffer) => {
      return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    try {
      const beginResponse = await authApi.beginPasskeyLogin(email);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options = beginResponse.data.data as any;

      const challenge = options.publicKey.challenge.replace(/-/g, '+').replace(/_/g, '/');
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        ...options.publicKey,
        challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
        allowCredentials: options.publicKey.allowCredentials?.map((cred: { id: string; type: string }) => ({
          ...cred,
          id: Uint8Array.from(atob(cred.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
        })),
      };

      const credential = await navigator.credentials.get({ publicKey: publicKeyOptions }) as PublicKeyCredential;
      
      if (!credential) {
        throw new Error('No credential returned');
      }

      const response = credential.response as AuthenticatorAssertionResponse;
      const credentialResponse = {
        id: credential.id,
        rawId: toBase64Url(credential.rawId),
        type: credential.type,
        response: {
          authenticatorData: toBase64Url(response.authenticatorData),
          clientDataJSON: toBase64Url(response.clientDataJSON),
          signature: toBase64Url(response.signature),
          userHandle: response.userHandle ? toBase64Url(response.userHandle) : null,
        },
      };

      const finishResponse = await authApi.finishPasskeyLogin(email, btoa(JSON.stringify(credentialResponse)));
      const { user, access_token, refresh_token } = finishResponse.data.data;
      login(user, access_token, refresh_token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { message?: string; response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || error.message || 'Passkey authentication failed');
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
          <h1 className="mt-10 text-4xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-3 text-gray-400 text-base">Sign in to your account</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

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

            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded bg-dark-700 text-primary-500 cursor-pointer"
                  style={{ border: '1px solid #404040' }}
                />
                <span className="ml-2.5 text-gray-400 group-hover:text-gray-300">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-primary-500 hover:text-primary-400 font-medium transition-colors">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#404040' }}></div>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Or continue with</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#404040' }}></div>
          </div>

          <button
            onClick={handlePasskeyLogin}
            disabled={loading}
            className="btn-secondary w-full"
          >
            <Fingerprint className="h-5 w-5 mr-2" />
            Sign in with Passkey
          </button>

          <p className="mt-8 text-center text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-500 hover:text-primary-400 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
