import rateLimit from 'express-rate-limit';

// Rate limiting configuration for authentication login endpoint
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  keyGenerator: (req: any) => {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },
  handler: (req: any, res: any) => {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Too many login attempts. Please try again in a minute.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function POST(req: any, res: any, next: any) {
  return loginRateLimiter(req, res, next);
}
