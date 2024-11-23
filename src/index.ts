import type * as nodefetch from "node-fetch";
import * as nfetch from "./nodeFetch";

export type MyFetchResponse = Response | nodefetch.Response;
export type MyFetchRequestInfo = RequestInfo | nodefetch.RequestInfo;
export type MyFetchRequestInit = (RequestInit | nodefetch.RequestInit) & {
  /**
   * request timeout in milliseconds
   */
  timeout?: number;
  /**
   * set this to `false` if you don't want to throw an error when http status is not ok. default: `true`
   */
  throwHttpError?: boolean;
  /**
   * set this to `true` in order to use nodejs features, e.g agents
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
};

let MAX_CONCURRENT_REQUESTS = 500;
let currentRequests = 0;
const queue: (() => void)[] = [];

/**
 * set maximum number of concurrent requests (requests made at thesame time)
 * @param max @default 500
 */
export const SET_MAX_CONCURRENT_REQUESTS = (max: number) => {
  MAX_CONCURRENT_REQUESTS = Math.max(1, max);
};

async function fetchWithConnection(
  input: MyFetchRequestInfo,
  init?: MyFetchRequestInit
): Promise<{
  success: boolean;
  response?: MyFetchResponse;
  error?: any;
}> {
  let timeoutId: any;

  try {
    // set timout
    if (init?.timeout && typeof init.timeout === "number") {
      const controller = new AbortController();
      Object.assign(init, { signal: controller.signal });
      timeoutId = setTimeout(() => controller.abort(), init.timeout);
    }

    // make request
    const httpFunc = init?.useNodeFetch ? nfetch.fetch : fetch;
    const response = await httpFunc(input as any, init as any);

    // check response
    const throwHttpError = init?.throwHttpError !== false;
    if (throwHttpError && !response.ok) {
      const error = new Error(`statusCode: ${response.status}`);
      (error as any).response = response;
      throw error;
    }

    const retryCondition = init?.retryCondition;
    if (retryCondition && typeof retryCondition === "function") {
      const isOK = await retryCondition(response);
      if (!isOK) {
        const error = new Error(
          `failed 'isOkay' condition. statusCode: ${response.status}`
        );
        (error as any).response = response;
        throw error;
      }
    }

    // return response
    return { success: true, response };
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);

    return { success: false, error };
  }
}

export async function myFetch(
  input: MyFetchRequestInfo,
  init?: MyFetchRequestInit
) {
  const maxRetries =
    init?.maxRetries === undefined
      ? 3
      : init.maxRetries === null
      ? 0
      : init.maxRetries < 0
      ? 0
      : init.maxRetries;

  return new Promise<MyFetchResponse>((resolve, reject) => {
    const executeRequest = async (retryCount: number) => {
      currentRequests++;
      let retrying = false;
      try {
        const { success, response, error } = await fetchWithConnection(
          input,
          init
        );
        if (success && response) {
          resolve(response);
        } else {
          const err = error || new Error("Unknown error");

          if (retryCount < maxRetries) {
            retrying = true;

            if (init?.retryCb)
              await init?.retryCb(err, retryCount + 1, maxRetries);

            executeRequest(retryCount + 1);
          } else {
            reject(err);
          }
        }
      } finally {
        currentRequests--;
        if (queue.length > 0 && !retrying) {
          const nextRequest = queue.shift();
          if (nextRequest) nextRequest();
        }
      }
    };

    if (currentRequests < MAX_CONCURRENT_REQUESTS) {
      executeRequest(0);
    } else {
      queue.push(() => executeRequest(0));
    }
  });
}
