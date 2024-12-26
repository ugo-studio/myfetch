# myfetchapi

A simple fetch wrapper with concurrency control and retry functionality that works on both nodejs, browser and edge environments.

## Installation

You can install this package via npm:

```bash
npm install myfetchapi
yarn add myfetchapi
bun add myfetchapi
```

## Usage

```javascript
const { myFetch, SET_MAX_CONCURRENT_REQUESTS } = require("myfetchapi");

// Set maximum concurrent requests. default is 20
SET_MAX_CONCURRENT_REQUESTS(20);

// Make a request
myFetch(
  "https://example.com/api/data",
  {
    method: "GET"
    maxRetries: 5 /* default is 3. To disable retries, set it to `null` or `0` */,
  }
)
  .then((response) => console.log(response))
  .catch((error) => console.error(error));
```

## API

### myFetch

The main function to make HTTP requests.

- Parameters:
  - `input`: RequestInfo - The URL or Request object.
  - `init` (optional): RequestInit - The request [Options](https://www.npmjs.com/package/node-fetch#fetch-options) for the HTTP(S) request
    - Additional options to `init`.
      - `timeout` (optional): number - Request timeout in milliseconds.
      - `throwHttpError` (optional): boolean - Set this to `false` if you don't want to throw an error when http status is not ok. Default: `true`.
      - `waitForBodyUsed` (optional): boolean - Only remove the request from the concurrent request queue after the response body has been fully consumed. This is useful when you need to ensure that the connection is kept alive until the body is read. Default: `false`.
      - `useNodeFetch` (optional): boolean - This option is choosen automatically according to the environment it is running on. Set to `true` to use Node.js [Options](https://www.npmjs.com/package/node-fetch#fetch-options), e.g agents, and if `false` it uses the environment's default `fetch` implementation.
      - `maxRetries` (optional): number - How many times a request will retry if it failed. Default is 1.
      - `retryCb` (optional): function - Callback function that is called when the HTTP(S) request is retrying.
        - Parameters:
          - `err`: Error object.
          - `count`: Retry count.
          - `max`: Max retry count.
      - `retryCondition` (optional): function - Function to override and set your own condition for retrying.
        - Parameters:
          - `response`: HTTP(S) Response object.
        - Returns: boolean | Promise<boolean>
- Returns: Promise<Response>

### SET_MAX_CONCURRENT_REQUESTS

Function to set the maximum number of concurrent requests.

- Parameters:
  - `max`: number - The maximum number of concurrent requests.

## License

This project is licensed under the MIT License
