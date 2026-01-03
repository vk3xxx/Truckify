import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-User-ID'] = localStorage.getItem('user_id') || '';
    const user = localStorage.getItem('user');
    if (user) {
      try { config.headers['X-User-Type'] = JSON.parse(user).user_type; } catch {}
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAuthEndpoint = error.config?.url?.match(/^\/(login|register|passkey)/);
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  user_type: 'shipper' | 'driver' | 'fleet_operator' | 'dispatcher' | 'admin';
  status: string;
  email_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  metadata: { timestamp: string; request_id: string };
}

export const authApi = {
  register: (email: string, password: string, userType: string) =>
    api.post<ApiResponse<AuthResponse>>('/register', { email, password, user_type: userType }),

  login: (email: string, password: string) =>
    api.post<ApiResponse<AuthResponse>>('/login', { email, password }),

  beginPasskeyLogin: (email: string) =>
    api.post<ApiResponse<PublicKeyCredentialRequestOptions>>('/passkey/login/begin', { email }),

  finishPasskeyLogin: (email: string, response: string) =>
    api.post<ApiResponse<AuthResponse>>('/passkey/login/finish', { email, response }),

  beginPasskeyRegistration: () =>
    api.post<ApiResponse<PublicKeyCredentialCreationOptions>>('/passkey/register/begin', {}),

  finishPasskeyRegistration: (name: string, response: string) =>
    api.post<ApiResponse<unknown>>('/passkey/register/finish', { name, response }),

  getPasskeys: () => api.get<ApiResponse<Array<{ id: string; name: string; created_at: string }>>>('/passkeys'),

  deletePasskey: (id: string) => api.delete(`/passkeys/${id}`),

  // Admin endpoints
  listUsers: () => api.get<ApiResponse<User[]>>('/admin/users'),
  updateUserStatus: (id: string, status: string) => api.put<ApiResponse<{ message: string }>>(`/admin/users/${id}/status`, { status }),
};

const userApi = axios.create({
  baseURL: import.meta.env.VITE_USER_API_URL || 'http://localhost:8002',
  headers: { 'Content-Type': 'application/json' },
});

userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-User-ID'] = localStorage.getItem('user_id') || '';
  }
  return config;
});

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  created_at: string;
}

export const profileApi = {
  getProfile: () => userApi.get<ApiResponse<UserProfile>>('/profile'),
  createProfile: (data: Partial<UserProfile>) => userApi.post<ApiResponse<UserProfile>>('/profile', data),
  updateProfile: (data: Partial<UserProfile>) => userApi.put<ApiResponse<UserProfile>>('/profile', data),
};

export interface Document {
  id: string;
  user_id: string;
  job_id?: string;
  doc_type: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: string;
  expires_at?: string;
  notes?: string;
  created_at: string;
}

export const documentsApi = {
  upload: (file: File, docType: string, jobId?: string, expiresAt?: string, notes?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    if (jobId) formData.append('job_id', jobId);
    if (expiresAt) formData.append('expires_at', expiresAt);
    if (notes) formData.append('notes', notes);
    return userApi.post<ApiResponse<Document>>('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getMyDocuments: () => userApi.get<ApiResponse<Document[]>>('/documents'),
  getJobDocuments: (jobId: string) => userApi.get<ApiResponse<Document[]>>(`/documents/job/${jobId}`),
  getDocument: (id: string, download?: boolean) => userApi.get<ApiResponse<Document & { content?: string }>>(`/documents/${id}`, { params: { download } }),
  deleteDocument: (id: string) => userApi.delete<ApiResponse<{ message: string }>>(`/documents/${id}`),
  verifyDocument: (id: string, status: 'verified' | 'rejected') => userApi.post<ApiResponse<{ message: string }>>(`/documents/${id}/verify`, { status }),
};

// Driver API
const driverApi = axios.create({
  baseURL: import.meta.env.VITE_DRIVER_API_URL || 'http://localhost:8004',
  headers: { 'Content-Type': 'application/json' },
});

driverApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-User-ID'] = localStorage.getItem('user_id') || '';
  }
  return config;
});

