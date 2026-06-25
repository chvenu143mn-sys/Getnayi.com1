import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// Initialize Supabase client for database synchronization on payment events
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_webhook_secret';

// Define Zod schemas for validating Razorpay webhook payloads
const notesSchema = z.object({
  user_id: z.string().optional().nullable(),
  plan_id: z.string().optional().nullable(),
}).passthrough().optional().nullable();

const entitySchema = z.object({
  id: z.string().optional().nullable(),
  order_id: z.string().optional().nullable(),
  notes: notesSchema,
}).passthrough().optional().nullable();

const razorpayPayloadFieldSchema = z.object({
  order: z.object({
    entity: entitySchema,
  }).passthrough().optional().nullable(),
  payment: z.object({
    entity: entitySchema,
  }).passthrough().optional().nullable(),
  subscription: z.object({
    entity: entitySchema,
  }).passthrough().optional().nullable(),
}).passthrough().optional().nullable();

const webhookPayloadSchema = z.object({
  event: z.string(),
  payload: razorpayPayloadFieldSchema,
}).passthrough();

// Webhook rate limiting configuration: limits requests to around 10 per minute based on IP address
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Limit each IP to 10 requests per windowMs
  keyGenerator: (req: any) => {
    return req.ip || req.headers?.['x-forwarded-for'] || 'unknown';
  },
  handler: (req: any, res: any) => {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Too many requests to webhook endpoint. Please try again in a minute.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function POST(req: any, res: any) {
  // Apply the rate limiter first
  return webhookRateLimiter(req, res, async () => {
    try {
      // Monkeypatch req.text if not running in standard standard Request environment (e.g. standard Express req)
      if (req && typeof req.text !== 'function') {
        req.text = async () => {
          if (typeof req.body === 'string') return req.body;
          if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
          if (req.rawBody) return req.rawBody.toString('utf8');
          return JSON.stringify(req.body || {});
        };
      }

      // 1. Correctly read the raw request body using await req.text() at the very beginning
      const rawBody = await req.text();

      // 2. Extract signature header from Razorpay
      const signature = req.headers?.['x-razorpay-signature'] || req.headers?.['razorpay-signature'];
      if (!signature) {
        return res.status(400).json({ error: 'Bad Request: Missing payment provider signature header' });
      }

      // 3. Verify HMAC signature using secure SHA256 comparison
      const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      // Secure timing-safe string comparison to prevent side-channel timing attacks
      const bufferExpected = Buffer.from(expectedSignature, 'utf8');
      const bufferActual = Buffer.from(signature, 'utf8');

      if (bufferExpected.length !== bufferActual.length || !crypto.timingSafeEqual(bufferExpected, bufferActual)) {
        return res.status(400).json({ error: 'Unauthorized: Webhook signature verification failed' });
      }

      // 4. Parse the verified payload body
      let payload: any;
      try {
        payload = JSON.parse(rawBody);
      } catch (parseErr: any) {
        return res.status(400).json({ error: 'Bad Request: Malformed JSON body', details: parseErr.message });
      }

      // 5. Use schema.safeParse(payload) to validate the incoming data
      const parseResult = webhookPayloadSchema.safeParse(payload);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Bad Request: Webhook payload validation failed',
          validationError: parseResult.error.format()
        });
      }

      const validatedPayload = parseResult.data;
      const event = validatedPayload.event;

      // 6. Process validated subscription & payment events to synchronize with the database
      if (event === 'order.paid' || event === 'payment.captured' || event === 'subscription.activated') {
        const orderEntity = validatedPayload.payload?.order?.entity;
        const paymentEntity = validatedPayload.payload?.payment?.entity;
        const subscriptionEntity = validatedPayload.payload?.subscription?.entity;

        const notes = orderEntity?.notes || paymentEntity?.notes || subscriptionEntity?.notes;
        const userId = notes?.user_id;

        if (userId) {
          const plan = notes.plan_id?.includes('creator') || notes.plan_id === process.env.VITE_RAZORPAY_CREATOR_PLAN_ID ? 'creator' : 'pro';
          const transactionId = orderEntity?.id || paymentEntity?.order_id || subscriptionEntity?.id;

          const { error: dbError } = await supabase
            .from('profiles')
            .update({
              subscription_plan: plan,
              subscription_status: 'active',
              razorpay_subscription_id: transactionId
            })
            .eq('id', userId);

          if (dbError) {
            return res.status(500).json({ error: 'Database update failed', details: dbError.message });
          }
        }
      } else if (event === 'payment.failed' || event === 'subscription.cancelled') {
        const paymentEntity = validatedPayload.payload?.payment?.entity;
        const subscriptionEntity = validatedPayload.payload?.subscription?.entity;
        const notes = paymentEntity?.notes || subscriptionEntity?.notes;
        const userId = notes?.user_id;

        if (userId) {
          // Revoke active premium features
          await supabase
            .from('profiles')
            .update({
              subscription_plan: 'free',
              subscription_status: 'inactive'
            })
            .eq('id', userId);
        }
      }

      return res.status(200).json({ received: true, verified: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Internal Server Error during webhook processing', details: err.message });
    }
  });
}
