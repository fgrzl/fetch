import { FetchClient } from "./client";
import { useCSRF } from "./csrf";
import { useUnauthorized } from "./unauthorized";

const defaultClient = new FetchClient({
  credentials: 'same-origin',
});

useCSRF(defaultClient, {
  cookieName: "csrf_token",
  headerName: "X-CSRF-Token",
});

useUnauthorized(defaultClient, {
  loginPath: "/login",
});

export default defaultClient;