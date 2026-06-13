const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/user/grant-and-approve',
  method: 'POST',
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
});

req.on('error', e => console.error(e));
req.end();
