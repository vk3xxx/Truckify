import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_PREFIX = 'truckify_cache_';
const QUEUE_KEY = 'truckify_offline_queue';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface QueuedAction {
  id: string;
  type: 'location_update' | 'job_accept' | 'status_update' | 'message';
  payload: any;
  timestamp: number;
  retries: number;
}

class OfflineService {
  private isOnline = true;
  private syncInProgress = false;
  private listeners: ((online: boolean) => void)[] = [];

  async initialize(): Promise<void> {
    // Monitor network status
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      this.listeners.forEach((l) => l(this.isOnline));
      
      // Sync when coming back online
      if (wasOffline && this.isOnline) {
        this.syncOfflineQueue();
      }
    });

    // Check initial state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  addConnectionListener(listener: (online: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Cache data locally
  async cache<T>(key: string, data: T): Promise<void> {
    const item: CacheItem<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
  }

  // Get cached data
  async getCached<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;

      const item: CacheItem<T> = JSON.parse(raw);
      
      // Check if expired
      if (Date.now() - item.timestamp > CACHE_EXPIRY) {
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }

      return item.data;
    } catch {
      return null;
    }
  }

  // Queue action for later sync
  async queueAction(type: QueuedAction['type'], payload: any): Promise<void> {
    const queue = await this.getQueue();
    const action: QueuedAction = {
      id: Date.now().toString(),
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    queue.push(action);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  // Get offline queue
  async getQueue(): Promise<QueuedAction[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Sync offline queue when back online
  async syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
    if (this.syncInProgress || !this.isOnline) {
      return { synced: 0, failed: 0 };
    }

    this.syncInProgress = true;
    const queue = await this.getQueue();
    let synced = 0;
    let failed = 0;
    const remaining: QueuedAction[] = [];

    for (const action of queue) {
      try {
        await this.processAction(action);
        synced++;
      } catch {
        action.retries++;
        if (action.retries < 3) {
          remaining.push(action);
        } else {
          failed++;
        }
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    this.syncInProgress = false;

    return { synced, failed };
  }

  private async processAction(action: QueuedAction): Promise<void> {
    const { api } = await import('./api');
    
    switch (action.type) {
      case 'location_update':
        await api.updateLocation(
          action.payload.latitude,
          action.payload.longitude,
          action.payload.speed,
          action.payload.heading
        );
        break;
      case 'job_accept':
        await api.acceptJob(action.payload.jobId);
        break;
      case 'status_update':
        // await api.updateJobStatus(action.payload.jobId, action.payload.status);
        break;
      case 'message':
        // await api.sendMessage(action.payload.chatId, action.payload.message);
        break;
    }
  }

  // Clear all cached data
  async clearCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  }

  // Get queue count
  async getQueueCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }
}

export const offlineService = new OfflineService();
