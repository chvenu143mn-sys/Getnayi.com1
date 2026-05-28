import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import validator from 'validator';
import https from 'https';
import http from 'http';
import dotenv from 'dotenv';
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

// Upstash Redis setup
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

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
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

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Apply globally to standard API routes to prevent abuse (e.g. DDOS / brute forcing)
  app.use('/api', rateLimitMiddleware);

  // New highly cached / buffered route for views using Redis
  // Prevents direct Postgres hammering for viral videos
  app.post('/api/videos/:videoId/view', async (req, res) => {
    try {
      const { videoId } = req.params;
      const { session_token } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const token = session_token || ip;

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

      // Mark as viewed under this session token for 24 hours
      await redis.set(viewCheckKey, "1", { ex: 86400 });

      // 2. Increment view buffer (flushed in background worker to Postgres)
      await redis.hincrby('video_views_buffer', videoId, 1);

      // 3. Increment direct read-only cache of views for low latency UI updates
      const updatedViewsCount = await redis.incr(`video_view_cache:${videoId}`);

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
    if (!process.env.UPSTASH_REDIS_REST_URL) return;
    try {
      const viewsBuffer = await redis.hgetall('video_views_buffer') as Record<string, number>;
      if (viewsBuffer && Object.keys(viewsBuffer).length > 0) {
        // Clear the buffer in Redis immediately
        await redis.del('video_views_buffer');
        
        // Push batch to postgres...
        console.log('[Worker] Flushing views from Redis to Postgres:', viewsBuffer);
        
        if (supabaseAdmin) {
          const promises = [];
          for (const [videoId, countVal] of Object.entries(viewsBuffer)) {
             const count = Number(countVal);
             if (!isNaN(count) && count > 0) {
               // Since our RPC increments by 1, we call it 'count' times.
               // It's atomic and prevents read-modify-write race conditions.
               for (let i = 0; i < count; i++) {
                 promises.push(supabaseAdmin.rpc('increment_video_views', { 
                   video_id_param: videoId,
                   session_token_param: `buffered_${Math.random().toString(36).substring(2)}${Date.now()}${i}` 
                 }));
               }
             }
          }
          if (promises.length > 0) {
            await Promise.all(promises);
            console.log(`[Worker] Successfully flushed ${promises.length} view increments.`);
          }
        } else {
          console.warn('[Worker] SUPABASE_SERVICE_ROLE_KEY not configured. Discarding buffered views.');
        }
      }
    } catch (e) {
      console.error('[Worker] Error flushing Redis views', e);
    }
  }, 10000);

  // Upload Image to Bunny Edge Storage
  app.post('/api/bunny/upload-image', async (req, res) => {
    try {
      let zoneName = process.env.BUNNY_STORAGE_ZONE_NAME || '';
      const password = process.env.BUNNY_STORAGE_PASSWORD;
      const pullZone = process.env.BUNNY_STORAGE_PULL_ZONE;
      let hostname = process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com';

      // Clean zoneName in case user pasted the full URL like https://storage.bunnycdn.com/tapbuy-images
      if (zoneName.includes('/')) {
        zoneName = zoneName.split('/').filter(Boolean).pop() || zoneName;
      }
      
      // Clean hostname in case user pasted a URL
      if (hostname.includes('://')) {
        hostname = new URL(hostname).hostname;
      }

      if (!zoneName || !password || !pullZone) {
        return res.status(500).json({ error: 'Bunny edge storage configuration is missing' });
      }

      const { imageBase64, filename } = req.body;
      if (!imageBase64 || !filename) {
        return res.status(400).json({ error: 'Image data and filename are required' });
      }

      // Convert base64 to buffer
      // Expected format: data:image/jpeg;base64,...
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const fileExt = path.extname(filename) || '.jpg';
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;

      let pz = pullZone.endsWith('/') ? pullZone.slice(0, -1) : pullZone;
      if (!pz.startsWith('http')) pz = `https://${pz}`;

      const regions = [
        hostname, // Try the configured one first
        'storage.bunnycdn.com',
        'ny.storage.bunnycdn.com',
        'la.storage.bunnycdn.com',
        'sg.storage.bunnycdn.com',
        'syd.storage.bunnycdn.com',
        'uk.storage.bunnycdn.com',
        'br.storage.bunnycdn.com',
        'jh.storage.bunnycdn.com'
      ];

      // Remove duplicates
      const uniqueRegions = [...new Set(regions)];

      let lastError = null;
      let success = false;
      let usedHost = '';

      for (const regionHost of uniqueRegions) {
        const url = `https://${regionHost}/${zoneName}/avatars/${uniqueFilename}`;
        console.log(`[Bunny Upload] Attempting to upload to: ${url}`);
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'AccessKey': password,
            'Content-Type': 'application/octet-stream',
          },
          body: buffer
        });

        if (response.ok) {
          success = true;
          usedHost = regionHost;
          console.log(`[Bunny Upload] Successfully uploaded to: ${url}`);
          break;
        } else {
          lastError = { status: response.status, text: await response.text() };
          console.error(`[Bunny Upload] Failed at ${url}. Status: ${lastError.status}. Error: ${lastError.text}`);
          // If it's 401, it might be wrong region if it's edge storage, continue
        }
      }

      if (!success) {
         if (lastError?.status === 401) {
             throw new Error(`Failed to upload to Bunny Storage: {"HttpCode":401,"Message":"Unauthorized"} (Verify your BUNNY_STORAGE_PASSWORD is the FTP/Storage Zone Password, not the Account API Key)`);
         }
         throw new Error(`Failed to upload to Bunny Storage: ${JSON.stringify(lastError)}`);
      }

      const publicUrl = `${pz}/avatars/${uniqueFilename}`;

      res.json({ success: true, url: publicUrl });

    } catch (error: any) {
      console.error('Image Upload Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 1. Create Video
  app.post('/api/bunny/create', async (req, res) => {
    try {
      const libraryId = process.env.BUNNY_LIBRARY_ID;
      const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
      const deliveryHostname = process.env.BUNNY_DELIVERY_HOSTNAME;

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

  // Delete Video
  app.delete('/api/bunny/delete/:videoId', async (req, res) => {
    try {
      const libraryId = process.env.BUNNY_LIBRARY_ID;
      const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
      const videoId = req.params.videoId;

      if (!libraryId || !apiKey) {
        return res.status(500).json({ error: 'Bunny configuration is missing' });
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

  // Create Video logic in DB
  app.post('/api/link-preview', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || !validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true })) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      
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

  app.post('/api/videos', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
          return res.status(401).json({ error: 'Unauthorized. Please log in.' });
      }

      // Upload rate limit (5 per hour)
      if (process.env.UPSTASH_REDIS_REST_URL) {
         const tokenMatch = authHeader.match(/Bearer (.+)/);
         if (tokenMatch) {
             const key = `upload_limit:${tokenMatch[1]}`;
             const current = await redis.incr(key);
             if (current === 1) {
                 await redis.expire(key, 3600); // 1 hour
             }
             if (current > 5) {
                 return res.status(429).json({ error: 'You have reached the upload limit of 5 videos per hour. Please try again later.' });
             }
         }
      }

      const { 
        video_url, thumbnail_url, main_product_image_url, 
        caption, product_url, real_life_image_url, is_verified_real, force_unverified_url, category_id
      } = req.body;

      if (!product_url) {
          return res.status(400).json({ error: 'Product URL is required' });
      }

      // Automatically prepend https:// to the incoming product_url if it does not have a protocol
      let cleanProductUrl = product_url.trim();
      if (!/^https?:\/\//i.test(cleanProductUrl)) {
         cleanProductUrl = 'https://' + cleanProductUrl;
      }

      if (!validator.isURL(cleanProductUrl, { protocols: ['http', 'https'], require_protocol: true })) {
        return res.status(400).json({ error: 'Invalid URL format. Please enter a valid product page link.' });
      }

      let url;
      try {
        url = new URL(cleanProductUrl);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid URL schema' });
      }

      if (url.protocol !== 'https:') {
         return res.status(400).json({ error: 'Only HTTPS URLs are allowed for products.' });
      }
      
      const pathname = url.pathname.toLowerCase();
      const blockedExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.zip', '.rar', '.mp3', '.wav'];
      if (blockedExtensions.some(ext => pathname.endsWith(ext))) {
         return res.status(400).json({ error: 'This must be a valid product page link, not a media file.' });
      }

      const hostname = url.hostname.toLowerCase();
      const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      if (hostname === 'localhost' || hostname === '127.0.0.1' || isIpAddress) {
         return res.status(400).json({ error: 'Local or IP addresses are not allowed.' });
      }

      let status = 'active';

      const knownMarketplaces = ['amazon', 'flipkart', 'myntra', 'shopify', 'ajio', 'meesho', 'nykaa', 'tatacliq', 'snapdeal', 'ebay', 'etsy', 'aliexpress', 'zara', 'hm', 'nike', 'adidas', 'puma', 'macys', 'walmart', 'target', 'bestbuy', 'apple', 'samsung'];
      const isMarketplace = knownMarketplaces.some(mp => hostname.includes(mp));
      const isProductPath = ['/p/', '/product/', '/item/', '/dp/', '/buy/'].some(p => pathname.includes(p));
      const looksLikeProductUrl = isMarketplace || isProductPath;

      if (!looksLikeProductUrl && !force_unverified_url) {
          return res.status(400).json({ 
              error: 'URL_NOT_MARKETPLACE', 
              message: 'Link doesn\'t look like an e-commerce platform.' 
          });
      }

      if (!looksLikeProductUrl && force_unverified_url) {
          status = 'pending_review';
      }

      const safeProductUrl = url.toString();

      // Check auth via supabase anon key but using their JWT
      const authSupabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: authError } = await authSupabase.auth.getUser();

      if (authError || !user) {
         return res.status(401).json({ error: 'Unauthorized user credentials' });
      }

      if (!supabaseAdmin) {
        // Fallback to inserting with user's client if admin not available
        const { data, error } = await authSupabase.from('videos').insert({
          user_id: user.id,
          video_url,
          ...(thumbnail_url ? { thumbnail_url } : {}),
          ...(main_product_image_url ? { main_product_image_url } : {}),
          caption,
          product_url: safeProductUrl,
          ...(real_life_image_url ? { real_life_image_url, is_verified_real } : {}),
          ...(category_id ? { category_id } : {}),
        }).select().single();

        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true, data, status: 'active (fallback)' });
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
  app.post(['/api/user/revoke-and-reset', '/api/user/grant-and-approve'], async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Database Admin client not configured' });
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

  app.get('/api/admin/applications', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
      const token = authHeader.split(' ')[1];
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) throw new Error('Unauthorized');

      const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!profile?.is_admin) throw new Error('Forbidden');

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

  app.put('/api/admin/applications/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
      const token = authHeader.split(' ')[1];
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) throw new Error('Unauthorized');
      
      const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!profile?.is_admin) throw new Error('Forbidden');

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

      return res.json({ success: true, data });
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
        <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
        <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="${videoUrl ? 'video.other' : 'website'}" />
        <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}" />
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
        <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
        <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
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
      if (!longUrl) return res.status(400).json({ error: 'Missing longUrl' });

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
        let protocol = req.headers['x-forwarded-proto'] || req.protocol;
        let host = req.headers['x-forwarded-host'] || req.get('host');
        
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false })); // Use index:false so / doesn't serve the plain index.html by default if we want to intercept it later
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
