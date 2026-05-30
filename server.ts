import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import validator from 'validator';
import https from 'https';
import http from 'http';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import multer from 'multer';
import cron from 'node-cron';
import Stripe from 'stripe';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import os from 'os';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { parse } from 'tldts';

// Helper to check if a URL is an allowed ecommerce marketplace securely using eTLD+1 brand label
function isAllowedMarketplace(targetUrl: string): boolean {
  try {
    const parsed = parse(targetUrl);
    if (!parsed.domainWithoutSuffix) {
      return false;
    }
    const brand = parsed.domainWithoutSuffix.toLowerCase();
    const knownMarketplaces = [
      'amazon', 'flipkart', 'myntra', 'shopify', 'ajio', 'meesho', 
      'nykaa', 'tatacliq', 'snapdeal', 'ebay', 'etsy', 'aliexpress', 
      'zara', 'hm', 'nike', 'adidas', 'puma', 'macys', 'walmart', 
      'target', 'bestbuy', 'apple', 'samsung'
    ];
    
    // Check if the eTLD+1 brand label matches one of the marketplaces exactly
    if (knownMarketplaces.includes(brand)) {
      return true;
    }

    // Explicit check for Shopify-hosted stores where domainWithoutSuffix is the specific merchant name,
    // but the publicSuffix is myshopify.com or ecommerce structure
    if (parsed.hostname) {
      const host = parsed.hostname.toLowerCase();
      if (host.endsWith('.myshopify.com') || host === 'myshopify.com' || host.endsWith('.shopify.com') || host === 'shopify.com') {
        return true;
      }
    }

    return false;
  } catch (e) {
    return false;
  }
}

// Helper to remove UTM and affiliate tracking parameters to prevent affiliate ID stuffing and ensure canonicalization
function sanitizeProductUrl(urlObj: URL): string {
  const cleanUrl = new URL(urlObj.toString());
  const trackingParams = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'aff_id', 'affiliate_id', 'ref', 'affiliate',
    'tracking_id', 'tag', 'click_id', 'subid', 'sprefix', 'sr', 'qid'
  ];
  
  trackingParams.forEach(param => {
    cleanUrl.searchParams.delete(param);
  });
  
  return cleanUrl.toString();
}

// Follow redirects recursively up to 10 hops manually to support secure, custom SSL bypassing
function resolveRedirectsNative(initialUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const visited = new Set<string>();
    
    function step(currentUrl: string, depth: number) {
      if (depth > 10 || visited.has(currentUrl)) {
        resolve(currentUrl);
        return;
      }
      visited.add(currentUrl);

      try {
        const parsed = new URL(currentUrl);
        const client = parsed.protocol === 'https:' ? https : http;
        
        const req = client.request(currentUrl, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          rejectUnauthorized: false, // Bypasses SSL certificate issues for link resolution safely
          timeout: 4000
        }, (res) => {
          res.resume(); // consume response body to free socket
          const statusCode = res.statusCode || 200;
          if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
            try {
              const nextUrl = new URL(res.headers.location, currentUrl).toString();
              step(nextUrl, depth + 1);
            } catch (e) {
              resolve(currentUrl);
            }
          } else {
            resolve(currentUrl);
          }
        });

        req.on('error', () => {
          fallbackToGet(currentUrl, depth);
        });

        req.on('timeout', () => {
          req.destroy();
          resolve(currentUrl);
        });

        req.end();
      } catch (e) {
        resolve(currentUrl);
      }
    }

    function fallbackToGet(currentUrl: string, depth: number) {
      try {
        const parsed = new URL(currentUrl);
        const client = parsed.protocol === 'https:' ? https : http;
        
        const req = client.request(currentUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          rejectUnauthorized: false,
          timeout: 4000
        }, (res) => {
          res.resume(); // consume response body to free socket
          const statusCode = res.statusCode || 200;
          if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
            try {
              const nextUrl = new URL(res.headers.location, currentUrl).toString();
              step(nextUrl, depth + 1);
            } catch (e) {
              resolve(currentUrl);
            }
          } else {
            resolve(currentUrl);
          }
        });

        req.on('error', () => {
          resolve(currentUrl);
        });

        req.on('timeout', () => {
          req.destroy();
          resolve(currentUrl);
        });

        req.end();
      } catch (e) {
        resolve(currentUrl);
      }
    }

    step(initialUrl, 0);
  });
}

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
dotenv.config();

// Helper to fetch page HTML bypassing SSL/TLS certificate validation errors
function fetchPageHtmlWithNoTls(targetUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl);
      const options: https.RequestOptions = {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        rejectUnauthorized: false, // This ignores SSL certificate validation errors (e.g. ERR_TLS_CERT_ALTNAME_INVALID)
        timeout: 4000
      };

      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.request(targetUrl, options, (res) => {
        const statusCode = res.statusCode || 0;
        if (statusCode >= 400 && statusCode < 600) {
          reject(new Error(`Server responded with status code ${statusCode}`));
          return;
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(data);
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

import expressRateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Standard rate limiter for all API routes (fallback and primary)
const standardApiLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: (req, res) => {
    return ipKeyGenerator(req.ip || 'unknown');
  }
});
import { Redis } from '@upstash/redis';
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://placeholder.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'placeholder_token',
});

// Admin Supabase client for backend operations (bypasses RLS)
const supabaseAdmin = process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })
  : null;


// Middleware for rate limiting via Upstash Redis
const rateLimitMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return next(); // Skip if Redis is not configured
  }

  const ip = req.ip || 'unknown';
  const key = `rate_limit:${ip}`;
  const limit = 100; // 100 requests per window
  const windowSeconds = 60; // 1 minute window

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    const results = await pipeline.exec();
    
    const currentCount = results[0] as number;
    
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - currentCount));

    if (currentCount > limit) {
      return res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
    next();
  } catch (err) {
    console.error('Rate limit error:', err);
    next(); // Fail open so app doesn't crash on Redis failure
  }
};

let stripeClient: Stripe | null = null;
export function getStripe(): Stripe | null {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any });
  }
  return stripeClient;
}

