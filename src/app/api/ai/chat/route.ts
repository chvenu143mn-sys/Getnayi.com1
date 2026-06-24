import rateLimit from 'express-rate-limit';

// Rate limiting configuration for AI Chat endpoint
export const aiChatRateLimiter = rateLimit({
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
    res.status(429).json({ error: 'Too many requests to AI chat endpoint. Please try again in a minute.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function POST(req: any, res: any, next: any) {
  return aiChatRateLimiter(req, res, next);
}
