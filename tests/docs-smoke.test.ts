import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vite-plus/test';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Documentation Examples Smoke Test', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should resolve base URLs as shown in getting started', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1, name: 'Test User' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const { FetchClient } = await import('../src/index');
    const client = new FetchClient({ baseUrl: 'https://api.example.com' });

    const response = await client.get('/users/1');

    expect(response.ok).toBe(true);
    expect(response.data).toEqual({ id: 1, name: 'Test User' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      expect.objectContaining({
        credentials: 'same-origin',
      }),
    );
  });

  it('should surface parsed error bodies as shown in error handling', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const { FetchClient } = await import('../src/index');
    const client = new FetchClient();

    const response = await client.get<{ id: number }, { message: string }>(
      '/users/1',
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.body).toEqual({ message: 'User not found' });
    }
  });

  it('should cancel requests with AbortController as shown in cancellation', async () => {
    mockFetch.mockImplementation((_input, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;

        if (signal?.aborted) {
          const error = new Error('Request aborted');
          error.name = 'AbortError';
          reject(error);
          return;
        }

        signal?.addEventListener(
          'abort',
          () => {
            const error = new Error('Request aborted');
            error.name = 'AbortError';
            reject(error);
          },
          { once: true },
        );
      });
    });

    const { FetchClient } = await import('../src/index');
    const client = new FetchClient();
    const controller = new AbortController();

    const pending = client.get('/slow', {}, { signal: controller.signal });
    controller.abort();

    const response = await pending;

    expect(response.ok).toBe(false);
    expect(response.statusText).toBe('Request Aborted');
  });

  it('should throw HttpError with throwOnError as shown in error handling', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const { FetchClient, throwOnError, HttpError } =
      await import('../src/index');
    const client = new FetchClient();
    const response = await client.get('/users/1');

    expect(() => throwOnError(response)).toThrow(HttpError);
  });
});
