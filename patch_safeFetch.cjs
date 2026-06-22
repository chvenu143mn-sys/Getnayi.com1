const fs = require('fs');

const code = fs.readFileSync('server.ts', 'utf8');

// Insert safeFetch before proxy-image route
const safeFetchFunc = `
// A secure fetch wrapper that follows redirects but strictly verifies SSRF on each hop
function safeFetch(targetUrl: string, maxRedirects = 5): Promise<{ buffer: Buffer, contentType: string }> {
  return new Promise(async (resolve, reject) => {
    let currentUrl = targetUrl;
    let redirects = 0;

    async function step() {
      if (redirects > maxRedirects) {
        return reject(new Error('Too many redirects'));
      }

      const safeInfo = await isSafeUrl(currentUrl);
      if (!safeInfo.isSafe || !safeInfo.ip) {
        return reject(new Error('Private network access forbidden'));
      }

      const parsed = new URL(currentUrl);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.request(currentUrl, {
        lookup: (hostname, options, callback) => {
          // Prevent DNS Rebinding by reusing the IP resolved during isSafeUrl
          callback(null, [{ address: safeInfo.ip, family: 4 }]);
        },
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        timeout: 10000,
      }, (res) => {
        const statusCode = res.statusCode || 200;

        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          try {
            const nextUrl = new URL(res.headers.location, currentUrl).toString();
            currentUrl = nextUrl;
            redirects++;
            res.resume(); // consume body
            return step();
          } catch (e) {
            return reject(new Error('Invalid redirect URL'));
          }
        }

        if (statusCode >= 400) {
          res.resume();
          return reject(new Error(\`HTTP error \${statusCode}\`));
        }

        const chunks: Buffer[] = [];
        let length = 0;
        const maxBuffer = 10 * 1024 * 1024; // 10MB max

        res.on('data', (chunk) => {
          chunks.push(chunk);
          length += chunk.length;
          if (length > maxBuffer) {
             res.destroy();
             reject(new Error('Response too large'));
          }
        });

        res.on('end', () => {
          resolve({
             buffer: Buffer.concat(chunks),
             contentType: res.headers['content-type'] || 'application/octet-stream'
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    }

    step();
  });
}
`;

const proxyImageIndex = code.indexOf("app.get('/api/proxy-image'");
const modifiedCode = code.slice(0, proxyImageIndex) + safeFetchFunc + "\n  " + code.slice(proxyImageIndex);
fs.writeFileSync('server.ts', modifiedCode);
console.log("safeFetch added successfully.");
