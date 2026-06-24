const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

// 1. Add imports for prom-client, pino, crypto and randomUUID
if (!server.includes('prom-client')) {
    server = server.replace(
        'import express from "express";',
        `import express from "express";
import client from "prom-client";
import pino from "pino";
import pinoHttp from "pino-http";
import crypto from "crypto";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
client.collectDefaultMetrics({ prefix: 'aisles_' });`
    );
}

// 2. Add X-Request-Id middleware and prom-client metrics, pino logger
if (!server.includes('app.use(pinoHttp')) {
    server = server.replace(
        'const app = express();',
        `const app = express();

app.use((req, res, next) => {
  (req as any).requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', (req as any).requestId);
  next();
});

// Configure Pino HTTP Logger (structured logging)
app.use(pinoHttp({
  logger,
  genReqId: function (req, res) { return (req as any).requestId; }
}));

app.get('/api/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});`
    );
}

// 3. Update Health Check
server = server.replace(
    /app\.get\("\/api\/health".*?\}\);/s,
    `app.get("/api/health", async (req, res) => {
  try {
    let dbOk = false;
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('profiles').select('id').limit(1);
      dbOk = !error;
    }
    let redisStatus = "unreachable";
    try {
      if (redis) {
        await redis.set('health_check', 'ok', { ex: 5 });
        redisStatus = "ok";
      }
    } catch(e) {}
    
    if (!dbOk || redisStatus !== "ok") {
        return res.status(200).json({ status: "degraded", db: dbOk, redis: redisStatus, timestamp: new Date().toISOString() });
    }
    res.json({ status: "ok", db: dbOk, redis: redisStatus, timestamp: new Date().toISOString() });
  } catch (err: any) {
    logger.error({ err, msg: "Health check totally failed" });
    res.status(500).json({ status: "down", error: "Internal Server Error" });
  }
});`
);

// 4. Implement global error boundary in server.ts
if (!server.includes('app.use((err: any, req: express.Request')) {
    server = server.replace(
        '  if (process.env.NODE_ENV !== "production") {',
        `  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({ err, reqId: (req as any).requestId, msg: "Unhandled Exception" });
    res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
  });

  if (process.env.NODE_ENV !== "production") {`
    );
}

// 5. Try to fix generic error leakage across server.ts
server = server.replace(
    /return res\.status\(500\)\.json\(\{ error: (err|e)\.message \}\);/g,
    `{
        logger.error({ err: $1, reqId: (req as any).requestId, msg: "API Error" });
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }`
);
server = server.replace(
    /res\.status\(500\)\.json\(\{ error: (err|e)\.message \}\);/g,
    `{
        logger.error({ err: $1, reqId: (req as any).requestId, msg: "API Error" });
        res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }`
);

// 6. Cache Invalidation on delete
server = server.replace(
    /app\.delete\("\/api\/admin\/videos\/:id".*?await supabaseAdmin\s*\.from\("videos"\)\s*\.delete\(\)\s*\.eq\("id", videoId\);/s,
    `$&
      try {
        await redis.del("exploreVideos");
        await redis.del("trendingTags");
        await redis.del("storeVideos");
        logger.info({ msg: "Admin deleted video, cleared caches", videoId: req.params.id })
      } catch(cacheErr) {}`
);

// Change unstructured console.logs to structured where easy
server = server.replace(/console\.error\(/g, "logger.error(");
server = server.replace(/console\.warn\(/g, "logger.warn(");
server = server.replace(/console\.log\(/g, "logger.info(");

fs.writeFileSync('server.ts', server);
console.log("Refactoring applied");
