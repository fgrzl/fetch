/**
 * @fileoverview Example demonstrating the smart defaults for authorization middleware.
 */

import { FetchClient, useAuthorization } from '../src/index';

// Example 1: Ultimate smart default - no options needed!
const client = new FetchClient();
const authClient1 = useAuthorization(client);

// When a 401 occurs while on https://app.example.com/dashboard, 
// it will redirect to: /login?return_url=https%3A%2F%2Fapp.example.com%2Fdashboard

// Example 2: Custom redirect path and return URL parameter
const authClient2 = useAuthorization(client, {
  redirectConfig: {
    redirectPath: '/signin',
    returnUrlParam: 'redirect_to'
  }
});

// When a 401 occurs, it will redirect to: /signin?redirect_to=current-page-url

// Example 3: No return URL
const authClient3 = useAuthorization(client, {
  redirectConfig: {
    redirectPath: '/login',
    includeReturnUrl: false
  }
});

// When a 401 occurs, it will redirect to: /login (no return URL)

// Example 4: Custom redirect with existing query parameters
const authClient4 = useAuthorization(client, {
  redirectConfig: {
    redirectPath: '/login?theme=dark&lang=en'
  }
});

// When a 401 occurs, it will redirect to: /login?theme=dark&lang=en&return_url=current-page-url

// Example 5: Manual handler (original behavior still works)
const authClient5 = useAuthorization(client, {
  onUnauthorized: () => {
    // Clear auth data
    localStorage.removeItem('auth-token');
    localStorage.removeItem('refresh-token');
    
    // Custom redirect logic
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `/login?from=${returnUrl}`;
  }
});

export {
  authClient1,
  authClient2,
  authClient3,
  authClient4,
  authClient5,
};
