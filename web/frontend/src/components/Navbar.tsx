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
    <nav className="bg-dark-900/95 backdrop-blur-sm border-b border-dark-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Truck className="h-8 w-8 text-primary-500" />
              <span className="text-xl font-bold">Truckify</span>
            </Link>
            
            {isAuthenticated && (
              <div className="hidden md:flex ml-10 space-x-1">
                <Link to="/dashboard" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
                  Dashboard
                </Link>
                <Link to="/jobs" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
                  Jobs
                </Link>
                <Link to="/bids" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
                  Bids
                </Link>
                <Link to="/messages" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
                  Messages
                </Link>
                <Link to="/routes" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
                  Routes
                </Link>
                {user?.user_type === 'driver' && (
                  <Link to="/backhaul" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
                    Backhaul
                  </Link>
                )}
                {user?.user_type === 'dispatcher' && (
                  <Link to="/dispatcher" className="px-4 py-2 text-primary-400 hover:text-primary-300 hover:bg-dark-800 rounded-lg transition-colors">
                    Dispatch
                  </Link>
                )}
                {(user?.user_type === 'driver' || user?.user_type === 'shipper') && (
                  <Link to="/documents" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
                    Docs
                  </Link>
                )}
                {(user?.user_type === 'driver' || user?.user_type === 'shipper') && (
                  <Link to="/insurance" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
                    Insurance
                  </Link>
                )}
                <Link to="/reports" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
                  Reports
                </Link>
                {user?.user_type === 'fleet_operator' && (
                  <Link to="/fleet" className="px-4 py-2 text-primary-400 hover:text-primary-300 hover:bg-dark-800 rounded-lg transition-colors">
                    Fleet
                  </Link>
                )}
                {user?.user_type === 'admin' && (
                  <>
                    <Link to="/analytics" className="px-4 py-2 text-primary-400 hover:text-primary-300 hover:bg-dark-800 rounded-lg transition-colors">
                      Analytics
                    </Link>
                    <Link to="/admin" className="px-4 py-2 text-primary-400 hover:text-primary-300 hover:bg-dark-800 rounded-lg transition-colors">
                      Admin
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {user?.user_type === 'driver' && (
                  <button
                    onClick={toggleAvailability}
                    disabled={loadingAvailability}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isAvailable 
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                        : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                    }`}
                  >
                    <Circle className={`h-2.5 w-2.5 ${isAvailable ? 'fill-green-400' : 'fill-gray-500'}`} />
                    {loadingAvailability ? '...' : isAvailable ? 'Online' : 'Offline'}
                  </button>
                )}
                <Link to="/notifications" className="relative p-2 text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-dark-800 transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="hidden md:block text-sm font-medium max-w-[150px] truncate">{user?.email}</span>
                </button>
                
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-dark-800 rounded-xl shadow-xl border border-dark-700 py-2 overflow-hidden">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-3 text-gray-300 hover:bg-dark-700 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-3 text-gray-300 hover:bg-dark-700 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Settings
                    </Link>
                    <div className="border-t border-dark-700 my-2" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-gray-300 hover:bg-dark-700 transition-colors"
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
                <Link to="/login" className="px-4 py-2 text-gray-300 hover:text-white transition-colors font-medium">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary py-2 px-4">
                  Get Started
                </Link>
              </>
            )}
            
            <button
              className="md:hidden text-gray-300 p-2 hover:bg-dark-800 rounded-lg transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-dark-800 border-t border-dark-700">
          <div className="px-4 py-4 space-y-1">
            {isAuthenticated && (
              <>
                <Link 
                  to="/dashboard" 
                  className="block py-3 px-4 text-gray-300 hover:bg-dark-700 rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/jobs" 
                  className="block py-3 px-4 text-gray-300 hover:bg-dark-700 rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Jobs
                </Link>
                <Link 
                  to="/bids" 
                  className="block py-3 px-4 text-gray-300 hover:bg-dark-700 rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Bids
                </Link>
                <Link 
                  to="/tracking" 
                  className="block py-3 px-4 text-gray-300 hover:bg-dark-700 rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Tracking
                </Link>
                <Link 
                  to="/notifications" 
                  className="block py-3 px-4 text-gray-300 hover:bg-dark-700 rounded-lg transition-colors"
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
