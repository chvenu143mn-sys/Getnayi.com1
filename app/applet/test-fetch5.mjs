import fetch from 'node-fetch';
fetch('http://127.0.0.1:3000/s/v0jn3e').then(res => res.text()).then(t => console.log(t.substring(0, 200)));
