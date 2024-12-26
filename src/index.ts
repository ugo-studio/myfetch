import type * as nodefetch from "node-fetch";

import * as nfetch from "./nodeFetch";

export type MyFetchResponse = Response | nodefetch.Response;
export type MyFetchRequestInfo = string | URL;
export type MyFetchRequestInit = (RequestInit & nodefetch.RequestInit) & {
  /**
   * request timeout in milliseconds
   */
  timeout?: number;
  /**
   * set this to `false` if you don't want to throw an error when http status is not ok. default: `true`
   */
  throwHttpError?: boolean;
  /**
   * This option is choosen automatically according to the environment it is running on. Set this to `true` in order to use nodejs features, e.g agents.
   */
  useNodeFetch?: boolean;
  /**
   * How many times a request will retry if it failed
   */
  maxRetries?: number | null;
  /**
   * callback is called when the http(s) request is retrying
   * @param err Error object
   * @param count current retries count
   * @param max maxRetries
   * @returns any
   */
  retryCb?: (err: any, count: number, max: number) => any;
  /**
   * Normally the request is retried if the http(s) status isn't ok.
   * Use this function to override and set your own condition.
   * @param response http(s) Response object
   * @returns boolean
   */
  retryCondition?: (response: MyFetchResponse) => boolean | Promise<boolean>;
  /**
   * Only remove the request from the concurrent request queue after the response body has been fully consumed.
   * This is useful when you need to ensure that the connection is kept alive until the body is read.
   * Default: false
   */
  waitForBodyUsed?: boolean;
};

let MAX_CONCURRENT_REQUESTS = 20;
const semaphore = {
  count: 0,
  queue: [] as (() => void)[],
  acquire: async () => {
    if (semaphore.count < MAX_CONCURRENT_REQUESTS) {
      semaphore.count++;
      return;
    }
    return new Promise<void>((resolve) =>
      semaphore.queue.push(() => {
        semaphore.count++;
        resolve();
      })
    );
  },
  release: () => {
    semaphore.count--;
    if (semaphore.queue.length > 0) {
      const next = semaphore.queue.shift();
      if (next) next();
    }
  },
};

const isNodeEnv =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

async function request(
  input: MyFetchRequestInfo,
  init?: MyFetchRequestInit
): Promise<MyFetchResponse> {
  const controller = new AbortController();
  const timeoutId = init?.timeout
    ? setTimeout(() => controller.abort(), init.timeout)
    : null;
  try {
    const httpFunc =
      init?.useNodeFetch === undefined
        ? isNodeEnv
          ? nfetch.fetch
          : fetch
        : init?.useNodeFetch
        ? nfetch.fetch
        : fetch;
    const response = await httpFunc(input.toString(), {
      ...init,
      signal: controller.signal,
    });

    if (init?.throwHttpError !== false && !response.ok) {
      const error = new Error(`HTTP error ${response.status}`);
      (error as any).response = response; // Attach response to error
      throw error;
    }

    if (init?.retryCondition) {
      if (!(await init.retryCondition(response))) {
        const error = new Error(`Retry condition failed: ${response.status}`);
        (error as any).response = response;
        throw error;
      }
    }

    return response as any;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    throw error; // Re-throw the original error
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function waitForBodyConsumption(
  response: MyFetchResponse
): Promise<void> {
  if (!response.body) {
    // No body, resolve immediately
    return;
  }

  // Wait until `bodyUsed` becomes true
  while (!response.bodyUsed) {
    await new Promise((resolve) => setTimeout(resolve, 10)); // Polling interval
  }
}

async function myFetch(
  input: MyFetchRequestInfo,
  init?: MyFetchRequestInit
): Promise<MyFetchResponse> {
  const maxRetries = Math.max(0, init?.maxRetries ?? 1);

  await semaphore.acquire(); // wait for chance

  for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
    try {
      const response = await request(input, init);

      // Wait for bodyConsumption if the option is enabled
      if (init?.waitForBodyUsed) {
        waitForBodyConsumption(response)
          .then(() => semaphore.release())
          .catch(() => semaphore.release());
      } else semaphore.release();

      return response;
    } catch (error) {
      if (retryCount < maxRetries) {
        if (init?.retryCb) {
          await init.retryCb(error, retryCount + 1, maxRetries);
        }
        continue; // Retry
      }

      semaphore.release(); // make chance for other requests

      throw error; // Re-throw after all retries failed
    }
  }
  throw new Error("unreachable");
}

/**
 * set maximum number of concurrent requests (requests made at thesame time)
 * @param max @default 500
 */
const SET_MAX_CONCURRENT_REQUESTS = (max: number) => {
  MAX_CONCURRENT_REQUESTS = Math.max(1, max);
};

export { myFetch, SET_MAX_CONCURRENT_REQUESTS };
