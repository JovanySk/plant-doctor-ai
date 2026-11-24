import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface RateLimitOptions {
  /** Max requests allowed per client inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Injectable clock so tests do not need to wait. */
  now?: () => number;
}

/**
 * Very small fixed-window rate limiter kept in memory (per IP).
 * Good enough for a single-instance demo; a real deployment would use Redis.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, { count: number; windowStart: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const current = now();
    const entry = hits.get(key);

    // First request, or the previous window already expired: start a new window.
    if (!entry || current - entry.windowStart >= windowMs) {
      hits.set(key, { count: 1, windowStart: current });
      return next();
    }

    if (entry.count >= limit) {
      const retryAfterSec = Math.ceil((entry.windowStart + windowMs - current) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({
        error: "Has hecho demasiadas solicitudes. Espera un minuto e inténtalo de nuevo.",
      });
      return;
    }

    entry.count += 1;
    next();
  };
}