export interface DriverProfile {
  id: string;
  user_id: string;
  license_number: string;
  license_state: string;
  license_expiry: string;
  license_class: string;
  years_experience: number;
  is_available: boolean;
  current_location?: { lat: number; lng: number; address?: string };
  vehicle?: Vehicle;
  rating: number;
  total_trips: number;
  status: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  type: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  capacity: number;
  rego_expiry: string;
  insurance_expiry: string;
}

export const driverProfileApi = {
  getDriver: () => driverApi.get<ApiResponse<DriverProfile>>('/driver'),
  createDriver: (data: { license_number: string; license_state: string; license_expiry: string; license_class: string; years_experience?: number }) =>
    driverApi.post<ApiResponse<DriverProfile>>('/driver', data),
  updateDriver: (data: Partial<DriverProfile>) => driverApi.put<ApiResponse<DriverProfile>>('/driver', data),
  updateLocation: (lat: number, lng: number, address?: string) =>
    driverApi.put<ApiResponse<{ message: string }>>('/driver/location', { lat, lng, address }),
  toggleAvailability: (isAvailable: boolean) =>
    driverApi.put<ApiResponse<DriverProfile>>('/driver/availability', { is_available: isAvailable }),
  addVehicle: (data: Omit<Vehicle, 'id' | 'driver_id'>) =>
    driverApi.post<ApiResponse<Vehicle>>('/driver/vehicle', data),
  getAvailableDrivers: (type?: string) =>
    driverApi.get<ApiResponse<DriverProfile[]>>('/drivers/available', { params: { type } }),
};

// Job API
const jobApi = axios.create({
  baseURL: import.meta.env.VITE_JOB_API_URL || 'http://localhost:8006',
  headers: { 'Content-Type': 'application/json' },
});

jobApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-User-ID'] = localStorage.getItem('user_id') || '';
  }
  return config;
});

export interface Job {
  id: string;
  shipper_id: string;
  driver_id?: string;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  pickup: { city: string; state: string; address?: string; lat?: number; lng?: number };
  delivery: { city: string; state: string; address?: string; lat?: number; lng?: number };
  pickup_date: string;
  delivery_date: string;
  cargo_type: string;
  weight: number;
  vehicle_type: string;
  price: number;
  distance?: number;
  notes?: string;
  created_at: string;
}

export const jobsApi = {
  listJobs: (params?: { status?: string; vehicle_type?: string }) =>
    jobApi.get<ApiResponse<Job[]>>('/jobs', { params }),
  getJob: (id: string) => jobApi.get<ApiResponse<Job>>(`/jobs/${id}`),
  createJob: (data: {
    pickup_city: string; pickup_state: string; pickup_address?: string;
    delivery_city: string; delivery_state: string; delivery_address?: string;
    pickup_date: string; delivery_date: string;
    cargo_type: string; weight: number; vehicle_type: string; price: number;
    notes?: string;
  }) => jobApi.post<ApiResponse<Job>>('/jobs', data),
  updateJob: (id: string, data: Partial<Job>) => jobApi.put<ApiResponse<Job>>(`/jobs/${id}`, data),
  deleteJob: (id: string) => jobApi.delete(`/jobs/${id}`),
  assignDriver: (jobId: string, driverId: string) =>
    jobApi.post<ApiResponse<{ message: string }>>(`/jobs/${jobId}/assign`, { driver_id: driverId }),
  markPickedUp: (jobId: string) => jobApi.post<ApiResponse<Job>>(`/jobs/${jobId}/pickup`),
  markDelivered: (jobId: string) => jobApi.post<ApiResponse<Job>>(`/jobs/${jobId}/deliver`),
  cancelJob: (jobId: string) => jobApi.post<ApiResponse<Job>>(`/jobs/${jobId}/cancel`),
};

// Matching API
const matchingApi = axios.create({
  baseURL: import.meta.env.VITE_MATCHING_API_URL || 'http://localhost:8007',
  headers: { 'Content-Type': 'application/json' },
});

matchingApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-User-ID'] = localStorage.getItem('user_id') || '';
  }
  return config;
});

export interface Match {
  id: string;
  job_id: string;
  driver_id: string;
  score: number;
  distance_km: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface DriverCandidate {
  driver_id: string;
  user_id: string;
  rating: number;
  total_trips: number;
  vehicle_type: string;
  lat: number;
  lng: number;
  distance_km: number;
  score: number;
}

export interface MatchResponse {
  job_id: string;
  candidates: DriverCandidate[];
  matched_at: string;
}

export const matchingApiClient = {
  findMatches: (data: { job_id: string; vehicle_type: string; pickup_lat: number; pickup_lng: number; max_distance_km?: number }) =>
    matchingApi.post<ApiResponse<MatchResponse>>('/match', data),
  getMatchesForJob: (jobId: string) =>
    matchingApi.get<ApiResponse<Match[]>>(`/matches/job/${jobId}`),
  getPendingMatches: () =>
    matchingApi.get<ApiResponse<Match[]>>('/matches/pending'),
  acceptMatch: (matchId: string) =>
    matchingApi.post<ApiResponse<{ message: string }>>(`/matches/${matchId}/accept`),
  rejectMatch: (matchId: string) =>
    matchingApi.post<ApiResponse<{ message: string }>>(`/matches/${matchId}/reject`),
};

// Bidding API
const biddingApi = axios.create({
  baseURL: import.meta.env.VITE_BIDDING_API_URL || 'http://localhost:8008',
  headers: { 'Content-Type': 'application/json' },
});

biddingApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-User-ID'] = localStorage.getItem('user_id') || '';
  }
  return config;
});

export interface Bid {
  id: string;
  job_id: string;
  driver_id: string;
  amount: number;
  notes?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string;
  created_at: string;
}

export const biddingApiClient = {
  createBid: (data: { job_id: string; amount: number; notes?: string }) =>
    biddingApi.post<ApiResponse<Bid>>('/bids', data),
  getMyBids: () =>
    biddingApi.get<ApiResponse<Bid[]>>('/bids'),
  getBid: (id: string) =>
    biddingApi.get<ApiResponse<Bid>>(`/bids/${id}`),
  updateBid: (id: string, data: { amount: number; notes?: string }) =>
    biddingApi.put<ApiResponse<Bid>>(`/bids/${id}`, data),
  withdrawBid: (id: string) =>
    biddingApi.delete(`/bids/${id}`),
  getJobBids: (jobId: string) =>
    biddingApi.get<ApiResponse<Bid[]>>(`/jobs/${jobId}/bids`),
  acceptBid: (id: string) =>
    biddingApi.post<ApiResponse<Bid>>(`/bids/${id}/accept`),
  rejectBid: (id: string) =>
    biddingApi.post<ApiResponse<{ message: string }>>(`/bids/${id}/reject`),
};

// Rating API
const ratingApi = axios.create({
  baseURL: import.meta.env.VITE_RATING_API_URL || 'http://localhost:8013',
  headers: { 'Content-Type': 'application/json' },
});

ratingApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-User-ID'] = localStorage.getItem('user_id') || '';
  }
  return config;
});

export interface Rating {
  id: string;
  job_id: string;
  rater_id: string;
  ratee_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export const ratingsApi = {
  createRating: (data: { job_id: string; ratee_id: string; rating: number; comment?: string }) =>
    ratingApi.post<ApiResponse<Rating>>('/ratings', data),
  getJobRatings: (jobId: string) =>
    ratingApi.get<ApiResponse<Rating[]>>(`/ratings/job/${jobId}`),
  getUserRatings: (userId: string) =>
    ratingApi.get<ApiResponse<Rating[]>>(`/ratings/user/${userId}`),
};

// Notification API
const notificationApi = axios.create({
  baseURL: import.meta.env.VITE_NOTIFICATION_API_URL || 'http://localhost:8014',
  headers: { 'Content-Type': 'application/json' },
});

notificationApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-User-ID'] = localStorage.getItem('user_id') || '';
  }
  return config;
});

