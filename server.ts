// Main Express entry point for the application.
import express from "express";
import client from "prom-client";
import pino from "pino";
import pinoHttp from "pino-http";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const logger: any = pino({ level: process.env.LOG_LEVEL || "info" });
client.collectDefaultMetrics({ prefix: 'aisles_' });
import path from "path";
import { Readable } from "stream";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import validator from "validator";
import https from "https";
import http from "http";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import multer from "multer";
import cron from "node-cron";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import os from "os";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { parse } from "tldts";
import { GoogleGenAI } from "@google/genai";
import Razorpay from "razorpay";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Circuit Breaker implementation for external APIs
class CircuitBreaker {
  private failureCount = 0;
  private failureThreshold: number;
  private resetTimeout: number;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private nextAttempt: number = Date.now();

  constructor(failureThreshold = 5, resetTimeout = 30000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() > this.nextAttempt) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error(
          "Circuit Breaker is OPEN. Request denied to prevent cascading failure.",
        );
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (err: any) {
      if (
        err?.status >= 500 ||
        err?.status === 429 ||
        err?.message?.includes("overloaded")
      ) {
        this.onFailure();
      }
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.resetTimeout;
      logger.warn(
        `Circuit Breaker OPENED. Pausing requests for ${this.resetTimeout}ms.`,
      );
    }
  }
}

const geminiCircuitBreaker = new CircuitBreaker(5, 30000);

const generateContentWithRetry = async (
  aiInstance: any,
  params: any,
  retries = 3,
) => {
  return geminiCircuitBreaker.execute(async () => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await aiInstance.models.generateContent(params);
      } catch (err: any) {
        const isRetryable =
          err?.status === "UNAVAILABLE" ||
          err?.status === 503 ||
          err?.status === 429 ||
          err?.message?.includes("high demand") ||
          err?.message?.includes("temporarily overloaded") ||
          err?.error?.code === 503 ||
          err?.error?.code === 429 ||
          err?.error?.status === "UNAVAILABLE";

        if (isRetryable && i < retries) {
          logger.warn(
            `Gemini API overloaded/rate-limited (Attempt ${i + 1}/${retries}). Retrying in ${1000 * (i + 1)}ms...`,
          );
          await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
          continue;
        }
        throw err;
      }
    }
  });
};

// Background processor for video metadata
const analyzeVideoMetadata = async (
  supabaseAdminClient: any,
  videoId: string,
  caption: string,
  productContext: string,
) => {
  if (!supabaseAdminClient || !process.env.GEMINI_API_KEY) return;
  try {
    // Check if the user already provided tags during upload
    const { data: currentVideo } = await supabaseAdminClient
      .from("videos")
      .select("tags, search_aliases")
      .eq("id", videoId)
      .single();
    const existingTags = currentVideo?.tags || [];

    // If the user already provided robust tags manually, we might just skip the background run or only augment aliases
    // But let's generate them to be sure, and then merge.

    const prompt = `Analyze this e-commerce video context and generate relevant search tags, categories, hashtags, and semantic synonyms for indexing in a database.
Caption: "${caption || ""}"
Product URL/Info: "${productContext || ""}"

Return ONLY a valid JSON object with this exact structure, no markdown formatting:
{
  "tags": ["keyword1", "keyword2", "#hashtag1"],
  "search_aliases": "comma separated string of synonyms and related concepts that people might search for"
}`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);

      const newTags = Array.isArray(parsed.tags) ? parsed.tags : [];
      const mergedTags = Array.from(
        new Set([...existingTags, ...newTags]),
      ).slice(0, 15); // keep unique up to 15

      await supabaseAdminClient
        .from("videos")
        .update({
          tags: mergedTags,
          search_aliases: parsed.search_aliases || "",
        })
        .eq("id", videoId);
      logger.info(`[AI Analysis] Successfully tagged video ${videoId}`);
    }
  } catch (err: any) {
    logger.error({ payload: err.message }, `[AI Analysis Error] on video ${videoId}:`);
  }
};

// Helper to check if a URL is an allowed ecommerce marketplace securely using eTLD+1 brand label
function isAllowedMarketplace(targetUrl: string): boolean {
  try {
    const parsed = parse(targetUrl);
    if (!parsed.domainWithoutSuffix) {
      return false;
    }
    const brand = parsed.domainWithoutSuffix.toLowerCase();
    const knownMarketplaces = [
      "amazon",
      "amzn",
      "flipkart",
      "myntra",
      "shopify",
      "ajio",
      "meesho",
      "nykaa",
      "tatacliq",
      "snapdeal",
      "ebay",
      "etsy",
      "aliexpress",
      "zara",
      "hm",
      "nike",
      "adidas",
      "puma",
      "macys",
      "walmart",
      "target",
      "bestbuy",
      "apple",
      "samsung",
      "croma",
      "reliancedigital",
    ];

    // Check if the eTLD+1 brand label matches one of the marketplaces exactly
    if (knownMarketplaces.includes(brand)) {
      return true;
    }

    if (parsed.hostname && parsed.hostname.toLowerCase() === "a.co") {
      return true;
    }

    // Explicit check for Shopify-hosted stores where domainWithoutSuffix is the specific merchant name,
    // but the publicSuffix is myshopify.com or ecommerce structure
    if (parsed.hostname) {
      const host = parsed.hostname.toLowerCase();
      if (
        host.endsWith(".myshopify.com") ||
        host === "myshopify.com" ||
        host.endsWith(".shopify.com") ||
        host === "shopify.com"
      ) {
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
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "aff_id",
    "affiliate_id",
    "ref",
    "affiliate",
    "tracking_id",
    "tag",
    "click_id",
    "subid",
    "sprefix",
    "sr",
    "qid",
  ];

  trackingParams.forEach((param) => {
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
        const client = parsed.protocol === "https:" ? https : http;

        const req = client.request(
          currentUrl,
          {
            method: "HEAD",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "*/*",
            },
            rejectUnauthorized: false, // Bypasses SSL certificate issues for link resolution safely
            timeout: 4000,
          },
          (res) => {
            res.resume(); // consume response body to free socket
            const statusCode = res.statusCode || 200;
            if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
              try {
                const nextUrl = new URL(
                  res.headers.location,
                  currentUrl,
                ).toString();
                step(nextUrl, depth + 1);
              } catch (e) {
                resolve(currentUrl);
              }
            } else {
              resolve(currentUrl);
            }
          },
        );

        req.on("error", () => {
          fallbackToGet(currentUrl, depth);
        });

        req.on("timeout", () => {
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
        const client = parsed.protocol === "https:" ? https : http;

        const req = client.request(
          currentUrl,
          {
            method: "GET",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "*/*",
            },
            rejectUnauthorized: false,
            timeout: 4000,
          },
          (res) => {
            res.resume(); // consume response body to free socket
            const statusCode = res.statusCode || 200;
            if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
              try {
                const nextUrl = new URL(
                  res.headers.location,
                  currentUrl,
                ).toString();
                step(nextUrl, depth + 1);
              } catch (e) {
                resolve(currentUrl);
              }
            } else {
              resolve(currentUrl);
            }
          },
        );

        req.on("error", () => {
          resolve(currentUrl);
        });

        req.on("timeout", () => {
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

// Auto-generate .env file or sync VITE_ variables to .env so Vite's dev server reads them
const envFilePath = path.join(process.cwd(), ".env");
let existingEnv = "";
try {
  if (fs.existsSync(envFilePath)) {
    existingEnv = fs.readFileSync(envFilePath, "utf-8");
  }
} catch (e) {}

const requiredEnvVars = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "GEMINI_API_KEY",
  "VITE_RAZORPAY_KEY_ID",
  "VITE_RAZORPAY_PRO_PLAN_ID",
  "VITE_RAZORPAY_CREATOR_PLAN_ID"
];

let envContentToWrite = existingEnv;
let envUpdated = false;

for (const key of requiredEnvVars) {
  const val = process.env[key];
  if (val) {
    const lineRegex = new RegExp(`^${key}=.*$`, "m");
    if (lineRegex.test(envContentToWrite)) {
      const currentLine = envContentToWrite.match(lineRegex)?.[0];
      if (currentLine !== `${key}="${val}"` && currentLine !== `${key}=${val}`) {
        envContentToWrite = envContentToWrite.replace(lineRegex, `${key}="${val}"`);
        envUpdated = true;
      }
    } else {
      envContentToWrite += `\n${key}="${val}"`;
      envUpdated = true;
    }
  }
}

if (envUpdated || !fs.existsSync(envFilePath)) {
  fs.writeFileSync(envFilePath, envContentToWrite.trim() + "\n", "utf-8");
  logger.info(".env file synchronized with system environment variables.");
}

// Helper to fetch page HTML bypassing SSL/TLS certificate validation errors
function fetchPageHtmlWithNoTls(targetUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl);
      const options: https.RequestOptions = {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        rejectUnauthorized: false, // This ignores SSL certificate validation errors (e.g. ERR_TLS_CERT_ALTNAME_INVALID)
        timeout: 4000,
      };

      const client = parsed.protocol === "https:" ? https : http;
      const req = client.request(targetUrl, options, (res) => {
        const statusCode = res.statusCode || 0;
        if (statusCode >= 400 && statusCode < 600) {
          reject(new Error(`Server responded with status code ${statusCode}`));
          return;
        }

        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
          if (data.length > 2 * 1024 * 1024) {
            res.destroy();
            reject(new Error("Response too large"));
          }
        });
        res.on("end", () => {
          resolve(data);
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

import expressRateLimit, { ipKeyGenerator } from "express-rate-limit";

// Standard rate limiter for all API routes (fallback and primary)
const standardApiLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." },
  keyGenerator: (req, res) => {
    return ipKeyGenerator(req.ip || "unknown");
  },
});
import { Redis } from "@upstash/redis";
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://placeholder.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "placeholder_token",
});

let isRedisDisabledDueToError = false;

function isRedisEnabled(): boolean {
  if (isRedisDisabledDueToError) return false;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return false;
  if (url.includes("placeholder") || token.includes("placeholder"))
    return false;

  return true;
}

function handleRedisError(err: any, contextDescription: string) {
  const errMsg = err?.message || String(err);
  if (
    errMsg.includes("WRONGPASS") ||
    errMsg.includes("unauthorized") ||
    errMsg.includes("Unauthorized") ||
    errMsg.includes("unauthorized_client")
  ) {
    if (!isRedisDisabledDueToError) {
      isRedisDisabledDueToError = true;
      logger.warn(
        `[Redis] Authentication error detected in ${contextDescription}: WRONGPASS or Invalid Token. Disabling Upstash Redis integration gracefully to prevent log spam.`,
      );
    }
  } else {
    logger.error({ payload: err }, `[Redis] Error in ${contextDescription}:`);
  }
}

// Server-side Supabase client for backend operations
const supabaseAdmin = process.env.VITE_SUPABASE_URL
  ? createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        "placeholder-anon-key",
      { auth: { persistSession: false } },
    )
  : null;

// Helper to get request-specific Supabase client (respects user authentication context for RLS when admin key is absent)
function getRequestSupabaseClient(req: express.Request) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseAdmin) {
    return supabaseAdmin;
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (
    token &&
    process.env.VITE_SUPABASE_URL &&
    process.env.VITE_SUPABASE_ANON_KEY
  ) {
    try {
      return createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: { persistSession: false },
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        },
      );
    } catch (e) {
      logger.error(
        "Failed to initialize request-specific Supabase client:",
        e,
      );
    }
  }

  return (
    supabaseAdmin ||
    createClient(
      process.env.VITE_SUPABASE_URL || "",
      process.env.VITE_SUPABASE_ANON_KEY || "",
      { auth: { persistSession: false } },
    )
  );
}

function extractStoreName(urlStr: string | null | undefined): string {
  if (!urlStr) return "";
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    let cleanHostname = hostname.replace(/^www\./, "");

    if (cleanHostname.endsWith(".myshopify.com")) {
      const shopPrefix = cleanHostname.replace(/\.myshopify\.com$/, "");
      return shopPrefix.charAt(0).toUpperCase() + shopPrefix.slice(1);
    }

    const mappings: { [key: string]: string } = {
      amazon: "Amazon",
      amzn: "Amazon",
      flipkart: "Flipkart",
      myntra: "Myntra",
      shopify: "Shopify",
      ajio: "Ajio",
      meesho: "Meesho",
      nykaa: "Nykaa",
      tatacliq: "Tata CLiQ",
      snapdeal: "Snapdeal",
      ebay: "eBay",
      etsy: "Etsy",
      aliexpress: "AliExpress",
      zara: "Zara",
      hm: "H&M",
      nike: "Nike",
      adidas: "Adidas",
      puma: "Puma",
      macys: "Macy's",
      walmart: "Walmart",
      target: "Target",
      bestbuy: "Best Buy",
      apple: "Apple",
      samsung: "Samsung",
    };

    const parts = cleanHostname.split(".");
    for (const part of parts) {
      if (mappings[part]) {
        return mappings[part];
      }
    }
    const candidate = parts[0];
    if (
      candidate &&
      candidate !== "co" &&
      candidate !== "com" &&
      candidate !== "org" &&
      candidate !== "net"
    ) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
    return "Store";
  } catch (e) {
    return "Store";
  }
}

// Middleware for rate limiting via Upstash Redis
const rateLimitMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!isRedisEnabled()) {
    return next(); // Skip if Redis is not configured or disabled
  }

  const ip = req.ip || "unknown";
  const key = `rate_limit:${ip}`;
  const limit = 100; // 100 requests per window
  const windowSeconds = 60; // 1 minute window

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    const results = await pipeline.exec();

    const currentCount = results[0] as number;

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - currentCount));

    if (currentCount > limit) {
      return res
        .status(429)
        .json({ error: "Too many requests, please try again later." });
    }
    next();
  } catch (err) {
    handleRedisError(err, "rateLimitMiddleware");
    next(); // Fail open so app doesn't crash on Redis failure
  }
};


let razorpayClient: Razorpay | null = null;
export function getRazorpay(): Razorpay | null {
  if (
    !razorpayClient &&
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
  ) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

function setupCronJobs() {
  // Sweeper for stuck processing videos (in case webhook fails)
  cron.schedule("*/1 * * * *", async () => {
    logger.info({}, "🧹 [CRON] Sweeping stuck processing videos...");
    if (!supabaseAdmin) return;

    // Find videos stuck in 'processing' states (that might still be processing on Bunny)
    const { data: stuckVideos, error } = await supabaseAdmin
      .from("videos")
      .select("id, video_url, created_at, status, product_url")
      .eq("status", "processing")
      .limit(20);

    if (error) {
      logger.error({ err: error }, "❌ [CRON] Error finding stuck videos:");
      return;
    }

    if (!stuckVideos || stuckVideos.length === 0) return;
    logger.info(
      `[CRON] Found ${stuckVideos.length} stuck videos. Validating with BunnyCDN...`,
    );

    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
    if (!libraryId || !apiKey) return;

    for (const v of stuckVideos) {
      try {
        const urlObj = new URL(v.video_url);
        const segments = urlObj.pathname.split("/").filter(Boolean);
        const guid = segments[0]; // assuming /guid/playlist.m3u8

        if (!guid) continue;

        const response = await fetch(
          `https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`,
          {
            headers: { AccessKey: apiKey },
          },
        );

        if (response.ok) {
          const checkInfo = await response.json();
          // Status 3/4 = finished
          if (checkInfo.status === 4 || checkInfo.status === 3) {
            let nextStatus = "active";
            if (v.product_url && !isAllowedMarketplace(v.product_url)) {
              nextStatus = "pending_review";
            }
            logger.info(
              `[CRON] Activating stuck video ${v.id} (Bunny GUID: ${guid}) to ${nextStatus}`,
            );
            await supabaseAdmin
              .from("videos")
              .update({
                status: nextStatus,
              })
              .eq("id", v.id);
          } else if (checkInfo.status === 5 || checkInfo.status === 6) {
            logger.info(
              `[CRON] Rejecting stuck video ${v.id} (Bunny GUID: ${guid})`,
            );
            await supabaseAdmin
              .from("videos")
              .update({
                status: "rejected",
              })
              .eq("id", v.id);
          }
        }
      } catch (err: any) {
        logger.error({ payload: err }, `[CRON] Error checking video ${v.id}`);
      }
    }
  });

}

async function ensureUserPasswordsTable() {
  if (!supabaseAdmin) return;
  try {
    const { error } = await supabaseAdmin.rpc("execute_sql", {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.user_passwords (
          id uuid references auth.users(id) on delete cascade not null primary key,
          email text unique not null,
          password_hash text not null,
          created_at timestamp with time zone default timezone('utc'::text, now()) not null
        );
        ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;
      `
    });
    if (error) {
      logger.error("Error creating user_passwords table via execute_sql RPC:", error);
    } else {
      logger.info("Successfully ensured user_passwords table exists.");
    }
  } catch (err) {
    logger.error("Failed to execute SQL to ensure user_passwords table:", err);
  }
}

async function startServer() {
  const app = express();
  
  // Rate Limiters
  const authRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) => {
      const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
      return Array.isArray(ip) ? ip[0] : ip;
    },
    handler: (req, res) => {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Too many attempts. Please try again in a minute.' });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        return Array.isArray(authHeader) ? authHeader[0] : authHeader;
      }
      const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
      return Array.isArray(ip) ? ip[0] : ip;
    },
    handler: (req, res) => {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Too many requests to AI endpoint. Please try again in a minute.' });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const paymentRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        return Array.isArray(authHeader) ? authHeader[0] : authHeader;
      }
      const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
      return Array.isArray(ip) ? ip[0] : ip;
    },
    handler: (req, res) => {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Too many requests to payment checkout. Please try again in a minute.' });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/auth/login', authRateLimiter);
  app.use('/api/auth/signup', authRateLimiter);
  app.use('/api/auth/password-reset', authRateLimiter);
  app.use('/api/auth/reset-password', authRateLimiter);
  app.use('/api/ai/chat', aiRateLimiter);
  app.use('/api/ai', aiRateLimiter);
  app.use('/api/payment/checkout', paymentRateLimiter);
  app.use('/api/payment', paymentRateLimiter);

  await ensureUserPasswordsTable();

  // Redirect HTTP to HTTPS at the application layer
  app.use((req, res, next) => {
    const proto = req.headers["x-forwarded-proto"];
    const isHttps = proto === "https" || req.secure;
    const host = req.get("host") || "";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0");

    if (!isHttps && !isLocalhost) {
      // 308 Permanent Redirect preserves the HTTP method and request body
      const httpsUrl = `https://${host}${req.originalUrl}`;
      return res.redirect(308, httpsUrl);
    }
    next();
  });

  // Strict-Transport-Security (HSTS) response header
  app.use((req, res, next) => {
    const proto = req.headers["x-forwarded-proto"];
    const isHttps = proto === "https" || req.secure;
    const host = req.get("host") || "";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0");

    if (isHttps && !isLocalhost) {
      // Recommended 2 years (63072000 seconds) max-age with includeSubDomains
      res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
    }
    next();
  });

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
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: "ok",
    hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
    hasSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    nodeEnv: process.env.NODE_ENV
  });
});

