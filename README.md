# myfetchapi

A simple fetch wrapper with concurrency control and retry functionality.

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

// Set maximum concurrent requests. default is 500
SET_MAX_CONCURRENT_REQUESTS(100);

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
    - `useNodeFetch` (optional): boolean - Set to true to use Node.js [Options](https://www.npmjs.com/package/node-fetch#fetch-options), e.g., agents.
    - `maxRetries` (optional): number - How many times a request will retry if it failed. Default is 3.
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
