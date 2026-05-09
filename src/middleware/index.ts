// src/middleware/index.ts
import { cartLoggerMiddleware } from "./cart-logger.middleware";
import { rateLimitMiddleware } from "./rate-limit.middleware";
import { securityHeadersMiddleware } from "./security-headers.middleware";
import { csrfProtectionMiddleware } from "./csrf-protection.middleware";
import { graphQLDoSProtectionMiddleware } from "./graphql-dos-protection.middleware";
import { RedisService } from "../services/redis.service";
import { RateLimitService } from "../services/rate-limit.service";
import { Request, Response, NextFunction } from "express"; // ← ADD THIS
import { rateLimitConfig } from "../config/rate-limit.config"; // ✅ Import config

// Rate limit config
// const rateLimitConfig = {
//   CustomPlaceOrder: { windowMs: 10 * 60 * 1000, maxRequests: 3 },
//   login: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
//   register: { windowMs: 60 * 60 * 1000, maxRequests: 3 },

//   // ✅ Path patterns (fallback cho non-GraphQL requests)
//   "auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 5 },
//   "auth/register": { windowMs: 60 * 60 * 1000, maxRequests: 3 },
//   "/test": { windowMs: 15 * 60 * 1000, maxRequests: 5 },
//   "payment/process": { windowMs: 10 * 60 * 1000, maxRequests: 10 },
//   cart: { windowMs: 15 * 60 * 1000, maxRequests: 50 },
//   ".*": { windowMs: 15 * 60 * 1000, maxRequests: 300 },
// };

// Lazy init
let rateLimitServiceInstance: RateLimitService | null = null;

async function getRateLimitService(): Promise<RateLimitService> {
  if (!rateLimitServiceInstance) {
    try {
      const redisService = new RedisService();
      await redisService.onModuleInit();
      rateLimitServiceInstance = new RateLimitService(redisService);
      console.log("✅ [RateLimit] Service initialized");
    } catch (error) {
      console.warn("⚠️ [RateLimit] Failed to initialize:", error);
      return new RateLimitService({
        get: async () => null,
        set: async () => {},
        del: async () => {},
        getTTL: async () => -2,
        incr: async () => 0,
      } as any);
    }
  }
  return rateLimitServiceInstance;
}

export const middlewares = [
  // ✅ Security Headers (must be early in middleware chain)
  {
    route: "*",
    handler: securityHeadersMiddleware,
    beforeListen: true,
  },
  // ✅ CSRF Protection (after security headers, before rate limiting)
  {
    route: "*",
    handler: csrfProtectionMiddleware,
    beforeListen: true,
  },
  // ✅ GraphQL DoS Protection (prevents query depth/complexity attacks)
  {
    route: "*",
    handler: graphQLDoSProtectionMiddleware({
      maxDepth: 15,
      maxComplexity: 5000,
      maxQueryLength: 50000,
      maxAliases: 30,
      verbose: process.env.APP_ENV === "dev",
    }),
    beforeListen: true,
  },
  {
    route: "shop-api",
    handler: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rateLimitService = await getRateLimitService();
        return rateLimitMiddleware(rateLimitService, rateLimitConfig)(
          req,
          res,
          next,
        );
      } catch (error) {
        console.error("❌ [RateLimit] Middleware error:", error);
        next();
      }
    },
  },
  {
    route: "shop-api",
    handler: cartLoggerMiddleware,
  },
];

export { getRateLimitService, rateLimitConfig };
