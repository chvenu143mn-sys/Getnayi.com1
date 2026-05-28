import fetch from 'node-fetch';

async function run() {
  try {
    const fd = new FormData();
    fd.append('video', new Blob(['fake video data']), 'video.mp4');

    const res = await fetch('http://localhost:3000/api/bunny/upload', {
      method: 'POST',
      body: fd
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${text.substring(0, 100)}`);
  } catch (e) {
    console.error(e);
  }
}
run();