export interface Notification {
  id: string;
  user_id: string;
  type: 'email' | 'sms' | 'push';
  title: string;
  message: string;
  status: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  job_id: string;
  shipper_id: string;
  driver_id: string;
  created_at: string;
  updated_at: string;
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at?: string;
  created_at: string;
}

export const notificationsApi = {
  getUserNotifications: (userId: string) =>
    notificationApi.get<ApiResponse<Notification[]>>(`/notifications/user/${userId}`),
  sendNotification: (data: { user_id: string; type: string; title: string; message: string }) =>
    notificationApi.post<ApiResponse<Notification>>('/notifications/send', data),
};

// TODO: Enable end-to-end encryption for messages
// - Encrypt messages client-side before sending
// - Decrypt on recipient's device only
// - Implement key exchange on conversation start

export const messagingApi = {
  getConversations: () =>
    notificationApi.get<ApiResponse<Conversation[]>>('/messages/conversations'),
  getOrCreateConversation: (jobId: string, shipperId: string, driverId: string) =>
    notificationApi.post<ApiResponse<Conversation>>(`/messages/conversations/job/${jobId}`, { shipper_id: shipperId, driver_id: driverId }),
  getMessages: (conversationId: string) =>
    notificationApi.get<ApiResponse<ChatMessage[]>>(`/messages/conversations/${conversationId}`),
  sendMessage: (conversationId: string, content: string) =>
    notificationApi.post<ApiResponse<ChatMessage>>(`/messages/conversations/${conversationId}`, { content }),
};

// WebSocket connection helper
export const createWebSocket = (userId: string, onMessage: (msg: { type: string; payload: unknown }) => void) => {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8014';
  const ws = new WebSocket(`${wsUrl}/ws?user_id=${userId}`);
  
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      onMessage(msg);
    } catch (e) {
      console.error('WebSocket parse error:', e);
    }
  };
  
  ws.onerror = (error) => console.error('WebSocket error:', error);
  
  return ws;
};

// Fleet API
const fleetApi = axios.create({
  baseURL: import.meta.env.VITE_FLEET_API_URL || 'http://localhost:8005',
  headers: { 'Content-Type': 'application/json' },
});

fleetApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-User-ID'] = localStorage.getItem('user_id') || '';
  }
  return config;
});

export interface Fleet {
  id: string;
  owner_id: string;
  name: string;
  abn?: string;
  status: string;
  created_at: string;
}

export interface FleetVehicle {
  id: string;
  fleet_id: string;
  current_driver_id?: string;
  type: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  vin?: string;
  capacity: number;
  rego_expiry: string;
  insurance_expiry: string;
  status: string;
  current_location?: { lat: number; lng: number; address?: string };
  created_at: string;
}

export interface FleetDriver {
  id: string;
  fleet_id: string;
  driver_id: string;
  user_id: string;
  status: string;
  joined_at: string;
}

export interface VehicleHandover {
  id: string;
  vehicle_id: string;
  job_id?: string;
  from_driver_id?: string;
  to_driver_id: string;
  status: string;
  notes?: string;
  requested_at: string;
  completed_at?: string;
}

