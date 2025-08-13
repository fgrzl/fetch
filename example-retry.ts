import { FetchClient, createRetryMiddleware, createExponentialRetry } from './src/index';

// Example showing the retry middleware concept
// Note: This is a basic implementation with middleware architecture limitations
console.log('Retry middleware demonstration');

const client = new FetchClient();

// Add retry middleware - limited implementation due to response middleware constraints
const retryMiddleware = createRetryMiddleware({
  maxRetries: 3,
  delay: 1000,
  strategy: 'exponential',
  onRetry: (response, attempt) => {
    console.log(`Retry attempt ${attempt} for ${response.status} ${response.statusText}`);
  }
});

client.useResponseMiddleware(retryMiddleware);

// The retry middleware has limitations:
// 1. Response middleware can't modify the original request
// 2. Limited to re-fetching the same URL without request context
// 3. Cannot preserve original request body/headers perfectly

console.log('For full retry capability, consider implementing retry at the client level or using a request-level approach');

export { client };
