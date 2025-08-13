/**
 * Example usage of the new FetchResponse<T> API
 */

import { FetchClient, FetchResponse } from './src/client';

// Example usage
async function example() {
  const client = new FetchClient();

  // Type-safe request with full response metadata
  interface User {
    id: number;
    name: string;
    email: string;
  }

  const userResponse: FetchResponse<User> = await client.get<User>('/api/users/123');

  // Access the data with type safety
  if (userResponse.ok) {
    console.log('User data:', userResponse.data.name); // Typed access
    console.log('Status:', userResponse.status); // 200
    console.log('Headers:', userResponse.headers); // Headers object
  } else {
    // Handle errors without try/catch
    console.error('Request failed:', userResponse.status);
    console.error('Error message:', userResponse.error?.message);
    console.error('Error body:', userResponse.error?.body);
  }

  // You can still access all response metadata
  console.log({
    status: userResponse.status,
    statusText: userResponse.statusText,
    url: userResponse.url,
    ok: userResponse.ok,
    headers: userResponse.headers,
    data: userResponse.data,
    error: userResponse.error
  });
}

// POST example
async function createUserExample() {
  const client = new FetchClient();

  interface CreateUserRequest {
    name: string;
    email: string;
  }

  interface User {
    id: number;
    name: string;
    email: string;
  }

  const createResponse = await client.post<User>('/api/users', {
    name: 'John Doe',
    email: 'john@example.com'
  } as CreateUserRequest);

  if (createResponse.ok) {
    console.log('Created user:', createResponse.data.id);
  } else {
    console.error('Failed to create user:', createResponse.error?.message);
  }
}

// Network error handling
async function networkErrorExample() {
  const client = new FetchClient();

  // This would return a response with status: 0 for network errors
  const response = await client.get('https://nonexistent-domain.invalid/api');
  
  if (!response.ok && response.status === 0) {
    console.log('Network error detected');
    console.log('Error details:', response.error?.message); // "Failed to fetch"
  }
}
