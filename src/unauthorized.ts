import { ResponseMiddleware, FetchClient } from './client';

export interface UnauthorizedConfig {
  loginPath: string;
}

function unauthorizedRedirectMiddleware(
  config: UnauthorizedConfig,
): ResponseMiddleware {
  return async (res) => {
    if (res.status === 401) {
      const returnTo = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `${config.loginPath}?returnTo=${returnTo}`;
    }
    return res;
  };
}

export function useUnauthorized(
  client: FetchClient,
  config: UnauthorizedConfig,
) {
  client.useResponseMiddleware(unauthorizedRedirectMiddleware(config));
}
