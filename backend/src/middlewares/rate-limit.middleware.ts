import type { NextFunction, Request, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * A bounded, per-process limiter. It is intentionally used as a first line of
 * defense; deployments with multiple API instances should put a shared edge
 * or Redis limiter in front of the service as well.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>();
  let lastCleanup = Date.now();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (now - lastCleanup > options.windowMs) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
      lastCleanup = now;
    }

    const key = options.keyGenerator?.(req) ?? req.ip ?? "unknown";
    const current = buckets.get(key);
    const bucket =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + options.windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader("RateLimit-Limit", options.max);
    res.setHeader(
      "RateLimit-Remaining",
      Math.max(0, options.max - bucket.count),
    );
    res.setHeader("RateLimit-Reset", Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({
        success: false,
        message: options.message ?? "Too many requests",
      });
    }

    next();
  };
}
