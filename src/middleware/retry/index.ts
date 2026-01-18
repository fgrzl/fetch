import type { FetchClient } from '../../client/fetch-client';
import type { RetryOptions } from './types';
import { createRetryMiddleware } from './retry';

export type { RetryOptions } from './types';
export { createRetryMiddleware } from './retry';

export function addRetry(
  client: FetchClient,
  options: RetryOptions = {},
): FetchClient {
  return client.use(createRetryMiddleware(options));
}