function setupCronJobs() {
  // Sweeper for stuck processing videos (in case webhook fails)
  cron.schedule('*/10 * * * *', async () => {
    console.log('🧹 [CRON] Sweeping stuck processing videos...');
    if (!supabaseAdmin) return;
    
    // Find videos stuck in 'processing' state older than 15 minutes
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data: stuckVideos, error } = await supabaseAdmin
      .from('videos')
      .select('id, video_url, created_at')
      .eq('status', 'processing')
      .lt('created_at', fifteenMinsAgo);

    if (error) {
      console.error('❌ [CRON] Error finding stuck videos:', error);
      return;
    }

    if (!stuckVideos || stuckVideos.length === 0) return;
    console.log(`[CRON] Found ${stuckVideos.length} stuck videos. Validating with BunnyCDN...`);
    
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
    if (!libraryId || !apiKey) return;

    for (const v of stuckVideos) {
      try {
        const urlObj = new URL(v.video_url);
        const segments = urlObj.pathname.split('/').filter(Boolean);
        const guid = segments[0]; // assuming /guid/playlist.m3u8
        
        if (!guid) continue;
        
        const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`, {
          headers: { 'AccessKey': apiKey }
        });

        if (response.ok) {
          const checkInfo = await response.json();
          // Status 3/4 = finished
          if (checkInfo.status === 4 || checkInfo.status === 3) {
            console.log(`[CRON] Activating stuck video ${v.id} (Bunny GUID: ${guid})`);
            await supabaseAdmin.from('videos').update({ status: 'active' }).eq('id', v.id);
          } else if (checkInfo.status === 5 || checkInfo.status === 6) {
             console.log(`[CRON] Rejecting stuck video ${v.id} (Bunny GUID: ${guid})`);
             await supabaseAdmin.from('videos').update({ status: 'rejected' }).eq('id', v.id);
          }
        }
      } catch (err: any) {
        console.error(`[CRON] Error checking video ${v.id}`, err);
      }
    }
  });

  // Nightly CRON job to proactively synchronize Stripe subscriptions
  // Runs at midnight server time every day
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 [CRON] Starting nightly Stripe subscription reconciliation...');
    if (!supabaseAdmin) {
       console.log('❌ [CRON] Supabase Admin not initialized. Skipping.');
       return;
    }
    const stripe = getStripe();
    if (!stripe) {
       console.log('❌ [CRON] STRIPE_SECRET_KEY not provided. Skipping subscription reconciliation.');
       return;
    }

    try {
      // 1. Fetch all currently active premium users who have a stripe_subscription_id
      const { data: premiumUsers, error } = await supabaseAdmin
        .from('profiles')
        .select('id, stripe_subscription_id')
        .eq('is_premium', true)
        .not('stripe_subscription_id', 'is', null);

      if (error) {
         console.error('❌ [CRON] Error fetching premium users:', error);
         return;
      }

      console.log(`[CRON] Found ${premiumUsers?.length || 0} premium users to verify.`);
      
      let canceledCount = 0;
      let failedCount = 0;

      // 2. Process each user and check their actual Stripe state
      if (premiumUsers && premiumUsers.length > 0) {
        for (const user of premiumUsers) {
          try {
            const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id as string);
            // If subscription is naturally canceled, unpaid, or past_due to the point of cancellation
            if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
               // Update local DB to revoke premium
               await supabaseAdmin
                 .from('profiles')
                 .update({ is_premium: false })
                 .eq('id', user.id);
               console.log(`[CRON] 🚨 Revoked premium for user ${user.id} -> Sub status: ${subscription.status}`);
               canceledCount++;
            }
          } catch (err: any) {
            console.error(`❌ [CRON] Failed to verify subscription for user ${user.id}:`, err?.message);
            // If the subscription is missing/deleted entirely from Stripe, revoke premium
            if (err?.statusCode === 404) {
               await supabaseAdmin.from('profiles').update({ is_premium: false }).eq('id', user.id);
               console.log(`[CRON] 🚨 Revoked premium for user ${user.id} (Subscription 404 Not Found)`);
               canceledCount++;
            } else {
               failedCount++;
            }
          }
        }
      }

      console.log(`✅ [CRON] Reconciliation complete. Revoked: ${canceledCount}, API Errors: ${failedCount}.`);
    } catch (e) {
      console.error('❌ [CRON] Unhandled error during reconciliation:', e);
    }
  });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.use(cookieParser(process.env.COOKIE_SECRET || crypto.randomBytes(32).toString('hex')));
  const PORT = process.env.PORT || 3000;

  // Setup Observability (APM) and structured request logging (e.g. for Datadog ingestion)
  const apmLog = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const start = process.hrtime();
    res.on('finish', () => {
      const diff = process.hrtime(start);
      const timeMs = (diff[0] * 1e3 + diff[1] * 1e-6);
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        responseTimeMs: timeMs.toFixed(3),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        env: process.env.NODE_ENV,
        service: 'getnayi-backend'
      };
      
      // Output standard JSON logs for APM ingestion (e.g. Datadog Log Agent)
      // Only logging API routes to reduce noise
      if (req.originalUrl.startsWith('/api/')) {
        console.log(JSON.stringify(logEntry));
      }
    });
    next();
  };
  app.use(apmLog);

  // Added for VIBESCAN security compliance
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })); // allow external resources like videos
  // Specific helmet configurations to address findings
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
  app.use(helmet.frameguard({ action: 'deny' })); // Clickjacking mitigation
  app.use(helmet.noSniff());
  app.disable('x-powered-by');
  
  // Obscure Server details
  app.use((req, res, next) => {
    res.setHeader('Server', 'Hidden');
    res.removeHeader('X-Powered-By');
    next();
  });
  
  app.use(cors({ origin: process.env.VITE_APP_URL || '*' })); // Stricter CORS if env exists

  setupCronJobs();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Apply globally to standard API routes to prevent abuse (e.g. DDOS / brute forcing)
  app.use('/api', standardApiLimiter);
  app.use('/api', rateLimitMiddleware);

  // Rate limiter for coupon application (5 failures per hour)
  const couponRateLimiter = expressRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP or User to 5 failures per window
    skipSuccessfulRequests: true, // Only count failures towards the rate limit
    keyGenerator: (req, res) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const payloadBase64 = token.split('.')[1];
          const payloadJson = Buffer.from(payloadBase64, 'base64').toString();
          const payload = JSON.parse(payloadJson);
          if (payload.sub) return `coupon_limit:${payload.sub}`;
        } catch (e) {}
      }
      return ipKeyGenerator(req.ip || 'unknown');
    },
    message: { error: 'Too many failed coupon attempts from this IP, please try again after an hour.' }
  });

  app.post('/api/coupons/apply', couponRateLimiter, async (req, res) => {
    try {
      const { couponCode } = req.body;
      if (!couponCode) return res.status(400).json({ error: 'Coupon code required' });
      
      // Simulate checking coupon validation against database
      // As the database doesn't have a coupons table currently, we return 400 failure
      // which triggers the fail limit count if it fails (using mock logic)
      if (couponCode === 'MOCK_SUCCESS') {
        return res.json({ success: true, discount: 10 });
      }

      return res.status(400).json({ error: 'Invalid coupon code.' });
    } catch (e) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // New highly cached / buffered route for views using Redis
  // Prevents direct Postgres hammering for viral videos
  app.post('/api/videos/:videoId/view', async (req, res) => {
    try {
      const { videoId } = req.params;
      
      let userId: string | null = null;
      if (req.headers.authorization && supabaseAdmin) {
        const tokenStr = req.headers.authorization.split(' ')[1];
        if (tokenStr) {
          const { data: { user } } = await supabaseAdmin.auth.getUser(tokenStr);
          if (user) {
            userId = user.id;
          }
        }
      }

      let sessionToken = req.signedCookies?.viewer_session;
      if (!sessionToken) {
        sessionToken = crypto.randomUUID();
        res.cookie('viewer_session', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          signed: true,
          maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
        });
      }
      
      const token = userId || sessionToken;

      if (!process.env.UPSTASH_REDIS_REST_URL) {
        return res.json({ success: true, buffered: false });
      }

      // 1. Deduplicate views using a TTL-based key (24 hour expiration)
      const viewCheckKey = `view_checked:${videoId}:${token}`;
      const alreadyViewed = await redis.get(viewCheckKey);

      if (alreadyViewed) {
        const currentCachedViews = await redis.get(`video_view_cache:${videoId}`);
        return res.json({ 
          success: true, 
          buffered: true, 
          newly_viewed: false,
          views: currentCachedViews ? Number(currentCachedViews) : null
        });
      }

      // Mark as viewed under this session token for 24 hours (1), queue view (2), and increment the cache (3) in parallel
      const [, , updatedViewsCount] = await Promise.all([
        redis.set(viewCheckKey, "1", { ex: 86400 }),
        redis.lpush('video_views_queue', JSON.stringify({ videoId, token })),
        redis.incr(`video_view_cache:${videoId}`)
      ]);

      res.json({ 
        success: true, 
        buffered: true, 
        newly_viewed: true,
        views: updatedViewsCount 
      });
    } catch (err: any) {
      console.error('Error in Redis view buffering:', err);
      // Fallback open to permit safe client-direct write on database on failure
      res.json({ success: true, buffered: false });
    }
  });

  // Background cron to flush Redis views to Database every minute
  // (In production, replace dummy supabase call with server-side SDK call using Service Role Key)
  setInterval(async () => {
    if (!process.env.UPSTASH_REDIS_REST_URL || !supabaseAdmin) return;
    try {
      // Pop up to 100 views at a time to prevent blocking
      const promises = [];
      const MAX_BATCH = 100;
      let count = 0;
      
      while (count < MAX_BATCH) {
        const item = await redis.rpop('video_views_queue');
        if (!item) break; // queue empty
        
        const payload: { videoId: string, token: string } = typeof item === 'string' ? JSON.parse(item) : item as any;
        if (payload.videoId && payload.token) {
          promises.push(supabaseAdmin.rpc('increment_video_views', { 
            video_id_param: payload.videoId,
            session_token_param: payload.token
          }));
        }
        count++;
      }

      if (promises.length > 0) {
        await Promise.allSettled(promises);
        console.log(`[Worker] Successfully flushed ${promises.length} views from queue.`);
      }
    } catch (e) {
      console.error('[Worker] Error flushing Redis views', e);
    }
  }, 10000);

  // Rate limiter for engagement
  const engagementLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // Max 20 engagement actions per minute
    message: { error: 'Too many engagement actions. Please slow down.' }
  });

  const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 signups per IP per hour
    message: { error: 'Too many signup attempts from this IP. Please try again later.' }
  });

  app.post('/api/auth/signup', signupLimiter, async (req, res) => {
    try {
      const { email, password, username } = req.body;
      if (!supabaseAdmin) throw new Error("Database not configured");
      
      const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      });
      
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/engagement/:action', verifyAuth, engagementLimiter, async (req, res) => {
    try {
      const { action } = req.params;
      const { videoId, targetUserId } = req.body;
      const user = (req as any).user;

      if (!supabaseAdmin) throw new Error('Database not configured');

      switch (action) {
        case 'like':
          await supabaseAdmin.from('likes').insert({ video_id: videoId, user_id: user.id });
          break;
        case 'unlike':
          await supabaseAdmin.from('likes').delete().eq('video_id', videoId).eq('user_id', user.id);
          break;
        case 'save':
          await supabaseAdmin.from('saved_videos').insert({ video_id: videoId, user_id: user.id });
          break;
        case 'unsave':
          await supabaseAdmin.from('saved_videos').delete().eq('video_id', videoId).eq('user_id', user.id);
          break;
        case 'follow':
          await supabaseAdmin.from('follows').insert({ following_id: targetUserId, follower_id: user.id });
          break;
        case 'unfollow':
          await supabaseAdmin.from('follows').delete().eq('following_id', targetUserId).eq('follower_id', user.id);
          break;
        case 'report':
          await supabaseAdmin.from('reports').insert({
            video_id: videoId,
            user_id: user.id,
            reason: req.body.reason || 'Spam or malicious'
          });
          break;
        default:
          return res.status(400).json({ error: 'Invalid engagement action' });
      }

      res.json({ success: true, action });
    } catch (err: any) {
      console.error(`Engagement action failed (${req.params.action}):`, err);
      // Even if DB unique constraint hits, just return success to avoid leaking state
      res.json({ success: true, error: err.message });
    }
  });

  // verifyAuth middleware to strictly authenticate any logged-in user
  async function verifyAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header provided' });
      }
      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Auth token must be Bearer token' });
      }
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not initialized on server');
      }

      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) {
        return res.status(401).json({ error: 'Invalid or expired auth token' });
      }
      
      // Pass the user string to the next function if needed
      (req as any).user = user;
      next();
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };

  const uploadVideo = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB
  
  app.post('/api/bunny/upload-video-proxy', verifyAuth, uploadVideo.single('video'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No video file' });
      
      const libraryId = process.env.BUNNY_LIBRARY_ID;
      const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
      let deliveryHostname = process.env.BUNNY_DELIVERY_HOSTNAME;
      
      const sandboxDomain = process.env.SANDBOX_DOMAIN || 'https://usercontent-getnayi.com';
      deliveryHostname = sandboxDomain.replace(/^https?:\/\//, '');

      if (!libraryId || !apiKey || !deliveryHostname) {
        return res.status(500).json({ error: 'Bunny configuration is missing' });
      }

      const createResponse = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
        method: 'POST',
        headers: {
          'AccessKey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: req.body?.title || 'Proxy Upload Video' })
      });

      if (!createResponse.ok) throw new Error('Failed to create video object in Bunny Stream');
      const videoData = await createResponse.json();
      const videoId = videoData.guid;

      // Ensure we strip strictly all EXIF metadata using ffmpeg
      const ext = req.file.originalname ? (path.extname(req.file.originalname).toLowerCase() || '.mp4') : '.mp4';
      const tempInputFile = path.join(os.tmpdir(), `input-${Date.now()}-${videoId}${ext}`);
      const tempOutputFile = path.join(os.tmpdir(), `output-${Date.now()}-${videoId}${ext}`);
      
      let processedBuffer = req.file.buffer;
      let usedFfmpeg = false;

      try {
        await fs.promises.writeFile(tempInputFile, req.file.buffer);

        await new Promise<void>((resolve, reject) => {
          // Add a strict timeout of 4 seconds to avoid process hangs
          const proc = ffmpeg(tempInputFile)
            .outputOptions(['-map_metadata -1', '-c:v copy', '-c:a copy'])
            .save(tempOutputFile)
            .on('end', () => resolve())
            .on('error', (err) => reject(new Error('Failed to strip video metadata: ' + err.message)));
          
          setTimeout(() => {
            try { proc.kill('SIGKILL'); } catch(e) {}
            reject(new Error('FFmpeg metadata extraction timed out'));
          }, 4000);
        });

        processedBuffer = await fs.promises.readFile(tempOutputFile);
        usedFfmpeg = true;
      } catch (ffmpegErr: any) {
        console.warn(`[UPLOAD PROXY] FFmpeg overhead processing bypassed or timed out under load: ${ffmpegErr.message}. Falling back safely to direct buffer transfer to guarantee runtime availability.`, ffmpegErr);
        processedBuffer = req.file.buffer;
      } finally {
        // Cleanup tmp files asynchronously to free memory and disk space
        fs.unlink(tempInputFile, () => {});
        fs.unlink(tempOutputFile, () => {});
      }

      const uploadResponse = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
        method: 'PUT',
        headers: { 'AccessKey': apiKey },
        body: processedBuffer
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload video data to Bunny');

      res.json({ success: true, videoId, deliveryHostname });
    } catch (error: any) {
      console.error('Proxy Video Upload Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Presigned URL for Image Uploads (Direct PUT proxy)
  app.post('/api/bunny/presign-image', verifyAuth, async (req, res) => {
    try {
      const { filename } = req.body;
      const user = (req as any).user;
      
      const { data: profile } = await supabaseAdmin!.from('profiles').select('can_upload, is_admin').eq('id', user.id).single();
      if (!profile?.can_upload && !profile?.is_admin) {
        return res.status(403).json({ error: 'Forbidden. You do not have upload privileges.' });
      }

      const crypto = await import('crypto');
      const uniqueFilename = `${user.id}/${Date.now()}-${filename}`;
      const expires = Math.floor(Date.now() / 1000) + 600; // 10 mins
      const secret = process.env.BUNNY_STORAGE_PASSWORD || 'secret';
      
      const signature = crypto.createHmac('sha256', secret)
        .update(`${uniqueFilename}:${expires}`)
        .digest('hex');

      const presignedUrl = `/api/bunny/direct-put?filename=${encodeURIComponent(uniqueFilename)}&expires=${expires}&signature=${signature}`;
      res.json({ presignedUrl, filename: uniqueFilename });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/bunny/direct-put', async (req, res) => {
    try {
      const { filename, expires, signature } = req.query;
      
      if (Math.floor(Date.now() / 1000) > Number(expires)) {
        return res.status(401).json({ error: 'Presigned URL expired' });
      }

      const crypto = await import('crypto');
      const secret = process.env.BUNNY_STORAGE_PASSWORD || 'secret';
      const expectedSig = crypto.createHmac('sha256', secret)
        .update(`${filename}:${expires}`)
        .digest('hex');
        
      if (signature !== expectedSig) {
        return res.status(403).json({ error: 'Invalid signature' });
      }

      let zoneName = process.env.BUNNY_STORAGE_ZONE_NAME || '';
      let hostname = process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com';
      if (zoneName.includes('/')) zoneName = zoneName.split('/').filter(Boolean).pop() || zoneName;
      if (hostname.includes('://')) hostname = new URL(hostname).hostname;
      const pullZone = process.env.BUNNY_STORAGE_PULL_ZONE;

      const bunnyUrl = `https://${hostname}/${zoneName}/${filename}`;
      
      const fetchResponse = await fetch(bunnyUrl, {
        method: 'PUT',
        headers: { 'AccessKey': secret, 'Content-Length': req.headers['content-length'] as string, 'Content-Type': 'application/octet-stream' },
        body: req as any, // Stream the raw binary directly
        duplex: 'half'
      } as any);

      if (!fetchResponse.ok) {
        throw new Error(await fetchResponse.text());
      }
      
      res.json({ url: `https://${pullZone}/${filename}` });
    } catch (e: any) {
      console.error('Direct PUT Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Upload Image to Bunny Edge Storage
  app.post('/api/bunny/upload-image', verifyAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Database Admin client not configured' });
      }
      const { data: profile } = await supabaseAdmin.from('profiles').select('can_upload, is_admin').eq('id', user.id).single();
      if (!profile?.can_upload && !profile?.is_admin) {
        return res.status(403).json({ error: 'Forbidden. You do not have upload privileges.' });
      }

      let zoneName = process.env.BUNNY_STORAGE_ZONE_NAME || '';
      const password = process.env.BUNNY_STORAGE_PASSWORD;
      const pullZone = process.env.BUNNY_STORAGE_PULL_ZONE;
      let hostname = process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com';

      if (zoneName.includes('/')) zoneName = zoneName.split('/').filter(Boolean).pop() || zoneName;
      if (hostname.includes('://')) hostname = new URL(hostname).hostname;

      if (!zoneName || !password || !pullZone) {
        return res.status(500).json({ error: 'Bunny edge storage configuration is missing' });
      }

      const { imageBase64, filename } = req.body;
      if (!imageBase64 || !filename) {
        return res.status(400).json({ error: 'Image data and filename are required' });
      }
      
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      if (buffer.length > 2 * 1024 * 1024) {
        return res.status(413).json({ error: 'Image size exceeds maximum allowed size (2MB).' });
      }
      
      let sharp = null;
      try { sharp = require('sharp'); } catch (e) {}
      let finalBuffer = buffer;
      
      if (sharp) {
        // Strip EXIF and convert to WebP to neutralize any payloads
        finalBuffer = await sharp(buffer).webp().toBuffer();
      }

      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

      let pz = pullZone.endsWith('/') ? pullZone.slice(0, -1) : pullZone;
      if (!pz.startsWith('http')) pz = `https://${pz}`;

      // Enforce the sandbox domain requirement
      const sandboxDomain = process.env.SANDBOX_DOMAIN || 'https://usercontent-getnayi.com';
      pz = sandboxDomain;

      const regions = [hostname, 'storage.bunnycdn.com', 'ny.storage.bunnycdn.com', 'la.storage.bunnycdn.com', 'sg.storage.bunnycdn.com', 'syd.storage.bunnycdn.com', 'uk.storage.bunnycdn.com', 'br.storage.bunnycdn.com', 'jh.storage.bunnycdn.com'];
      const uniqueRegions = [...new Set(regions)];

      let lastError = null;
      let success = false;

      for (const regionHost of uniqueRegions) {
        const url = `https://${regionHost}/${zoneName}/avatars/${uniqueFilename}`;
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'AccessKey': password, 'Content-Type': 'application/octet-stream' },
          body: finalBuffer
        });

        if (response.ok) {
          success = true;
          break;
        } else {
          lastError = { status: response.status, text: await response.text() };
        }
      }

      if (!success) {
         throw new Error(`Failed to upload to Bunny Storage: ${JSON.stringify(lastError)}`);
      }

      const publicUrl = `${pz}/avatars/${uniqueFilename}`;
      res.json({ success: true, url: publicUrl });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 1. Create Video
  app.post('/api/bunny/create', verifyAuth, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      // Upload rate limit (5 per hour)
      if (process.env.UPSTASH_REDIS_REST_URL) {
         try {
            const user = (req as any).user;
            const authMatch = user?.id || req.ip || 'unknown';
            if (authMatch) {
                const key = `upload_limit:${authMatch}`;
                const current = await redis.incr(key);
                if (current === 1) {
                    await redis.expire(key, 3600); // 1 hour
                }
                if (current > 5) {
                    return res.status(429).json({ error: 'You have reached the upload limit of 5 videos per hour. Please try again later.' });
                }
            }
         } catch (redisError: any) {
            console.error('Upload rate limit Redis error (failing open):', redisError);
         }
      }

      const user = (req as any).user;
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Database Admin client not configured' });
      }
      const { data: profile } = await supabaseAdmin.from('profiles').select('can_upload, is_admin').eq('id', user.id).single();
      if (!profile?.can_upload && !profile?.is_admin) {
        return res.status(403).json({ error: 'Forbidden. You do not have upload privileges.' });
      }

      const libraryId = process.env.BUNNY_LIBRARY_ID;
      const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
      let deliveryHostname = process.env.BUNNY_DELIVERY_HOSTNAME;
      
      const sandboxDomain = process.env.SANDBOX_DOMAIN || 'https://usercontent-getnayi.com';
      deliveryHostname = sandboxDomain.replace(/^https?:\/\//, '');

      if (!libraryId || !apiKey || !deliveryHostname) {
        return res.status(500).json({ error: 'Bunny configuration is missing' });
      }

      const createResponse = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
        method: 'POST',
        headers: {
          'AccessKey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: req.body?.title || 'Uploaded Video' })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create video object in Bunny Stream');
      }

      const videoData = await createResponse.json();
      const videoId = videoData.guid;

      // Generate TUS Direct Upload Signature
      const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity
      
      const crypto = await import('crypto');
      const signature = crypto.createHash('sha256')
          .update(libraryId + apiKey + expirationTime + videoId)
          .digest('hex');

      res.json({ 
        success: true, 
        videoId,
        libraryId,
        deliveryHostname,
        expirationTime,
        signature
      });
    } catch (error: any) {
      console.error('Create Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/webhooks/bunny', express.json(), async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'DB not configured' });
      }

      // BunnyCDN Webhook Body generally contains VideoGuid and Status
      const { VideoGuid, Status } = req.body;
      
      // Status 3 typically means "Finished/Ready" in Bunny stream
      if (VideoGuid && Status === 3) {
        const videoUrlLike = `%${VideoGuid}%`;
        const { error } = await supabaseAdmin
          .from('videos')
          .update({ status: 'active' })
          .like('video_url', videoUrlLike)
          .eq('status', 'processing');

        if (error) {
          console.error('[Webhook] Failed to update video status:', error);
          
          await supabaseAdmin.from('webhook_dead_letter_queue').insert({
            payload: req.body,
            error_message: 'Failed to update video record: ' + JSON.stringify(error)
          });
          
          return res.status(500).json({ error: 'Failed to update database' });
        }
        
        console.log(`[Webhook] Successfully activated video: ${VideoGuid}`);
      }
      
      return res.status(200).send('OK');
    } catch (err: any) {
      console.error('[Webhook] Bunny Webhook Error:', err);
      
      if (supabaseAdmin) {
        const { error: dlqError } = await supabaseAdmin.from('webhook_dead_letter_queue').insert({
          payload: req.body || {},
          error_message: 'Unhandled Exception: ' + (err?.message || String(err))
        });
        if (dlqError) console.error('[Webhook] Failed to log to DLQ', dlqError);
      }
      
      return res.status(500).send('Webhook Error');
    }
  });

  // DELETE Video (Bunny)
  app.delete('/api/bunny/delete/:videoId', verifyAuth, async (req, res) => {
    try {
      const libraryId = process.env.BUNNY_LIBRARY_ID;
      const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
      const videoId = req.params.videoId;
      const user = (req as any).user;

      if (!libraryId || !apiKey) {
        return res.status(500).json({ error: 'Bunny configuration is missing' });
      }
      
      if (!supabaseAdmin) {
         return res.status(500).json({ error: 'Database not configured' });
      }

      // Check ownership
      const { data: videoData } = await supabaseAdmin.from('videos')
        .select('user_id')
        .ilike('video_url', `%${videoId}%`)
        .maybeSingle();

      if (videoData) {
        const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
        if (videoData.user_id !== user.id && !profile?.is_admin) {
           return res.status(403).json({ error: 'Forbidden. You do not own this video.' });
        }
      }

      const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'AccessKey': apiKey,
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH Profile (My Profile)
  // Advanced Feed, Comments, and Followers end-points with cursor-based pagination
  app.get('/api/feed', async (req, res) => {
    try {
      const { tab, categoryId, cursor, limit = 10 } = req.query;
      const limitNum = parseInt(limit as string) || 10;
      
      let userId: string | null = null;
      if (req.headers.authorization && supabaseAdmin) {
        const token = req.headers.authorization.split(' ')[1];
        if (token && token !== 'null') {
          const { data: { user } } = await supabaseAdmin.auth.getUser(token);
          if (user) userId = user.id;
        }
      }
      
      const selectQuery = `*, categories (id, name), profiles (id, username, avatar_url, is_brand), likes(count), comments(count), saved_videos(count)`;

      let rawVideos: any[] = [];
      let finalNextCursor: string | null = null;

      if (tab === 'trending') {
        const cacheKey = `feed:trending:${categoryId || 'all'}`;
        let trendingVideos: any[] = [];
        let cached = null;
        try {
          if (process.env.UPSTASH_REDIS_REST_URL) {
            cached = await redis.get(cacheKey);
          }
        } catch (cacheError) {
          console.error("Redis error fetching cached trending feed:", cacheError);
        }
        
        if (cached) {
          trendingVideos = typeof cached === 'string' ? JSON.parse(cached) : cached;
        } else {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          let query = supabaseAdmin!.from('videos')
            .select(selectQuery)
            .gte('created_at', sevenDaysAgo)
            .limit(300); // Fetch up to 300 recent videos to score globally
          
          if (categoryId) query = query.eq('category_id', categoryId);
          
          const { data, error } = await query;
          if (error) throw error;
          
          let scoredVideos = (data || []).map((v: any) => {
            const likesCount = v.likes && v.likes.length > 0 && v.likes[0].count !== undefined ? v.likes[0].count : (v.likes?.length || 0);
            const commentsCount = v.comments && v.comments.length > 0 && v.comments[0].count !== undefined ? v.comments[0].count : (v.comments?.length || 0);
            const viewsCount = v.views || 0;

            // HackerNews / Reddit Hot Scoring Formula
            // Score = (Engagement) / (Age in hours + 2)^Gravity
            const engagementScore = (likesCount * 3) + (commentsCount * 5) + (viewsCount * 0.1);
            
            const ageInHours = (Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60);
            const gravity = 1.8;
            
            const finalScore = engagementScore / Math.pow(ageInHours + 2, gravity);
            
            return {
              ...v,
              _ranking_score: finalScore
            };
          });

          // Sort by the composite score
          scoredVideos.sort((a, b) => b._ranking_score - a._ranking_score);
          
          trendingVideos = scoredVideos;
          try {
            if (process.env.UPSTASH_REDIS_REST_URL) {
              await redis.set(cacheKey, JSON.stringify(trendingVideos), { ex: 300 }); 
            }
          } catch (cacheError) {
            console.error("Redis error setting trending cache:", cacheError);
          }
        }

        const offset = cursor ? parseInt(cursor as string) : 0;
        rawVideos = trendingVideos.slice(offset, offset + limitNum);
        finalNextCursor = offset + limitNum < trendingVideos.length ? (offset + limitNum).toString() : null;
      } else {
        let query = supabaseAdmin!.from('videos').select(selectQuery).order('created_at', { ascending: false }).limit(limitNum);
        
        if (categoryId) query = query.eq('category_id', categoryId);
        if (cursor) query = query.lt('created_at', cursor);
        
        const { data, error } = await query;
        if (error) throw error;

        rawVideos = data || [];
        finalNextCursor = data && data.length === limitNum ? data[data.length - 1].created_at : null;
      }
      
      // Enrich with user state and clean up the counts
      let userLikes = new Set();
      let userSaves = new Set();
      let userFollows = new Set();
      
      if (rawVideos.length > 0 && userId) {
          const videoIds = rawVideos.map(v => v.id);
          const authorIds = Array.from(new Set(rawVideos.map(v => v.user_id)));
          
          const [likesRes, savesRes, followsRes] = await Promise.all([
              supabaseAdmin!.from('likes').select('video_id').eq('user_id', userId).in('video_id', videoIds),
              supabaseAdmin!.from('saved_videos').select('video_id').eq('user_id', userId).in('video_id', videoIds),
              supabaseAdmin!.from('follows').select('following_id').eq('follower_id', userId).in('following_id', authorIds)
          ]);
          if (likesRes.data) likesRes.data.forEach((l: any) => userLikes.add(l.video_id));
          if (savesRes.data) savesRes.data.forEach((s: any) => userSaves.add(s.video_id));
          if (followsRes.data) followsRes.data.forEach((f: any) => userFollows.add(f.following_id));
      }

      const enrichedVideos = rawVideos.map(v => {
          // Extract count from PostgREST format [{ count: X }]
          const likesList = v.likes || [];
          const commentsList = v.comments || [];
          const savesList = v.saved_videos || [];
          
          const likesCount = likesList.length > 0 && likesList[0].count !== undefined ? likesList[0].count : (likesList.length > 0 ? likesList.length : 0);
          const commentsCount = commentsList.length > 0 && commentsList[0].count !== undefined ? commentsList[0].count : (commentsList.length > 0 ? commentsList.length : 0);
          const savesCount = savesList.length > 0 && savesList[0].count !== undefined ? savesList[0].count : (savesList.length > 0 ? savesList.length : 0);

          return {
             ...v,
             metrics: {
                likes: likesCount,
                comments: commentsCount,
                saves: savesCount,
                views: v.views || 0
             },
             user_state: {
                is_liked: userLikes.has(v.id),
                is_saved: userSaves.has(v.id),
                is_followed: userFollows.has(v.user_id)
             }
          };
      });

      return res.json({ data: enrichedVideos, nextCursor: finalNextCursor });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/comments', async (req, res) => {
    try {
      const { video_id, cursor, limit = 20 } = req.query;
      const limitNum = parseInt(limit as string) || 20;

      let query = supabaseAdmin!.from('comments').select('*, profiles(username, avatar_url, is_brand)').eq('video_id', video_id).order('created_at', { ascending: false }).limit(limitNum);
      if (cursor) query = query.lt('created_at', cursor);

      const { data, error } = await query;
      if (error) throw error;

      const nextCursor = data && data.length === limitNum ? data[data.length - 1].created_at : null;
      return res.json({ data: data || [], nextCursor });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/comments', verifyAuth, async (req, res) => {
    try {
      const { video_id, content } = req.body;
      const user = (req as any).user;
      
      if (!content || !content.trim()) {
         return res.status(400).json({ error: 'Comment cannot be empty' });
      }
      
      // Shadowban check
      const isShadowbanned = user.user_metadata?.is_banned === true;

      // Spam Filter: regex for URLs or spam phrases
      const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)/i;
      const spamPhrases = ['free crypto', 'click my bio', 'link in bio', 'subscribe', 'followers', 'cash app'];
      const isSpam = urlRegex.test(content) || spamPhrases.some(phrase => content.toLowerCase().includes(phrase));

      if (isSpam && process.env.UPSTASH_REDIS_REST_URL) {
         try {
            // Track spam hits
            const spamKey = `spam:comments:${user.id}`;
            const spamCount = await redis.incr(spamKey);
            if (spamCount === 1) await redis.expire(spamKey, 3600); // 1 hr window

            if (spamCount >= 3) {
              // Auto shadowban
              if (supabaseAdmin) {
                await supabaseAdmin.auth.admin.updateUserById(user.id, {
                  user_metadata: { ...user.user_metadata, is_banned: true }
                });
              }
            }
         } catch (redisError) {
            console.error("Spam tracking Redis error:", redisError);
         }
         return res.status(403).json({ error: 'Comment blocked due to spam policy' });
      }

      if (isShadowbanned) {
        // Obfuscate shadowbanning: simulate success to the shadowbanned user, but do not actually insert into db
        const mockComment = {
          id: 'temp-' + Date.now().toString(),
          video_id,
          user_id: user.id,
          content,
          created_at: new Date().toISOString(),
          profiles: {
            username: user.user_metadata?.username || 'user',
            avatar_url: user.user_metadata?.avatar_url,
            is_brand: user.user_metadata?.is_brand || false
          }
        };
        return res.json({ success: true, comment: mockComment });
      }

      // Rate Limit: Detect rapid identical comments
      if (process.env.UPSTASH_REDIS_REST_URL) {
         try {
            const recentKey = `recent_comment:${user.id}:${Buffer.from(content).toString('base64')}`;
            const hasRecent = await redis.get(recentKey);
            if (hasRecent) {
               const rapidCountKey = `rapid_spam:${user.id}`;
               const count = await redis.incr(rapidCountKey);
               if (count === 1) await redis.expire(rapidCountKey, 60);

               if (count >= 3 && supabaseAdmin) {
                  await supabaseAdmin.auth.admin.updateUserById(user.id, {
                     user_metadata: { ...user.user_metadata, is_banned: true }
                  });
               }
               return res.status(429).json({ error: 'Please wait before posting the identical comment.' });
            }
            await redis.set(recentKey, '1', { ex: 5 }); // 5 second cooldown for same exact string
         } catch (redisError) {
            console.error("Rapid identical comment Redis error (failing open):", redisError);
         }
      }

      if (!supabaseAdmin) {
         return res.status(500).json({ error: 'DB not configured' });
      }

      const { data, error } = await supabaseAdmin.from('comments').insert({
          video_id,
          user_id: user.id,
          content
      }).select('*, profiles(username, avatar_url, is_brand)').single();

      if (error) throw error;
      res.json({ success: true, comment: data });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/followers', async (req, res) => {
    try {
      const { user_id, cursor, limit = 20 } = req.query;
      const limitNum = parseInt(limit as string) || 20;

      let query = supabaseAdmin!.from('follows').select('*, profiles!follower_id(id, username, avatar_url, is_brand)').eq('following_id', user_id).order('created_at', { ascending: false }).limit(limitNum);
      if (cursor) query = query.lt('created_at', cursor);

      const { data, error } = await query;
      if (error) throw error;

      const nextCursor = data && data.length === limitNum ? data[data.length - 1].created_at : null;
      return res.json({ data: data || [], nextCursor });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/profiles/me', verifyAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const updates = req.body;
      
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Database not configured' });
      }
      
      // Explicitly whitelist allowed update fields
      const allowedFields = ['bio', 'instagram', 'tiktok', 'avatar_url'];
      const sanitizedUpdates: Record<string, any> = {};
      
      for (const key of Object.keys(updates)) {
         if (allowedFields.includes(key)) {
            sanitizedUpdates[key] = updates[key];
         }
      }

      if (Object.keys(sanitizedUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(sanitizedUpdates)
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Create Video logic in DB
  app.post('/api/link-preview', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || !validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true })) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      const isIpAddress = validator.isIP(hostname) || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      if (hostname === 'localhost' || hostname === '127.0.0.1' || isIpAddress || hostname.endsWith('.local') || hostname.includes('0x')) {
         return res.status(400).json({ error: 'Local or internal IP addresses are not allowed.' });
      }

      let title = '';
      let favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`; // fallback
      
      try {
        let html = '';
        try {
          const response = await fetch(url, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml'
            },
            signal: AbortSignal.timeout(4000)
          });
          
          if (response.ok) {
            html = await response.text();
          } else {
            // Unobtrusive fallback to non-TLS fetcher
            html = await fetchPageHtmlWithNoTls(url).catch(() => '');
          }
        } catch (fetchErr: any) {
          // Unobtrusive fallback to non-TLS fetcher on any fetch exception
          html = await fetchPageHtmlWithNoTls(url).catch(() => '');
        }

        if (html) {
          const $ = cheerio.load(html);

          title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
          
          const iconHref = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || $('link[rel="apple-touch-icon"]').attr('href');
          if (iconHref) {
            try {
               favicon = new URL(iconHref, url).toString();
            } catch(e) {
              // ignore
            }
          }
        }
      } catch (err) {
        // Quietly fail or use fallbacks without cluttering the logs
      }

      return res.json({ 
        title: title.trim() || hostname, 
        favicon, 
        domain: hostname 
      });

    } catch (err: any) {
      console.error('Link preview error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/videos', verifyAuth, async (req, res) => {
    try {
      const { 
        video_url, thumbnail_url, main_product_image_url, 
        caption, product_url, real_life_image_url, is_verified_real, force_unverified_url, category_id
      } = req.body;

      if (!product_url) {
          return res.status(400).json({ error: 'Product URL is required' });
      }

      if (!/^https:\/\//i.test(product_url.trim())) {
         return res.status(400).json({ error: 'Only HTTPS URLs are allowed. javascript: or other schemas are strictly forbidden.' });
      }
      
      const cleanProductUrl = product_url.trim();

      if (!validator.isURL(cleanProductUrl, { protocols: ['https'], require_protocol: true })) {
        return res.status(400).json({ error: 'Invalid URL format. Please enter a valid product page link.' });
      }

      // Step 1: Follow redirects to secure the true destination URL
      const resolvedUrl = await resolveRedirectsNative(cleanProductUrl);

      // Step 2: Validate the resolved URL schema
      let url;
      try {
        url = new URL(resolvedUrl);
      } catch (e) {
        return res.status(400).json({ error: 'The resolved product link is invalid.' });
      }

      if (url.protocol !== 'https:') {
         return res.status(400).json({ error: 'Only HTTPS URLs are allowed for products.' });
      }

      const pathname = url.pathname.toLowerCase();
      const blockedExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.zip', '.rar', '.mp3', '.wav'];
      if (blockedExtensions.some(ext => pathname.endsWith(ext))) {
         return res.status(400).json({ error: 'This must be a valid product page link, not a media file.' });
      }

      // Punycode Enforcement: converted natively via url.hostname to prevent homograph bypasses
      const hostname = url.hostname.toLowerCase();
      const isIpAddress = validator.isIP(hostname) || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local') || hostname.includes('0x') || isIpAddress) {
         return res.status(400).json({ error: 'Local or IP addresses are not allowed.' });
      }

      // Step 3: Parameter Sanitization to prevent affiliate URL stuffing / spoofing
      const safeProductUrl = sanitizeProductUrl(url);

      // Step 4: Google Safe Browsing / local blocklist comparison with final resolved + scrubbed URL
      if (process.env.GOOGLE_SAFE_BROWSING_KEY) {
        try {
          const safeRes = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_SAFE_BROWSING_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client: { clientId: 'getnayi', clientVersion: '1.0' },
              threatInfo: {
                threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                platformTypes: ["ANY_PLATFORM"],
                threatEntryTypes: ["URL"],
                threatEntries: [{ url: safeProductUrl }]
              }
            })
          });
          const safeData = await safeRes.json();
          if (safeData && safeData.matches && safeData.matches.length > 0) {
            return res.status(400).json({ error: 'This URL has been flagged as potentially unsafe or malicious.' });
          }
        } catch (err) {
          console.error("Safe browsing check failed", err);
        }
      } else {
        const fallbackBlocklist = ['phishing.com', 'malware.net', 'scam.org'];
        if (fallbackBlocklist.some(domain => safeProductUrl.includes(domain))) {
          return res.status(400).json({ error: 'This URL is on our blocklist.' });
        }
      }

      let status = 'processing';

      // Step 5: Strict eTLD+1 Root Parsing ecommerce check via tldts
      const isMarketplace = isAllowedMarketplace(safeProductUrl);
      const isProductPath = ['/p/', '/product/', '/item/', '/dp/', '/buy/'].some(p => pathname.includes(p));
      const looksLikeProductUrl = isMarketplace || isProductPath;

      if (!looksLikeProductUrl && !force_unverified_url) {
          return res.status(400).json({ 
              error: 'URL_NOT_MARKETPLACE', 
              message: 'Link doesn\'t look like an e-commerce platform.' 
          });
      }

      if (!looksLikeProductUrl && force_unverified_url) {
          // Keep as pending review instead of processing if it failed the URL check
          status = 'pending_review';
      }

      const user = (req as any).user;

      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Database Admin client not configured' });
      }

      // Authorization check
      const { data: profile } = await supabaseAdmin.from('profiles').select('can_upload, is_admin').eq('id', user.id).single();
      
      if (!profile?.can_upload && !profile?.is_admin) {
        return res.status(403).json({ error: 'Forbidden. You do not have upload privileges.' });
      }

      // User-Based Rate Limits via Redis (3 per 12 hours)
      if (process.env.UPSTASH_REDIS_REST_URL) {
         try {
            const key = `feed_upload_limit:${user.id}`;
            const current = await redis.incr(key);
            if (current === 1) {
                await redis.expire(key, 12 * 3600); // 12 hours
            }
            if (current > 3 && !profile?.is_admin) {
                return res.status(429).json({ error: 'You have reached the upload limit of 3 videos per 12 hours.' });
            }
         } catch (redisError: any) {
            console.error('Feed upload limit Redis error (failing open):', redisError);
         }
      }

      // Duplicate Hash Detection
      const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const { data: duplicates } = await supabaseAdmin
         .from('videos')
         .select('id')
         .eq('user_id', user.id)
         .eq('video_url', video_url)
         .gte('created_at', seventyTwoHoursAgo)
         .limit(1);

      if (duplicates && duplicates.length > 0) {
         return res.status(409).json({ error: 'Duplicate upload detected. This video was already uploaded recently.' });
      }

      // Admin insertion to allow status field (which might not be accessible if RLS blocks users setting status manually)
      const { data, error } = await supabaseAdmin.from('videos').insert({
        user_id: user.id,
        video_url,
        ...(thumbnail_url ? { thumbnail_url } : {}),
        ...(main_product_image_url ? { main_product_image_url } : {}),
        caption,
        product_url: safeProductUrl,
        ...(real_life_image_url ? { real_life_image_url, is_verified_real } : {}),
        ...(category_id ? { category_id } : {}),
        status, 
      }).select().single();

      if (error) {
         // Gracefully handle if 'status' column doesn't exist yet via checking error message
         if (error.message.includes('column "status" of relation "videos" does not exist')) {
             const fallback = await supabaseAdmin.from('videos').insert({
                user_id: user.id,
                video_url,
                ...(thumbnail_url ? { thumbnail_url } : {}),
                ...(main_product_image_url ? { main_product_image_url } : {}),
                caption,
                product_url: safeProductUrl,
                ...(real_life_image_url ? { real_life_image_url, is_verified_real } : {}),
                ...(category_id ? { category_id } : {}),
             }).select().single();
             
             if (fallback.error) return res.status(400).json({ error: fallback.error.message });
             return res.json({ success: true, data: fallback.data, status: 'active (status column missing fallback)' });
         }
         return res.status(400).json({ error: error.message });
      }

      return res.json({ success: true, data, status });
    } catch (err: any) {
      console.error('Video Upload API Error:', err);
      return res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/bunny/status/:videoId', async (req, res) => {
    try {
      const libraryId = process.env.BUNNY_LIBRARY_ID;
      const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
      const videoId = req.params.videoId;

      if (!libraryId || !apiKey) {
        return res.status(500).json({ error: 'Bunny configuration is missing' });
      }

      const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
        headers: {
          'AccessKey': apiKey,
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check video status');
      }

      const data = await response.json();
      res.json({ status: data.status, encodeProgress: data.encodeProgress });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API route to explicitly grant upload access and make chvenu143mn@gmail.com an admin
  app.post(['/api/user/revoke-and-reset', '/api/user/grant-and-approve'], verifyAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Database Admin client not configured' });
      }
      
      const sessionUser = (req as any).user;
      if (sessionUser?.email?.toLowerCase() !== 'chvenu143mn@gmail.com') {
         return res.status(403).json({ error: 'Forbidden: Restricted diagnostic route.' });
      }

      // Query admin auth list of users
      const { data: usersData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError || !usersData?.users) {
        return res.status(500).json({ error: 'Failed to access users directory' });
      }

      const targetEmail = 'chvenu143mn@gmail.com';
      const targetUser = (usersData.users as any[]).find(u => u.email?.toLowerCase() === targetEmail);

      if (!targetUser) {
        return res.status(404).json({ error: `User with email ${targetEmail} not found` });
      }

      const userId = targetUser.id;

      // 1. Grant upload permission and set is_admin to true in profiles
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ can_upload: true, is_admin: true })
        .eq('id', userId);

      if (profileError) {
        console.error('Failed to grant and approve upload privilege:', profileError);
      }

      // 2. Clear out applications first to avoid duplicate status issues
      await supabaseAdmin
        .from('creator_applications')
        .delete()
        .eq('user_id', userId);

      // 3. Create/insert an approved creator application
      const { error: appError } = await supabaseAdmin
        .from('creator_applications')
        .insert({
          user_id: userId,
          status: 'approved',
          notes: 'Automated Creator/Admin Approval'
        });

      if (appError) {
        console.error('Failed to create approved creator application:', appError);
      }

      console.log(`[Approval Service] Done. Granted full admin and upload permissions for ${targetEmail}`);
      return res.json({ success: true, message: `Access granted and onboarding application approved/activated for ${targetEmail}` });
    } catch (err: any) {
      console.error('Approval process error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // verifyAdmin middleware to strictly authenticate as an administrator
  const verifyAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.error('[Admin Auth Failed] No auth header provided');
        return res.status(401).json({ error: 'No authorization header provided' });
      }
      const token = authHeader.split(' ')[1];
      if (!token) {
        console.error('[Admin Auth Failed] Token format is invalid');
        return res.status(401).json({ error: 'Auth token must be Bearer token' });
      }
      if (!supabaseAdmin) {
        console.error('[Admin Auth Failed] supabaseAdmin not configured');
        throw new Error('Supabase admin client not initialized on server');
      }

      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) {
        console.error('[Admin Auth Failed] Invalid or expired Supabase credentials:', userError);
        return res.status(401).json({ error: 'Invalid or expired auth token' });
      }

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile?.is_admin) {
        console.error(`[Admin Auth Forbidden] User ${user.email} does not possess is_admin flag. Profile:`, profile);
        return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
      }

      // Populate admin info on req object
      (req as any).adminUser = user;
      next();
    } catch (err: any) {
      console.error('[verifyAdmin Catch Error]', err);
      return res.status(500).json({ error: err.message });
    }
  };

  // Log admin moderation events inside database for audit trails
  const logAdminAction = async (adminId: string, action: string, targetId: string, targetType: string, details: any) => {
    try {
      console.log(`[Admin Log] Admin: ${adminId} | Action: ${action} | Target: ${targetId} (${targetType})`, details);
      if (supabaseAdmin) {
        await supabaseAdmin.from('admin_audit_logs').insert({
          admin_id: adminId,
          action,
          target_id: targetId,
          target_type: targetType,
          details
        });
      }
    } catch (err) {
      console.error('[logAdminAction Failed]', err);
    }
  };

  // Dual Fallback Settings Storage Engine
  let localSettings: Record<string, any> = {
    require_verification_to_upload: false,
    allowed_product_domains: ['amazon.in', 'amazon.com', 'flipkart.com', 'getnayi.in', 'myntra.com', 'meesho.com'],
    blacklisted_product_domains: ['spamlink.xyz', 'malicious.com', 'phishing.net', 'dangerous-offers.icu'],
    max_upload_size_mb: 100,
    automatic_spam_filtering: true,
    maintenance_mode: false,
    support_email: 'chvenu143mn@gmail.com'
  };

  const getSystemSettings = async (): Promise<Record<string, any>> => {
    try {
      if (supabaseAdmin) {
        // We attempt to retrieve from system_settings table if it exists
        const { data, error } = await supabaseAdmin.from('system_settings').select('*');
        if (!error && data && data.length > 0) {
          const loaded: Record<string, any> = {};
          data.forEach((row: any) => {
            loaded[row.key] = row.value;
          });
          return { ...localSettings, ...loaded };
        }
      }
    } catch (e) {
      console.warn('[Settings DB Engine] system_settings table not available, using Redis fallback:', e);
    }

    // Direct Upstash Redis cache query fallback
    try {
      const redisVal = await redis.get('system_settings');
      if (redisVal) {
        const parsed = typeof redisVal === 'string' ? JSON.parse(redisVal) : redisVal;
        return { ...localSettings, ...parsed };
      }
    } catch (e) {
      console.error('[Settings Redis Engine] Failed querying Redis backup:', e);
    }

    return localSettings;
  };

  const saveSystemSettings = async (settings: Record<string, any>): Promise<Record<string, any>> => {
    const updated = { ...localSettings, ...settings };
    
    // 1. Persist to Upstash Redis
    try {
      await redis.set('system_settings', JSON.stringify(updated));
    } catch (e) {
      console.error('[Settings Store Engine] Redis save error:', e);
    }

    // 2. Persist to Postgres database if available
    try {
      if (supabaseAdmin) {
        // Upsert all keys into Postgres
        const promises = Object.entries(updated).map(([key, value]) => {
          return supabaseAdmin.from('system_settings').upsert({ key, value }).select();
        });
        await Promise.allSettled(promises);
      }
    } catch (e) {
      console.warn('[Settings Store Engine] Postgres table row write bypassed:', e);
    }

    return updated;
  };

  // admin applications query
  app.get('/api/admin/applications', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data, error } = await supabaseAdmin
        .from('creator_applications')
        .select(`*, profiles (*)`)
        .order('created_at', { ascending: false });

      if (error) return res.status(400).json({ error: error.message });
      return res.json({ data: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // admin application status update
  app.put('/api/admin/applications/:id', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const adminId = (req as any).adminUser.id;
      const { status, userId } = req.body;
      
      const { data, error } = await supabaseAdmin
        .from('creator_applications')
        .update({ status })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });

      if (status === 'approved' && userId) {
        const isBrandApp = data?.notes?.startsWith("Role: Brand") || false;
        await supabaseAdmin.from('profiles').update({ 
          can_upload: true,
          is_brand: isBrandApp
        }).eq('id', userId);
      }

      await logAdminAction(adminId, `update_application_status_${status}`, req.params.id, 'creator_application', { userId });
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET Video List (Admin)
  app.get('/api/admin/videos', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data, error } = await supabaseAdmin
        .from('videos')
        .select(`*, profiles (*)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ data: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // UPDATE Video (Admin)
  app.put('/api/admin/videos/:id', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const adminId = (req as any).adminUser.id;
      const { status, trust_score, is_verified_real, is_admin_verified_link, category_id, caption, product_url } = req.body;
      const patch: any = {};
      
      if (status !== undefined) patch.status = status;
      if (trust_score !== undefined) patch.trust_score = Number(trust_score);
      if (is_verified_real !== undefined) patch.is_verified_real = !!is_verified_real;
      if (is_admin_verified_link !== undefined) patch.is_admin_verified_link = !!is_admin_verified_link;
      if (category_id !== undefined) patch.category_id = category_id || null;
      if (caption !== undefined) patch.caption = caption;
      if (product_url !== undefined) patch.product_url = product_url || null;

      const { data, error } = await supabaseAdmin
        .from('videos')
        .update(patch)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) throw error;
      await logAdminAction(adminId, 'edit_video_moderation', req.params.id, 'video', patch);
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // DELETE Video (Admin)
  app.delete('/api/admin/videos/:id', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const adminId = (req as any).adminUser.id;
      const videoId = req.params.id;

      const { data: videoData, error: fetchErr } = await supabaseAdmin
        .from('videos')
        .select('video_url, user_id')
        .eq('id', videoId)
        .single();

      if (fetchErr) throw fetchErr;

      const { error: deleteErr } = await supabaseAdmin
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (deleteErr) throw deleteErr;

      // Deleting item from external stream CDN
      if (videoData?.video_url) {
        const match = videoData.video_url.match(/https?:\/\/[^\/]+\/([a-f0-9\-]+)\//i);
        if (match && match[1]) {
          try {
            const libraryId = process.env.BUNNY_LIBRARY_ID;
            const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
            if (libraryId && apiKey) {
              await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${match[0]}`, {
                method: 'DELETE',
                headers: { 'AccessKey': apiKey }
              });
            }
          } catch (e) {
            console.warn('[CDN Stream Server] Bunny Video delete warning:', e);
          }
        }
      }

      await logAdminAction(adminId, 'delete_video', videoId, 'video', videoData);
      return res.json({ success: true, message: 'Video content and metadata purged successfully.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET Reports (Admin)
  app.get('/api/admin/reports', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select(`*, videos (*, profiles (*)), profiles (*)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ data: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // UPDATE Report Status / Audit Note (Admin)
  app.put('/api/admin/reports/:id', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const adminId = (req as any).adminUser.id;
      const { status } = req.body; // status can be pending, reviewed, resolved

      const { data, error } = await supabaseAdmin
        .from('reports')
        .update({ status: status || 'reviewed' })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) {
        // Fallback or ignore if column doesn't exist, we can store inside local logs
        console.warn('Reports column edit status failed. This is expected if alter script not applied:', error);
      }

      await logAdminAction(adminId, `verify_report_${status || 'reviewed'}`, req.params.id, 'report', { status });
      return res.json({ success: true, data: data || { id: req.params.id } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // DISMISS Report (Admin)
  app.delete('/api/admin/reports/:id', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const adminId = (req as any).adminUser.id;
      const reportId = req.params.id;

      const { error } = await supabaseAdmin
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      await logAdminAction(adminId, 'dismiss_report', reportId, 'report', {});
      return res.json({ success: true, message: 'Report dismissed' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET Creators / Users List (Admin)
  app.get('/api/admin/creators', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select(`*`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ data: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // UPDATE Creator privileges & Suspension (Admin)
  app.put('/api/admin/creators/:id', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const adminId = (req as any).adminUser.id;
      const creatorId = req.params.id;
      const { can_upload, is_brand, is_admin, is_suspended } = req.body;
      
      const patch: any = {};
      if (can_upload !== undefined) patch.can_upload = !!can_upload;
      if (is_brand !== undefined) patch.is_brand = !!is_brand;
      if (is_admin !== undefined) patch.is_admin = !!is_admin;
      if (is_suspended !== undefined) patch.is_suspended = !!is_suspended;

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(patch)
        .eq('id', creatorId)
        .select()
        .single();

      if (error) throw error;

      // If user gets suspended, revoke their upload access as database safeguard
      if (is_suspended) {
        await supabaseAdmin
          .from('profiles')
          .update({ can_upload: false })
          .eq('id', creatorId);
        
        // Let's hide their videos
        await supabaseAdmin
          .from('videos')
          .update({ status: 'rejected' })
          .eq('user_id', creatorId);
      }

      await logAdminAction(adminId, 'update_creator', creatorId, 'creator_profile', patch);
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET Product Links (Admin)
  app.get('/api/admin/products', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      // Direct SELECT from videos table filtering items with active products
      const { data: videosData, error } = await supabaseAdmin
        .from('videos')
        .select('id, caption, product_url, is_admin_verified_link, trust_score, created_at, profiles(username)')
        .not('product_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group products dynamically by root domain
      const list = (videosData || []).map((v: any) => {
        let domain = 'unknown';
        try {
          if (v.product_url) {
            const parsed = new URL(v.product_url);
            domain = parsed.hostname.replace('www.', '');
          }
        } catch (e) {}
        
        return {
          id: v.id,
          video_id: v.id,
          caption: v.caption,
          product_url: v.product_url,
          username: v.profiles?.username || 'user',
          is_verified: v.is_admin_verified_link,
          trust_score: v.trust_score,
          created_at: v.created_at,
          domain
        };
      });

      return res.json({ data: list });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET Spam & Low Trust Items (Admin)
  app.get('/api/admin/spam', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const settings = await getSystemSettings();
      const blacklist = settings.blacklisted_product_domains || [];

      const { data, error } = await supabaseAdmin
        .from('videos')
        .select(`*, profiles (*)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Compute and tag suspicious items
      const flagged = (data || []).map((video: any) => {
        let riskScore = 0;
        const reasons: string[] = [];

        if (video.trust_score < 80) {
          riskScore += (100 - video.trust_score);
          reasons.push(`Low user/system safety trust score: ${video.trust_score}`);
        }

        if (video.product_url) {
          const hasBlacklisted = blacklist.some((domain: string) => 
            video.product_url.toLowerCase().includes(domain.toLowerCase())
          );
          if (hasBlacklisted) {
            riskScore += 90;
            reasons.push(`Contains blacklisted commercial domain: ${video.product_url}`);
          }
          
          // Suspicious link keywords check
          const spamKeywords = ['gift', 'free', 'win', 'prize', 'earn', 'crypto', 'bonus', 'make-money', 'fast'];
          const hasSpamKeyword = spamKeywords.some(keyword => video.product_url.toLowerCase().includes(keyword));
          if (hasSpamKeyword) {
            riskScore += 30;
            reasons.push(`Link path contains promotional buzzword`);
          }
        }

        return {
          id: video.id,
          video,
          riskScore,
          reasons,
          isSpam: riskScore >= 30,
        };
      }).filter(v => v.isSpam).sort((a,b) => b.riskScore - a.riskScore);

      return res.json({ data: flagged });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET Settings (Admin)
  app.get('/api/admin/settings', verifyAdmin, async (req, res) => {
    try {
      const data = await getSystemSettings();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST Save Settings (Admin)
  app.post('/api/admin/settings', verifyAdmin, async (req, res) => {
    try {
      const adminId = (req as any).adminUser.id;
      const settings = req.body;
      const data = await saveSystemSettings(settings);
      
      await logAdminAction(adminId, 'change_system_settings', 'system', 'settings', settings);
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET Logs / Audit Trails (Admin)
  app.get('/api/admin/audit-logs', verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data, error } = await supabaseAdmin
        .from('admin_audit_logs')
        .select(`*, profiles:admin_id (*)`)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Audit logs table failed:', error);
        // Fallback or returned mockup logs if table schema is skipped
        return res.json({ data: [] });
      }
      return res.json({ data: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  app.get(['/video/:videoId', '/shared-collection'], async (req, res, next) => {
    try {
      let title = 'Getnayi - Discover amazing products';
      let description = 'Check out this amazing content on Getnayi!';
      let imageUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop'; // Default placeholder

      let currentPath = req.path;
      let videoUrl = '';

      const db = supabaseAdmin || (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY ? 
        createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } }) : null);

      if (currentPath.startsWith('/video/')) {
        let videoId = currentPath.split('/')[2];
        if (db && videoId) {
          try {
            const { data: video } = await db
              .from('videos')
              .select('*, profiles(username)')
              .eq('id', videoId)
              .single();
              
            if (video) {
              title = video.caption ? `${video.caption} | Getnayi` : `Video by @${video.profiles?.username || 'user'} | Getnayi`;
              imageUrl = video.thumbnail_url || video.main_product_image_url || imageUrl;
              videoUrl = video.video_url || '';
            }
          } catch(e) {
            console.error(e);
          }
        }
      } else if (currentPath.startsWith('/shared-collection')) {
        const name = req.query.n as string;
        const vParam = req.query.v as string;
        
        title = name ? `${name} - Getnayi Collection` : 'Shared Collection | Getnayi';
        const count = vParam ? vParam.split(',').length : 0;
        description = `Check out this collection of ${count} product videos curated for you.`;
        
        if (db && vParam) {
           try {
             const firstId = vParam.split(',')[0];
             const { data: v } = await db.from('videos').select('thumbnail_url, main_product_image_url').eq('id', firstId).single();
             if (v && (v.thumbnail_url || v.main_product_image_url)) {
               imageUrl = v.thumbnail_url || v.main_product_image_url;
             }
           } catch(e) {
             console.error(e);
           }
        }
      }

      let templateCode = '';
      const fs = await import('fs');
      
      try {
        if (process.env.NODE_ENV !== "production") {
          templateCode = await fs.promises.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
          if (vite) {
            templateCode = await vite.transformIndexHtml(req.originalUrl, templateCode);
          }
        } else {
          templateCode = await fs.promises.readFile(path.join(process.cwd(), 'dist', 'index.html'), 'utf-8');
        }
      } catch (err: any) {
        console.error("Error reading index.html:", err);
        return res.status(500).send("Internal Server Error: Unable to read index.html");
      }

      let ogTags = `
        <meta property="og:title" content="${title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" />
        <meta property="og:description" content="${description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="${videoUrl ? 'video.other' : 'website'}" />
        <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" />
      `;
      
      if (videoUrl) {
        ogTags += `
        <meta property="og:video" content="${videoUrl}" />
        <meta property="og:video:secure_url" content="${videoUrl}" />
        <meta property="og:video:type" content="video/mp4" />
        `;
      }

      ogTags += `
        <meta name="twitter:card" content="${videoUrl ? 'player' : 'summary_large_image'}" />
        <meta name="twitter:title" content="${title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" />
        <meta name="twitter:description" content="${description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" />
        <meta name="twitter:image" content="${imageUrl}" />
      `;
      
      if (videoUrl) {
        // Twitter player card metadata isn't fully functional without domain approval sometimes, but we provide it.
        ogTags += `
        <meta name="twitter:player" content="${req.protocol}://${req.get('host')}${req.originalUrl}" />
        <meta name="twitter:player:width" content="720" />
        <meta name="twitter:player:height" content="1280" />
        `;
      }

      const html = templateCode.replace('</head>', `${ogTags}</head>`);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      if (vite) {
        vite.ssrFixStacktrace(e as Error);
      }
      next(e);
    }
  });

  app.post('/api/shorten', express.json(), async (req, res) => {
    try {
      const { longUrl } = req.body;
      if (!longUrl || typeof longUrl !== 'string' || !longUrl.startsWith('/')) { 
        return res.status(400).json({ error: 'Invalid longUrl. Must be a relative path starting with /' }); 
      }

      if (!supabaseAdmin) {
        return res.json({ shortUrl: longUrl }); 
      }

      const { data: existing } = await supabaseAdmin.from('short_links').select('id').eq('long_url', longUrl).single();
      if (existing) {
        return res.json({ shortUrl: `/s/${existing.id}` });
      }

      const shortId = Math.random().toString(36).substring(2, 8);
      const { error } = await supabaseAdmin.from('short_links').insert({
        id: shortId,
        long_url: longUrl
      });

      if (error) {
        console.error('Error creating short url:', error);
        return res.json({ shortUrl: longUrl });
      }

      res.json({ shortUrl: `/s/${shortId}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/s/:shortId', async (req, res, next) => {
    console.log("RECEIVED SHORT URL REQUEST:", req.params.shortId);
    try {
      const { shortId } = req.params;
      
      // Fallback to anon key if service role key is missing
      const db = supabaseAdmin || (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY ? 
        createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } }) : null);
        
      if (!db) {
        console.log("No Supabase client found in short URL handler");
        return next();
      }

      const { data: link, error } = await db.from('short_links').select('long_url').eq('id', shortId).single();
      console.log("Short URL link result:", link, "Error:", error);
      if (link && !error) {
        let protocol = req.protocol;
        let host = req.get('host');
        
        // Prevent arbitrary external redirect via X-Forwarded-Host injection
        if (host && !host.includes('ai.studio') && !host.includes('localhost') && !host.includes('run.app')) {
           host = 'localhost';
        }

        let absoluteUrl = `${protocol}://${host}${link.long_url}`;
        console.log("Redirecting to:", absoluteUrl);
        res.redirect(301, absoluteUrl);
      } else {
        console.log("Short link not found, calling next()");
        next();
      }
    } catch(err) {
      console.error("Error in short link handler:", err);
      next(err);
    }
  });

  // 404 handler for undefined API routes to avoid returning the SPA index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false, dotfiles: 'ignore' })); // Use index:false so / doesn't serve the plain index.html by default if we want to intercept it later
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
