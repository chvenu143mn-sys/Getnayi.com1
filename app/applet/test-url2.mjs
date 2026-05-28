fetch("http://127.0.0.1:3000/s/v0jn3e", { redirect: 'manual' })
  .then(r => console.log('STATUS:', r.status, 'LOCATION:', r.headers.get('location')))
  .catch(e => console.error(e));
