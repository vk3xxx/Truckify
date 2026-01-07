import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from './api';

const LOCATION_TASK_NAME = 'background-location-task';

// Background task handler
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    if (location) {
      try {
        await api.updateLocation(location.coords.latitude, location.coords.longitude);
        console.log('Location sent:', location.coords.latitude, location.coords.longitude);
      } catch (e) {
        console.error('Failed to send location:', e);
      }
    }
  }
});

export interface LocationState {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

class LocationService {
  private isTracking = false;
  private foregroundSubscription: Location.LocationSubscription | null = null;
  private listeners: ((location: LocationState) => void)[] = [];

  async requestPermissions(): Promise<boolean> {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return false;

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    return background === 'granted';
  }

  async startTracking(onLocation?: (location: LocationState) => void): Promise<boolean> {
    if (this.isTracking) return true;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return false;

    if (onLocation) {
      this.listeners.push(onLocation);
    }

    // Start foreground tracking for UI updates
    this.foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // Update every 10 meters
        timeInterval: 5000, // Or every 5 seconds
      },
      (location) => {
        const state: LocationState = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed,
          heading: location.coords.heading,
          timestamp: location.timestamp,
        };
        this.listeners.forEach((listener) => listener(state));
      }
    );

    // Start background tracking
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50, // Update every 50 meters in background
      timeInterval: 30000, // Or every 30 seconds
      foregroundService: {
        notificationTitle: 'Truckify Tracking',
        notificationBody: 'Tracking your delivery route',
        notificationColor: '#3b82f6',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });

    this.isTracking = true;
    return true;
  }

  async stopTracking(): Promise<void> {
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    this.listeners = [];
    this.isTracking = false;
  }

  async getCurrentLocation(): Promise<LocationState | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        speed: location.coords.speed,
        heading: location.coords.heading,
        timestamp: location.timestamp,
      };
    } catch {
      return null;
    }
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  addListener(listener: (location: LocationState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const locationService = new LocationService();

// ETA calculation helper
export function calculateETA(
  currentLat: number,
  currentLng: number,
  destLat: number,
  destLng: number,
  speedMps: number | null
): { distance: number; eta: string } {
  // Haversine formula for distance
  const R = 6371; // Earth's radius in km
  const dLat = ((destLat - currentLat) * Math.PI) / 180;
  const dLng = ((destLng - currentLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((currentLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Calculate ETA based on speed or average speed
  const avgSpeedKmh = speedMps ? speedMps * 3.6 : 60; // Convert m/s to km/h, default 60 km/h
  const timeHours = distance / avgSpeedKmh;
  const timeMinutes = Math.round(timeHours * 60);

  let eta: string;
  if (timeMinutes < 1) {
    eta = 'Arriving';
  } else if (timeMinutes < 60) {
    eta = `${timeMinutes} min`;
  } else {
    const hours = Math.floor(timeMinutes / 60);
    const mins = timeMinutes % 60;
    eta = `${hours}h ${mins}m`;
  }

  return { distance: Math.round(distance * 10) / 10, eta };
}
