const http = require('http');

http.get('http://127.0.0.1:3000/api/feed', (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', (d) => process.stdout.write(d));
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
