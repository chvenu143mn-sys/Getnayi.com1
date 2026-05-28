import fetch from 'node-fetch';
fetch('http://127.0.0.1:3000/video/8b2efc0a-da1c-4638-b68d-30152f61c97d').then(res => {
  console.log("Status:", res.status);
  console.log("Headers:", res.headers);
});
