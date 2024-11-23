import type * as nodefetch from "node-fetch";
import * as nfetch from "./nodeFetch";
import { error } from "console";

export type MyFetchResponse = Response | nodefetch.Response;
export type MyFetchRequestInfo = RequestInfo | nodefetch.RequestInfo;
export type MyFetchRequestInit = RequestInit | nodefetch.RequestInit;
export type MyFetchOptions = {
  /**
   * set this to `true` in order to use nodejs features, e.g agents
   */
  useNodeFetch?: boolean;
  /**
   * How many times a request will retry if it failed
   */
  maxRetry?: number | null;
  /**
   * callback is called when the http(s) request is retrying
   * @param err Error object
   * @param count retry count
   * @param max maxRetry
   * @returns any
   */
  retryCb?: (err: any, count: number, max: number) => any;
  /**
   * Normally the request is retried if the http(s) status isn't ok.
   * Use this function to override and set your own condition.
   * @param res http(s) Response object
   * @returns boolean
   */
  retryCondition?: (res: MyFetchResponse) => boolean | Promise<boolean>;
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
  init?: MyFetchRequestInit,
  options?: MyFetchOptions
): Promise<{
  success: boolean;
  response?: MyFetchResponse;
  error?: any;
}> {
  try {
    // check if contains aborted signal
    const aborted = init?.signal?.aborted;
    if (aborted)
      return { success: false, error: new Error("The operation was aborted.") };
    // make request
    const httpFunc = options?.useNodeFetch ? nfetch.fetch : fetch;
    const response = await httpFunc(input as any, init as any);
    // check response
    const isOkay = options?.retryCondition
      ? await options.retryCondition(response)
      : response.ok;
    // return result
    if (isOkay) return { success: true, response };

    const error = new Error(`statusCode: ${response.status}`);
    (error as any).response = response;
    return {
      success: false,
      error,
    };
  } catch (error: any) {
    return { success: false, error };
  }
}

export async function myFetch(
  input: MyFetchRequestInfo,
  init?: MyFetchRequestInit,
  options?: MyFetchOptions
) {
  const maxRetry =
    options?.maxRetry === undefined
      ? 3
      : options.maxRetry === null
      ? 0
      : options.maxRetry < 0
      ? 0
      : options.maxRetry;
  return new Promise<MyFetchResponse>((resolve, reject) => {
    const executeRequest = async (retryCount: number) => {
      currentRequests++;
      let retrying = false;
      try {
        const { success, response, error } = await fetchWithConnection(
          input,
          init,
          options
        );
        if (success && response) {
          resolve(response);
        } else {
          const err = error || new Error("Unknown error");

          if (retryCount < maxRetry) {
            retrying = true;

            if (options?.retryCb)
              await options?.retryCb(err, retryCount + 1, maxRetry);

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
