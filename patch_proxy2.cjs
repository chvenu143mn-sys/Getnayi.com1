const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ Proxy image to avoid CORS[\s\S]*?app\.get\('\/api\/proxy-image'[\s\S]*?res\.status\(500\)\.send\('Proxy error'\);\s*\}\s*\}\);/g;

code = code.replace(regex, `// Proxy image to avoid CORS
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) return res.status(400).send('URL required');

      const { buffer, contentType } = await safeFetch(targetUrl);
      res.set('Content-Type', contentType);
      return res.send(buffer);
    } catch(err) {
      return res.status(500).send('Proxy error');
    }
  });`);

fs.writeFileSync('server.ts', code);
console.log("Replaced using regex.");