export const fleetApiClient = {
  // Fleet
  createFleet: (data: { name: string; abn?: string }) =>
    fleetApi.post<ApiResponse<Fleet>>('/fleet', data),
  getMyFleet: () =>
    fleetApi.get<ApiResponse<Fleet>>('/fleet'),
  getFleet: (id: string) =>
    fleetApi.get<ApiResponse<Fleet>>(`/fleet/${id}`),

  // Vehicles
  createVehicle: (data: { type: string; make: string; model: string; year: number; plate: string; vin?: string; capacity: number; rego_expiry: string; insurance_expiry: string }) =>
    fleetApi.post<ApiResponse<FleetVehicle>>('/fleet/vehicles', data),
  getFleetVehicles: () =>
    fleetApi.get<ApiResponse<FleetVehicle[]>>('/fleet/vehicles'),
  getVehicle: (id: string) =>
    fleetApi.get<ApiResponse<FleetVehicle>>(`/fleet/vehicles/${id}`),
  assignVehicle: (vehicleId: string, driverId: string) =>
    fleetApi.post<ApiResponse<{ message: string }>>(`/fleet/vehicles/${vehicleId}/assign`, { driver_id: driverId }),
  unassignVehicle: (vehicleId: string) =>
    fleetApi.post<ApiResponse<{ message: string }>>(`/fleet/vehicles/${vehicleId}/unassign`),

  // Drivers
  addDriver: (driverId: string, userId: string) =>
    fleetApi.post<ApiResponse<FleetDriver>>('/fleet/drivers', { driver_id: driverId, user_id: userId }),
  getFleetDrivers: () =>
    fleetApi.get<ApiResponse<FleetDriver[]>>('/fleet/drivers'),
  removeDriver: (driverId: string) =>
    fleetApi.delete(`/fleet/drivers/${driverId}`),

  // Handover
  requestHandover: (data: { vehicle_id: string; to_driver_id: string; job_id?: string; notes?: string }) =>
    fleetApi.post<ApiResponse<VehicleHandover>>('/handover/request', data),
  getPendingHandovers: () =>
    fleetApi.get<ApiResponse<VehicleHandover[]>>('/handover/pending'),
  acceptHandover: (id: string) =>
    fleetApi.post<ApiResponse<{ message: string }>>(`/handover/${id}/accept`),
  rejectHandover: (id: string) =>
    fleetApi.post<ApiResponse<{ message: string }>>(`/handover/${id}/reject`),
};

// Analytics API
const analyticsApi = axios.create({
  baseURL: import.meta.env.VITE_ANALYTICS_API_URL || 'http://localhost:8015',
  headers: { 'Content-Type': 'application/json' },
});

analyticsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-User-ID'] = localStorage.getItem('user_id') || '';
  }
  return config;
});

export interface DashboardStats {
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  total_drivers: number;
  active_drivers: number;
  total_shippers: number;
  total_revenue: number;
  avg_job_value: number;
  total_fleets: number;
  total_vehicles: number;
}

export interface JobsByStatus {
  status: string;
  count: number;
}

export interface JobsByDay {
  date: string;
  count: number;
}

export interface RevenueByDay {
  date: string;
  revenue: number;
}

export interface TopRoute {
  origin: string;
  destination: string;
  count: number;
}

export const analyticsApiClient = {
  getDashboardStats: () =>
    analyticsApi.get<ApiResponse<DashboardStats>>('/analytics/dashboard'),
  getJobsByStatus: () =>
    analyticsApi.get<ApiResponse<JobsByStatus[]>>('/analytics/jobs/status'),
  getJobsByDay: (days?: number) =>
    analyticsApi.get<ApiResponse<JobsByDay[]>>('/analytics/jobs/daily', { params: { days } }),
  getRevenueByDay: (days?: number) =>
    analyticsApi.get<ApiResponse<RevenueByDay[]>>('/analytics/revenue/daily', { params: { days } }),
  getTopRoutes: (limit?: number) =>
    analyticsApi.get<ApiResponse<TopRoute[]>>('/analytics/routes/top', { params: { limit } }),
};

// Payment/Pricing API
const paymentApi = axios.create({
  baseURL: import.meta.env.VITE_PAYMENT_API_URL || 'http://localhost:8012',
  headers: { 'Content-Type': 'application/json' },
});

paymentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-User-ID'] = localStorage.getItem('user_id') || '';
  }
  return config;
});

export interface SubscriptionTier {
  id: string;
  name: string;
  monthly_price: number;
  annual_price: number;
  base_commission_rate: number;
  description: string;
  features: string[];
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  tier_id: string;
  tier_name: string;
  status: string;
  started_at: string;
  expires_at?: string;
  auto_renew: boolean;
}

export interface FeeCalculation {
  job_amount: number;
  base_rate: number;
  job_value_discount: number;
  effective_rate: number;
  platform_fee: number;
  driver_payout: number;
  subscription_tier: string;
}

