# myfetchapi

A simple fetch wrapper with concurrency control and retry functionality.

## Installation

You can install this package via npm:

```bash
npm install myfetchapi
```

## Usage

```javascript
const { myFetch, SET_MAX_CONCURRENT_REQUESTS } = require("myfetchapi");

// Set maximum concurrent requests. default is 500
SET_MAX_CONCURRENT_REQUESTS(100);

// Make a request
myFetch("https://example.com/api/data")
  .then((response) => console.log(response))
  .catch((error) => console.error(error));
```

## API

### myFetch

The main function to make HTTP requests.

- Parameters:
  - `input`: RequestInfo - The URL or Request object.
  - `init` (optional): RequestInit - The request options.
  - `options` (optional): myFetchOptions - Additional options.
- Returns: Promise<Response>

### SET_MAX_CONCURRENT_REQUESTS

Function to set the maximum number of concurrent requests.

- Parameters:
  - `max`: number - The maximum number of concurrent requests.

## License

This project is licensed under the ISC License
