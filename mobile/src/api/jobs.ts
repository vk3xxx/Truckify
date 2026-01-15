import { apiClient } from './client';

export interface Location {
  address: string;
  city: string;
  state: string;
  postcode: string;
  lat: number;
  lng: number;
}

export interface Job {
  id: string;
  shipper_id: string;
  driver_id: string | null;
  pickup: Location;
  delivery: Location;
  pickup_date: string;
  delivery_date: string;
  cargo_type: string;
  weight: number;
  vehicle_type: string;
  price: number;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  special_requirements: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateJobRequest {
  pickup: Location;
  delivery: Location;
  pickup_date: string;
  delivery_date: string;
  cargo_type: string;
  weight: number;
  vehicle_type: string;
  price: number;
  special_requirements?: string;
}

export const jobsApi = {
  /**
   * List all jobs with optional filters
   */
  async listJobs(filters?: {
    status?: string;
    driver_id?: string;
    shipper_id?: string;
  }): Promise<{ data: Job[] }> {
    const response = await apiClient.get('/jobs', { params: filters });
    return response.data;
  },

  /**
   * Get a specific job by ID
   */
  async getJob(jobId: string): Promise<{ data: Job }> {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Create a new job (shipper only)
   */
  async createJob(job: CreateJobRequest): Promise<{ data: Job }> {
    const response = await apiClient.post('/jobs', job);
    return response.data;
  },

  /**
   * Assign a driver to a job
   */
  async assignDriver(jobId: string, driverId: string): Promise<{ data: Job }> {
    const response = await apiClient.put(`/jobs/${jobId}/assign`, { driver_id: driverId });
    return response.data;
  },

  /**
   * Update job status
   */
  async updateStatus(
    jobId: string,
    status: Job['status']
  ): Promise<{ data: Job }> {
    const response = await apiClient.put(`/jobs/${jobId}/status`, { status });
    return response.data;
  },

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<{ data: Job }> {
    const response = await apiClient.delete(`/jobs/${jobId}`);
    return response.data;
  },
};
