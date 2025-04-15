export type RequestMiddleware = (
  req: RequestInit,
  url: string,
) => Promise<[RequestInit, string]>;
export type ResponseMiddleware = (res: Response) => Promise<Response>;

export interface FetchClientConfig {
  credentials?: RequestCredentials; // 'omit' | 'same-origin' | 'include'
}

export class FetchClient {
  private requestMiddlewares: RequestMiddleware[] = [];
  private responseMiddlewares: ResponseMiddleware[] = [];
  private credentials: RequestCredentials;

  constructor(config: FetchClientConfig = {}) {
    this.credentials = config.credentials ?? 'same-origin';
  }

  public useRequestMiddleware(middleware: RequestMiddleware) {
    this.requestMiddlewares.push(middleware);
  }

  public useResponseMiddleware(middleware: ResponseMiddleware) {
    this.responseMiddlewares.push(middleware);
  }

  public async request<T = any>(
    url: string,
    init: RequestInit = {},
  ): Promise<T> {
    for (const mw of this.requestMiddlewares) {
      [init, url] = await mw(init, url);
    }

    let res = await fetch(url, {
      credentials: this.credentials,
      ...init,
    });

    for (const mw of this.responseMiddlewares) {
      res = await mw(res);
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw error;
    }

    return res.json();
  }

  public get<T>(url: string) {
    return this.request<T>(url, { method: 'GET' });
  }

  public post<T>(url: string, body: any) {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  public put<T>(url: string, body: any) {
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  public del<T>(url: string) {
    return this.request<T>(url, { method: 'DELETE' });
  }
}