export const pricingApi = {
  getSubscriptionTiers: () =>
    paymentApi.get<ApiResponse<SubscriptionTier[]>>('/pricing/tiers'),
  getCommissionTiers: () =>
    paymentApi.get<ApiResponse<{ min_job_value: number; max_job_value?: number; rate_discount: number }[]>>('/pricing/commission-tiers'),
  getMySubscription: () =>
    paymentApi.get<ApiResponse<UserSubscription | { tier: string; status: string }>>('/subscription'),
  subscribe: (tierId: string, annual?: boolean) =>
    paymentApi.post<ApiResponse<UserSubscription>>('/subscription', { tier_id: tierId, annual }),
  cancelSubscription: () =>
    paymentApi.delete<ApiResponse<{ message: string }>>('/subscription'),
  calculateFees: (driverId: string, jobAmount: number) =>
    paymentApi.post<ApiResponse<FeeCalculation>>('/pricing/calculate', { driver_id: driverId, job_amount: jobAmount }),
  createCheckout: (jobId: string, successUrl: string, cancelUrl: string) =>
    paymentApi.post<ApiResponse<{ checkout_url: string; session_id: string }>>('/checkout', { job_id: jobId, success_url: successUrl, cancel_url: cancelUrl }),
  createSubscriptionCheckout: (tierId: string, annual: boolean, successUrl: string, cancelUrl: string) =>
    paymentApi.post<ApiResponse<{ checkout_url: string; session_id: string }>>('/checkout/subscription', { tier_id: tierId, annual, success_url: successUrl, cancel_url: cancelUrl }),
};

// Route Service
const routeApi = axios.create({ baseURL: import.meta.env.VITE_ROUTE_API_URL || 'http://localhost:8009', headers: { 'Content-Type': 'application/json' } });

export interface Location { lat: number; lng: number; address?: string; }
export interface RouteResult { origin: Location; destination: Location; waypoints?: Location[]; distance_km: number; duration_mins: number; fuel_estimate_liters: number; toll_estimate: number; }
export interface OptimizeResult { optimized_route: Location[]; total_distance_km: number; total_duration_mins: number; savings_km: number; }

export const routingApi = {
  calculateRoute: (origin: Location, destination: Location, waypoints?: Location[]) =>
    routeApi.post<ApiResponse<RouteResult>>('/route', { origin, destination, waypoints }),
  optimizeRoute: (origin: Location, stops: Location[], returnTo?: Location) =>
    routeApi.post<ApiResponse<OptimizeResult>>('/route/optimize', { origin, stops, return_to: returnTo }),
};

// Backhaul Service
const backhaulApiClient = axios.create({ baseURL: import.meta.env.VITE_BACKHAUL_API_URL || 'http://localhost:8010', headers: { 'Content-Type': 'application/json' } });

export interface BackhaulOpportunity { id: string; job_id: string; origin_city: string; origin_state: string; dest_city: string; dest_state: string; vehicle_type: string; pickup_date: string; price: number; status: string; }
export interface BackhaulMatch { opportunity: BackhaulOpportunity; detour_km: number; savings_km: number; score: number; }

export const backhaulApi = {
  findBackhauls: (currentLat: number, currentLng: number, destLat: number, destLng: number, vehicleType: string, maxDetourKm?: number) =>
    backhaulApiClient.post<ApiResponse<BackhaulMatch[]>>('/backhaul/find', { current_lat: currentLat, current_lng: currentLng, dest_lat: destLat, dest_lng: destLng, vehicle_type: vehicleType, max_detour_km: maxDetourKm }),
  claimOpportunity: (id: string) =>
    backhaulApiClient.post<ApiResponse<{ message: string }>>(`/backhaul/${id}/claim`),
};

// Tracking Service
const trackingApiClient = axios.create({ baseURL: import.meta.env.VITE_TRACKING_API_URL || 'http://localhost:8011', headers: { 'Content-Type': 'application/json' } });

