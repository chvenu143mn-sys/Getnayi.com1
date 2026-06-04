import fetch from "node-fetch";

async function test() {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/link-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://a.co/d/xxxx' })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (err) {
    console.error(err);
  }
}
test();
