import { SET_MAX_CONCURRENT_REQUESTS, myFetch } from "../src/index";
import https from "node:https";
// import { SET_MAX_CONCURRENT_REQUESTS, myFetch } from "myfetchapi";

SET_MAX_CONCURRENT_REQUESTS(5);

for (let i = 0; i < 3; i++) {
  console.log("started", i);
  myFetch(`https://ffapi.pages.dev/favicon.pngg`, {
    agent(parsedUrl) {
      console.log(parsedUrl.href);
      return new https.Agent({
        keepAlive: true,
      });
    },

    timeout: 10000,
    useNodeFetch: true,
    // maxRetries: 3,
    retryCb(err, count, max) {
      console.log(`>>>> retrying ${count}/${max}, ${err}`);
    },
    // isOkay(res) {
    // console.log(res.statusText);
    // return res.ok;
    // },
  })
    .then((r) => {
      return r.text();
    })
    .then((r) => console.log(i, r.substring(0, 10)))
    .catch((e) => console.log(e));
}