export interface TrackingEvent { id: string; job_id: string; driver_id: string; latitude: number; longitude: number; speed: number; heading: number; timestamp: string; event_type: string; }
export interface CurrentLocation { driver_id: string; latitude: number; longitude: number; speed: number; heading: number; timestamp: string; }

export const trackingApi = {
  getJobHistory: (jobId: string) =>
    trackingApiClient.get<ApiResponse<TrackingEvent[]>>(`/tracking/job/${jobId}`),
  getDriverLocation: (driverId: string) =>
    trackingApiClient.get<ApiResponse<CurrentLocation>>(`/tracking/driver/${driverId}/current`),
  updateLocation: (jobId: string, driverId: string, lat: number, lng: number, speed: number, heading: number, eventType: string) =>
    trackingApiClient.post<ApiResponse<{ message: string }>>('/tracking/update', { job_id: jobId, driver_id: driverId, latitude: lat, longitude: lng, speed, heading, event_type: eventType }),
};

// Insurance/Compliance Service
const insuranceApiClient = axios.create({ baseURL: import.meta.env.VITE_COMPLIANCE_API_URL || 'http://localhost:8016', headers: { 'Content-Type': 'application/json' } });
insuranceApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) { config.headers.Authorization = `Bearer ${token}`; config.headers['X-User-ID'] = localStorage.getItem('user_id') || ''; }
  return config;
});

export interface InsurancePolicy {
  id: string; user_id: string; vehicle_id?: string; policy_number: string; provider: string;
  policy_type: string; coverage_amount: number; premium: number; start_date: string; end_date: string;
  status: string; document_id?: string; verified_at?: string; created_at: string;
}

export interface InsuranceClaim {
  id: string; policy_id: string; job_id?: string; claim_number: string; incident_date: string;
  incident_type: string; description: string; claim_amount: number; status: string;
  documents: string[]; resolution_notes?: string; resolved_at?: string; created_at: string;
}

export const insuranceApi = {
  // Policies
  createPolicy: (data: { policy_number: string; provider: string; policy_type: string; coverage_amount: number; premium?: number; start_date: string; end_date: string; vehicle_id?: string; document_id?: string }) =>
    insuranceApiClient.post<ApiResponse<InsurancePolicy>>('/insurance/policies', data),
  getMyPolicies: () => insuranceApiClient.get<ApiResponse<InsurancePolicy[]>>('/insurance/policies'),
  getPolicy: (id: string) => insuranceApiClient.get<ApiResponse<InsurancePolicy>>(`/insurance/policies/${id}`),
  getExpiringPolicies: (days?: number) => insuranceApiClient.get<ApiResponse<InsurancePolicy[]>>('/insurance/policies/expiring', { params: { days } }),
  verifyPolicy: (id: string, approve: boolean) => insuranceApiClient.post<ApiResponse<{ message: string }>>(`/insurance/policies/${id}/verify`, { approve }),
  // Claims
  createClaim: (data: { policy_id: string; incident_date: string; incident_type: string; description: string; claim_amount: number; job_id?: string }) =>
    insuranceApiClient.post<ApiResponse<InsuranceClaim>>('/insurance/claims', data),
  getMyClaims: () => insuranceApiClient.get<ApiResponse<InsuranceClaim[]>>('/insurance/claims'),
  getClaim: (id: string) => insuranceApiClient.get<ApiResponse<InsuranceClaim>>(`/insurance/claims/${id}`),
  getPolicyClaims: (policyId: string) => insuranceApiClient.get<ApiResponse<InsuranceClaim[]>>(`/insurance/policies/${policyId}/claims`),
  updateClaimStatus: (id: string, status: string, notes?: string) => insuranceApiClient.put<ApiResponse<{ message: string }>>(`/insurance/claims/${id}/status`, { status, resolution_notes: notes }),
  addClaimDocument: (id: string, documentId: string) => insuranceApiClient.post<ApiResponse<{ message: string }>>(`/insurance/claims/${id}/documents`, { document_id: documentId }),
};

export default api;
