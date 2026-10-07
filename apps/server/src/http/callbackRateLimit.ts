import type { NextFunction, Request, Response } from "express";
import { logger } from "../app/logger.js";

/** `05` §2.4: OAuth callback requests per client address. */
export const CALLBACK_RATE_LIMIT = { maxRequests: 10, windowMs: 60_000 };

interface AddressWindow {
  startedAt: number;
  requestCount: number;
}

/**
 * Fixed-window limit per client address. Addresses live in memory for one window only and are
 * never logged or audited (GDPR Art. 5(1)(c), (e)).
 */
export function createCallbackRateLimit(now: () => number = Date.now) {
  const windowsByAddress = new Map<string, AddressWindow>();

  function forgetExpiredWindows(currentTime: number): void {
    for (const [address, window] of windowsByAddress) {
      if (currentTime - window.startedAt >= CALLBACK_RATE_LIMIT.windowMs) {
        windowsByAddress.delete(address);
      }
    }
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const currentTime = now();
    forgetExpiredWindows(currentTime);

    const address = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const window = windowsByAddress.get(address) ?? { startedAt: currentTime, requestCount: 0 };
    window.requestCount += 1;
    windowsByAddress.set(address, window);

    if (window.requestCount <= CALLBACK_RATE_LIMIT.maxRequests) {
      next();
      return;
    }

    if (window.requestCount === CALLBACK_RATE_LIMIT.maxRequests + 1) {
      logger.warn("Spotify OAuth callback rate limited");
    }
    const retryAfterSeconds = Math.ceil(
      (window.startedAt + CALLBACK_RATE_LIMIT.windowMs - currentTime) / 1000,
    );
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).type("text/plain").send("Too many requests. Try again in a minute.");
  };
}
