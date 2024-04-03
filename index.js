// index.ts
var MAX_CONCURRENT_REQUESTS = 500;
var currentRequests = 0;
var queue = [];
var SET_MAX_CONCURRENT_REQUESTS = (max) => MAX_CONCURRENT_REQUESTS = max;
async function fetchWithConnection(input, init, options) {
  try {
    const res = await fetch(input, init);
    const isOkay = options?.retryCondition ? await options.retryCondition(res) : res.ok;
    if (isOkay)
      return { success: true, res };
    return { success: false, msg: new Error(res.statusText) };
  } catch (err) {
    return { success: false, msg: err };
  }
}
async function myFetch(input, init = {}, options) {
  const maxRetry = options?.maxRetry || 3;
  return new Promise((resolve, reject) => {
    const executeRequest = async (retryCount) => {
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
            executeRequest(retryCount + 1);
            if (options?.retryCb)
              options?.retryCb(error, retryCount + 1, maxRetry);
          } else {
            reject(error);
          }
        }
      } finally {
        currentRequests--;
        if (queue.length > 0 && !retrying) {
          const nextRequest = queue.shift();
          if (nextRequest)
            nextRequest();
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
export {
  SET_MAX_CONCURRENT_REQUESTS,
  myFetch
};
