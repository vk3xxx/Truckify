import { api } from '../services/api';

// Mock fetch
global.fetch = jest.fn();

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.setToken(null);
  });

  test('login sends correct request', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { access_token: 'token123', user: { id: '1' } } }),
    });

    const result = await api.login('test@example.com', 'password123');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      })
    );
    expect(result.data?.access_token).toBe('token123');
  });

  test('register sends correct request', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { user: { id: '1' } } }),
    });

    await api.register('test@example.com', 'password123', 'driver');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/register'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123', user_type: 'driver' }),
      })
    );
  });

  test('includes auth token in requests', async () => {
    api.setToken('my-token');
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await api.getJobs();

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      })
    );
  });

  test('throws error on failed request', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Invalid credentials' } }),
    });

    await expect(api.login('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });

  test('acceptJob sends POST request', async () => {
    api.setToken('token');
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { status: 'accepted' } }),
    });

    await api.acceptJob('job-123');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/jobs/job-123/accept'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('updateLocation sends location data', async () => {
    api.setToken('token');
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });

    await api.updateLocation(-37.8136, 144.9631, 60, 180);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/driver/location'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"latitude":-37.8136'),
      })
    );
  });
});
