/**
 * @fileoverview Tests for the deliberately small root package surface.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import * as fetchLib from '../src/index';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Root package exports', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Test' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exports the named client and core helpers', () => {
    expect(typeof fetchLib.FetchClient).toBe('function');
    expect(typeof fetchLib.buildQueryParams).toBe('function');
    expect(typeof fetchLib.appendQueryParams).toBe('function');
    expect(typeof fetchLib.throwOnError).toBe('function');
    expect(typeof fetchLib.HttpError).toBe('function');
    expect(typeof fetchLib.NetworkError).toBe('function');
  });

  it('does not install or re-export optional middleware', () => {
    expect('default' in fetchLib).toBe(false);
    expect('addRetry' in fetchLib).toBe(false);
    expect('addCache' in fetchLib).toBe(false);
  });

  it('supports a minimal client with predictable defaults', async () => {
    const client = new fetchLib.FetchClient();
    const response = await client.get('/api/test', {
      status: 'active',
      limit: 10,
    });

    expect(response.ok).toBe(true);
    expect(response.data).toEqual({ id: 1, name: 'Test' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test?status=active&limit=10',
      expect.objectContaining({ credentials: 'same-origin', method: 'GET' }),
    );
  });

  it('serializes JSON bodies and supports operation ids', async () => {
    const client = new fetchLib.FetchClient();
    await client.post(
      '/api/test',
      { name: 'New Item' },
      {},
      {
        operationId: 'op-123',
      },
    );

    const [, options] = mockFetch.mock.calls[0]!;
    expect(options?.method).toBe('POST');
    expect(JSON.parse(options?.body)).toEqual({ name: 'New Item' });
    expect(options?.headers?.['x-operation-id']).toBe('op-123');
  });
});
