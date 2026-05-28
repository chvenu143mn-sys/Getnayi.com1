import fetch from 'node-fetch';
fetch('https://ais-dev-awmdlwr42fzvlieuzkqiej-355917741798.asia-southeast1.run.app/s/v0jn3e', { redirect: 'manual' }).then(res => {
  console.log("Status:", res.status);
  console.log("Headers:", res.headers);
});
