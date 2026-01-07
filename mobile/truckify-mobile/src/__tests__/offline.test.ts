import { offlineService } from '../services/offline';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

describe('Offline Service', () => {
  beforeEach(async () => {
    await offlineService.clearCache();
  });

  test('caches and retrieves data', async () => {
    const testData = { id: 1, name: 'Test Job' };
    await offlineService.cache('jobs', testData);

    const cached = await offlineService.getCached('jobs');
    expect(cached).toEqual(testData);
  });

  test('returns null for missing cache', async () => {
    const cached = await offlineService.getCached('nonexistent');
    expect(cached).toBeNull();
  });

  test('queues offline actions', async () => {
    await offlineService.queueAction('job_accept', { jobId: '123' });
    await offlineService.queueAction('location_update', { latitude: 1, longitude: 2 });

    const count = await offlineService.getQueueCount();
    expect(count).toBe(2);
  });

  test('clears cache', async () => {
    await offlineService.cache('test', { data: 'value' });
    await offlineService.clearCache();

    const cached = await offlineService.getCached('test');
    expect(cached).toBeNull();
  });
});
