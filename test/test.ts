import { myFetch } from "myfetch";

for (let i = 0; i < 8; i++) {
  myFetch(
    `http://ffapi.pages.dev/favicon.png`,
    {},
    {
      retryCb(err, count, max) {
        console.log(`>>>> retrying ${count}/${max}, ${err}`);
      },
      // retryCondition(res) {
      //   console.log(res.statusText);
      //   return res.ok;
      // },
    }
  )
    .then((r) => r.text())
    .then((r) => console.log(r.substring(0, 10)))
    .catch((e) => console.log(e));
}
