import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Initialize Supabase client for database synchronization on payment events
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_webhook_secret';

export async function POST(req: any, res: any) {
  try {
    // 1. Read Raw Request Body (mandatory for cryptographically secure HMAC verification)
    let rawBody = '';
    if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (req.rawBody) {
      rawBody = req.rawBody.toString('utf8');
    } else if (req.on) {
      // Fallback for Express middleware parsed request body representation
      rawBody = JSON.stringify(req.body);
    }

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
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = payload.event;

    // 5. Process validated subscription & payment events to synchronize with the database
    if (event === 'order.paid' || event === 'payment.captured' || event === 'subscription.activated') {
      const orderEntity = payload.payload?.order?.entity;
      const paymentEntity = payload.payload?.payment?.entity;
      const subscriptionEntity = payload.payload?.subscription?.entity;

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
      const paymentEntity = payload.payload?.payment?.entity;
      const subscriptionEntity = payload.payload?.subscription?.entity;
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
}
