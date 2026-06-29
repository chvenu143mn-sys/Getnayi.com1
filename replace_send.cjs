const fs = require('fs');

let serverTs = fs.readFileSync('server.ts', 'utf8');

const replacements = [
  ['.send("OK")', '.json({ status: "OK" })'],
  ['.send("Webhook Error")', '.json({ error: "Webhook Error" })'],
  ['.send("URL required")', '.json({ error: "URL required" })'],
  ['.send("Invalid protocol")', '.json({ error: "Invalid protocol" })'],
  ['.send("Private network access forbidden")', '.json({ error: "Private network access forbidden" })'],
  ['.send("Proxy error")', '.json({ error: "Proxy error" })'],
  ['.send("Invalid video parameters")', '.json({ error: "Invalid video parameters" })'],
  ['.send("No streaming response body available")', '.json({ error: "No streaming response body available" })'],
  ['.send(error.message)', '.json({ error: error.message })'],
  ['.send("No webhook secret")', '.json({ error: "No webhook secret" })'],
  ['.send("No signature")', '.json({ error: "No signature" })'],
  ['.send("Invalid signature")', '.json({ error: "Invalid signature" })'],
  ['.send("Database not configured")', '.json({ error: "Database not configured" })']
];

for (const [oldStr, newStr] of replacements) {
  serverTs = serverTs.split(oldStr).join(newStr);
}

fs.writeFileSync('server.ts', serverTs);
console.log("Done");
