/**
 * @fileoverview Documentation examples verification
 * This file ensures all examples in our docs actually compile and work
 */

import { FetchClient, useAuthorization } from '../src/index';

// Example from README.md - Level 2
const client = new FetchClient({
  credentials: 'same-origin',
});

// Smart defaults from docs - no options needed!
const authClient1 = useAuthorization(client);

// Custom redirect path from docs
const authClient2 = useAuthorization(client, {
  redirectConfig: {
    redirectPath: '/signin', // Default: "/login"
    returnUrlParam: 'redirect_to', // Default: "return_url"
  },
});

// Disable return URL from docs
const authClient3 = useAuthorization(client, {
  redirectConfig: {
    redirectPath: '/login',
    includeReturnUrl: false, // Default: true
  },
});

// Works with existing query parameters from docs
const authClient4 = useAuthorization(client, {
  redirectConfig: {
    redirectPath: '/login?theme=dark&lang=en',
    // Results in: /login?theme=dark&lang=en&return_url=current-page
  },
});

// Manual handler from docs
const authClient5 = useAuthorization(client, {
  onUnauthorized: (response, request) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth-token');
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
});

// Handle both 401 and 403 responses from docs - uses smart defaults
const authClient6 = useAuthorization(client, {
  onForbidden: (response) => {
    console.log('Access denied');
  },
  statusCodes: [401, 403], // Default: [401]
});

// Skip authorization for certain endpoints from docs - uses smart defaults
const authClient7 = useAuthorization(client, {
  skipPatterns: ['/login', '/register', /^\/public\//],
});

// Export for module resolution
export {
  authClient1,
  authClient2,
  authClient3,
  authClient4,
  authClient5,
  authClient6,
  authClient7,
};
