import { Redis } from '@upstash/redis';

// Note: Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in environment
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://placeholder.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'placeholder_token',
});

// Helper for HTTP Rate Limiting using Upstash Redis
export async function checkRateLimit(ip: string, limit: number, windowSeconds: number): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const key = `rate_limit:${ip}`;
    
    const [response] = await redis.pipeline()
        .incr(key)
        .expire(key, windowSeconds, 'NX') // Set expiry only if key does not exist
        .exec();
    
    // In pipeline, response is [error, result] or just result depending on client version.
    // Upstash returns the result directly for successful commands in many cases.
    const currentCount = response as unknown as number;
    
    return {
        success: currentCount <= limit,
        limit,
        remaining: Math.max(0, limit - currentCount),
        reset: Math.floor(Date.now() / 1000) + windowSeconds
    };
}
