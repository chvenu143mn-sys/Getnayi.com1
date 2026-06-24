import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client for authentication verification
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting configuration for payment checkout endpoint
export const paymentCheckoutRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit to 10 requests per minute
  keyGenerator: (req: any) => {
    // Key by authenticated user ID or fallback to client IP address
    const authHeader = req.headers?.authorization;
    if (authHeader) {
      return authHeader; // Unique authenticated user session key
    }
    return req.ip || req.headers?.['x-forwarded-for'] || 'unknown';
  },
  handler: (req: any, res: any) => {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Too many requests to payment checkout. Please try again in a minute.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function POST(req: any, res: any, next: any) {
  // Apply the Rate Limiter first
  return paymentCheckoutRateLimiter(req, res, async () => {
    try {
      // 1. Extract Authorization Header
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: No authorization header provided' });
      }

      // 2. Validate Bearer Token format
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Unauthorized: Auth token must be a Bearer token' });
      }

      const token = parts[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Bearer token is empty' });
      }

      // 3. Authenticate against Supabase / verify session
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired auth token' });
      }

      // 4. Authenticated successfully, proceed with checkout flow
      if (next) {
        req.user = user;
        return next();
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Checkout authorization verified', 
        user: { id: user.id, email: user.email } 
      });
    } catch (err: any) {
      return res.status(501).json({ 
        error: 'Internal Server Error during checkout authorization verification', 
        details: err.message 
      });
    }
  });
}

