/**
 * @fileoverview Rate limiting middleware implementation.
 */

import type { FetchMiddleware } from '../../client/fetch-client';
import type { RateLimitOptions } from './types';

/**
 * Simple token bucket implementation for rate limiting.
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  
  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per millisecond
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  tryConsume(): { allowed: boolean; retryAfter?: number } {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens--;
      return { allowed: true };
    }
    
    // Calculate when next token will be available
    const retryAfter = (1 - this.tokens) / this.refillRate;
    return { allowed: false, retryAfter: Math.ceil(retryAfter) };
  }

  private refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * Creates rate limiting middleware - mainly for API quota management.
 * Note: Rate limiting is typically a server concern, but this can help with:
 * - Respecting API provider limits
 * - Preventing runaway requests in bulk operations
 * - Cost management for pay-per-request APIs
 */
export function createRateLimitMiddleware(options: RateLimitOptions = {}): FetchMiddleware {
  const {
    maxRequests = 60,
    windowMs = 60000,
    keyGenerator = () => 'default',
    skipPatterns = [],
    onRateLimitExceeded
  } = options;

  const buckets = new Map<string, TokenBucket>();
  const refillRate = maxRequests / windowMs;

  return async (request, next) => {
    const url = request.url || '';
    
    // Skip rate limiting if URL matches skip patterns
    if (skipPatterns.some(pattern => 
      typeof pattern === 'string' ? url.includes(pattern) : pattern.test(url)
    )) {
      return next(request);
    }

    const key = keyGenerator(request);
    
    if (!buckets.has(key)) {
      buckets.set(key, new TokenBucket(maxRequests, refillRate));
    }
    
    const bucket = buckets.get(key)!;
    const result = bucket.tryConsume();
    
    if (!result.allowed) {
      if (onRateLimitExceeded) {
        await onRateLimitExceeded(result.retryAfter || 0, request);
        return next(request); // Let handler decide what to do
      }
      
      throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter}ms`);
    }
    
    return next(request);
  };
}
