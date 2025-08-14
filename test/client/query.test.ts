/**
 * @fileoverview Tests for query parameter utilities
 */

import { describe, it, expect } from 'vitest';
import { buildQueryParams, appendQueryParams } from '../../src/client/query';

describe('Query Parameter Utilities', () => {
  describe('buildQueryParams', () => {
    it('should build basic query string', () => {
      const result = buildQueryParams({ name: 'John', age: 30 });
      expect(result).toBe('name=John&age=30');
    });

    it('should handle arrays correctly', () => {
      const result = buildQueryParams({ 
        tags: ['typescript', 'javascript'], 
        active: true 
      });
      expect(result).toBe('tags=typescript&tags=javascript&active=true');
    });

    it('should filter out undefined values', () => {
      const result = buildQueryParams({ 
        name: 'John', 
        email: undefined, 
        age: null 
      });
      expect(result).toBe('name=John&age=null');
    });

    it('should handle nested arrays with undefined values', () => {
      const result = buildQueryParams({ 
        items: ['a', undefined, 'b'] 
      });
      expect(result).toBe('items=a&items=b');
    });

    it('should handle empty object', () => {
      const result = buildQueryParams({});
      expect(result).toBe('');
    });

    it('should properly encode special characters', () => {
      const result = buildQueryParams({ 
        query: 'hello world', 
        special: 'a&b=c' 
      });
      expect(result).toBe('query=hello+world&special=a%26b%3Dc');
    });

    it('should convert numbers and booleans to strings', () => {
      const result = buildQueryParams({
        count: 42,
        active: true,
        disabled: false
      });
      expect(result).toBe('count=42&active=true&disabled=false');
    });
  });

  describe('appendQueryParams', () => {
    it('should append query params to basic URL', () => {
      const result = appendQueryParams('/api/users', { limit: 10, active: true });
      expect(result).toBe('/api/users?limit=10&active=true');
    });

    it('should append to URL with existing query params', () => {
      const result = appendQueryParams('/api/users?sort=name', { limit: 10 });
      expect(result).toBe('/api/users?sort=name&limit=10');
    });

    it('should return original URL when no query params', () => {
      const result = appendQueryParams('/api/users', {});
      expect(result).toBe('/api/users');
    });

    it('should handle undefined values in query params', () => {
      const result = appendQueryParams('/api/users', { 
        limit: 10, 
        search: undefined 
      });
      expect(result).toBe('/api/users?limit=10');
    });

    it('should work with absolute URLs', () => {
      const result = appendQueryParams('https://api.example.com/users', { 
        page: 1 
      });
      expect(result).toBe('https://api.example.com/users?page=1');
    });

    it('should work with URLs that have fragments', () => {
      const result = appendQueryParams('/api/users#section', { 
        limit: 5 
      });
      expect(result).toBe('/api/users?limit=5#section');
    });
  });
});
