import { describe, expect, it } from 'vite-plus/test';
import type {
  FetchFailureResponse,
  FetchResponse,
  FetchResponseError,
  FetchSuccessResponse,
} from '../../src/client/types';

interface User {
  id: number;
  name: string;
}

interface ApiErrorBody {
  code: string;
  message: string;
}

function expectType<T>(_value: T): void {
  // Compile-time helper.
}

function assertFetchResponseNarrowing(
  response: FetchResponse<User, ApiErrorBody>,
): void {
  if (response.ok) {
    expectType<FetchSuccessResponse<User>>(response);
    expectType<User>(response.data);
    expectType<null>(response.error);

    // @ts-expect-error success data is the typed payload, not null
    expectType<null>(response.data);
  } else {
    expectType<FetchFailureResponse<ApiErrorBody>>(response);
    expectType<null>(response.data);
    expectType<FetchResponseError<ApiErrorBody>>(response.error);
    expectType<ApiErrorBody | undefined>(response.error.body);

    // @ts-expect-error failed responses always include structured error details
    expectType<null>(response.error);
  }
}

describe('FetchResponse type contract', () => {
  it('narrows data and error from ok', () => {
    expect(typeof assertFetchResponseNarrowing).toBe('function');
  });
});
