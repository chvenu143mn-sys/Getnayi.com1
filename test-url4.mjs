fetch("http://127.0.0.1:3000/video/8b2efc0a-da1c-4638-b68d-30152f61c97d", { redirect: 'manual' })
  .then(async r => console.log('STATUS:', r.status, 'BODY:', await r.text().then(t => t.substring(0, 150))))
  .catch(e => console.error(e));
