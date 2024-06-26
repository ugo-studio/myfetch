interface ConnectionResult {
  success: boolean;
  res?: Response;
  msg?: any;
}

let MAX_CONCURRENT_REQUESTS = 500;
let currentRequests = 0;
const queue: (() => void)[] = [];

export const SET_MAX_CONCURRENT_REQUESTS = (max: number) => {
  MAX_CONCURRENT_REQUESTS = max;
};

async function fetchWithConnection(
  input: RequestInfo,
  init: RequestInit,
  options?: myFetchOptions
): Promise<ConnectionResult> {
  try {
    const res = await fetch(input as any, init as any);
    const isOkay = options?.retryCondition
      ? await options.retryCondition(res)
      : res.ok;
    if (isOkay) return { success: true, res: res as any };
    return {
      success: false,
      msg: new Error(
        `statusCode: ${res.status}, response: "${await getText(res)}"`
      ),
    };
  } catch (err) {
    return { success: false, msg: err };
  }
}

async function getText(res: Response) {
  try {
    return (await res.text()).substring(0, 250);
  } catch (_) {
    return "";
  }
}

export type myFetchOptions = {
  maxRetry?: number | null;
  retryCb?: (err: any, count: number, max: number) => any;
  retryCondition?: (res: Response) => boolean | Promise<boolean>;
};

export async function myFetch(
  input: RequestInfo,
  init: RequestInit = {},
  options?: myFetchOptions
) {
  const maxRetry =
    options?.maxRetry === undefined
      ? 3
      : options.maxRetry === null
      ? 0
      : options.maxRetry < 0
      ? 0
      : options.maxRetry;
  return new Promise<Response>((resolve, reject) => {
    const executeRequest = async (retryCount: number) => {
      currentRequests++;
      let retrying = false;
      try {
        const { success, res, msg } = await fetchWithConnection(
          input,
          init,
          options
        );
        if (success && res) {
          resolve(res);
        } else {
          const error = msg || new Error("Unknown error");
          if (retryCount < maxRetry) {
            retrying = true;
            if (options?.retryCb)
              await options?.retryCb(error, retryCount + 1, maxRetry);
            executeRequest(retryCount + 1);
          } else {
            reject(error);
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