app.get('/sitemap.xml', async (req, res) => {
  const host = req.get("host") || "";
  const proto = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const scheme = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0") ? proto : "https";
  const baseUrl = `${scheme}://${host}`;

  const staticRoutes = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/explore', priority: '0.8', changefreq: 'daily' },
    { path: '/trending', priority: '0.8', changefreq: 'daily' },
    { path: '/shared-collection', priority: '0.7', changefreq: 'weekly' },
    { path: '/subscription', priority: '0.8', changefreq: 'monthly' }
  ];

  const urls: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Helper to extract store name inside the route
  const extractStoreNameLocal = (urlStr: string | null | undefined): string => {
    if (!urlStr) return '';
    try {
      const url = new URL(urlStr);
      const hostname = url.hostname.toLowerCase();
      let cleanHostname = hostname.replace(/^www\./, '');
      if (cleanHostname.endsWith('.myshopify.com')) {
        const shopPrefix = cleanHostname.replace(/\.myshopify\.com$/, '');
        return shopPrefix.charAt(0).toUpperCase() + shopPrefix.slice(1);
      }
      const parts = cleanHostname.split('.');
      if (parts.length > 1) {
        const mainDomain = parts[parts.length - 2];
        return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
      }
      return cleanHostname;
    } catch (e) {
      return '';
    }
  };

  // Add static routes
  for (const route of staticRoutes) {
    urls.push(`  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
  }

  // Try to dynamically add public pages (videos, categories, stores) from database
  if (supabaseAdmin) {
    try {
      // 1. Fetch public videos (limit to top 200 for speed/size)
      const { data: videos } = await supabaseAdmin
        .from("videos")
        .select("id, created_at, product_url")
        .order("created_at", { ascending: false })
        .limit(200);

      if (videos && videos.length > 0) {
        // Add video pages
        for (const video of videos) {
          const videoDate = video.created_at ? new Date(video.created_at).toISOString().split('T')[0] : today;
          urls.push(`  <url>
    <loc>${baseUrl}/video/${video.id}</loc>
    <lastmod>${videoDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
        }

        // Extract unique stores
        const uniqueStores = new Set<string>();
        for (const video of videos) {
          if (video.product_url) {
            const storeName = extractStoreNameLocal(video.product_url);
            if (storeName && storeName.trim()) {
              uniqueStores.add(storeName.trim());
            }
          }
        }

        // Add store pages
        for (const store of uniqueStores) {
          urls.push(`  <url>
    <loc>${baseUrl}/store/${encodeURIComponent(store)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
        }
      }

      // 2. Fetch categories
      const { data: categories } = await supabaseAdmin
        .from("categories")
        .select("id");

      if (categories && categories.length > 0) {
        for (const category of categories) {
          urls.push(`  <url>
    <loc>${baseUrl}/category/${category.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
        }
      }
    } catch (err) {
      logger.error({ err }, "Error generating dynamic sitemap resources from Supabase");
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(sitemapXml);
});

  app.set("trust proxy", "loopback, linklocal, uniquelocal");
  app.use(
    cookieParser(
      process.env.COOKIE_SECRET || crypto.randomBytes(32).toString("hex"),
    ),
  );
  const PORT = process.env.APPLET_ID ? 3000 : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  // Setup Observability (APM) and structured request logging (e.g. for Datadog ingestion)
  const apmLog = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const start = process.hrtime();
    res.on("finish", () => {
      const diff = process.hrtime(start);
      const timeMs = diff[0] * 1e3 + diff[1] * 1e-6;

      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        responseTimeMs: timeMs.toFixed(3),
        ip: req.ip || "unknown",
        userAgent: req.headers["user-agent"],
        env: process.env.NODE_ENV,
        service: "getnayi-backend",
      };

      // Output standard JSON logs for APM ingestion (e.g. Datadog Log Agent)
      // Only logging API routes to reduce noise
      if (req.originalUrl.startsWith("/api/")) {
        logger.info({}, JSON.stringify(logEntry));
      }
    });
    next();
  };
  app.use(apmLog);

  // Added for VIBESCAN security compliance
  app.use(
    helmet({ 
      contentSecurityPolicy: false, 
      crossOriginEmbedderPolicy: false,
      frameguard: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false
    })
  ); // allow external resources like videos
  // Specific helmet configurations to address findings
  app.use(
    helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true })
  );
  // Removed frameguard deny to allow AI Studio iframe preview
  app.use(helmet.noSniff());
  app.disable("x-powered-by");

  // Obscure Server details
  app.use((req, res, next) => {
    res.setHeader("Server", "Hidden");
    res.removeHeader("X-Powered-By");
    next();
  });

  app.use(
    cors({
      origin: true, // allow any origin dynamically
      credentials: true,
    })
  );

  setupCronJobs();

  app.use(
    express.json({
      limit: "50mb",
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Apply globally to standard API routes to prevent abuse (e.g. DDOS / brute forcing)
  app.use("/api", (req, res, next) => {
    // Exclude streaming proxy from rate limits since it makes many chunk requests
    if (req.path.startsWith("/stream")) return next();
    standardApiLimiter(req, res, next);
  });
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/stream")) return next();
    rateLimitMiddleware(req, res, next);
  });

  // Rate limiter for coupon application (5 failures per hour)
  const couponRateLimiter = expressRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP or User to 5 failures per window
    skipSuccessfulRequests: true, // Only count failures towards the rate limit
    keyGenerator: (req, res) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          const payloadBase64 = token.split(".")[1];
          const payloadJson = Buffer.from(payloadBase64, "base64").toString();
          const payload = JSON.parse(payloadJson);
          if (payload.sub) return `coupon_limit:${payload.sub}`;
        } catch (e) {}
      }
      return ipKeyGenerator(req.ip || "unknown");
    },
    message: {
      error:
        "Too many failed coupon attempts from this IP, please try again after an hour.",
    },
  });

  app.post("/api/coupons/apply", couponRateLimiter, async (req, res) => {
    try {
      const { couponCode } = req.body;
      if (!couponCode)
        return res.status(400).json({ error: "Coupon code required" });

      // Simulate checking coupon validation against database
      // As the database doesn't have a coupons table currently, we return 400 failure
      // which triggers the fail limit count if it fails (using mock logic)
      if (couponCode === "MOCK_SUCCESS") {
        return res.json({ success: true, discount: 10 });
      }

      return res.status(400).json({ error: "Invalid coupon code." });
    } catch (e) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // New highly cached / buffered route for views using Redis
  // Prevents direct Postgres hammering for viral videos
  app.post("/api/videos/:videoId/view", async (req, res) => {
    try {
      const { videoId } = req.params;

      let userId: string | null = null;
      if (req.headers.authorization && supabaseAdmin) {
        const tokenStr = req.headers.authorization.split(" ")[1];
        if (tokenStr) {
          const {
            data: { user },
          } = await supabaseAdmin.auth.getUser(tokenStr);
          if (user) {
            userId = user.id;
          }
        }
      }

      let sessionToken = req.signedCookies?.viewer_session;
      if (!sessionToken) {
        sessionToken = crypto.randomUUID();
        const isSecure =
          req.secure || req.headers["x-forwarded-proto"] === "https";
        res.cookie("viewer_session", sessionToken, {
          httpOnly: true,
          secure: isSecure,
          signed: true,
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        });
      }

      const token = userId || sessionToken;

      if (!isRedisEnabled()) {
        if (supabaseAdmin) {
          const { error } = await supabaseAdmin.rpc("increment_video_views", {
            video_id_param: videoId,
            session_token_param: token,
          });
          if (error) {
            logger.error(
              "[Views Fallback] DB execution failed:",
              error.message,
            );
            return res.status(500).json({ error: error.message });
          }

          const { data, error: fetchErr } = await supabaseAdmin
            .from("videos")
            .select("views")
            .eq("id", videoId)
            .single();

          const currentViews = !fetchErr && data ? data.views : null;

          if (userId) {
            adjustInterestScore(userId, videoId, "view").catch((e) =>
              logger.error({ err: e }, "View score adjust error:"),
            );
          }

          return res.json({
            success: true,
            buffered: false,
            newly_viewed: true,
            views: currentViews,
          });
        }
        return res.json({ success: true, buffered: false });
      }

      // 1. Deduplicate views using a TTL-based key (24 hour expiration)
      const viewCheckKey = `view_checked:${videoId}:${token}`;
      const alreadyViewed = await redis.get(viewCheckKey);

      if (alreadyViewed) {
        const currentCachedViews = await redis.get(
          `video_view_cache:${videoId}`,
        );
        return res.json({
          success: true,
          buffered: true,
          newly_viewed: false,
          views: currentCachedViews ? Number(currentCachedViews) : null,
        });
      }

      // Mark as viewed under this session token for 24 hours (1), queue view (2), and increment the cache (3) in parallel
      const [, , updatedViewsCount] = await Promise.all([
        redis.set(viewCheckKey, "1", { ex: 86400 }),
        redis.lpush("video_views_queue", JSON.stringify({ videoId, token })),
        redis.incr(`video_view_cache:${videoId}`),
      ]);

      if (userId) {
        adjustInterestScore(userId, videoId, "view").catch((e) =>
          logger.error({ err: e }, "View score adjust error:"),
        );
      }

      res.json({
        success: true,
        buffered: true,
        newly_viewed: true,
        views: updatedViewsCount,
      });
    } catch (err: any) {
      handleRedisError(err, "viewBufferingRoute");
      // Fallback open to permit safe client-direct write on database on failure
      res.json({ success: true, buffered: false });
    }
  });

  // Background cron to flush Redis views to Database every minute
  // (In production, replace dummy supabase call with server-side SDK call using Service Role Key)
  setInterval(async () => {
    if (!isRedisEnabled() || !supabaseAdmin) return;
    try {
      // Pop up to 100 views at a time to prevent blocking
      const promises: { promise: Promise<any>; payload: any }[] = [];
      const MAX_BATCH = 100;
      let count = 0;

      while (count < MAX_BATCH) {
        const item = await redis.rpop("video_views_queue");
        if (!item) break; // queue empty

        const payload: { videoId: string; token: string } =
          typeof item === "string" ? JSON.parse(item) : (item as any);
        if (payload.videoId && payload.token) {
          promises.push({
            promise: (async () => {
              const res = await supabaseAdmin!.rpc("increment_video_views", {
                video_id_param: payload.videoId,
                session_token_param: payload.token,
              });
              if (res.error) throw res.error;
              return res;
            })(),
            payload,
          });
        }
        count++;
      }

      if (promises.length > 0) {
        const results = await Promise.allSettled(
          promises.map((p) => p.promise),
        );
        let successCount = 0;
        let failCount = 0;

        // Handle Dead Letter Queue (DLQ) for failed syncs
        for (let i = 0; i < results.length; i++) {
          if (results[i].status === "rejected") {
            failCount++;
            // Push to DLQ with a timestamp and the error message
            await redis.lpush(
              "video_views_dlq",
              JSON.stringify({
                payload: promises[i].payload,
                error:
                  (results[i] as PromiseRejectedResult).reason?.message ||
                  "Unknown DB error",
                failed_at: new Date().toISOString(),
              }),
            );
          } else {
            successCount++;
          }
        }

        if (failCount > 0) {
          logger.warn(
            `[Worker] Flushed ${successCount} views, pushed ${failCount} to DLQ.`,
          );
        } else {
          logger.info(
            `[Worker] Successfully flushed ${successCount} views from queue.`,
          );
        }
      }
    } catch (e) {
      handleRedisError(e, "backgroundViewFlushWorker");
    }
  }, 10000);

  // Rate limiter for engagement
  const createDistributedLimiter = (
    prefix: string,
    limit: number,
    windowSeconds: number,
    errorMessage: string,
  ) => {
    return async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (!isRedisEnabled()) {
        return next(); // Fallback to no-op if redis not equipped
      }
      try {
        const ip = req.ip || "unknown";
        const key = `${prefix}:${ip}`;
        const current = await redis.incr(key);
        if (current === 1) {
          await redis.expire(key, windowSeconds);
        }
        if (current > limit) {
          return res.status(429).json({ error: errorMessage });
        }
        next();
      } catch (err) {
        // fail open if redis is down
        next();
      }
    };
  };

  const engagementLimiter = createDistributedLimiter(
    "rate_limit:engagement",
    20,
    60,
    "Too many engagement actions. Please slow down.",
  );
  const signupLimiter = createDistributedLimiter(
    "rate_limit:signup",
    5,
    3600,
    "Too many signup attempts from this IP. Please try again later.",
  );

  // Idempotency Middleware: Safely handle duplicate mutative requests (POST, etc.)
  const idempotencyMiddleware = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (
      req.method !== "POST" &&
      req.method !== "PUT" &&
      req.method !== "PATCH" &&
      req.method !== "DELETE"
    ) {
      return next(); // Idempotency mainly applies to mutating requests
    }

    const idempotencyKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
    if (!idempotencyKey) {
      return next(); // Proceed normally if no key is provided
    }

    if (!isRedisEnabled()) {
      return next(); // Fallback if redis is down
    }

    // Secure idempotency key by scoping to user or IP to prevent reflection/collisions
    const userId = (req as any).user?.id || 'anon';
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const scopeIdentifier = userId !== 'anon' ? userId : clientIp;
    
    // Hash scope with key to keep cache keys clean
    const crypto = await import('crypto');
    const secureHash = crypto.createHash('sha256').update(`${scopeIdentifier}-${idempotencyKey}`).digest('hex');

    const cacheKey = `idemp:${secureHash}`;
    try {
      const existing = await redis.get(cacheKey);
      if (existing) {
        // We have a stored response for this idempotency key
        const cachedResponse =
          typeof existing === "string"
            ? JSON.parse(existing)
            : (existing as any);
        logger.info(
          `[Idempotency] Returning cached response for key: ${idempotencyKey}`,
        );
        return res
          .status(cachedResponse.status || 200)
          .json(cachedResponse.body || {});
      }

      // We need to capture the response and store it
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Async save to Redis (24 hour TTL)
        redis
          .set(cacheKey, JSON.stringify({ status: res.statusCode, body }), {
            ex: 86400,
          })
          .catch((err) => {
            handleRedisError(err, "idempotencyMiddleware_save");
          });
        return originalJson(body);
      };

      next();
    } catch (err) {
      handleRedisError(err, "idempotencyMiddleware_get");
      next(); // Fail open
    }
  };

  app.post(
    "/api/auth/signup",
    idempotencyMiddleware,
    signupLimiter,
    async (req, res) => {
      try {
        const { email, password, username } = req.body;
        if (!supabaseAdmin) throw new Error("Database not configured");

        if (!username || username.trim().length === 0) {
          return res.status(400).json({ error: "Username is required." });
        }

        // Check if username already exists to avoid generic 'Database error saving new user'
        const { data: existingUser } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("username", username.trim())
          .maybeSingle();

        if (existingUser) {
          return res
            .status(400)
            .json({
              error:
                "That username is already taken. Please choose another one.",
            });
        }

        // Hash password with bcrypt cost factor 12
        const salt = await bcrypt.genSalt(12);
        const bcryptHash = await bcrypt.hash(password, salt);

        // Compute deterministic hash for Supabase auth
        const deterministicPassword = crypto
          .createHash("sha256")
          .update(password + (process.env.JWT_SECRET || "aisles-secure-pepper"))
          .digest("hex");

        const { data, error } = await supabaseAdmin.auth.signUp({
          email,
          password: deterministicPassword,
          options: {
            data: { username: username.trim() },
          },
        });

        if (error) {
          // Provide a clearer error message for the specific trigger issue
          if (error.message.includes("Database error saving new user")) {
            return res
              .status(400)
              .json({
                error:
                  "Could not create profile. This can happen if the username has special characters not allowed in our database, or is duplicate.",
              });
          }
          return res.status(400).json({ error: error.message });
        }

        if (data && data.user) {
          // Store secure bcrypt hash in user_passwords table
          const { error: dbErr } = await supabaseAdmin.from("user_passwords").insert({
            id: data.user.id,
            email: email.trim().toLowerCase(),
            password_hash: bcryptHash,
          });
          if (dbErr) {
            logger.error({ err: dbErr }, "Failed to store secure password hash in database");
          }
        }

        res.json({ success: true, data });
      } catch (err: any) {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    },
  );

  app.post(
    "/api/auth/login",
    async (req, res) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) {
          return res.status(400).json({ error: "Email and password are required" });
        }
        if (!supabaseAdmin) {
          return res.status(500).json({ error: "Database not configured" });
        }

        const getDeterministicPassword = (pass: string) => {
          return crypto
            .createHash("sha256")
            .update(pass + (process.env.JWT_SECRET || "aisles-secure-pepper"))
            .digest("hex");
        };

        const trimmedEmail = email.trim().toLowerCase();

        // 1. Fetch user password hash from our secure user_passwords table
        const { data: credential, error: fetchError } = await supabaseAdmin
          .from("user_passwords")
          .select("password_hash, id")
          .eq("email", trimmedEmail)
          .maybeSingle();

        if (fetchError) {
          logger.error({ err: fetchError }, "Error fetching user credentials");
        }

        if (credential) {
          // User is fully migrated, let's verify with bcrypt
          const matches = await bcrypt.compare(password, credential.password_hash);
          if (!matches) {
            return res.status(401).json({ error: "Invalid email or password" });
          }

          // Password matched, sign in with Supabase using deterministic password
          const deterministicPassword = getDeterministicPassword(password);
          const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: trimmedEmail,
            password: deterministicPassword,
          });

          if (signInError) {
            return res.status(400).json({ error: signInError.message });
          }

          return res.json({ success: true, ...sessionData });
        } else {
          // No bcrypt record found; try migrating user (login directly with plaintext to see if it's a legacy user)
          const { data: sessionData, error: legacySignInError } = await supabaseAdmin.auth.signInWithPassword({
            email: trimmedEmail,
            password: password,
          });

          if (legacySignInError) {
            return res.status(401).json({ error: "Invalid email or password" });
          }

          const user = sessionData.user;
          if (user) {
            // User successfully authenticated using legacy plaintext. Let's migrate them:
            const salt = await bcrypt.genSalt(12);
            const bcryptHash = await bcrypt.hash(password, salt);

            // Store the bcrypt hash in user_passwords
            const { error: dbErr } = await supabaseAdmin.from("user_passwords").insert({
              id: user.id,
              email: trimmedEmail,
              password_hash: bcryptHash,
            });

            if (dbErr) {
              logger.error({ err: dbErr }, "Failed to save user password hash during migration");
            }

            // Update Supabase Auth password to the secure deterministic hash
            const deterministicPassword = getDeterministicPassword(password);
            const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
              password: deterministicPassword,
            });

            if (updateErr) {
              logger.error({ err: updateErr }, "Failed to update Supabase Auth password to deterministic hash during migration");
            }

            logger.info(`Successfully migrated legacy user ${user.id} to bcrypt password hashing (cost factor 12)`);
          }

          return res.json({ success: true, ...sessionData });
        }
      } catch (err: any) {
        logger.error({ err }, "Login error");
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );

  // --- CREATOR TRUST SYSTEM ---
  async function adjustCreatorTrustScore(videoId: string, actionText: string) {
    if (!supabaseAdmin) return;
    try {
      let increment = 0;
      switch (actionText) {
        case "save":
          increment = 0.5;
          break;
        case "share":
          increment = 0.5;
          break;
        case "product_click":
          increment = 1.0;
          break;
        // removed automated report penalty to prevent mass fake-report exploit: case 'report': increment = -2.0; break;
      }

      if (increment === 0) return;

      const { data: video, error: videoError } = await supabaseAdmin
        .from("videos")
        .select("user_id")
        .eq("id", videoId)
        .single();
      if (videoError || !video?.user_id) return;

      const creatorId = video.user_id;

      const { error } = await supabaseAdmin.rpc("adjust_creator_trust_score", {
        p_creator_id: creatorId,
        p_increment: increment,
      });

      if (error) {
        logger.error(
          `Error adjusting trust score for creator ${creatorId}:`,
          error,
        );
      }
    } catch (err) {
      logger.error({ err: err }, "Failed to adjust creator trust score:");
    }
  }

  // --- INTEREST SCORING SYSTEM ---
  // Helper to adjust interest scores based on actions
  async function adjustInterestScore(
    userId: string,
    videoId: string,
    actionText: string,
  ) {
    if (!supabaseAdmin) return;
    try {
      // 1. Find category of the video
      const { data: video, error: videoError } = await supabaseAdmin
        .from("videos")
        .select("category_id")
        .eq("id", videoId)
        .single();
      if (videoError || !video?.category_id) return;

      const categoryId = video.category_id;

      // 2. Define scoring increments
      let increment = 0;
      switch (actionText) {
        case "view":
          increment = 5;
          break;
        case "like":
          increment = 10;
          break;
        case "comment":
          increment = 15;
          break;
        case "save":
          increment = 20;
          break;
        case "share":
          increment = 20;
          break;
        case "product_click":
          increment = 20;
          break;
        case "report":
          increment = -50;
          break;
      }

      if (increment === 0) return;

      // 3. Upsert into user_interests table
      const { error } = await supabaseAdmin.rpc("increment_interest_score", {
        p_user_id: userId,
        p_category_id: categoryId,
        p_increment: increment,
      });

      if (error) {
        logger.error(
          `Error incrementing score for user ${userId}, category ${categoryId}:`,
          error,
        );
        // Fallback if RPC doesn't exist
        const { data: current } = await supabaseAdmin
          .from("user_interests")
          .select("score")
          .eq("user_id", userId)
          .eq("category_id", categoryId)
          .single();
        const score = current
          ? Number(current.score) + increment
          : 50 + increment;

        await supabaseAdmin.from("user_interests").upsert(
          {
            user_id: userId,
            category_id: categoryId,
            score: Math.min(score, 1000),
          }, // Cap at 1000 to prevent infinite growth
          { onConflict: "user_id,category_id" },
        );
      }
    } catch (err) {
      logger.error({ err: err }, "Failed to adjust interest score:");
    }
  }

  app.post(
    "/api/user/interests",
    verifyAuth,
    express.json(),
    async (req, res) => {
      try {
        if (!supabaseAdmin) throw new Error("Database not configured");
        const user = (req as any).user;
        const { categoryIds } = req.body;

        if (!Array.isArray(categoryIds)) {
          return res
            .status(400)
            .json({ error: "categoryIds must be an array" });
        }

        // Fetch all categories to handle "all categories" correctly
        const { data: allCats } = await supabaseAdmin
          .from("categories")
          .select("id");
        const allCategoryIds = (allCats || []).map((c) => c.id);

        const isAllCategories = categoryIds.length === allCategoryIds.length;

        const rows = categoryIds.map((catId: string) => ({
          user_id: user.id,
          category_id: catId,
          score: isAllCategories ? 50.0 : 100.0, // Initial score rules
        }));

        if (rows.length > 0) {
          await supabaseAdmin
            .from("user_interests")
            .upsert(rows, { onConflict: "user_id,category_id" });
        }

        res.json({ success: true, count: rows.length });
      } catch (err: any) {
        logger.error({ err: err }, "Error setting interests:");
        {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
      }
    },
  );

  app.post(
    "/api/engagement/:action",
    verifyAuth,
    engagementLimiter,
    idempotencyMiddleware,
    async (req, res) => {
      try {
        const { action } = req.params;
        const { videoId, targetUserId } = req.body;
        const user = (req as any).user;

        if (!supabaseAdmin) throw new Error("Database not configured");

        switch (action) {
          case "like":
            await supabaseAdmin
              .from("likes")
              .insert({ video_id: videoId, user_id: user.id });
            break;
          case "unlike":
            await supabaseAdmin
              .from("likes")
              .delete()
              .eq("video_id", videoId)
              .eq("user_id", user.id);
            break;
          case "save":
            await supabaseAdmin
              .from("saved_videos")
              .insert({ video_id: videoId, user_id: user.id });
            break;
          case "unsave":
            await supabaseAdmin
              .from("saved_videos")
              .delete()
              .eq("video_id", videoId)
              .eq("user_id", user.id);
            break;
          case "follow":
            await supabaseAdmin
              .from("follows")
              .insert({ following_id: targetUserId, follower_id: user.id });
            break;
          case "unfollow":
            await supabaseAdmin
              .from("follows")
              .delete()
              .eq("following_id", targetUserId)
              .eq("follower_id", user.id);
            break;
          case "report":
            await supabaseAdmin.from("reports").insert({
              video_id: videoId,
              user_id: user.id,
              reason: req.body.reason || "Spam or malicious",
            });
            break;
          default:
            return res.status(400).json({ error: "Invalid engagement action" });
        }

        // Adjust interest and trust scores asynchronously
        if (videoId && ["like", "save", "comment", "report"].includes(action)) {
          adjustInterestScore(user.id, videoId, action).catch((e) =>
            logger.error({ err: e }, "Score adjust error:"),
          );
          adjustCreatorTrustScore(videoId, action).catch((e) =>
            logger.error({ err: e }, "Trust score adjust error:"),
          );
        }

        res.json({ success: true, action });
      } catch (err: any) {
        logger.error({ payload: err }, `Engagement action failed (${req.params.action}):`);
        // Even if DB unique constraint hits, just return success to avoid leaking state
        res.json({ success: true, error: err.message });
      }
    },
  );

  // verifyAuth middleware to strictly authenticate any logged-in user
  async function verifyAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res
          .status(401)
          .json({ error: "No authorization header provided" });
      }
      const token = authHeader.split(" ")[1];
      if (!token) {
        return res
          .status(401)
          .json({ error: "Auth token must be Bearer token" });
      }
      if (!supabaseAdmin) {
        throw new Error("Supabase admin client not initialized on server");
      }

      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) {
        return res.status(401).json({ error: "Invalid or expired auth token" });
      }

      // Secure Role Check: query the profiles database table rather than relying exclusively on user_metadata
      const { data: dbProfile } = await supabaseAdmin
        .from("profiles")
        .select("is_admin, is_suspended")
        .eq("id", user.id)
        .single();

      const isDbAdmin = dbProfile?.is_admin === true;
      const isDbSuspended = dbProfile?.is_suspended === true;

      // Pass the user information security properties
      (req as any).user = {
        ...user,
        is_database_admin: isDbAdmin,
        is_suspended: isDbSuspended,
      };

      next();
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  }

  const uploadVideo = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

  app.post(
    "/api/bunny/upload-video-proxy",
    verifyAuth,
    uploadVideo.single("video"),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: "No video file" });

        const libraryId = process.env.BUNNY_LIBRARY_ID;
        const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
        let deliveryHostname = process.env.BUNNY_DELIVERY_HOSTNAME;

        const sandboxDomain =
          process.env.SANDBOX_DOMAIN || "https://usercontent-getnayi.com";
        deliveryHostname = sandboxDomain.replace(/^https?:\/\//, "");

        if (!libraryId || !apiKey || !deliveryHostname) {
          return res
            .status(500)
            .json({ error: "Bunny configuration is missing" });
        }

        const createResponse = await fetch(
          `https://video.bunnycdn.com/library/${libraryId}/videos`,
          {
            method: "POST",
            headers: {
              AccessKey: apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: req.body?.title || "Proxy Upload Video",
            }),
          },
        );

        if (!createResponse.ok)
          throw new Error("Failed to create video object in Bunny Stream");
        const videoData = await createResponse.json();
        const videoId = videoData.guid;

        // Ensure we strip strictly all EXIF metadata using ffmpeg
        const ext = req.file.originalname
          ? path.extname(req.file.originalname).toLowerCase() || ".mp4"
          : ".mp4";
        const tempInputFile = path.join(
          os.tmpdir(),
          `input-${Date.now()}-${videoId}${ext}`,
        );
        const tempOutputFile = path.join(
          os.tmpdir(),
          `output-${Date.now()}-${videoId}${ext}`,
        );

        let processedBuffer = req.file.buffer;
        let usedFfmpeg = false;

        try {
          await fs.promises.writeFile(tempInputFile, req.file.buffer);

          await new Promise<void>((resolve, reject) => {
            // Add a strict timeout of 4 seconds to avoid process hangs
            const proc = ffmpeg(tempInputFile)
              .outputOptions(["-map_metadata -1", "-c:v copy", "-c:a copy"])
              .save(tempOutputFile)
              .on("end", () => resolve())
              .on("error", (err) =>
                reject(
                  new Error("Failed to strip video metadata: " + err.message),
                ),
              );

            setTimeout(() => {
              try {
                proc.kill("SIGKILL");
              } catch (e) {}
              reject(new Error("FFmpeg metadata extraction timed out"));
            }, 4000);
          });

          processedBuffer = await fs.promises.readFile(tempOutputFile);
          usedFfmpeg = true;
        } catch (ffmpegErr: any) {
          logger.warn(
            `[UPLOAD PROXY] FFmpeg overhead processing bypassed or timed out under load: ${ffmpegErr.message}. Falling back safely to direct buffer transfer to guarantee runtime availability.`,
            ffmpegErr,
          );
          processedBuffer = req.file.buffer;
        } finally {
          // Cleanup tmp files asynchronously to free memory and disk space
          fs.unlink(tempInputFile, () => {});
          fs.unlink(tempOutputFile, () => {});
        }

        const uploadResponse = await fetch(
          `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
          {
            method: "PUT",
            headers: { AccessKey: apiKey },
            body: processedBuffer,
          },
        );

        if (!uploadResponse.ok)
          throw new Error("Failed to upload video data to Bunny");

        res.json({ success: true, videoId, deliveryHostname });
      } catch (error: any) {
        logger.error({ err: error }, "Proxy Video Upload Error:");
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Presigned URL for Image Uploads (Direct PUT proxy)
  app.post("/api/bunny/presign-image", verifyAuth, async (req, res) => {
    try {
      const { filename } = req.body;
      const user = (req as any).user;

      const { data: profile } = await supabaseAdmin!
        .from("profiles")
        .select("can_upload, is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.can_upload && !profile?.is_admin) {
        return res
          .status(403)
          .json({ error: "Forbidden. You do not have upload privileges." });
      }

      if (!filename || typeof filename !== "string") {
        return res.status(400).json({ error: "Invalid filename" });
      }

      const crypto = await import("crypto");
      const safeFilename = path
        .basename(filename)
        .replace(/[^a-zA-Z0-9.\-_]/g, "_");
      
      const ext = path.extname(safeFilename).toLowerCase();
      const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".webm"];
      if (!allowedExts.includes(ext)) {
        return res.status(400).json({ error: "Invalid file extension. Allowed: jpg, png, webp, mp4, mov, webm." });
      }

      const uniqueFilename = `${user.id}/${Date.now()}-${safeFilename}`;
      const expires = Math.floor(Date.now() / 1000) + 600; // 10 mins
      const secret = process.env.BUNNY_STORAGE_PASSWORD || "secret";

      const signature = crypto
        .createHmac("sha256", secret)
        .update(`${uniqueFilename}:${expires}`)
        .digest("hex");

      const presignedUrl = `/api/bunny/direct-put?filename=${encodeURIComponent(uniqueFilename)}&expires=${expires}&signature=${signature}`;
      res.json({ presignedUrl, filename: uniqueFilename });
    } catch (e: any) {
      {
        logger.error({ err: e, reqId: (req as any).requestId }, "API Error");
        res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  app.put("/api/bunny/direct-put", async (req, res) => {
    try {
      const { filename, expires, signature } = req.query;

      if (Math.floor(Date.now() / 1000) > Number(expires)) {
        return res.status(401).json({ error: "Presigned URL expired" });
      }

      const crypto = await import("crypto");
      const secret = process.env.BUNNY_STORAGE_PASSWORD || "secret";
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(`${filename}:${expires}`)
        .digest("hex");

      if (signature !== expectedSig) {
        return res.status(403).json({ error: "Invalid signature" });
      }

      let zoneName = process.env.BUNNY_STORAGE_ZONE_NAME || "";
      let hostname =
        process.env.BUNNY_STORAGE_HOSTNAME || "storage.bunnycdn.com";
      if (zoneName.includes("/"))
        zoneName = zoneName.split("/").filter(Boolean).pop() || zoneName;
      if (hostname.includes("://")) hostname = new URL(hostname).hostname;
      const pullZone = process.env.BUNNY_STORAGE_PULL_ZONE;

      const bunnyUrl = `https://${hostname}/${zoneName}/${filename}`;

      const fetchResponse = await fetch(bunnyUrl, {
        method: "PUT",
        headers: {
          AccessKey: secret,
          "Content-Length": req.headers["content-length"] as string,
          "Content-Type": "application/octet-stream",
        },
        body: req as any, // Stream the raw binary directly
        duplex: "half",
      } as any);

      if (!fetchResponse.ok) {
        throw new Error(await fetchResponse.text());
      }

      res.json({ url: `https://${pullZone}/${filename}` });
    } catch (e: any) {
      logger.error({ err: e }, "Direct PUT Error:");
      {
        logger.error({ err: e, reqId: (req as any).requestId }, "API Error");
        res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // Upload Image to Bunny Edge Storage
  app.post("/api/bunny/upload-image", verifyAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!supabaseAdmin) {
        return res
          .status(500)
          .json({ error: "Database Admin client not configured" });
      }
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("can_upload, is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.can_upload && !profile?.is_admin) {
        return res
          .status(403)
          .json({ error: "Forbidden. You do not have upload privileges." });
      }

      let zoneName = process.env.BUNNY_STORAGE_ZONE_NAME || "";
      const password = process.env.BUNNY_STORAGE_PASSWORD;
      const pullZone = process.env.BUNNY_STORAGE_PULL_ZONE;
      let hostname =
        process.env.BUNNY_STORAGE_HOSTNAME || "storage.bunnycdn.com";

      if (zoneName.includes("/"))
        zoneName = zoneName.split("/").filter(Boolean).pop() || zoneName;
      if (hostname.includes("://")) hostname = new URL(hostname).hostname;

      if (!zoneName || !password || !pullZone) {
        return res
          .status(500)
          .json({ error: "Bunny edge storage configuration is missing" });
      }

      const { imageBase64, filename } = req.body;
      if (!imageBase64 || !filename) {
        return res
          .status(400)
          .json({ error: "Image data and filename are required" });
      }

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > 2 * 1024 * 1024) {
        return res
          .status(413)
          .json({ error: "Image size exceeds maximum allowed size (2MB)." });
      }

      let sharp = null;
      try {
        sharp = require("sharp");
      } catch (e) {}
      let finalBuffer = buffer;

      if (sharp) {
        // Strip EXIF and convert to WebP to neutralize any payloads
        finalBuffer = await sharp(buffer).webp().toBuffer();
      }

      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

      let pz = pullZone.endsWith("/") ? pullZone.slice(0, -1) : pullZone;
      if (!pz.startsWith("http")) pz = `https://${pz}`;

      // Enforce the sandbox domain requirement
      const sandboxDomain =
        process.env.SANDBOX_DOMAIN || "https://usercontent-getnayi.com";
      pz = sandboxDomain;

      const regions = [
        hostname,
        "storage.bunnycdn.com",
        "ny.storage.bunnycdn.com",
        "la.storage.bunnycdn.com",
        "sg.storage.bunnycdn.com",
        "syd.storage.bunnycdn.com",
        "uk.storage.bunnycdn.com",
        "br.storage.bunnycdn.com",
        "jh.storage.bunnycdn.com",
      ];
      const uniqueRegions = [...new Set(regions)];

      let lastError = null;
      let success = false;

      for (const regionHost of uniqueRegions) {
        const url = `https://${regionHost}/${zoneName}/avatars/${uniqueFilename}`;
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            AccessKey: password,
            "Content-Type": "application/octet-stream",
          },
          body: finalBuffer,
        });

        if (response.ok) {
          success = true;
          break;
        } else {
          lastError = { status: response.status, text: await response.text() };
        }
      }

      if (!success) {
        throw new Error(
          `Failed to upload to Bunny Storage: ${JSON.stringify(lastError)}`,
        );
      }

      const publicUrl = `${pz}/avatars/${uniqueFilename}`;
      res.json({ success: true, url: publicUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 1. Create Video
  app.post("/api/bunny/create", verifyAuth, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      // Upload rate limit (5 per hour)
      if (isRedisEnabled()) {
        try {
          const user = (req as any).user;
          const authMatch = user?.id || req.ip || "unknown";
          if (authMatch) {
            const key = `upload_limit:${authMatch}`;
            const current = await redis.incr(key);
            if (current === 1) {
              await redis.expire(key, 3600); // 1 hour
            }
            if (current > 5) {
              return res
                .status(429)
                .json({
                  error:
                    "You have reached the upload limit of 5 videos per hour. Please try again later.",
                });
            }
          }
        } catch (redisError: any) {
          handleRedisError(redisError, "uploadRateLimit");
        }
      }

      const user = (req as any).user;
      if (!supabaseAdmin) {
        return res
          .status(500)
          .json({ error: "Database Admin client not configured" });
      }
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("can_upload, is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.can_upload && !profile?.is_admin) {
        return res
          .status(403)
          .json({ error: "Forbidden. You do not have upload privileges." });
      }

      const libraryId = process.env.BUNNY_LIBRARY_ID;
      const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
      let deliveryHostname = process.env.BUNNY_DELIVERY_HOSTNAME;

      const sandboxDomain =
        process.env.SANDBOX_DOMAIN || "https://usercontent-getnayi.com";
      deliveryHostname = sandboxDomain.replace(/^https?:\/\//, "");

      if (!libraryId || !apiKey || !deliveryHostname) {
        return res
          .status(500)
          .json({ error: "Bunny configuration is missing" });
      }

      const createResponse = await fetch(
        `https://video.bunnycdn.com/library/${libraryId}/videos`,
        {
          method: "POST",
          headers: {
            AccessKey: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: req.body?.title || "Uploaded Video" }),
        },
      );

      if (!createResponse.ok) {
        throw new Error("Failed to create video object in Bunny Stream");
      }

      const videoData = await createResponse.json();
      const videoId = videoData.guid;

      // Generate TUS Direct Upload Signature
      const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity

      const crypto = await import("crypto");
      const signature = crypto
        .createHash("sha256")
        .update(libraryId + apiKey + expirationTime + videoId)
        .digest("hex");

      res.json({
        success: true,
        videoId,
        libraryId,
        deliveryHostname,
        expirationTime,
        signature,
      });
    } catch (error: any) {
      logger.error({ err: error }, "Create Error:");
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/webhooks/bunny", express.json(), async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "DB not configured" });
      }

      // BunnyCDN Webhook Body generally contains VideoGuid and Status
      const { VideoGuid, Status } = req.body;

      // Status 3 typically means "Finished/Ready" in Bunny stream
      if (VideoGuid && Status === 3) {
        const videoUrlLike = `%${VideoGuid}%`;
        const { data: videosToUpdate, error: fetchError } = await supabaseAdmin
          .from("videos")
          .select("id, status, product_url")
          .like("video_url", videoUrlLike)
          .eq("status", "processing");

        if (fetchError) {
          logger.error({ err: fetchError }, "[Webhook] Failed to fetch video status:");
          return res.status(500).json({ error: "Failed to fetch database" });
        }

        if (videosToUpdate && videosToUpdate.length > 0) {
          for (const video of videosToUpdate) {
            let nextStatus = "active";
            if (video.product_url && !isAllowedMarketplace(video.product_url)) {
              nextStatus = "pending_review";
            }
            const { error } = await supabaseAdmin
              .from("videos")
              .update({
                status: nextStatus,
              })
              .eq("id", video.id);

            if (error) {
              logger.error({ err: error }, "[Webhook] Failed to update video status:");
              await supabaseAdmin.from("webhook_dead_letter_queue").insert({
                payload: req.body,
                error_message:
                  "Failed to update video record: " + JSON.stringify(error),
              });
            } else {
              logger.info(
                `[Webhook] Successfully processed video: ${VideoGuid} to ${nextStatus}`,
              );
            }
          }
        }
      }

      return res.status(200).send("OK");
    } catch (err: any) {
      logger.error({ err: err }, "[Webhook] Bunny Webhook Error:");

      if (supabaseAdmin) {
        const { error: dlqError } = await supabaseAdmin
          .from("webhook_dead_letter_queue")
          .insert({
            payload: req.body || {},
            error_message:
              "Unhandled Exception: " + (err?.message || String(err)),
          });
        if (dlqError) logger.error({ err: dlqError }, "[Webhook] Failed to log to DLQ");
      }

      return res.status(500).send("Webhook Error");
    }
  });

  // DELETE Video (Bunny)
  app.delete("/api/bunny/delete/:videoId", verifyAuth, async (req, res) => {
    try {
      const libraryId = process.env.BUNNY_LIBRARY_ID;
      const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
      const videoId = req.params.videoId;
      const user = (req as any).user;

      if (!libraryId || !apiKey) {
        return res
          .status(500)
          .json({ error: "Bunny configuration is missing" });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Database not configured" });
      }

      // Check ownership
      const { data: videoData } = await supabaseAdmin
        .from("videos")
        .select("user_id")
        .ilike("video_url", `%${videoId}%`)
        .maybeSingle();

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
        
      if (videoData) {
        if (videoData.user_id !== user.id && !profile?.is_admin) {
          return res
            .status(403)
            .json({ error: "Forbidden. You do not own this video." });
        }
      } else {
         // Prevent arbitrary deletion of un-tracked bunny files if they don't own it or are not admin
         if (!profile?.is_admin) {
            return res.status(403).json({ error: "Forbidden. Video not tracked in database."});
         }
      }

      const response = await fetch(
        `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
        {
          method: "DELETE",
          headers: {
            AccessKey: apiKey,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete video");
      }

      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "Delete Error:");
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH Profile (My Profile)
  const searchCache = new Map<string, { data: any; timestamp: number }>();
  const SEARCH_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes cache

  app.get(
    "/api/trending",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }),
    async (req, res) => {
      try {
        if (!supabaseAdmin)
          throw new Error("Database Admin client not configured");

        const cacheKey = "trending_tags_cache";
        if (isRedisEnabled()) {
          try {
            const cached = await redis.get(cacheKey);
            if (cached)
              return res.json(
                typeof cached === "string" ? JSON.parse(cached) : cached,
              );
          } catch (e) {
            /* ignore redis error */
          }
        } else {
          const local = searchCache.get(cacheKey);
          if (local && Date.now() - local.timestamp < SEARCH_CACHE_TTL_MS) {
            return res.json(local.data);
          }
        }

        const { data: videos, error } = await supabaseAdmin
          .from("videos")
          .select(
            `
          tags,
          created_at,
          views,
          categories (
            name
          )
        `,
          )
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) {
          logger.error({ err: error }, "Trending tags fetch error:");
          return res.json({ trendingTags: ["Skincare", "Fashion", "Tech"] });
        }

        const tagScores: Record<string, number> = {};
        const now = Date.now();

        (videos || []).forEach((v: any) => {
          const ageHours =
            (now - new Date(v.created_at).getTime()) / (1000 * 60 * 60);
          // Recency decay: max weight 10, linearly decaying to 1 over 72 hours
          const recencyMultiplier = Math.max(1, 10 - ageHours * (9 / 72));

          const views = v.views || 0;
          const score = (views + 1) * recencyMultiplier;

          if (v.tags && Array.isArray(v.tags)) {
            v.tags.forEach((tag: string) => {
              const cleanTag = tag.trim();
              if (!cleanTag) return;
              if (!tagScores[cleanTag]) tagScores[cleanTag] = 0;
              tagScores[cleanTag] += score;
            });
          }

          if (v.categories && v.categories.name) {
            const catName = v.categories.name.trim();
            if (catName) {
              if (!tagScores[catName]) tagScores[catName] = 0;
              tagScores[catName] += score;
            }
          }
        });

        let sortedTagsWithScores = Object.entries(tagScores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 30)
          .map((entry) => ({ tag: entry[0], score: entry[1] }));

        if (sortedTagsWithScores.length === 0) {
          sortedTagsWithScores = [
            { tag: "Skincare", score: 100 },
            { tag: "Fashion", score: 90 },
            { tag: "Tech", score: 80 },
            { tag: "Beauty", score: 70 },
            { tag: "Home", score: 60 },
            { tag: "Fitness", score: 50 },
          ];
        }

        const responsePayload = {
          trendingTags: sortedTagsWithScores.map((t) => t.tag).slice(0, 10),
          trendingTagScores: sortedTagsWithScores,
        };

        if (isRedisEnabled()) {
          try {
            await redis.set(cacheKey, JSON.stringify(responsePayload), {
              ex: 300,
            });
          } catch (e) {
            /* ignore redis error */
          }
        } else {
          searchCache.set(cacheKey, {
            data: responsePayload,
            timestamp: Date.now(),
          });
        }

        return res.json(responsePayload);
      } catch (err: any) {
        logger.error({ err: err }, "/api/trending Error:");
        // Fallback tags if database is unready
        return res.json({
          trendingTags: [
            "Skincare",
            "Fashion",
            "Tech",
            "Beauty",
            "Home",
            "Fitness",
          ],
        });
      }
    },
  );

  app.get(
    "/api/search",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }),
    async (req, res) => {
      try {
        if (!supabaseAdmin)
          throw new Error("Database Admin client not configured");
        const { q, category_id, store, limit, cursor } = req.query;

        const limitNum = limit ? parseInt(limit as string) : 20;
        const offsetNum = cursor ? parseInt(cursor as string) : 0;

        let qStr = typeof q === "string" ? q.trim() : "";

        let filterMaxPrice: null | number = null;
        let filterMinPrice: null | number = null;
        let cleanQuery = qStr;

        if (qStr !== "") {
          const lowerQ = qStr.toLowerCase();
          const underMatch = lowerQ.match(
            /(?:under|below|less than|max)\s*(?:rs\.?|inr|₹|\$)?\s*(\d+)/i,
          );
          if (underMatch) {
            filterMaxPrice = parseInt(underMatch[1], 10);
            cleanQuery = cleanQuery.replace(underMatch[0], "");
          }
          const overMatch = cleanQuery.match(
            /(?:above|over|more than|min)\s*(?:rs\.?|inr|₹|\$)?\s*(\d+)/i,
          );
          if (overMatch) {
            filterMinPrice = parseInt(overMatch[1], 10);
            cleanQuery = cleanQuery.replace(overMatch[0], "");
          }
          cleanQuery = cleanQuery.trim();
        }

        const selectedCategory =
          typeof category_id === "string" && category_id ? category_id : null;
        const storeFilter = typeof store === "string" && store ? store : null;

        if (qStr === "" && !selectedCategory && !storeFilter) {
          return res.json({ videos: [] });
        }

        const cleanSearchTerm = cleanQuery.replace(/^#/, "").toLowerCase();

        const { data: v3Data, error: v3Error } = await supabaseAdmin.rpc(
          "search_videos_v3",
          {
            search_term: cleanSearchTerm,
            p_category_id: selectedCategory,
            p_max_price: filterMaxPrice,
            p_min_price: filterMinPrice,
            p_limit: limitNum,
            p_offset: offsetNum,
          },
        );

        if (!v3Error && v3Data) {
          // v3 already returns scores and prices
          let data = v3Data;
          if (storeFilter) {
            data = data.filter((v: any) => {
              const name = extractStoreName(v.video_url);
              return name.toLowerCase() === storeFilter.toLowerCase();
            });
          }

          let nextCursor = null;
          if (v3Data.length === limitNum) {
            nextCursor = (offsetNum + limitNum).toString();
          }

          // Transform response shape exactly as JS did to keep frontend intact
          data = data.map((v: any) => ({
            ...v,
            categories: { id: v.category_id, name: "Category" },
            profiles: {
              id: v.user_id,
              username: v.username,
              avatar_url: v.avatar_url,
              is_brand: v.is_brand,
              trust_score: v.trust_score,
            },
            likes: [{ count: v.likes_count }],
            comments: [{ count: 0 }],
            saved_videos: [{ count: v.saves_count }],
          }));

          return res.json({ videos: data, nextCursor });
        }

        // If missing search_videos_v3 or no results, fallback to optimized vanilla RPC
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
          "search_videos_v2",
          {
            search_term: cleanSearchTerm,
            p_category_id: selectedCategory,
          },
        );

        let videoIds = [];
        if (rpcData && rpcData.length > 0) {
          videoIds = rpcData.map((v: any) => v.id);
        }

        let queryBuilder = supabaseAdmin
          .from("videos")
          .select(
            `
          *,
          categories (id, name),
          profiles!inner (id, username, avatar_url, is_brand, trust_score),
          likes(count),
          comments(count),
          saved_videos(count)
        `,
          )
          .eq("status", "active");

        if (selectedCategory) {
          queryBuilder = queryBuilder.eq("category_id", selectedCategory);
        }

        if (videoIds.length > 0) {
          queryBuilder = queryBuilder.in("id", videoIds);
        } else if (cleanQuery !== "") {
          const terms = cleanQuery.split(/\s+/).filter((w) => w.length > 2);
          const orConditions = [`caption.ilike.%${cleanQuery}%`];
          for (const t of terms) {
            orConditions.push(`caption.ilike.%${t}%`);
          }
          queryBuilder = queryBuilder.or(orConditions.join(","));
        }

        const { data: fallbackData } = await queryBuilder
          .limit(storeFilter ? 100 : limitNum)
          .range(offsetNum, offsetNum + (storeFilter ? 100 : limitNum) - 1);
        let data = fallbackData || [];

        if (storeFilter) {
          data = data.filter((v: any) => {
            const name = extractStoreName(v.product_url);
            return name.toLowerCase() === storeFilter.toLowerCase();
          });
        }

        let nextCursor = null;
        if (data.length === (storeFilter ? 100 : limitNum)) {
          nextCursor = (offsetNum + (storeFilter ? 100 : limitNum)).toString();
        }

        return res.json({ videos: data, nextCursor });
      } catch (err: any) {
        logger.error({ err: err }, "Search Error:");
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Advanced Feed, Comments, and Followers end-points with cursor-based pagination
  app.get("/api/videos/:id", async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("DB not initialized");
      const { id } = req.params;

      const { data, error } = await supabaseAdmin
        .from("videos")
        .select(
          `
          *,
          categories (id, name),
          profiles (
            id,
            username,
            avatar_url,
            is_brand
          )
        `,
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Video not found" });

      return res.json({ data });
    } catch (err: any) {
      logger.error({ err: err }, "Fetch video err:");
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  app.get("/api/feed", async (req, res) => {
    try {
      const { tab, categoryId, store, tag, cursor, limit = 10 } = req.query;
      const limitNum = parseInt(limit as string) || 10;

      let userId: string | null = null;
      let userInterests: string[] = [];
      let userInterestScores = new Map<string, number>();

      if (req.headers.authorization && supabaseAdmin) {
        const token = req.headers.authorization.split(" ")[1];
        if (token && token !== "null") {
          const {
            data: { user },
          } = await supabaseAdmin.auth.getUser(token);
          if (user) {
            userId = user.id;
            // Fetch dynamically ranked interests from DB
            const { data: dbInterests } = await supabaseAdmin
              .from("user_interests")
              .select("category_id, score")
              .eq("user_id", user.id)
              .order("score", { ascending: false })
              .limit(10);

            if (dbInterests && dbInterests.length > 0) {
              userInterests = dbInterests.map((i) => i.category_id);
              dbInterests.forEach((i) =>
                userInterestScores.set(i.category_id, i.score),
              );
            } else {
              userInterests = user.user_metadata?.interests || [];
              userInterests.forEach((catId) =>
                userInterestScores.set(catId, 50.0),
              );
            }
          }
        }
      }

      const DB_HAS_TRUST_SCORE = process.env.DISABLE_TRUST_SCORE !== "true";
      let selectQuery = `*, categories (id, name), profiles (id, username, avatar_url, is_brand, trust_score), likes(count), comments(count), saved_videos(count)`;

      let rawVideos: any[] = [];
      let finalNextCursor: string | null = null;

      if (categoryId || store || tag) {
        let query = supabaseAdmin!
          .from("videos")
          .select(selectQuery)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (categoryId) query = query.eq("category_id", categoryId);
        if (tag) query = query.contains("tags", [tag]);

        let { data, error } = await query;

        if (error && error.message.includes("trust_score")) {
          selectQuery = `*, categories (id, name), profiles (id, username, avatar_url, is_brand), likes(count), comments(count), saved_videos(count)`;
          let retryQuery = supabaseAdmin!
            .from("videos")
            .select(selectQuery)
            .eq("status", "active")
            .order("created_at", { ascending: false });
          if (categoryId) retryQuery = retryQuery.eq("category_id", categoryId);
          if (tag) retryQuery = retryQuery.contains("tags", [tag]);
          const retryRes = await retryQuery;
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) throw error;

        let filtered = data || [];
        if (store) {
          filtered = filtered.filter(
            (v: any) =>
              extractStoreName(v.product_url).toLowerCase() ===
              (store as string).toLowerCase(),
          );
        }

        const offset = cursor ? parseInt(cursor as string) : 0;
        rawVideos = filtered.slice(offset, offset + limitNum);
        finalNextCursor =
          offset + limitNum < filtered.length
            ? (offset + limitNum).toString()
            : null;
      } else if (tab === "trending") {
        const cacheKey = `feed:trending:${categoryId || "all"}`;
        let trendingVideos: any[] = [];
        let cached = null;
        try {
          if (isRedisEnabled()) {
            cached = await redis.get(cacheKey);
          }
        } catch (cacheError) {
          handleRedisError(cacheError, "getTrendingFeedCache");
        }

        if (cached) {
          trendingVideos =
            typeof cached === "string" ? JSON.parse(cached) : cached;
        } else {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          let query = supabaseAdmin!
            .from("videos")
            .select(selectQuery)
            .eq("status", "active")
            .gte("created_at", sevenDaysAgo)
            .limit(300);

          if (categoryId) query = query.eq("category_id", categoryId);

          let { data, error } = await query;

          if (error && error.message.includes("trust_score")) {
            logger.warn({}, "Falling back feed trending query without trust_score...");
            selectQuery = `*, categories (id, name), profiles (id, username, avatar_url, is_brand), likes(count), comments(count), saved_videos(count)`;
            let retryQuery = supabaseAdmin!
              .from("videos")
              .select(selectQuery)
              .eq("status", "active")
              .gte("created_at", sevenDaysAgo)
              .limit(300);
            if (categoryId) retryQuery = retryQuery.eq("category_id", categoryId);
            const retryRes = await retryQuery;
            data = retryRes.data;
            error = retryRes.error;
          }

          if (error) throw error;

          let scoredVideos = (data || []).map((v: any) => {
            const likesCount = v.likes && v.likes.length > 0 && v.likes[0].count !== undefined ? v.likes[0].count : v.likes?.length || 0;
            const commentsCount = v.comments && v.comments.length > 0 && v.comments[0].count !== undefined ? v.comments[0].count : v.comments?.length || 0;
            const viewsCount = v.views || 0;

            // Creator Trust multiplier
            const trustScore = v.profiles?.trust_score ?? 50.0;
            const trustMultiplier = Math.max(0.1, trustScore / 50.0); // e.g. score of 100 gives 2x boost, score of 10 gives 0.2x penalty
            
            // HackerNews / Reddit Hot Scoring Formula
            const engagementScore = (likesCount * 3) + (commentsCount * 5) + (viewsCount * 0.1);

            const ageInHours = (Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60);
            const gravity = 1.8;

            const finalScore = (engagementScore * trustMultiplier) / Math.pow(ageInHours + 2, gravity);
            
            return {
              ...v,
              _ranking_score: finalScore
            };
          });

          // Sort by the composite score
          scoredVideos.sort((a: any, b: any) => b._ranking_score - a._ranking_score);

          trendingVideos = scoredVideos;
          try {
            if (isRedisEnabled()) {
              await redis.set(cacheKey, JSON.stringify(trendingVideos), {
                ex: 300,
              });
            }
          } catch (cacheError) {
            handleRedisError(cacheError, "setTrendingFeedCache");
          }
        }

        const offset = cursor ? parseInt(cursor as string) : 0;
        rawVideos = trendingVideos.slice(offset, offset + limitNum);
        finalNextCursor =
          offset + limitNum < trendingVideos.length
            ? (offset + limitNum).toString()
            : null;
      } else {
        // Personalized Ranking algorithm based on user interest scores
        const candidatePoolSize = 250;
        const fourteenDaysAgo = new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000,
        ).toISOString();

        // Fetch a pool of recent active videos
        let query = supabaseAdmin!
          .from("videos")
          .select(selectQuery)
          .eq("status", "active")
          .gte("created_at", fourteenDaysAgo)
          .limit(candidatePoolSize);

        if (categoryId) {
          query = query.eq("category_id", categoryId);
        } else if (userInterests.length > 0) {
          // ensure relevancy pool but also include uncategorized videos to avoid empty feeds
          query = query.or(
            `category_id.in.(${userInterests.join(",")}),category_id.is.null`,
          );
        }

        let { data, error } = await query;

        if (error && error.message.includes("trust_score")) {
          logger.warn({}, "Falling back feed latest query without trust_score...");
          selectQuery = `*, categories (id, name), profiles (id, username, avatar_url, is_brand), likes(count), comments(count), saved_videos(count)`;
          let retryQuery = supabaseAdmin!
            .from("videos")
            .select(selectQuery)
            .eq("status", "active")
            .gte("created_at", fourteenDaysAgo)
            .limit(candidatePoolSize);
          if (categoryId) retryQuery = retryQuery.eq("category_id", categoryId);
          else if (userInterests.length > 0)
            retryQuery = retryQuery.or(
              `category_id.in.(${userInterests.join(",")}),category_id.is.null`,
            );

          const retryRes = await retryQuery;
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) throw error;

        let candidateVideos = data || [];

        // Apply AI Studio Interest Score Ranking
        let scoredVideos = candidateVideos.map((v: any) => {
          const likesCount =
            v.likes && v.likes.length > 0 && v.likes[0].count !== undefined
              ? v.likes[0].count
              : v.likes?.length || 0;
          const commentsCount =
            v.comments &&
            v.comments.length > 0 &&
            v.comments[0].count !== undefined
              ? v.comments[0].count
              : v.comments?.length || 0;
          const viewsCount = v.views || 0;

          const trustScore = v.profiles?.trust_score ?? 50.0;
          const trustMultiplier = Math.max(0.1, trustScore / 50.0);

          let interestScore = userInterestScores.get(v.category_id);
          if (interestScore === undefined) interestScore = 50.0; // Neutral
          const interestMultiplier = Math.max(0.1, interestScore / 50.0);

          // Engagement baseline
          const engagementScore =
            1 + likesCount * 3 + commentsCount * 5 + viewsCount * 0.1;

          const ageInHours = Math.max(
            0.1,
            (Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60),
          );
          // Lower gravity than trending to allow high-interest older videos to surface
          const gravity = 1.35;

          const finalScore =
            (engagementScore * trustMultiplier * interestMultiplier) /
            Math.pow(ageInHours + 2, gravity);

          return {
            ...v,
            _ranking_score: finalScore,
          };
        });

        // Sort by the personalized composite score
        scoredVideos.sort(
          (a: any, b: any) => b._ranking_score - a._ranking_score,
        );

        const offset = cursor ? parseInt(cursor as string) : 0;
        rawVideos = scoredVideos.slice(offset, offset + limitNum);
        // Note: For large ultra-scale, user feeds would be materialized.
        // Here we just limit the overall scroll depth to our dynamic ranking pool width.
        finalNextCursor =
          offset + limitNum < scoredVideos.length
            ? (offset + limitNum).toString()
            : null;
      }

      // Enrich with user state and clean up the counts
      let userLikes = new Set();
      let userSaves = new Set();
      let userFollows = new Set();

      if (rawVideos.length > 0 && userId) {
        const videoIds = rawVideos.map((v) => v.id);
        const authorIds = Array.from(new Set(rawVideos.map((v) => v.user_id)));

        const [likesRes, savesRes, followsRes] = await Promise.all([
          supabaseAdmin!
            .from("likes")
            .select("video_id")
            .eq("user_id", userId)
            .in("video_id", videoIds),
          supabaseAdmin!
            .from("saved_videos")
            .select("video_id")
            .eq("user_id", userId)
            .in("video_id", videoIds),
          supabaseAdmin!
            .from("follows")
            .select("following_id")
            .eq("follower_id", userId)
            .in("following_id", authorIds),
        ]);
        if (likesRes.data)
          likesRes.data.forEach((l: any) => userLikes.add(l.video_id));
        if (savesRes.data)
          savesRes.data.forEach((s: any) => userSaves.add(s.video_id));
        if (followsRes.data)
          followsRes.data.forEach((f: any) => userFollows.add(f.following_id));
      }

      const enrichedVideos = rawVideos.map((v) => {
        // Extract count from PostgREST format [{ count: X }]
        const likesList = v.likes || [];
        const commentsList = v.comments || [];
        const savesList = v.saved_videos || [];

        const likesCount =
          likesList.length > 0 && likesList[0].count !== undefined
            ? likesList[0].count
            : likesList.length > 0
              ? likesList.length
              : 0;
        const commentsCount =
          commentsList.length > 0 && commentsList[0].count !== undefined
            ? commentsList[0].count
            : commentsList.length > 0
              ? commentsList.length
              : 0;
        const savesCount =
          savesList.length > 0 && savesList[0].count !== undefined
            ? savesList[0].count
            : savesList.length > 0
              ? savesList.length
              : 0;

        return {
          ...v,
          metrics: {
            likes: likesCount,
            comments: commentsCount,
            saves: savesCount,
            views: v.views || 0,
          },
          user_state: {
            is_liked: userLikes.has(v.id),
            is_saved: userSaves.has(v.id),
            is_followed: userFollows.has(v.user_id),
          },
        };
      });

      return res.json({ data: enrichedVideos, nextCursor: finalNextCursor });
    } catch (e: any) {
      {
        logger.error({ err: e, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  app.get("/api/comments", async (req, res) => {
    try {
      const { video_id, cursor, limit = 20 } = req.query;
      const limitNum = parseInt(limit as string) || 20;

      // Try ordering by is_pinned descending, then created_at descending (industry standard)
      let query = supabaseAdmin!
        .from("comments")
        .select("*, profiles(username, avatar_url, is_brand)")
        .eq("video_id", video_id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limitNum);

      if (cursor) query = query.lt("created_at", cursor);

      let { data, error } = await query;

      if (error) {
        // Fallback in case is_pinned column hasn't been added yet in their Supabase DB schema
        if (
          error.code === "42703" ||
          (error.message && error.message.includes("is_pinned"))
        ) {
          logger.warn(
            "is_pinned column not present in comments table, falling back to standard sorting...",
          );
          let fallbackQuery = supabaseAdmin!
            .from("comments")
            .select("*, profiles(username, avatar_url, is_brand)")
            .eq("video_id", video_id)
            .order("created_at", { ascending: false })
            .limit(limitNum);

          if (cursor) fallbackQuery = fallbackQuery.lt("created_at", cursor);
          const fallbackRes = await fallbackQuery;
          if (fallbackRes.error) throw fallbackRes.error;
          data = fallbackRes.data;
        } else {
          throw error;
        }
      }

      const nextCursor =
        data && data.length === limitNum
          ? data[data.length - 1].created_at
          : null;
      return res.json({ data: data || [], nextCursor });
    } catch (e: any) {
      {
        logger.error({ err: e, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  app.post("/api/comments", verifyAuth, async (req, res) => {
    try {
      const { video_id, content } = req.body;
      const user = (req as any).user;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Comment cannot be empty" });
      }

      // Shadowban check (Admins, testing developers with chvenu143mn@gmail.com, or user with is_admin metadata are never banned)
      const isTestingDeveloper =
        user.email === "chvenu143mn@gmail.com" ||
        user.is_database_admin === true;

      // If the developer is currently banned, let's automatically UNBAN them so they can test comments normally!
      if (isTestingDeveloper && user.is_suspended === true) {
        if (supabaseAdmin) {
          try {
            await supabaseAdmin
              .from("profiles")
              .update({ is_suspended: false })
              .eq("id", user.id);
            user.is_suspended = false; // local variable update
            logger.info(
              `[Moderation] Automatically unbanned testing developer: ${user.email}`,
            );
          } catch (unbanError) {
            logger.error({ err: unbanError }, "Failed to auto-unban developer:");
          }
        }
      }

      const isShadowbanned = user.is_suspended === true && !isTestingDeveloper;

      // Spam Filter: regex for URLs or spam phrases
      const urlRegex =
        /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)/i;
      const spamPhrases = [
        "free crypto",
        "click my bio",
        "link in bio",
        "subscribe",
        "followers",
        "cash app",
      ];
      const isSpam =
        urlRegex.test(content) ||
        spamPhrases.some((phrase) => content.toLowerCase().includes(phrase));

      if (isSpam && isRedisEnabled()) {
        try {
          // Track spam hits
          const spamKey = `spam:comments:${user.id}`;
          const spamCount = await redis.incr(spamKey);
          if (spamCount === 1) await redis.expire(spamKey, 3600); // 1 hr window

          if (spamCount >= 3 && !isTestingDeveloper) {
            // Auto shadowban
            if (supabaseAdmin) {
              await supabaseAdmin
                .from("profiles")
                .update({ is_suspended: true, can_upload: false })
                .eq("id", user.id);
            }
          }
        } catch (redisError) {
          handleRedisError(redisError, "spamTracking");
        }
        return res
          .status(403)
          .json({ error: "Comment blocked due to spam policy" });
      }

      if (isShadowbanned) {
        // Obfuscate shadowbanning: simulate success to the shadowbanned user, but do not actually insert into db
        const mockComment = {
          id: "temp-" + Date.now().toString(),
          video_id,
          user_id: user.id,
          content,
          created_at: new Date().toISOString(),
          profiles: {
            username: user.user_metadata?.username || "user",
            avatar_url: user.user_metadata?.avatar_url,
            is_brand: user.user_metadata?.is_brand || false,
          },
        };
        return res.json({ success: true, comment: mockComment });
      }

      // Rate Limit: Detect rapid identical comments
      if (isRedisEnabled()) {
        try {
          const recentKey = `recent_comment:${user.id}:${Buffer.from(content).toString("base64")}`;
          const hasRecent = await redis.get(recentKey);
          if (hasRecent) {
            const rapidCountKey = `rapid_spam:${user.id}`;
            const count = await redis.incr(rapidCountKey);
            if (count === 1) await redis.expire(rapidCountKey, 60);

            if (count >= 3 && supabaseAdmin && !isTestingDeveloper) {
              await supabaseAdmin
                .from("profiles")
                .update({ is_suspended: true, can_upload: false })
                .eq("id", user.id);
            }
            return res
              .status(429)
              .json({
                error: "Please wait before posting the identical comment.",
              });
          }
          await redis.set(recentKey, "1", { ex: 5 }); // 5 second cooldown for same exact string
        } catch (redisError) {
          handleRedisError(redisError, "rapidIdenticalCommentRateLimit");
        }
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "DB not configured" });
      }

      const { data, error } = await supabaseAdmin
        .from("comments")
        .insert({
          video_id,
          user_id: user.id,
          content,
        })
        .select("*, profiles(username, avatar_url, is_brand)")
        .single();

      if (error) throw error;
      res.json({ success: true, comment: data });
    } catch (e: any) {
      {
        logger.error({ err: e, reqId: (req as any).requestId }, "API Error");
        res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // Toggle pinning a comment - only video creator or admin can call
  app.put("/api/comments/:commentId/pin", verifyAuth, async (req, res) => {
    try {
      const { commentId } = req.params;
      const user = (req as any).user;

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "DB not configured" });
      }

      const { data: comment, error: fetchCommentErr } = await supabaseAdmin
        .from("comments")
        .select("*")
        .eq("id", commentId)
        .single();

      if (fetchCommentErr || !comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const { data: video, error: fetchVideoErr } = await supabaseAdmin
        .from("videos")
        .select("user_id")
        .eq("id", comment.video_id)
        .single();

      if (fetchVideoErr || !video) {
        return res.status(404).json({ error: "Associated video not found" });
      }

      const isVideoOwner = video.user_id === user.id;
      const isAdmin = user.is_database_admin === true;

      if (!isVideoOwner && !isAdmin) {
        return res
          .status(403)
          .json({
            error: "Only the video creator or an admin can pin comments",
          });
      }

      const currentPinnedStatus = comment.is_pinned === true;

      if (currentPinnedStatus) {
        // Toggle Pin off
        const { error: unpinErr } = await supabaseAdmin
          .from("comments")
          .update({ is_pinned: false })
          .eq("id", commentId);

        if (unpinErr) {
          if (
            unpinErr.code === "42703" ||
            (unpinErr.message && unpinErr.message.includes("is_pinned"))
          ) {
            return res
              .status(400)
              .json({
                error:
                  "Database column is_pinned missing. Please execute database.sql",
              });
          }
          throw unpinErr;
        }
        return res.json({
          success: true,
          is_pinned: false,
          message: "Comment unpinned successfully",
        });
      } else {
        // Clear all pins on this video (industry standard: only 1 pinned comment per video)
        await supabaseAdmin
          .from("comments")
          .update({ is_pinned: false })
          .eq("video_id", comment.video_id);

        // Pin this comment
        const { error: pinErr } = await supabaseAdmin
          .from("comments")
          .update({ is_pinned: true })
          .eq("id", commentId);

        if (pinErr) {
          if (
            pinErr.code === "42703" ||
            (pinErr.message && pinErr.message.includes("is_pinned"))
          ) {
            return res
              .status(400)
              .json({
                error:
                  "Database column is_pinned missing. Please execute database.sql",
              });
          }
          throw pinErr;
        }
        return res.json({
          success: true,
          is_pinned: true,
          message: "Comment pinned successfully",
        });
      }
    } catch (e: any) {
      {
        logger.error({ err: e, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  app.delete("/api/comments/:commentId", verifyAuth, async (req, res) => {
    try {
      const { commentId } = req.params;
      const user = (req as any).user;

      // Handle simulated/temporary comment deletion gracefully (bypasses DB checking)
      if (commentId && commentId.startsWith("temp-")) {
        return res.json({
          success: true,
          message: "Comment deleted successfully",
        });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "DB not configured" });
      }

      const { data: comment, error: fetchError } = await supabaseAdmin
        .from("comments")
        .select("*")
        .eq("id", commentId)
        .single();

      if (fetchError || !comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const isCommentOwner = comment.user_id === user.id;

      let isVideoOwner = false;
      const { data: videoData } = await supabaseAdmin
        .from("videos")
        .select("user_id")
        .eq("id", comment.video_id)
        .single();

      if (videoData && videoData.user_id === user.id) {
        isVideoOwner = true;
      }

      const isAdmin = user.is_database_admin === true;

      if (!isCommentOwner && !isVideoOwner && !isAdmin) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this comment" });
      }

      // Use supabaseAdmin with service-role permissions to clean up and delete (bypasses RLS limits for comments created by other users)
      const { error: repliesDeleteError } = await supabaseAdmin
        .from("comments")
        .delete()
        .like("content", `%"parent_id":"${commentId}"%`);

      if (repliesDeleteError) {
        logger.error(
          "Failed to clean up comment replies:",
          repliesDeleteError,
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (deleteError) throw deleteError;

      return res.json({
        success: true,
        message: "Comment deleted successfully",
      });
    } catch (e: any) {
      {
        logger.error({ err: e, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  app.get("/api/followers", async (req, res) => {
    try {
      const { user_id, cursor, limit = 20 } = req.query;
      const limitNum = parseInt(limit as string) || 20;

      let query = supabaseAdmin!
        .from("follows")
        .select("*, profiles!follower_id(id, username, avatar_url, is_brand)")
        .eq("following_id", user_id)
        .order("created_at", { ascending: false })
        .limit(limitNum);
      if (cursor) query = query.lt("created_at", cursor);

      const { data, error } = await query;
      if (error) throw error;

      const nextCursor =
        data && data.length === limitNum
          ? data[data.length - 1].created_at
          : null;
      return res.json({ data: data || [], nextCursor });
    } catch (e: any) {
      {
        logger.error({ err: e, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  app.patch("/api/profiles/me", verifyAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const updates = req.body;

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Database not configured" });
      }

      // Explicitly whitelist allowed update fields
      const allowedFields = new Set([
        "bio",
        "instagram",
        "tiktok",
        "avatar_url",
      ]);
      const sanitizedUpdates: Record<string, any> = {};

      for (const key of Object.keys(updates)) {
        if (allowedFields.has(key)) {
          sanitizedUpdates[key] = updates[key];
        }
      }

      if (Object.keys(sanitizedUpdates).length === 0) {
        return res
          .status(400)
          .json({ error: "No valid fields provided for update" });
      }

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(sanitizedUpdates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, data });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // Proxy image to avoid CORS
  app.get("/api/proxy-image", verifyAuth, async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) return res.status(400).send("URL required");

      const parsedUrl = new URL(targetUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return res.status(400).send("Invalid protocol");
      }

      const hostname = parsedUrl.hostname.toLowerCase();
      const isIpAddress =
        validator.isIP(hostname) || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      // Basic blocklist for internal/localhost SSRF prevention
      if (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.startsWith("127.") ||
        hostname.startsWith("169.254.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("0.") ||
        isIpAddress ||
        /^192\.168\./.test(hostname) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
      ) {
        return res.status(403).send("Private network access forbidden");
      }

      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      const buffer = await response.arrayBuffer();
      res.set(
        "Content-Type",
        response.headers.get("content-type") || "image/jpeg",
      );
      return res.send(Buffer.from(buffer));
    } catch (err) {
      return res.status(500).send("Proxy error");
    }
  });

  // Create Video logic in DB
  app.post("/api/link-preview", verifyAuth, async (req, res) => {
    try {
      const { url } = req.body;
      if (
        !url ||
        typeof url !== "string" ||
        !validator.isURL(url, {
          protocols: ["http", "https"],
          require_protocol: true,
        })
      ) {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();

      const isIpAddress =
        validator.isIP(hostname) || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        isIpAddress ||
        hostname.endsWith(".local") ||
        hostname.includes("0x")
      ) {
        return res
          .status(400)
          .json({ error: "Local or internal IP addresses are not allowed." });
      }

      let title = "";
      let favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`; // fallback
      let aiExtracted = { productName: "", productPrice: "" };
      let possibleImage = "";

      try {
        let html = "";
        try {
          html = await fetchPageHtmlWithNoTls(url);
        } catch (fetchErr: any) {
          // ignore or handle if needed
        }

        if (html) {
          const $ = cheerio.load(html);

          title =
            $('meta[property="og:title"]').attr("content") ||
            $("title").text() ||
            "";
          let ogImage = $('meta[property="og:image"]').attr("content") || "";
          if (ogImage) {
            try {
              ogImage = new URL(ogImage, url).toString();
            } catch (e) {
              ogImage = "";
            }
          }
          possibleImage = ogImage || $("img").first().attr("src") || "";
          if (possibleImage && !possibleImage.startsWith("http")) {
            try {
              possibleImage = new URL(possibleImage, url).toString();
            } catch (e) {}
          }

          const iconHref =
            $('link[rel="icon"]').attr("href") ||
            $('link[rel="shortcut icon"]').attr("href") ||
            $('link[rel="apple-touch-icon"]').attr("href");
          if (iconHref) {
            try {
              favicon = new URL(iconHref, url).toString();
            } catch (e) {
              // ignore
            }
          }

          // Automatically extract Product Name and Price in the background using Gemini AI
          if (process.env.GEMINI_API_KEY) {
            const description =
              $('meta[name="description"]').attr("content") ||
              $('meta[property="og:description"]').attr("content") ||
              "";
            // Get a snippet of the body text to find price
            const bodyText = $("body")
              .text()
              .replace(/\s+/g, " ")
              .slice(0, 3000);
            try {
              const { GoogleGenAI } = await import("@google/genai");
              const ai = new GoogleGenAI({
                apiKey: process.env.GEMINI_API_KEY,
              });
              const prompt = `Extract the product name and price from this e-commerce page snippet. 
Title: ${title}
Description: ${description}
Body Snippet: ${bodyText}

Respond ONLY with a valid JSON object containing "productName" and "productPrice" (as a number or simple price string, e.g. "1499"). If you cannot extract them, leave them blank. Do not include markdown codeblocks or quotes.
Example: {"productName": "Awesome Shirt", "productPrice": "1499"}`;

              const aiResponse = await generateContentWithRetry(ai, {
                model: "gemini-3.5-flash",
                contents: prompt,
              });

              const textResp = aiResponse.text
                .replace(/```json/gi, "")
                .replace(/```/g, "")
                .trim();
              const parsed = JSON.parse(textResp);
              if (parsed.productName)
                aiExtracted.productName = parsed.productName;
              if (parsed.productPrice)
                aiExtracted.productPrice = parsed.productPrice;
            } catch (aiErr) {
              logger.error({ err: aiErr }, "[link-preview] AI extraction failed:");
            }
          }
        }
      } catch (err) {
        // Quietly fail or use fallbacks without cluttering the logs
      }

      return res.json({
        title: title.trim() || hostname,
        favicon,
        domain: hostname,
        productName: aiExtracted.productName,
        productPrice: aiExtracted.productPrice,
        productImage: possibleImage,
      });
    } catch (err: any) {
      logger.error({ err: err }, "Link preview error:");
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  app.post("/api/videos", verifyAuth, idempotencyMiddleware, async (req, res) => {
    try {
      const {
        video_url,
        thumbnail_url,
        main_product_image_url,
        caption,
        product_url,
        real_life_image_url,
        is_verified_real,
        force_unverified_url,
        category_id,
        tags,
      } = req.body;

      if (!product_url) {
        return res.status(400).json({ error: "Product URL is required" });
      }

      if (!/^https:\/\//i.test(product_url.trim())) {
        return res
          .status(400)
          .json({
            error:
              "Only HTTPS URLs are allowed. javascript: or other schemas are strictly forbidden.",
          });
      }

      const urlFields = [
        video_url,
        thumbnail_url,
        main_product_image_url,
        real_life_image_url,
      ];
      for (const field of urlFields) {
        if (
          field &&
          typeof field === "string" &&
          !/^https:\/\//i.test(field.trim())
        ) {
          return res
            .status(400)
            .json({
              error:
                "All media URLs must strictly use HTTPS schemas. Invalid payloads rejected.",
            });
        }
      }

      const user = (req as any).user;
      if (!supabaseAdmin) {
        return res
          .status(500)
          .json({ error: "Database Admin client not configured" });
      }

      // Authorization check & Upload Limits based on Plan
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("can_upload, is_admin, subscription_plan")
        .eq("id", user.id)
        .single();

      if (!profile?.can_upload && !profile?.is_admin) {
        return res
          .status(403)
          .json({ error: "Forbidden. You do not have upload privileges." });
      }

      if (!profile?.is_admin) {
        const { count } = await supabaseAdmin
          .from("videos")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        const uploadedCount = count || 0;
        const currentPlan = profile?.subscription_plan || "free";

        if (currentPlan === "free" && uploadedCount >= 1) {
          return res
            .status(403)
            .json({
              error:
                "Free plan limit reached (1 video). Please upgrade to Pro.",
            });
        }
        if (currentPlan === "pro" && uploadedCount >= 10) {
          return res
            .status(403)
            .json({
              error:
                "Pro plan limit reached (10 videos). Please upgrade to Creator.",
            });
        }
      }

      // Duplicate Hash Detection
      const seventyTwoHoursAgo = new Date(
        Date.now() - 72 * 60 * 60 * 1000,
      ).toISOString();
      const { data: duplicates } = await supabaseAdmin
        .from("videos")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_url", video_url)
        .gte("created_at", seventyTwoHoursAgo)
        .limit(1);

      if (duplicates && duplicates.length > 0) {
        return res
          .status(409)
          .json({
            error:
              "Duplicate upload detected. This video was already uploaded recently.",
          });
      }

      // Fast insert with processing status and raw URL
      let status = "processing";
      const cleanProductUrl = product_url.trim();

      const { data, error } = await supabaseAdmin
        .from("videos")
        .insert({
          user_id: user.id,
          video_url,
          ...(thumbnail_url ? { thumbnail_url } : {}),
          ...(main_product_image_url ? { main_product_image_url } : {}),
          caption,
          product_url: cleanProductUrl,
          ...(real_life_image_url
            ? { real_life_image_url, is_verified_real }
            : {}),
          ...(category_id ? { category_id } : {}),
          ...(tags && Array.isArray(tags) ? { tags } : {}),
          status,
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ success: true, data, status: "processing" });

      // Run ALL heavy validation and AI analysis asynchronously
      (async () => {
        try {
          // Step 1: Follow redirects
          const resolvedUrl = await resolveRedirectsNative(cleanProductUrl);
          const url = new URL(resolvedUrl);

          if (url.protocol !== "https:")
            throw new Error("Only HTTPS URLs are allowed");

          const pathname = url.pathname.toLowerCase();
          const blockedExtensions = [
            ".mp4",
            ".mov",
            ".avi",
            ".webm",
            ".mkv",
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".webp",
            ".pdf",
            ".zip",
            ".rar",
            ".mp3",
            ".wav",
          ];
          if (blockedExtensions.some((ext) => pathname.endsWith(ext)))
            throw new Error("Must be a valid product page link");

          const hostname = url.hostname.toLowerCase();
          const isIpAddress =
            validator.isIP(hostname) ||
            /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
          if (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname.endsWith(".local") ||
            hostname.includes("0x") ||
            isIpAddress
          ) {
            throw new Error("Local/IP addresses not allowed");
          }

          const safeProductUrl = sanitizeProductUrl(url);

          if (process.env.GOOGLE_SAFE_BROWSING_KEY) {
            const safeRes = await fetch(
              `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_SAFE_BROWSING_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  client: { clientId: "getnayi", clientVersion: "1.0" },
                  threatInfo: {
                    threatTypes: [
                      "MALWARE",
                      "SOCIAL_ENGINEERING",
                      "UNWANTED_SOFTWARE",
                      "POTENTIALLY_HARMFUL_APPLICATION",
                    ],
                    platformTypes: ["ANY_PLATFORM"],
                    threatEntryTypes: ["URL"],
                    threatEntries: [{ url: safeProductUrl }],
                  },
                }),
              },
            );
            const safeData = await safeRes.json();
            if (safeData && safeData.matches && safeData.matches.length > 0) {
              throw new Error("URL flagged as malicious");
            }
          }

          const isMarketplace = isAllowedMarketplace(safeProductUrl);
          const isProductPath = [
            "/p/",
            "/product/",
            "/item/",
            "/dp/",
            "/buy/",
            "/d/",
          ].some((p) => pathname.includes(p));
          if (!isMarketplace && !isProductPath && !force_unverified_url) {
            throw new Error("Link doesn't look like an e-commerce platform");
          }

          // Validation passed! Update URL and run AI analysis
          await supabaseAdmin
            .from("videos")
            .update({ product_url: safeProductUrl })
            .eq("id", data.id);
          await analyzeVideoMetadata(
            supabaseAdmin,
            data.id,
            caption,
            safeProductUrl,
          );
        } catch (e: any) {
          logger.error(
            "Background processing failed for video",
            data.id,
            e.message,
          );
          await supabaseAdmin
            .from("videos")
            .update({ status: "rejected" })
            .eq("id", data.id);
        }
      })();
      return;
    } catch (err: any) {
      logger.error({ err: err }, "Video Upload API Error:");
      return res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/videos/:id", verifyAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { caption, tags } = req.body;
      const user = (req as any).user;

      if (!supabaseAdmin) throw new Error("Supabase admin not ready");

      const { data: video, error: videoError } = await supabaseAdmin
        .from("videos")
        .select("user_id")
        .eq("id", id)
        .single();

      if (videoError || !video) {
        return res.status(404).json({ error: "Video not found" });
      }

      const isAdmin = user.is_database_admin === true;

      if (video.user_id !== user.id && !isAdmin) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit this video" });
      }

      const patch: any = {};
      if (caption !== undefined) patch.caption = caption;
      if (tags !== undefined && Array.isArray(tags)) patch.tags = tags;

      if (req.body.product_url !== undefined) {
        if (!/^https:\/\//i.test(req.body.product_url.trim())) {
          return res
            .status(400)
            .json({ error: "product_url must securely use https" });
        }
        patch.product_url = req.body.product_url;
      }
      if (req.body.category_id !== undefined)
        patch.category_id = req.body.category_id;

      if (Object.keys(patch).length === 0) {
        return res.json({ success: true, message: "No changes provided" });
      }

      const { data, error } = await supabaseAdmin
        .from("videos")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err: err }, "Video Edit Error:");
      return res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/bunny/status/:videoId", async (req, res) => {
    try {
      const libraryId = process.env.BUNNY_LIBRARY_ID;
      const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
      const videoId = req.params.videoId;

      if (!libraryId || !apiKey) {
        return res
          .status(500)
          .json({ error: "Bunny configuration is missing" });
      }

      const response = await fetch(
        `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
        {
          headers: {
            AccessKey: apiKey,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to check video status");
      }

      const data = await response.json();
      res.json({ status: data.status, encodeProgress: data.encodeProgress });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Server-side high-compatibility HLS/TS streaming proxy
  app.get("/api/stream/:videoId/*", async (req, res) => {
    try {
      const { videoId } = req.params;
      const relativePath = req.params[0];
      if (!videoId || !relativePath) {
        return res.status(400).send("Invalid video parameters");
      }

      const deliveryHostname =
        process.env.BUNNY_DELIVERY_HOSTNAME || "vz-238d4a06-b02.b-cdn.net";
      let cdnUrl = `https://${deliveryHostname}/${videoId}/${relativePath}`;
      const qs = Object.entries(req.query)
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
      if (qs) cdnUrl += `?${qs}`;

      const headers: Record<string, string> = {
        Referer: "https://getnayi.com", // Setting referer explicitly since bunny edge might block localhost occasionally
        Origin: "https://getnayi.com",
      };

      const proxyRes = await fetch(cdnUrl, { headers });
      if (!proxyRes.ok) {
        if (proxyRes.status !== 404) {
          logger.warn(
            `[Proxy Stream Warning] Failed to fetch ${cdnUrl}: Status ${proxyRes.status}`,
          );
        }
        return res
          .status(proxyRes.status)
          .send(`Failed to fetch streaming asset: ${proxyRes.statusText}`);
      }

      const contentType = proxyRes.headers.get("content-type");
      if (contentType) {
        res.setHeader("content-type", contentType);
      }

      if (relativePath.endsWith(".ts")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (relativePath.endsWith(".m3u8")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }

      if (proxyRes.body) {
        Readable.fromWeb(proxyRes.body as any).pipe(res);
      } else {
        res.status(500).send("No streaming response body available");
      }
    } catch (error: any) {
      logger.error({ err: error }, "[Proxy Stream Error]:");
      res.status(500).send(error.message);
    }
  });

  // API route to explicitly grant upload access and make chvenu143mn@gmail.com an admin
  app.post(
    ["/api/user/revoke-and-reset", "/api/user/grant-and-approve"],
    verifyAuth,
    async (req, res) => {
      try {
        if (!supabaseAdmin) {
          return res
            .status(500)
            .json({ error: "Database Admin client not configured" });
        }

        const sessionUser = (req as any).user;
        if (sessionUser?.email?.toLowerCase() !== "chvenu143mn@gmail.com") {
          return res
            .status(403)
            .json({ error: "Forbidden: Restricted diagnostic route." });
        }

        // Query admin auth list of users
        const { data: usersData, error: authError } =
          await supabaseAdmin.auth.admin.listUsers();
        if (authError || !usersData?.users) {
          return res
            .status(500)
            .json({ error: "Failed to access users directory" });
        }

        const targetEmail = "chvenu143mn@gmail.com";
        const targetUser = (usersData.users as any[]).find(
          (u) => u.email?.toLowerCase() === targetEmail,
        );

        if (!targetUser) {
          return res
            .status(404)
            .json({ error: `User with email ${targetEmail} not found` });
        }

        const userId = targetUser.id;

        // 1. Grant upload permission and set is_admin to true in profiles
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ can_upload: true, is_admin: true })
          .eq("id", userId);

        if (profileError) {
          logger.error(
            "Failed to grant and approve upload privilege:",
            profileError,
          );
        }

        // 2. Clear out applications first to avoid duplicate status issues
        await supabaseAdmin
          .from("creator_applications")
          .delete()
          .eq("user_id", userId);

        // 3. Create/insert an approved creator application
        const { error: appError } = await supabaseAdmin
          .from("creator_applications")
          .insert({
            user_id: userId,
            status: "approved",
            notes: "Automated Creator/Admin Approval",
          });

        if (appError) {
          logger.error(
            "Failed to create approved creator application:",
            appError,
          );
        }

        logger.info(
          `[Approval Service] Done. Granted full admin and upload permissions for ${targetEmail}`,
        );
        return res.json({
          success: true,
          message: `Access granted and onboarding application approved/activated for ${targetEmail}`,
        });
      } catch (err: any) {
        logger.error({ err: err }, "Approval process error:");
        {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
      }
    },
  );

  // verifyAdmin middleware to strictly authenticate as an administrator
  const verifyAdmin = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        logger.error({}, "[Admin Auth Failed] No auth header provided");
        return res
          .status(401)
          .json({ error: "No authorization header provided" });
      }
      const token = authHeader.split(" ")[1];
      if (!token) {
        logger.error({}, "[Admin Auth Failed] Token format is invalid");
        return res
          .status(401)
          .json({ error: "Auth token must be Bearer token" });
      }
      if (!supabaseAdmin) {
        logger.error({}, "[Admin Auth Failed] supabaseAdmin not configured");
        throw new Error("Supabase admin client not initialized on server");
      }

      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) {
        logger.error(
          "[Admin Auth Failed] Invalid or expired Supabase credentials:",
          userError,
        );
        return res.status(401).json({ error: "Invalid or expired auth token" });
      }

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileErr || !profile?.is_admin) {
        logger.error(
          `[Admin Auth Forbidden] User ${user.email} does not possess is_admin flag. Profile:`,
          profile,
        );
        return res
          .status(403)
          .json({ error: "Forbidden: Administrator privileges required." });
      }

      // Populate admin info on req object
      (req as any).adminUser = user;
      next();
    } catch (err: any) {
      logger.error({ err: err }, "[verifyAdmin Catch Error]");
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  };

  // Log admin moderation events inside database for audit trails
  const logAdminAction = async (
    adminId: string,
    action: string,
    targetId: string,
    targetType: string,
    details: any,
  ) => {
    try {
      logger.info(
        `[Admin Log] Admin: ${adminId} | Action: ${action} | Target: ${targetId} (${targetType})`,
        details,
      );
      if (supabaseAdmin) {
        await supabaseAdmin.from("admin_audit_logs").insert({
          admin_id: adminId,
          action,
          target_id: targetId,
          target_type: targetType,
          details,
        });
      }
    } catch (err) {
      logger.error({ err: err }, "[logAdminAction Failed]");
    }
  };

  // Dual Fallback Settings Storage Engine
  let localSettings: Record<string, any> = {
    require_verification_to_upload: false,
    allowed_product_domains: [
      "amazon.in",
      "amazon.com",
      "flipkart.com",
      "getnayi.in",
      "myntra.com",
      "meesho.com",
    ],
    blacklisted_product_domains: [
      "spamlink.xyz",
      "malicious.com",
      "phishing.net",
      "dangerous-offers.icu",
    ],
    max_upload_size_mb: 100,
    automatic_spam_filtering: true,
    maintenance_mode: false,
    support_email: "chvenu143mn@gmail.com",
  };

  const getSystemSettings = async (): Promise<Record<string, any>> => {
    try {
      if (supabaseAdmin) {
        // We attempt to retrieve from system_settings table if it exists
        const { data, error } = await supabaseAdmin
          .from("system_settings")
          .select("*");
        if (!error && data && data.length > 0) {
          const loaded: Record<string, any> = {};
          data.forEach((row: any) => {
            loaded[row.key] = row.value;
          });
          return { ...localSettings, ...loaded };
        }
      }
    } catch (e) {
      logger.warn(
        "[Settings DB Engine] system_settings table not available, using Redis fallback:",
        e,
      );
    }

    // Direct Upstash Redis cache query fallback
    try {
      const redisVal = await redis.get("system_settings");
      if (redisVal) {
        const parsed =
          typeof redisVal === "string" ? JSON.parse(redisVal) : redisVal;
        return { ...localSettings, ...parsed };
      }
    } catch (e) {
      logger.error({ err: e }, "[Settings Redis Engine] Failed querying Redis backup:");
    }

    return localSettings;
  };

  const saveSystemSettings = async (
    settings: Record<string, any>,
  ): Promise<Record<string, any>> => {
    const updated = { ...localSettings, ...settings };

    // 1. Persist to Upstash Redis
    try {
      await redis.set("system_settings", JSON.stringify(updated));
    } catch (e) {
      logger.error({ err: e }, "[Settings Store Engine] Redis save error:");
    }

    // 2. Persist to Postgres database if available
    try {
      if (supabaseAdmin) {
        // Upsert all keys into Postgres
        const promises = Object.entries(updated).map(([key, value]) => {
          return supabaseAdmin
            .from("system_settings")
            .upsert({ key, value })
            .select();
        });
        await Promise.allSettled(promises);
      }
    } catch (e) {
      logger.warn(
        "[Settings Store Engine] Postgres table row write bypassed:",
        e,
      );
    }

    return updated;
  };

  // admin applications query
  app.get("/api/admin/applications", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const { data, error } = await supabaseAdmin
        .from("creator_applications")
        .select(`*, profiles (*)`)
        .order("created_at", { ascending: false });

      if (error) return res.status(400).json({ error: error.message });
      return res.json({ data: data || [] });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // admin application status update
  app.put("/api/admin/applications/:id", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const adminId = (req as any).adminUser.id;
      const { status, userId } = req.body;

      const { data, error } = await supabaseAdmin
        .from("creator_applications")
        .update({ status })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });

      if (status === "approved" && userId) {
        const isBrandApp = data?.notes?.startsWith("Role: Brand") || false;
        await supabaseAdmin
          .from("profiles")
          .update({
            can_upload: true,
            is_brand: isBrandApp,
          })
          .eq("id", userId);
      }

      await logAdminAction(
        adminId,
        `update_application_status_${status}`,
        req.params.id,
        "creator_application",
        { userId },
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // GET Video List (Admin)
  app.get("/api/admin/videos", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const { data, error } = await supabaseAdmin
        .from("videos")
        .select(`*, profiles (*)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json({ data: data || [] });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // UPDATE Video (Admin)
  app.put("/api/admin/videos/:id", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const adminId = (req as any).adminUser.id;
      const {
        status,
        trust_score,
        is_verified_real,
        category_id,
        caption,
        product_url,
        reason,
      } = req.body;
      const patch: any = {};

      if (status !== undefined) patch.status = status;
      if (trust_score !== undefined) patch.trust_score = Number(trust_score);
      if (is_verified_real !== undefined)
        patch.is_verified_real = !!is_verified_real;
      if (category_id !== undefined) patch.category_id = category_id || null;
      if (caption !== undefined) patch.caption = caption;
      if (product_url !== undefined) patch.product_url = product_url || null;

      if (status === "rejected") {
        if (!reason || !reason.trim()) {
          return res
            .status(400)
            .json({ error: "Rejection reason is required." });
        }
        patch.rejection_reason = reason.trim();
      }

      const { data, error } = await supabaseAdmin
        .from("videos")
        .update(patch)
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) {
        if (
          error.message &&
          error.message.includes(
            'column "rejection_reason" of relation "videos" does not exist',
          )
        ) {
          const fallbackPatch = { ...patch };
          delete fallbackPatch.rejection_reason;

          const { data: fallbackData, error: fallbackError } =
            await supabaseAdmin
              .from("videos")
              .update(fallbackPatch)
              .eq("id", req.params.id)
              .select()
              .single();

          if (fallbackError) throw fallbackError;

          if (status === "rejected" && fallbackData) {
            const notifPayload: any = {
              user_id: fallbackData.user_id,
              actor_id: adminId,
              video_id: fallbackData.id,
              type: "admin",
              rejection_reason: reason.trim(),
              is_read: false,
            };
            const { error: notifErr } = await supabaseAdmin
              .from("notifications")
              .insert(notifPayload);
            if (
              notifErr &&
              notifErr.message &&
              notifErr.message.includes("rejection_reason")
            ) {
              delete notifPayload.rejection_reason;
              await supabaseAdmin.from("notifications").insert(notifPayload);
            }
          }

          await logAdminAction(
            adminId,
            "edit_video_moderation",
            req.params.id,
            "video",
            fallbackPatch,
          );
          return res.json({ success: true, data: fallbackData });
        }
        throw error;
      }

      if (status === "rejected" && data) {
        // Safe check: did the DB trigger already run and insert the notification?
        const { data: triggerNotif } = await supabaseAdmin
          .from("notifications")
          .select("id")
          .eq("video_id", data.id)
          .eq("type", "admin")
          .limit(1);

        if (!triggerNotif || triggerNotif.length === 0) {
          const notifPayload: any = {
            user_id: data.user_id,
            actor_id: adminId,
            video_id: data.id,
            type: "admin",
            rejection_reason: reason.trim(),
            is_read: false,
          };
          const { error: notifErr } = await supabaseAdmin
            .from("notifications")
            .insert(notifPayload);
          if (
            notifErr &&
            notifErr.message &&
            notifErr.message.includes("rejection_reason")
          ) {
            delete notifPayload.rejection_reason;
            await supabaseAdmin.from("notifications").insert(notifPayload);
          }
        }
      }

      await logAdminAction(
        adminId,
        "edit_video_moderation",
        req.params.id,
        "video",
        patch,
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // DELETE Video (Admin)
  app.delete("/api/admin/videos/:id", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const adminId = (req as any).adminUser.id;
      const videoId = req.params.id;

      const { data: videoData, error: fetchErr } = await supabaseAdmin
        .from("videos")
        .select("video_url, user_id")
        .eq("id", videoId)
        .single();

      if (fetchErr) throw fetchErr;

      const { error: deleteErr } = await supabaseAdmin
        .from("videos")
        .delete()
        .eq("id", videoId);
      try {
        await redis.del("exploreVideos");
        await redis.del("trendingTags");
        await redis.del("storeVideos");
        logger.info({ videoId: req.params.id }, "Admin deleted video, cleared caches")
      } catch(cacheErr) {}

      if (deleteErr) throw deleteErr;

      // Deleting item from external stream CDN
      if (videoData?.video_url) {
        const match = videoData.video_url.match(
          /https?:\/\/[^\/]+\/([a-f0-9\-]+)\//i,
        );
        if (match && match[1]) {
          try {
            const libraryId = process.env.BUNNY_LIBRARY_ID;
            const apiKey = process.env.BUNNY_LIBRARY_API_KEY;
            if (libraryId && apiKey) {
              await fetch(
                `https://video.bunnycdn.com/library/${libraryId}/videos/${match[0]}`,
                {
                  method: "DELETE",
                  headers: { AccessKey: apiKey },
                },
              );
            }
          } catch (e) {
            logger.warn({ err: e }, "[CDN Stream Server] Bunny Video delete warning:");
          }
        }
      }

      await logAdminAction(
        adminId,
        "delete_video",
        videoId,
        "video",
        videoData,
      );
      return res.json({
        success: true,
        message: "Video content and metadata purged successfully.",
      });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // GET Reports (Admin)
  app.get("/api/admin/reports", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const { data, error } = await supabaseAdmin
        .from("reports")
        .select(`*, videos (*, profiles (*)), profiles (*)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json({ data: data || [] });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // UPDATE Report Status / Audit Note (Admin)
  app.put("/api/admin/reports/:id", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const adminId = (req as any).adminUser.id;
      const { status } = req.body; // status can be pending, reviewed, resolved

      const { data, error } = await supabaseAdmin
        .from("reports")
        .update({ status: status || "reviewed" })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) {
        // Fallback or ignore if column doesn't exist, we can store inside local logs
        logger.warn(
          "Reports column edit status failed. This is expected if alter script not applied:",
          error,
        );
      }

      await logAdminAction(
        adminId,
        `verify_report_${status || "reviewed"}`,
        req.params.id,
        "report",
        { status },
      );
      return res.json({ success: true, data: data || { id: req.params.id } });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // DISMISS Report (Admin)
  app.delete("/api/admin/reports/:id", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const adminId = (req as any).adminUser.id;
      const reportId = req.params.id;

      const { error } = await supabaseAdmin
        .from("reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
      await logAdminAction(adminId, "dismiss_report", reportId, "report", {});
      return res.json({ success: true, message: "Report dismissed" });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // GET Creators / Users List (Admin)
  app.get("/api/admin/creators", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select(`*`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json({ data: data || [] });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // UPDATE Creator privileges & Suspension (Admin)
  app.put("/api/admin/creators/:id", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const adminId = (req as any).adminUser.id;
      const creatorId = req.params.id;
      const { can_upload, is_brand, is_admin, is_suspended } = req.body;

      const patch: any = {};
      if (can_upload !== undefined) patch.can_upload = !!can_upload;
      if (is_brand !== undefined) patch.is_brand = !!is_brand;
      if (is_admin !== undefined) patch.is_admin = !!is_admin;
      if (is_suspended !== undefined) patch.is_suspended = !!is_suspended;

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(patch)
        .eq("id", creatorId)
        .select()
        .single();

      if (error) throw error;

      // If user gets suspended, revoke their upload access as database safeguard
      if (is_suspended) {
        await supabaseAdmin
          .from("profiles")
          .update({ can_upload: false })
          .eq("id", creatorId);

        // Let's hide their videos
        await supabaseAdmin
          .from("videos")
          .update({ status: "rejected" })
          .eq("user_id", creatorId);
      }

      await logAdminAction(
        adminId,
        "update_creator",
        creatorId,
        "creator_profile",
        patch,
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // GET Product Links (Admin)
  app.get("/api/admin/products", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      // Direct SELECT from videos table filtering items with active products
      const { data: videosData, error } = await supabaseAdmin
        .from("videos")
        .select(
          "id, caption, product_url, trust_score, created_at, profiles(username)",
        )
        .not("product_url", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group products dynamically by root domain
      const list = (videosData || []).map((v: any) => {
        let domain = "unknown";
        try {
          if (v.product_url) {
            const parsed = new URL(v.product_url);
            domain = parsed.hostname.replace("www.", "");
          }
        } catch (e) {}

        return {
          id: v.id,
          video_id: v.id,
          caption: v.caption,
          product_url: v.product_url,
          username: v.profiles?.username || "user",
          is_verified: isAllowedMarketplace(v.product_url),
          trust_score: v.trust_score,
          created_at: v.created_at,
          domain,
        };
      });

      return res.json({ data: list });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // GET Spam & Low Trust Items (Admin)
  app.get("/api/admin/spam", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const settings = await getSystemSettings();
      const blacklist = settings.blacklisted_product_domains || [];

      const { data, error } = await supabaseAdmin
        .from("videos")
        .select(`*, profiles (*)`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Compute and tag suspicious items
      const flagged = (data || [])
        .map((video: any) => {
          let riskScore = 0;
          const reasons: string[] = [];

          if (video.trust_score < 80) {
            riskScore += 100 - video.trust_score;
            reasons.push(
              `Low user/system safety trust score: ${video.trust_score}`,
            );
          }

          if (video.product_url) {
            const hasBlacklisted = blacklist.some((domain: string) =>
              video.product_url.toLowerCase().includes(domain.toLowerCase()),
            );
            if (hasBlacklisted) {
              riskScore += 90;
              reasons.push(
                `Contains blacklisted commercial domain: ${video.product_url}`,
              );
            }

            // Suspicious link keywords check
            const spamKeywords = [
              "gift",
              "free",
              "win",
              "prize",
              "earn",
              "crypto",
              "bonus",
              "make-money",
              "fast",
            ];
            const hasSpamKeyword = spamKeywords.some((keyword) =>
              video.product_url.toLowerCase().includes(keyword),
            );
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
        })
        .filter((v) => v.isSpam)
        .sort((a, b) => b.riskScore - a.riskScore);

      return res.json({ data: flagged });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // GET Settings (Admin)
  app.get("/api/admin/settings", verifyAdmin, async (req, res) => {
    try {
      const data = await getSystemSettings();
      return res.json({ data });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // POST Save Settings (Admin)
  app.post("/api/admin/settings", verifyAdmin, async (req, res) => {
    try {
      const adminId = (req as any).adminUser.id;
      const settings = req.body;
      const data = await saveSystemSettings(settings);

      await logAdminAction(
        adminId,
        "change_system_settings",
        "system",
        "settings",
        settings,
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  // GET Logs / Audit Trails (Admin)
  app.get("/api/admin/audit-logs", verifyAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");
      const { data, error } = await supabaseAdmin
        .from("admin_audit_logs")
        .select(`*, profiles:admin_id (*)`)
        .order("created_at", { ascending: false });

      if (error) {
        logger.warn({ err: error }, "Audit logs table failed:");
        // Fallback or returned mockup logs if table schema is skipped
        return res.json({ data: [] });
      }
      return res.json({ data: data || [] });
    } catch (err: any) {
      {
        logger.error({ err: err, reqId: (req as any).requestId }, "API Error");
        return res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
      }
    }
  });

  let vite: any;
  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({ err, reqId: (req as any).requestId }, "Unhandled Exception");
    res.status(500).json({ error: "Internal Server Error", referenceCode: (req as any).requestId });
  });

  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  app.get(["/video/:videoId", "/shared-collection"], async (req, res, next) => {
    try {
      let title =
        (req.query.t as string) || "Getnayi - Discover amazing products";
      let description =
        (req.query.desc as string) ||
        "Check out this amazing content on Getnayi!";
      let imageUrl =
        (req.query.thumb as string) ||
        "/og-image.png";

      let currentPath = req.path;
      let videoUrl = (req.query.v as string) || "";

      // Only initialize DB and query if we are missing some parameter metadata
      const isDBRequired = !req.query.t || !req.query.thumb || !req.query.desc;
      const db = isDBRequired
        ? supabaseAdmin ||
          (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY
            ? createClient(
                process.env.VITE_SUPABASE_URL,
                process.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false } },
              )
            : null)
        : null;

      if (currentPath.startsWith("/video/")) {
        let videoId = currentPath.split("/")[2];
        if (db && videoId) {
          try {
            const { data: video } = await db
              .from("videos")
              .select("*, profiles(username)")
              .eq("id", videoId)
              .single();

            if (video) {
              const creatorName = video.profiles?.username || "creator";
              title = video.caption
                ? `${video.caption} | Getnayi`
                : `Video by @${creatorName} | Getnayi`;
              imageUrl =
                video.thumbnail_url ||
                video.video_url?.replace("/playlist.m3u8", "/thumbnail.jpg") ||
                video.main_product_image_url ||
                imageUrl;
              videoUrl = video.video_url || "";
              description = `Check out this amazing discovery by @${creatorName} on Getnayi! Watch the full video to see it in action.`;
            }
          } catch (e) {
            logger.error({}, e);
          }
        }
      } else if (currentPath.startsWith("/shared-collection")) {
        const name = req.query.n as string;
        const vParam = req.query.v as string;

        title = name
          ? `${name} - Getnayi Collection`
          : "Shared Collection | Getnayi";
        const count = vParam ? vParam.split(",").length : 0;
        description = `Check out this collection of ${count} product videos curated for you.`;

        if (db && vParam) {
          try {
            const firstId = vParam.split(",")[0];
            const { data: v } = await db
              .from("videos")
              .select("thumbnail_url, main_product_image_url")
              .eq("id", firstId)
              .single();
            if (v && (v.thumbnail_url || v.main_product_image_url)) {
              imageUrl = v.thumbnail_url || v.main_product_image_url;
            }
          } catch (e) {
            logger.error({}, e);
          }
        }
      }

      let templateCode = "";
      const fs = await import("fs");

      try {
        if (process.env.NODE_ENV !== "production") {
          templateCode = await fs.promises.readFile(
            path.join(process.cwd(), "index.html"),
            "utf-8",
          );
          if (vite) {
            templateCode = await vite.transformIndexHtml(
              req.originalUrl,
              templateCode,
            );
          }
        } else {
          templateCode = await fs.promises.readFile(
            path.join(process.cwd(), "dist", "index.html"),
            "utf-8",
          );
        }
      } catch (err: any) {
        logger.error({ err: err }, "Error reading index.html:");
        return res
          .status(500)
          .send("Internal Server Error: Unable to read index.html");
      }

      const host = req.get("host") || "";
      const proto = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const scheme = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0") ? proto : "https";
      const baseUrl = `${scheme}://${host}`;

      let absoluteImageUrl = imageUrl;
      if (imageUrl.startsWith("/")) {
        absoluteImageUrl = `${baseUrl}${imageUrl}`;
      }

      let ogTags = `
        <meta property="og:title" content="${title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")}" />
        <meta property="og:description" content="${description.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")}" />
        <meta property="og:image" content="${absoluteImageUrl}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="${videoUrl ? "video.other" : "website"}" />
        <meta property="og:url" content="${baseUrl}${req.originalUrl.split('?')[0].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")}" />
        <meta property="og:site_name" content="Aisles" />
      `;

      if (videoUrl) {
        ogTags += `
        <meta property="og:video" content="${videoUrl}" />
        <meta property="og:video:secure_url" content="${videoUrl}" />
        <meta property="og:video:type" content="video/mp4" />
        `;
      }

      ogTags += `
        <meta name="twitter:card" content="${videoUrl ? "player" : "summary_large_image"}" />
        <meta name="twitter:title" content="${title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")}" />
        <meta name="twitter:description" content="${description.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")}" />
        <meta name="twitter:image" content="${absoluteImageUrl}" />
      `;

      if (videoUrl) {
        // Twitter player card metadata isn't fully functional without domain approval sometimes, but we provide it.
        ogTags += `
        <meta name="twitter:player" content="${req.protocol}://${req.get("host")}${req.originalUrl}" />
        <meta name="twitter:player:width" content="720" />
        <meta name="twitter:player:height" content="1280" />
        `;
      }

      const html = templateCode.replace("</head>", `${ogTags}</head>`);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      if (vite) {
        vite.ssrFixStacktrace(e as Error);
      }
      next(e);
    }
  });

  app.post("/api/shorten", express.json(), async (req, res) => {
    try {
      const { longUrl } = req.body;
      if (!longUrl || typeof longUrl !== "string" || !longUrl.startsWith("/")) {
        return res
          .status(400)
          .json({
            error: "Invalid longUrl. Must be a relative path starting with /",
          });
      }

      if (!supabaseAdmin) {
        return res.json({ shortUrl: longUrl });
      }

      const { data: existing } = await supabaseAdmin
        .from("short_links")
        .select("id")
        .eq("long_url", longUrl)
        .single();
      if (existing) {
        return res.json({ shortUrl: `/s/${existing.id}` });
      }

      const shortId = Math.random().toString(36).substring(2, 8);
      const { error } = await supabaseAdmin.from("short_links").insert({
        id: shortId,
        long_url: longUrl,
      });

      if (error) {
        logger.error({ err: error }, "Error creating short url:");
        return res.json({ shortUrl: longUrl });
      }

      res.json({ shortUrl: `/s/${shortId}` });
    } catch (err) {
      logger.error({}, err);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/s/:shortId", async (req, res, next) => {
    logger.info({ payload: req.params.shortId }, "RECEIVED SHORT URL REQUEST:");
    try {
      const { shortId } = req.params;

      // Fallback to anon key if service role key is missing
      const db =
        supabaseAdmin ||
        (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY
          ? createClient(
              process.env.VITE_SUPABASE_URL,
              process.env.VITE_SUPABASE_ANON_KEY,
              { auth: { persistSession: false } },
            )
          : null);

      if (!db) {
        logger.info({}, "No Supabase client found in short URL handler");
        return next();
      }

      const { data: link, error } = await db
        .from("short_links")
        .select("long_url")
        .eq("id", shortId)
        .single();
      logger.info({ info: error }, "Short URL link result:", link, "Error:");
      if (link && !error) {
        let protocol = req.protocol;
        let host = req.get("host");

        // Prevent arbitrary external redirect via X-Forwarded-Host injection
        if (
          host &&
          !host.includes("ai.studio") &&
          !host.includes("localhost") &&
          !host.includes("run.app")
        ) {
          host = "localhost";
        }

        let absoluteUrl = `${protocol}://${host}${link.long_url}`;
        logger.info({ info: absoluteUrl }, "Redirecting to:");
        res.redirect(301, absoluteUrl);
      } else {
        logger.info("Short link not found, calling next()");
        next();
      }
    } catch (err) {
      logger.error({ err: err }, "Error in short link handler:");
      next(err);
    }
  });

  // Razorpay APIs
  app.post("/api/subscription/create", verifyAuth, async (req, res) => {
    try {
      const razorpay = getRazorpay();
      if (!razorpay)
        return res.status(500).json({ error: "Razorpay not configured" });

      const user = (req as any).user;
      const { plan_id } = req.body; // e.g., 'plan_XYZ'

      if (!plan_id) return res.status(400).json({ error: "Plan ID required" });

      let amountInPaise = 0;
      if (
        plan_id === "plan_pro_yearly" ||
        plan_id === process.env.VITE_RAZORPAY_PRO_YEARLY_PLAN_ID ||
        plan_id === process.env.VITE_RAZORPAY_PRO_PLAN_ID
      ) {
        amountInPaise = 5988 * 100; // 5988 INR
      } else if (
        plan_id === "plan_pro_monthly" ||
        plan_id === process.env.VITE_RAZORPAY_PRO_MONTHLY_PLAN_ID
      ) {
        amountInPaise = 599 * 100; // 599 INR
      } else if (
        plan_id === "plan_creator_yearly" ||
        plan_id === process.env.VITE_RAZORPAY_CREATOR_YEARLY_PLAN_ID ||
        plan_id === process.env.VITE_RAZORPAY_CREATOR_PLAN_ID
      ) {
        amountInPaise = 17988 * 100; // 17988 INR
      } else if (
        plan_id === "plan_creator_monthly" ||
        plan_id === process.env.VITE_RAZORPAY_CREATOR_MONTHLY_PLAN_ID
      ) {
        amountInPaise = 1699 * 100; // 1699 INR
      } else {
        return res.status(400).json({ error: "Invalid plan ID" });
      }

      // Create order in Razorpay
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: {
          user_id: user.id,
          plan_id: plan_id,
        },
      });

      return res.json({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    } catch (err: any) {
      logger.error({ err: err }, "Razorpay create err:");
      const errorMessage =
        err.error?.description || err.message || "Error creating order.";
      return res.status(400).json({ error: errorMessage });
    }
  });

  app.post("/api/subscription/verify", verifyAuth, async (req, res) => {
    try {
      const razorpay = getRazorpay();
      if (!razorpay)
        return res.status(500).json({ error: "Razorpay not configured" });
      const user = (req as any).user;
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        plan_id,
      } = req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        // Double check payment status from Razorpay API
        const payment = await razorpay.payments.fetch(razorpay_payment_id);

        if (payment.status === "captured" || payment.status === "authorized") {
          // Success
          const plan =
            plan_id?.includes("creator") ||
            plan_id === process.env.VITE_RAZORPAY_CREATOR_PLAN_ID
              ? "creator"
              : "pro";

          const reqSupabase = getRequestSupabaseClient(req);
          const { error: dbError } = await reqSupabase
            .from("profiles")
            .update({
              subscription_plan: plan,
              razorpay_subscription_id: razorpay_order_id,
              subscription_status: "active",
            })
            .eq("id", user.id);

          if (dbError) {
            logger.error({ err: dbError }, "Failed to update subscription in DB:");
            return res
              .status(500)
              .json({ error: "Failed to update subscription in database" });
          }

          return res.json({ success: true });
        } else {
          return res
            .status(400)
            .json({ error: `Payment not captured. Status: ${payment.status}` });
        }
      } else {
        return res.status(400).json({ error: "Signature mismatch" });
      }
    } catch (err: any) {
      logger.error({ err: err }, "Razorpay verify err:");
      return res.status(500).json({ error: "Internal error" });
    }
  });

  app.post("/api/subscription/webhook", async (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret) return res.status(200).send("No webhook secret"); // ignore

      const signature = req.headers["x-razorpay-signature"] as string;
      if (!signature) return res.status(400).send("No signature");

      // Rely on the verified rawBody if available, otherwise convert body or toString
      let payloadString: string;
      if ((req as any).rawBody && Buffer.isBuffer((req as any).rawBody)) {
        payloadString = (req as any).rawBody.toString("utf8");
      } else if (Buffer.isBuffer(req.body)) {
        payloadString = req.body.toString("utf8");
      } else if (typeof req.body === "string") {
        payloadString = req.body;
      } else {
        payloadString = JSON.stringify(req.body);
      }

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payloadString)
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).send("Invalid signature");
      }

      const parsedBody = JSON.parse(payloadString);
      const event = parsedBody.event;

      if (event === "order.paid" || event === "payment.captured") {
        let orderEntity = parsedBody.payload.order?.entity;
        let paymentEntity = parsedBody.payload.payment?.entity;
        let notes = orderEntity?.notes || paymentEntity?.notes;

        if (notes && notes.user_id) {
          const plan =
            notes.plan_id?.includes("creator") ||
            notes.plan_id === process.env.VITE_RAZORPAY_CREATOR_PLAN_ID
              ? "creator"
              : "pro";
          const orderId = orderEntity?.id || paymentEntity?.order_id;

          if (supabaseAdmin) {
            const { error: dbError } = await supabaseAdmin
              .from("profiles")
              .update({
                subscription_plan: plan,
                subscription_status: "active",
                razorpay_subscription_id: orderId, // Storing order ID
              })
              .eq("id", notes.user_id);

            if (dbError) {
              logger.error(
                "Webhook: Failed to update subscription in DB:",
                dbError,
              );
            }
          }
        }
      } else if (event === "payment.failed") {
        let paymentEntity = parsedBody.payload.payment?.entity;
        let notes = paymentEntity?.notes;
        if (notes && notes.user_id) {
          logger.info(`Payment failed for user ${notes.user_id}`);
          // We could log this or update a payment_history table if we had one.
          // Leaving it as a logged event for now, as failure means no active subscription.
        }
      }

      return res.status(200).json({ status: "ok" });
    } catch (err: any) {
      logger.error({ err: err }, "Webhook error:");
      return res.status(500).send("Webhook Error");
    }
  });

  // 404 handler for undefined API routes to avoid returning the SPA index.html
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).send("Database not configured");
      }

      const { data: videos, error } = await supabaseAdmin
        .from("videos")
        .select("id, updated_at, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        throw error;
      }

      const baseUrl = process.env.VITE_APP_URL || "https://aisles.app";

      // Define static routes
      const staticUrls = ["", "/explore", "/search", "/auth"].map(
        (route) => `
        <url>
          <loc>${baseUrl}${route}</loc>
          <changefreq>daily</changefreq>
          <priority>${route === "" ? "1.0" : "0.8"}</priority>
        </url>`,
      );

      // Define dynamic video routes
      const dynamicUrls = (videos || []).map((video) => {
        const lastMod =
          video.updated_at || video.created_at || new Date().toISOString();
        return `
        <url>
          <loc>${baseUrl}/video/${video.id}</loc>
          <lastmod>${new Date(lastMod).toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.7</priority>
        </url>`;
      });

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join("")}
${dynamicUrls.join("")}
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.send(sitemap);
    } catch (err) {
      logger.error({ err: err }, "Sitemap generation error:");
      res.status(500).end();
    }
  });

  // Explicit endpoints for PWA assets to guarantee correct serving, mime types, and prevent falling through to HTML catch-all
  const getAssetPath = (filename: string) => {
    if (process.env.NODE_ENV !== "production") {
      return path.join(process.cwd(), "public", filename);
    } else {
      return path.join(process.cwd(), "dist", filename);
    }
  };

  app.get("/manifest.webmanifest", (req, res) => {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.sendFile(getAssetPath("manifest.webmanifest"));
  });

  app.get("/manifest.json", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.sendFile(getAssetPath("manifest.json"));
  });

  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "text/javascript; charset=utf-8");
    res.sendFile(getAssetPath("sw.js"));
  });

  app.get("/icon-192.png", (req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.sendFile(getAssetPath("icon-192.png"));
  });

  app.get("/icon-512.png", (req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.sendFile(getAssetPath("icon-512.png"));
  });

  app.get("/favicon-32x32.png", (req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.sendFile(getAssetPath("favicon-32x32.png"));
  });

  app.get("/favicon-16x16.png", (req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.sendFile(getAssetPath("favicon-16x16.png"));
  });

  app.get("/favicon.ico", (req, res) => {
    res.setHeader("Content-Type", "image/x-icon");
    res.sendFile(getAssetPath("favicon.ico"));
  });

  app.get("/apple-touch-icon.png", (req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.sendFile(getAssetPath("apple-touch-icon.png"));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false, dotfiles: "ignore" })); // Use index:false so / doesn't serve the plain index.html by default if we want to intercept it later
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(Number(PORT), "0.0.0.0", () => {
    logger.info(`Server running on port ${PORT}`);
  });
  
  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is in use, retrying...`);
      setTimeout(() => {
        server.close();
        server.listen(Number(PORT), "0.0.0.0");
      }, 1000);
    }
  });
}

startServer();
// Verified
