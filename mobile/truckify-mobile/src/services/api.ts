const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.10.214:8001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed');
    }

    return data;
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<ApiResponse<{ user: any; access_token: string; refresh_token: string }>>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, userType: string) {
    return this.request<ApiResponse<{ user: any; access_token: string; refresh_token: string }>>('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, user_type: userType }),
    });
  }

  // Jobs
  async getJobs(params?: { status?: string; limit?: number }) {
    const query = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request<ApiResponse<any[]>>(`/jobs${query}`);
  }

  async getJob(id: string) {
    return this.request<ApiResponse<any>>(`/jobs/${id}`);
  }

  async acceptJob(jobId: string) {
    return this.request<ApiResponse<any>>(`/jobs/${jobId}/accept`, { method: 'POST' });
  }

  // Driver
  async getDriverProfile() {
    return this.request<ApiResponse<any>>('/driver/profile');
  }

  async updateLocation(latitude: number, longitude: number, speed?: number, heading?: number) {
    return this.request<ApiResponse<any>>('/driver/location', {
      method: 'POST',
      body: JSON.stringify({ 
        latitude, 
        longitude,
        speed: speed || 0,
        heading: heading || 0,
        timestamp: new Date().toISOString()
      }),
    });
  }

  async toggleAvailability(available: boolean) {
    return this.request<ApiResponse<any>>('/driver/availability', {
      method: 'POST',
      body: JSON.stringify({ is_available: available }),
    });
  }

  // Push notifications
  async registerPushToken(token: string, platform: string) {
    return this.request<ApiResponse<any>>('/notifications/register', {
      method: 'POST',
      body: JSON.stringify({ push_token: token, platform }),
    });
  }

  // Generic methods
  async get<T>(endpoint: string) {
    return this.request<ApiResponse<T>>(endpoint);
  }

  async delete(endpoint: string) {
    return this.request<ApiResponse<any>>(endpoint, { method: 'DELETE' });
  }

  // File upload
  async upload<T>(endpoint: string, formData: FormData) {
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return response.json() as Promise<ApiResponse<T>>;
  }
}


export const api = new ApiService();
