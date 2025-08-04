import { describe, it, expect } from 'vitest';
import api from './index';

describe('Default API Instance', () => {
  it('exports a configured FetchClient instance', () => {
    expect(api).toBeDefined();
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
    expect(typeof api.put).toBe('function');
    expect(typeof api.del).toBe('function');
  });

  it('exports error classes', async () => {
    const { FetchError, HttpError, NetworkError } = await import('./index');

    expect(FetchError).toBeDefined();
    expect(HttpError).toBeDefined();
    expect(NetworkError).toBeDefined();

    // Verify they are constructors
    expect(typeof FetchError).toBe('function');
    expect(typeof HttpError).toBe('function');
    expect(typeof NetworkError).toBe('function');
  });

  it('exports client classes and utilities', async () => {
    const { FetchClient, useCSRF, useUnauthorized } = await import('./index');

    expect(FetchClient).toBeDefined();
    expect(useCSRF).toBeDefined();
    expect(useUnauthorized).toBeDefined();

    expect(typeof FetchClient).toBe('function');
    expect(typeof useCSRF).toBe('function');
    expect(typeof useUnauthorized).toBe('function');
  });
});
