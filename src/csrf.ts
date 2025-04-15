import { FetchClient, RequestMiddleware } from "./client";

interface CsrfConfig {
  cookieName: string;
  headerName: string;
}

function csrfMiddleware(config: CsrfConfig): RequestMiddleware {
  return async (req, url) => {
    const cookie = document.cookie.match(
      new RegExp(`${config.cookieName}=([^;]+)`),
    );
    const token = cookie?.[1];
    const headers = {
      ...req.headers,
      "Content-Type": "application/json",
      ...(token && { [config.headerName]: token }),
    };
    return [{ ...req, headers }, url];
  };
}

export function useCSRF(client: FetchClient, config: CsrfConfig) {
  client.useRequestMiddleware(csrfMiddleware(config));
  client.useResponseMiddleware(async (res) => {
    const csrfToken = res.headers.get(config.headerName);
    if (csrfToken) {
      document.cookie = `${config.cookieName}=${csrfToken}; path=/;`;
    }
    return res;
  });
}
