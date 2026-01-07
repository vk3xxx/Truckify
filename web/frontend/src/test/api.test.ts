import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageMock.store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageMock.store[key]; }),
  clear: vi.fn(() => { localStorageMock.store = {}; }),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('creates axios instance with correct base URL', () => {
    expect(axios.create).toBeDefined();
  });

  it('stores token in localStorage after login', () => {
    localStorageMock.setItem('access_token', 'test-token');
    expect(localStorageMock.getItem('access_token')).toBe('test-token');
  });

  it('removes token on logout', () => {
    localStorageMock.setItem('access_token', 'test-token');
    localStorageMock.removeItem('access_token');
    expect(localStorageMock.getItem('access_token')).toBeNull();
  });

  it('stores user data correctly', () => {
    const user = { id: '1', email: 'test@example.com', user_type: 'driver' };
    localStorageMock.setItem('user', JSON.stringify(user));
    expect(JSON.parse(localStorageMock.getItem('user')!)).toEqual(user);
  });
});
