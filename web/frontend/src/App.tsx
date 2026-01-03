import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import { WebSocketProvider } from './WebSocketContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import Jobs from './pages/Jobs';
import Admin from './pages/Admin';
import Bids from './pages/Bids';
import Tracking from './pages/Tracking';
import Notifications from './pages/Notifications';
import Fleet from './pages/Fleet';
import Analytics from './pages/Analytics';
import Pricing from './pages/Pricing';
import RoutePlanner from './pages/RoutePlanner';
import Backhaul from './pages/Backhaul';
import Dispatcher from './pages/Dispatcher';
import Documents from './pages/Documents';
import Insurance from './pages/Insurance';
import Messages from './pages/Messages';
import Reports from './pages/Reports';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
      <Route path="/bids" element={<ProtectedRoute><Bids /></ProtectedRoute>} />
      <Route path="/tracking" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
      <Route path="/routes" element={<ProtectedRoute><RoutePlanner /></ProtectedRoute>} />
      <Route path="/backhaul" element={<ProtectedRoute><Backhaul /></ProtectedRoute>} />
      <Route path="/dispatcher" element={<ProtectedRoute><Dispatcher /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/insurance" element={<ProtectedRoute><Insurance /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/tracking/:jobId" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-dark-900">
              <Navbar />
              <AppRoutes />
            </div>
          </BrowserRouter>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
