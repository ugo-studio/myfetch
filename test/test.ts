import { myFetch, SET_MAX_CONCURRENT_REQUESTS } from "../src/index";

SET_MAX_CONCURRENT_REQUESTS(10);

for (let i = 0; i < 10; i++) {
  console.log("started", i);
  myFetch(`https://example.com`, {
    timeout: 10000,
    waitForBodyUsed: true,
    useNodeFetch: true,
    maxRetries: 2,
    retryCb(err, count, max) {
      console.log(`>>>> retrying ${count}/${max}, ${err}`, i);
    },
  })
    .then((res) => res.blob())
    .then((data) => console.log(data, i))
    .catch((err) => console.log(err.message, i));
}
