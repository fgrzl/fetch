import { FetchClient } from './client';
import { useCSRF } from './csrf';
import { useUnauthorized } from './unauthorized';

const api = new FetchClient({
  credentials: 'same-origin',
});

useCSRF(api, {
  cookieName: 'csrf_token',
  headerName: 'X-CSRF-Token',
});

useUnauthorized(api, {
  loginPath: '/login',
});

export default api;
