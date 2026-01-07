import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useWebSocket } from '../WebSocketContext';
import { Truck, Menu, X, User, LogOut, Settings, Bell, Circle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { driverProfileApi } from '../api';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useWebSocket();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Load driver availability on mount
  useEffect(() => {
    if (isAuthenticated && user?.user_type === 'driver') {
      driverProfileApi.getDriver()
        .then(res => setIsAvailable(res.data.data.is_available))
        .catch(() => {});
    }
  }, [isAuthenticated, user?.user_type]);

  const toggleAvailability = async () => {
    setLoadingAvailability(true);
    try {
      const res = await driverProfileApi.toggleAvailability(!isAvailable);
      setIsAvailable(res.data.data.is_available);
    } catch (e) {
      console.error('Failed to toggle availability:', e);
    }
    setLoadingAvailability(false);
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-dark-900 border-b border-dark-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2.5 group mr-10">
              <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                <Truck className="h-5 w-5 text-primary-500" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Truckify</span>
            </Link>
            
            {isAuthenticated && (
              <nav className="nav-links hidden lg:flex">
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
                <Link to="/jobs" className="nav-link">Jobs</Link>
                <Link to="/bids" className="nav-link">Bids</Link>
                <Link to="/messages" className="nav-link">Messages</Link>
                <Link to="/routes" className="nav-link">Routes</Link>
                {user?.user_type === 'driver' && (
                  <Link to="/backhaul" className="nav-link">Backhaul</Link>
                )}
                {user?.user_type === 'dispatcher' && (
                  <Link to="/dispatcher" className="nav-link">Dispatch</Link>
                )}
                {(user?.user_type === 'driver' || user?.user_type === 'shipper') && (
                  <Link to="/documents" className="nav-link">Docs</Link>
                )}
                {(user?.user_type === 'driver' || user?.user_type === 'shipper') && (
                  <Link to="/insurance" className="nav-link">Insurance</Link>
                )}
                <Link to="/reports" className="nav-link">Reports</Link>
                {user?.user_type === 'fleet_operator' && (
                  <Link to="/fleet" className="nav-link">Fleet</Link>
                )}
                {user?.user_type === 'admin' && (
                  <>
                    <Link to="/analytics" className="nav-link">Analytics</Link>
                    <Link to="/admin" className="nav-link">Admin</Link>
                    <Link to="/system-admin" className="nav-link">System Config</Link>
                  </>
                )}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {user?.user_type === 'driver' && (
                  <button
                    onClick={toggleAvailability}
                    disabled={loadingAvailability}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isAvailable 
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/20' 
                        : 'bg-dark-800 text-gray-400 border border-dark-700 hover:bg-dark-700'
                    }`}
                  >
                    <Circle className={`h-1.5 w-1.5 ${isAvailable ? 'fill-green-400' : 'fill-gray-500'}`} />
                    {loadingAvailability ? '...' : isAvailable ? 'Online' : 'Offline'}
                  </button>
                )}
                <Link 
                  to="/notifications" 
                  className="relative p-2 text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-all duration-200"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-dark-800 transition-all duration-200 group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="hidden xl:block text-sm font-medium text-gray-300 group-hover:text-white max-w-[140px] truncate">{user?.email}</span>
                  </button>
                  
                  {profileOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 rounded-xl py-2"
                      style={{
                        zIndex: 9999,
                        backgroundColor: '#171717',
                        border: '1px solid #404040',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      <div className="px-4 py-2 border-b border-dark-600 mb-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Signed in as</p>
                        <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3 text-gray-500" />
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-500" />
                        Settings
                      </Link>
                      <div className="border-t border-dark-600 my-2" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link 
                  to="/register" 
                  className="btn-primary py-2 px-4"
                >
                  Get Started
                </Link>
              </>
            )}
            
            <button
              className="lg:hidden text-gray-300 p-2 hover:bg-dark-800 rounded-lg transition-all duration-200"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-dark-800 border-t border-dark-700">
          <div className="px-4 py-3 space-y-0.5">
            {isAuthenticated && (
              <>
                <Link 
                  to="/dashboard" 
                  className="block py-2.5 px-4 text-sm font-medium text-gray-300 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/jobs" 
                  className="block py-2.5 px-4 text-sm font-medium text-gray-300 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Jobs
                </Link>
                <Link 
                  to="/bids" 
                  className="block py-2.5 px-4 text-sm font-medium text-gray-300 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Bids
                </Link>
                <Link 
                  to="/tracking" 
                  className="block py-2.5 px-4 text-sm font-medium text-gray-300 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Tracking
                </Link>
                <Link 
                  to="/notifications" 
                  className="block py-2.5 px-4 text-sm font-medium text-gray-300 hover:bg-dark-700 hover:text-white rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Notifications
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
